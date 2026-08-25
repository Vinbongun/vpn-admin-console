# Развернуть Admin Console через Docker

## Что нужно запущено рядом

Admin Console — это просто Next.js-фронтенд, у него нет своей базы данных и он не подключается к PostgreSQL/Remnawave/3x-ui напрямую. Всё, что ему реально нужно:

- **Работающий `vpn-platform-backend`**, доступный по URL, который ты укажешь в `NEXT_PUBLIC_API_URL` (браузер сотрудника обращается к бэкенду напрямую, не через саму админку).
- Сам бэкенд, в свою очередь, тянет за собой PostgreSQL/Redis/Mailpit и все scheduler'ы — это уже отдельный docker-compose из `vpn-platform-infrastructure`, здесь не описывается.

Из репозитория `vpn-admin-console` нужен весь код репозитория (обычный `git clone`/`git pull`) — готового production-образа/Dockerfile в репозитории пока нет, контейнер собирает и запускает проект прямо из исходников при старте.

## Переменные окружения

Один обязательный файл `.env.local` в корне репозитория:

    NEXT_PUBLIC_API_URL=https://api.your-domain.example

(для локальной проверки на той же машине, где крутится бэкенд — `http://localhost:3000`).

## Запуск контейнера

Из корня репозитория `vpn-admin-console`:

    docker run -d --name vpn-admin-console \
      --restart unless-stopped \
      -p 3001:3001 \
      -v "$(pwd):/app" \
      -w /app \
      -e CI=true \
      node:24 \
      sh -c "corepack enable && pnpm install --frozen-lockfile && pnpm build && pnpm start -- -p 3001"

Пояснения:

- `--restart unless-stopped` — если контейнер или сам процесс упадёт, Docker перезапустит его автоматически (в том числе после перезагрузки сервера). Это и есть автоматический перезапуск при падении — отдельно ничего настраивать не нужно.
- `-e CI=true` — без этого `pnpm install` может зависнуть, ожидая интерактивного подтверждения на чистку `node_modules`.
- `pnpm build && pnpm start` — собранная production-версия Next.js, а не режим разработки (`pnpm dev`): быстрее, стабильнее, без hot-reload, который тут не нужен на реальном сервере.
- Порт `3001` — просто пример, поменяй под себя.

## Обновление до новой версии

    git pull
    docker restart vpn-admin-console

(перезапуск заново прогонит `pnpm install && pnpm build` внутри контейнера при старте команды).

## Доступ

По итогам отдельного обсуждения безопасности — Admin Console должна быть доступна **только через WireGuard-туннель для сотрудников**, не напрямую из интернета (см. будущую инструкцию по настройке firewall/WireGuard-доступа — появится в этом же разделе отдельным файлом).
