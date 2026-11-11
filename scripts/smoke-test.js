#!/usr/bin/env node
// Calls every endpoint listed in /api/meta/endpoints using its sample data.
// Usage: node scripts/smoke-test.js http://localhost:3000
// Note: this writes sample data to the target server. Use a throwaway server.
'use strict';

const BASE = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const EXPECTED_500 = new Set(['GET /api/debug/error']);
// These call out to other hosts; a 502 means the outbound request failed (no network), which is fine here.
const EXPECTED_502 = new Set(['POST /api/webhooks/:id/test', 'GET /api/tools/fetch']);

async function login(email) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Demo@123' }),
  });
  return (await r.json()).token;
}

async function main() {
  const token = await login('ava.admin@northwind.example');
  const meta = await (await fetch(`${BASE}/api/meta/endpoints`)).json();
  // Calls that disable users, change passwords or reseed data run last, so the rest still find seeded rows.
  const DESTRUCTIVE = /reseed|disable|reset-password|change-password|logout|password-reset|DELETE \/api\/users|DELETE \/api\/contacts\/:id$/;
  const isDestructive = (ep) => DESTRUCTIVE.test(`${ep.method} ${ep.path}`);
  const endpoints = [...meta.data.filter((e) => !isDestructive(e)), ...meta.data.filter(isDestructive)];
  console.log(`Endpoints listed: ${endpoints.length}`);

  const results = [];
  for (const ep of endpoints) {
    const s = ep.sample || {};
    const params = { id: 1, type: 'contacts', name: 'approve-invoice', ...(s.params || {}) };
    let path = ep.path.replace(/:([a-zA-Z]+)/g, (_, k) => encodeURIComponent(String(params[k])));
    const qs = new URLSearchParams(Object.entries(s.query || {}).map(([k, v]) => [k, String(v)])).toString();
    const url = `${BASE}${path}${qs ? '?' + qs : ''}`;
    const headers = { ...(s.headers || {}) };
    if (ep.auth !== 'none') headers.authorization = `Bearer ${token}`;
    let body;
    if (ep.method !== 'GET' && ep.method !== 'DELETE') {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(s.body || {});
    }
    if (ep.path === '/api/files/download') headers.authorization = `Bearer ${token}`;
    const started = Date.now();
    let status;
    let note = '';
    try {
      const r = await fetch(url, { method: ep.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(20000) });
      status = r.status;
      if (status >= 400 && status !== 500) {
        const txt = await r.text();
        try { note = JSON.parse(txt).error || ''; } catch (e) { note = txt.slice(0, 80); }
      }
    } catch (e) {
      status = 'ERR ' + e.message;
    }
    const ms = Date.now() - started;
    const key = `${ep.method} ${ep.path}`;
    const bad = typeof status !== 'number' || (status >= 500 && !EXPECTED_500.has(key) && !(status === 502 && EXPECTED_502.has(key)));
    results.push({ key, status, ms, bad, vulns: ep.vulns.length, note });
    console.log(`${bad ? 'FAIL' : ' ok '} ${String(status).padEnd(5)} ${key}  (${ms} ms)${note ? '  <- ' + note : ''}`);
  }
  const failed = results.filter((r) => r.bad);
  console.log(`\nDone. ${results.length - failed.length}/${results.length} returned a non-error status.`);
  if (failed.length) {
    console.log('Failures:');
    failed.forEach((f) => console.log('  ' + f.status + ' ' + f.key));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
