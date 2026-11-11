// Acesso ao Supabase pela API REST (PostgREST e Storage), só do lado do servidor.
const URL_ = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

export const dbReady = () => Boolean(URL_ && KEY);

const headers = extra => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, ...extra });

export async function rest(path, { method = 'GET', body, prefer } = {}) {
  if (!dbReady()) throw new Error('Banco de dados não configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel).');
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: headers({ 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error((data && (data.message || data.error)) || `Supabase respondeu ${r.status}`);
  return data;
}

export async function uploadFile(path, buffer, contentType) {
  if (!dbReady()) throw new Error('Banco de dados não configurado.');
  const clean = path.split('/').map(encodeURIComponent).join('/');
  const r = await fetch(`${URL_}/storage/v1/object/anexos/${clean}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': contentType || 'application/octet-stream', 'x-upsert': 'false' }),
    body: buffer,
  });
  if (!r.ok) { const t = await r.text(); throw new Error(`Falha no envio (${r.status}): ${t.slice(0, 160)}`); }
  return `${URL_}/storage/v1/object/public/anexos/${clean}`;
}

export async function deleteFile(publicUrl) {
  const marker = '/storage/v1/object/public/anexos/';
  if (!publicUrl || !publicUrl.startsWith(URL_ + marker)) return;
  const path = publicUrl.slice((URL_ + marker).length);
  await fetch(`${URL_}/storage/v1/object/anexos`, {
    method: 'DELETE', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: [decodeURIComponent(path)] }),
  });
}

// Login = nome sem acentos, minúsculo, espaços simples. "Gustavo", " gustavo " e "GUSTAVO" viram a mesma pessoa.
export function toLogin(nome) {
  return String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
