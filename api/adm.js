// Painel restrito da PO. Só existe no endereço secreto (variável ADMIN_PATH) e pede uma senha própria
// (variável ADMIN_PASSWORD), diferente da senha da equipe. Qualquer outro endereço responde 404.
import crypto from 'node:crypto';
import { readJson } from './_auth.js';
import { dbReady, rest } from './_db.js';
import { ADM_HTML, ADM_LOGIN_HTML } from './_adm_html.js';

const COOKIE = 'lg_adm';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias
const STATUS = ['A fazer', 'Em andamento', 'Concluída'];

const PATH = () => String(process.env.ADMIN_PATH || '').trim();
const PASS = () => String(process.env.ADMIN_PASSWORD || '').trim();
const key = () => crypto.createHash('sha256').update(`${PASS()}|${process.env.SESSION_SECRET || process.env.SITE_PASSWORD || ''}|adm`).digest();
const sign = v => crypto.createHmac('sha256', key()).update(v).digest('base64url');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function isAdmin(req) {
  if (!PASS()) return false;
  const raw = String(req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig || !same(sig, sign(payload))) return false;
  try { const { a, t } = JSON.parse(Buffer.from(payload, 'base64url').toString()); return a === 1 && Date.now() - t < MAX_AGE * 1000; }
  catch { return false; }
}
function adminCookie() {
  const payload = Buffer.from(JSON.stringify({ a: 1, t: Date.now() })).toString('base64url');
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}
const notFound = res => { res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.status(404).send('404: NOT_FOUND'); };
const enc = encodeURIComponent;

// As mudanças feitas no painel ficam no nome da Leticia (sem nenhuma marca de "painel").
async function poLogin() {
  const found = await rest('usuarios?select=login,nome&login=like.leticia*&order=ultimo_acesso.desc&limit=1');
  if (found.length) return found[0].login;
  await rest('usuarios?on_conflict=login', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: { login: 'leticia', nome: 'Leticia' } });
  return 'leticia';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const url = new URL(req.url, 'http://x');
  const slug = String(url.searchParams.get('s') || '');
  const a = String(url.searchParams.get('a') || '');
  if (!PATH() || !PASS() || !/^[\w-]{6,80}$/.test(PATH()) || !same(slug, PATH())) return notFound(res);

  // Página
  if (!a) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'DENY');
    const html = isAdmin(req) ? ADM_HTML : ADM_LOGIN_HTML;
    return res.status(200).send(html.split('__SLUG__').join(JSON.stringify(slug)));
  }

  if (a === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
    let body = {}; try { body = await readJson(req); } catch {}
    if (!same(String(body.senha || '').trim(), PASS())) {
      await new Promise(r => setTimeout(r, 800));
      return res.status(401).json({ error: 'Senha incorreta.' });
    }
    res.setHeader('Set-Cookie', adminCookie());
    return res.status(200).json({ ok: true });
  }
  if (a === 'logout') {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    res.setHeader('Location', '/');
    return res.status(302).end();
  }

  if (!isAdmin(req)) return res.status(401).json({ error: 'Entre de novo no painel.' });
  if (!dbReady()) return res.status(500).json({ error: 'Banco de dados não configurado.' });

  try {
    if (a === 'data') {
      const [usuarios, status, historico, entregas] = await Promise.all([
        rest('usuarios?select=login,nome,criado_em,ultimo_acesso,acessos&order=ultimo_acesso.desc'),
        rest('tarefas_status?select=tarefa_id,status,atualizado_por,atualizado_em'),
        rest('tarefas_historico?select=tarefa_id,status,login,em&order=em.desc&limit=3000'),
        rest('entregas?select=id,dados,atualizada_por,atualizada_em'),
      ]);
      return res.status(200).json({ agora: new Date().toISOString(), usuarios, status, historico, entregas });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
    const body = await readJson(req);

    if (a === 'status') {
      const tarefa_id = String(body.id || '').slice(0, 120);
      if (!tarefa_id || !STATUS.includes(body.status)) return res.status(400).json({ error: 'Status inválido.' });
      const login = await poLogin(), em = new Date().toISOString();
      await rest('tarefas_status?on_conflict=tarefa_id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { tarefa_id, status: body.status, atualizado_por: login, atualizado_em: em } });
      await rest('tarefas_historico', { method: 'POST', prefer: 'return=minimal', body: { tarefa_id, status: body.status, login, em } });
      return res.status(200).json({ ok: true, login, em });
    }

    if (a === 'merge' || a === 'remove') {
      const de = String(body.de || '');
      const [u] = await rest(`usuarios?login=eq.${enc(de)}&select=login,acessos,ultimo_acesso`);
      if (!u) return res.status(404).json({ error: 'Login não encontrado.' });
      let para = null;
      if (a === 'merge') {
        para = String(body.para || '');
        if (!para || para === de) return res.status(400).json({ error: 'Escolha para quem juntar.' });
        const [p] = await rest(`usuarios?login=eq.${enc(para)}&select=login,acessos,ultimo_acesso`);
        if (!p) return res.status(404).json({ error: 'Login de destino não encontrado.' });
        await rest(`usuarios?login=eq.${enc(para)}`, { method: 'PATCH', prefer: 'return=minimal', body: { acessos: p.acessos + u.acessos, ultimo_acesso: p.ultimo_acesso > u.ultimo_acesso ? p.ultimo_acesso : u.ultimo_acesso } });
      }
      await rest(`tarefas_status?atualizado_por=eq.${enc(de)}`, { method: 'PATCH', prefer: 'return=minimal', body: { atualizado_por: para } });
      await rest(`tarefas_historico?login=eq.${enc(de)}`, { method: 'PATCH', prefer: 'return=minimal', body: { login: para } });
      await rest(`usuarios?login=eq.${enc(de)}`, { method: 'DELETE', prefer: 'return=minimal' });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Ação desconhecida.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
