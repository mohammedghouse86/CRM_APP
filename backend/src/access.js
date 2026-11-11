'use strict';
// Authorization policy for privileged endpoints.
//
// Each entry says who SHOULD be allowed (roles) and whether the tenant must match (tenant: 'own').
// Admin is always allowed, but only inside its own tenant.
//
// enforced: false  -> the check is deliberately switched off. This is a planted issue.
// To fix an issue, set enforced to true (the enforcement helper below then applies the rule).
//
// tparam: the request parameter (path or query) that carries a tenant id, if any.
const ISSUES = [
  // ---- Admin-only actions. Manager and agent should be refused.
  { id: 'RBAC-01', method: 'GET', path: '/api/admin/dashboard', roles: ['admin'], kind: 'BFLA', note: 'Admin dashboard has no role check.' },
  { id: 'RBAC-02', method: 'POST', path: '/api/admin/users/:id/disable', roles: ['admin'], kind: 'BFLA', note: 'Any role can disable any user.' },
  { id: 'RBAC-03', method: 'POST', path: '/api/admin/users/:id/reset-password', roles: ['admin'], kind: 'BFLA', note: 'Any role can reset a password and read the new one.' },
  { id: 'RBAC-04', method: 'POST', path: '/api/admin/tenants/:id/reseed', roles: ['admin'], tenant: 'own', tparam: 'id', kind: 'BFLA+cross-tenant', note: 'Any role can reseed any tenant.' },
  { id: 'RBAC-05', method: 'PUT', path: '/api/users/:id/role', roles: ['admin'], kind: 'BFLA', note: 'Role change trusts the X-Role request header.' },
  { id: 'RBAC-06', method: 'DELETE', path: '/api/users/:id', roles: ['admin'], kind: 'BFLA', note: 'Any role can delete users.' },
  { id: 'RBAC-07', method: 'PATCH', path: '/api/users/:id', roles: ['admin'], kind: 'BFLA', note: 'Any role can change any user, including role.' },
  { id: 'RBAC-08', method: 'POST', path: '/api/users', roles: ['admin'], kind: 'BFLA', note: 'Any role can create users with any role.' },
  { id: 'RBAC-09', method: 'GET', path: '/api/users/:id', roles: ['admin'], tenant: 'own', kind: 'cross-tenant', note: 'Any user id is readable, including other tenants; returns passwords.' },
  { id: 'RBAC-10', method: 'GET', path: '/api/users', roles: ['admin'], tenant: 'own', tparam: 'tenant', kind: 'cross-tenant', note: '?tenant= reads another tenant user list.' },
  { id: 'RBAC-11', method: 'GET', path: '/api/roles', roles: ['admin'], kind: 'BFLA', note: 'Role list readable by all roles.' },
  { id: 'RBAC-12', method: 'GET', path: '/api/roles/:name', roles: ['admin'], kind: 'BFLA', note: 'Role detail readable by all roles.' },
  { id: 'RBAC-13', method: 'GET', path: '/api/tenants', roles: ['admin'], kind: 'cross-tenant', note: 'Lists every tenant, including API keys.' },
  { id: 'RBAC-14', method: 'GET', path: '/api/tenants/:id', roles: ['admin'], tenant: 'own', tparam: 'id', kind: 'cross-tenant', note: 'Any tenant record readable.' },
  { id: 'RBAC-15', method: 'GET', path: '/api/tenants/:id/settings', roles: ['admin'], tenant: 'own', tparam: 'id', kind: 'cross-tenant', note: 'Any tenant settings readable, including API key.' },
  { id: 'RBAC-16', method: 'PATCH', path: '/api/tenants/:id/settings', roles: ['admin'], tenant: 'own', tparam: 'id', kind: 'cross-tenant', note: 'Any tenant settings writable.' },
  { id: 'RBAC-17', method: 'GET', path: '/api/auth/sessions', roles: ['admin'], kind: 'BFLA', note: 'All session tokens readable by any role.' },
  { id: 'RBAC-18', method: 'PATCH', path: '/api/audit/:id', roles: ['admin'], kind: 'BFLA', note: 'Any role can edit audit entries.' },
  { id: 'RBAC-19', method: 'DELETE', path: '/api/audit/:id', roles: ['admin'], kind: 'BFLA', note: 'Any role can delete audit entries.' },
  { id: 'RBAC-20', method: 'POST', path: '/api/subscriptions', roles: ['admin'], kind: 'BFLA', note: 'Any role can create a subscription (billing change).' },
  { id: 'RBAC-21', method: 'PATCH', path: '/api/subscriptions/:id', roles: ['admin'], kind: 'BFLA', note: 'Any role can change plan, seats and quota.' },
  { id: 'RBAC-22', method: 'PUT', path: '/api/matrix', roles: ['admin'], kind: 'BFLA', note: 'Any role can replace the territory access matrix.' },
  { id: 'RBAC-23', method: 'GET', path: '/api/debug/env', roles: ['admin'], kind: 'BFLA', note: 'Environment and signing secret readable by any role.' },
  { id: 'RBAC-24', method: 'GET', path: '/api/monitoring/metrics', roles: ['admin'], kind: 'BFLA', note: 'Host and process metrics readable by any role.' },
  { id: 'RBAC-25', method: 'GET', path: '/api/v0/contacts', roles: ['admin'], kind: 'cross-tenant', note: 'Legacy endpoint returns all tenants and all fields.' },
  { id: 'RBAC-26', method: 'POST', path: '/api/agent/actions/:name', roles: ['admin'], kind: 'BFLA', note: 'Agent actions (approve, disable, export tenant) for any role.' },
  { id: 'RBAC-27', method: 'GET', path: '/api/agent/records/:type/:id', roles: ['admin'], kind: 'cross-tenant', note: 'Agent API reads any record in any tenant.' },
  { id: 'RBAC-28', method: 'PATCH', path: '/api/agent/records/:type/:id', roles: ['admin'], kind: 'cross-tenant', note: 'Agent API writes any record in any tenant.' },
  { id: 'RBAC-29', method: 'DELETE', path: '/api/agent/records/:type/:id', roles: ['admin'], kind: 'cross-tenant', note: 'Agent API deletes any record in any tenant.' },
  { id: 'RBAC-30', method: 'GET', path: '/api/agent/search', roles: ['admin'], tenant: 'own', tparam: 'tenant', kind: 'cross-tenant', note: 'Agent search takes any tenant id.' },
  { id: 'RBAC-31', method: 'POST', path: '/api/agent/prompt', roles: ['admin'], kind: 'BFLA', note: 'Natural-language prompts run admin-level actions for any role.' },

  // ---- Admin and manager actions. Agent should be refused.
  { id: 'RBAC-32', method: 'POST', path: '/api/invoices/:id/approve', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can approve invoices.' },
  { id: 'RBAC-33', method: 'POST', path: '/api/campaigns/:id/send', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can send campaigns.' },
  { id: 'RBAC-34', method: 'POST', path: '/api/webhooks', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can create webhooks.' },
  { id: 'RBAC-35', method: 'DELETE', path: '/api/webhooks/:id', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can delete webhooks.' },
  { id: 'RBAC-36', method: 'POST', path: '/api/webhooks/:id/test', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can trigger outbound webhook calls.' },
  { id: 'RBAC-37', method: 'POST', path: '/api/files/upload', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can upload files.' },
  { id: 'RBAC-38', method: 'GET', path: '/api/files/download', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can download any file by name.' },
  { id: 'RBAC-39', method: 'DELETE', path: '/api/files/:id', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can delete files.' },
  { id: 'RBAC-40', method: 'GET', path: '/api/reports/summary', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can read tenant reports.' },
  { id: 'RBAC-41', method: 'GET', path: '/api/reports/export', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can export all deals as CSV.' },
  { id: 'RBAC-42', method: 'GET', path: '/api/reports/sales', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can read sales totals.' },
  { id: 'RBAC-43', method: 'GET', path: '/api/subscriptions', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can read subscriptions.' },
  { id: 'RBAC-44', method: 'POST', path: '/api/templates/render', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can render templates (template injection).' },
  { id: 'RBAC-45', method: 'GET', path: '/api/tools/fetch', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can make server-side fetches.' },
  { id: 'RBAC-46', method: 'POST', path: '/api/contacts/import', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can bulk-import contacts.' },
  { id: 'RBAC-47', method: 'GET', path: '/api/entitlements/check', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can query plan entitlements.' },
  { id: 'RBAC-48', method: 'GET', path: '/api/audit', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can read the audit log.' },
  { id: 'RBAC-49', method: 'POST', path: '/api/audit', roles: ['admin', 'manager'], kind: 'BFLA', note: 'Agent can write audit entries with any actor.' },
  { id: 'RBAC-50', method: 'PATCH', path: '/api/users/me', roles: ['admin'], kind: 'privilege escalation', note: 'Any user can set their own role through the profile update.' },
];

// Attach each issue to its endpoint's metadata. Keys are "METHOD /path".
function attachTo(endpoints) {
  const byKey = new Map(ISSUES.map((i) => [`${i.method} ${i.path}`, i]));
  let attached = 0;
  for (const e of endpoints) {
    const issue = byKey.get(`${e.meta.method} ${e.meta.path}`);
    if (!issue) continue;
    e.meta.access = {
      id: issue.id,
      roles: issue.roles,
      tenant: issue.tenant || null,
      tparam: issue.tparam || null,
      kind: issue.kind,
      note: issue.note,
      enforced: false,
    };
    attached++;
  }
  return attached;
}

// Enforcement helper. Does nothing while enforced is false (all issues are planted).
function enforceAccess(ctx, access) {
  if (!access || !access.enforced) return;
  if (!ctx.user) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }
  const allowed = ctx.user.role === 'admin' || access.roles.includes(ctx.user.role);
  if (!allowed) {
    const err = new Error(`Role '${ctx.user.role}' is not allowed`);
    err.status = 403;
    err.extra = { requiredRoles: access.roles, issue: access.id };
    throw err;
  }
  if (access.tenant === 'own' && access.tparam) {
    const requested = ctx.params[access.tparam] !== undefined ? ctx.params[access.tparam] : ctx.query[access.tparam];
    if (requested !== undefined && String(requested) !== ctx.user.tenantId) {
      const err = new Error('Resource not found');
      err.status = 404;
      throw err;
    }
  }
}

module.exports = { ISSUES, attachTo, enforceAccess };
