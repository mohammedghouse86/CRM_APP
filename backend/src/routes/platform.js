'use strict';
const fs = require('fs');
const path = require('path');
const store = require('../store');
const { HttpError } = require('../http');
const { endpoint } = require('./_def');
const { ensureObject, nowIso } = require('../resources');
const { PLANS } = require('../seed');

const UPLOAD_DIR = path.join(path.dirname(store.FILE), 'uploads');
const tenantRows = (name, ctx) => store.db[name].filter((r) => r.tenantId === ctx.user.tenantId && !r.deleted);

// ---------------- Files
const F = 'Files';
const FE = (method, path_, o, fn) => endpoint(F, method, path_, o, fn);

// ---------------- Webhooks
const W = 'Webhooks & integrations';
const WE = (method, path_, o, fn) => endpoint(W, method, path_, o, fn);

// ---------------- Plans, subscriptions, audit
const P = 'Plans, subscriptions & audit';
const PE = (method, path_, o, fn) => endpoint(P, method, path_, o, fn);

module.exports = [
  // ===== Files
  FE('GET', '/api/files', { title: 'List files', auth: 'api', vulns: [50], desc: 'Uploaded file metadata for the tenant.' }, async (ctx) => {
    return ctx.json(200, { data: tenantRows('files', ctx) });
  }),
  FE('POST', '/api/files/upload', { title: 'Upload file', auth: 'api', sample: { body: { name: 'notes.txt', contentType: 'text/plain', contentBase64: Buffer.from('hello').toString('base64') } }, vulns: [63], desc: 'Accepts any file type, including HTML and SVG. Name is not sanitised.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    if (!body.name || !body.contentBase64) throw new HttpError(400, 'name and contentBase64 are required');
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, String(body.name)), Buffer.from(String(body.contentBase64), 'base64'));
    const rec = { id: store.nextId('files'), tenantId: ctx.user.tenantId, name: body.name, contentType: body.contentType || 'application/octet-stream', size: Buffer.from(body.contentBase64, 'base64').length, ownerId: ctx.user.id, createdBy: ctx.user.id, createdAt: nowIso(), deleted: false };
    store.db.files.push(rec);
    store.touch();
    return ctx.json(201, rec);
  }),
  FE('GET', '/api/files/download', { title: 'Download file', auth: 'api', sample: { query: { name: 'notes.txt' } }, vulns: [99], desc: 'File name is joined to the upload folder without validation.' }, async (ctx) => {
    const name = String(ctx.query.name || '');
    const full = path.join(UPLOAD_DIR, name);
    let data;
    try {
      data = fs.readFileSync(full);
    } catch (e) {
      throw new HttpError(404, 'File not found', { path: full });
    }
    return ctx.send(200, 'application/octet-stream', data);
  }),
  FE('DELETE', '/api/files/:id', { title: 'Delete file', auth: 'api', sample: { params: { id: 1 } }, vulns: [69], desc: 'Removes metadata and the stored file.' }, async (ctx) => {
    const f = store.db.files.find((x) => x.id === Number(ctx.params.id) && x.tenantId === ctx.user.tenantId);
    if (!f) throw new HttpError(404, 'File not found');
    f.deleted = true;
    f.deletedBy = ctx.user.id;
    store.touch();
    return ctx.json(200, { deleted: true, id: f.id });
  }),

  // ===== Webhooks
  WE('GET', '/api/webhooks', { title: 'List webhooks', auth: 'api', vulns: [50], desc: 'Webhook subscriptions. Secrets are returned.' }, async (ctx) => ctx.json(200, { data: tenantRows('webhooks', ctx) })),
  WE('POST', '/api/webhooks', { title: 'Create webhook', auth: 'api', sample: { body: { url: 'https://example.com/hook', events: ['deal.won'] } }, vulns: [102, 51], desc: 'Accepts any target URL, including internal addresses.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    if (!body.url) throw new HttpError(400, 'url is required');
    const rec = { id: store.nextId('webhooks'), tenantId: ctx.user.tenantId, url: body.url, events: body.events || [], secret: 'whsec_' + Math.floor(Math.random() * 1e6), ownerId: ctx.user.id, createdBy: ctx.user.id, createdAt: nowIso(), deleted: false };
    store.db.webhooks.push(rec);
    store.touch();
    return ctx.json(201, rec);
  }),
  WE('POST', '/api/webhooks/:id/test', { title: 'Send test delivery', auth: 'api', sample: { params: { id: 1 } }, vulns: [102], desc: 'Server fetches the webhook URL and returns the response. Server-side request.' }, async (ctx) => {
    const hook = store.db.webhooks.find((w) => w.id === Number(ctx.params.id) && w.tenantId === ctx.user.tenantId);
    if (!hook) throw new HttpError(404, 'Webhook not found');
    try {
      const r = await fetch(hook.url, { method: 'POST', body: JSON.stringify({ event: 'test' }), headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(4000) });
      const text = (await r.text()).slice(0, 500);
      return ctx.json(200, { status: r.status, body: text });
    } catch (e) {
      return ctx.json(502, { error: 'Delivery failed', detail: String(e.message) });
    }
  }),
  WE('DELETE', '/api/webhooks/:id', { title: 'Delete webhook', auth: 'api', sample: { params: { id: 1 } }, vulns: [69], desc: 'Soft delete.' }, async (ctx) => {
    const hook = store.db.webhooks.find((w) => w.id === Number(ctx.params.id));
    if (!hook) throw new HttpError(404, 'Webhook not found');
    hook.deleted = true;
    hook.deletedBy = ctx.user.id;
    store.touch();
    return ctx.json(200, { deleted: true, id: hook.id });
  }),

  // ===== Plans, subscriptions, audit
  PE('GET', '/api/plans', { title: 'List plans', auth: 'none', vulns: [50], desc: 'Public plan catalogue.' }, async (ctx) => ctx.json(200, { data: PLANS })),
  PE('GET', '/api/subscriptions', { title: 'List subscriptions', auth: 'api', vulns: [50], desc: 'Tenant subscriptions.' }, async (ctx) => ctx.json(200, { data: tenantRows('subscriptions', ctx) })),
  PE('POST', '/api/subscriptions', { title: 'Create subscription', auth: 'api', sample: { body: { plan: 'enterprise', seats: 500, quota: 100000 } }, vulns: [128, 51], desc: 'Plan and seats are accepted without billing.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    const rec = { ...body, id: store.nextId('subscriptions'), tenantId: ctx.user.tenantId, createdBy: ctx.user.id, createdAt: nowIso(), deleted: false };
    store.db.subscriptions.push(rec);
    store.touch();
    return ctx.json(201, rec);
  }),
  PE('PATCH', '/api/subscriptions/:id', { title: 'Update subscription', auth: 'api', sample: { params: { id: 1 }, body: { quota: 5000 } }, vulns: [134, 126], desc: 'Can be changed after expiry, and quota is writable.' }, async (ctx) => {
    const s = store.db.subscriptions.find((x) => x.id === Number(ctx.params.id) && x.tenantId === ctx.user.tenantId);
    if (!s) throw new HttpError(404, 'Subscription not found');
    Object.assign(s, ensureObject(ctx.body));
    store.touch();
    return ctx.json(200, s);
  }),
  PE('GET', '/api/entitlements/check', { title: 'Check feature entitlement', auth: 'api', sample: { query: { feature: 'api', plan: 'starter' } }, vulns: [119], desc: 'The plan is taken from the query string, not from the subscription.' }, async (ctx) => {
    const sub = store.db.subscriptions.find((s) => s.tenantId === ctx.user.tenantId);
    const plan = ctx.query.plan || (sub && sub.plan);
    const p = PLANS.find((x) => x.id === plan);
    const feature = String(ctx.query.feature || '');
    return ctx.json(200, { feature, plan, allowed: !!(p && p.features.includes(feature)) });
  }),
  PE('GET', '/api/audit', { title: 'List audit log', auth: 'api', vulns: [50], desc: 'Tenant audit entries.' }, async (ctx) => ctx.json(200, { data: tenantRows('audit', ctx) })),
  PE('POST', '/api/audit', { title: 'Write audit entry', auth: 'api', sample: { body: { action: 'contact.update', targetType: 'record', targetId: 5 } }, vulns: [52, 65], desc: 'Clients can write any actor id and correlation id.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    const rec = { ...body, id: store.nextId('audit'), tenantId: ctx.user.tenantId, actorId: body.actorId ?? ctx.user.id, requestId: body.requestId || ctx.headers['x-request-id'] || null, createdAt: nowIso(), deleted: false };
    store.db.audit.push(rec);
    store.touch();
    return ctx.json(201, rec);
  }),
  PE('PATCH', '/api/audit/:id', { title: 'Edit audit entry', auth: 'api', sample: { params: { id: 1 }, body: { action: 'nothing-happened' } }, vulns: [52], desc: 'Audit entries can be edited.' }, async (ctx) => {
    const a = store.db.audit.find((x) => x.id === Number(ctx.params.id));
    if (!a) throw new HttpError(404, 'Audit entry not found');
    Object.assign(a, ensureObject(ctx.body));
    store.touch();
    return ctx.json(200, a);
  }),
  PE('DELETE', '/api/audit/:id', { title: 'Delete audit entry', auth: 'api', sample: { params: { id: 1 } }, vulns: [52], desc: 'Audit entries can be removed.' }, async (ctx) => {
    const before = store.db.audit.length;
    store.db.audit = store.db.audit.filter((x) => x.id !== Number(ctx.params.id));
    store.touch();
    return ctx.json(200, { deleted: before !== store.db.audit.length });
  }),
];
