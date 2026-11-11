'use strict';
// Minimal HTTP toolkit: router, body parsing, response helpers.

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || null;
  }
}

function compile(path) {
  const names = [];
  const pattern = path.replace(/\/:([a-zA-Z]+)/g, (_, n) => {
    names.push(n);
    return '/([^/]+)';
  });
  return { re: new RegExp('^' + pattern + '/?$'), names };
}

class Router {
  constructor() {
    this.routes = [];
  }
  add(meta, handler) {
    const { re, names } = compile(meta.path);
    this.routes.push({ meta, handler, re, names, method: meta.method.toUpperCase() });
    // Literal paths (fewer params) must win over /:id patterns, e.g. /api/contacts/search vs /api/contacts/:id
    this.routes.sort((a, b) => a.names.length - b.names.length);
  }
  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params = {};
      r.names.forEach((n, i) => {
        params[n] = decodeURIComponent(m[i + 1]);
      });
      return { route: r, params, pathMatched };
    }
    return { route: null, params: {}, pathMatched };
  }
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseBody(raw, contentType) {
  if (!raw) return {};
  const t = (contentType || '').toLowerCase();
  if (t.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  if (t.includes('json') || /^\s*[\[{]/.test(raw)) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw new HttpError(400, 'Invalid JSON: ' + e.message);
    }
  }
  return { raw };
}

function parseCookies(header) {
  const out = {};
  String(header || '')
    .split(';')
    .forEach((p) => {
      const i = p.indexOf('=');
      if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    });
  return out;
}

class Ctx {
  constructor(req, res) {
    const url = new URL(req.url, 'http://localhost');
    this.req = req;
    this.res = res;
    this.method = req.method.toUpperCase();
    this.pathname = url.pathname;
    this.query = Object.fromEntries(url.searchParams);
    this.headers = req.headers;
    this.cookies = parseCookies(req.headers.cookie);
    this.params = {};
    this.body = {};
    this.raw = '';
    this.user = null;
    this.mutated = false;
    this.extraHeaders = {};
  }
  json(status, body, headers) {
    return this.send(status, 'application/json; charset=utf-8', JSON.stringify(body, null, 2), headers);
  }
  text(status, body, contentType = 'text/plain; charset=utf-8', headers) {
    return this.send(status, contentType, String(body), headers);
  }
  html(status, body, headers) {
    return this.send(status, 'text/html; charset=utf-8', body, headers);
  }
  redirect(location, status = 302) {
    return this.send(status, 'text/plain; charset=utf-8', 'Redirecting to ' + location, { Location: location });
  }
  send(status, contentType, payload, headers) {
    if (this.res.headersSent) return;
    this.res.writeHead(status, { 'Content-Type': contentType, ...this.extraHeaders, ...(headers || {}) });
    this.res.end(payload);
    return true;
  }
}

module.exports = { HttpError, Router, Ctx, readBody, parseBody };
