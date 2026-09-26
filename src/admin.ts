// Локальная админка контента (#/admin). Работает только с dev-сервером (vite): читает и пишет
// src/data/{stages,objects,routes}.json и загружает фото в public/photos через /__admin/* (vite-admin-plugin.ts).

import "./admin.css";
import type { Content, MapObject, Stage } from "./types";
import zonesFile from "./data/zones.json";
import { esc } from "./util";

type Photo = NonNullable<MapObject["photos"]>[number];

const ZONES = (zonesFile as { zones: { id: string; label: string }[] }).zones;

let data: Content;
let sel: { kind: "stage"; i: number } | { kind: "object"; id: string } | null = null;
let backStage: number | null = null; // из какого этапа открыли объект — для кнопки «← к этапу»
let dirty = false;
let root: HTMLElement;

export async function bootAdmin(el: HTMLElement) {
  root = el;
  document.body.classList.add("admin");
  const res = await fetch("/__admin/content");
  if (!res.ok) {
    root.innerHTML = `<div class="adm-fail"><h1>Админка недоступна</h1><p>Она работает только на ноутбуке с запущенным <code>npm run dev</code> и только по адресу <code>http://localhost:5173/admin.html</code>.</p></div>`;
    return;
  }
  data = await res.json();
  sel = { kind: "stage", i: 0 };
  window.addEventListener("beforeunload", (e) => dirty && e.preventDefault());
  render();
}

// ——— отрисовка ———

function render() {
  root.innerHTML = `
    <aside class="adm-side">
      <h2>Этапы</h2>
      ${data.stages.map((s, i) => `<button class="adm-item ${isSel("stage", i) ? "on" : ""}" data-stage="${i}"><b>${i + 1}</b> ${esc(s.years)} · ${esc(s.title)}</button>`).join("")}
      <button class="adm-add" data-act="add-stage">+ этап</button>
      <h2>Объекты</h2>
      ${data.objects.map((o) => `<button class="adm-item ${isSel("object", o.id) ? "on" : ""}" data-object="${esc(o.id)}">${esc(o.name)} <small>${(o.photos?.length ?? 0) || ""}${o.photos?.length ? " фото" : ""}</small></button>`).join("")}
      <button class="adm-add" data-act="add-object">+ объект</button>
    </aside>
    <main class="adm-main">
      <header class="adm-bar">
        <span class="adm-status">${dirty ? "Есть несохранённые правки" : "Всё сохранено"}</span>
        <button class="adm-btn primary" data-act="save" ${dirty ? "" : "disabled"}>Сохранить</button>
      </header>
      <div class="adm-form">${sel?.kind === "stage" ? stageForm(sel.i) : sel?.kind === "object" ? objectForm(sel.id) : ""}</div>
    </main>`;
  bind();
}

function isSel(kind: string, key: number | string) {
  return sel?.kind === kind && (kind === "stage" ? (sel as { i: number }).i === key : (sel as { id: string }).id === key);
}

const field = (label: string, name: string, value: string, opts: { area?: boolean; rows?: number; max?: number; hint?: string } = {}) => `
  <label class="adm-f">
    <span>${esc(label)}${opts.max ? ` <em data-count="${name}">${value.length}/${opts.max}</em>` : ""}</span>
    ${opts.area ? `<textarea name="${name}" rows="${opts.rows ?? 3}" ${opts.max ? `data-max="${opts.max}"` : ""}>${esc(value)}</textarea>` : `<input name="${name}" value="${esc(value)}">`}
    ${opts.hint ? `<small>${esc(opts.hint)}</small>` : ""}
  </label>`;

const zonePick = (name: string, chosen: string[]) => `
  <div class="adm-zones" data-zones="${name}">
    ${ZONES.map((z) => `<label class="${chosen.includes(z.id) ? "on" : ""}"><input type="checkbox" value="${z.id}" ${chosen.includes(z.id) ? "checked" : ""}>${esc(z.label)}</label>`).join("")}
  </div>`;

function stageForm(i: number) {
  const s = data.stages[i];
  const list = s.objectIds
    .map((id, k) => {
      const o = data.objects.find((x) => x.id === id);
      return `<li><button class="adm-link" data-open="${esc(id)}">${esc(o?.name ?? id + " (нет такого объекта)")}</button>
        <button data-act="obj-edit" data-open="${esc(id)}">✎ изменить</button><button data-act="obj-up" data-k="${k}">↑</button><button data-act="obj-down" data-k="${k}">↓</button><button data-act="obj-del" data-k="${k}">✕</button></li>`;
    })
    .join("");
  const free = data.objects.filter((o) => !s.objectIds.includes(o.id));
  return `
    <h1>Этап ${i + 1} <a href="/?stage=${i + 1}" target="game">открыть в игре ↗</a></h1>
    <div class="adm-row">${field("Годы", "years", s.years, { hint: "«1964–1965», «1980-е–1990-е» — между годами длинное тире" })}${field("Заголовок", "title", s.title)}</div>
    ${field("Подсказка 1", "hint0", s.hints[0], { area: true, rows: 2 })}
    ${field("Подсказка 2", "hint1", s.hints[1], { area: true, rows: 2 })}
    ${field("Подсказка 3", "hint2", s.hints[2], { area: true, rows: 2 })}
    ${field("Интересный факт этапа (на первой карточке)", "hiddenFact", s.hiddenFact, { area: true, rows: 3 })}
    ${field("Вводный текст (на экране сейчас не показывается)", "intro", s.intro, { area: true, rows: 2 })}
    <div class="adm-f"><span>Что стирать на карте</span>${zonePick("zones", s.zones)}</div>
    <div class="adm-f"><span>Открываются сами вместе с находкой</span>${zonePick("alsoOpens", s.alsoOpens ?? [])}</div>
    <div class="adm-f"><span>Карточки этапа (по порядку)</span><ol class="adm-list">${list}</ol>
      ${free.length ? `<select data-act="obj-add"><option value="">+ добавить карточку…</option>${free.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}</option>`).join("")}</select>` : ""}
    </div>
    <label class="adm-f adm-inline"><input type="checkbox" name="genplan" ${s.special === "genplan" ? "checked" : ""}> особый этап «генплан» (без стирания)</label>
    <button class="adm-btn danger" data-act="del-stage">Удалить этап</button>`;
}

function objectForm(id: string) {
  const o = data.objects.find((x) => x.id === id)!;
  const photos = (o.photos ?? [])
    .map(
      (p, k) => `<div class="adm-photo">
        <img src="/${esc(p.src)}" alt="">
        <div>
          ${field("Подпись", `ph-cap-${k}`, p.caption)}
          ${field("Источник / автор", `ph-cred-${k}`, p.credit)}
          <div class="adm-photo-btns"><button data-act="ph-up" data-k="${k}">↑</button><button data-act="ph-down" data-k="${k}">↓</button><button data-act="ph-del" data-k="${k}">Убрать</button></div>
        </div>
      </div>`,
    )
    .join("");
  const usedIn = data.stages.map((s, i) => (s.objectIds.includes(o.id) ? i + 1 : 0)).filter(Boolean);
  return `
    ${backStage !== null ? `<button class="adm-back" data-act="back-stage">← к этапу ${backStage + 1}</button>` : ""}
    <h1>${esc(o.name)} <small>${usedIn.length ? `этап ${usedIn.join(", ")}` : "не входит в этапы"}</small></h1>
    <div class="adm-row">${field("Название", "name", o.name)}${field("Год", "year", o.year)}</div>
    <div class="adm-row">${field("Адрес", "address", o.address)}${field("Авторы", "authors", o.authors ?? "")}</div>
    ${field("Подпись в карточке", "caption", o.caption, { area: true, rows: 3, max: 300 })}
    ${field("Интересный факт объекта", "fact", o.fact ?? "", { area: true, rows: 2, hint: "Показывается на странице объекта. Факт этапа — в настройках этапа." })}
    ${field("Заголовок для телефона (QR)", "qrTitle", o.qrTitle)}
    ${field("Текст для телефона (QR), абзацы — через пустую строку", "qrText", o.qrText, { area: true, rows: 8 })}
    <div class="adm-row">
      <label class="adm-f"><span>Микрорайон (где пин)</span><select name="zone">${ZONES.map((z) => `<option value="${z.id}" ${z.id === o.zone ? "selected" : ""}>${esc(z.label)}</option>`).join("")}</select></label>
      ${field("Широта (необяз.)", "lat", o.lat?.toString() ?? "")}${field("Долгота (необяз.)", "lon", o.lon?.toString() ?? "")}
    </div>
    ${field("Источники (по одной ссылке в строке)", "sources", o.sources.join("\n"), { area: true, rows: 3 })}
    <label class="adm-f adm-inline"><input type="checkbox" name="legend" ${o.legend ? "checked" : ""}> текст содержит городскую легенду</label>
    <h2>Фото <small>касание в игре листает по порядку</small></h2>
    <div class="adm-photos">${photos || "<p>Фото нет — в карточке будет иллюстрация или штриховка.</p>"}</div>
    <label class="adm-upload">+ загрузить фото<input type="file" accept="image/*" multiple data-act="upload"></label>
    <button class="adm-btn danger" data-act="del-object">Удалить объект</button>`;
}

// ——— события ———

function bind() {
  root.querySelectorAll<HTMLElement>("[data-stage]").forEach((b) => b.addEventListener("click", () => ((sel = { kind: "stage", i: +b.dataset.stage! }), (backStage = null), render())));
  root.querySelectorAll<HTMLElement>("[data-object]").forEach((b) => b.addEventListener("click", () => ((sel = { kind: "object", id: b.dataset.object! }), (backStage = null), render())));
  root.querySelectorAll<HTMLElement>("[data-open]").forEach((b) =>
    b.addEventListener("click", () => {
      backStage = sel?.kind === "stage" ? sel.i : null;
      sel = { kind: "object", id: b.dataset.open! };
      render();
      root.querySelector(".adm-form")?.scrollTo(0, 0);
    }),
  );
  const form = root.querySelector<HTMLElement>(".adm-form")!;
  form.addEventListener("input", (e) => onInput(e.target as HTMLInputElement));
  form.addEventListener("change", (e) => onInput(e.target as HTMLInputElement));
  root.querySelectorAll<HTMLElement>("[data-act]").forEach((b) => {
    const act = b.dataset.act!;
    if (act === "obj-add" || act === "upload" || act === "obj-edit") return; // obj-edit — через data-open
    if (act === "back-stage")
      return void b.addEventListener("click", () => {
        sel = { kind: "stage", i: backStage ?? 0 };
        backStage = null;
        render();
      });
    b.addEventListener("click", () => onAct(act, b));
  });
  root.querySelector<HTMLSelectElement>('[data-act="obj-add"]')?.addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value;
    if (v && sel?.kind === "stage") {
      data.stages[sel.i].objectIds.push(v);
      touch();
    }
  });
  root.querySelector<HTMLInputElement>('[data-act="upload"]')?.addEventListener("change", (e) => void upload((e.target as HTMLInputElement).files));
}

function onInput(t: HTMLInputElement) {
  if (!sel || !t.name && !t.closest("[data-zones]")) return;
  const zoneBox = t.closest<HTMLElement>("[data-zones]");
  if (sel.kind === "stage") {
    const s = data.stages[sel.i];
    if (zoneBox) {
      const vals = [...zoneBox.querySelectorAll<HTMLInputElement>("input:checked")].map((x) => x.value);
      if (zoneBox.dataset.zones === "zones") s.zones = vals;
      else s.alsoOpens = vals.length ? vals : undefined;
      t.parentElement!.classList.toggle("on", t.checked);
    } else if (t.name.startsWith("hint")) s.hints[+t.name.slice(4) as 0 | 1 | 2] = t.value;
    else if (t.name === "genplan") s.special = t.checked ? "genplan" : undefined;
    else (s as unknown as Record<string, string>)[t.name] = t.value;
    if (t.name === "years" || t.name === "title") refreshSide();
  } else {
    const o = data.objects.find((x) => x.id === (sel as { id: string }).id)!;
    const m = t.name.match(/^ph-(cap|cred)-(\d+)$/);
    if (m) {
      const p = o.photos![+m[2]];
      if (m[1] === "cap") p.caption = t.value;
      else p.credit = t.value;
    } else if (t.name === "sources") o.sources = t.value.split("\n").map((x) => x.trim()).filter(Boolean);
    else if (t.name === "lat" || t.name === "lon") {
      const n = parseFloat(t.value.replace(",", "."));
      o[t.name] = Number.isFinite(n) ? n : undefined;
    } else if (t.name === "legend") o.legend = t.checked || undefined;
    else if (t.name === "fact" || t.name === "authors") o[t.name] = t.value || undefined;
    else (o as unknown as Record<string, string>)[t.name] = t.value;
    if (t.name === "name") refreshSide();
  }
  const counter = root.querySelector(`[data-count="${t.name}"]`);
  if (counter) counter.textContent = `${t.value.length}/${t.dataset.max}`;
  markDirty();
}

function onAct(act: string, b: HTMLElement) {
  const k = +(b.dataset.k ?? 0);
  const move = <T,>(arr: T[], from: number, to: number) => {
    if (to < 0 || to >= arr.length) return;
    const [x] = arr.splice(from, 1);
    arr.splice(to, 0, x);
  };
  if (act === "save") return void save();
  if (act === "add-stage") {
    data.stages.push({ id: data.stages.length + 1, years: "", title: "Новый этап", intro: "", zones: [], hints: ["", "", ""], objectIds: [], hiddenFact: "" });
    sel = { kind: "stage", i: data.stages.length - 1 };
    return touch();
  }
  if (act === "add-object") {
    const name = prompt("Название объекта");
    if (!name) return;
    const id = slug(name);
    data.objects.push({ id, name, address: "", year: "", caption: "", qrTitle: name, qrText: "", zone: ZONES[0].id, sources: [], photos: [] });
    sel = { kind: "object", id };
    return touch();
  }
  if (sel?.kind === "stage") {
    const s = data.stages[sel.i];
    if (act === "obj-up") move(s.objectIds, k, k - 1);
    if (act === "obj-down") move(s.objectIds, k, k + 1);
    if (act === "obj-del") s.objectIds.splice(k, 1);
    if (act === "del-stage" && confirm(`Удалить этап ${sel.i + 1} «${s.title}»?`)) {
      data.stages.splice(sel.i, 1);
      data.stages.forEach((x, n) => (x.id = n + 1));
      sel = { kind: "stage", i: 0 };
    }
  } else if (sel?.kind === "object") {
    const id = sel.id;
    const o = data.objects.find((x) => x.id === id)!;
    const ph = o.photos ?? [];
    if (act === "ph-up") move(ph, k, k - 1);
    if (act === "ph-down") move(ph, k, k + 1);
    if (act === "ph-del") ph.splice(k, 1);
    if (act === "del-object" && confirm(`Удалить объект «${o.name}»? Он пропадёт из всех этапов и маршрутов.`)) {
      data.objects = data.objects.filter((x) => x.id !== id);
      data.stages.forEach((s) => (s.objectIds = s.objectIds.filter((x) => x !== id)));
      data.routes.forEach((r) => (r.stops = r.stops.filter((x) => x.objectId !== id)));
      sel = { kind: "stage", i: 0 };
    }
  }
  touch();
}

// ——— фото: уменьшаем в браузере до 1000 px, JPEG ———

async function upload(files: FileList | null) {
  if (!files || sel?.kind !== "object") return;
  const o = data.objects.find((x) => x.id === (sel as { id: string }).id)!;
  o.photos ??= [];
  for (const f of [...files]) {
    const blob = await shrink(f, 1000);
    const n = o.photos.length + 1;
    const res = await fetch(`/__admin/photo?name=${encodeURIComponent(`${o.id}-${Date.now().toString(36)}-${n}.jpg`)}`, { method: "POST", body: blob, headers: { "X-Admin": "1" } });
    if (!res.ok) {
      alert(`Не удалось загрузить ${f.name}: ${await res.text()}`);
      continue;
    }
    const { src } = (await res.json()) as { src: string };
    o.photos.push({ src, caption: f.name.replace(/\.[^.]+$/, ""), credit: "" } satisfies Photo);
  }
  touch();
}

async function shrink(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.82));
}

// ——— сохранение ———

async function save() {
  const res = await fetch("/__admin/content", { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin": "1" }, body: JSON.stringify(data) });
  if (!res.ok) return alert(`Не сохранилось: ${await res.text()}`);
  dirty = false;
  render();
}

function touch() {
  markDirty();
  render();
}

function markDirty() {
  dirty = true;
  const st = root.querySelector(".adm-status");
  if (st) st.textContent = "Есть несохранённые правки";
  root.querySelector<HTMLButtonElement>('[data-act="save"]')?.removeAttribute("disabled");
}

function refreshSide() {
  // заголовки в списке слева обновим при следующем render; здесь — только текущий пункт
  const on = root.querySelector(".adm-item.on");
  if (!on || !sel) return;
  if (sel.kind === "stage") {
    const s = data.stages[sel.i];
    on.innerHTML = `<b>${sel.i + 1}</b> ${esc(s.years)} · ${esc(s.title)}`;
  } else {
    const o = data.objects.find((x) => x.id === (sel as { id: string }).id);
    if (o) on.textContent = o.name;
  }
}

function slug(name: string): string {
  const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya" };
  const base = name.toLowerCase().split("").map((ch) => map[ch] ?? ch).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "obj";
  let id = base;
  for (let n = 2; data.objects.some((o) => o.id === id); n++) id = `${base}-${n}`;
  return id;
}

export type { Stage };
