const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ALLOWED = (process.env.ALLOWED_EMAILS||'').split(',').map(s=>s.trim()).filter(Boolean);

module.exports = async (req, res, next) => {
  try {
    const m = /Bearer (.+)/.exec(req.headers.authorization || '');
    if (!m) return res.sendStatus(401);
    const ticket = await client.verifyIdToken({ idToken: m[1], audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (ALLOWED.length && !ALLOWED.includes(payload.email)) return res.sendStatus(403);
    req.user = { email: payload.email, sub: payload.sub, name: payload.name };
    next();
  } catch {
    res.sendStatus(401);
  }
};
