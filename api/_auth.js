// Sessão simples: nome escolhido pela pessoa + senha única da equipe (variável SITE_PASSWORD).
import crypto from 'node:crypto';

const COOKIE = 'lg_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secret() {
  return process.env.SESSION_SECRET || process.env.SITE_PASSWORD || '';
}
function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}
export function passwordOk(given) {
  const real = process.env.SITE_PASSWORD || '';
  if (!real) return false;
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function makeCookie(name) {
  const payload = Buffer.from(JSON.stringify({ n: name, t: Date.now() })).toString('base64url');
  const value = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}
export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
export function getUser(req) {
  if (!secret()) return null;
  const raw = String(req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const { n, t } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() - t > MAX_AGE * 1000) return null;
    return { name: n };
  } catch { return null; }
}
export function requireUser(req, res) {
  const u = getUser(req);
  if (!u) { res.status(401).json({ error: 'Faça login de novo.' }); return null; }
  return u;
}
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const txt = Buffer.concat(chunks).toString('utf8');
  return txt ? JSON.parse(txt) : {};
}
