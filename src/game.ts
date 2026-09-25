// Игровой цикл «Сотри туман» по макету Claude Design (docs/design-handoff.md).
// attract → stage ⇄ miss → found (лист-карточка) → … → genplan (этап 6) → … → final; экскурсия; автосброс.

import type { City3D } from "./city3d";
import type { Fog } from "./fog";
import { Maket } from "./maket";
import { qrCanvas, objectUrl, routeUrl } from "./qr";
import type { Content, MapObject, Route, Stage } from "./types";
import { esc } from "./util";

const SUCCESS_AT = 0.35; // доля очищенной цели → «нашёл»
const EACH_AT = 0.15; // и каждая из нескольких целевых зон — хотя бы настолько (два места = найти оба)
const WRONG_AT = 0.057; // на отпускании: мимо стёрто > 5,7% карты (≈40 000 px² макета) и цель < 15% → промах
const HEAT_FEEDBACK = true;
const HEAT_RANGE = 420; // px макета: дальше этого от края цели — «холодно»
const IDLE_WARN_MS = 45_000;
const IDLE_MS = 60_000;
const HEAT_COLORS = ["#FFE7A8", "#FFD98A", "#F7B267", "#EE8A4E", "#E4572E"];

/** Иллюстрации зданий из design/svg/buildings */
const ILLUSTRATION: Record<string, string> = {
  "korp-118": "korp-118",
  fleyta: "fleyta-360",
  electron: "electron",
  "kc-zelenograd": "kc-zelenograd",
  "dvorets-kolumba": "dvorets-kolumba",
  shtyki: "shtyki",
  "towers-central": "towers-central",
  vulykh: "vulykh-towers",
  "hram-sergiya": "hram-sergiya",
  arkhitektor: "arkhitektor",
  egg: "egg-pokrovskogo",
};

type Screen = "attract" | "stage" | "found" | "genplan" | "maket" | "final" | "excursion";

export class Game {
  private screen: Screen = "attract";
  private stageIdx = 0;
  private hintIdx = 0;
  private hintsUsed = 0;
  private open = new Set<string>();
  private found: string[] = [];
  private pages: MapObject[] = [];
  private page = 0;
  private busy = false;
  private heatLit = -1;
  private lastMeasure = 0;
  private idleWarn = 0;
  private idleReset = 0;
  private timers: number[] = [];
  private maket: Maket | null = null;
  private objects: Map<string, MapObject>;
  private c: Content;
  private map: City3D;
  private fog: Fog;
  private panel: HTMLElement;
  private root: HTMLElement;
  private mapArea: HTMLElement;

  constructor(c: Content, map: City3D, fog: Fog, panel: HTMLElement, root: HTMLElement, mapArea: HTMLElement) {
    this.c = c;
    this.map = map;
    this.fog = fog;
    this.panel = panel;
    this.root = root;
    this.mapArea = mapArea;
    this.objects = new Map(c.objects.map((o) => [o.id, o]));

    fog.onChange = () => {
      const now = performance.now();
      if (now - this.lastMeasure > 300) {
        this.lastMeasure = now;
        this.check(false);
      }
    };
    fog.onStrokeEnd = () => {
      if (this.screen === "attract") return this.later(1600, () => this.screen === "attract" && this.fog.regrow());
      this.check(true);
    };
    fog.onPointerDown = () => this.note(null); // плашка промаха прячется при следующем касании
    fog.onPoint = (x, y) => this.heat(x, y);
    map.onMarkerTap = (id) => {
      // на листе находки пин переключает страницу
      const i = this.screen === "found" ? this.pages.findIndex((o) => o.id === id) : -1;
      if (i >= 0) {
        this.page = i;
        return this.showSheet();
      }
      if (this.screen !== "stage") this.showInfo(id);
    };
    root.addEventListener("pointerdown", () => this.kickIdle(), { capture: true });
  }

  get stage(): Stage {
    return this.c.stages[this.stageIdx];
  }

  // ——— Заставка ———

  toAttract() {
    this.reset();
    this.screen = "attract";
    this.root.dataset.screen = "attract";
    this.map.setOpenZones(this.map.zonePaths.keys()); // под калькой — весь город
    this.map.setOthers(true);
    this.fog.enabled = true;
    this.fog.startDemo(7000);
    this.note(`<img src="${base()}svg/ui/icon-finger-swipe.svg" alt="">Проведите пальцем по кальке`);
    this.panel.innerHTML = `
      <p class="eyebrow">Игорь Покровский · главный архитектор Зеленограда 1964–2002</p>
      <h1 class="attract-title">Сотри туман</h1>
      <p class="lead">Город, которого не было на картах, появлялся из леса шаг за шагом. Сотрите кальку там, где, по-вашему, его строили.</p>
      <div class="spacer"></div>
      <button class="btn primary big" data-act="play">Играть</button>
      <button class="btn" data-act="tour">Просто посмотреть</button>
      <p class="mono">${this.c.stages.length} этапов · ~3 минуты</p>`;
    this.panel.querySelector(".attract-title")!.parentElement!.classList.add("attract");
    this.bind({ play: () => this.startGame(), tour: () => void this.toExcursion() });
  }

  private reset() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.fog.stopDemo();
    this.maket?.destroy();
    this.maket = null;
    this.root.querySelectorAll(".sheet, .modal").forEach((el) => el.remove());
    this.note(null);
    this.mapArea.querySelector(".hatch")?.remove();
    this.stageIdx = this.hintIdx = this.hintsUsed = 0;
    this.open.clear();
    this.found = [];
    this.busy = false;
    this.map.pan(0);
    this.map.clearPulse();
    this.map.clearFound();
    this.map.showPlan(false);
    this.map.setMarkers([], false);
    this.fog.setOpen([]);
    this.fog.setTarget([]);
    this.fog.reset();
    this.panel.classList.remove("attract");
  }

  /** Отладка/демо: сразу на этап i (0..8), предыдущие считаются пройденными */
  startAt(i: number) {
    this.startGame();
    for (const s of this.c.stages.slice(0, i)) {
      s.zones.forEach((z) => this.open.add(z));
      this.found.push(...s.objectIds.filter((id) => this.objects.has(id)));
    }
    this.map.setOpenZones(this.open);
    this.startStage(i);
  }

  private startGame() {
    this.reset();
    // игра начинается с пустой земли: только контуры будущих кварталов
    this.map.setOpenZones([]);
    this.map.setOthers(false);
    this.startStage(0);
  }

  // ——— Этап ———

  private startStage(i: number) {
    this.stageIdx = i;
    this.hintIdx = 0;
    this.heatLit = -1;
    this.busy = false;
    this.map.clearPulse();
    this.map.pan(0);
    this.fog.setOpen(this.open);
    this.fog.reset();
    const s = this.stage;
    this.fog.lastPoint = null;
    this.map.setMarkers(this.foundObjects(), false, () => "found", false);
    if (s.special === "genplan") return this.showGenplan();
    if (s.special === "maket") return this.showMaket();
    this.screen = "stage";
    this.root.dataset.screen = "stage";
    this.fog.setTarget(s.zones);
    this.fog.enabled = true;
    this.renderStage();
    if (i === 0) this.note(`<b>Сотрите кальку там, где, по-вашему, строили</b><span>Над пальцем подскажет: холодно или горячо. Мимо — туман вернётся.</span>`, "miss rule");
  }

  private renderStage(newHint = false) {
    const s = this.stage;
    this.panel.innerHTML = `
      ${yearsHtml(s.years)}
      <h2 class="stage-title">${esc(s.title)}</h2>
      <div class="flex-mid">
        <p class="question">${esc(s.intro)}</p>
        <div class="box ${newHint ? "new" : ""}">
          <p class="mono">Подсказка ${this.hintIdx + 1} из 3</p>
          <p>${esc(s.hints[this.hintIdx])}</p>
        </div>
      </div>
      ${HEAT_FEEDBACK ? `<div class="heat"><div class="heat-bar">${"<i></i>".repeat(5)}</div><span class="heat-label">Холодно</span></div>` : ""}
      <button class="btn" data-act="hint" ${this.hintIdx >= 2 ? "disabled" : ""}>Ещё подсказка</button>
      ${this.progress()}`;
    this.heatLit = -1;
    this.bind({ hint: () => this.nextHint() });
  }

  private nextHint() {
    if (this.hintIdx >= 2) return;
    this.hintIdx++;
    this.hintsUsed++;
    if (this.hintIdx === 2) this.map.pulse(this.stage.zones);
    this.renderStage(true);
  }

  /** «Тепло/холодно»: близость пальца к цели */
  private heat(x: number, y: number) {
    if (!HEAT_FEEDBACK || this.screen !== "stage" || this.busy) return;
    const u = unit();
    let h = 0;
    for (const id of this.stage.zones) {
      const z = this.map.zoneInfo.get(id);
      if (!z) continue;
      const d = Math.hypot(x - z.x, y - z.y);
      h = Math.max(h, clamp01(1 - (d - z.r) / (HEAT_RANGE * u)));
    }
    this.fog.glowAt(x, y, h);
    this.chip(x, y, h);
    const lit = [0, 1, 2, 3, 4].filter((i) => h * 5 > i + 0.2).length;
    if (lit === this.heatLit) return;
    this.heatLit = lit;
    this.panel.querySelectorAll<HTMLElement>(".heat-bar i").forEach((el, i) => {
      el.style.background = i < lit ? HEAT_COLORS[i] : "";
    });
    const label = this.panel.querySelector(".heat-label");
    if (label) label.textContent = h < 0.25 ? "Холодно" : h < 0.7 ? "Теплее" : "Горячо";
  }

  /** Метка «Холодно/Теплее/Горячо» над пальцем */
  private chip(x: number, y: number, h: number | null) {
    let c = this.mapArea.querySelector<HTMLElement>(".heat-chip");
    if (h === null) return void c?.remove();
    if (!c) {
      c = document.createElement("div");
      c.className = "heat-chip";
      this.mapArea.append(c);
    }
    const i = Math.min(4, Math.floor(h * 5));
    c.textContent = h < 0.25 ? "Холодно" : h < 0.7 ? "Теплее" : "Горячо";
    c.style.background = h < 0.25 ? "var(--paper-3)" : HEAT_COLORS[i];
    c.style.left = `${x}px`;
    c.style.top = `${y}px`;
  }

  private check(strokeEnded: boolean) {
    if (this.screen !== "stage" || this.busy) return;
    const cov = this.fog.measure();
    if (cov.target >= SUCCESS_AT && cov.each.every((v) => v >= EACH_AT)) {
      this.chip(0, 0, null);
      return void this.success();
    }
    if (!strokeEnded) return;
    this.chip(0, 0, null);
    if (cov.wrong > WRONG_AT && cov.target < 0.15) return void this.miss();
    // мелкий промах: стёртое мимо мягко затягивается, найденное в цели остаётся; подсказку не тратим
    if (cov.wrong > 0.003) {
      if (cov.target < 0.05) this.note(`<b>Холодно — здесь ещё лес</b><span>Туман вернулся. Попробуйте в другом месте.</span>`, "miss");
      void this.fog.regrow(900);
    }
  }

  private async miss() {
    if (this.hintIdx < 2) {
      this.hintIdx++;
      this.hintsUsed++;
    }
    if (this.hintIdx === 2) this.map.pulse(this.stage.zones);
    this.renderStage(true);
    this.note(`<b>Мимо: здесь в те годы ещё шумел лес</b><span>Туман вернулся. Новая подсказка ${this.hintIdx + 1} из 3 — справа.</span>`, "miss");
    await this.fog.regrow(900);
  }

  // ——— Находка ———

  private async success() {
    this.busy = true;
    this.fog.enabled = false;
    this.map.clearPulse();
    const s = this.stage;
    const zones = s.zones.map((id) => ({ id, z: this.map.zoneInfo.get(id)! })).filter((x) => x.z);
    const pt = this.fog.lastPoint ?? { x: zones[0].z.x, y: zones[0].z.y };
    const reach = Math.max(...zones.map(({ z }) => Math.hypot(pt.x - z.x, pt.y - z.y) + z.reach)) * 1.05;

    void this.fog.revealFrom(s.zones, pt, reach, 700);
    this.later(300, () => {
      s.zones.forEach((z) => this.open.add(z));
      this.map.setOpenZones(this.open);
      this.map.markFound(s.zones);
    });
    const objs = s.objectIds.map((id) => this.objects.get(id)).filter((o): o is MapObject => !!o);
    this.found.push(...objs.map((o) => o.id));
    const current = new Set(objs.map((o) => o.id));
    this.later(2300, () => this.map.setMarkers(this.foundObjects(), true, (o) => (current.has(o.id) ? "landmark" : "found")));
    this.later(3200, () => {
      // сдвинуть карту так, чтобы зона оказалась в свободной полосе слева от листа
      const u = unit();
      const cx = zones.reduce((a, { z }) => a + z.x, 0) / zones.length;
      const mapW = this.mapArea.clientWidth;
      this.map.pan(Math.min(Math.max(0, cx - 218 * u), 0.34 * mapW));
    });
    this.later(3300, () => {
      this.pages = objs;
      this.page = 0;
      this.screen = "found";
      this.root.dataset.screen = "found";
      this.showSheet(true);
    });
  }

  /** first — выезд с анимацией (только при появлении); листание страниц — без неё */
  private showSheet(first = false) {
    this.root.querySelector(".sheet")?.remove();
    const o = this.pages[this.page];
    this.map.highlight(o.id);
    const n = this.pages.length;
    const last = this.page === n - 1;
    const isLastStage = this.stageIdx === this.c.stages.length - 1;
    const next = !last ? "Дальше →" : isLastStage ? "К финалу →" : `К этапу ${this.stageIdx + 2} →`;
    const fact = this.page === 0 ? this.stage.hiddenFact : "";
    const sheet = this.sheetEl(o, {
      head: `Этап ${this.stageIdx + 1} · ${this.page + 1} из ${n}`,
      dots: n,
      fact,
      back: this.page > 0,
      next,
    });
    if (!first) sheet.classList.add("still");
    this.root.append(sheet);
    this.bind(
      {
        back: () => {
          if (this.page > 0) {
            this.page--;
            this.showSheet();
          }
        },
        next: () => {
          if (!last) {
            this.page++;
            return this.showSheet();
          }
          sheet.remove();
          this.map.pan(0);
          if (!isLastStage) this.startStage(this.stageIdx + 1);
          else void this.toFinal();
        },
      },
      sheet,
    );
  }

  private sheetEl(
    o: MapObject,
    opt: { head: string; dots?: number; fact?: string; back: boolean; next: string; closeOnly?: boolean },
  ): HTMLElement {
    const el = document.createElement("section");
    el.className = "sheet";
    const illu = ILLUSTRATION[o.id];
    const media = o.photo
      ? `<div class="media"><img class="photo" src="${base()}${esc(o.photo)}" alt="">${o.credit ? `<span class="cap">${esc(o.credit)}</span>` : ""}</div>`
      : illu
        ? `<div class="media"><img class="illu" src="${base()}svg/buildings/${illu}.svg" alt=""></div>`
        : `<div class="media ph"><span class="cap">Фото: ${esc(o.name)} · подберёт команда</span></div>`;
    const factLabel = o.legend ? "Городская легенда" : "Неочевидный факт";
    el.innerHTML = `
      <div class="sheet-head">
        <p class="mono">${esc(opt.head)}</p>
        ${opt.dots && opt.dots > 1 ? `<div class="dots">${Array.from({ length: opt.dots }, (_, i) => `<i class="${i === this.page ? "on" : ""}"></i>`).join("")}</div>` : ""}
      </div>
      <div class="sheet-body">
        <div class="sheet-media">
          ${media}
          <div class="qr-row"><div class="qr-slot" data-qr></div><span>Вся история и маршрут — в вашем телефоне</span></div>
        </div>
        <div class="sheet-text">
          <h3>${esc(o.name)}</h3>
          <p class="mono accent">${esc(o.address)} · ${esc(o.year)}</p>
          ${o.authors ? `<p class="authors">${esc(o.authors)}</p>` : ""}
          <p>${esc(o.caption)}</p>
          ${opt.fact ? `<div class="box"><p class="mono accent">${factLabel}</p><p>${esc(opt.fact)}</p></div>` : o.legend ? `<p class="mono accent">${factLabel}</p>` : ""}
        </div>
      </div>
      <div class="sheet-foot">
        ${opt.closeOnly ? "" : `<button class="btn" data-act="back" ${opt.back ? "" : "disabled"}>← Назад</button>`}
        <button class="btn primary" data-act="next">${esc(opt.next)}</button>
      </div>`;
    void qrCanvas(objectUrl(o.id), 240).then((c) => el.querySelector("[data-qr]")?.replaceChildren(c));
    return el;
  }

  // ——— Этап 4: «Двигаем коробки» ———

  private showMaket() {
    this.screen = "maket";
    this.root.dataset.screen = "maket";
    this.fog.enabled = false;
    const s = this.stage;
    this.panel.innerHTML = `
      <p class="mono">Этап ${this.stageIdx + 1} из ${this.c.stages.length}</p>
      ${yearsHtml(s.years)}
      <h2 class="stage-title">Двигаем коробки</h2>
      <div class="flex-mid">
        <p class="question">${esc(s.intro)}</p>
        <div class="box" data-fact hidden><p class="mono accent">Неочевидный факт</p><p>${esc(s.hiddenFact)}</p></div>
      </div>
      <p class="mono" data-count>Поставлено 0 из 4</p>
      <button class="btn primary" data-act="next" disabled>Дальше</button>
      ${this.progress()}`;
    this.maket = new Maket(this.mapArea, (n) => {
      this.panel.querySelector("[data-count]")!.textContent = `Поставлено ${n} из 4`;
      this.panel.querySelector<HTMLButtonElement>("[data-act=next]")!.disabled = n < 4;
      const fact = this.panel.querySelector<HTMLElement>("[data-fact]")!;
      if (n === 4 && fact.hidden) {
        fact.hidden = false;
        fact.classList.add("new");
      }
    });
    this.bind({
      next: () => {
        this.maket?.destroy();
        this.maket = null;
        // макет собран — квартал вырастает в городе, дальше как обычная находка
        this.screen = "stage";
        this.root.dataset.screen = "stage";
        this.fog.setTarget(s.zones);
        void this.success();
      },
    });
  }

  // ——— Генплан (этап 6) ———

  private showGenplan() {
    this.screen = "genplan";
    this.root.dataset.screen = "genplan";
    this.fog.enabled = false;
    // город целиком на время этапа
    this.map.setOpenZones(this.map.zonePaths.keys());
    this.map.showPlan(true);
    const hatch = document.createElement("div");
    hatch.className = "hatch";
    this.mapArea.append(hatch);
    this.note("Скан генплана 1971 · линии поверх карты", "scan");
    const s = this.stage;
    const o = s.objectIds.map((id) => this.objects.get(id)).find(Boolean);
    if (o) this.found.push(o.id);
    this.panel.innerHTML = `
      <p class="mono">Этап ${this.stageIdx + 1} из ${this.c.stages.length} · особый</p>
      ${yearsHtml(s.years)}
      <h2 class="stage-title">${esc(s.title)}</h2>
      <div class="flex-mid">
        <p class="question">${esc(s.intro)}</p>
        <div class="box"><p class="mono accent">Неочевидный факт</p><p>${esc(s.hiddenFact)}</p></div>
      </div>
      <button class="btn primary" data-act="next">Дальше</button>
      ${this.progress()}`;
    this.bind({
      next: () => {
        hatch.remove();
        this.note(null);
        this.map.showPlan(false);
        this.map.setOpenZones(this.open); // вернуть найденное, остальное снова контуры
        this.startStage(this.stageIdx + 1);
      },
    });
  }

  // ——— Финал ———

  private async toFinal() {
    this.screen = "final";
    this.root.dataset.screen = "final";
    this.fog.enabled = false;
    await this.fog.clearAll();
    this.map.setOpenZones(this.map.zonePaths.keys());
    this.map.setOthers(true);
    const perfect = this.hintsUsed === 0;
    const seen = new Set(this.found);
    const pins = this.c.objects.filter((o) => o.id !== "egg" || perfect);
    this.map.setMarkers(pins, true, (o) => (o.id === "egg" ? "secret" : seen.has(o.id) ? "found" : "landmark"));
    const n = this.hintsUsed;
    const egg = this.objects.get("egg");
    this.panel.innerHTML = `
      <p class="mono">${this.c.stages.length} из ${this.c.stages.length} этапов</p>
      <h2 class="final-title">Город найден</h2>
      <div class="score"><b>${n}</b><span>${n === 0 ? "подсказок — вы открыли секрет" : `${plural(n, "подсказка", "подсказки", "подсказок").split(" ")[1]} за ${this.c.stages.length} этапов`}</span></div>
      <p class="mono">Возьмите маршрут с собой</p>
      <div class="routes">
        ${this.c.routes.map((r) => `<button class="route" data-route="${esc(r.id)}"><b>${esc(r.title)}</b><span>${r.stops.length} ${plural(r.stops.length, "точка", "точки", "точек").split(" ")[1]} →</span></button>`).join("")}
      </div>
      ${egg ? `<button class="secret ${perfect ? "open" : ""}" data-act="egg"><img src="${base()}svg/buildings/egg-pokrovskogo.svg" alt=""><span>${perfect ? "Секретная карточка «Яйцо Покровского» открыта" : "Сыграйте без подсказок — откроется секретная карточка"}</span></button>` : ""}
      <div class="spacer"></div>
      <button class="btn primary" data-act="again">Сыграть ещё</button>`;
    this.panel.classList.add("final");
    this.panel.querySelectorAll<HTMLButtonElement>("[data-route]").forEach((b) =>
      b.addEventListener("click", () => this.routeModal(this.c.routes.find((r) => r.id === b.dataset.route)!)),
    );
    this.bind({ again: () => this.toAttract(), egg: () => perfect && this.showInfo("egg") });
  }

  private routeModal(r: Route) {
    const m = document.createElement("div");
    m.className = "modal";
    m.innerHTML = `
      <div class="modal-card">
        <div>
          <p class="mono accent">Маршрут</p>
          <h3>${esc(r.title)}</h3>
          <ol>${r.stops.map((s, i) => `<li><i>${i + 1}</i>${esc(this.objects.get(s.objectId)?.name ?? s.objectId)}</li>`).join("")}</ol>
        </div>
        <div class="modal-side">
          <div class="qr-slot" data-qr></div>
          <span>Наведите камеру телефона</span>
          <button class="btn" data-act="close">Закрыть</button>
        </div>
      </div>`;
    m.addEventListener("click", (e) => e.target === m && m.remove());
    this.root.append(m);
    void qrCanvas(routeUrl(r.id), 300).then((c) => m.querySelector("[data-qr]")?.replaceChildren(c));
    this.bind({ close: () => m.remove() }, m);
  }

  // ——— Экскурсия ———

  private async toExcursion() {
    this.reset();
    this.screen = "excursion";
    this.root.dataset.screen = "excursion";
    this.fog.enabled = false;
    await this.fog.clearAll();
    this.panel.innerHTML = `
      <p class="mono">Экскурсия</p>
      <div class="years"><span class="from" data-year>1975</span></div>
      <input type="range" class="slider" min="1960" max="2020" step="1" value="1975">
      <p class="question">Двигайте ползунок — город вырастет по годам. Нажмите на пин, чтобы узнать о здании.</p>
      <div class="info"></div>
      <div class="spacer"></div>
      <button class="btn primary" data-act="play">Играть</button>
      <button class="btn" data-act="back">← На главную</button>`;
    const slider = this.panel.querySelector<HTMLInputElement>(".slider")!;
    const info = this.panel.querySelector<HTMLElement>(".info")!;
    const apply = () => {
      const y = +slider.value;
      this.panel.querySelector("[data-year]")!.textContent = String(y);
      info.innerHTML = "";
      const shown = this.c.stages.filter((s) => parseInt(s.years, 10) <= y);
      this.map.setOpenZones(shown.flatMap((s) => s.zones));
      this.map.setOthers(y >= 2000);
      const objs = shown.flatMap((s) => s.objectIds).map((id) => this.objects.get(id)).filter((o): o is MapObject => !!o);
      this.map.setMarkers(objs, true, () => "landmark", false);
    };
    slider.addEventListener("input", apply);
    apply();
    this.bind({ play: () => this.startGame(), back: () => this.toAttract() });
  }

  /** Тап по пину: в экскурсии — в панели, иначе — лист поверх */
  private showInfo(id: string) {
    const o = this.objects.get(id);
    if (!o) return;
    if (this.screen === "excursion") {
      const info = this.panel.querySelector<HTMLElement>(".info");
      const illu = ILLUSTRATION[o.id];
      if (info)
        info.innerHTML = `<div class="box">${illu ? `<img src="${base()}svg/buildings/${illu}.svg" alt="" style="height:calc(120*var(--u));object-fit:contain">` : ""}<p><b>${esc(o.name)}</b></p><p class="mono accent">${esc(o.year)}</p></div>`;
      return;
    }
    this.root.querySelector(".sheet")?.remove();
    const sheet = this.sheetEl(o, { head: o.id === "egg" ? "Секретная карточка" : o.address, back: false, next: "Закрыть", closeOnly: true });
    this.root.append(sheet);
    this.bind({ next: () => sheet.remove() }, sheet);
  }

  // ——— вспомогательное ———

  /** Плашка на карте слева внизу; null — убрать */
  private note(html: string | null, kind = "") {
    this.mapArea.querySelectorAll(`.map-note${kind ? "" : ""}`).forEach((n) => {
      if (!n.classList.contains("idle")) n.remove();
    });
    if (!html) return;
    const n = document.createElement("div");
    n.className = `map-note ${kind}`;
    n.innerHTML = html;
    this.mapArea.append(n);
  }

  private progress() {
    const n = this.c.stages.length;
    return `<div class="progress">${Array.from({ length: n }, (_, i) => {
      const cls = i < this.stageIdx ? "done" : i === this.stageIdx ? "current" : "future";
      return `<div class="cell ${cls}"><img src="${base()}svg/stages/stage-${i + 1}.svg" alt=""><span class="bar"></span></div>`;
    }).join("")}</div>`;
  }

  private foundObjects(): MapObject[] {
    return [...new Set(this.found)].map((id) => this.objects.get(id)).filter((o): o is MapObject => !!o);
  }

  private bind(acts: Record<string, () => void>, scope: HTMLElement = this.panel) {
    scope.querySelectorAll<HTMLElement>("[data-act]").forEach((el) => {
      const fn = acts[el.dataset.act!];
      if (fn) el.addEventListener("click", fn);
    });
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private kickIdle() {
    clearTimeout(this.idleWarn);
    clearTimeout(this.idleReset);
    this.mapArea.querySelector(".map-note.idle")?.remove();
    if (this.screen === "attract") return;
    this.idleWarn = window.setTimeout(() => {
      const n = document.createElement("div");
      n.className = "map-note idle";
      n.innerHTML = `<b>Вы ещё здесь?</b><button class="btn primary">Я здесь</button>`;
      this.mapArea.append(n);
    }, IDLE_WARN_MS);
    this.idleReset = window.setTimeout(() => this.toAttract(), IDLE_MS);
  }
}

function yearsHtml(years: string): string {
  const [from, to] = years.split(/\s*[–—-]\s*/);
  return `<div class="years"><span class="from">${esc(from)}</span>${to ? `<span class="to">—${esc(to)}</span>` : ""}</div>`;
}

/** px на единицу макета 1280×800 (как --u в CSS) */
function unit(): number {
  return Math.min(2, Math.max(1, Math.min(innerWidth / 1280, innerHeight / 800)));
}

function base(): string {
  return import.meta.env.BASE_URL;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many;
  return `${n} ${w}`;
}
