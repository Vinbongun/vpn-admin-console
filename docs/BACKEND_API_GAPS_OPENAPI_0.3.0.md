# Admin Console gaps against OpenAPI 0.3.0

Source: `vpn-platform-backend` Draft PR #3, commit `415e33b`, `openapi/openapi.yaml`.

The Admin Console does not invent request or response contracts. The following UI areas remain placeholders because OpenAPI 0.3.0 exposes no admin operations for them:

- users and brand memberships, including membership lookup needed by the create-subscription form;
- plans lookup needed to select `planId` without entering a raw UUID;
- infrastructure inventory, nodes, endpoints, health and incidents;
- finance, payments and ledger;
- audit events.

Subscription administration is limited to the operations explicitly present in 0.3.0. There are no contracted operations for subscription detail, update, revoke/delete, pagination, filtering or sorting.

OpenAPI 0.3.0 also has no staff profile fields for display name or role names. The console therefore displays the backend email, `STAFF` audience and uses only the returned `permissions` array for UI visibility.

The backend team must define the exact paths, methods, schemas, pagination, filters and permission requirements. No speculative endpoints are implemented in this repository.
