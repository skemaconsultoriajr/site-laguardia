import { getUser } from './_auth.js';
import { SITE_HTML } from './_site.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default function handler(req, res) {
  const user = getUser(req);
  if (!user) {
    res.setHeader('Location', '/login.html');
    return res.status(302).end();
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(SITE_HTML.replace('__USER_NAME__', esc(user.name)));
}
