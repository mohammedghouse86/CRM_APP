#!/usr/bin/env node
// Writes RBAC-ISSUES.md from backend/src/access.js.
// Run from the app folder: node scripts/gen-rbac-doc.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { ISSUES } = require(path.join(ROOT, 'backend', 'src', 'access'));

const lines = [];
lines.push('# Authorization issues (planted)');
lines.push('');
lines.push('Intentional access-control weaknesses for testing. Each row is an endpoint that should refuse some roles, or a tenant it should not cross, but does not.');
lines.push('');
lines.push(`Total: **${ISSUES.length}** issues. Admin keeps full access inside its own tenant.`);
lines.push('');
lines.push('"Allowed by design" lists the roles that should be able to call the endpoint. Admin is always included.');
lines.push('');
lines.push('| ID | Method | Path | Allowed by design | Tenant check | Kind | What is wrong |');
lines.push('|---|---|---|---|---|---|---|');
for (const i of ISSUES) {
  const roles = i.roles.join(', ');
  const tenant = i.tenant ? `own tenant (${i.tparam ? 'param ' + i.tparam : 'user tenant'})` : 'none';
  lines.push(`| ${i.id} | ${i.method} | \`${i.path}\` | ${roles} | ${tenant} | ${i.kind} | ${i.note} |`);
}
lines.push('');
lines.push('## How the issues are switched on');
lines.push('');
lines.push('Each issue has `enforced: false` in `backend/src/access.js`. The enforcement helper (`enforceAccess`) only runs when that flag is `true`. To fix an issue, set its flag to `true`.');
lines.push('');
lines.push('## UI visibility');
lines.push('');
lines.push('- The Admin page is hidden from the menu for manager and agent. The Audit and Billing pages are hidden from the menu for agent.');
lines.push('- Hidden pages still open by URL (for example `#/admin`). The router does not check roles.');
lines.push('- The Admin page loads fully for manager and agent, then redirects to the dashboard after about 1 second.');
lines.push('');

const outPath = path.join(ROOT, 'RBAC-ISSUES.md');
fs.writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath} (${ISSUES.length} issues)`);
