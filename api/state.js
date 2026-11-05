import { requireUser } from './_auth.js';
import { storeReady, hgetall, hset, setnx } from './_store.js';
import { SEED_ENTREGAS, SEED_TAREFAS } from './_seed.js';

export default async function handler(req, res) {
  const user = requireUser(req, res); if (!user) return;
  if (!storeReady()) {
    return res.status(200).json({ user: user.name, storeReady: false, blobReady: Boolean(process.env.BLOB_READ_WRITE_TOKEN), tarefas: SEED_TAREFAS, entregas: SEED_ENTREGAS });
  }
  try {
    if ((await setnx('lg:seeded', new Date().toISOString())) === 'OK') {
      for (const [id, d] of Object.entries(SEED_ENTREGAS)) await hset('lg:entregas', id, d);
      for (const [id, d] of Object.entries(SEED_TAREFAS)) await hset('lg:tarefas', id, d);
    }
    const [tarefas, entregas] = await Promise.all([hgetall('lg:tarefas'), hgetall('lg:entregas')]);
    return res.status(200).json({ user: user.name, storeReady: true, blobReady: Boolean(process.env.BLOB_READ_WRITE_TOKEN), tarefas, entregas });
  } catch (e) {
    return res.status(500).json({ error: 'Não deu para carregar os dados: ' + e.message });
  }
}
