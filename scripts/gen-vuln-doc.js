#!/usr/bin/env node
// Builds VULNERABILITIES.md from the endpoint metadata in backend/src and the
// category list in scripts/security-categories.csv.
// Run from the app folder:  node scripts/gen-vuln-doc.js
// It also prints any category that no endpoint covers.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const endpoints = require(path.join(ROOT, 'backend', 'src', 'registry'));

// Categories that cannot be produced by application code on a managed host (Render terminates TLS).
const HOST_LEVEL = {
  74: 'Host-level. Render serves a valid certificate, so this app cannot present a self-signed one.',
  75: 'Host-level. Certificate lifetime is controlled by Render, not the app.',
  76: 'Host-level. TLS versions are controlled by Render. The app cannot restrict them.',
  80: 'Partly. The app has an open redirect (/api/redirect). The HTTP-to-HTTPS redirect is done by Render.',
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csvText = fs.readFileSync(path.join(__dirname, 'security-categories.csv'), 'utf8').replace(/^﻿/, '');
const [header, ...data] = parseCsv(csvText).filter((r) => r.length > 1);
const categories = data.map((r) => ({ num: Number(r[0]), name: r[1], engine: r[2], group: r[3], status: r[4] }));

// Map category number -> endpoints
const byCat = {};
for (const e of endpoints) {
  for (const v of e.meta.vulns) {
    (byCat[v] = byCat[v] || []).push(`${e.meta.method} ${e.meta.path}`);
  }
}

const uncovered = categories.filter((c) => !byCat[c.num] && !HOST_LEVEL[c.num]);
const unknownNums = Object.keys(byCat).map(Number).filter((n) => !categories.some((c) => c.num === n));

const esc = (s) => String(s).replace(/\|/g, '\\|');
const lines = [];
lines.push('# Security issues map');
lines.push('');
lines.push('Every endpoint in this app lists the categories it exhibits. Use this file to check what a scan should find.');
lines.push('');
lines.push(`- Endpoints: **${endpoints.length}**`);
lines.push(`- Categories: **${categories.length}**`);
lines.push(`- Covered by at least one endpoint: **${categories.length - uncovered.length - Object.keys(HOST_LEVEL).filter((n) => !byCat[n]).length}**`);
lines.push(`- Host-level or partly host-level (TLS and HTTP redirect are handled by Render): **${Object.keys(HOST_LEVEL).length}** (see notes)`);
lines.push('');
lines.push('## Categories');
lines.push('');
lines.push('| # | Category | Engine name | Group | Source status | Endpoints that exhibit it | Notes |');
lines.push('|---|---|---|---|---|---|---|');
for (const c of categories) {
  const eps = byCat[c.num] || [];
  const shown = eps.length ? eps.map((x) => '`' + x + '`').join('<br>') : '—';
  const note = HOST_LEVEL[c.num] || (eps.length ? '' : 'Not implemented');
  lines.push(`| ${c.num} | ${esc(c.name)} | \`${esc(c.engine)}\` | ${esc(c.group)} | ${esc(c.status)} | ${shown} | ${esc(note)} |`);
}
lines.push('');
lines.push('## Endpoints');
lines.push('');
lines.push('| Method | Path | Group | Auth mode | Categories |');
lines.push('|---|---|---|---|---|');
for (const e of endpoints) {
  const m = e.meta;
  lines.push(`| ${m.method} | \`${m.path}\` | ${esc(m.group)} | ${m.auth} | ${m.vulns.length ? m.vulns.join(', ') : '—'} |`);
}
lines.push('');
lines.push('## Auth modes');
lines.push('');
lines.push('- `api`: token signature and expiry are checked, the account must exist and be enabled. Audience and environment are not checked.');
lines.push('- `weak`: signature is checked, expiry is ignored, `alg: none` is accepted.');
lines.push('- `decode`: token claims are trusted without checking the signature.');
lines.push('- `fail-open`: a missing or invalid token is treated as a guest.');
lines.push('- `none`: no check.');
lines.push('');

const outPath = path.join(ROOT, 'VULNERABILITIES.md');
fs.writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath}`);
console.log(`Endpoints: ${endpoints.length}  Categories: ${categories.length}`);
if (uncovered.length) {
  console.log('NOT COVERED:');
  uncovered.forEach((c) => console.log(`  ${c.num} ${c.name}`));
} else {
  console.log('All categories are covered (host-level ones noted separately).');
}
if (unknownNums.length) console.log('Endpoints reference unknown category numbers:', unknownNums.join(', '));
