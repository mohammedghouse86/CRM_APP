/* Sample CRM front end. Plain JavaScript, no build step.
   Dummy app for testing. Intentional weaknesses live in the backend (and some in this UI,
   for example notes are rendered as HTML). */
(function () {
  'use strict';

  // ---------- helpers
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };
  const apiBase = () => (store.get('crm.apiBase') || (window.CRM_CONFIG && window.CRM_CONFIG.apiBase) || 'http://localhost:3000').replace(/\/$/, '');
  const getToken = () => store.get('crm.token');
  const getUser = () => { try { return JSON.parse(store.get('crm.user') || 'null'); } catch (e) { return null; } };

  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'on') for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
        else if (k === 'html') node.innerHTML = v; // used only where raw HTML display is intended
        else if (k === 'value') node.value = v;
        else node.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }
  const $ = (s, r = document) => r.querySelector(s);
  const pretty = (d) => (typeof d === 'string' ? d : JSON.stringify(d, null, 2));
  function table(headers, rowNodes) {
    return h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, headers.map((c) => h('th', null, c)))),
      h('tbody', null, rowNodes.length ? rowNodes : h('tr', null, h('td', { colspan: headers.length }, 'No rows')))));
  }
  function tr(cells) {
    return h('tr', null, cells.map((c) => h('td', null, c)));
  }

  async function api(method, path, opts = {}) {
    const url = new URL(path, apiBase() + '/');
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) if (v !== undefined && v !== '' && v !== null) url.searchParams.set(k, v);
    }
    const headers = { ...(opts.headers || {}) };
    const t = getToken();
    if (t && opts.auth !== false) headers.authorization = 'Bearer ' + t;
    let body;
    if (opts.body !== undefined) {
      headers['content-type'] = 'application/json';
      body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }
    try {
      const r = await fetch(url.toString(), { method, headers, body, redirect: 'manual' });
      const text = await r.text();
      let data = text;
      try { data = JSON.parse(text); } catch (e) { /* not JSON */ }
      return { ok: r.ok, status: r.status, data, url: url.toString(), headers: r.headers };
    } catch (e) {
      return { ok: false, status: 0, data: { error: 'Network error: ' + e.message + ' (is the API running at ' + apiBase() + '?)' }, url: url.toString() };
    }
  }

  function resultBox(res) {
    return h('div', null,
      h('p', { class: res.ok ? 'ok' : 'err' }, `HTTP ${res.status || 'error'} from ${res.url || ''}`),
      h('pre', null, pretty(res.data))
    );
  }

  // ---------- modal
  function openModal(title, content) {
    $('#modal-title').textContent = title;
    const body = $('#modal-body');
    body.innerHTML = '';
    body.appendChild(content);
    $('#modal').classList.remove('hidden');
  }
  function closeModal() { $('#modal').classList.add('hidden'); }
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  function jsonEditor(initial, onSubmit, submitLabel) {
    const ta = h('textarea', { spellcheck: 'false' });
    ta.value = pretty(initial || {});
    const out = h('div');
    const btn = h('button', { class: 'btn primary', type: 'button', on: { click: async () => {
      let parsed;
      try { parsed = JSON.parse(ta.value); } catch (e) { out.replaceChildren(h('p', { class: 'err' }, 'Invalid JSON: ' + e.message)); return; }
      out.replaceChildren(h('p', { class: 'muted' }, 'Sending...'));
      const res = await onSubmit(parsed);
      out.replaceChildren(resultBox(res));
    } } }, submitLabel || 'Send');
    return h('div', null, ta, h('div', { class: 'row' }, btn), out);
  }

  // ---------- session
  const DEMO_USERS = [
    { email: 'ava.admin@northwind.example', name: 'Ava Admin', tenant: 'Northwind Logistics', role: 'admin' },
    { email: 'marco.manager@northwind.example', name: 'Marco Manager', tenant: 'Northwind Logistics', role: 'manager' },
    { email: 'ana.agent@northwind.example', name: 'Ana Agent', tenant: 'Northwind Logistics', role: 'agent' },
    { email: 'priya.admin@contoso.example', name: 'Priya Admin', tenant: 'Contoso Health', role: 'admin' },
    { email: 'lukas.manager@contoso.example', name: 'Lukas Manager', tenant: 'Contoso Health', role: 'manager' },
    { email: 'mia.agent@contoso.example', name: 'Mia Agent', tenant: 'Contoso Health', role: 'agent' },
    { email: 'sam.admin@fabrikam.example', name: 'Sam Admin', tenant: 'Fabrikam Retail', role: 'admin' },
    { email: 'noor.manager@fabrikam.example', name: 'Noor Manager', tenant: 'Fabrikam Retail', role: 'manager' },
    { email: 'eli.agent@fabrikam.example', name: 'Eli Agent', tenant: 'Fabrikam Retail', role: 'agent' },
  ];
  const DEMO_PASSWORD = 'Demo@123';

  async function login(email, password) {
    const res = await api('POST', '/api/auth/login', { body: { email, password }, auth: false });
    if (res.ok && res.data && res.data.token) {
      store.set('crm.token', res.data.token);
      store.set('crm.user', JSON.stringify(res.data.user));
    }
    return res;
  }
  function logoutLocal() { store.del('crm.token'); store.del('crm.user'); }

  // ---------- navigation
  const NAV = [
    ['#/dashboard', 'Dashboard'], ['#/res/contacts', 'Contacts'], ['#/res/companies', 'Companies'], ['#/res/deals', 'Deals'],
    ['#/res/tasks', 'Tasks'], ['#/res/invoices', 'Invoices'], ['#/res/products', 'Products'], ['#/res/notes', 'Notes'],
    ['#/res/campaigns', 'Campaigns'], ['#/search', 'Search'], ['#/files', 'Files'], ['#/webhooks', 'Webhooks'],
    ['#/billing', 'Billing'], ['#/audit', 'Audit'], ['#/reports', 'Reports'], ['#/tools', 'Tools'], ['#/graphql', 'GraphQL'],
    ['#/agent', 'AI agent'], ['#/admin', 'Admin'], ['#/monitor', 'Monitoring'], ['#/account', 'Account'], ['#/explorer', 'API Explorer'],
  ];
  // Menu visibility by role. Hidden items still open by typing the URL (the router does not check roles).
  const NAV_ROLES = { '#/admin': ['admin'], '#/audit': ['admin', 'manager'], '#/billing': ['admin', 'manager'] };
  function renderNav(route) {
    const nav = $('#nav');
    nav.innerHTML = '';
    if (!getToken()) return;
    const role = (getUser() || {}).role;
    for (const [href, label] of NAV) {
      if (NAV_ROLES[href] && !NAV_ROLES[href].includes(role)) continue;
      nav.appendChild(h('a', { href, class: route === href.slice(1) || (href === '#/dashboard' && route === '') ? 'active' : '' }, label));
    }
  }
  function renderWho() {
    const u = getUser();
    const who = $('#who');
    who.innerHTML = '';
    if (!u || !getToken()) return;
    who.appendChild(h('span', null, `${u.name} · ${u.role} · tenant ${u.tenantId}  `));
    who.appendChild(h('button', { class: 'btn ghost', type: 'button', on: { click: async () => { await api('POST', '/api/auth/logout'); logoutLocal(); location.hash = '#/login'; } } }, 'Sign out'));
  }

  // ---------- views
  const view = () => $('#view');
  const setView = (...nodes) => { view().replaceChildren(...nodes.flat()); };
  const DISCLAIMER = h('div', { class: 'note' }, 'Dummy sample app. Data resets on redeploy. Roles are fixed (admin, manager, agent). Role creation is not available in this app.');

  function loginView() {
    const cards = DEMO_USERS.map((u) => h('button', { class: 'card', type: 'button', on: { click: async () => {
      const r = await login(u.email, DEMO_PASSWORD);
      if (r.ok) location.hash = '#/dashboard'; else alert('Login failed: ' + (r.data && r.data.error));
    } } }, h('b', null, u.name), h('span', { class: 'muted' }, `${u.tenant} · ${u.role}`), h('span', { class: 'muted' }, u.email)));
    const emailIn = h('input', { class: 'wide', type: 'email', value: 'ana.agent@northwind.example' });
    const pwIn = h('input', { class: 'wide', type: 'password', value: DEMO_PASSWORD });
    const out = h('div');
    const form = h('form', { on: { submit: async (e) => {
      e.preventDefault();
      const r = await login(emailIn.value, pwIn.value);
      if (r.ok) location.hash = '#/dashboard';
      else out.replaceChildren(h('p', { class: 'err' }, (r.data && r.data.error) || 'Login failed'));
    } } }, h('div', { class: 'row' }, emailIn, pwIn, h('button', { class: 'btn primary', type: 'submit' }, 'Sign in')), out);
    setView(
      h('h1', null, 'Sign in'),
      DISCLAIMER,
      h('div', { class: 'panel' }, h('p', null, 'Demo password for all accounts: ', h('code', null, DEMO_PASSWORD)), form),
      h('h2', null, 'Quick sign-in'),
      h('div', { class: 'cards' }, cards),
      h('p', { class: 'muted' }, 'Tenants: Northwind Logistics (t1), Contoso Health (t2), Fabrikam Retail (t3). Each has one admin, one manager and one agent.')
    );
  }

  async function dashboardView() {
    const u = getUser();
    const [kpis, tenants] = await Promise.all([api('GET', '/api/dashboard/kpis'), api('GET', '/api/tenants')]);
    const t = tenants.data && tenants.data.data ? tenants.data.data.find((x) => x.id === u.tenantId) : null;
    const k = kpis.data || {};
    setView(
      h('h1', null, `Dashboard · ${t ? t.name : u.tenantId}`),
      DISCLAIMER,
      h('div', { class: 'grid' },
        kpi('Open deals', k.openDeals), kpi('Pipeline value', k.pipelineValue), kpi('Overdue tasks', k.overdueTasks), kpi('Outstanding balance', k.outstandingBalance)),
      h('h2', null, 'Your role'),
      h('div', { class: 'panel' }, h('p', null, `Signed in as ${u.name} (${u.role}).`), h('p', { class: 'muted' }, 'Roles are fixed in this app. You cannot create new roles.'))
    );
  }
  const kpi = (label, value) => h('div', { class: 'kpi' }, h('div', { class: 'v' }, value === undefined ? '–' : String(value)), h('div', { class: 'l' }, label));

  // ---------- generic CRM resources
  const RES = {
    contacts: { title: 'Contacts', cols: ['id', 'firstName', 'lastName', 'email', 'status', 'companyId', 'ownerId'],
      actions: [
        { label: 'Archive', method: 'POST', path: (id) => `/api/contacts/${id}/archive` },
        { label: 'Timeline', method: 'GET', path: (id) => `/api/contacts/${id}/timeline` },
      ],
      extras: [
        { label: 'Search all tenants', run: () => searchPrompt('Contacts search (all tenants)', '/api/contacts/search') },
        { label: 'Export CSV', run: () => downloadCsv('/api/contacts/export', 'contacts.csv') },
        { label: 'Import CSV', run: () => openModal('Import contacts', jsonEditor({ csv: 'firstName,lastName,email\nNew,Person,new.person@client.example' }, (b) => api('POST', '/api/contacts/import', { body: b }), 'Import')) },
      ] },
    companies: { title: 'Companies', cols: ['id', 'name', 'industry', 'size', 'annualRevenue'],
      actions: [{ label: 'Contacts', method: 'GET', path: (id) => `/api/companies/${id}/contacts` }] },
    deals: { title: 'Deals', cols: ['id', 'title', 'amount', 'currency', 'stage', 'probability', 'closeDate'],
      actions: [
        { label: 'Move stage', method: 'POST', path: (id) => `/api/deals/${id}/stage`, prompt: 'New stage (lead, qualified, proposal, won, lost)', body: (v) => ({ stage: v }) },
        { label: 'Transfer', method: 'POST', path: (id) => `/api/deals/${id}/transfer`, prompt: 'New owner user id', body: (v) => ({ ownerId: Number(v) }) },
      ] },
    tasks: { title: 'Tasks', cols: ['id', 'title', 'dueDate', 'priority', 'status', 'assigneeId'],
      actions: [
        { label: 'Complete', method: 'POST', path: (id) => `/api/tasks/${id}/complete` },
        { label: 'Comments', method: 'GET', path: (id) => `/api/tasks/${id}/comments` },
        { label: 'Add comment', method: 'POST', path: (id) => `/api/tasks/${id}/comments`, prompt: 'Comment text', body: (v) => ({ text: v }) },
      ] },
    invoices: { title: 'Invoices', cols: ['id', 'number', 'amount', 'balance', 'status', 'dueDate'],
      actions: [
        { label: 'Pay', method: 'POST', path: (id) => `/api/invoices/${id}/pay`, prompt: 'Amount to pay', body: (v) => ({ amount: Number(v) }) },
        { label: 'Approve', method: 'POST', path: (id) => `/api/invoices/${id}/approve` },
      ] },
    products: { title: 'Products', cols: ['id', 'sku', 'name', 'price', 'currency', 'discountPct', 'stock'],
      actions: [{ label: 'Adjust stock', method: 'POST', path: (id) => `/api/products/${id}/adjust-stock`, prompt: 'Stock change (use a negative number to reduce)', body: (v) => ({ delta: Number(v) }) }] },
    notes: { title: 'Notes', cols: ['id', 'body', 'visibility', 'dealId'], htmlCol: 'body',
      actions: [],
      extras: [{ label: 'Notes feed', run: () => showRaw('Notes feed', api('GET', '/api/notes/feed')) }] },
    campaigns: { title: 'Campaigns', cols: ['id', 'name', 'status', 'quota', 'sent'],
      actions: [{ label: 'Send', method: 'POST', path: (id) => `/api/campaigns/${id}/send`, prompt: 'How many messages to send', body: (v) => ({ count: Number(v) }) }] },
  };

  const listState = { q: '', scope: '', offset: 0, limit: 25 };

  async function resourceView(name) {
    const cfg = RES[name];
    if (!cfg) { setView(h('p', null, 'Unknown resource')); return; }
    const res = await api('GET', `/api/${name}`, { query: { q: listState.q, scope: listState.scope, offset: listState.offset, limit: listState.limit } });
    const rows = (res.data && res.data.data) || [];
    const qIn = h('input', { class: 'wide', placeholder: 'Search', value: listState.q });
    const scopeBtn = h('button', { class: 'btn', type: 'button', on: { click: () => { listState.scope = listState.scope ? '' : 'all'; listState.offset = 0; render(); } } }, listState.scope ? 'Showing all tenants (scope=all) — click to reset' : 'Show all tenants (scope=all)');
    const toolbar = h('div', { class: 'row' },
      h('form', { on: { submit: (e) => { e.preventDefault(); listState.q = qIn.value; listState.offset = 0; render(); } } }, qIn, h('button', { class: 'btn', type: 'submit' }, 'Search')),
      h('button', { class: 'btn primary', type: 'button', on: { click: () => openModal(`New ${cfg.title.slice(0, -1).toLowerCase()}`, jsonEditor(sampleFor(name), async (b) => { const r = await api('POST', `/api/${name}`, { body: b }); if (r.ok) render(); return r; }, 'Create')) } }, 'New'),
      scopeBtn,
      h('button', { class: 'btn', type: 'button', on: { click: () => { listState.offset = Math.max(0, listState.offset - listState.limit); render(); } } }, 'Prev'),
      h('button', { class: 'btn', type: 'button', on: { click: () => { listState.offset += listState.limit; render(); } } }, 'Next'),
      h('span', { class: 'muted' }, `offset ${listState.offset}, total ${res.data && res.data.total !== undefined ? res.data.total : '?'}`)
    );
    const extras = (cfg.extras || []).map((x) => h('button', { class: 'btn', type: 'button', on: { click: x.run } }, x.label));
    const head = h('tr', null, cfg.cols.map((c) => h('th', null, c)), h('th', null, 'actions'));
    const body = rows.map((r) => h('tr', null,
      cfg.cols.map((c) => h('td', null, c === cfg.htmlCol ? h('span', { html: String(r[c] ?? '') }) : (r[c] === null || r[c] === undefined ? '' : (typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c]))))),
      h('td', null, h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', on: { click: () => openModal(`Edit ${name} #${r.id}`, jsonEditor(r, async (b) => { const x = await api('PATCH', `/api/${name}/${r.id}`, { body: b }); if (x.ok) render(); return x; }, 'Save')) } }, 'Edit'),
        h('button', { class: 'btn danger', type: 'button', on: { click: async () => { if (!confirm(`Delete ${name} #${r.id}?`)) return; const x = await api('DELETE', `/api/${name}/${r.id}`); showRaw(`Delete ${name} #${r.id}`, Promise.resolve(x)); render(); } } }, 'Delete'),
        (cfg.actions || []).map((a) => h('button', { class: 'btn', type: 'button', on: { click: () => runAction(a, r.id) } }, a.label))
      ))
    ));
    setView(
      h('h1', null, cfg.title),
      DISCLAIMER,
      toolbar,
      extras.length ? h('div', { class: 'row' }, extras) : null,
      h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, head), h('tbody', null, body.length ? body : h('tr', null, h('td', { colspan: cfg.cols.length + 1 }, 'No rows')))))
    );
  }

  function sampleFor(name) {
    const s = {
      contacts: { firstName: 'Test', lastName: 'Person', email: 'test.person@client.example', phone: '+1-555-0100', status: 'lead' },
      companies: { name: 'Test Company Ltd', industry: 'Software' },
      deals: { title: 'New renewal', amount: 12000, stage: 'lead' },
      tasks: { title: 'Call the client', priority: 'high' },
      invoices: { amount: 2500, status: 'draft' },
      products: { name: 'Sample product', price: 99, stock: 10 },
      notes: { body: 'Follow up next week', visibility: 'team' },
      campaigns: { name: 'Winter promo', quota: 500 },
    };
    return s[name] || {};
  }

  async function runAction(a, id) {
    let body;
    if (a.prompt) {
      const v = window.prompt(a.prompt);
      if (v === null) return;
      body = a.body ? a.body(v) : undefined;
    }
    const res = await api(a.method, a.path(id), { body });
    if (res.ok && a.method !== 'GET') render();
    showRaw(`${a.label} #${id}`, Promise.resolve(res));
  }

  function showRaw(title, promise) {
    openModal(title, h('div', null, h('p', { class: 'muted' }, 'Working...')));
    promise.then((res) => { $('#modal-body').replaceChildren(resultBox(res)); });
  }

  function searchPrompt(title, path) {
    const qIn = h('input', { class: 'wide', placeholder: 'text to search' });
    const go = async () => {
      const res = await api('GET', path, { query: { q: qIn.value } });
      $('#modal-body').replaceChildren(h('form', { on: { submit: (e) => e.preventDefault() } }, qIn), resultBox(res));
    };
    qIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    openModal(title, h('div', null, h('div', { class: 'row' }, qIn, h('button', { class: 'btn primary', type: 'button', on: { click: go } }, 'Search')), h('div', { id: 'search-out' })));
  }

  async function downloadCsv(path, filename) {
    const url = new URL(path, apiBase() + '/');
    const r = await fetch(url, { headers: { authorization: 'Bearer ' + getToken() } });
    const blob = await r.blob();
    const a = h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---------- Search
  function searchView() {
    const qIn = h('input', { class: 'wide', placeholder: 'search text' });
    const allChk = h('input', { type: 'checkbox' });
    const out = h('div');
    const globalForm = h('form', { on: { submit: async (e) => { e.preventDefault(); out.replaceChildren(h('p', { class: 'muted' }, 'Searching...')); out.replaceChildren(resultBox(await api('GET', '/api/search', { query: { q: qIn.value, all: allChk.checked ? '1' : '' } }))); } } },
      h('div', { class: 'row' }, qIn, h('label', null, allChk, ' all tenants'), h('button', { class: 'btn primary', type: 'submit' }, 'Search')));
    const echoIn = h('input', { class: 'wide', placeholder: 'text to echo' });
    const echoOut = h('div');
    const echoBtn = h('button', { class: 'btn', type: 'button', on: { click: async () => {
      const r = await fetch(new URL('/api/search/echo?q=' + encodeURIComponent(echoIn.value), apiBase() + '/'));
      echoOut.replaceChildren(h('p', { class: 'muted' }, 'Rendered response:'), h('div', { class: 'panel', html: await r.text() }));
    } } }, 'Echo');
    const filterIn = h('textarea', { spellcheck: 'false' }); filterIn.value = '{"status": "customer"}';
    const filterOut = h('div');
    const filterBtn = h('button', { class: 'btn', type: 'button', on: { click: async () => {
      let f; try { f = JSON.parse(filterIn.value); } catch (e) { filterOut.replaceChildren(h('p', { class: 'err' }, 'Invalid JSON')); return; }
      filterOut.replaceChildren(resultBox(await api('POST', '/api/search/query', { body: { filter: f } })));
    } } }, 'Run filter');
    const sqlIn = h('input', { class: 'wide', placeholder: 'deal title contains' });
    const sqlOut = h('div');
    const sqlBtn = h('button', { class: 'btn', type: 'button', on: { click: async () => sqlOut.replaceChildren(resultBox(await api('GET', '/api/reports/sql', { query: { where: sqlIn.value } }))) } }, 'Search deals');
    setView(
      h('h1', null, 'Search'), DISCLAIMER,
      h('div', { class: 'panel' }, h('h2', null, 'Global search'), globalForm, out),
      h('div', { class: 'panel' }, h('h2', null, 'Echo page'), h('div', { class: 'row' }, echoIn, echoBtn), echoOut),
      h('div', { class: 'panel' }, h('h2', null, 'Structured filter'), filterIn, h('div', { class: 'row' }, filterBtn), filterOut),
      h('div', { class: 'panel' }, h('h2', null, 'Deal search by title'), h('div', { class: 'row' }, sqlIn, sqlBtn), sqlOut)
    );
  }

  // ---------- Files
  function filesView() {
    const out = h('div');
    const listDiv = h('div');
    const refresh = async () => {
      const r = await api('GET', '/api/files');
      const rows = (r.data && r.data.data) || [];
      listDiv.replaceChildren(table(['id', 'name', 'type', 'size', ''], rows.map((f) => tr([f.id, f.name, f.contentType, f.size,
        h('button', { class: 'btn danger', type: 'button', on: { click: async () => { await api('DELETE', `/api/files/${f.id}`); refresh(); } } }, 'Delete')]))));
    };
    const fileIn = h('input', { type: 'file' });
    const uploadBtn = h('button', { class: 'btn primary', type: 'button', on: { click: () => {
      const f = fileIn.files[0];
      if (!f) { out.replaceChildren(h('p', { class: 'err' }, 'Choose a file first')); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        const b64 = String(reader.result).split(',')[1];
        out.replaceChildren(resultBox(await api('POST', '/api/files/upload', { body: { name: f.name, contentType: f.type, contentBase64: b64 } })));
        refresh();
      };
      reader.readAsDataURL(f);
    } } }, 'Upload');
    const nameIn = h('input', { class: 'wide', placeholder: 'file name, e.g. notes.txt' });
    const dl = h('button', { class: 'btn', type: 'button', on: { click: async () => {
      const r = await fetch(new URL('/api/files/download?name=' + encodeURIComponent(nameIn.value), apiBase() + '/'), { headers: { authorization: 'Bearer ' + getToken() } });
      out.replaceChildren(h('p', { class: r.ok ? 'ok' : 'err' }, `HTTP ${r.status}`), h('pre', null, await r.text()));
    } } }, 'Download');
    setView(h('h1', null, 'Files'), DISCLAIMER,
      h('div', { class: 'panel' }, h('h2', null, 'Upload'), h('div', { class: 'row' }, fileIn, uploadBtn)),
      h('div', { class: 'panel' }, h('h2', null, 'Download by name'), h('div', { class: 'row' }, nameIn, dl)),
      out, h('h2', null, 'Uploaded files'), listDiv);
    refresh();
  }

  // ---------- Webhooks
  function webhooksView() {
    const out = h('div');
    const listDiv = h('div');
    const refresh = async () => {
      const r = await api('GET', '/api/webhooks');
      const rows = (r.data && r.data.data) || [];
      listDiv.replaceChildren(table(['id', 'url', 'events', 'secret', 'actions'], rows.map((w) => tr([w.id, w.url, (w.events || []).join(', '), w.secret,
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('POST', `/api/webhooks/${w.id}/test`))) } }, 'Test'),
          h('button', { class: 'btn danger', type: 'button', on: { click: async () => { await api('DELETE', `/api/webhooks/${w.id}`); refresh(); } } }, 'Delete'))]))));
    };
    setView(h('h1', null, 'Webhooks'), DISCLAIMER,
      h('div', { class: 'panel' }, jsonEditor({ url: 'https://example.com/hook', events: ['deal.won'] }, async (b) => { const r = await api('POST', '/api/webhooks', { body: b }); refresh(); return r; }, 'Create webhook')),
      out, listDiv);
    refresh();
  }

  // ---------- Billing
  function billingView() {
    const out = h('div');
    const subsDiv = h('div');
    const refresh = async () => {
      const r = await api('GET', '/api/subscriptions');
      subsDiv.replaceChildren(h('pre', null, pretty(r.data)));
    };
    const planBtn = h('button', { class: 'btn', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('GET', '/api/plans'))) } }, 'Show plans');
    const entIn = h('input', { placeholder: 'feature, e.g. api' });
    const planIn = h('input', { placeholder: 'plan (optional)' });
    const entBtn = h('button', { class: 'btn', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('GET', '/api/entitlements/check', { query: { feature: entIn.value, plan: planIn.value } }))) } }, 'Check entitlement');
    setView(h('h1', null, 'Billing & subscriptions'), DISCLAIMER,
      h('div', { class: 'panel' }, h('div', { class: 'row' }, planBtn, h('button', { class: 'btn', type: 'button', on: { click: refresh } }, 'Load subscriptions')), subsDiv),
      h('div', { class: 'panel' }, h('h2', null, 'Create or change subscription'), jsonEditor({ plan: 'professional', seats: 25, quota: 1000 }, async (b) => { const r = await api('POST', '/api/subscriptions', { body: b }); refresh(); return r; }, 'Create subscription')),
      h('div', { class: 'panel' }, h('h2', null, 'Entitlement check'), h('div', { class: 'row' }, entIn, planIn, entBtn)),
      out);
    refresh();
  }

  // ---------- Audit
  function auditView() {
    const out = h('div');
    const listDiv = h('div');
    const refresh = async () => {
      const r = await api('GET', '/api/audit');
      const rows = (r.data && r.data.data) || [];
      listDiv.replaceChildren(table(['id', 'action', 'actorId', 'targetId', 'createdAt', 'actions'], rows.map((a) => tr([a.id, a.action, a.actorId, a.targetId, a.createdAt,
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', on: { click: () => openModal('Edit audit entry', jsonEditor(a, async (b) => { const x = await api('PATCH', `/api/audit/${a.id}`, { body: b }); refresh(); return x; }, 'Save')) } }, 'Edit'),
          h('button', { class: 'btn danger', type: 'button', on: { click: async () => { await api('DELETE', `/api/audit/${a.id}`); refresh(); } } }, 'Delete'))]))));
    };
    setView(h('h1', null, 'Audit log'), DISCLAIMER,
      h('div', { class: 'panel' }, h('h2', null, 'Add entry'), jsonEditor({ action: 'contact.update', targetType: 'record', targetId: 5 }, async (b) => { const r = await api('POST', '/api/audit', { body: b }); refresh(); return r; }, 'Add')),
      out, listDiv);
    refresh();
  }

  // ---------- Reports
  function reportsView() {
    const out = h('div');
    const fromIn = h('input', { type: 'date', value: '2026-01-01' });
    const toIn = h('input', { type: 'date', value: '2026-12-31' });
    const msIn = h('input', { type: 'number', value: '1500' });
    const whereIn = h('input', { class: 'wide', placeholder: 'SQL-style filter' });
    const show = (p) => p.then((r) => out.replaceChildren(resultBox(r)));
    setView(h('h1', null, 'Reports'), DISCLAIMER,
      h('div', { class: 'panel' }, h('div', { class: 'row' },
        h('button', { class: 'btn primary', type: 'button', on: { click: () => show(api('GET', '/api/reports/summary')) } }, 'Summary'),
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('GET', '/api/reports/paginated', { query: { limit: 5, offset: 0 } })) } }, 'Contacts page'),
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('GET', '/api/reports/slow', { query: { ms: msIn.value } })) } }, 'Slow report')),
        h('div', { class: 'row' }, msIn, h('span', { class: 'muted' }, 'delay ms')),
        h('div', { class: 'row' }, fromIn, toIn, h('button', { class: 'btn', type: 'button', on: { click: () => show(api('GET', '/api/reports/sales', { query: { from: fromIn.value, to: toIn.value } })) } }, 'Sales in range')),
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', on: { click: () => downloadCsv('/api/reports/export', 'deals.csv') } }, 'Export deals CSV'))),
      out);
  }

  // ---------- Tools
  function toolsView() {
    const out = h('div');
    const hostIn = h('input', { class: 'wide', value: 'example.com' });
    const urlIn = h('input', { class: 'wide', value: 'https://example.com' });
    const tplIn = h('textarea'); tplIn.value = 'Hello {{ user.name }}, total is {{ 6*7 }}';
    const dataIn = h('textarea'); dataIn.value = '{"user": {"name": "Ana"}}';
    const valIn = h('textarea'); valIn.value = '{"email": "not-an-email", "age": "twelve"}';
    const show = (p) => p.then((r) => out.replaceChildren(resultBox(r)));
    setView(h('h1', null, 'Tools'), DISCLAIMER,
      h('div', { class: 'panel' }, h('h2', null, 'Ping'), h('div', { class: 'row' }, hostIn, h('button', { class: 'btn', type: 'button', on: { click: () => show(api('POST', '/api/tools/ping', { body: { host: hostIn.value } })) } }, 'Ping'))),
      h('div', { class: 'panel' }, h('h2', null, 'Fetch a URL on the server'), h('div', { class: 'row' }, urlIn, h('button', { class: 'btn', type: 'button', on: { click: () => show(api('GET', '/api/tools/fetch', { query: { url: urlIn.value } })) } }, 'Fetch'))),
      h('div', { class: 'panel' }, h('h2', null, 'Template'), tplIn, dataIn, h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', on: { click: () => { let d = {}; try { d = JSON.parse(dataIn.value); } catch (e) { /* keep {} */ } show(api('POST', '/api/templates/render', { body: { template: tplIn.value, data: d } })); } } }, 'Render'))),
      h('div', { class: 'panel' }, h('h2', null, 'Validate form'), valIn, h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', on: { click: () => { let d = {}; try { d = JSON.parse(valIn.value); } catch (e) { /* keep {} */ } show(api('POST', '/api/tools/validate', { body: d })); } } }, 'Validate'))),
      h('div', { class: 'panel' }, h('h2', null, 'Redirect'), h('a', { class: 'btn', href: apiBase() + '/api/redirect?to=' + encodeURIComponent('https://example.com'), target: '_blank', rel: 'noopener' }, 'Open redirect endpoint')),
      out);
  }

  // ---------- GraphQL
  function graphqlView() {
    const q = h('textarea'); q.value = '{ __schema { queryType { name } types { name } } }';
    const out = h('div');
    const samples = [
      ['Introspection', '{ __schema { types { name fields { name } } } }'],
      ['Contacts', '{ contacts(limit: 3) { id firstName email nationalId } }'],
      ['Deals', '{ deals { id title amount stage } }'],
      ['Field suggestion (typo)', '{ contactz { id } }'],
      ['Mutation', 'mutation { updateDealStage(id: 1, stage: "won") { id stage } }'],
    ];
    setView(h('h1', null, 'GraphQL'), DISCLAIMER,
      h('div', { class: 'row' }, samples.map(([label, text]) => h('button', { class: 'btn', type: 'button', on: { click: () => { q.value = text; } } }, label))),
      q,
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('POST', '/graphql', { body: { query: q.value } }))) } }, 'Run (POST)'),
        h('button', { class: 'btn', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('GET', '/graphql', { query: { query: q.value } }))) } }, 'Run (GET)'),
        h('a', { class: 'btn', href: apiBase() + '/graphiql', target: '_blank', rel: 'noopener' }, 'Open IDE')),
      out);
  }

  // ---------- AI agent
  function agentView() {
    const p = h('textarea'); p.value = 'read contact 2 in tenant t2';
    const out = h('div');
    const examples = ['read contact 2 in tenant t2', 'search for example in tenant t3', 'update contact 3 {"status": "customer"}', 'delete deal 7 in tenant t2', 'approve invoice 4'];
    setView(h('h1', null, 'AI agent'), DISCLAIMER,
      h('div', { class: 'note' }, 'Natural-language tasks run with the signed-in token. Tenant and role are not checked.'),
      h('div', { class: 'row' }, examples.map((x) => h('button', { class: 'btn', type: 'button', on: { click: () => { p.value = x; } } }, x))),
      p,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('POST', '/api/agent/prompt', { body: { prompt: p.value } }))) } }, 'Run task')),
      out);
  }

  // ---------- Admin
  async function adminView() {
    const out = h('div');
    const usersDiv = h('div');
    const refreshUsers = async () => {
      const r = await api('GET', '/api/users');
      const rows = (r.data && r.data.data) || [];
      usersDiv.replaceChildren(table(['id', 'name', 'email', 'role', 'tenant', 'disabled', 'actions'], rows.map((u) => tr([u.id, u.name, u.email, u.role, u.tenantId, String(!!u.disabled),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', type: 'button', on: { click: async () => { out.replaceChildren(resultBox(await api('POST', `/api/admin/users/${u.id}/disable`))); refreshUsers(); } } }, 'Disable'),
          h('button', { class: 'btn', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('POST', `/api/admin/users/${u.id}/reset-password`))) } }, 'Reset password'),
          h('button', { class: 'btn', type: 'button', on: { click: async () => { const role = window.prompt('New role: admin, manager or agent'); if (!role) return; out.replaceChildren(resultBox(await api('PUT', `/api/users/${u.id}/role`, { body: { role } }))); refreshUsers(); } } }, 'Set role'),
          h('button', { class: 'btn danger', type: 'button', on: { click: async () => { out.replaceChildren(resultBox(await api('DELETE', `/api/users/${u.id}`))); refreshUsers(); } } }, 'Delete'))]))));
    };
    const rolesRes = await api('GET', '/api/roles');
    const roles = (rolesRes.data && rolesRes.data.data) || [];
    const tenantsRes = await api('GET', '/api/tenants');
    const tenants = (tenantsRes.data && tenantsRes.data.data) || [];
    const u = getUser();
    setView(h('h1', null, 'Admin'), DISCLAIMER,
      h('div', { class: 'panel' }, h('h2', null, 'Users'), usersDiv, h('h2', null, 'Create user'), jsonEditor({ name: 'New Person', email: 'new.person@northwind.example', password: 'Temp@1234', role: 'agent' }, async (b) => { const r = await api('POST', '/api/users', { body: b }); refreshUsers(); return r; }, 'Create user')),
      h('div', { class: 'panel' }, h('h2', null, 'Roles'), h('p', { class: 'note' }, 'Roles are fixed. Role creation is not available in this app.'),
        h('ul', null, roles.map((r) => h('li', null, h('b', null, r.name), ' — ', r.description)))),
      h('div', { class: 'panel' }, h('h2', null, 'Tenants'),
        h('ul', null, tenants.map((t) => h('li', null, `${t.id} · ${t.name} · ${t.plan}`, ' ',
          h('button', { class: 'btn', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('GET', `/api/tenants/${t.id}/settings`))) } }, 'Settings'),
          ' ', h('button', { class: 'btn', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('POST', `/api/admin/tenants/${t.id}/reseed`))) } }, 'Reseed demo data'))))),
      h('div', { class: 'panel' }, h('h2', null, 'Tenant settings (edit)'), jsonEditor({ retentionDays: 90 }, async (b) => api('PATCH', `/api/tenants/${u.tenantId}/settings`, { body: b }), 'Save settings')),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', on: { click: async () => out.replaceChildren(resultBox(await api('GET', '/api/admin/dashboard'))) } }, 'Admin dashboard')),
      out);
    refreshUsers();
  }

  // ---------- Monitoring & debug
  function monitorView() {
    const out = h('div');
    const show = (p) => p.then((r) => out.replaceChildren(resultBox(r)));
    const btn = (label, fn) => h('button', { class: 'btn', type: 'button', on: { click: () => show(fn()) } }, label);
    setView(h('h1', null, 'Monitoring & debug'), DISCLAIMER,
      h('div', { class: 'panel row' },
        btn('Health', () => api('GET', '/api/health')),
        btn('Metrics', () => api('GET', '/api/monitoring/metrics')),
        btn('Environment', () => api('GET', '/api/debug/env')),
        btn('Trigger error', () => api('GET', '/api/debug/error', { query: { msg: 'test' } })),
        btn('Legacy contacts (v0)', () => api('GET', '/api/v0/contacts')),
        btn('Endpoint list', () => api('GET', '/api/meta/endpoints'))),
      h('div', { class: 'panel' }, h('h2', null, 'Access check'), btn('Check invoices delete', () => api('GET', '/api/access-check', { query: { resource: 'invoices', action: 'delete' } }))),
      h('div', { class: 'panel' }, h('h2', null, 'Territory matrix'), h('div', { class: 'row' }, btn('Load matrix', () => api('GET', '/api/matrix')),
        btn('Save sample rows', () => api('PUT', '/api/matrix', { body: { rows: [{ territory: 'APAC', role: 'agent', access: 'admin' }] } })))),
      out);
  }

  // ---------- Account
  function accountView() {
    const out = h('div');
    const show = (p) => p.then((r) => { if (r.ok && r.data && r.data.token) store.set('crm.token', r.data.token); out.replaceChildren(resultBox(r)); });
    const pwIn = h('input', { class: 'wide', value: 'NewPass!1' });
    const resetEmail = h('input', { class: 'wide', value: 'ana.agent@northwind.example' });
    const resetTok = h('input', { class: 'wide', placeholder: 'reset token' });
    setView(h('h1', null, 'Account'), DISCLAIMER,
      h('div', { class: 'panel row' },
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('GET', '/api/auth/me')) } }, 'Who am I'),
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('POST', '/api/auth/refresh')) } }, 'Refresh token'),
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('GET', '/api/auth/check')) } }, 'Check token'),
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('GET', '/api/auth/sessions')) } }, 'List sessions'),
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('POST', '/api/auth/introspect')) } }, 'Introspect token'),
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('POST', '/api/auth/logout')) } }, 'Logout (POST)'),
        h('button', { class: 'btn', type: 'button', on: { click: () => show(api('GET', '/api/auth/logout')) } }, 'Logout (GET)')),
      h('div', { class: 'panel' }, h('h2', null, 'Change password (no current password asked)'), h('div', { class: 'row' }, pwIn, h('button', { class: 'btn', type: 'button', on: { click: () => show(api('POST', '/api/auth/change-password', { body: { newPassword: pwIn.value } })) } }, 'Change'))),
      h('div', { class: 'panel' }, h('h2', null, 'Password reset'), h('div', { class: 'row' }, resetEmail, h('button', { class: 'btn', type: 'button', on: { click: () => show(api('POST', '/api/auth/password-reset', { body: { email: resetEmail.value }, auth: false })) } }, 'Request reset')),
        h('div', { class: 'row' }, resetTok, h('button', { class: 'btn', type: 'button', on: { click: () => show(api('POST', '/api/auth/password-reset/confirm', { body: { token: resetTok.value, newPassword: 'Reset@123' }, auth: false })) } }, 'Confirm reset'))),
      h('div', { class: 'panel' }, h('h2', null, 'Sign-in with credentials in the URL'), h('a', { class: 'btn', href: apiBase() + '/api/auth/login-get?email=ana.agent@northwind.example&password=Demo@123', target: '_blank', rel: 'noopener' }, 'Open login-get')),
      out);
  }

  // ---------- API Explorer (every endpoint, with a Try panel)
  async function explorerView() {
    const res = await api('GET', '/api/meta/endpoints', { auth: false });
    const eps = (res.data && res.data.data) || [];
    const filterIn = h('input', { class: 'wide', placeholder: 'filter by path, title or category number' });
    const listDiv = h('div');
    const draw = () => {
      const f = filterIn.value.trim().toLowerCase();
      const groups = {};
      for (const e of eps) {
        const text = `${e.method} ${e.path} ${e.title} ${e.group} ${(e.vulns || []).join(' ')}`.toLowerCase();
        if (f && !text.includes(f)) continue;
        (groups[e.group] = groups[e.group] || []).push(e);
      }
      listDiv.replaceChildren(...Object.entries(groups).map(([g, items]) => h('div', { class: 'ep-group' },
        h('h2', null, `${g} (${items.length})`),
        items.map((e) => endpointRow(e)))));
    };
    filterIn.addEventListener('input', draw);
    setView(h('h1', null, `API Explorer (${eps.length} endpoints)`), DISCLAIMER,
      h('p', { class: 'muted' }, 'Every endpoint of the API is listed here. Use Try to send a request. Category numbers refer to VULNERABILITIES.md in the repository.'),
      h('div', { class: 'row' }, filterIn), listDiv);
    draw();
  }

  function endpointRow(e) {
    const panel = h('div', { class: 'try hidden' });
    const toggle = h('button', { class: 'btn', type: 'button', on: { click: () => {
      panel.classList.toggle('hidden');
      if (!panel.childNodes.length) panel.appendChild(tryPanel(e));
    } } }, 'Try');
    return h('div', { class: 'ep' },
      h('span', { class: 'method m-' + e.method }, e.method),
      h('span', { class: 'path' }, e.path),
      h('span', { class: 'muted' }, e.title),
      h('span', { class: 'pill' }, 'auth: ' + e.auth),
      (e.vulns || []).map((v) => h('span', { class: 'pill' }, '#' + v)),
      toggle,
      h('div', { class: 'desc' }, e.desc || ''),
      panel);
  }

  function tryPanel(e) {
    const s = e.sample || {};
    const names = [...e.path.matchAll(/:([a-zA-Z]+)/g)].map((m) => m[1]);
    const paramIns = names.map((n) => [n, h('input', { value: (s.params && s.params[n] !== undefined) ? String(s.params[n]) : '1', placeholder: n })]);
    const queryTa = h('textarea', { style: 'min-height:60px' }); queryTa.value = JSON.stringify(s.query || {}, null, 2);
    const headersTa = h('textarea', { style: 'min-height:50px' }); headersTa.value = JSON.stringify(s.headers || {}, null, 2);
    const bodyTa = h('textarea', { style: 'min-height:90px' }); bodyTa.value = e.method === 'GET' || e.method === 'DELETE' ? '' : JSON.stringify(s.body || {}, null, 2);
    const out = h('div');
    const send = h('button', { class: 'btn primary', type: 'button', on: { click: async () => {
      let path = e.path;
      for (const [n, input] of paramIns) path = path.replace(':' + n, encodeURIComponent(input.value));
      let query = {}, headers = {}, body;
      try { query = queryTa.value.trim() ? JSON.parse(queryTa.value) : {}; headers = headersTa.value.trim() ? JSON.parse(headersTa.value) : {}; } catch (err) { out.replaceChildren(h('p', { class: 'err' }, 'Invalid JSON in query or headers: ' + err.message)); return; }
      if (bodyTa.value.trim()) { try { body = JSON.parse(bodyTa.value); } catch (err) { out.replaceChildren(h('p', { class: 'err' }, 'Invalid JSON body: ' + err.message)); return; } }
      out.replaceChildren(h('p', { class: 'muted' }, 'Sending...'));
      const r = await api(e.method, path, { query, headers, body, auth: e.auth !== 'none' });
      out.replaceChildren(resultBox(r));
    } } }, 'Send');
    return h('div', null,
      paramIns.length ? h('div', { class: 'row' }, paramIns.map(([n, i]) => h('label', null, n + ': ', i))) : null,
      h('div', null, h('span', { class: 'muted' }, 'Query (JSON object)'), queryTa),
      h('div', null, h('span', { class: 'muted' }, 'Headers (JSON object)'), headersTa),
      e.method === 'GET' || e.method === 'DELETE' ? null : h('div', null, h('span', { class: 'muted' }, 'Body (JSON)'), bodyTa),
      h('p', { class: 'muted' }, e.auth !== 'none' ? 'Sends your session token.' : 'Sends no token.'),
      h('div', { class: 'row' }, send),
      out);
  }

  // ---------- router
  const ROUTES = {
    login: loginView,
    dashboard: dashboardView,
    search: searchView,
    files: filesView,
    webhooks: webhooksView,
    billing: billingView,
    audit: auditView,
    reports: reportsView,
    tools: toolsView,
    graphql: graphqlView,
    agent: agentView,
    admin: adminView,
    monitor: monitorView,
    account: accountView,
    explorer: explorerView,
  };

  async function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [head, arg] = hash.split('/');
    const signedIn = !!getToken();
    if (!signedIn && head !== 'explorer' && head !== 'login') { location.hash = '#/login'; return; }
    renderNav(head);
    renderWho();
    if (head === 'res' && arg) {
      if (!RES[arg]) { setView(h('p', null, 'Unknown resource')); return; }
      listState.offset = 0;
      return resourceView(arg);
    }
    const fn = ROUTES[head] || (signedIn ? dashboardView : loginView);
    setView(h('p', { class: 'muted' }, 'Loading...'));
    try {
      await fn();
    } catch (e) {
      setView(h('p', { class: 'err' }, 'Error: ' + e.message));
    }
    // Admin page: non-admin users see the page load, then get sent to the dashboard after about 1 second.
    const role = (getUser() || {}).role;
    if (head === 'admin' && role !== 'admin') {
      setTimeout(() => {
        if ((location.hash || '').replace(/^#\/?/, '').split('/')[0] === 'admin') location.hash = '#/dashboard';
      }, 1000);
    }
  }

  // re-render the current resource list (used by create/edit/delete)
  function render() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [head, arg] = hash.split('/');
    if (head === 'res' && arg) resourceView(arg);
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.hash = getToken() ? '#/dashboard' : '#/login';
    route();
  });
  if (document.readyState !== 'loading') {
    if (!location.hash) location.hash = getToken() ? '#/dashboard' : '#/login';
    route();
  }
})();
