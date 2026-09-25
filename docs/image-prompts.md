---
tags: [docs, design, images]
updated: 2026-09-25
---

# Промпты для генерации картинок

← [[index]] · связано: [[design]], [[design-brief]]

Куда: **ChatGPT (GPT-image)** — основное, лучше держит стиль и композицию. **Шедеврум / Kandinsky** — запасные, доступны без VPN; писать туда по-русски.

## Что НЕ генерируем

- Фото реальных зданий «под архив»: это фальсификация, используем настоящие архивные фото.
- Портрет Покровского: реальный человек.
- Схему города: геометрия из OSM, стиль из Claude Design.

Сгенерированная иллюстрация на стенде подписывается как иллюстрация, а не как документ.

## Общий стиль (приклеивать к каждому промпту)

```
Style: architectural drawing on warm tracing paper (#F1ECE2), graphite ink lines (#1F1F1D),
subtle paper grain, restrained Soviet modernism 1960s–70s, clean, lots of empty space,
limited palette with a single accent of muted green (#2E6A4F) or signal red (#D0452B).
No text, no letters, no logos, no Soviet symbols, no people's faces.
```

## Список

| # | Для чего | Размер | Промпт (к нему + общий стиль) |
|---|---|---|---|
| 1 | Текстура бумаги-кальки, фон | 2048×2048, бесшовная | `Seamless texture of warm architectural tracing paper, very subtle fibers and grain, flat even lighting, no shadows, no objects.` |
| 2 | Текстура тумана | 1024×1024, бесшовная | `Seamless texture of soft milky white fog / frosted tracing paper, delicate cloudy noise, very low contrast, pure white to off-white, no objects.` |
| 3 | Фон заставки | 2560×1600 | `Top-down view of an architect's desk: large sheet of tracing paper with faint masterplan of a modernist satellite town among pine forest, drafting triangle, pencil, scale ruler at the edges, morning light, the center left empty for a title.` |
| 4 | Атмосфера этапа 1 | 1600×1000 | `1960, empty snowy field at the edge of a pine forest, a small river and a dirt road, a few construction trailers and a tower crane, first prefabricated panel building frame rising, drawn as a graphite architectural sketch.` |
| 5 | «Флейта» — героическая иллюстрация | 2400×800 | `Very long horizontal 9-storey modernist residential slab raised on V-shaped concrete pillars, rhythmic pattern of loggias like holes of a flute, stretching across a pine forest, elevation drawing, graphite lines, one accent color.` |
| 6 | КЦ «Зеленоград» — интерьер | 1600×1000 | `Interior of a late-Soviet modernist culture palace: ceiling made of equilateral triangular concrete coffers, glass dome atrium, spiral staircase, marble floor, architectural perspective sketch.` |
| 7 | QR-открытка (фон) | 1200×1800 (4×6) | `Postcard layout: modernist satellite town skyline of brick towers and a long slab building among pines, seen from a highway, graphite sketch, generous empty area at the bottom for a quote.` |
| 8 | Паттерн «соты» (запасной, если Claude Design не даст SVG) | 1024×1024, бесшовная | `Seamless pattern of equilateral triangles forming a coffered ceiling grid, thin graphite lines on tracing paper.` |
| 9 | Секретная карточка «Яйцо» | 1200×1600 | `Spiral staircase seen from below inside a round atrium, light falling from a triangular glass dome, architectural sketch, sense of discovery.` |

## Версии для Шедеврума / Kandinsky (по-русски)

Общий стиль: `архитектурный рисунок графитом на тёплой кальке, советский модернизм 1960-х, много воздуха, приглушённый зелёный акцент, без текста и надписей`.

- Фон заставки: `стол архитектора сверху, лист кальки с генпланом города среди соснового леса, треугольник, карандаш, линейка по краям, центр пустой` + стиль.
- «Флейта»: `очень длинный девятиэтажный жилой дом на V-образных опорах, ритм лоджий как у флейты, среди сосен, фасадный чертёж` + стиль.
- Туман: `бесшовная текстура молочного тумана, матовая калька, очень низкий контраст, белый` .

## Где хранить

Готовые файлы → `public/illustrations/` (после создания проекта). Имена: `bg-attract.webp`, `fog.png`, `flute-hero.webp` и т.п. Исходники и промпт записывать рядом в `public/illustrations/SOURCES.md`: что сгенерировано, где и каким промптом.
