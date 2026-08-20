# VPN Admin Console

Внутренняя административная панель VPN Platform на Next.js, TypeScript, Refine и shadcn/ui.

## Локальный запуск

```bash
pnpm install
pnpm dev
```

Страница `/login` содержит только демонстрационный вход. Текущий сотрудник и permissions приходят из `src/lib/mock-admin-api.ts`; этот слой предназначен для замены сгенерированным OpenAPI-клиентом.

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Frontend использует только admin API, не содержит бизнес-правил и не подключается напрямую к PostgreSQL, Remnawave или 3x-ui.
