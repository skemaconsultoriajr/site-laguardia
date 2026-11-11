import crypto from 'node:crypto';
import { requireUser, readJson } from './_auth.js';
import { rest } from './_db.js';

const FIELDS = ['titulo', 'tipo', 'frente', 'resp', 'apresentacao', 'envio', 'status', 'arquivos', 'notas', 'gostou', 'alteracoes', 'conteudo', 'clausula'];
const clean = data => Object.fromEntries(Object.entries(data || {}).filter(([k]) => FIELDS.includes(k)));
const enc = encodeURIComponent;

export default async function handler(req, res) {
  const user = requireUser(req, res); if (!user) return;
  try {
    const body = req.method === 'GET' ? {} : await readJson(req);
    const agora = new Date().toISOString();
    if (req.method === 'POST') {
      const dados = { arquivos: [], notas: '', gostou: '', alteracoes: '', status: 'A fazer', ...clean(body.doc), criadaPor: user.name };
      if (!dados.titulo) return res.status(400).json({ error: 'Dê um nome para a entrega.' });
      const id = 'x-' + crypto.randomBytes(5).toString('hex');
      await rest('entregas', { method: 'POST', prefer: 'return=minimal', body: { id, dados, criada_por: user.name, atualizada_por: user.name, atualizada_em: agora } });
      return res.status(200).json({ ok: true, id });
    }
    if (req.method === 'PATCH') {
      const id = String(body.id || '');
      const atual = await rest(`entregas?id=eq.${enc(id)}&select=dados`);
      if (!atual.length) return res.status(404).json({ error: 'Entrega não encontrada.' });
      const dados = { ...atual[0].dados, ...clean(body.data) };
      await rest(`entregas?id=eq.${enc(id)}`, { method: 'PATCH', prefer: 'return=minimal', body: { dados, atualizada_por: user.name, atualizada_em: agora } });
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      await rest(`entregas?id=eq.${enc(String(body.id || ''))}`, { method: 'DELETE', prefer: 'return=minimal' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Método não aceito.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
