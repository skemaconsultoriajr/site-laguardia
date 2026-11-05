// Anexos das entregas no Vercel Blob. Limite de 4,5 MB por arquivo (limite das funções da Vercel).
import { put, del } from '@vercel/blob';
import { requireUser, readJson } from './_auth.js';

export default async function handler(req, res) {
  const user = requireUser(req, res); if (!user) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: 'Armazenamento de arquivos não configurado (Vercel Blob). Cole o link do arquivo.' });
  try {
    if (req.method === 'DELETE') {
      const { url } = await readJson(req);
      if (url && String(url).includes('.blob.vercel-storage.com')) await del(url);
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
    const name = String(req.query.name || 'arquivo').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
    const entrega = String(req.query.entrega || 'geral').replace(/[^\w-]+/g, '');
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > 4.4 * 1024 * 1024) return res.status(413).json({ error: 'Arquivo maior que 4,4 MB. Cole o link do SharePoint ou Drive.' }); chunks.push(c); }
    const blob = await put(`entregas/${entrega}/${name}`, Buffer.concat(chunks), {
      access: 'public', addRandomSuffix: true, contentType: req.headers['content-type'] || 'application/octet-stream',
    });
    return res.status(200).json({ ok: true, url: blob.url, size, contentType: req.headers['content-type'] || '', por: user.name });
  } catch (e) {
    return res.status(500).json({ error: 'Não foi possível anexar: ' + e.message });
  }
}
