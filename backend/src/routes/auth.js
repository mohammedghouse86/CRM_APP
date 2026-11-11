'use strict';
const store = require('../store');
const { HttpError } = require('../http');
const { endpoint } = require('./_def');
const { issue, verify, parse, getToken } = require('../auth');
const { ensureObject, nowIso } = require('../resources');

const G = 'Auth & sessions';
const E = (method, path, o, fn) => endpoint(G, method, path, o, fn);

function findUserByEmail(email) {
  const e = String(email || '').toLowerCase();
  return store.db.users.find((u) => u.email === e) || null;
}

function startSession(ctx, user, opts = {}) {
  const env = opts.env || ctx.headers['x-env'] || 'production';
  const aud = opts.aud || ctx.headers['x-app'] || 'crm-web';
  const token = issue(user, { env, aud });
  const sid = store.nextId('sessions'); // sequential, guessable session ids
  store.db.sessions.push({ id: sid, userId: user.id, token, env, aud, createdAt: nowIso(), ip: ctx.req.socket.remoteAddress });
  store.touch();
  // Session cookie without HttpOnly / Secure, cross-site allowed
  ctx.extraHeaders['Set-Cookie'] = `session=${token}; Path=/; SameSite=None`;
  return { token, sessionId: sid, user: user }; // returns password hash field too (intentional)
}

function loginWith(ctx, src) {
  const user = findUserByEmail(src.email);
  if (!user) throw new HttpError(404, `No account found for ${src.email}`); // account enumeration
  if (user.password !== String(src.password || '')) throw new HttpError(401, 'Incorrect password for this account');
  if (user.disabled) throw new HttpError(403, 'Account disabled');
  return ctx.json(200, startSession(ctx, user));
}

const loginSample = { body: { email: 'ana.agent@northwind.example', password: 'Demo@123' } };

module.exports = [
  E('POST', '/api/auth/login', { title: 'Log in (JSON or form)', auth: 'none', sample: loginSample, vulns: [37, 40, 42, 32, 138, 103], desc: 'Returns a token, sets a session cookie. Error messages reveal whether an account exists. No rate limit. Accepts form posts with no CSRF token.' }, async (ctx) => {
    const src = ensureObject(ctx.body);
    return loginWith(ctx, src);
  }),

  E('GET', '/api/auth/login-get', { title: 'Log in with credentials in the URL', auth: 'none', sample: { query: { email: 'ana.agent@northwind.example', password: 'Demo@123' } }, vulns: [30, 29, 46, 44], desc: 'Accepts email and password as query parameters.' }, async (ctx) => loginWith(ctx, ctx.query)),

  E('POST', '/api/auth/logout', { title: 'Log out', auth: 'api', vulns: [39, 48], desc: 'Acknowledges logout but the token is not revoked and keeps working.' }, async (ctx) => {
    store.db.revoked.push({ userId: ctx.user.id, at: nowIso() }); // stored, never checked
    store.touch();
    return ctx.json(200, { loggedOut: true, note: 'Token remains valid' });
  }),

  E('GET', '/api/auth/logout', { title: 'Log out (GET)', auth: 'api', vulns: [44, 39], desc: 'State-changing logout exposed as GET.' }, async (ctx) => {
    store.db.revoked.push({ userId: ctx.user.id, at: nowIso(), via: 'GET' });
    store.touch();
    ctx.extraHeaders['Set-Cookie'] = 'session=; Path=/; SameSite=None';
    return ctx.json(200, { loggedOut: true });
  }),

  E('GET', '/api/auth/me', { title: 'Current user', auth: 'api', vulns: [28], desc: 'Returns the authenticated user.' }, async (ctx) => ctx.json(200, ctx.user)),

  E('GET', '/api/auth/check', { title: 'Check token', auth: 'fail-open', vulns: [47], desc: 'Should answer 401 for an invalid token. Answers 200 as a guest instead.' }, async (ctx) => {
    return ctx.json(200, { authenticated: true, user: ctx.user, guest: !!ctx.user.guest });
  }),

  E('POST', '/api/auth/refresh', { title: 'Refresh token', auth: 'weak', vulns: [38, 49], desc: 'Issues a new token from an expired one.' }, async (ctx) => {
    const token = issue(ctx.user);
    return ctx.json(200, { token, user: ctx.user });
  }),

  E('POST', '/api/auth/token/forge', { title: 'Issue internal token', auth: 'none', sample: { body: { email: 'ava.admin@northwind.example' }, headers: { 'X-Internal': '1' } }, vulns: [34], desc: 'Meant for internal services. Only checks for the X-Internal header.' }, async (ctx) => {
    if (ctx.headers['x-internal'] !== '1') throw new HttpError(403, 'Internal header required');
    const u = findUserByEmail(ctx.body.email);
    if (!u) throw new HttpError(404, 'Unknown user');
    return ctx.json(200, { token: issue(u, { ttl: 365 * 86400 }) });
  }),

  E('POST', '/api/auth/verify', { title: 'Verify a token', auth: 'none', sample: { body: { token: '' } }, vulns: [35], desc: 'Verifies a token. Accepts alg "none" tokens with no signature.' }, async (ctx) => {
    const v = verify(ctx.body.token, 'weak');
    return ctx.json(200, { valid: v.ok, reason: v.reason || 'ok', claims: v.payload || null });
  }),

  E('POST', '/api/auth/introspect', { title: 'Introspect token', auth: 'decode', sample: { body: {} }, vulns: [36], desc: 'Returns the claims of the presented token. Signature is not checked.' }, async (ctx) => {
    return ctx.json(200, { active: true, claims: parse(getToken(ctx)).payload, resolvedUser: ctx.user });
  }),

  E('POST', '/api/auth/password-reset', { title: 'Request password reset', auth: 'none', sample: { body: { email: 'ana.agent@northwind.example' } }, vulns: [37], desc: 'Reveals whether an email exists and returns the reset token in the response.' }, async (ctx) => {
    const u = findUserByEmail(ctx.body.email);
    if (!u) throw new HttpError(404, 'No account with that email');
    const token = resetToken(u.id, 0);
    return ctx.json(200, { message: 'Reset link sent', resetToken: token });
  }),

  E('POST', '/api/auth/password-reset/confirm', { title: 'Confirm password reset', auth: 'none', sample: { body: { token: '', newPassword: 'NewPass!1' } }, vulns: [41], desc: 'Reset tokens are predictable (user id plus minute).' }, async (ctx) => {
    const id = String(ctx.body.token || '').split('-')[0];
    const u = store.db.users.find((x) => String(x.id) === id);
    if (!u) throw new HttpError(400, 'Invalid token');
    const ok = [0, 1].some((back) => resetToken(u.id, back) === ctx.body.token);
    if (!ok) throw new HttpError(400, 'Invalid or expired token');
    u.password = String(ctx.body.newPassword || '');
    store.touch();
    return ctx.json(200, { reset: true, userId: u.id });
  }),

  E('POST', '/api/auth/change-password', { title: 'Change password', auth: 'api', sample: { body: { newPassword: 'NewPass!1' } }, vulns: [27], desc: 'Does not ask for the current password and accepts any userId.' }, async (ctx) => {
    const target = store.db.users.find((u) => u.id === Number(ctx.body.userId || ctx.user.id));
    if (!target) throw new HttpError(404, 'User not found');
    target.password = String(ctx.body.newPassword || '');
    store.touch();
    return ctx.json(200, { changed: true, userId: target.id, password: target.password });
  }),

  E('GET', '/api/auth/sessions', { title: 'List sessions', auth: 'api', vulns: [31], desc: 'Lists every session with its bearer token, for any signed-in user.' }, async (ctx) => ctx.json(200, { sessions: store.db.sessions })),

  E('POST', '/api/auth/validate-env', { title: 'Validate environment token', auth: 'api', sample: { body: {} }, vulns: [43, 140], desc: 'Accepts tokens minted for other environments (staging, dev).' }, async (ctx) => {
    const claims = parse(getToken(ctx)).payload;
    return ctx.json(200, { accepted: true, tokenEnv: claims.env, serverEnv: 'production' });
  }),

  E('POST', '/api/auth/validate-app', { title: 'Validate application token', auth: 'api', sample: { body: {} }, vulns: [45, 139], desc: 'Accepts tokens issued to other client applications (audience not checked).' }, async (ctx) => {
    const claims = parse(getToken(ctx)).payload;
    return ctx.json(200, { accepted: true, tokenAudience: claims.aud, expectedAudience: 'crm-web' });
  }),

  E('POST', '/api/auth/legacy-login', { title: 'Legacy login', auth: 'none', sample: { body: { email: 'ana.agent@northwind.example', password: 'anything' } }, vulns: [33], desc: 'Legacy accounts accept any password.' }, async (ctx) => {
    const u = findUserByEmail(ctx.body.email);
    if (!u || !u.legacy) throw new HttpError(401, 'Legacy login not available for this account');
    return ctx.json(200, startSession(ctx, u));
  }),
];

function resetToken(userId, minutesBack) {
  return `${userId}-${Math.floor(Date.now() / 60000) - minutesBack}`;
}
