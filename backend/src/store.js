'use strict';
// JSON-file database. Free, no server needed. The whole file is rewritten
// atomically (tmp file + rename) after every change.
const fs = require('fs');
const path = require('path');
const { buildSeed, reseedTenantData } = require('./seed');

const FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'db.json');
let db = null;
let dirty = false;

function load() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    db = buildSeed();
    save();
  }
  return db;
}

function save() {
  if (!db) return;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
  dirty = false;
}

function touch() {
  dirty = true;
}

function isDirty() {
  return dirty;
}

function nextId(collection) {
  db.counters[collection] = (db.counters[collection] || 0) + 1;
  return db.counters[collection];
}

function reseedTenant(tenantId) {
  reseedTenantData(db, tenantId);
  touch();
}

module.exports = {
  FILE,
  load,
  save,
  touch,
  isDirty,
  nextId,
  reseedTenant,
  get db() {
    return db;
  },
};
