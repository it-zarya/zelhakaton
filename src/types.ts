// Контракт данных игры. Контент — в src/data/*.json, код ничего не знает о Зеленограде.

/** Зона карты (микрорайон), собирается из OSM: tools/osm/build_map.py → src/data/zones.json */
export interface Zone {
  id: string; // "mkr-01", "mkr-05a", "mkr-11v"
  label: string; // "1", "5а", "11в"
  cx: number; // центроид в координатах viewBox карты
  cy: number;
  area: number;
}

export interface ZonesFile {
  viewBox: [number, number, number, number];
  /** x = (lon*kx - minx)*scale, y = (maxy - lat)*scale */
  projection: { kx: number; minx: number; maxy: number; scale: number };
  zones: Zone[];
}

/** Этап игры */
export interface Stage {
  id: number; // 1..9
  years: string; // "1960–1962"
  title: string; // "Как всё начиналось"
  intro: string; // 1–2 предложения, задают вопрос «где?»
  /** Целевые зоны: игрок должен очистить их. Пусто — этап без поиска (генплан) */
  zones: string[];
  /** Зоны, которые открываются вместе с находкой, но стирать их не нужно (например, отстоящий 7-й мкр) */
  alsoOpens?: string[];
  hints: [string, string, string];
  objectIds: string[]; // награды, в порядке показа
  hiddenFact: string; // «интересный факт» этапа
  special?: "genplan" | "maket";
  /** После находки и карточек — бонус-мини-игра (этап 2: «Двигаем коробки» про проспект) */
  bonus?: "maket";
  /** Карточки, которые открываются после бонуса */
  bonusObjectIds?: string[];
}

/** Здание / объект — карточка и QR-страница */
export interface MapObject {
  id: string; // "korp-118", "fleyta"
  name: string; // «Дом-„Флейта“»
  address: string; // «корп. 360, 3-й мкр»
  year: string; // «1967–1970»
  authors?: string; // «Ф. Новиков (гл. арх.), И. Покровский, Г. Саевич; конструктор Ю. Ионов»
  caption: string; // подпись на экране, ≤ 300 символов
  qrTitle: string;
  qrText: string; // 100–180 слов, абзацы через \n\n
  zone: string; // id зоны
  lat?: number; // для точки на карте; нет — ставим в центроид зоны
  lon?: number;
  photo?: string | null; // путь в public/photos/, заполнит команда
  /** Галерея: несколько фото (листаются касанием). Если есть — важнее photo */
  photos?: { src: string; caption: string; credit: string }[];
  credit?: string; // автор/источник фото
  sources: string[]; // URL источников фактов
  legend?: boolean; // текст содержит городскую легенду — пометить на экране
  fact?: string; // «интересный факт» этого объекта (на его странице листа)
}

export interface Route {
  id: string; // "route-1"
  title: string;
  duration: string; // «40 мин»
  distance: string; // «1,5 км»
  description: string;
  stops: { objectId: string; note?: string; walk?: string }[];
}

/** Тексты экранов (правятся в админке) */
export interface UiTexts {
  attract: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaTitle: string;
    ctaText: string;
    button: string;
    note: string; // {n} — число этапов
    mapNote: string;
  };
}

export interface Content {
  stages: Stage[];
  objects: MapObject[];
  routes: Route[];
  ui?: UiTexts;
}
