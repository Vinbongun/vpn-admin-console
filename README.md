# VPN Admin Console

Внутренняя административная панель VPN Platform на Next.js, TypeScript, Refine и shadcn/ui.

## Локальный запуск

```bash
pnpm install
pnpm dev
```

API-клиент генерируется из OpenAPI 0.5.0 репозитория `vpn-platform-backend` командой `pnpm generate:api`. Базовый URL задаётся через `NEXT_PUBLIC_API_URL`. Staff token хранится только в `sessionStorage`; roles и permissions всегда берутся из `/admin/v1/auth/me`.

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Frontend использует только admin API, не содержит бизнес-правил и не подключается напрямую к PostgreSQL, Remnawave или 3x-ui.
