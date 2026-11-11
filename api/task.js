import { requireUser, readJson } from './_auth.js';
import { rest, ensureUser } from './_db.js';

const OK = ['A fazer', 'Em andamento', 'Concluída'];

export default async function handler(req, res) {
  const user = requireUser(req, res); if (!user) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const { id, status } = await readJson(req);
    if (!id || !OK.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    const tarefa_id = String(id).slice(0, 120);
    const em = new Date().toISOString();
    await ensureUser(user);
    await rest('tarefas_status?on_conflict=tarefa_id', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: { tarefa_id, status, atualizado_por: user.login, atualizado_em: em },
    });
    await rest('tarefas_historico', { method: 'POST', prefer: 'return=minimal', body: { tarefa_id, status, login: user.login, em } });
    return res.status(200).json({ ok: true, doc: { status, por: user.name, em } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
