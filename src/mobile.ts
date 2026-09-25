// Мобильные страницы по QR: #/o/<objectId>, #/r/<routeId>. Открываются на телефоне посетителя.

import type { Content, MapObject } from "./types";
import { esc, paragraphs } from "./util";

export function isMobileRoute(): boolean {
  return /^#\/(o|r)\//.test(location.hash);
}

export function renderMobile(root: HTMLElement, c: Content) {
  document.body.classList.add("mobile");
  const [, kind, id] = location.hash.match(/^#\/(o|r)\/(.+)$/) ?? [];
  const objects = new Map(c.objects.map((o) => [o.id, o]));
  let html = `<p class="m-empty">Страница не найдена</p>`;

  if (kind === "o" && objects.has(id)) {
    html = objectHtml(objects.get(id)!, true);
  }
  if (kind === "r") {
    const r = c.routes.find((x) => x.id === id);
    if (r) {
      const stops = r.stops.map((s) => ({ ...s, o: objects.get(s.objectId) })).filter((s) => s.o);
      const pts = stops.filter((s) => s.o!.lat != null).map((s) => `${s.o!.lat},${s.o!.lon}`);
      const ymaps = pts.length > 1 ? `https://yandex.ru/maps/?rtext=${pts.join("~")}&rtt=pd` : "";
      html = `
        <header class="m-head">
          <p class="eyebrow">Прогулка по городу Покровского</p>
          <h1>${esc(r.title)}</h1>
          <p class="meta">${esc(r.duration)} · ${esc(r.distance)}</p>
          <p>${esc(r.description)}</p>
          ${ymaps ? `<a class="btn primary" href="${esc(ymaps)}" target="_blank" rel="noopener">Маршрут в Яндекс Картах</a>` : ""}
        </header>
        <ol class="m-stops">
          ${stops
            .map(
              (s, i) => `<li>
                <details ${i === 0 ? "open" : ""}>
                  <summary><span class="num">${i + 1}</span> ${esc(s.o!.name)}${s.walk ? ` <span class="walk">${esc(s.walk)}</span>` : ""}</summary>
                  ${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}
                  ${objectHtml(s.o!, false)}
                </details>
              </li>`,
            )
            .join("")}
        </ol>`;
    }
  }

  root.innerHTML = `<main class="m-page">${html}
    <footer class="m-foot">Выставка «Игорь Покровский. Архитектор Зеленограда»<br>Карта © участники OpenStreetMap</footer></main>`;
}

function objectHtml(o: MapObject, full: boolean): string {
  const map =
    o.lat != null ? `<a class="btn ghost" href="https://yandex.ru/maps/?pt=${o.lon},${o.lat}&z=16&l=map" target="_blank" rel="noopener">Открыть на карте</a>` : "";
  return `
    <article class="m-object">
      ${o.photo ? `<figure><img src="${import.meta.env.BASE_URL}${esc(o.photo)}" alt="${esc(o.name)}">${o.credit ? `<figcaption>${esc(o.credit)}</figcaption>` : ""}</figure>` : ""}
      ${full ? `<h1>${esc(o.qrTitle)}</h1><p class="eyebrow">${esc(o.name)}</p>` : `<h2>${esc(o.qrTitle)}</h2>`}
      <p class="meta">${esc(o.address)} · ${esc(o.year)}</p>
      ${o.authors ? `<p class="authors">${esc(o.authors)}</p>` : ""}
      ${o.legend ? `<p class="legend">Содержит городскую легенду</p>` : ""}
      <div class="m-text">${paragraphs(o.qrText)}</div>
      ${map}
      ${
        full && o.sources.length
          ? `<details class="m-sources"><summary>Источники</summary><ul>${o.sources
              .map((u) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(new URL(u).hostname)}</a></li>`)
              .join("")}</ul></details>`
          : ""
      }
    </article>`;
}
