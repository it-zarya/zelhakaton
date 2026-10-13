---
tags: [docs, deploy]
updated: 2026-10-13
---

# Выкатка в прод

← [[index]] · связано: [[workflow]], [[architecture]], [[decisions/0005-deploy-rsync|ADR 0005]]

Прод: **https://zelenograd.it-zarya.ru**

| | |
|---|---|
| Сервер | `94.228.166.30` (`w_rus`, российский VPS, **общий**: там же bonds, audit, zelevents, ohakaton) |
| SSH | `ssh w_rus` = `alex@94.228.166.30`, вход по ключу `~/.ssh/id_rsa`, sudo без пароля. На 22/tcp стоит `ufw limit` — много сессий подряд дают `Connection refused` на ~30 с |
| Папка сайта | `/opt/www/zelenograd` (владелец `alex`) |
| Веб-сервер | nginx в Docker-контейнере `nginx` (`/opt/www/docker-compose.yml`); папка смонтирована read-only как `/usr/share/nginx/html/zelenograd` |
| Конфиг nginx | `/opt/www/nginx.conf` (общий на все сайты), бэкапы `*.before-zelenograd-2026-10-13` |
| TLS | Let's Encrypt через контейнер certbot (webroot), `/opt/www/certbot` |

### Переезд 2026-10-13

Раньше сайт жил на Aeza (`45.9.120.124`, DNS вёл на второй IP того же сервера `138.124.93.52`). С части российских сетей `138.124.93.52` не открывался (таймаут TCP с ноутбука и check-host ru1/ru2; ru3, Германия, Испания, Турция — 200): подсеть Aeza 138.124/16 «помечена» РКН, на том же сервере стоят VPN-сервисы. Поэтому сайт переехал на российский VPS.

- Файлы перенесены с прода как есть (199 файлов), nginx-блок — копия старого.
- Сертификат: на время смены DNS был поставлен перенесённый со старого сервера, после обновления всех четырёх NS SpaceWeb выпущен свой — `live/zelenograd.it-zarya.ru` (ECDSA, общий аккаунт certbot сервера), продлевает контейнер certbot. Временная копия удалена.
- DNS (SpaceWeb): A `zelenograd` → `94.228.166.30`. NS обновлялись вразнобой (ns1/ns3 раньше ns2/ns4) — выпускать сертификат только когда все четыре отдают новый IP.
- Старый сервер не трогали: блок nginx и `/opt/www/zelenograd` на Aeza остаются, пока DNS не обновится везде; потом убрать.

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

По умолчанию `release.sh` катит в `alex@94.228.166.30:/opt/www/zelenograd/`. Переопределить — `DEPLOY_TARGET` в `.env.deploy` (в git не попадает, `.env*` в `.gitignore`).

Нужен SSH-ключ, пущенный на сервер под `alex`. Ключи и пароли — только в Bitwarden (см. глобальные правила), в репозиторий не кладём.

## Откат

`git checkout prod-<тег>` → `npm run release` → вернуться на `master`.

## Правки из админки

Админка работает только локально и пишет в `src/data/*.json` и `public/photos/`. В прод правки попадают только так: проверить на http://localhost:5173 → закоммитить → `git push` → `npm run release`.

## Правила

- В прод — только закоммиченное и запушенное в `main` (`git push` перед `npm run release`).
- `--delete` удаляет на сервере всё, чего нет в `dist/` (кроме `.well-known` для сертификатов) — `DEPLOY_TARGET` должен указывать строго на папку сайта.
- Админка в сборку не попадает (`admin.html`, `/__admin` на проде — 404), контент правится локально и уезжает этой же выкаткой.
