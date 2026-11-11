import { requireUser } from './_auth.js';
import { dbReady, rest } from './_db.js';
import { SEED_ENTREGAS, SEED_TAREFAS } from './_seed.js';

export default async function handler(req, res) {
  const user = requireUser(req, res); if (!user) return;
  if (!dbReady()) {
    return res.status(200).json({ user: user.name, login: user.login, dbReady: false, tarefas: SEED_TAREFAS, entregas: SEED_ENTREGAS, usuarios: [] });
  }
  try {
    const [status, entregas, usuarios] = await Promise.all([
      rest('tarefas_status?select=tarefa_id,status,atualizado_por,atualizado_em'),
      rest('entregas?select=id,dados,atualizada_por,atualizada_em'),
      rest('usuarios?select=login,nome,ultimo_acesso,acessos&order=ultimo_acesso.desc'),
    ]);
    const nomes = Object.fromEntries(usuarios.map(u => [u.login, u.nome]));
    const tarefas = Object.fromEntries(status.map(t => [t.tarefa_id, { status: t.status, por: nomes[t.atualizado_por] || '', em: t.atualizado_em }]));
    const ents = Object.fromEntries(entregas.map(e => [e.id, { ...e.dados, atualizadaPor: e.atualizada_por || e.dados.atualizadaPor, atualizadaEm: e.atualizada_em }]));
    return res.status(200).json({ user: user.name, login: user.login, dbReady: true, tarefas, entregas: ents, usuarios });
  } catch (e) {
    return res.status(500).json({ error: 'Não deu para carregar os dados: ' + e.message });
  }
}
