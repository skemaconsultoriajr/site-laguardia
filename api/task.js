import { requireUser, readJson } from './_auth.js';
import { hset } from './_store.js';

const OK = ['A fazer', 'Em andamento', 'Concluída'];

export default async function handler(req, res) {
  const user = requireUser(req, res); if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const { id, status } = await readJson(req);
    if (!id || !OK.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    const doc = { status, por: user.name, em: new Date().toISOString() };
    await hset('lg:tarefas', String(id).slice(0, 120), doc);
    return res.status(200).json({ ok: true, doc });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
