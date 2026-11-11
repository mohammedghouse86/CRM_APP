'use strict';
const store = require('../store');
const { HttpError } = require('../http');
const { endpoint } = require('./_def');
const { makeHandlers, ensureObject, findForWrite, nowIso, visibleRows } = require('../resources');

const G = 'CRM records';
const E = (method, path, o, fn) => endpoint(G, method, path, o, fn);
const sample = (body, params) => ({ body, params });

// Feed cache is keyed by tenant only, so every user in a tenant sees the first caller's view.
let feedCache = {};

// Standard CRUD endpoints for one collection, with the vulnerability tags for each operation.
function crud(name, label, v) {
  const h = makeHandlers(name);
  const base = `/api/${name}`;
  const one = `${base}/:id`;
  const samples = {
    contacts: { firstName: 'Test', lastName: 'Person', email: 'test.person@client.example', phone: '+1-555-0100' },
    companies: { name: 'Test Company Ltd', industry: 'Software' },
    deals: { title: 'New renewal', amount: 12000, stage: 'lead' },
    tasks: { title: 'Call the client', priority: 'high' },
    invoices: { amount: 2500, status: 'draft' },
    products: { name: 'Sample Product', price: 99, stock: 10 },
    notes: { body: 'Follow up next week', visibility: 'team' },
    campaigns: { name: 'Winter promo', quota: 500 },
    activities: { type: 'call', summary: 'Intro call' },
    tags: { name: 'pilot' },
    notifications: { text: 'Reminder' },
  };
  return [
    E('GET', base, { title: `List ${label.toLowerCase()}s`, auth: 'api', sample: { query: { limit: 10, offset: 0 } }, vulns: v.list, desc: 'Tenant-scoped list. Supports q, limit, offset, and scope=all.' }, h.list),
    E('GET', one, { title: `Get ${label.toLowerCase()}`, auth: 'api', sample: sample(null, { id: 1 }), vulns: v.get, desc: 'Fetch one record by numeric id.' }, h.getOne),
    E('POST', base, { title: `Create ${label.toLowerCase()}`, auth: 'api', sample: { body: samples[name] }, vulns: v.create, desc: 'Creates a record. All submitted fields are stored.' }, h.create),
    E('PATCH', one, { title: `Update ${label.toLowerCase()}`, auth: 'api', sample: { params: { id: 1 }, body: samples[name] }, vulns: v.patch, desc: 'Partial update. Any field can be written.' }, h.patch),
    E('DELETE', one, { title: `Delete ${label.toLowerCase()}`, auth: 'api', sample: { params: { id: 1 } }, vulns: v.del, desc: 'Soft delete by default. Add ?hard=1 for a hard delete.' }, h.del),
  ];
}

const simpleList = (name, vulns) => {
  const h = makeHandlers(name);
  return E('GET', `/api/${name}`, { title: `List ${name}`, auth: 'api', vulns, sample: { query: { limit: 10 } } }, h.list);
};

module.exports = [
  // ---- Contacts
  ...crud('contacts', 'Contact', { list: [50, 24, 83], get: [12, 87, 85], create: [51, 53, 54, 66, 67, 23], patch: [14, 62, 68, 70, 71, 124, 125, 127, 129], del: [69] }),
  E('PUT', '/api/contacts/:id', { title: 'Replace contact (PUT)', auth: 'api', sample: { params: { id: 1 }, body: { firstName: 'Replaced', email: 'r@client.example' } }, vulns: [130], desc: 'PUT skips the role check that PATCH enforces.' }, makeHandlers('contacts').put),
  E('GET', '/api/contacts/search', { title: 'Search contacts (all tenants)', auth: 'api', sample: { query: { q: 'example' } }, vulns: [11, 18], desc: 'Searches every tenant and returns sensitive fields.' }, async (ctx) => {
    const q = String(ctx.query.q || '').toLowerCase();
    const rows = store.db.contacts.filter((r) => !r.deleted && JSON.stringify(r).toLowerCase().includes(q)).slice(0, 50);
    return ctx.json(200, { q, total: rows.length, data: rows });
  }),
  E('GET', '/api/contacts/export', { title: 'Export contacts (CSV)', auth: 'api', sample: { query: {} }, vulns: [83], desc: 'CSV export that includes national ids and internal notes.' }, async (ctx) => {
    const rows = visibleRows(ctx, 'contacts', { agentSeesAll: true }, false);
    const head = 'id,firstName,lastName,email,nationalId,internalNotes';
    const lines = rows.map((r) => [r.id, r.firstName, r.lastName, r.email, r.nationalId, r.internalNotes].join(','));
    return ctx.text(200, [head, ...lines].join('\n'), 'text/csv; charset=utf-8');
  }),
  E('POST', '/api/contacts/import', { title: 'Import contacts (CSV text)', auth: 'api', sample: { body: { csv: 'firstName,lastName,email\nImported,Person,imported@client.example' } }, vulns: [53, 51], desc: 'Imports rows without validation or tenant checks on the owner column.' }, async (ctx) => {
    const lines = String(ctx.body.csv || '').split('\n').filter(Boolean);
    const [head, ...rows] = lines;
    const cols = head.split(',');
    let n = 0;
    for (const line of rows) {
      const vals = line.split(',');
      const rec = { id: store.nextId('contacts'), tenantId: ctx.user.tenantId, ownerId: ctx.user.id, createdBy: ctx.user.id, createdAt: nowIso(), updatedAt: nowIso(), updatedBy: ctx.user.id, deleted: false, deletedAt: null, deletedBy: null };
      cols.forEach((c, i) => (rec[c] = vals[i]));
      store.db.contacts.push(rec);
      n++;
    }
    store.touch();
    return ctx.json(201, { imported: n });
  }),
  E('POST', '/api/contacts/:id/archive', { title: 'Archive contact', auth: 'api', sample: { params: { id: 1 } }, vulns: [123], desc: 'Archive does what delete does, without the delete role check.' }, async (ctx) => {
    const rec = findForWrite(ctx, 'contacts', { label: 'Contact' });
    rec.archived = true;
    rec.status = 'archived';
    rec.deleted = true;
    rec.deletedAt = nowIso();
    rec.deletedBy = ctx.user.id;
    store.touch();
    return ctx.json(200, rec);
  }),
  E('GET', '/api/contacts/:id/timeline', { title: 'Contact timeline', auth: 'api', sample: { params: { id: 1 } }, vulns: [85], desc: 'Activity timeline, including records from any tenant.' }, async (ctx) => {
    const id = Number(ctx.params.id);
    return ctx.json(200, { contactId: id, activities: store.db.activities.filter((a) => a.subjectId === id) });
  }),

  // ---- Companies
  ...crud('companies', 'Company', { list: [50], get: [13], create: [51], patch: [53, 127], del: [69] }),
  E('GET', '/api/companies/:id/contacts', { title: 'Company contacts (nested)', auth: 'api', sample: { params: { id: 1 } }, vulns: [84], desc: 'Nested contacts with national ids, no field filtering.' }, async (ctx) => {
    const id = Number(ctx.params.id);
    return ctx.json(200, { companyId: id, contacts: store.db.contacts.filter((c) => c.companyId === id) });
  }),

  // ---- Deals
  ...crud('deals', 'Deal', { list: [13], get: [118], create: [122, 51], patch: [133, 60], del: [118, 69] }),
  E('POST', '/api/deals/:id/stage', { title: 'Move deal stage', auth: 'api', sample: { params: { id: 1 }, body: { stage: 'won' } }, vulns: [59], desc: 'Stage order is not enforced: a lead can jump straight to won.' }, async (ctx) => {
    const rec = findForWrite(ctx, 'deals', { label: 'Deal' });
    rec.stage = String(ctx.body.stage || rec.stage);
    if (rec.stage === 'won') rec.closed = true;
    rec.updatedAt = nowIso();
    store.touch();
    return ctx.json(200, rec);
  }),
  E('POST', '/api/deals/:id/transfer', { title: 'Transfer deal', auth: 'api', sample: { params: { id: 1 }, body: { ownerId: 3, tenantId: 't1' } }, vulns: [121, 124], desc: 'Changes owner and tenant in one call without the combined checks.' }, async (ctx) => {
    const rec = store.db.deals.find((d) => d.id === Number(ctx.params.id) && !d.deleted);
    if (!rec) throw new HttpError(404, 'Deal not found');
    if (ctx.body.ownerId !== undefined) rec.ownerId = ctx.body.ownerId;
    if (ctx.body.tenantId !== undefined) rec.tenantId = ctx.body.tenantId;
    store.touch();
    return ctx.json(200, rec);
  }),

  // ---- Tasks
  ...crud('tasks', 'Task', { list: [50], get: [87], create: [51], patch: [60, 61], del: [69] }),
  E('POST', '/api/tasks/:id/complete', { title: 'Complete task', auth: 'api', sample: { params: { id: 1 } }, vulns: [120], desc: 'Marks any task done by id, without a tenant check.' }, async (ctx) => {
    const t = store.db.tasks.find((x) => x.id === Number(ctx.params.id));
    if (!t) throw new HttpError(404, 'Task not found');
    t.status = 'done';
    store.touch();
    return ctx.json(200, { ok: true, id: t.id });
  }),
  E('GET', '/api/tasks/:id/comments', { title: 'List task comments', auth: 'api', sample: { params: { id: 1 } }, vulns: [50], desc: 'Comments for a task.' }, async (ctx) => {
    const id = Number(ctx.params.id);
    return ctx.json(200, { taskId: id, data: store.db.comments.filter((c) => c.taskId === id) });
  }),
  E('POST', '/api/tasks/:id/comments', { title: 'Add task comment', auth: 'api', sample: { params: { id: 1 }, body: { text: 'Looks good' } }, vulns: [101], desc: 'Comment text is stored and rendered without escaping.' }, async (ctx) => {
    const id = Number(ctx.params.id);
    const c = { id: store.nextId('comments'), taskId: id, text: String(ctx.body.text || ''), tenantId: ctx.user.tenantId, ownerId: ctx.user.id, createdBy: ctx.user.id, createdAt: nowIso(), updatedAt: nowIso(), updatedBy: ctx.user.id, deleted: false };
    store.db.comments.push(c);
    store.touch();
    return ctx.json(201, c);
  }),

  // ---- Invoices
  ...crud('invoices', 'Invoice', { list: [50], get: [87, 88], create: [51], patch: [64], del: [69] }),
  E('POST', '/api/invoices/:id/pay', { title: 'Record payment', auth: 'api', sample: { params: { id: 1 }, body: { amount: 500 } }, vulns: [64], desc: 'Balance is not bounded; overpayment creates credit with no checks.' }, async (ctx) => {
    const inv = store.db.invoices.find((i) => i.id === Number(ctx.params.id) && !i.deleted);
    if (!inv || inv.tenantId !== ctx.user.tenantId) throw new HttpError(404, 'Invoice not found');
    inv.balance = (inv.balance ?? inv.amount) - Number(ctx.body.amount || 0);
    if (inv.balance <= 0) inv.status = 'paid';
    store.touch();
    return ctx.json(200, inv);
  }),
  E('POST', '/api/invoices/:id/approve', { title: 'Approve invoice', auth: 'api', sample: { params: { id: 1 } }, vulns: [25], desc: 'Approval needs manager rights, but any role can approve.' }, async (ctx) => {
    const inv = store.db.invoices.find((i) => i.id === Number(ctx.params.id) && !i.deleted);
    if (!inv || inv.tenantId !== ctx.user.tenantId) throw new HttpError(404, 'Invoice not found');
    inv.status = 'approved';
    inv.approvedBy = ctx.user.id;
    store.touch();
    return ctx.json(200, inv);
  }),

  // ---- Products
  ...crud('products', 'Product', { list: [50], get: [87], create: [51, 53], patch: [55, 56, 57], del: [69] }),
  E('POST', '/api/products/:id/adjust-stock', { title: 'Adjust stock', auth: 'api', sample: { params: { id: 1 }, body: { delta: -5 } }, vulns: [58], desc: 'No lower or upper bound on stock.' }, async (ctx) => {
    const p = store.db.products.find((x) => x.id === Number(ctx.params.id) && !x.deleted);
    if (!p || p.tenantId !== ctx.user.tenantId) throw new HttpError(404, 'Product not found');
    p.stock = (p.stock || 0) + Number(ctx.body.delta || 0);
    store.touch();
    return ctx.json(200, p);
  }),

  // ---- Notes
  ...crud('notes', 'Note', { list: [50], get: [85], create: [101, 51], patch: [53], del: [69] }),
  E('GET', '/api/notes/feed', { title: 'Notes feed', auth: 'api', vulns: [16], desc: 'Feed is cached per tenant, so the first caller’s view is served to everyone.' }, async (ctx) => {
    const t = ctx.user.tenantId;
    if (!feedCache[t]) {
      feedCache[t] = visibleRows(ctx, 'notes', { agentSeesAll: false }, false).slice(0, 50);
    }
    return ctx.json(200, { tenantId: t, data: feedCache[t] });
  }),

  // ---- Campaigns
  ...crud('campaigns', 'Campaign', { list: [50], get: [87], create: [51], patch: [126, 53], del: [69] }),
  E('POST', '/api/campaigns/:id/send', { title: 'Send campaign', auth: 'api', sample: { params: { id: 1 }, body: { count: 100 } }, vulns: [126], desc: 'Quota is shown but not enforced.' }, async (ctx) => {
    const c = store.db.campaigns.find((x) => x.id === Number(ctx.params.id) && !x.deleted);
    if (!c || c.tenantId !== ctx.user.tenantId) throw new HttpError(404, 'Campaign not found');
    c.sent = (c.sent || 0) + Number(ctx.body.count || 0);
    c.status = 'sent';
    store.touch();
    return ctx.json(200, c);
  }),

  // ---- Orders (checkout trusts the client for prices, currency and discounts)
  E('POST', '/api/orders/checkout', { title: 'Checkout', auth: 'api', sample: { body: { items: [{ productId: 1, quantity: 2, price: 10, currency: 'EUR' }], discountPct: 50, creditUsed: 0 } }, vulns: [55, 56, 57, 58, 64, 68], desc: 'Uses client-supplied price, currency, discount, quantity and credit. Stock is adjusted without checks.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    const items = Array.isArray(body.items) ? body.items : [];
    let total = 0;
    for (const it of items) {
      const p = store.db.products.find((x) => x.id === Number(it.productId));
      if (p) p.stock = (p.stock || 0) - Number(it.quantity || 0);
      total += Number(it.price || 0) * Number(it.quantity || 0);
    }
    total = total * (1 - Number(body.discountPct || 0) / 100) - Number(body.creditUsed || 0);
    const order = { id: store.nextId('orders'), tenantId: ctx.user.tenantId, ownerId: ctx.user.id, items, currency: body.currency || 'USD', total: Math.round(total * 100) / 100, createdAt: nowIso(), ifMatch: ctx.headers['if-match'] || null };
    store.db.orders.push(order);
    store.touch();
    return ctx.json(201, order);
  }),

  // ---- Supporting collections
  simpleList('activities', [50]),
  ...crud('activities', 'Activity', { list: [50], get: [50], create: [51, 66], patch: [53], del: [69] }).slice(2, 3),
  simpleList('tags', [50]),
  ...crud('tags', 'Tag', { list: [50], get: [50], create: [51, 53], patch: [53], del: [69] }).slice(2, 3),
  E('GET', '/api/pipelines', { title: 'List pipelines', auth: 'api', vulns: [50], desc: 'Sales pipelines and their stages.' }, async (ctx) => {
    return ctx.json(200, { data: store.db.pipelines.filter((p) => p.tenantId === ctx.user.tenantId) });
  }),
  E('GET', '/api/categories', { title: 'Product categories', auth: 'api', vulns: [50], desc: 'Distinct product categories.' }, async (ctx) => {
    const set = [...new Set(store.db.products.filter((p) => p.tenantId === ctx.user.tenantId).map((p) => p.category))];
    return ctx.json(200, { data: set });
  }),
  E('GET', '/api/dashboard/kpis', { title: 'Dashboard KPIs', auth: 'api', vulns: [50], desc: 'Headline numbers for the caller tenant.' }, async (ctx) => {
    const t = ctx.user.tenantId;
    const open = store.db.deals.filter((d) => d.tenantId === t && !d.closed && !d.deleted);
    const pipeline = open.reduce((s, d) => s + Number(d.amount || 0), 0);
    const overdue = store.db.tasks.filter((x) => x.tenantId === t && x.status !== 'done' && x.dueDate < '2026-11-11').length;
    const balance = store.db.invoices.filter((i) => i.tenantId === t).reduce((s, i) => s + Number(i.balance || 0), 0);
    return ctx.json(200, { openDeals: open.length, pipelineValue: pipeline, overdueTasks: overdue, outstandingBalance: balance });
  }),
  simpleList('notifications', [50]),
  E('POST', '/api/notifications/:id/read', { title: 'Mark notification read', auth: 'api', sample: { params: { id: 1 } }, vulns: [53], desc: 'Marks any notification read by id.' }, async (ctx) => {
    const n = store.db.notifications.find((x) => x.id === Number(ctx.params.id));
    if (!n) throw new HttpError(404, 'Notification not found');
    n.read = true;
    store.touch();
    return ctx.json(200, n);
  }),
];
