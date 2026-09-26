// Карты маршрутов (SVG из Claude Design, public/svg/routes/<routeId>.svg).
// Вставляем инлайном, а не <img>: так SVG берёт шрифты страницы (IBM Plex Mono) и стили .phone.

export async function mountRouteMap(slot: Element | null, routeId: string, phone = false) {
  if (!slot || !/^[a-z0-9-]+$/.test(routeId)) return;
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}svg/routes/${routeId}.svg`);
    if (!r.ok) return;
    const doc = new DOMParser().parseFromString(await r.text(), "image/svg+xml");
    const svg = doc.documentElement;
    if (svg.nodeName !== "svg") return;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.classList.add("route-svg");
    if (phone) svg.classList.add("phone");
    slot.replaceChildren(document.importNode(svg, true));
  } catch {
    /* офлайн или нет карты — окно маршрута работает и без неё */
  }
}
