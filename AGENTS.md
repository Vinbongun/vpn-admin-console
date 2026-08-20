# Repository instructions

- Read `../vpn-platform-backend/docs/HANDOFFS/ADMIN_CONSOLE.md` and the referenced architecture documents first.
- Use Next.js, TypeScript, Refine, and shadcn/ui.
- Consume only the versioned admin API/OpenAPI contract.
- Do not implement domain rules or connect directly to PostgreSQL, Remnawave, or 3x-ui.
- UI permission checks improve UX; backend authorization remains mandatory.
- Never commit credentials or tokens.
