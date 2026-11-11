# Authorization issues (planted)

Intentional access-control weaknesses for testing. Each row is an endpoint that should refuse some roles, or a tenant it should not cross, but does not.

Total: **50** issues. Admin keeps full access inside its own tenant.

"Allowed by design" lists the roles that should be able to call the endpoint. Admin is always included.

| ID | Method | Path | Allowed by design | Tenant check | Kind | What is wrong |
|---|---|---|---|---|---|---|
| RBAC-01 | GET | `/api/admin/dashboard` | admin | none | BFLA | Admin dashboard has no role check. |
| RBAC-02 | POST | `/api/admin/users/:id/disable` | admin | none | BFLA | Any role can disable any user. |
| RBAC-03 | POST | `/api/admin/users/:id/reset-password` | admin | none | BFLA | Any role can reset a password and read the new one. |
| RBAC-04 | POST | `/api/admin/tenants/:id/reseed` | admin | own tenant (param id) | BFLA+cross-tenant | Any role can reseed any tenant. |
| RBAC-05 | PUT | `/api/users/:id/role` | admin | none | BFLA | Role change trusts the X-Role request header. |
| RBAC-06 | DELETE | `/api/users/:id` | admin | none | BFLA | Any role can delete users. |
| RBAC-07 | PATCH | `/api/users/:id` | admin | none | BFLA | Any role can change any user, including role. |
| RBAC-08 | POST | `/api/users` | admin | none | BFLA | Any role can create users with any role. |
| RBAC-09 | GET | `/api/users/:id` | admin | own tenant (user tenant) | cross-tenant | Any user id is readable, including other tenants; returns passwords. |
| RBAC-10 | GET | `/api/users` | admin | own tenant (param tenant) | cross-tenant | ?tenant= reads another tenant user list. |
| RBAC-11 | GET | `/api/roles` | admin | none | BFLA | Role list readable by all roles. |
| RBAC-12 | GET | `/api/roles/:name` | admin | none | BFLA | Role detail readable by all roles. |
| RBAC-13 | GET | `/api/tenants` | admin | none | cross-tenant | Lists every tenant, including API keys. |
| RBAC-14 | GET | `/api/tenants/:id` | admin | own tenant (param id) | cross-tenant | Any tenant record readable. |
| RBAC-15 | GET | `/api/tenants/:id/settings` | admin | own tenant (param id) | cross-tenant | Any tenant settings readable, including API key. |
| RBAC-16 | PATCH | `/api/tenants/:id/settings` | admin | own tenant (param id) | cross-tenant | Any tenant settings writable. |
| RBAC-17 | GET | `/api/auth/sessions` | admin | none | BFLA | All session tokens readable by any role. |
| RBAC-18 | PATCH | `/api/audit/:id` | admin | none | BFLA | Any role can edit audit entries. |
| RBAC-19 | DELETE | `/api/audit/:id` | admin | none | BFLA | Any role can delete audit entries. |
| RBAC-20 | POST | `/api/subscriptions` | admin | none | BFLA | Any role can create a subscription (billing change). |
| RBAC-21 | PATCH | `/api/subscriptions/:id` | admin | none | BFLA | Any role can change plan, seats and quota. |
| RBAC-22 | PUT | `/api/matrix` | admin | none | BFLA | Any role can replace the territory access matrix. |
| RBAC-23 | GET | `/api/debug/env` | admin | none | BFLA | Environment and signing secret readable by any role. |
| RBAC-24 | GET | `/api/monitoring/metrics` | admin | none | BFLA | Host and process metrics readable by any role. |
| RBAC-25 | GET | `/api/v0/contacts` | admin | none | cross-tenant | Legacy endpoint returns all tenants and all fields. |
| RBAC-26 | POST | `/api/agent/actions/:name` | admin | none | BFLA | Agent actions (approve, disable, export tenant) for any role. |
| RBAC-27 | GET | `/api/agent/records/:type/:id` | admin | none | cross-tenant | Agent API reads any record in any tenant. |
| RBAC-28 | PATCH | `/api/agent/records/:type/:id` | admin | none | cross-tenant | Agent API writes any record in any tenant. |
| RBAC-29 | DELETE | `/api/agent/records/:type/:id` | admin | none | cross-tenant | Agent API deletes any record in any tenant. |
| RBAC-30 | GET | `/api/agent/search` | admin | own tenant (param tenant) | cross-tenant | Agent search takes any tenant id. |
| RBAC-31 | POST | `/api/agent/prompt` | admin | none | BFLA | Natural-language prompts run admin-level actions for any role. |
| RBAC-32 | POST | `/api/invoices/:id/approve` | admin, manager | none | BFLA | Agent can approve invoices. |
| RBAC-33 | POST | `/api/campaigns/:id/send` | admin, manager | none | BFLA | Agent can send campaigns. |
| RBAC-34 | POST | `/api/webhooks` | admin, manager | none | BFLA | Agent can create webhooks. |
| RBAC-35 | DELETE | `/api/webhooks/:id` | admin, manager | none | BFLA | Agent can delete webhooks. |
| RBAC-36 | POST | `/api/webhooks/:id/test` | admin, manager | none | BFLA | Agent can trigger outbound webhook calls. |
| RBAC-37 | POST | `/api/files/upload` | admin, manager | none | BFLA | Agent can upload files. |
| RBAC-38 | GET | `/api/files/download` | admin, manager | none | BFLA | Agent can download any file by name. |
| RBAC-39 | DELETE | `/api/files/:id` | admin, manager | none | BFLA | Agent can delete files. |
| RBAC-40 | GET | `/api/reports/summary` | admin, manager | none | BFLA | Agent can read tenant reports. |
| RBAC-41 | GET | `/api/reports/export` | admin, manager | none | BFLA | Agent can export all deals as CSV. |
| RBAC-42 | GET | `/api/reports/sales` | admin, manager | none | BFLA | Agent can read sales totals. |
| RBAC-43 | GET | `/api/subscriptions` | admin, manager | none | BFLA | Agent can read subscriptions. |
| RBAC-44 | POST | `/api/templates/render` | admin, manager | none | BFLA | Agent can render templates (template injection). |
| RBAC-45 | GET | `/api/tools/fetch` | admin, manager | none | BFLA | Agent can make server-side fetches. |
| RBAC-46 | POST | `/api/contacts/import` | admin, manager | none | BFLA | Agent can bulk-import contacts. |
| RBAC-47 | GET | `/api/entitlements/check` | admin, manager | none | BFLA | Agent can query plan entitlements. |
| RBAC-48 | GET | `/api/audit` | admin, manager | none | BFLA | Agent can read the audit log. |
| RBAC-49 | POST | `/api/audit` | admin, manager | none | BFLA | Agent can write audit entries with any actor. |
| RBAC-50 | PATCH | `/api/users/me` | admin | none | privilege escalation | Any user can set their own role through the profile update. |

## How the issues are switched on

Each issue has `enforced: false` in `backend/src/access.js`. The enforcement helper (`enforceAccess`) only runs when that flag is `true`. To fix an issue, set its flag to `true`.

## UI visibility

- The Admin page is hidden from the menu for manager and agent. The Audit and Billing pages are hidden from the menu for agent.
- Hidden pages still open by URL (for example `#/admin`). The router does not check roles.
- The Admin page loads fully for manager and agent, then redirects to the dashboard after about 1 second.
