import "@fontsource/unbounded/500.css";
import "@fontsource/unbounded/600.css";
import "@fontsource/unbounded/700.css";
import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/500.css";
import "@fontsource/golos-text/600.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./kiosk.css";
import "./mobile.css";

import zones from "./data/zones.json";
import stages from "./data/stages.json";
import objects from "./data/objects.json";
import routes from "./data/routes.json";
import ui from "./data/ui.json";
import { Fog } from "./fog";
import { Game, fitAttractTitle, fitSheet } from "./game";
import { City3D } from "./city3d";
import { ColorReveal } from "./reveal";
import { Maket } from "./maket";
import { isMobileRoute, renderMobile } from "./mobile";
import type { Content, ZonesFile } from "./types";

const content = { stages, objects, routes, ui } as Content;
const app = document.querySelector<HTMLElement>("#app")!;

/** Отдельный сервис: мини-игра «Двигаем коробки» во весь экран (#/maket) */
function bootMaket() {
  app.innerHTML = `<section class="map-area"></section><aside class="panel"></aside>`;
  const area = app.querySelector<HTMLElement>(".map-area")!;
  const panel = app.querySelector<HTMLElement>(".panel")!;
  app.dataset.screen = "maket";
  let maket: Maket | null = null;
  let idle = 0;
  const start = () => {
    maket?.destroy();
    maket = new Maket(area, panel, {
      years: ["1970", "1972"],
      progress: () => "",
      onHint: () => {},
      onDone: () => start(), // «Собрать заново»
      doneLabel: "Собрать заново",
    });
  };
  // 3 минуты без касаний — макет собирается заново для следующего посетителя
  const kick = () => {
    clearTimeout(idle);
    idle = window.setTimeout(start, 180_000);
  };
  app.addEventListener("pointerdown", kick, { capture: true });
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  start();
  kick();
}

async function boot() {
  if (isMobileRoute()) return renderMobile(app, content);
  if (location.hash === "#/maket") return bootMaket();

  app.innerHTML = `
    <section class="map-area"><div class="map-frame"><canvas class="fog"></canvas><canvas class="glow"></canvas></div></section>
    <aside class="panel"></aside>`;
  const area = app.querySelector<HTMLElement>(".map-area")!;
  const frame = app.querySelector<HTMLElement>(".map-frame")!;
  const canvas = app.querySelector<HTMLCanvasElement>(".fog")!;
  const panel = app.querySelector<HTMLElement>(".panel")!;

  const map = new City3D(frame, zones as ZonesFile, content.objects);
  await map.load();
  map.fit(area);
  const fog = new Fog(canvas, map.viewBox, map.zonePaths);
  fog.attachGlow(app.querySelector<HTMLCanvasElement>(".glow")!);
  fog.resize();
  const reveal = new ColorReveal(map.canvas, canvas);
  map.canvas.after(reveal.canvas); // над ч/б городом, под туманом
  reveal.setPaths(map.zonePaths);

  const game = new Game(content, map, fog, panel, app, area, reveal);
  game.toAttract();
  // Отладка: ?nofog — город без тумана; ?stage=N — сразу на этап N
  const q = new URLSearchParams(location.search);
  if (q.has("nofog")) canvas.style.display = "none";
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game; // только dev: проверки из браузера
  if (q.has("stage")) game.startAt(Math.max(0, Math.min(content.stages.length - 1, Number(q.get("stage")) - 1)));

  // Киоск: без контекстного меню, без зума жестами
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("gesturestart", (e) => e.preventDefault());

  let t = 0;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = window.setTimeout(() => {
      map.fit(area);
      fog.setShapes(map.viewBox, map.zonePaths);
      reveal.setPaths(map.zonePaths);
      fog.resize(); // туман перерисуется с учётом открытых зон
      fitAttractTitle(panel);
      document.querySelectorAll<HTMLElement>(".sheet").forEach(fitSheet);
    }, 150);
  });
}

window.addEventListener("hashchange", () => location.reload());
void boot();
