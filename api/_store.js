// Armazenamento em Upstash Redis (Vercel Marketplace) pela API REST — sem dependências.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeReady = () => Boolean(URL_ && TOKEN);

async function cmd(...args) {
  if (!storeReady()) throw new Error('Banco de dados não configurado na Vercel (Upstash Redis).');
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
export async function hgetall(key) {
  const arr = (await cmd('HGETALL', key)) || [];
  const out = {};
  for (let i = 0; i < arr.length; i += 2) {
    try { out[arr[i]] = JSON.parse(arr[i + 1]); } catch { /* ignora valor inválido */ }
  }
  return out;
}
export async function hget(key, field) {
  const v = await cmd('HGET', key, field);
  return v ? JSON.parse(v) : null;
}
export const hset = (key, field, value) => cmd('HSET', key, field, JSON.stringify(value));
export const hdel = (key, field) => cmd('HDEL', key, field);
export const setnx = (key, value) => cmd('SET', key, value, 'NX');
