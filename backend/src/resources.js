'use strict';
// Generic CRUD for CRM collections. Each resource has a small config; the
// generic handlers below carry the write-side and read-side weaknesses that the
// vulnerability map references (mass assignment, attribution spoofing, tenant
// boundary moves, soft-delete state writes, and so on).
const store = require('./store');
const { HttpError } = require('./http');

const RESOURCES = {
  contacts: { label: 'Contact', required: ['firstName', 'email'], deleteRoles: ['admin', 'manager'], xtenantGet: true },
  companies: { label: 'Company', required: ['name'], deleteRoles: ['admin', 'manager'], xtenantGet: true },
  deals: { label: 'Deal', required: ['title', 'amount'], writeRoles: ['admin', 'manager'], deleteRoles: ['admin', 'manager', 'agent'], agentSeesAll: true },
  tasks: { label: 'Task', required: ['title'], deleteRoles: ['admin', 'manager'] },
  invoices: { label: 'Invoice', required: ['amount'], deleteRoles: ['admin', 'manager'], xtenantGet: true },
  products: { label: 'Product', required: ['name', 'price'], deleteRoles: ['admin', 'manager'] },
  notes: { label: 'Note', required: ['body'], deleteRoles: ['admin', 'manager', 'agent'] },
  campaigns: { label: 'Campaign', required: ['name'], deleteRoles: ['admin', 'manager'] },
  activities: { label: 'Activity', required: ['type'], deleteRoles: ['admin', 'manager'] },
  tags: { label: 'Tag', required: ['name'], deleteRoles: ['admin', 'manager'] },
  notifications: { label: 'Notification', required: ['text'], deleteRoles: ['admin', 'manager'] },
};

const nowIso = () => new Date().toISOString();

function ensureObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  return body;
}

function visibleRows(ctx, name, cfg, includeAll) {
  const user = ctx.user;
  let rows = store.db[name].filter((r) => !r.deleted);
  if (!includeAll) rows = rows.filter((r) => r.tenantId === user.tenantId);
  if (user.role === 'agent' && !cfg.agentSeesAll && !includeAll) {
    rows = rows.filter((r) => r.ownerId === user.id);
  }
  return rows;
}

function findForWrite(ctx, name, cfg) {
  const id = Number(ctx.params.id);
  const rec = store.db[name].find((r) => r.id === id && !r.deleted);
  if (!rec || rec.tenantId !== ctx.user.tenantId) {
    throw new HttpError(404, `${cfg.label} ${ctx.params.id} not found`);
  }
  return rec;
}

function makeHandlers(name) {
  const cfg = RESOURCES[name];
  const col = () => store.db[name];

  async function list(ctx) {
    // ?scope=all widens the query to every tenant (query-parameter toggle)
    const includeAll = ctx.query.scope === 'all';
    let rows = visibleRows(ctx, name, cfg, includeAll);
    if (ctx.query.q) {
      const q = String(ctx.query.q).toLowerCase();
      rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }
    // No upper bound on limit (broken pagination limit)
    const limit = Number(ctx.query.limit) || 25;
    const offset = Number(ctx.query.offset) || 0;
    return ctx.json(200, { resource: name, total: rows.length, limit, offset, data: rows.slice(offset, offset + limit) });
  }

  async function getOne(ctx) {
    const id = Number(ctx.params.id);
    const rec = col().find((r) => r.id === id && !r.deleted);
    if (!rec) throw new HttpError(404, `${cfg.label} ${ctx.params.id} not found`, { resource: name });
    // Tenant check is skipped for resources flagged xtenantGet (cross-tenant object access)
    if (!cfg.xtenantGet && rec.tenantId !== ctx.user.tenantId) {
      throw new HttpError(404, `${cfg.label} ${ctx.params.id} not found`);
    }
    return ctx.json(200, rec);
  }

  async function create(ctx) {
    const body = ensureObject(ctx.body);
    const missing = cfg.required.filter((f) => body[f] === undefined || body[f] === '');
    if (missing.length) throw new HttpError(400, 'Missing required fields', { missing });
    const now = nowIso();
    const rec = {
      ...body, // mass assignment: every submitted field is stored
      id: store.nextId(name),
      tenantId: body.tenantId || ctx.user.tenantId, // tenant boundary taken from body
      ownerId: body.ownerId ?? ctx.user.id, // ownership can be set by the client
      createdBy: body.createdBy ?? ctx.user.id, // attribution can be spoofed
      createdAt: body.createdAt ?? now, // creation timestamp can be injected
      updatedAt: now,
      updatedBy: ctx.user.id,
      deleted: false,
      deletedAt: null,
      deletedBy: null,
    };
    col().push(rec);
    store.touch();
    return ctx.json(201, rec);
  }

  async function patch(ctx, { skipRoleCheck = false } = {}) {
    const rec = findForWrite(ctx, name, cfg);
    if (!skipRoleCheck && cfg.writeRoles && !cfg.writeRoles.includes(ctx.user.role)) {
      throw new HttpError(403, `Role '${ctx.user.role}' cannot modify ${cfg.label.toLowerCase()} records`, { requiredRoles: cfg.writeRoles });
    }
    const body = ensureObject(ctx.body);
    // If-Match is read by well-behaved clients but never enforced (no concurrency control)
    Object.assign(rec, body); // mass assignment: id, tenantId, ownerId, deleted, price, stock, stage ...
    rec.updatedAt = body.updatedAt ?? nowIso(); // modification timestamp can be forged
    rec.updatedBy = body.updatedBy ?? ctx.user.id; // modification attribution can be forged
    store.touch();
    return ctx.json(200, rec);
  }

  async function del(ctx) {
    const rec = findForWrite(ctx, name, cfg);
    if (!cfg.deleteRoles.includes(ctx.user.role)) {
      throw new HttpError(403, `Role '${ctx.user.role}' cannot delete ${cfg.label.toLowerCase()} records`, { requiredRoles: cfg.deleteRoles });
    }
    const body = ctx.body && typeof ctx.body === 'object' ? ctx.body : {};
    if (ctx.query.hard === '1') {
      store.db[name] = col().filter((r) => r.id !== rec.id);
      store.touch();
      return ctx.json(200, { deleted: true, hard: true, id: rec.id });
    }
    rec.deleted = true; // soft delete
    rec.deletedAt = nowIso();
    rec.deletedBy = body.deletedBy ?? ctx.user.id; // deletion attribution can be spoofed
    store.touch();
    return ctx.json(200, { deleted: true, id: rec.id, record: rec });
  }

  return { list, getOne, create, patch, put: (ctx) => patch(ctx, { skipRoleCheck: true }), del };
}

// Filters a list of rows with a tiny Mongo-style filter: {field: value} or {field: {$op: value}}
function matchesFilter(row, filter) {
  return Object.entries(filter).every(([field, cond]) => {
    const v = row[field];
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      return Object.entries(cond).every(([op, arg]) => {
        if (op === '$ne') return v !== arg;
        if (op === '$gt') return v > arg;
        if (op === '$lt') return v < arg;
        if (op === '$in') return Array.isArray(arg) && arg.includes(v);
        if (op === '$regex') return new RegExp(String(arg), 'i').test(String(v ?? ''));
        throw new HttpError(400, `MongoError: unknown operator: ${op}`, { operator: op });
      });
    }
    return v === cond;
  });
}

module.exports = { RESOURCES, makeHandlers, ensureObject, findForWrite, matchesFilter, nowIso, visibleRows };
