'use strict';
const store = require('../store');
const { HttpError } = require('../http');
const { endpoint } = require('./_def');
const { ensureObject, nowIso } = require('../resources');
const { reseedTenantData } = require('../seed');
const { ROLES } = require('../seed');
const { DEFAULT_ENV } = require('../auth');

const G = 'Tenants, users & roles';
const E = (method, path, o, fn) => endpoint(G, method, path, o, fn);
const TENANT_SETTINGS = ['currency', 'timezone', 'retentionDays', 'ssoEnabled', 'apiKey'];

function findTenant(id) {
  const t = store.db.tenants.find((x) => x.id === String(id));
  if (!t) throw new HttpError(404, `Tenant ${id} not found`);
  return t;
}

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

module.exports = [
  E('GET', '/api/tenants', { title: 'List tenants', auth: 'api', vulns: [21], desc: 'Should list only the caller tenant. Lists every tenant.' }, async (ctx) => {
    return ctx.json(200, { data: store.db.tenants });
  }),

  E('GET', '/api/tenants/:id', { title: 'Get tenant', auth: 'api', sample: { params: { id: 't2' } }, vulns: [21], desc: 'No tenant check on the record.' }, async (ctx) => ctx.json(200, findTenant(ctx.params.id))),

  E('GET', '/api/tenants/:id/settings', { title: 'Get tenant settings', auth: 'api', sample: { params: { id: 't2' } }, vulns: [26], desc: 'Settings of any tenant can be read, including the API key.' }, async (ctx) => {
    const t = findTenant(ctx.params.id);
    const out = {};
    TENANT_SETTINGS.forEach((k) => (out[k] = t[k]));
    return ctx.json(200, { tenantId: t.id, settings: out });
  }),

  E('PATCH', '/api/tenants/:id/settings', { title: 'Update tenant settings', auth: 'api', sample: { params: { id: 't2' }, body: { retentionDays: 365 } }, vulns: [26], desc: 'Any authenticated user can change any tenant settings.' }, async (ctx) => {
    const t = findTenant(ctx.params.id);
    const body = ensureObject(ctx.body);
    Object.assign(t, body);
    t.updatedAt = nowIso();
    store.touch();
    return ctx.json(200, t);
  }),

  E('GET', '/api/users', { title: 'List users', auth: 'api', sample: { query: { tenant: 't1' } }, vulns: [13], desc: '?tenant= overrides the caller tenant.' }, async (ctx) => {
    const tenant = ctx.query.tenant || ctx.user.tenantId;
    const rows = store.db.users.filter((u) => u.tenantId === tenant).map(publicUser);
    return ctx.json(200, { tenant, total: rows.length, data: rows });
  }),

  E('GET', '/api/users/:id', { title: 'Get user', auth: 'api', sample: { params: { id: 1 } }, vulns: [20, 85, 40], desc: 'Any user id is accepted. Returns the stored password.' }, async (ctx) => {
    const u = store.db.users.find((x) => x.id === Number(ctx.params.id));
    if (!u) throw new HttpError(404, 'User not found');
    return ctx.json(200, u);
  }),

  E('POST', '/api/users', { title: 'Create user', auth: 'api', sample: { body: { name: 'New Person', email: 'new.person@northwind.example', password: 'Temp@1234', role: 'agent' } }, vulns: [22, 53, 129], desc: 'Role and tenantId come from the request body.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    if (!body.email) throw new HttpError(400, 'email is required');
    const user = {
      ...body,
      id: store.nextId('users'),
      role: body.role || 'agent',
      tenantId: body.tenantId || ctx.user.tenantId,
      password: body.password || 'Demo@123',
      disabled: false,
      verified: body.verified ?? false,
      createdAt: nowIso(),
    };
    store.db.users.push(user);
    store.touch();
    return ctx.json(201, user);
  }),

  E('PATCH', '/api/users/me', { title: 'Update own profile', auth: 'api', sample: { body: { name: 'Ana Agent' } }, vulns: [22, 137], desc: 'Accepts role changes for the caller (privilege escalation).' }, async (ctx) => {
    const me = store.db.users.find((u) => u.id === ctx.user.id);
    Object.assign(me, ensureObject(ctx.body), { id: me.id });
    store.touch();
    return ctx.json(200, publicUser(me));
  }),

  E('PATCH', '/api/users/:id', { title: 'Update user', auth: 'api', sample: { params: { id: 3 }, body: { role: 'manager' } }, vulns: [22, 125, 131], desc: 'Any field can be written, including role, verified flag and id.' }, async (ctx) => {
    const u = store.db.users.find((x) => x.id === Number(ctx.params.id));
    if (!u) throw new HttpError(404, 'User not found');
    Object.assign(u, ensureObject(ctx.body));
    store.touch();
    return ctx.json(200, publicUser(u));
  }),

  E('DELETE', '/api/users/:id', { title: 'Delete user', auth: 'api', sample: { params: { id: 9 } }, vulns: [19], desc: 'Any signed-in user can disable and mark a user deleted.' }, async (ctx) => {
    const u = store.db.users.find((x) => x.id === Number(ctx.params.id));
    if (!u) throw new HttpError(404, 'User not found');
    u.disabled = true;
    u.deleted = true;
    store.touch();
    return ctx.json(200, { deleted: true, id: u.id });
  }),

  E('POST', '/api/admin/users/:id/disable', { title: 'Disable user (admin)', auth: 'api', sample: { params: { id: 9 } }, vulns: [10, 19], desc: 'Admin-only action with no role check.' }, async (ctx) => {
    const u = store.db.users.find((x) => x.id === Number(ctx.params.id));
    if (!u) throw new HttpError(404, 'User not found');
    u.disabled = true;
    store.touch();
    return ctx.json(200, { disabled: true, id: u.id });
  }),

  E('POST', '/api/admin/users/:id/reset-password', { title: 'Reset user password (admin)', auth: 'api', sample: { params: { id: 3 } }, vulns: [19, 40], desc: 'No admin check. Returns the new password in clear text.' }, async (ctx) => {
    const u = store.db.users.find((x) => x.id === Number(ctx.params.id));
    if (!u) throw new HttpError(404, 'User not found');
    u.password = 'Reset-' + Math.floor(1000 + Math.random() * 8999);
    store.touch();
    return ctx.json(200, { id: u.id, temporaryPassword: u.password });
  }),

  E('GET', '/api/roles', { title: 'List roles (read-only)', auth: 'api', vulns: [15], desc: 'Roles are fixed. Creating roles is not supported.' }, async (ctx) => ctx.json(200, { data: ROLES, creatable: false })),

  E('GET', '/api/roles/:name', { title: 'Get role (read-only)', auth: 'api', sample: { params: { name: 'manager' } }, vulns: [15], desc: 'Returns one of the three fixed roles.' }, async (ctx) => {
    const r = ROLES.find((x) => x.name === ctx.params.name);
    if (!r) throw new HttpError(404, 'Role not found');
    return ctx.json(200, r);
  }),

  E('PUT', '/api/users/:id/role', { title: 'Assign role to user', auth: 'api', sample: { params: { id: 3 }, body: { role: 'manager' } }, vulns: [15, 22], desc: 'Role check trusts the X-Role request header.' }, async (ctx) => {
    const actor = ctx.headers['x-role'] || ctx.user.role;
    if (!['admin', 'manager'].includes(actor)) throw new HttpError(403, 'Only admin or manager can assign roles');
    const role = String(ctx.body.role || '');
    if (!ROLES.some((r) => r.name === role)) throw new HttpError(400, 'Unknown role', { allowed: ROLES.map((r) => r.name) });
    const u = store.db.users.find((x) => x.id === Number(ctx.params.id));
    if (!u) throw new HttpError(404, 'User not found');
    u.role = role;
    store.touch();
    return ctx.json(200, publicUser(u));
  }),

  E('GET', '/api/admin/dashboard', { title: 'Admin dashboard', auth: 'api', vulns: [10], desc: 'Admin view with no role check.' }, async (ctx) => {
    const t = ctx.user.tenantId;
    const count = (c) => store.db[c].filter((r) => r.tenantId === t && !r.deleted).length;
    return ctx.json(200, { tenantId: t, users: store.db.users.filter((u) => u.tenantId === t).length, contacts: count('contacts'), deals: count('deals'), invoices: count('invoices'), sessions: store.db.sessions.length });
  }),

  E('POST', '/api/admin/tenants/:id/reseed', { title: 'Reseed tenant demo data', auth: 'api', sample: { params: { id: 't1' } }, vulns: [10], desc: 'Resets sample data for any tenant. No role or tenant check.' }, async (ctx) => {
    findTenant(ctx.params.id);
    reseedTenantData(store.db, ctx.params.id);
    store.touch();
    return ctx.json(200, { reseeded: ctx.params.id, env: DEFAULT_ENV });
  }),
];
