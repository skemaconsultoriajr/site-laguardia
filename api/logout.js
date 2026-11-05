import { clearCookie } from './_auth.js';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', clearCookie());
  res.setHeader('Location', '/login.html');
  return res.status(302).end();
}
