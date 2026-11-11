'use strict';
// CRM sample app: API server. Dummy data only. Intentionally vulnerable.
const http = require('http');
const store = require('./store');
const { Router, Ctx, HttpError, readBody, parseBody } = require('./http');
const { authenticate } = require('./auth');
const { enforceAccess } = require('./access');
const endpoints = require('./registry');

store.load();

const router = new Router();
endpoints.forEach((e) => router.add(e.meta, e.handler));

const server = http.createServer(async (req, res) => {
  const ctx = new Ctx(req, res);
  try {
    // CORS reflects any origin with credentials (intentional)
    ctx.extraHeaders = {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'Content-Type,Authorization',
      'Access-Control-Expose-Headers': '*',
      'X-Powered-By': 'crm-sample/1.0',
    };
    if (ctx.method === 'OPTIONS') {
      res.writeHead(204, ctx.extraHeaders);
      return res.end();
    }

    ctx.raw = ctx.method === 'GET' || ctx.method === 'HEAD' ? '' : await readBody(req);
    ctx.body = parseBody(ctx.raw, req.headers['content-type']);

    if (ctx.pathname === '/') {
      return ctx.json(200, { name: 'CRM sample API', note: 'Dummy app for testing. See /api/meta/endpoints' });
    }

    const m = router.match(ctx.method, ctx.pathname);
    if (!m.route) {
      if (m.pathMatched) throw new HttpError(405, 'Method not allowed');
      throw new HttpError(404, 'Not found');
    }
    ctx.params = m.params;
    authenticate(ctx, m.route.meta.auth);
    enforceAccess(ctx, m.route.meta.access);
    await m.route.handler(ctx);
    if (store.isDirty() || (ctx.method !== 'GET' && ctx.method !== 'HEAD')) store.save();
  } catch (err) {
    const status = err.status || 500;
    const body = { error: err.message || 'Internal error', status, method: ctx.method, path: ctx.pathname };
    if (err.extra) Object.assign(body, err.extra);
    if (status >= 500 || !err.status) {
      // Stack traces and server details are returned on purpose (error leakage)
      body.stack = err.stack;
      body.server = { node: process.version, platform: process.platform, cwd: process.cwd(), dataFile: store.FILE };
    }
    if (!res.headersSent) ctx.json(status, body);
  }
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`CRM sample API listening on port ${PORT} (${endpoints.length} endpoints)`);
});
