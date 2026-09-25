// Этап 4 «Двигаем коробки», v3 из Claude Design (design/Этап 4 v3 - прототип.dc.html).
// Изометрическая доска-сетка 30×14: 12 домов (5 девятиэтажек, 3 куска бульвара, 4 пары башен),
// правила — из проверенных фактов (docs/factcheck.md): бульвар — север, башни с магазинами — юг, 9-этажки — в глубину.
// Доска рисуется в координатах макета 884×800 и масштабируется под .map-area.

import { esc } from "./util";

type Kind = "tower" | "nine" | "boul";
interface Piece {
  id: string;
  type: Kind;
  o: string;
  c: number | null;
  r: number | null;
  v?: string; // вариант фасада девятиэтажки (tools/stage4/nine-variants.cjs)
}

const L = {
  G: 8,
  COLS: 30,
  ROWS: 14,
  k: 2.2385,
  vbX: -138.5641,
  vbY: -47.1184,
  ax: 112,
  ay: 184,
  grid: [
    "FFFFFF..HHHHHH......WWWWWFFFFF",
    "FFFFFF..HHHHHH......WWWWWFFFFF",
    "FFFFFF........HH....WWWWWFFFFF",
    "FFFFFF........HH.........FFFFF",
    "........FFFF..HH....HHHHHFFFFF",
    "........FFFF..HH....HHHHHFFFFF",
    "FFFF..........................",
    "FFFF..........................",
    "FFFF..........................",
    "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
    "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
    "..............................",
    "..............................",
    "..............................",
  ],
};
const COS = Math.cos(Math.PI / 6);
const toPx = (x: number, y: number, z = 0): [number, number] => [
  ((x - y) * COS - L.vbX) * L.k,
  ((x + y) / 2 - z - L.vbY) * L.k,
];
const toWorld = (px: number, py: number): [number, number] => {
  const u = px / L.k + L.vbX;
  const v = py / L.k + L.vbY;
  return [(u / COS + 2 * v) / 2, (2 * v - u / COS) / 2];
};
const zoneOf = (r: number) => (r <= 5 ? "depth" : r <= 8 ? "south" : r <= 10 ? "road" : "north");
/** Существующие дома 4-го мкр — отдельные спрайты (tools/stage4/board-split.cjs), чтобы сортировались по глубине */
const EXISTING: [number, number, number, number][] = [
  [8, 0, 6, 2],
  [14, 2, 2, 4],
  [20, 4, 5, 2],
];
const HOME: Record<Kind, string> = { nine: "depth", boul: "north", tower: "south" };
const SIZE: Record<Kind, Record<string, [number, number]>> = {
  tower: { front: [6, 3], back: [6, 3], east: [3, 6], west: [3, 6] },
  nine: { along: [5, 2], across: [2, 5] },
  boul: { along: [8, 3], across: [3, 8] },
};
const CYCLE: Record<Kind, string[]> = { tower: ["front", "east", "back", "west"], nine: ["along", "across"], boul: ["along", "across"] };

const MSG: Record<string, string> = {
  start: "Возьмите дом из лотка и перетащите на макет. Касание поворачивает дом — в лотке и на макете.",
  road: "Проспект — магистраль. На проезжей части не строят.",
  forest: "Лес — часть города. Дома вписывают в ландшафт, а не ставят поверх него.",
  water: "Пруд оставляем: дома вписывают в ландшафт.",
  house: "Здесь уже стоят дома 4-го микрорайона.",
  busy_nine: "Здесь уже стоит дом.",
  busy_tower: "Здесь уже стоят башни.",
  busy_boul: "Здесь уже бульвар.",
  cross_tower: "Пара башен выходит на проспект целиком. Коснитесь, чтобы повернуть.",
  cross_nine: "Дом залезает на соседний участок. Попробуйте повернуть его касанием.",
  cross_boul: "Бульвар тянется вдоль проспекта. Коснитесь, чтобы повернуть.",
  north_nine: "Северная сторона — прогулочный бульвар. Дома здесь не ставят.",
  north_tower: "Северная сторона — прогулочный бульвар. Дома здесь не ставят.",
  south_nine: "Проспект хотели застроить обычными девятиэтажками. Покровский предложил подождать.",
  south_boul: "Бульвар идёт по северной стороне проспекта.",
  depth_boul: "Бульвар идёт по северной стороне проспекта.",
  depth_tower: "Магазины в нижних этажах башен должны выходить на проспект.",
  locked: "Проект для проспекта ещё ищут. Сначала найдите место хотя бы двум девятиэтажкам.",
  arrived: "Покровский нашёл проект: парные 17-этажные башни с магазинами внизу. Они в лотке.",
  ok_nine: "Девятиэтажка вписалась в микрорайон.",
  ok_boul: "Бульвар — на северной стороне, для прогулок.",
  ok_tower: "Магазины выходят на проспект.",
  back_tower: "Витрины смотрят во двор. Коснитесь башен, чтобы развернуть их к проспекту.",
  no_room: "Для поворота здесь мало места — перетащите дом.",
  done: "Все 12 домов на макете. Сравним с Покровским?",
};
const HINTS = [
  "Север на макете — ближе к вам. Ближняя сторона проспекта — прогулочный бульвар, дальняя (южная) — башни с магазинами внизу.",
  "Девятиэтажкам — место в глубине микрорайона, между лесом, прудом и старыми домами. Три из пяти встанут только повёрнутыми.",
  "Пока вы держите дом, его зона подсвечена зелёным.",
];
const MSG_BG: Record<string, string> = { info: "#F7F4ED", ok: "#E5EBD9", soft: "#FFF1CF", no: "#FFE6D2" };

const INIT = (): Piece[] =>
  (
    [
      ["n1", "nine", "along"], ["n2", "nine", "along"], ["n3", "nine", "across"], ["n4", "nine", "along"], ["n5", "nine", "along"],
      ["b1", "boul", "across"], ["b2", "boul", "along"], ["b3", "boul", "across"],
      ["t1", "tower", "east"], ["t2", "tower", "back"], ["t3", "tower", "west"], ["t4", "tower", "back"],
    ] as [string, Kind, string][]
  ).map(([id, type, o], i) => ({ id, type, o, c: null, r: null, v: type === "nine" ? "abcde"[i] : undefined }));

/** Схема «как у Покровского» — условна, позиции по OSM */
const SOLUTION: Record<string, [number, number, string]> = {
  n1: [0, 4, "along"], n2: [6, 0, "across"], n3: [8, 2, "along"], n4: [16, 0, "across"], n5: [18, 0, "across"],
  b1: [1, 11, "along"], b2: [11, 11, "along"], b3: [21, 11, "along"],
  t1: [5, 6, "front"], t2: [11, 6, "front"], t3: [17, 6, "front"], t4: [23, 6, "front"],
};

const fpPoly = (c: number, r: number, w: number, h: number) =>
  [[c, r], [c + w, r], [c + w, r + h], [c, r + h]]
    .map(([x, y]) => toPx(x * L.G, y * L.G).map((v) => v.toFixed(1)).join(","))
    .join(" ");

export interface MaketResult {
  stars: number;
  rejections: number;
  hints: number;
}

export class Maket {
  private root: HTMLElement;
  private stage: HTMLElement;
  private panel: HTMLElement;
  private pieces = INIT();
  private drag: { id: string; x: number; y: number } | null = null;
  private rej: { id: string; c: number; r: number } | null = null;
  private msg = MSG.start;
  private msgKind = "info";
  private rejections = 0;
  private hints = 0;
  private phase: "build" | "result" = "build";
  private unlocked = false;
  private rejT = 0;
  private pending: { id: string; start: [number, number]; moved: boolean } | null = null;
  private opts: { progress: () => string; onHint: () => void; onDone: (r: MaketResult) => void; years: [string, string] };
  private base = import.meta.env.BASE_URL;

  constructor(area: HTMLElement, panel: HTMLElement, opts: Maket["opts"]) {
    this.panel = panel;
    this.opts = opts;
    this.root = document.createElement("div");
    this.root.className = "mk3";
    this.stage = document.createElement("div");
    this.stage.className = "mk3-stage";
    this.root.append(this.stage);
    area.append(this.root);
    this.stage.addEventListener("pointerdown", (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-piece]");
      if (el) this.begin(e, el.dataset.piece!);
    });
    this.fit();
    window.addEventListener("resize", this.fit);
    this.render();
  }

  destroy() {
    window.removeEventListener("resize", this.fit);
    this.endListen();
    clearTimeout(this.rejT);
    this.root.remove();
  }

  // ——— масштаб доски 884×800 под область карты ———

  private fit = () => {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    const s = Math.min(w / 884, h / 800);
    this.stage.style.transform = `translate(${(w - 884 * s) / 2}px, ${(h - 800 * s) / 2}px) scale(${s})`;
  };

  private pt(e: PointerEvent): [number, number] {
    const r = this.stage.getBoundingClientRect();
    const k = r.width / 884;
    return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
  }

  private get locked() {
    return !this.unlocked;
  }

  private say(key: string, kind = "info") {
    this.msg = MSG[key];
    this.msgKind = kind;
  }

  private src(p: Piece) {
    const f = p.type === "tower" ? `towers-${p.o}` : p.type === "nine" ? `nine-${p.v ?? "a"}-${p.o}` : `boulevard-${p.o}`;
    return `${this.base}svg/stage4v3/${f}.svg`;
  }

  // ——— правила ———

  private snap(p: Piece, pt: [number, number]) {
    const [w, h] = SIZE[p.type][p.o];
    const [x, y] = toWorld(pt[0], pt[1] + 34);
    const c = Math.round(x / L.G - w / 2);
    const r = Math.round(y / L.G - h / 2);
    let rr = r;
    let cc = c;
    // «магнит»: полоса бульвара (север) и полоса башен (юг) ровно в глубину дома — попасть пальцем точно почти невозможно
    const band = p.type === "boul" && h === 3 ? 11 : p.type === "tower" && h === 3 ? 6 : -1;
    if (band >= 0 && Math.abs(r - band) <= 2) {
      rr = band;
      cc = Math.max(0, Math.min(L.COLS - w, c));
    }
    const inside = cc >= 0 && rr >= 0 && cc + w <= L.COLS && rr + h <= L.ROWS && pt[1] < 600;
    return { c: cc, r: rr, w, h, inside };
  }

  private check(p: Piece, c: number, r: number, o: string): string | null {
    const [w, h] = SIZE[p.type][o];
    const kinds = new Set<string>();
    const zones = new Set<string>();
    for (let y = r; y < r + h; y++)
      for (let x = c; x < c + w; x++) {
        const g = L.grid[y][x];
        if (g !== ".") kinds.add(g);
        zones.add(zoneOf(y));
      }
    if (kinds.has("R") || zones.has("road")) return "road";
    if (kinds.has("W")) return "water";
    if (kinds.has("H")) return "house";
    if (kinds.has("F")) return "forest";
    const occ = this.pieces.find((q) => {
      if (q.id === p.id || q.c === null || q.r === null) return false;
      const [qw, qh] = SIZE[q.type][q.o];
      return c < q.c + qw && q.c < c + w && r < q.r + qh && q.r < r + h;
    });
    if (occ) return "busy_" + occ.type; // что именно мешает: дом, башни или бульвар
    if (zones.size > 1) return "cross_" + p.type;
    const z = [...zones][0];
    if (z !== HOME[p.type]) return `${z}_${p.type}`;
    return null;
  }

  // ——— жесты ———

  private begin(e: PointerEvent, id: string) {
    if (this.phase !== "build" || this.rej) return;
    const p = this.pieces.find((q) => q.id === id)!;
    if (p.type === "tower" && this.locked && p.c === null) {
      this.say("locked");
      return this.render();
    }
    e.preventDefault();
    e.stopPropagation();
    this.pending = { id, start: this.pt(e), moved: false };
    window.addEventListener("pointermove", this.mv);
    window.addEventListener("pointerup", this.up);
    window.addEventListener("pointercancel", this.up);
  }

  private mv = (ev: PointerEvent) => {
    const pd = this.pending;
    if (!pd) return;
    const q = this.pt(ev);
    if (!pd.moved && Math.hypot(q[0] - pd.start[0], q[1] - pd.start[1]) > 10) {
      pd.moved = true;
      const p = this.pieces.find((x) => x.id === pd.id)!;
      p.c = p.r = null;
      this.drag = { id: pd.id, x: q[0], y: q[1] };
      this.render();
    }
    if (pd.moved) {
      this.drag = { id: pd.id, x: q[0], y: q[1] };
      this.renderDrag();
    }
  };

  private up = (ev: PointerEvent) => {
    const pd = this.pending;
    this.endListen();
    this.pending = null;
    if (!pd) return;
    if (!pd.moved) this.tap(pd.id);
    else this.drop(pd.id, this.pt(ev));
    this.render();
  };

  private endListen() {
    window.removeEventListener("pointermove", this.mv);
    window.removeEventListener("pointerup", this.up);
    window.removeEventListener("pointercancel", this.up);
  }

  /** Касание поворачивает дом (в лотке — свободно, на макете — если есть место) */
  private tap(id: string) {
    const p = this.pieces.find((q) => q.id === id)!;
    const cyc = CYCLE[p.type];
    if (p.c === null || p.r === null) {
      p.o = cyc[(cyc.indexOf(p.o) + 1) % cyc.length];
      return;
    }
    if (p.type === "tower" && (p.o === "front" || p.o === "back")) {
      p.o = p.o === "front" ? "back" : "front";
      this.say(p.o === "front" ? "ok_tower" : "back_tower", p.o === "front" ? "ok" : "soft");
      return;
    }
    const [w, h] = SIZE[p.type][p.o];
    const o = cyc[(cyc.indexOf(p.o) + 1) % cyc.length];
    const [w2, h2] = SIZE[p.type][o];
    const c = Math.round(p.c + w / 2 - w2 / 2);
    const r = Math.round(p.r + h / 2 - h2 / 2);
    if (c < 0 || r < 0 || c + w2 > L.COLS || r + h2 > L.ROWS || this.check(p, c, r, o)) return this.say("no_room", "soft");
    Object.assign(p, { o, c, r });
  }

  private drop(id: string, pt: [number, number]) {
    const p = this.pieces.find((q) => q.id === id)!;
    const sn = this.snap(p, pt);
    this.drag = null;
    if (!sn.inside) return;
    const err = this.check(p, sn.c, sn.r, p.o);
    if (err?.startsWith("busy_")) return this.say(err);
    if (err) {
      this.rej = { id, c: sn.c, r: sn.r };
      this.rejections++;
      this.say(err, "no");
      clearTimeout(this.rejT);
      this.rejT = window.setTimeout(() => {
        this.rej = null;
        this.render();
      }, 1100);
      return;
    }
    p.c = sn.c;
    p.r = sn.r;
    const nineN = this.pieces.filter((x) => x.type === "nine" && x.c !== null).length;
    const arrive = nineN >= 2 && !this.unlocked;
    const all = this.pieces.every((x) => x.c !== null);
    let key = p.type === "tower" ? (p.o === "front" ? "ok_tower" : "back_tower") : `ok_${p.type}`;
    let kind = p.type === "tower" && p.o !== "front" ? "soft" : "ok";
    if (arrive) [key, kind] = ["arrived", "ok"];
    if (all) [key, kind] = ["done", "ok"];
    this.unlocked = this.unlocked || nineN >= 2;
    this.say(key, kind);
  }

  // ——— отрисовка ———

  private spriteAt(p: Piece, c: number, r: number) {
    const [w, h] = SIZE[p.type][p.o];
    const [x, y] = toPx((c + w / 2) * L.G, (r + h / 2) * L.G);
    return { left: x - L.ax, top: y - L.ay, cy: y };
  }

  private backN() {
    return this.pieces.filter((p) => p.type === "tower" && p.c !== null && p.o !== "front").length;
  }

  private score() {
    let s = 3;
    if (this.rejections >= 3) s--;
    if (this.rejections >= 7 || this.hints >= 2) s--;
    if (this.backN() > 0) s--;
    return Math.max(1, s);
  }

  private render() {
    const placed = this.pieces.filter((p) => p.c !== null);
    const sprites = placed
      .map((p) => {
        const a = this.spriteAt(p, p.c!, p.r!);
        return `<div class="mk3-sprite" style="left:${a.left}px;top:${a.top}px;z-index:${Math.round(a.cy)};background-image:url('${this.src(p)}')">
          <div class="mk3-hit" data-piece="${p.id}"></div></div>`;
      })
      .join("");
    const existing = EXISTING.map(([c, r, w, h], i) => {
      const [x, y] = toPx((c + w / 2) * L.G, (r + h / 2) * L.G);
      return `<div class="mk3-sprite" style="left:${x - L.ax}px;top:${y - L.ay}px;z-index:${Math.round(y)};background-image:url('${this.base}svg/stage4v3/existing-${i + 1}.svg')"></div>`;
    }).join("");
    const side = (col: number, row: number, text: string) => {
      const [x, y] = toPx(col * L.G, row * L.G);
      return `<div class="mk3-side" style="left:${x}px;top:${y}px">${text}</div>`;
    };
    let rej = "";
    if (this.rej) {
      const p = this.pieces.find((x) => x.id === this.rej!.id)!;
      const a = this.spriteAt(p, this.rej.c, this.rej.r);
      const [w, h] = SIZE[p.type][p.o];
      rej = `<div class="mk3-sprite rej" style="left:${a.left}px;top:${a.top}px;background-image:url('${this.src(p)}')"></div>`;
      rej += `<svg class="mk3-svg"><polygon points="${fpPoly(this.rej.c, this.rej.r, w, h)}" fill="#FFD98A" fill-opacity=".7" stroke="#E4572E" stroke-width="2.5" stroke-dasharray="7 6"/></svg>`;
    }
    const badges = placed
      .filter((p) => p.type === "tower" && p.o === "back")
      .map((p) => {
        const a = this.spriteAt(p, p.c!, p.r!);
        return `<div class="mk3-badge" style="left:${a.left + L.ax + 28}px;top:${a.cy - 12}px">↻</div>`;
      })
      .join("");
    const tray = this.pieces
      .map((p) => {
        const gone = p.c !== null || this.drag?.id === p.id || this.rej?.id === p.id;
        const lk = p.type === "tower" && this.locked;
        return `<div class="mk3-cell ${gone ? "gone" : ""} ${lk ? "locked" : ""}" ${gone ? "" : `data-piece="${p.id}"`}>
          <div class="mk3-cell-img" style="background-image:url('${this.src(p)}')"></div>${lk && !gone ? "<b>Ищут…</b>" : ""}</div>`;
      })
      .join("");

    this.stage.innerHTML = `
      <div class="mk3-board"></div>
      <div class="mk3-compass"><div class="dial"><i></i><span>С</span></div><div>СЕВЕР —<br>К ЗРИТЕЛЮ</div></div>
      <svg class="mk3-svg" data-foot></svg>
      ${existing}${sprites}${rej}${badges}
      ${side(L.COLS + 0.4, 12.5, "Север · бульвар")}${side(L.COLS + 0.4, 7.5, "Юг · башни")}
      <div class="mk3-ghost" data-ghost></div>
      <div class="mk3-tray">
        <div class="mk3-tray-head"><span>Лоток · касание поворачивает</span><span>На макете ${placed.length} из 12</span></div>
        <div class="mk3-tray-grid">${tray}</div>
      </div>
      ${this.phase === "result" ? this.resultHtml() : ""}`;
    this.renderDrag();
    this.renderPanel();
  }

  /** Во время перетаскивания обновляем только «призрак» и след на сетке */
  private renderDrag() {
    const ghost = this.stage.querySelector<HTMLElement>("[data-ghost]");
    const foot = this.stage.querySelector<SVGSVGElement>("[data-foot]");
    if (!ghost || !foot) return;
    const p = this.drag && this.pieces.find((x) => x.id === this.drag!.id);
    if (!p || !this.drag) {
      ghost.style.display = "none";
      foot.innerHTML = "";
      return;
    }
    const sn = this.snap(p, [this.drag.x, this.drag.y]);
    let left = this.drag.x - L.ax;
    let top = this.drag.y + 34 - L.ay;
    let polys = "";
    if (sn.inside) {
      const a = this.spriteAt(p, sn.c, sn.r);
      left = a.left;
      top = a.top;
      polys += `<polygon points="${fpPoly(sn.c, sn.r, sn.w, sn.h)}" fill="#FFFFFF" fill-opacity=".55" stroke="#1E1D1A" stroke-width="2.5" stroke-dasharray="7 6"/>`;
    }
    if (this.hints >= 3) {
      const zr: Record<string, [number, number]> = { depth: [0, 6], south: [6, 3], north: [11, 3] };
      const [r0, h] = zr[HOME[p.type]];
      polys = `<polygon points="${fpPoly(0, r0, L.COLS, h)}" fill="#9DB080" fill-opacity=".38" stroke="#5E7F45" stroke-width="2.5"/>` + polys;
    }
    foot.innerHTML = polys;
    ghost.style.display = "block";
    ghost.style.left = `${left}px`;
    ghost.style.top = `${top}px`;
    ghost.style.backgroundImage = `url('${this.src(p)}')`;
  }

  private plan(pieces: Piece[]) {
    const S = 13;
    const out: string[] = [];
    L.grid.forEach((row, r) => {
      for (let c = 0; c < L.COLS; c++) {
        const g = row[c];
        if (g === ".") continue;
        const bg = { F: "#9DB080", W: "#A9C6CC", H: "#C9C2B4", R: "#F8F5EE" }[g];
        out.push(`<i style="left:${c * S}px;top:${r * S}px;width:${S}px;height:${S}px;background:${bg}"></i>`);
      }
    });
    pieces
      .filter((p) => p.c !== null && p.r !== null)
      .forEach((p) => {
        const [w, h] = SIZE[p.type][p.o];
        const b = `left:${p.c! * S + 1}px;top:${p.r! * S + 1}px;width:${w * S - 2}px;height:${h * S - 2}px`;
        if (p.type === "nine") out.push(`<i style="${b};background:#D5D0C6;box-shadow:inset 0 0 0 1.5px #1E1D1A"></i>`);
        if (p.type === "boul") out.push(`<i style="${b};background:#7F9A62"></i>`);
        if (p.type === "tower") {
          const side = { front: "inset 0 -4px 0 #E4572E", back: "inset 0 4px 0 #E4572E", east: "inset -4px 0 0 #E4572E", west: "inset 4px 0 0 #E4572E" }[p.o];
          out.push(`<i style="${b};background:#FBF8F2;box-shadow:inset 0 0 0 1.5px #1E1D1A, ${side}"></i>`);
        }
      });
    return out.join("");
  }

  private resultHtml() {
    const solved = INIT().map((p) => {
      const [c, r, o] = SOLUTION[p.id];
      return { ...p, c, r, o };
    });
    const backN = this.backN();
    const notes = [
      "Девятиэтажки ушли в глубину микрорайона — проспект подождал другой проект.",
      "Лес и пруд остались: дома вписаны в ландшафт.",
      backN === 0 ? "Все четыре пары башен выходят магазинами на проспект." : `У ${backN} ${backN === 1 ? "пары" : "пар"} витрины смотрят во двор.`,
    ];
    return `
      <div class="mk3-result">
        <h3>Ваш макет и макет Покровского</h3>
        <div class="mk3-plans">
          <div><p class="mono">Ваш</p><div class="mk3-plan">${this.plan(this.pieces)}</div></div>
          <div><p class="mono accent">Покровский · 1970–1972</p><div class="mk3-plan">${this.plan(solved)}</div></div>
        </div>
        <div class="mk3-legend">
          <span><i style="background:#FBF8F2;box-shadow:inset 0 0 0 1.5px #1E1D1A,inset 0 -3px 0 #E4572E"></i>Башни, магазины</span>
          <span><i style="background:#D5D0C6;box-shadow:inset 0 0 0 1.5px #1E1D1A"></i>9 этажей</span>
          <span><i style="background:#7F9A62"></i>Бульвар</span>
          <span>Схема Покровского условна: позиции — по OSM</span>
        </div>
        <div class="box"><p class="mono accent">Пометки</p>${notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>
      </div>`;
  }

  private renderPanel() {
    const [from, to] = this.opts.years;
    const years = `<div class="years"><span class="from">${esc(from)}</span>${to ? `<span class="to">—${esc(to)}</span>` : ""}</div>`;
    const placedN = this.pieces.filter((p) => p.c !== null).length;
    if (this.phase === "build") {
      this.panel.innerHTML = `
        ${years}
        <h2 class="stage-title">Двигаем коробки</h2>
        <div class="flex-mid">
          <p class="question">Проспект хотели застроить обычными девятиэтажками. Расставьте 12 домов так, как решил Покровский.</p>
          <div class="box mk3-msg" style="background:${MSG_BG[this.msgKind]}">${esc(this.msg)}</div>
          ${this.hints > 0 ? `<div class="box"><p class="mono">Подсказка ${this.hints} из 3</p><p>${esc(HINTS[this.hints - 1])}</p></div>` : ""}
        </div>
        ${placedN === 12 ? `<button class="btn primary big" data-mk="compare">Сравнить с Покровским</button>` : ""}
        <button class="btn" data-mk="hint" ${this.hints >= 3 ? "disabled" : ""}>${this.hints === 0 ? "Подсказка" : "Ещё подсказка"}</button>
        ${this.opts.progress()}`;
    } else {
      const s = this.score();
      const titles: Record<number, string> = {
        3: "Чутьё главного архитектора",
        2: "Почти как на макете Покровского",
        1: "Проспект собран — сравните с Покровским",
      };
      this.panel.innerHTML = `
        ${years}
        <p class="mono">Архитектурное чутьё</p>
        <div class="mk3-stars">${[0, 1, 2].map((i) => `<i class="${i < s ? "on" : ""}"></i>`).join("")}</div>
        <h2 class="stage-title">${titles[s]}</h2>
        <p class="mono">Отказов ${this.rejections} · подсказок ${this.hints}</p>
        <div class="flex-mid">
          <div class="box"><p class="mono accent">Неочевидный факт</p><p>Башни сдали досрочно — к визиту президента США Никсона 25 мая 1972 года. Визит отменили.</p></div>
        </div>
        ${this.backN() > 0 ? `<button class="btn" data-mk="fix">Развернуть витрины</button>` : ""}
        <button class="btn primary" data-mk="next">Дальше</button>`;
    }
    this.panel.querySelectorAll<HTMLElement>("[data-mk]").forEach((b) =>
      b.addEventListener("click", () => {
        const act = b.dataset.mk;
        if (act === "hint" && this.hints < 3) {
          this.hints++;
          this.opts.onHint();
        }
        if (act === "compare") this.phase = "result";
        if (act === "fix") {
          this.phase = "build";
          this.say("back_tower", "soft");
        }
        if (act === "next") return this.opts.onDone({ stars: this.score(), rejections: this.rejections, hints: this.hints });
        this.render();
      }),
    );
  }
}
