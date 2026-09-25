---
tags: [docs, research]
updated: 2026-09-25
---

# Ресерч: данные, права, аналоги, идеи

← [[index]] · связано: [[architecture]], [[design]], [[gameplay]]

## Карта: полигоны микрорайонов из OSM

- `place=neighbourhood` есть примерно у 80% мкр: 1, 2, 3, 4, 5а, 6, 7, 8а, 8Б, 9, 10, 11а/б/в, 12, 14–20, 23. Нет полигонов у **5, 22** (у 22 только точка). 13-го мкр нет, 21-го пока нет. Недостающее дорисовать в geojson.io примерно за час.
- Overpass: основные сервера отдавали ошибку, сработало зеркало **maps.mail.ru**.
- Лицензия ODbL: подпись «© участники OpenStreetMap».
- Год постройки в OSM есть только у ~11% зданий → раскрашиваем **по микрорайонам, не по домам**. Альтернатива для домов — [Реформа ЖКХ opendata](https://www.reformagkh.ru/opendata), [nextgis/reformagkh](https://github.com/nextgis/reformagkh).

Пайплайн: Overpass → GeoJSON → упростить (mapshaper) → проекция в SVG-пути с `id="mkr-NN"` → стиль от Claude Design. Решение: [[decisions/0001-svg-map|ADR 0001]].

## Права на фото ⚠️

| Источник | Можно на экран без запроса? |
|---|---|
| Wikimedia Commons | **да**, с атрибуцией по каждому файлу. Категории: [Buildings in Zelenograd](https://commons.wikimedia.org/wiki/Category:Buildings_in_Zelenograd), [Fleyta](https://commons.wikimedia.org/wiki/Category:Fleyta_(Zelenograd)), [Palace of culture](https://commons.wikimedia.org/wiki/Category:Zelenograd_palace_of_culture), [Palace of Child Creativity](https://commons.wikimedia.org/wiki/Category:Palace_of_Child_and_Youth_Creativity_Zelenograd), [Igor Pokrovsky](https://commons.wikimedia.org/wiki/Category:Igor_Pokrovsky), [Maps of Zelenograd](https://commons.wikimedia.org/wiki/Category:Maps_of_Zelenograd) |
| PastVu | **нет**: права у авторов, [правила](https://docs.pastvu.com/en/rules) разрешают только личное использование. Можно ссылку/QR на страницу снимка. API без ключа: `https://api.pastvu.com/api2?method=photo.getByBounds` |
| Музей Зеленограда, zelenograd.ru, netall.ru | **нет**, только с разрешения |
| Retromap | **нет**, тайлы закрыты |
| Главархив | только по запросу |

**Музей Зеленограда** (филиал Музея Москвы) с 2023 года находится **в самом доме-«Флейте»**, корп. 360. Телефоны: +7 499 731-82-89, +7 499 717-16-02. [Страница музея](https://mosmuseum.ru/association/zelenograd/). Если выставка делается с музеем, фото и сканы генпланов просить у него.

## Аналоги (для питча и референсов)

| Проект | Чем полезен |
|---|---|
| [Fog of World](https://fogofworld.app/en/) | эталон механики «туман на карте», прогресс «открыто X% города» |
| [How old is this house — Москва](https://kontikimaps.ru/how-old/moscow) | 9 цветовых эпох ≈ наши 9 этапов; карточка здания |
| [Waag — NL buildings by year](https://code.waag.org/buildings/) | классика «город по годам», открытый код |
| [PastVu](https://pastvu.com) | слайдер лет + фото на карте (для режима экскурсии) |

Готовой тач-инсталляции «сотри туман» про город не нашлось — это плюс к оригинальности в питче.

## Идеи, которые усилят игру

- **Бонус-этап «Город, который не построили»**: нереализованный центр 1969 года из «Архитектуры СССР» — спорткомплекс-пирамида, Дом юстиции, техникум-трилистник, пешеходные мосты. [источник](https://starina-chuk.livejournal.com/625480.html)
- **Метафора механики**: Покровский сам двигал «коробки» домов по макету генплана. Открывающая фраза для питча. [источник](https://design-mate.ru/guide/read/an-experience/zelenograd-gorod-arkhitektora-igorya-pokrovskogo)
- Цитата-принцип: «90% домов типовые», характер городу дают уникальные здания и рельеф. Сюжет о парных 17-этажных башнях Центрального проспекта. [zelenograd.ru](https://www.zelenograd.ru/story/arhitektor-pokrovskiy-1/)
- **Акварели Покровского** (15 работ на выставке к 100-летию) → бонус-карточка; нужно согласие наследников. [netall](https://www.netall.ru/culture/news/1553668.html)
- Финальная фраза «Музей Зеленограда — в той самой „Флейте“» + QR на музей.
- Фильм «Микрорайон, в котором я живу» (1976) онлайн не найден.

## Технологии

- QR: `qrcode` (`QRCode.toCanvas`) или `qr-code-styling` (закруглённые точки, логотип). Выбрать один, проверить через context7 перед установкой.
- Стирание: canvas `destination-out`, мягкая кисть, процент считать по сетке сэмплов. WebGL не нужен.
- Киоск: флаги Chrome `--kiosk` и др. **не сверены с официальной документацией** — проверить перед выставкой. На планшете надёжнее системные средства: Android — закрепление экрана, iPad — Гид-доступ.
