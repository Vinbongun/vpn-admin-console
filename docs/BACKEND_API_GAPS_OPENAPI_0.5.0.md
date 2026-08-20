# Admin Console gaps against OpenAPI 0.5.0

Source: `vpn-platform-backend` Draft PR #5, commit `9145487`, `openapi/openapi.yaml`.

The Admin Console does not invent request or response contracts. These areas remain placeholders because OpenAPI 0.5.0 exposes no admin operations for them:

- infrastructure inventory, nodes, endpoints, health and incidents;
- finance, payments and ledger.

Audit list responses intentionally exclude sensitive before/after payloads. The console displays only fields from `AuditEventSummary`.

The backend owns exact paths, methods, schemas and permission requirements. No speculative endpoints are implemented here.
