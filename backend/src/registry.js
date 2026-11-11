'use strict';
// Collects every endpoint module into one list. Each entry is { meta, handler }.
const misc = require('./routes/misc');

const endpoints = [
  ...require('./routes/auth'),
  ...require('./routes/admin'),
  ...require('./routes/crm'),
  ...require('./routes/platform'),
  ...require('./routes/reports-tools'),
  ...misc,
];

// Share the metadata list with the /api/meta/endpoints handler.
misc.ALL_META.push(...endpoints.map((e) => e.meta));

module.exports = endpoints;
