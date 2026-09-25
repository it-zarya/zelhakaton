---
tags: [docs, architecture]
updated: 2026-09-25
---

# Архитектура

← [[index]] · связано: [[gameplay]], [[decisions/0001-svg-map|ADR 0001]], [[decisions/0002-vite-ts-vanilla|ADR 0002]]

> Каркас и движок написаны 2026-09-25. Вид — изометрический 3D-город ([[decisions/0004-isometric-3d-city|ADR 0004]]). Отладка: `?nofog`.

## Стек

Vite + TypeScript, без UI-фреймворка. Сборка — статика (`dist/`), которая открывается на планшете и хостится для мобильных QR-страниц. Почему: [[decisions/0002-vite-ts-vanilla|ADR 0002]].

Зависимости — минимум:
- генерация QR на клиенте (библиотеку выбрать через context7 перед установкой);
- больше ничего обязательного.

## Слои экрана игры

```
┌──────────────────────────────── 100vw × 100vh, landscape ─┐
│  map-stage (≈70%)                     │  side-panel (≈30%)  │
│  ┌─ <svg> схема города ─────────────┐ │  год, заголовок     │
│  │  мкр-полигоны, улицы, ж/д, река  │ │  подсказка          │
│  │  здания-иконки (скрыты)          │ │  карточка здания    │
│  └──────────────────────────────────┘ │  QR                 │
│  ┌─ <canvas> туман (поверх SVG) ────┐ │                     │
│  └──────────────────────────────────┘ │  прогресс 9 шагов   │
└─────────────────────────────────────────────────────────────┘
```

- **Карта** — один SVG (`viewBox` фиксированный), у каждого мкр `<path id="mkr-01">`. Почему SVG, а не тайлы: [[decisions/0001-svg-map|ADR 0001]].
- **Туман** — `<canvas>` того же размера. Стирание: `globalCompositeOperation = 'destination-out'` по траектории pointer-событий.
- **Проверка зоны** — рядом держим offscreen canvas-маску: каждая зона залита своим цветом (id → цвет). Процент очистки = доля пикселей зоны, у которых в тумане alpha ≈ 0. Считать по уменьшенной копии (например, 1/4), с троттлингом ~300 мс.

## Данные

Весь контент — в JSON, код ничего не знает о Зеленограде:

```
src/data/
  stages.json    // id, years, title, zones[], hints[3], objectIds[], fact
  objects.json   // id, name, address, year, authors, caption, qrText, photo, photoCredit
  routes.json    // id, title, duration, distance, stops[objectId]
```

Контент готовится **до** хакатона из `source/` с учётом исправлений из [[content]].

## Структура кода

```
index.html              // viewport без зума, #app
src/
  main.ts               // загрузка, выбор режима (киоск / мобильная QR-страница), resize
  game.ts               // Game: attract → stage ⇄ miss → found (лист) → maket (этап 4) → genplan → final; idle 45/60 с
  fog.ts                // Fog: canvas-туман, стирание (Pointer Events), reveal/regrow/clearAll, measure()
  city3d.ts             // City3D: Three.js-изометрия из public/city.json + SVG-оверлей (пульсация, генплан, маркеры)
  mobile.ts             // #/o/<id>, #/r/<id> — страницы для телефона
  qr.ts                 // QR (пакет qrcode), PUBLIC_URL
  types.ts              // контракт данных
  util.ts               // esc(), paragraphs()
  kiosk.css             // UI по токенам Claude Design (--u = px макета 1280×800)
  mobile.css            // мобильные QR-страницы
  data/zones.json       // генерируется из OSM
  data/stages.json, objects.json, routes.json
public/map.svg          // 2D-схема и источник полигонов зон: npm run map
public/svg/             // ассеты Claude Design: buildings, markers, stages, ui
design/                 // экспорт Claude Design (исходник), разбор — docs/design-handoff.md
public/city.json        // здания/лес/вода/дороги для 3D: python3 tools/osm/build_city.py
tools/osm/              // query/buildings.overpassql, raw/buildings.json, build_map.py, build_city.py
tools/content/          // build_content.py → src/data/{stages,objects,routes}.json
```

## Админка контента

`admin.html` → `src/admin.ts` (отдельная точка входа, не импортирует контент — сохранение не перезагружает её).
API — `vite-admin-plugin.ts` (`apply: "serve"`, в сборку не попадает): `GET/PUT /__admin/content`, `POST /__admin/photo?name=…`.
Защита своими проверками (встроенные CORS/allowedHosts Vite выполняются после наших middleware): только loopback,
изменяющие запросы — с заголовком `X-Admin: 1`, лимиты размера, имя фото `^[a-z0-9-]+\.jpg$` + сигнатура JPEG,
проверка структуры JSON, атомарная запись. Фото уменьшаются в браузере до 1000 px (JPEG 0.82).
Источник правды — `src/data/{stages,objects,routes}.json`; `tools/content/build_content.py` отключён (`--force` перезапишет правки).

## Пороги игры (`src/game.ts`)

| Константа | Значение | Смысл |
|---|---|---|
| `SUCCESS_AT` / `EACH_AT` | 0.6 / 0.4 | очищено ≥60% целевых зон вместе и каждая ≥40% → находка |
| `WRONG_AT` | 0.057 | после штриха стёрто >5,7% карты мимо цели (и цель <15%) → промах |
| `HEAT_RANGE` | 420 | px макета: дальше от края цели — «холодно» |
| `IDLE_WARN_MS` / `IDLE_MS` | 90 000 / 120 000 | «Вы ещё здесь?» / сброс; на карточке, финале, мини-игре ×2 (`READING_X`) |

Подбирать на реальном планшете.

## Карта

`npm run map` пересобирает `public/map.svg` и `src/data/zones.json` из `tools/osm/raw.json`. Соответствие OSM-объект → `mkr-NN` задаётся в `ZONES` в `build_map.py`. Стили в SVG — черновые, в игре их перекрывает `style.css`.

## QR-адреса

`VITE_PUBLIC_URL` (в `.env.local`, не в git) — адрес сервера, на который смотрят QR. Без него берётся текущий origin: для тестов годится, на стенде нет.

## Киоск

- Полный экран + запрет масштабирования: `touch-action: none` на карте, `user-scalable=no`, отключить контекстное меню и выделение.
- Idle 60 с → сброс в заставку.
- Работать **офлайн**: все ассеты локально, никаких CDN (на площадке Wi-Fi может не быть).
