import { passwordOk, makeCookie, readJson } from './_auth.js';
import { dbReady, rest, toLogin } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (!process.env.SITE_PASSWORD) return res.status(500).json({ error: 'A senha da equipe ainda não foi configurada na Vercel (variável SITE_PASSWORD).' });
  let body = {};
  try { body = await readJson(req); } catch { return res.status(400).json({ error: 'Pedido inválido.' }); }
  const nome = String(body.nome || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const login = toLogin(nome);
  if (!login) return res.status(400).json({ error: 'Digite seu nome.' });
  if (!passwordOk(body.senha)) return res.status(401).json({ error: 'Senha incorreta. Peça a senha à Leticia.' });
  let usuario = { login, nome, acessos: 1 };
  if (dbReady()) {
    try { usuario = await rest('rpc/registrar_acesso', { method: 'POST', body: { p_login: login, p_nome: nome } }); }
    catch (e) { return res.status(500).json({ error: 'Não deu para registrar o login no banco: ' + e.message }); }
  }
  res.setHeader('Set-Cookie', makeCookie(usuario.nome, usuario.login));
  return res.status(200).json({ ok: true, nome: usuario.nome, novo: usuario.acessos === 1 });
}
