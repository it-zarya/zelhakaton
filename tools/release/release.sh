#!/usr/bin/env bash
# Выкатка в прод: сборка → проверка на ноутбуке → rsync dist/ на сервер. Запуск: npm run release
# Куда катить — DEPLOY_TARGET в .env.deploy (не в git), формат: user@host:/путь/к/сайту/
set -euo pipefail
cd "$(dirname "$0")/../.."

[ -f .env.deploy ] && source .env.deploy
: "${DEPLOY_TARGET:?Нет DEPLOY_TARGET — создайте .env.deploy (см. docs/deploy.md)}"
export VITE_PUBLIC_URL="${VITE_PUBLIC_URL:-https://zelenograd.it-zarya.ru}"

if [ -n "$(git status --porcelain -- src public)" ]; then
  echo "Есть незакоммиченные правки в src/ или public/ — сначала закоммитьте (правки из админки тоже)."; exit 1
fi

echo "→ Сборка (QR → $VITE_PUBLIC_URL)"
npm run build

echo "→ Локальная проверка собранной версии"
npx vite preview --port 4173 --strictPort >/dev/null 2>&1 &
PREVIEW=$!
trap 'kill $PREVIEW 2>/dev/null || true' EXIT
sleep 2
node tools/release/smoke.mjs http://localhost:4173/

echo
echo "Собранная версия открыта на http://localhost:4173 (с планшета: http://$(ipconfig getifaddr en0 2>/dev/null || echo '<IP ноутбука>'):4173)."
read -r -p "Проверили руками? Выкатить в $DEPLOY_TARGET [y/N] " yes
[ "$yes" = "y" ] || { echo "Отменено."; exit 1; }

echo "→ Выкатка"
rsync -az --delete --exclude '.well-known' dist/ "$DEPLOY_TARGET"
git tag -f "prod-$(date +%Y%m%d-%H%M)" >/dev/null
node tools/release/smoke.mjs "$VITE_PUBLIC_URL"
echo "✓ В проде: $VITE_PUBLIC_URL ($(git rev-parse --short HEAD))"
