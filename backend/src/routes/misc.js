'use strict';
const os = require('os');
const store = require('../store');
const { HttpError } = require('../http');
const { endpoint } = require('./_def');
const { ensureObject, nowIso } = require('../resources');
const { SECRET } = require('../auth');
const { buildSchema, graphql } = require('graphql');

const RESOURCE_NAMES = ['contacts', 'companies', 'deals', 'tasks', 'invoices', 'products', 'notes', 'campaigns'];

// ---------- GraphQL schema (real graphql-js: introspection and suggestions are on, no depth/cost limits)
const schema = buildSchema(`
  type Contact { id: Int, firstName: String, lastName: String, email: String, status: String, nationalId: String, internalNotes: String, tenantId: String }
  type Company { id: Int, name: String, industry: String, taxId: String, tenantId: String }
  type Deal { id: Int, title: String, amount: Float, stage: String, ownerId: Int, tenantId: String }
  type Query {
    me: String
    contacts(limit: Int): [Contact]
    contact(id: Int!): Contact
    companies: [Company]
    deals: [Deal]
  }
  type Mutation {
    updateDealStage(id: Int!, stage: String!): Deal
  }
`);

const rootValue = {
  me: (_args, ctx) => (ctx.user && !ctx.user.guest ? `${ctx.user.email} (${ctx.user.role})` : 'anonymous'),
  contacts: ({ limit }, ctx) => store.db.contacts.filter((c) => !c.deleted && c.tenantId === ctx.user.tenantId).slice(0, limit || 50),
  contact: ({ id }) => store.db.contacts.find((c) => c.id === id) || null, // no tenant check
  companies: (_a, ctx) => store.db.companies.filter((c) => !c.deleted && c.tenantId === ctx.user.tenantId),
  deals: (_a, ctx) => store.db.deals.filter((d) => !d.deleted && d.tenantId === ctx.user.tenantId),
  updateDealStage: ({ id, stage }) => {
    const d = store.db.deals.find((x) => x.id === id);
    if (!d) return null;
    d.stage = stage;
    store.touch();
    return d;
  },
};

async function runGraphql(ctx, body) {
  const contextValue = { user: ctx.user };
  const run = (b) =>
    graphql({ schema, source: String(b.query || ''), rootValue, contextValue, variableValues: b.variables || undefined, operationName: b.operationName || undefined });
  if (Array.isArray(body)) return Promise.all(body.map(run)); // batching, no limit
  return run(body);
}

const G = 'GraphQL';
const GE = (method, path_, o, fn) => endpoint(G, method, path_, o, fn);
const D = 'Monitoring & debug';
const DE = (method, path_, o, fn) => endpoint(D, method, path_, o, fn);
const A = 'AI agent API';
const AE = (method, path_, o, fn) => endpoint(A, method, path_, o, fn);
const C = 'Custom policy checks';
const CE = (method, path_, o, fn) => endpoint(C, method, path_, o, fn);

function collectionOrThrow(name) {
  if (!RESOURCE_NAMES.includes(name)) throw new HttpError(400, 'Unknown record type', { allowed: RESOURCE_NAMES });
  return store.db[name];
}

// Rule-based "agent" that turns a natural-language prompt into record operations.
// It does not check tenant or role.
function runAgentPrompt(ctx, prompt) {
  const lower = prompt.toLowerCase();
  const tenantMatch = /tenant\s+(t\d+)/i.exec(prompt);
  const tenantId = tenantMatch ? tenantMatch[1].toLowerCase() : ctx.user.tenantId;
  const type = RESOURCE_NAMES.find((n) => lower.includes(n) || lower.includes(n.replace(/s$/, ''))) || 'contacts';
  const idMatch = /#?\b(\d+)\b/.exec(prompt);
  const id = idMatch ? Number(idMatch[1]) : null;
  const rows = store.db[type];
  let verb = 'read';
  if (/delete|remove|archive/.test(lower)) verb = 'delete';
  else if (/update|change|set |edit/.test(lower)) verb = 'update';
  else if (/approve|send|run|execute/.test(lower)) verb = 'execute';
  else if (/search|find/.test(lower)) verb = 'search';

  if (verb === 'search') {
    const q = lower.replace(/.*(search|find)\s*(for)?\s*/, '').trim();
    const hits = rows.filter((r) => !r.deleted && JSON.stringify(r).toLowerCase().includes(q)).slice(0, 25);
    return { verb, type, tenantId, result: hits };
  }
  if (verb === 'execute') {
    const target = rows.find((r) => r.id === id);
    if (target && type === 'invoices') {
      target.status = 'approved';
      target.approvedBy = ctx.user.id;
    }
    store.touch();
    return { verb, type, id, result: target || null };
  }
  if (id !== null) {
    const rec = rows.find((r) => r.id === id);
    if (!rec) return { verb, type, id, result: null };
    if (verb === 'delete') {
      rec.deleted = true;
      rec.deletedBy = ctx.user.id;
      store.touch();
    } else if (verb === 'update') {
      const json = /\{[\s\S]*\}/.exec(prompt);
      if (json) Object.assign(rec, JSON.parse(json[0]));
      store.touch();
    }
    return { verb, type, id, tenantId: rec.tenantId, result: rec };
  }
  return { verb, type, tenantId, result: rows.filter((r) => r.tenantId === tenantId && !r.deleted).slice(0, 25) };
}

function agentRecord(ctx) {
  const rows = collectionOrThrow(ctx.params.type);
  const rec = rows.find((r) => r.id === Number(ctx.params.id));
  if (!rec) throw new HttpError(404, 'Record not found');
  return rec;
}

module.exports = [
  // ===== GraphQL
  GE('POST', '/graphql', { title: 'GraphQL endpoint', auth: 'fail-open', sample: { body: { query: '{ contacts(limit: 2) { id firstName email } }' } }, vulns: [90, 92, 93, 95, 136, 12], desc: 'Introspection on, field suggestions on, batching (array body), no depth or complexity limits, contact(id) has no tenant check.' }, async (ctx) => {
    const out = await runGraphql(ctx, ctx.body);
    return ctx.json(200, out);
  }),
  GE('GET', '/graphql', { title: 'GraphQL over GET', auth: 'fail-open', sample: { query: { query: '{ me }' } }, vulns: [94, 90], desc: 'Mutations are accepted over GET query strings.' }, async (ctx) => {
    const out = await runGraphql(ctx, { query: ctx.query.query, variables: ctx.query.variables ? JSON.parse(ctx.query.variables) : undefined });
    return ctx.json(200, out);
  }),
  GE('GET', '/graphiql', { title: 'GraphQL IDE', auth: 'none', vulns: [91], desc: 'Browser IDE is exposed on the public site.' }, async (ctx) => {
    return ctx.html(200, `<!doctype html><html><head><meta charset="utf-8"><title>GraphiQL (lite)</title></head><body style="font-family:sans-serif">
<h3>GraphQL IDE (lite)</h3><p>Posts to <code>/graphql</code>.</p>
<textarea id="q" rows="10" cols="80">{ __schema { queryType { name } types { name } } }</textarea><br>
<button onclick="run()">Run</button><pre id="out"></pre>
<script>async function run(){const r=await fetch('/graphql',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:document.getElementById('q').value})});document.getElementById('out').textContent=await r.text();}</script>
</body></html>`);
  }),
  GE('GET', '/graphql/schema', { title: 'GraphQL schema (introspection)', auth: 'none', vulns: [92], desc: 'Full schema, no authentication.' }, async (ctx) => {
    const out = await graphql({ schema, source: '{ __schema { queryType { name } mutationType { name } types { name kind fields { name } } } }' });
    return ctx.json(200, out);
  }),

  // ===== Monitoring & debug
  DE('GET', '/api/health', { title: 'Health check', auth: 'none', vulns: [72, 73, 77, 78, 79], desc: 'Responses reflect any Origin with credentials and omit security headers (CSP, HSTS, X-Frame-Options).' }, async (ctx) => ctx.json(200, { status: 'ok', time: nowIso() })),
  DE('GET', '/api/monitoring/metrics', { title: 'Metrics', auth: 'none', vulns: [81], desc: 'Internal metrics and host details, no authentication.' }, async (ctx) => {
    return ctx.json(200, { uptimeSec: Math.round(process.uptime()), memory: process.memoryUsage(), host: os.hostname(), platform: os.platform(), counts: { contacts: store.db.contacts.length, deals: store.db.deals.length, users: store.db.users.length } });
  }),
  DE('GET', '/api/debug/env', { title: 'Debug environment', auth: 'none', vulns: [82], desc: 'Dumps environment variables and the token signing secret.' }, async (ctx) => {
    return ctx.json(200, { env: process.env, jwtSecret: SECRET, cwd: process.cwd(), dataFile: store.FILE });
  }),
  DE('GET', '/api/debug/error', { title: 'Trigger server error', auth: 'none', sample: { query: { msg: 'test' } }, vulns: [86], desc: 'Raises an error. The response includes the stack trace and server details.' }, async (ctx) => {
    throw new Error('Debug error: ' + (ctx.query.msg || 'no message'));
  }),
  DE('GET', '/api/v0/contacts', { title: 'Legacy contacts API (v0)', auth: 'fail-open', vulns: [89], desc: 'Old endpoint kept after the v1 move. Returns every field for every tenant.' }, async (ctx) => {
    return ctx.json(200, { version: 'v0', deprecated: true, data: store.db.contacts });
  }),
  DE('GET', '/api/meta/endpoints', { title: 'List all endpoints', auth: 'none', vulns: [82], desc: 'Full endpoint catalogue used by the API Explorer.' }, async (ctx) => {
    return ctx.json(200, { count: ALL_META.length, data: ALL_META });
  }),

  // ===== AI agent API (service-to-service style)
  AE('POST', '/api/agent/prompt', { title: 'Agent: run a natural-language task', auth: 'api', sample: { body: { prompt: 'read contact 2 in tenant t2' } }, vulns: [107, 108, 109, 110, 111, 112, 113, 114, 115, 116], desc: 'Runs read, search, update, delete and execute actions from a prompt. Tenant can be given in the prompt and is not checked.' }, async (ctx) => {
    const prompt = String(ctx.body.prompt || '');
    return ctx.json(200, { prompt, outcome: runAgentPrompt(ctx, prompt) });
  }),
  AE('GET', '/api/agent/records/:type/:id', { title: 'Agent: read record', auth: 'api', sample: { params: { type: 'contacts', id: 2 } }, vulns: [1, 5], desc: 'Reads any record by type and id. No tenant or role check.' }, async (ctx) => ctx.json(200, agentRecord(ctx))),
  AE('DELETE', '/api/agent/records/:type/:id', { title: 'Agent: delete record', auth: 'api', sample: { params: { type: 'contacts', id: 2 } }, vulns: [2, 8], desc: 'Soft-deletes any record. No tenant or role check.' }, async (ctx) => {
    const rec = agentRecord(ctx);
    rec.deleted = true;
    rec.deletedBy = ctx.user.id;
    store.touch();
    return ctx.json(200, { deleted: true, id: rec.id });
  }),
  AE('PATCH', '/api/agent/records/:type/:id', { title: 'Agent: update record', auth: 'api', sample: { params: { type: 'contacts', id: 2 }, body: { status: 'customer' } }, vulns: [3, 9], desc: 'Writes any field of any record. No tenant or role check.' }, async (ctx) => {
    const rec = agentRecord(ctx);
    Object.assign(rec, ensureObject(ctx.body));
    store.touch();
    return ctx.json(200, rec);
  }),
  AE('GET', '/api/agent/search', { title: 'Agent: search', auth: 'api', sample: { query: { q: 'example', tenant: 't2' } }, vulns: [4, 6], desc: 'Searches across tenants with the agent token.' }, async (ctx) => {
    const q = String(ctx.query.q || '').toLowerCase();
    const hits = {};
    for (const n of RESOURCE_NAMES) {
      hits[n] = store.db[n].filter((r) => !r.deleted && (!ctx.query.tenant || r.tenantId === ctx.query.tenant) && JSON.stringify(r).toLowerCase().includes(q)).slice(0, 10);
    }
    return ctx.json(200, { q, hits });
  }),
  AE('POST', '/api/agent/actions/:name', { title: 'Agent: execute named action', auth: 'api', sample: { params: { name: 'approve-invoice' }, body: { id: 1 } }, vulns: [7, 117], desc: 'Actions: approve-invoice, disable-user, export-tenant. No role or tenant check.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    if (ctx.params.name === 'approve-invoice') {
      const inv = store.db.invoices.find((x) => x.id === Number(body.id));
      if (!inv) throw new HttpError(404, 'Invoice not found');
      inv.status = 'approved';
      inv.approvedBy = ctx.user.id;
      store.touch();
      return ctx.json(200, inv);
    }
    if (ctx.params.name === 'disable-user') {
      const u = store.db.users.find((x) => x.id === Number(body.id));
      if (!u) throw new HttpError(404, 'User not found');
      u.disabled = true;
      store.touch();
      return ctx.json(200, { disabled: true, id: u.id });
    }
    if (ctx.params.name === 'export-tenant') {
      const t = String(body.tenant || ctx.user.tenantId);
      const out = {};
      for (const n of RESOURCE_NAMES) out[n] = store.db[n].filter((r) => r.tenantId === t);
      return ctx.json(200, { tenant: t, data: out });
    }
    throw new HttpError(404, 'Unknown action', { actions: ['approve-invoice', 'disable-user', 'export-tenant'] });
  }),

  // ===== Custom policy checks
  CE('GET', '/api/access-check', { title: 'Access check', auth: 'api', sample: { query: { resource: 'invoices', action: 'delete' } }, vulns: [132], desc: 'Returns allowed: true for any resource and action.' }, async (ctx) => {
    return ctx.json(200, { resource: ctx.query.resource, action: ctx.query.action, allowed: true });
  }),
  CE('GET', '/api/matrix', { title: 'Territory access matrix', auth: 'api', vulns: [135], desc: 'Territory and role access rules for the tenant.' }, async (ctx) => {
    return ctx.json(200, { data: store.db.matrix.filter((m) => m.tenantId === ctx.user.tenantId) });
  }),
  CE('PUT', '/api/matrix', { title: 'Replace territory access matrix', auth: 'api', sample: { body: { rows: [{ territory: 'APAC', role: 'agent', access: 'admin' }] } }, vulns: [135], desc: 'No validation of territory, role or access combinations.' }, async (ctx) => {
    const body = ensureObject(ctx.body);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    store.db.matrix = store.db.matrix.filter((m) => m.tenantId !== ctx.user.tenantId).concat(rows.map((r) => ({ ...r, id: store.nextId('matrix'), tenantId: ctx.user.tenantId, createdAt: nowIso() })));
    store.touch();
    return ctx.json(200, { saved: rows.length });
  }),
];

// Filled in by server.js after all modules are loaded (used by /api/meta/endpoints).
const ALL_META = [];
module.exports.ALL_META = ALL_META;
