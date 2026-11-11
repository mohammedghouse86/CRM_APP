'use strict';
// Token handling. Tokens are HS256-style JWTs signed with a hard-coded, weak secret.
// Several verification modes exist on purpose so that each route family
// behaves differently. See VULNERABILITIES.md for what each mode exposes.
const crypto = require('crypto');
const store = require('./store');
const { HttpError } = require('./http');

const SECRET = 'crm-dummy-secret'; // intentionally weak and hard-coded (dummy app)
const TTL_SECONDS = 8 * 3600;
const DEFAULT_AUD = 'crm-web';
const DEFAULT_ENV = 'production';

const b64u = (s) => Buffer.from(s, 'utf8').toString('base64url');
const unb64u = (s) => Buffer.from(s, 'base64url').toString('utf8');
const hmac = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

function sign(header, payload) {
  const h = b64u(JSON.stringify(header));
  const p = b64u(JSON.stringify(payload));
  return `${h}.${p}.${hmac(h + '.' + p)}`;
}

function issue(user, opts = {}) {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { alg: 'HS256', typ: 'JWT' },
    {
      sub: user.id,
      email: user.email,
      tid: user.tenantId,
      role: user.role,
      iat: now,
      exp: now + (opts.ttl || TTL_SECONDS),
      aud: opts.aud || DEFAULT_AUD,
      env: opts.env || DEFAULT_ENV,
      jti: crypto.randomBytes(8).toString('hex'),
    }
  );
}

function parse(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    return {
      header: JSON.parse(unb64u(parts[0])),
      payload: JSON.parse(unb64u(parts[1])),
      sig: parts[2],
      signingInput: parts[0] + '.' + parts[1],
    };
  } catch (e) {
    return null;
  }
}

// Returns { ok, payload, reason }
function verify(token, mode) {
  const t = parse(token);
  if (!t) return { ok: false, reason: 'malformed token' };
  if (t.header.alg === 'none') {
    if (mode === 'weak') return { ok: true, payload: t.payload, reason: 'alg none accepted' };
    return { ok: false, reason: 'alg none rejected' };
  }
  if (t.header.alg !== 'HS256') return { ok: false, reason: 'unsupported alg' };
  if (mode !== 'decode' && hmac(t.signingInput) !== t.sig) return { ok: false, reason: 'bad signature' };
  const now = Math.floor(Date.now() / 1000);
  if (mode === 'api' && t.payload.exp && t.payload.exp < now) return { ok: false, reason: 'token expired' };
  return { ok: true, payload: t.payload };
}

function getToken(ctx) {
  const auth = ctx.headers.authorization || '';
  if (/^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, '').trim();
  if (ctx.cookies.session) return ctx.cookies.session;
  if (ctx.query.access_token) return ctx.query.access_token; // credential in URL (intentional)
  return null;
}

function userFromDb(id) {
  return store.db.users.find((u) => u.id === Number(id)) || null;
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenantId };
}

// mode: 'api' | 'weak' | 'decode' | 'none' | 'fail-open'
function authenticate(ctx, mode) {
  const token = getToken(ctx);
  if (mode === 'none') {
    const v = token ? verify(token, 'weak') : { ok: false };
    ctx.user = v.ok ? userFromDb(v.payload.sub) : null;
    return ctx.user;
  }
  const guest = { id: 0, name: 'Guest', email: 'guest@anonymous', role: 'agent', tenantId: 't1', guest: true };
  if (!token) {
    if (mode === 'fail-open') return (ctx.user = guest);
    throw new HttpError(401, 'Authentication required', { hint: 'Send Authorization: Bearer <token>' });
  }
  const v = verify(token, mode === 'decode' ? 'decode' : mode === 'weak' ? 'weak' : 'api');
  if (!v.ok) {
    if (mode === 'fail-open') return (ctx.user = guest);
    throw new HttpError(401, 'Invalid token: ' + v.reason);
  }
  if (mode === 'decode') {
    ctx.user = { id: v.payload.sub, name: 'token-claims', email: v.payload.email, role: v.payload.role, tenantId: v.payload.tid, fromToken: true };
    return ctx.user;
  }
  const u = userFromDb(v.payload.sub);
  if (!u || (mode === 'api' && u.disabled)) {
    if (mode === 'fail-open') return (ctx.user = guest);
    throw new HttpError(401, 'Unknown or disabled account');
  }
  ctx.user = { id: u.id, name: u.name, email: u.email, role: u.role, tenantId: u.tenantId };
  return ctx.user;
}

function requireRole(ctx, roles) {
  if (!ctx.user || !roles.includes(ctx.user.role)) {
    throw new HttpError(403, `Role '${ctx.user ? ctx.user.role : 'none'}' is not allowed`, { requiredRoles: roles });
  }
}

module.exports = { SECRET, issue, verify, parse, getToken, authenticate, requireRole, publicUser, userFromDb, DEFAULT_AUD, DEFAULT_ENV };
