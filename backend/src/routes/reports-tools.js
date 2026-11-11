'use strict';
const { exec } = require('child_process');
const store = require('../store');
const { HttpError } = require('../http');
const { endpoint } = require('./_def');
const { ensureObject, matchesFilter } = require('../resources');

const R = 'Reports & search';
const RE = (method, path_, o, fn) => endpoint(R, method, path_, o, fn);
const T = 'Utilities & templates';
const TE = (method, path_, o, fn) => endpoint(T, method, path_, o, fn);

const inTenant = (rows, tid) => rows.filter((r) => r.tenantId === tid && !r.deleted);

module.exports = [
  // ===== Reports
  RE('GET', '/api/reports/summary', { title: 'Tenant summary report', auth: 'decode', vulns: [36], desc: 'Tenant is read from the token claims without checking the signature.' }, async (ctx) => {
    const tid = ctx.user.tenantId;
    return ctx.json(200, { tenantId: tid, deals: inTenant(store.db.deals, tid).length, contacts: inTenant(store.db.contacts, tid).length, invoices: inTenant(store.db.invoices, tid).length });
  }),
  RE('GET', '/api/reports/sales', { title: 'Sales report by date', auth: 'api', sample: { query: { from: '2026-01-01', to: '2026-12-31' } }, vulns: [106], desc: 'Reversed date ranges are silently swapped instead of rejected.' }, async (ctx) => {
    let from = ctx.query.from || '0000-01-01';
    let to = ctx.query.to || '9999-12-31';
    if (from > to) [from, to] = [to, from];
    const rows = inTenant(store.db.deals, ctx.user.tenantId).filter((d) => d.closeDate >= from && d.closeDate <= to);
    return ctx.json(200, { from, to, count: rows.length, total: rows.reduce((s, d) => s + Number(d.amount || 0), 0) });
  }),
  RE('GET', '/api/reports/slow', { title: 'Slow report', auth: 'api', sample: { query: { ms: 2000 } }, vulns: [104], desc: 'Intentionally slow response. Delay is set by the caller, up to 15 seconds.' }, async (ctx) => {
    const ms = Math.min(Number(ctx.query.ms) || 3000, 15000);
    await new Promise((r) => setTimeout(r, ms));
    return ctx.json(200, { delayedMs: ms });
  }),
  RE('GET', '/api/reports/export', { title: 'Export deals (CSV)', auth: 'api', sample: { query: {} }, vulns: [29], desc: 'Accepts the bearer token as ?access_token=, so it appears in URLs and logs.' }, async (ctx) => {
    const rows = inTenant(store.db.deals, ctx.user.tenantId);
    const lines = rows.map((d) => [d.id, d.title, d.amount, d.stage].join(','));
    return ctx.text(200, ['id,title,amount,stage', ...lines].join('\n'), 'text/csv; charset=utf-8');
  }),
  RE('GET', '/api/reports/sql', { title: 'Deal search (SQL-style filter)', auth: 'api', sample: { query: { where: 'Renewal' } }, vulns: [142], desc: 'Builds an SQL-style string from the query and echoes DB errors. Simulated over the JSON store.' }, async (ctx) => {
    const w = String(ctx.query.where || '');
    const sql = `SELECT id, title, amount FROM deals WHERE tenant_id = '${ctx.user.tenantId}' AND title LIKE '%${w}%'`;
    if ((w.match(/'/g) || []).length % 2 === 1) {
      throw new HttpError(500, `syntax error near "'" in statement`, { sql, engine: 'sqlite-sim' });
    }
    const boolBypass = /'\s*or\s*'?1'?\s*=\s*'?1/i.test(w) || /\bor\s+1\s*=\s*1\b/i.test(w);
    const pool = boolBypass ? store.db.deals.filter((d) => !d.deleted) : inTenant(store.db.deals, ctx.user.tenantId).filter((d) => d.title.includes(w));
    return ctx.json(200, { sql, rows: pool.map((d) => ({ id: d.id, title: d.title, amount: d.amount, tenantId: d.tenantId })) });
  }),
  RE('GET', '/api/reports/paginated', { title: 'Paginated contacts report', auth: 'api', sample: { query: { limit: 5000, offset: 0 } }, vulns: [105], desc: 'Page size is not capped and negative offsets are accepted.' }, async (ctx) => {
    const limit = Number(ctx.query.limit) || 25;
    const offset = Number(ctx.query.offset) || 0;
    const rows = inTenant(store.db.contacts, ctx.user.tenantId);
    return ctx.json(200, { limit, offset, total: rows.length, data: rows.slice(offset, offset + limit) });
  }),

  // ===== Search
  RE('GET', '/api/search', { title: 'Global search', auth: 'api', sample: { query: { q: 'renewal', all: 0 } }, vulns: [17, 18], desc: 'all=1 searches every tenant. Private notes are included for every role.' }, async (ctx) => {
    const q = String(ctx.query.q || '').toLowerCase();
    const scope = (rows) => (ctx.query.all === '1' ? rows : inTenant(rows, ctx.user.tenantId));
    const hit = (rows) => scope(rows).filter((r) => JSON.stringify(r).toLowerCase().includes(q)).slice(0, 25);
    return ctx.json(200, { q, deals: hit(store.db.deals), companies: hit(store.db.companies), contacts: hit(store.db.contacts), notes: hit(store.db.notes) });
  }),
  RE('GET', '/api/search/echo', { title: 'Search echo (HTML)', auth: 'none', sample: { query: { q: 'hello' } }, vulns: [101], desc: 'Echoes the query into HTML without escaping.' }, async (ctx) => {
    return ctx.html(200, `<!doctype html><html><body><h1>Results for ${ctx.query.q || ''}</h1><p>No records matched.</p></body></html>`);
  }),
  RE('POST', '/api/search/query', { title: 'Structured search (Mongo-style filter)', auth: 'api', sample: { body: { filter: { status: 'customer' } } }, vulns: [141], desc: 'Filter object is merged over the tenant filter, so a client can override tenantId with operators.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    const filter = Object.assign({ tenantId: ctx.user.tenantId }, body.filter || {});
    const rows = store.db.contacts.filter((c) => !c.deleted && matchesFilter(c, filter));
    return ctx.json(200, { filter, total: rows.length, data: rows.slice(0, 50) });
  }),

  // ===== Utilities
  TE('POST', '/api/tools/ping', { title: 'Ping a host', auth: 'api', sample: { body: { host: 'example.com' } }, vulns: [97], desc: 'Host is put into a shell command without escaping.' }, async (ctx) => {
    const host = String(ctx.body.host || '');
    const flag = process.platform === 'win32' ? '-n 1' : '-c 1';
    const out = await new Promise((resolve) => {
      exec(`ping ${flag} ${host}`, { timeout: 8000 }, (err, stdout, stderr) => resolve({ ok: !err, output: (stdout + stderr).slice(0, 2000) }));
    });
    return ctx.json(200, { host, ...out });
  }),
  TE('GET', '/api/tools/fetch', { title: 'Fetch URL (server side)', auth: 'api', sample: { query: { url: 'https://example.com' } }, vulns: [96, 102], desc: 'Fetches any URL from the server and returns the body.' }, async (ctx) => {
    const url = String(ctx.query.url || '');
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return ctx.json(200, { url, status: r.status, headers: Object.fromEntries(r.headers), body: (await r.text()).slice(0, 2000) });
    } catch (e) {
      return ctx.json(502, { url, error: String(e.message) });
    }
  }),
  TE('POST', '/api/templates/render', { title: 'Render template', auth: 'api', sample: { body: { template: 'Hello {{ user.name }}, total is {{ 6*7 }}', data: { user: { name: 'Ana' } } } }, vulns: [100], desc: 'Expressions inside {{ }} are evaluated with the caller data as scope.' }, async (ctx) => {
    const tpl = String(ctx.body.template || '');
    const data = ctx.body.data || {};
    const out = tpl.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => {
      try {
        return String(new Function('data', `with (data) { return (${expr}); }`)(data));
      } catch (e) {
        return `[template error: ${e.message}]`;
      }
    });
    return ctx.json(200, { rendered: out });
  }),
  TE('POST', '/api/tools/validate', { title: 'Validate form data', auth: 'api', sample: { body: { email: 'not-an-email', age: 'twelve' } }, vulns: [98], desc: 'Always reports valid. No type or format checks.' }, async (ctx) => {
    return ctx.json(200, { valid: true, received: ctx.body, checks: [] });
  }),
  TE('GET', '/api/redirect', { title: 'Redirect', auth: 'none', sample: { query: { to: 'https://example.com' } }, vulns: [80], desc: 'Open redirect to any target.' }, async (ctx) => {
    return ctx.redirect(String(ctx.query.to || '/'));
  }),
];
