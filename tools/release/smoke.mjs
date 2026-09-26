// Быстрая автопроверка собранного сайта перед выкаткой: node tools/release/smoke.mjs [url]
// Заставка → этап 1 → находка (карточка) → QR-страница → мини-игра. Падает при ошибках JS, 4xx/5xx и внешних запросах.
import { chromium } from "playwright";

const U = (process.argv[2] ?? "http://localhost:4173/").replace(/\/?$/, "/");
const host = new URL(U).host;
// Разрешённые внешние хосты: Яндекс Метрика (счётчик it-zarya.ru, index.html). Всё остальное — только со своего сервера.
const ALLOWED = /(^|\.)(yandex\.ru|yandex\.net)$/;
const allowed = (url) => { try { return ALLOWED.test(new URL(url).host); } catch { return false; } };
const errs = [];
const b = await chromium.launch({ channel: "chrome" });

async function page(path, viewport, fn) {
  const p = await b.newPage({ viewport, hasTouch: true });
  p.on("pageerror", (e) => errs.push(`${path}: JS ${e.message}`));
  p.on("console", (m) => m.type() === "error" && !/favicon/.test(m.location().url) && !allowed(m.location().url) && errs.push(`${path}: console ${m.text()}`));
  p.on("response", (r) => r.status() >= 400 && !/favicon/.test(r.url()) && !allowed(r.url()) && errs.push(`${path}: ${r.status()} ${r.url()}`));
  p.on("request", (r) => new URL(r.url()).host !== host && !r.url().startsWith("data:") && !allowed(r.url()) && errs.push(`${path}: внешний запрос ${r.url().slice(0, 120)}`));
  await p.goto(U + path, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await fn?.(p);
  await p.close();
}

const ok = (cond, msg) => cond || errs.push(msg);

await page("", { width: 1280, height: 800 }, async (p) => {
  ok(await p.isVisible('[data-act="play"]'), "заставка: нет кнопки «Строить город»");
  await p.click('[data-act="play"]');
  await p.waitForTimeout(1500);
  ok(await p.isVisible(".stage-title"), "этап 1 не открылся");
});
await page("?nofog&stage=4", { width: 1280, height: 800 }, async (p) => {
  ok(await p.isVisible(".stage-title"), "?stage=4 не открылся");
});
await page("#/o/korp-118", { width: 390, height: 844 }, async (p) => {
  ok((await p.locator(".m-object img").count()) > 0, "QR-страница korp-118: нет фото");
});
await page("#/maket", { width: 1280, height: 800 }, async (p) => {
  ok(await p.isVisible("text=Двигаем коробки"), "мини-игра #/maket не открылась");
});

// все фото из данных доступны
const objects = (await import("../../src/data/objects.json", { with: { type: "json" } })).default;
for (const o of objects)
  for (const ph of o.photos ?? []) {
    const r = await fetch(U + ph.src, { method: "HEAD" });
    if (!r.ok) errs.push(`фото ${ph.src}: ${r.status}`);
  }

await b.close();
if (errs.length) {
  console.error("✗ Проверка не пройдена:\n  " + errs.join("\n  "));
  process.exit(1);
}
console.log(`✓ Проверка пройдена: ${U}`);
