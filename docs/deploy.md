---
tags: [docs, deploy]
updated: 2026-09-26
---

# Выкатка в прод

← [[index]] · связано: [[workflow]], [[architecture]], [[decisions/0005-deploy-rsync|ADR 0005]]

Прод: **https://zelenograd.it-zarya.ru** — nginx на сервере `138.124.93.52`, раздаёт статику из папки сайта. Репозиторий: https://github.com/it-zarya/zelhakaton (ветка `main`).

## Способ: сборка и проверка на ноутбуке → rsync (ADR 0005)

```bash
npm run release
```

Что делает `tools/release/release.sh`:
1. отказывается катить, если в `src/` или `public/` есть незакоммиченные правки (в том числе из админки);
2. `npm run build` с `VITE_PUBLIC_URL=https://zelenograd.it-zarya.ru` — QR ведут на прод;
3. поднимает `vite preview` на http://localhost:4173 (с планшета — `http://<IP ноутбука>:4173`) и гоняет `npm run smoke`: заставка, этап, `?stage=4`, QR-страница, `#/maket`, все фото из `objects.json`, нет ошибок JS, 4xx и внешних запросов;
4. ждёт ручной проверки и `y`;
5. `rsync -az --delete dist/ $DEPLOY_TARGET`, ставит git-тег `prod-ГГГГММДД-ЧЧММ`, повторяет `smoke` на проде.

Проверить прод отдельно: `npm run smoke -- https://zelenograd.it-zarya.ru`.

## Настройка (один раз на машине)

`.env.deploy` в корне (в git не попадает, `.env*` в `.gitignore`):

```bash
DEPLOY_TARGET=<user>@138.124.93.52:/<папка сайта>/
```

SSH-доступ к серверу — только из Bitwarden (см. глобальные правила). Пользователь и путь к папке сайта — **не выяснены**, см. «Открытые вопросы» в [[index]].

## Откат

`git checkout prod-<тег>` → `npm run release` → вернуться на `master`.

## Правила

- В прод — только закоммиченное и запушенное в `main` (`git push` перед `npm run release`).
- `--delete` удаляет на сервере всё, чего нет в `dist/` (кроме `.well-known` для сертификатов) — `DEPLOY_TARGET` должен указывать строго на папку сайта.
- Админка в сборку не попадает (`admin.html`, `/__admin` на проде — 404), контент правится локально и уезжает этой же выкаткой.
