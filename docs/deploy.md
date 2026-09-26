---
tags: [docs, deploy]
updated: 2026-09-26
---

# Выкатка в прод

← [[index]] · связано: [[workflow]], [[architecture]], [[decisions/0005-deploy-rsync|ADR 0005]]

Прод: **https://zelenograd.it-zarya.ru**

| | |
|---|---|
| Сервер | `45.9.120.124` (aeza, **общий**: там же другие сервисы it-zarya) |
| SSH | `ssh alex@45.9.120.124`, вход по ключу |
| Папка сайта | `/opt/www/zelenograd` (владелец `alex`) |
| Веб-сервер | nginx в Docker-контейнере `nginx`; папка смонтирована read-only как `/usr/share/nginx/html/zelenograd` |
| Конфиг nginx | `/opt/www/nginx.conf` (общий на все сайты) |
| TLS | Let's Encrypt через certbot, `/opt/www/certbot` |

DNS домена при проверке 2026-09-26 отдавал `138.124.93.52` — вероятно, прокси перед сервером.

На сервере трогаем **только** `/opt/www/zelenograd`: контейнер nginx и его конфиг общие с другими сайтами. Репозиторий: https://github.com/it-zarya/zelhakaton (ветка `main`).

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

## Настройка

По умолчанию `release.sh` катит в `alex@45.9.120.124:/opt/www/zelenograd/`. Переопределить — `DEPLOY_TARGET` в `.env.deploy` (в git не попадает, `.env*` в `.gitignore`).

Нужен SSH-ключ, пущенный на сервер под `alex`. Ключи и пароли — только в Bitwarden (см. глобальные правила), в репозиторий не кладём.

## Откат

`git checkout prod-<тег>` → `npm run release` → вернуться на `master`.

## Правки из админки

Админка работает только локально и пишет в `src/data/*.json` и `public/photos/`. В прод правки попадают только так: проверить на http://localhost:5173 → закоммитить → `git push` → `npm run release`.

## Правила

- В прод — только закоммиченное и запушенное в `main` (`git push` перед `npm run release`).
- `--delete` удаляет на сервере всё, чего нет в `dist/` (кроме `.well-known` для сертификатов) — `DEPLOY_TARGET` должен указывать строго на папку сайта.
- Админка в сборку не попадает (`admin.html`, `/__admin` на проде — 404), контент правится локально и уезжает этой же выкаткой.
