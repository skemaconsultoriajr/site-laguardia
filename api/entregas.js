import crypto from 'node:crypto';
import { requireUser, readJson } from './_auth.js';
import { hget, hset, hdel } from './_store.js';

const FIELDS = ['titulo', 'tipo', 'frente', 'resp', 'apresentacao', 'envio', 'status', 'arquivos', 'notas', 'gostou', 'alteracoes', 'conteudo', 'clausula'];
const clean = data => Object.fromEntries(Object.entries(data || {}).filter(([k]) => FIELDS.includes(k)));

export default async function handler(req, res) {
  const user = requireUser(req, res); if (!user) return;
  try {
    const body = req.method === 'GET' ? {} : await readJson(req);
    const stamp = { atualizadaPor: user.name, atualizadaEm: new Date().toISOString() };
    if (req.method === 'POST') {
      const doc = { arquivos: [], notas: '', gostou: '', alteracoes: '', status: 'A fazer', ...clean(body.doc), criadaPor: user.name, criadaEm: stamp.atualizadaEm, ...stamp };
      if (!doc.titulo) return res.status(400).json({ error: 'Dê um nome para a entrega.' });
      const id = 'x-' + crypto.randomBytes(5).toString('hex');
      await hset('lg:entregas', id, doc);
      return res.status(200).json({ ok: true, id, doc });
    }
    if (req.method === 'PATCH') {
      const cur = await hget('lg:entregas', String(body.id));
      if (!cur) return res.status(404).json({ error: 'Entrega não encontrada.' });
      const doc = { ...cur, ...clean(body.data), ...stamp };
      await hset('lg:entregas', String(body.id), doc);
      return res.status(200).json({ ok: true, doc });
    }
    if (req.method === 'DELETE') {
      await hdel('lg:entregas', String(body.id));
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Método não aceito.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
