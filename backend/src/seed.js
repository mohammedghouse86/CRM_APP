'use strict';
// Hard-coded tenants, roles and users, plus small random sample data.
// Everything here is dummy data for a test application.

const PASSWORD = 'Demo@123';

const TENANTS = [
  { id: 't1', name: 'Northwind Logistics', slug: 'northwind', plan: 'enterprise', currency: 'USD', timezone: 'UTC', retentionDays: 365, ssoEnabled: false, apiKey: 'nw-key-3f9a1c7d' },
  { id: 't2', name: 'Contoso Health', slug: 'contoso', plan: 'professional', currency: 'EUR', timezone: 'Europe/Berlin', retentionDays: 90, ssoEnabled: true, apiKey: 'ct-key-9b2e44a0' },
  { id: 't3', name: 'Fabrikam Retail', slug: 'fabrikam', plan: 'starter', currency: 'GBP', timezone: 'Europe/London', retentionDays: 30, ssoEnabled: false, apiKey: 'fb-key-71c0de19' },
];

// Exactly three roles. Roles cannot be created through the API.
const ROLES = [
  { name: 'admin', description: 'Full access to tenant data, users and settings', permissions: ['*'] },
  { name: 'manager', description: 'Manage CRM records, approve invoices, view reports', permissions: ['crm:read', 'crm:write', 'crm:delete', 'invoice:approve', 'reports:read'] },
  { name: 'agent', description: 'Work assigned contacts, deals and tasks', permissions: ['crm:read', 'crm:write', 'tasks:write'] },
];

const USERS = [
  { id: 1, tenantId: 't1', role: 'admin', name: 'Ava Admin', email: 'ava.admin@northwind.example' },
  { id: 2, tenantId: 't1', role: 'manager', name: 'Marco Manager', email: 'marco.manager@northwind.example' },
  { id: 3, tenantId: 't1', role: 'agent', name: 'Ana Agent', email: 'ana.agent@northwind.example', legacy: true },
  { id: 4, tenantId: 't2', role: 'admin', name: 'Priya Admin', email: 'priya.admin@contoso.example' },
  { id: 5, tenantId: 't2', role: 'manager', name: 'Lukas Manager', email: 'lukas.manager@contoso.example' },
  { id: 6, tenantId: 't2', role: 'agent', name: 'Mia Agent', email: 'mia.agent@contoso.example', legacy: true },
  { id: 7, tenantId: 't3', role: 'admin', name: 'Sam Admin', email: 'sam.admin@fabrikam.example' },
  { id: 8, tenantId: 't3', role: 'manager', name: 'Noor Manager', email: 'noor.manager@fabrikam.example' },
  { id: 9, tenantId: 't3', role: 'agent', name: 'Eli Agent', email: 'eli.agent@fabrikam.example', legacy: true },
];

const PLANS = [
  { id: 'starter', price: 29, seats: 5, features: ['crm', 'reports'] },
  { id: 'professional', price: 99, seats: 25, features: ['crm', 'reports', 'webhooks', 'files'] },
  { id: 'enterprise', price: 499, seats: 500, features: ['crm', 'reports', 'webhooks', 'files', 'api', 'sso', 'audit'] },
];

const PIPELINE_STAGES = ['lead', 'qualified', 'proposal', 'won', 'lost'];

const FIRST = ['Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sofia', 'Lucas', 'Mia', 'Mason', 'Zara', 'Omar', 'Ines', 'Kenji', 'Amara', 'Hugo'];
const LAST = ['Schmidt', 'Patel', 'Garcia', 'Nilsson', 'Okafor', 'Rossi', 'Kowalski', 'Tanaka', 'Dubois', 'Haddad', 'Novak', 'Silva', 'Brown', 'Meyer'];
const COMPANY_NAMES = ['Blue Harbor Freight', 'Summit Pharma Labs', 'Greenleaf Foods', 'Atlas Components', 'Lumen Clinics', 'Orbit Retail Group', 'Cedar Analytics', 'Northgate Steel', 'Pioneer Dental', 'Vertex Parcel', 'Helix Biotech', 'Maple Outfitters', 'Iron Peak Logistics', 'Solace Care Network'];
const INDUSTRIES = ['Logistics', 'Healthcare', 'Retail', 'Manufacturing', 'Software', 'Hospitality'];
const PRODUCTS = ['Starter Bundle', 'Pro Suite', 'Analytics Add-on', 'Support Plus', 'Onboarding Pack', 'API Access', 'Data Export', 'Premium Seats', 'Training Day', 'Custom Report'];
const TASK_TITLES = ['Call back about renewal', 'Send proposal draft', 'Review contract terms', 'Schedule demo', 'Follow up on invoice', 'Update billing address', 'Prepare QBR deck', 'Collect signed NDA'];
const NOTE_BODIES = ['Customer asked about volume discounts.', 'Met on site, very interested in the pro tier.', 'Waiting for budget approval from finance.', 'Requested a sandbox environment for testing.', 'Renewal call moved to next quarter.', 'Champion left the company, find new contact.'];

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLLECTIONS = [
  'companies', 'contacts', 'deals', 'tasks', 'invoices', 'products', 'notes', 'campaigns',
  'activities', 'tags', 'notifications', 'comments', 'webhooks', 'subscriptions', 'audit', 'pipelines', 'matrix',
];

// Creates sample rows for one tenant. Ids come from db.counters so they stay unique.
function seedTenantData(db, tenantId, idx) {
  const rnd = rng(1000 + idx * 97);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const nid = (c) => (db.counters[c] = (db.counters[c] || 0) + 1);
  const tenant = TENANTS.find((t) => t.id === tenantId);
  const users = USERS.filter((u) => u.tenantId === tenantId);
  const base = Date.parse('2026-11-01T09:00:00Z');
  const ts = (offsetDays) => new Date(base + offsetDays * 86400000).toISOString();
  const meta = (owner, when) => ({
    tenantId,
    ownerId: owner.id,
    createdBy: owner.id,
    createdAt: when,
    updatedAt: when,
    updatedBy: owner.id,
    deleted: false,
    deletedAt: null,
    deletedBy: null,
  });

  const companies = [];
  for (let i = 0; i < 8; i++) {
    const owner = pick(users);
    const id = nid('companies');
    companies.push({ id, name: COMPANY_NAMES[(idx * 3 + i) % COMPANY_NAMES.length], industry: pick(INDUSTRIES), website: `https://www.company${id}.example`, size: pick(['1-10', '11-50', '51-200', '201-1000']), annualRevenue: int(200, 90000) * 1000, taxId: 'TX-' + int(10000000, 99999999), ...meta(owner, ts(-int(10, 300))) });
  }
  const contacts = [];
  for (let i = 0; i < 20; i++) {
    const owner = pick(users);
    const fn = pick(FIRST), ln = pick(LAST);
    const id = nid('contacts');
    contacts.push({ id, firstName: fn, lastName: ln, email: `${fn}.${ln}${id}@client${id}.example`.toLowerCase(), phone: `+1-555-${int(1000, 9999)}`, title: pick(['CTO', 'Buyer', 'Ops Lead', 'Finance Manager']), status: pick(['lead', 'customer', 'customer', 'churned']), companyId: pick(companies).id, nationalId: `NID-${int(100000, 999999)}`, internalNotes: pick(['Prefers email', 'Credit limit 5000', 'Do not call after 6pm', 'Board member']), ...meta(owner, ts(-int(5, 200))) });
  }
  const deals = [];
  for (let i = 0; i < 12; i++) {
    const owner = pick(users);
    const company = pick(companies);
    const id = nid('deals');
    deals.push({ id, title: `${company.name} - ${pick(PRODUCTS)}`, companyId: company.id, contactId: pick(contacts).id, amount: int(1, 300) * 500, currency: tenant.currency, stage: pick(PIPELINE_STAGES), probability: pick([10, 25, 50, 75, 90]), priority: pick(['low', 'normal', 'high']), closeDate: ts(int(3, 90)).slice(0, 10), closed: false, ...meta(owner, ts(-int(1, 120))) });
  }
  const tasks = [];
  for (let i = 0; i < 15; i++) {
    const owner = pick(users);
    const id = nid('tasks');
    tasks.push({ id, title: pick(TASK_TITLES), dealId: pick(deals).id, assigneeId: owner.id, dueDate: ts(int(-5, 20)).slice(0, 10), priority: pick(['low', 'normal', 'high']), slaHours: pick([4, 24, 72]), status: pick(['open', 'open', 'done']), ...meta(owner, ts(-int(1, 60))) });
  }
  const invoices = [];
  for (let i = 0; i < 10; i++) {
    const owner = pick(users);
    const id = nid('invoices');
    const amount = int(5, 400) * 100;
    invoices.push({ id, number: `INV-${tenantId.toUpperCase()}-${1000 + id}`, customerId: pick(companies).id, amount, tax: Math.round(amount * 0.2), balance: amount, status: pick(['draft', 'sent', 'paid']), dueDate: ts(int(-20, 40)).slice(0, 10), approvedBy: null, ...meta(owner, ts(-int(1, 90))) });
  }
  const products = [];
  for (let i = 0; i < 10; i++) {
    const owner = pick(users);
    const id = nid('products');
    products.push({ id, sku: `SKU-${tenant.slug.toUpperCase()}-${100 + i}`, name: PRODUCTS[i], category: pick(['software', 'services', 'hardware']), price: int(10, 900), currency: tenant.currency, discountPct: pick([0, 5, 10]), stock: int(0, 200), active: true, ...meta(owner, ts(-int(1, 200))) });
  }
  const notes = [];
  for (let i = 0; i < 8; i++) {
    const owner = pick(users);
    const id = nid('notes');
    notes.push({ id, body: pick(NOTE_BODIES), dealId: pick(deals).id, visibility: pick(['private', 'team']), ...meta(owner, ts(-int(1, 60))) });
  }
  const campaigns = [];
  for (let i = 0; i < 4; i++) {
    const owner = pick(users);
    const id = nid('campaigns');
    campaigns.push({ id, name: `Campaign ${id} - ${pick(['Autumn', 'Winter', 'Renewal', 'Upsell'])}`, status: pick(['draft', 'scheduled', 'sent']), quota: 500, sent: 0, audienceCount: int(20, 400), ...meta(owner, ts(-int(1, 30))) });
  }
  const activities = [];
  for (let i = 0; i < 10; i++) {
    const owner = pick(users);
    activities.push({ id: nid('activities'), type: pick(['call', 'email', 'meeting']), subjectId: pick(contacts).id, summary: pick(NOTE_BODIES), ...meta(owner, ts(-int(1, 40))) });
  }
  const tags = ['vip', 'renewal', 'at-risk', 'enterprise', 'trial'].map((name) => ({ id: nid('tags'), name, tenantId, ownerId: users[0].id, createdBy: users[0].id, createdAt: ts(-30), deleted: false }));
  const notifications = [];
  for (let i = 0; i < 6; i++) {
    const u = pick(users);
    notifications.push({ id: nid('notifications'), userId: u.id, tenantId, text: pick(TASK_TITLES), read: rnd() > 0.5, createdAt: ts(-int(0, 10)), deleted: false, ownerId: u.id, createdBy: u.id, updatedAt: ts(0), updatedBy: u.id, deletedAt: null, deletedBy: null });
  }
  const comments = [];
  for (let i = 0; i < 6; i++) {
    const owner = pick(users);
    comments.push({ id: nid('comments'), taskId: pick(tasks).id, text: pick(NOTE_BODIES), ...meta(owner, ts(-int(0, 20))) });
  }
  const webhooks = [];
  for (let i = 0; i < 2; i++) {
    const owner = users[0];
    webhooks.push({ id: nid('webhooks'), url: `https://hooks.example.com/${tenant.slug}/${i + 1}`, events: ['deal.won', 'invoice.paid'], secret: 'whsec_' + int(100000, 999999), ...meta(owner, ts(-10)) });
  }
  const plan = PLANS.find((p) => p.id === tenant.plan);
  const expired = tenantId === 't3';
  const subscriptions = [{ id: nid('subscriptions'), plan: plan.id, seats: plan.seats, quota: 1000, startsAt: ts(-200).slice(0, 10), expiresAt: expired ? ts(-5).slice(0, 10) : ts(160).slice(0, 10), ...meta(users[0], ts(-200)) }];
  const audit = [];
  for (let i = 0; i < 10; i++) {
    const u = pick(users);
    audit.push({ id: nid('audit'), action: pick(['contact.update', 'deal.create', 'invoice.approve', 'user.login']), actorId: u.id, targetType: 'record', targetId: int(1, 50), requestId: 'req-' + int(100000, 999999), ...meta(u, ts(-int(0, 30))) });
  }
  const pipelines = [{ id: nid('pipelines'), name: 'Default sales', stages: PIPELINE_STAGES, ...meta(users[0], ts(-200)) }];
  const matrix = [{ id: nid('matrix'), territory: 'EMEA', role: 'agent', access: 'read', ...meta(users[0], ts(-100)) }];

  const bucket = { companies, contacts, deals, tasks, invoices, products, notes, campaigns, activities, tags, notifications, comments, webhooks, subscriptions, audit, pipelines, matrix };
  for (const key of COLLECTIONS) db[key].push(...bucket[key]);
}

function emptyDb() {
  const db = { tenants: [], users: [], roles: ROLES, plans: PLANS, sessions: [], revoked: [], files: [], orders: [], counters: {} };
  for (const key of COLLECTIONS) db[key] = [];
  return db;
}

function buildSeed() {
  const db = emptyDb();
  db.tenants = TENANTS.map((t) => ({ ...t, createdAt: '2026-01-15T00:00:00Z' }));
  db.users = USERS.map((u) => ({ ...u, password: PASSWORD, disabled: false, verified: true, createdAt: '2026-01-15T00:00:00Z' }));
  TENANTS.forEach((t, idx) => seedTenantData(db, t.id, idx));
  return db;
}

function reseedTenantData(db, tenantId) {
  for (const key of COLLECTIONS) db[key] = db[key].filter((r) => r.tenantId !== tenantId);
  const idx = TENANTS.findIndex((t) => t.id === tenantId);
  seedTenantData(db, tenantId, idx);
}

module.exports = { buildSeed, reseedTenantData, TENANTS, ROLES, USERS, PLANS, PASSWORD, PIPELINE_STAGES };
