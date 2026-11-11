# Security issues map

Every endpoint in this app lists the categories it exhibits. Use this file to check what a scan should find.

- Endpoints: **151**
- Categories: **142**
- Covered by at least one endpoint: **139**
- Host-level or partly host-level (TLS and HTTP redirect are handled by Render): **4** (see notes)

## Categories

| # | Category | Engine name | Group | Source status | Endpoints that exhibit it | Notes |
|---|---|---|---|---|---|---|
| 1 | BOLA - Cross-Tenant Read (Agent via API) | `Agent_Api_XTenant_Read` | AI agent access | Running | `GET /api/agent/records/:type/:id` |  |
| 2 | BOLA - Cross-Tenant Delete (Agent via API) | `Agent_Api_XTenant_Delete` | AI agent access | Running | `DELETE /api/agent/records/:type/:id` |  |
| 3 | BOLA - Cross-Tenant Write (Agent via API) | `Agent_Api_XTenant_Update` | AI agent access | Running | `PATCH /api/agent/records/:type/:id` |  |
| 4 | Search Data Leak - Cross-Tenant (Agent via API) | `Agent_Api_Search_XTenant` | AI agent access | Running | `GET /api/agent/search` |  |
| 5 | BOLA - Same-Tenant Cross-Role Read (Agent via API) | `Agent_Api_SameTenant_Read` | AI agent access | Running | `GET /api/agent/records/:type/:id` |  |
| 6 | Search Data Leak - Same-Tenant Cross-Role (Agent via API) | `Agent_Api_Search_SameTenant` | AI agent access | Running | `GET /api/agent/search` |  |
| 7 | BFLA - Cross-Tenant Action (Agent via API) | `Agent_Api_XTenant_Execute` | AI agent access | Running | `POST /api/agent/actions/:name` |  |
| 8 | BOLA - Same-Tenant Cross-Role Delete (Agent via API) | `Agent_Api_SameTenant_Delete` | AI agent access | Running | `DELETE /api/agent/records/:type/:id` |  |
| 9 | BOLA - Same-Tenant Cross-Role Write (Agent via API) | `Agent_Api_SameTenant_Update` | AI agent access | Running | `PATCH /api/agent/records/:type/:id` |  |
| 10 | Broken Function Level Authorization | `Broken Function Level Authorization` | Access control | Running | `POST /api/admin/users/:id/disable`<br>`GET /api/admin/dashboard`<br>`POST /api/admin/tenants/:id/reseed` |  |
| 11 | Search Data Leak | `Search_Data_Leak` | Access control | Running | `GET /api/contacts/search` |  |
| 12 | BOLA | `BOLA` | Access control | Running | `GET /api/contacts/:id`<br>`POST /graphql` |  |
| 13 | Data Access Authorization Anomaly (BOLA) | `Data_Access_Authorization_Anomaly` | Access control | Running | `GET /api/users`<br>`GET /api/companies/:id`<br>`GET /api/deals` |  |
| 14 | Same-Tenant Resource Ownership Bypass (BOLA) | `BOLA_Same_Tenant_Ownership` | Access control | Running | `PATCH /api/contacts/:id` |  |
| 15 | RBAC | `RBAC` | Access control | Running | `GET /api/roles`<br>`GET /api/roles/:name`<br>`PUT /api/users/:id/role` |  |
| 16 | Cross-User Data Contamination | `CrossUser_Data_Contamination` | Access control | Running | `GET /api/notes/feed` |  |
| 17 | Search Data Leak - Cross-Tenant (Application) | `App_Search_XTenant` | Access control | Running | `GET /api/search` |  |
| 18 | Search Data Leak - Same-Tenant Cross-Role (Application) | `App_Search_SameTenant` | Access control | Running | `GET /api/contacts/search`<br>`GET /api/search` |  |
| 19 | BFLA | `BFLA` | Access control | Running | `DELETE /api/users/:id`<br>`POST /api/admin/users/:id/disable`<br>`POST /api/admin/users/:id/reset-password` |  |
| 20 | BOLA Cross Roles (Tenant) | `BOLA_Cross_Roles` | Access control | Running | `GET /api/users/:id` |  |
| 21 | BOLA Cross-Tenant Role Access | `BOLA_Cross_Tenant` | Access control | Running | `GET /api/tenants`<br>`GET /api/tenants/:id` |  |
| 22 | Privilege Escalation | `Privilege Escalation` | Access control | Running | `POST /api/users`<br>`PATCH /api/users/me`<br>`PATCH /api/users/:id`<br>`PUT /api/users/:id/role` |  |
| 23 | Cross-Tenant Data Contamination | `Cross-Tenant Data Contamination` | Access control | Running | `POST /api/contacts` |  |
| 24 | Query Parameter Toggle | `Query_Param_Toggle` | Access control | Running | `GET /api/contacts` |  |
| 25 | BRLA | `BRLA` | Access control | Running | `POST /api/invoices/:id/approve` |  |
| 26 | BTLA | `BTLA` | Access control | Running | `GET /api/tenants/:id/settings`<br>`PATCH /api/tenants/:id/settings` |  |
| 27 | Broken Authentication | `Authorization_Missing` | Authentication & tokens | Running | `POST /api/auth/change-password` |  |
| 28 | Authorization (Valid) | `Authorization_Valid` | Authentication & tokens | Running | `GET /api/auth/me` |  |
| 29 | Credential Exposure via URL Parameters | `Credential Exposure via URL Parameters` | Authentication & tokens | Running | `GET /api/auth/login-get`<br>`GET /api/reports/export` |  |
| 30 | Unsafe Authentication Method | `Unsafe Authentication Method` | Authentication & tokens | Running | `GET /api/auth/login-get` |  |
| 31 | Session Hijacking | `Session Hijacking` | Authentication & tokens | Running | `GET /api/auth/sessions` |  |
| 32 | Insecure Session Cookie | `Insecure Session Cookie` | Authentication & tokens | Running | `POST /api/auth/login` |  |
| 33 | Authentication (Invalid) | `Authentication_Invalid` | Authentication & tokens | Running | `POST /api/auth/legacy-login` |  |
| 34 | Unauthorized Token Generation | `Unauthorized_Token_Generation` | Authentication & tokens | Running | `POST /api/auth/token/forge` |  |
| 35 | Broken Token Signature Verification | `Broken_Token_Signature_Verification` | Authentication & tokens | Running | `POST /api/auth/verify` |  |
| 36 | Broken Token Tampered Payload | `Broken_Token_Tampered_Payload` | Authentication & tokens | Running | `POST /api/auth/introspect`<br>`GET /api/reports/summary` |  |
| 37 | Account Enumeration | `Account_Enumeration` | Authentication & tokens | Running | `POST /api/auth/login`<br>`POST /api/auth/password-reset` |  |
| 38 | Authorization (Expired) | `Authorization_Expired` | Authentication & tokens | Running | `POST /api/auth/refresh` |  |
| 39 | Broken Logout | `Broken_Logout` | Authentication & tokens | Running | `POST /api/auth/logout`<br>`GET /api/auth/logout` |  |
| 40 | Insecure Credential Handling | `Insecure_Credential_Handling` | Authentication & tokens | Running | `POST /api/auth/login`<br>`GET /api/users/:id`<br>`POST /api/admin/users/:id/reset-password` |  |
| 41 | Weak Authorization | `Weak Authorization` | Authentication & tokens | Running | `POST /api/auth/password-reset/confirm` |  |
| 42 | Login CSRF | `Login CSRF` | Authentication & tokens | Running | `POST /api/auth/login` |  |
| 43 | Cross Environment Token Acceptance | `Cross_Environment_Token_Acceptance` | Authentication & tokens | Running | `POST /api/auth/validate-env` |  |
| 44 | Unsafe HTTP Method for Authentication Operations | `Unsafe_Auth_Method` | Authentication & tokens | Running | `GET /api/auth/login-get`<br>`GET /api/auth/logout` |  |
| 45 | Cross Application Token Acceptance | `Cross_Application_Token_Acceptance` | Authentication & tokens | Running | `POST /api/auth/validate-app` |  |
| 46 | Credential Exposure via URL Parameters | `Credential_In_URL` | Authentication & tokens | Running | `GET /api/auth/login-get` |  |
| 47 | Authorization (Invalid) | `Authorization_Invalid` | Authentication & tokens | Running | `GET /api/auth/check` |  |
| 48 | Broken Token Revocation | `Broken_Token_Revocation` | Authentication & tokens | Running | `POST /api/auth/logout` |  |
| 49 | Expired Authorization | `Expired Authorization` | Authentication & tokens | Running | `POST /api/auth/refresh` |  |
| 50 | Read (Valid) | `DB_Read` | Business-logic writes | Running | `GET /api/contacts`<br>`GET /api/companies`<br>`GET /api/tasks`<br>`GET /api/tasks/:id/comments`<br>`GET /api/invoices`<br>`GET /api/products`<br>`GET /api/notes`<br>`GET /api/campaigns`<br>`GET /api/activities`<br>`GET /api/tags`<br>`GET /api/pipelines`<br>`GET /api/categories`<br>`GET /api/dashboard/kpis`<br>`GET /api/notifications`<br>`GET /api/files`<br>`GET /api/webhooks`<br>`GET /api/plans`<br>`GET /api/subscriptions`<br>`GET /api/audit` |  |
| 51 | Write (Valid) | `DB_Write` | Business-logic writes | Running | `POST /api/contacts`<br>`POST /api/contacts/import`<br>`POST /api/companies`<br>`POST /api/deals`<br>`POST /api/tasks`<br>`POST /api/invoices`<br>`POST /api/products`<br>`POST /api/notes`<br>`POST /api/campaigns`<br>`POST /api/activities`<br>`POST /api/tags`<br>`POST /api/webhooks`<br>`POST /api/subscriptions` |  |
| 52 | Audit Data Tampering | `Audit_Data_Tampering` | Business-logic writes | Running | `POST /api/audit`<br>`PATCH /api/audit/:id`<br>`DELETE /api/audit/:id` |  |
| 53 | Mass Assignment | `Mass_Assignment` | Business-logic writes | Running | `POST /api/users`<br>`POST /api/contacts`<br>`POST /api/contacts/import`<br>`PATCH /api/companies/:id`<br>`POST /api/products`<br>`PATCH /api/notes/:id`<br>`PATCH /api/campaigns/:id`<br>`POST /api/tags`<br>`POST /api/notifications/:id/read` |  |
| 54 | Creation-Time Injection | `Creation_Time_Injection` | Business-logic writes | Running | `POST /api/contacts` |  |
| 55 | Currency / Exchange-Rate Write Bypass | `Pac_Attr_Currency_Write_Bypass` | Business-logic writes | Running | `PATCH /api/products/:id`<br>`POST /api/orders/checkout` |  |
| 56 | Discount / Coupon Write Bypass | `Pac_Attr_Discount_Write_Bypass` | Business-logic writes | Running | `PATCH /api/products/:id`<br>`POST /api/orders/checkout` |  |
| 57 | Price / Amount Write Bypass | `Pac_Attr_Price_Write_Bypass` | Business-logic writes | Running | `PATCH /api/products/:id`<br>`POST /api/orders/checkout` |  |
| 58 | Quantity / Inventory Write Bypass | `Pac_Attr_Quantity_Write_Bypass` | Business-logic writes | Running | `POST /api/products/:id/adjust-stock`<br>`POST /api/orders/checkout` |  |
| 59 | Workflow-Gate Write Bypass | `Pac_Attr_Workflow_Gate_Write_Bypass` | Business-logic writes | Running | `POST /api/deals/:id/stage` |  |
| 60 | Priority / Escalation Write Bypass | `Pac_Attr_Priority_Write_Bypass` | Business-logic writes | Running | `PATCH /api/deals/:id`<br>`PATCH /api/tasks/:id` |  |
| 61 | SLA Due-Date Write Bypass | `Pac_Attr_Sla_Due_Date_Write_Bypass` | Business-logic writes | Running | `PATCH /api/tasks/:id` |  |
| 62 | Soft-Delete State Write Bypass | `Pac_Attr_Soft_Delete_State_Write_Bypass` | Business-logic writes | Running | `PATCH /api/contacts/:id` |  |
| 63 | Malicious File Acceptance | `Malicious_File_Acceptance` | Business-logic writes | Running | `POST /api/files/upload` |  |
| 64 | Credit / Balance Write Bypass | `Pac_Attr_Credit_Balance_Write_Bypass` | Business-logic writes | Running | `PATCH /api/invoices/:id`<br>`POST /api/invoices/:id/pay`<br>`POST /api/orders/checkout` |  |
| 65 | Audit-Correlation Write Bypass | `Pac_Attr_Audit_Correlation_Bypass` | Business-logic writes | Running | `POST /api/audit` |  |
| 66 | Creation Attribution Bypass | `Pac_Attr_Creation_Attribution_Bypass` | Business-logic writes | Running | `POST /api/contacts`<br>`POST /api/activities` |  |
| 67 | Creation Timestamp Bypass | `Pac_Attr_Creation_Timestamp_Bypass` | Business-logic writes | Running | `POST /api/contacts` |  |
| 68 | Concurrency-Control Bypass | `Pac_Attr_Concurrency_Control_Bypass` | Business-logic writes | Running | `PATCH /api/contacts/:id`<br>`POST /api/orders/checkout` |  |
| 69 | Deletion-Attribution Write Bypass | `Pac_Attr_Deletion_Attribution_Bypass` | Business-logic writes | Running | `DELETE /api/contacts/:id`<br>`DELETE /api/companies/:id`<br>`DELETE /api/deals/:id`<br>`DELETE /api/tasks/:id`<br>`DELETE /api/invoices/:id`<br>`DELETE /api/products/:id`<br>`DELETE /api/notes/:id`<br>`DELETE /api/campaigns/:id`<br>`DELETE /api/files/:id`<br>`DELETE /api/webhooks/:id` |  |
| 70 | Modification Attribution Bypass | `Pac_Attr_Modification_Attribution_Bypass` | Business-logic writes | Running | `PATCH /api/contacts/:id` |  |
| 71 | Modification Timestamp Bypass | `Pac_Attr_Modification_Timestamp_Bypass` | Business-logic writes | Running | `PATCH /api/contacts/:id` |  |
| 72 | CORS (Exist) | `CORS (Exist)` | Configuration & transport | Running | `GET /api/health` |  |
| 73 | CORS (Exist) | `CORS_Exist` | Configuration & transport | Running | `GET /api/health` |  |
| 74 | SSL Cert Self-Signed | `SSL Cert Self-Signed` | Configuration & transport | Running | — | Host-level. Render serves a valid certificate, so this app cannot present a self-signed one. |
| 75 | SSL Certificate Expiration (<15 days) | `SSL Certificate Expiration (<15 days)` | Configuration & transport | Running | — | Host-level. Certificate lifetime is controlled by Render, not the app. |
| 76 | TLS Version (>TLS1.2) | `TLS Version (>TLS1.2)` | Configuration & transport | Running | — | Host-level. TLS versions are controlled by Render. The app cannot restrict them. |
| 77 | Missing Security Headers | `Missing Security Headers` | Configuration & transport | Running | `GET /api/health` |  |
| 78 | Header Strict-Transport-Security | `Header Strict-Transport-Security` | Configuration & transport | Running | `GET /api/health` |  |
| 79 | Header Strict Transport Security | `Header_Strict_Transport_Security` | Configuration & transport | Running | `GET /api/health` |  |
| 80 | HTTP Redirection | `HTTP Redirection` | Configuration & transport | Running | `GET /api/redirect` | Partly. The app has an open redirect (/api/redirect). The HTTP-to-HTTPS redirect is done by Render. |
| 81 | Monitoring Endpoint | `Monitoring_Endpoint` | Data exposure | Running | `GET /api/monitoring/metrics` |  |
| 82 | Debug Endpoint | `Debug Endpoint` | Data exposure | Running | `GET /api/debug/env`<br>`GET /api/meta/endpoints` |  |
| 83 | Excessive_Data_Exposure | `Excessive_Data_Exposure` | Data exposure | Running | `GET /api/contacts`<br>`GET /api/contacts/export` |  |
| 84 | Nested Sensitive Data Exposure | `Nested Sensitive Data Exposure` | Data exposure | Running | `GET /api/companies/:id/contacts` |  |
| 85 | Sensitive Data Exposure | `Sensitive Data Exposure` | Data exposure | Running | `GET /api/users/:id`<br>`GET /api/contacts/:id`<br>`GET /api/contacts/:id/timeline`<br>`GET /api/notes/:id` |  |
| 86 | Sensitive Data in Error & Metadata Responses | `Error_Metadata_Exposure` | Data exposure | Running | `GET /api/debug/error` |  |
| 87 | Guessable & Enumerable Object Identifiers | `Guessable_Identifiers` | Data exposure | Running | `GET /api/contacts/:id`<br>`GET /api/tasks/:id`<br>`GET /api/invoices/:id`<br>`GET /api/products/:id`<br>`GET /api/campaigns/:id` |  |
| 88 | Enumerable Resource ID | `Enumerable Resource ID` | Data exposure | Running | `GET /api/invoices/:id` |  |
| 89 | Shadow Data | `Shadow Data` | Data exposure | Running | `GET /api/v0/contacts` |  |
| 90 | GraphQL Field Suggestions Enabled | `GraphQL Field Suggestions Enabled` | GraphQL | Running | `POST /graphql`<br>`GET /graphql` |  |
| 91 | GraphQL IDE Exposed | `GraphQL IDE Exposed` | GraphQL | Running | `GET /graphiql` |  |
| 92 | GraphQL Introspection Enabled | `GraphQL Introspection Enabled` | GraphQL | Running | `POST /graphql`<br>`GET /graphql/schema` |  |
| 93 | Unrestricted GraphQL Batching | `Unrestricted GraphQL Batching` | GraphQL | Running | `POST /graphql` |  |
| 94 | GraphQL Mutation Accepted Over GET | `GraphQL Mutation Accepted Over GET` | GraphQL | Running | `GET /graphql` |  |
| 95 | Unbounded GraphQL Query Complexity | `Unbounded GraphQL Query Complexity` | GraphQL | Running | `POST /graphql` |  |
| 96 | Client Side Request Forgery | `Client Side Request Forgery` | Injection & input | Running | `GET /api/tools/fetch` |  |
| 97 | Command Injection | `Command Injection` | Injection & input | Running | `POST /api/tools/ping` |  |
| 98 | Input Validation | `Input Validation` | Injection & input | Running | `POST /api/tools/validate` |  |
| 99 | Path Traversal | `Path Traversal` | Injection & input | Running | `GET /api/files/download` |  |
| 100 | Server-Side Template Injection | `Server-Side Template Injection` | Injection & input | Running | `POST /api/templates/render` |  |
| 101 | XSS | `XSS` | Injection & input | Running | `POST /api/tasks/:id/comments`<br>`POST /api/notes`<br>`GET /api/search/echo` |  |
| 102 | SSRF | `SSRF` | Injection & input | Running | `POST /api/webhooks`<br>`POST /api/webhooks/:id/test`<br>`GET /api/tools/fetch` |  |
| 103 | Rate-Limit (Exist) | `Rate_Limit_Exist` | Resource limits | Running | `POST /api/auth/login` |  |
| 104 | Slow_Endpoint_Response | `Slow_Endpoint_Response` | Resource limits | Running | `GET /api/reports/slow` |  |
| 105 | Broken Pagination Limit | `Pagination_Invalid` | Resource limits | Running | `GET /api/reports/paginated` |  |
| 106 | Date Filter (Negative) | `Date_Filter_Invalid` | Resource limits | Running | `GET /api/reports/sales` |  |
| 107 | Agent_Prompt_SameTenant_Delete | `Agent_Prompt_SameTenant_Delete` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 108 | Agent_Prompt_SameTenant_Execute | `Agent_Prompt_SameTenant_Execute` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 109 | Agent_Prompt_SameTenant_Read | `Agent_Prompt_SameTenant_Read` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 110 | Agent_Prompt_SameTenant_Update | `Agent_Prompt_SameTenant_Update` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 111 | Agent_Prompt_Search_SameTenant | `Agent_Prompt_Search_SameTenant` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 112 | Agent_Prompt_Search_XTenant | `Agent_Prompt_Search_XTenant` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 113 | Agent_Prompt_XTenant_Delete | `Agent_Prompt_XTenant_Delete` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 114 | Agent_Prompt_XTenant_Execute | `Agent_Prompt_XTenant_Execute` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 115 | Agent_Prompt_XTenant_Read | `Agent_Prompt_XTenant_Read` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 116 | Agent_Prompt_XTenant_Update | `Agent_Prompt_XTenant_Update` | AI agent access | On, never ran (30 days) | `POST /api/agent/prompt` |  |
| 117 | BFLA - Same-Tenant Action (Agent via API) | `Agent_Api_SameTenant_Execute` | AI agent access | On, never ran (30 days) | `POST /api/agent/actions/:name` |  |
| 118 | BAC_Inconsistent_Permissions | `BAC_Inconsistent_Permissions` | Access control | On, never ran (30 days) | `GET /api/deals/:id`<br>`DELETE /api/deals/:id` |  |
| 119 | BPLA | `BPLA` | Access control | On, never ran (30 days) | `GET /api/entitlements/check` |  |
| 120 | Blind Mutate / IDOR | `Blind_Mutate_IDOR` | Business-logic writes | On, never ran (30 days) | `POST /api/tasks/:id/complete` |  |
| 121 | Composite Bypass | `Composite_Bypass` | Business-logic writes | On, never ran (30 days) | `POST /api/deals/:id/transfer` |  |
| 122 | Create Bypass | `Create_Bypass` | Business-logic writes | On, never ran (30 days) | `POST /api/deals` |  |
| 123 | Delete Equivalence | `Delete_Equivalence` | Business-logic writes | On, never ran (30 days) | `POST /api/contacts/:id/archive` |  |
| 124 | Ownership-Assignment Write Bypass | `Pac_Attr_Ownership_Assignment_Write_Bypass` | Business-logic writes | On, never ran (30 days) | `PATCH /api/contacts/:id`<br>`POST /api/deals/:id/transfer` |  |
| 125 | Primary-Key Write Bypass | `Pac_Attr_Primary_Key_Write_Bypass` | Business-logic writes | On, never ran (30 days) | `PATCH /api/users/:id`<br>`PATCH /api/contacts/:id` |  |
| 126 | Quota / Rate-Limit Write Bypass | `Pac_Attr_Quota_Limit_Write_Bypass` | Business-logic writes | On, never ran (30 days) | `PATCH /api/campaigns/:id`<br>`POST /api/campaigns/:id/send`<br>`PATCH /api/subscriptions/:id` |  |
| 127 | Relationship-Key Write Bypass | `Pac_Attr_Relationship_Key_Write_Bypass` | Business-logic writes | On, never ran (30 days) | `PATCH /api/contacts/:id`<br>`PATCH /api/companies/:id` |  |
| 128 | Subscription Entitlement Write Bypass | `Pac_Attr_Entitlement_Write_Bypass` | Business-logic writes | On, never ran (30 days) | `POST /api/subscriptions` |  |
| 129 | Tenant-Boundary Write Bypass | `Pac_Attr_Tenant_Boundary_Write_Bypass` | Business-logic writes | On, never ran (30 days) | `POST /api/users`<br>`PATCH /api/contacts/:id` |  |
| 130 | Update Method Bypass | `Update_Method_Bypass` | Business-logic writes | On, never ran (30 days) | `PUT /api/contacts/:id` |  |
| 131 | Verification-Status Write Bypass | `Pac_Attr_Verification_Status_Write_Bypass` | Business-logic writes | On, never ran (30 days) | `PATCH /api/users/:id` |  |
| 132 | access-check | `access-check` | Customer custom category | On, never ran (30 days) | `GET /api/access-check` |  |
| 133 | grades-modification-restriction | `grades-modification-restriction` | Customer custom category | On, never ran (30 days) | `PATCH /api/deals/:id` |  |
| 134 | policy-holder-modification-after-expiry | `policy-holder-modification-after-expiry` | Customer custom category | On, never ran (30 days) | `PATCH /api/subscriptions/:id` |  |
| 135 | sbac-matrix-data-integrity | `sbac-matrix-data-integrity` | Customer custom category | On, never ran (30 days) | `GET /api/matrix`<br>`PUT /api/matrix` |  |
| 136 | Unbounded GraphQL Query Depth | `Unbounded GraphQL Query Depth` | GraphQL | On, never ran (30 days) | `POST /graphql` |  |
| 137 | Privilege Escalation | `Privilege_Escalation` | Access control | Disabled | `PATCH /api/users/me` |  |
| 138 | Authentication (Valid) | `Authentication_Valid` | Authentication & tokens | Disabled | `POST /api/auth/login` |  |
| 139 | Broken Authentication (Cross-Application Token Acceptance) | `Broken Authentication (Cross-Application Token Acceptance)` | Authentication & tokens | Disabled | `POST /api/auth/validate-app` |  |
| 140 | Broken Authentication (Cross-Environment Token Acceptance) | `Broken Authentication (Cross-Environment Token Acceptance)` | Authentication & tokens | Disabled | `POST /api/auth/validate-env` |  |
| 141 | NOSQL_Injection | `NOSQL_Injection` | Injection & input | Disabled | `POST /api/search/query` |  |
| 142 | SQL_Injection | `SQL_Injection` | Injection & input | Disabled | `GET /api/reports/sql` |  |

## Endpoints

| Method | Path | Group | Auth mode | Categories |
|---|---|---|---|---|
| POST | `/api/auth/login` | Auth & sessions | none | 37, 40, 42, 32, 138, 103 |
| GET | `/api/auth/login-get` | Auth & sessions | none | 30, 29, 46, 44 |
| POST | `/api/auth/logout` | Auth & sessions | api | 39, 48 |
| GET | `/api/auth/logout` | Auth & sessions | api | 44, 39 |
| GET | `/api/auth/me` | Auth & sessions | api | 28 |
| GET | `/api/auth/check` | Auth & sessions | fail-open | 47 |
| POST | `/api/auth/refresh` | Auth & sessions | weak | 38, 49 |
| POST | `/api/auth/token/forge` | Auth & sessions | none | 34 |
| POST | `/api/auth/verify` | Auth & sessions | none | 35 |
| POST | `/api/auth/introspect` | Auth & sessions | decode | 36 |
| POST | `/api/auth/password-reset` | Auth & sessions | none | 37 |
| POST | `/api/auth/password-reset/confirm` | Auth & sessions | none | 41 |
| POST | `/api/auth/change-password` | Auth & sessions | api | 27 |
| GET | `/api/auth/sessions` | Auth & sessions | api | 31 |
| POST | `/api/auth/validate-env` | Auth & sessions | api | 43, 140 |
| POST | `/api/auth/validate-app` | Auth & sessions | api | 45, 139 |
| POST | `/api/auth/legacy-login` | Auth & sessions | none | 33 |
| GET | `/api/tenants` | Tenants, users & roles | api | 21 |
| GET | `/api/tenants/:id` | Tenants, users & roles | api | 21 |
| GET | `/api/tenants/:id/settings` | Tenants, users & roles | api | 26 |
| PATCH | `/api/tenants/:id/settings` | Tenants, users & roles | api | 26 |
| GET | `/api/users` | Tenants, users & roles | api | 13 |
| GET | `/api/users/:id` | Tenants, users & roles | api | 20, 85, 40 |
| POST | `/api/users` | Tenants, users & roles | api | 22, 53, 129 |
| PATCH | `/api/users/me` | Tenants, users & roles | api | 22, 137 |
| PATCH | `/api/users/:id` | Tenants, users & roles | api | 22, 125, 131 |
| DELETE | `/api/users/:id` | Tenants, users & roles | api | 19 |
| POST | `/api/admin/users/:id/disable` | Tenants, users & roles | api | 10, 19 |
| POST | `/api/admin/users/:id/reset-password` | Tenants, users & roles | api | 19, 40 |
| GET | `/api/roles` | Tenants, users & roles | api | 15 |
| GET | `/api/roles/:name` | Tenants, users & roles | api | 15 |
| PUT | `/api/users/:id/role` | Tenants, users & roles | api | 15, 22 |
| GET | `/api/admin/dashboard` | Tenants, users & roles | api | 10 |
| POST | `/api/admin/tenants/:id/reseed` | Tenants, users & roles | api | 10 |
| GET | `/api/contacts` | CRM records | api | 50, 24, 83 |
| GET | `/api/contacts/:id` | CRM records | api | 12, 87, 85 |
| POST | `/api/contacts` | CRM records | api | 51, 53, 54, 66, 67, 23 |
| PATCH | `/api/contacts/:id` | CRM records | api | 14, 62, 68, 70, 71, 124, 125, 127, 129 |
| DELETE | `/api/contacts/:id` | CRM records | api | 69 |
| PUT | `/api/contacts/:id` | CRM records | api | 130 |
| GET | `/api/contacts/search` | CRM records | api | 11, 18 |
| GET | `/api/contacts/export` | CRM records | api | 83 |
| POST | `/api/contacts/import` | CRM records | api | 53, 51 |
| POST | `/api/contacts/:id/archive` | CRM records | api | 123 |
| GET | `/api/contacts/:id/timeline` | CRM records | api | 85 |
| GET | `/api/companies` | CRM records | api | 50 |
| GET | `/api/companies/:id` | CRM records | api | 13 |
| POST | `/api/companies` | CRM records | api | 51 |
| PATCH | `/api/companies/:id` | CRM records | api | 53, 127 |
| DELETE | `/api/companies/:id` | CRM records | api | 69 |
| GET | `/api/companies/:id/contacts` | CRM records | api | 84 |
| GET | `/api/deals` | CRM records | api | 13 |
| GET | `/api/deals/:id` | CRM records | api | 118 |
| POST | `/api/deals` | CRM records | api | 122, 51 |
| PATCH | `/api/deals/:id` | CRM records | api | 133, 60 |
| DELETE | `/api/deals/:id` | CRM records | api | 118, 69 |
| POST | `/api/deals/:id/stage` | CRM records | api | 59 |
| POST | `/api/deals/:id/transfer` | CRM records | api | 121, 124 |
| GET | `/api/tasks` | CRM records | api | 50 |
| GET | `/api/tasks/:id` | CRM records | api | 87 |
| POST | `/api/tasks` | CRM records | api | 51 |
| PATCH | `/api/tasks/:id` | CRM records | api | 60, 61 |
| DELETE | `/api/tasks/:id` | CRM records | api | 69 |
| POST | `/api/tasks/:id/complete` | CRM records | api | 120 |
| GET | `/api/tasks/:id/comments` | CRM records | api | 50 |
| POST | `/api/tasks/:id/comments` | CRM records | api | 101 |
| GET | `/api/invoices` | CRM records | api | 50 |
| GET | `/api/invoices/:id` | CRM records | api | 87, 88 |
| POST | `/api/invoices` | CRM records | api | 51 |
| PATCH | `/api/invoices/:id` | CRM records | api | 64 |
| DELETE | `/api/invoices/:id` | CRM records | api | 69 |
| POST | `/api/invoices/:id/pay` | CRM records | api | 64 |
| POST | `/api/invoices/:id/approve` | CRM records | api | 25 |
| GET | `/api/products` | CRM records | api | 50 |
| GET | `/api/products/:id` | CRM records | api | 87 |
| POST | `/api/products` | CRM records | api | 51, 53 |
| PATCH | `/api/products/:id` | CRM records | api | 55, 56, 57 |
| DELETE | `/api/products/:id` | CRM records | api | 69 |
| POST | `/api/products/:id/adjust-stock` | CRM records | api | 58 |
| GET | `/api/notes` | CRM records | api | 50 |
| GET | `/api/notes/:id` | CRM records | api | 85 |
| POST | `/api/notes` | CRM records | api | 101, 51 |
| PATCH | `/api/notes/:id` | CRM records | api | 53 |
| DELETE | `/api/notes/:id` | CRM records | api | 69 |
| GET | `/api/notes/feed` | CRM records | api | 16 |
| GET | `/api/campaigns` | CRM records | api | 50 |
| GET | `/api/campaigns/:id` | CRM records | api | 87 |
| POST | `/api/campaigns` | CRM records | api | 51 |
| PATCH | `/api/campaigns/:id` | CRM records | api | 126, 53 |
| DELETE | `/api/campaigns/:id` | CRM records | api | 69 |
| POST | `/api/campaigns/:id/send` | CRM records | api | 126 |
| POST | `/api/orders/checkout` | CRM records | api | 55, 56, 57, 58, 64, 68 |
| GET | `/api/activities` | CRM records | api | 50 |
| POST | `/api/activities` | CRM records | api | 51, 66 |
| GET | `/api/tags` | CRM records | api | 50 |
| POST | `/api/tags` | CRM records | api | 51, 53 |
| GET | `/api/pipelines` | CRM records | api | 50 |
| GET | `/api/categories` | CRM records | api | 50 |
| GET | `/api/dashboard/kpis` | CRM records | api | 50 |
| GET | `/api/notifications` | CRM records | api | 50 |
| POST | `/api/notifications/:id/read` | CRM records | api | 53 |
| GET | `/api/files` | Files | api | 50 |
| POST | `/api/files/upload` | Files | api | 63 |
| GET | `/api/files/download` | Files | api | 99 |
| DELETE | `/api/files/:id` | Files | api | 69 |
| GET | `/api/webhooks` | Webhooks & integrations | api | 50 |
| POST | `/api/webhooks` | Webhooks & integrations | api | 102, 51 |
| POST | `/api/webhooks/:id/test` | Webhooks & integrations | api | 102 |
| DELETE | `/api/webhooks/:id` | Webhooks & integrations | api | 69 |
| GET | `/api/plans` | Plans, subscriptions & audit | none | 50 |
| GET | `/api/subscriptions` | Plans, subscriptions & audit | api | 50 |
| POST | `/api/subscriptions` | Plans, subscriptions & audit | api | 128, 51 |
| PATCH | `/api/subscriptions/:id` | Plans, subscriptions & audit | api | 134, 126 |
| GET | `/api/entitlements/check` | Plans, subscriptions & audit | api | 119 |
| GET | `/api/audit` | Plans, subscriptions & audit | api | 50 |
| POST | `/api/audit` | Plans, subscriptions & audit | api | 52, 65 |
| PATCH | `/api/audit/:id` | Plans, subscriptions & audit | api | 52 |
| DELETE | `/api/audit/:id` | Plans, subscriptions & audit | api | 52 |
| GET | `/api/reports/summary` | Reports & search | decode | 36 |
| GET | `/api/reports/sales` | Reports & search | api | 106 |
| GET | `/api/reports/slow` | Reports & search | api | 104 |
| GET | `/api/reports/export` | Reports & search | api | 29 |
| GET | `/api/reports/sql` | Reports & search | api | 142 |
| GET | `/api/reports/paginated` | Reports & search | api | 105 |
| GET | `/api/search` | Reports & search | api | 17, 18 |
| GET | `/api/search/echo` | Reports & search | none | 101 |
| POST | `/api/search/query` | Reports & search | api | 141 |
| POST | `/api/tools/ping` | Utilities & templates | api | 97 |
| GET | `/api/tools/fetch` | Utilities & templates | api | 96, 102 |
| POST | `/api/templates/render` | Utilities & templates | api | 100 |
| POST | `/api/tools/validate` | Utilities & templates | api | 98 |
| GET | `/api/redirect` | Utilities & templates | none | 80 |
| POST | `/graphql` | GraphQL | fail-open | 90, 92, 93, 95, 136, 12 |
| GET | `/graphql` | GraphQL | fail-open | 94, 90 |
| GET | `/graphiql` | GraphQL | none | 91 |
| GET | `/graphql/schema` | GraphQL | none | 92 |
| GET | `/api/health` | Monitoring & debug | none | 72, 73, 77, 78, 79 |
| GET | `/api/monitoring/metrics` | Monitoring & debug | none | 81 |
| GET | `/api/debug/env` | Monitoring & debug | none | 82 |
| GET | `/api/debug/error` | Monitoring & debug | none | 86 |
| GET | `/api/v0/contacts` | Monitoring & debug | fail-open | 89 |
| GET | `/api/meta/endpoints` | Monitoring & debug | none | 82 |
| POST | `/api/agent/prompt` | AI agent API | api | 107, 108, 109, 110, 111, 112, 113, 114, 115, 116 |
| GET | `/api/agent/records/:type/:id` | AI agent API | api | 1, 5 |
| DELETE | `/api/agent/records/:type/:id` | AI agent API | api | 2, 8 |
| PATCH | `/api/agent/records/:type/:id` | AI agent API | api | 3, 9 |
| GET | `/api/agent/search` | AI agent API | api | 4, 6 |
| POST | `/api/agent/actions/:name` | AI agent API | api | 7, 117 |
| GET | `/api/access-check` | Custom policy checks | api | 132 |
| GET | `/api/matrix` | Custom policy checks | api | 135 |
| PUT | `/api/matrix` | Custom policy checks | api | 135 |

## Auth modes

- `api`: token signature and expiry are checked, the account must exist and be enabled. Audience and environment are not checked.
- `weak`: signature is checked, expiry is ignored, `alg: none` is accepted.
- `decode`: token claims are trusted without checking the signature.
- `fail-open`: a missing or invalid token is treated as a guest.
- `none`: no check.
