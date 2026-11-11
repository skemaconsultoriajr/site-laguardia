// Anexos das entregas no Supabase Storage (pasta "anexos"). Limite de 4,4 MB por arquivo (limite das funções da Vercel).
import crypto from 'node:crypto';
import { requireUser, readJson } from './_auth.js';
import { dbReady, uploadFile, deleteFile } from './_db.js';

export default async function handler(req, res) {
  const user = requireUser(req, res); if (!user) return;
  if (!dbReady()) return res.status(500).json({ error: 'Armazenamento não configurado. Cole o link do arquivo.' });
  try {
    if (req.method === 'DELETE') {
      const { url } = await readJson(req);
      await deleteFile(String(url || ''));
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
    const name = String(req.query.name || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
    const entrega = String(req.query.entrega || 'geral').replace(/[^\w-]+/g, '');
    const chunks = []; let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 4.4 * 1024 * 1024) return res.status(413).json({ error: 'Arquivo maior que 4,4 MB. Cole o link do SharePoint ou do Drive.' });
      chunks.push(c);
    }
    const type = req.headers['content-type'] || 'application/octet-stream';
    const url = await uploadFile(`${entrega}/${crypto.randomBytes(6).toString('hex')}-${name}`, Buffer.concat(chunks), type);
    return res.status(200).json({ ok: true, url, size, contentType: type, por: user.name });
  } catch (e) {
    return res.status(500).json({ error: 'Não foi possível anexar: ' + e.message });
  }
}
