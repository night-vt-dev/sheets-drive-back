const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ALLOWED = (process.env.ALLOWED_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);

function getAudienceList() {
	const main = process.env.GOOGLE_CLIENT_ID || '';
	const extra = (process.env.EXTRA_GOOGLE_CLIENT_IDS || '')
		.split(',').map(s => s.trim()).filter(Boolean);
	return [main, ...extra].filter(Boolean);
}

module.exports = async (req, res, next) => {
	try {
		const m = /Bearer (.+)/.exec(req.headers.authorization || '');
		if (!m) return res.sendStatus(401);
		const audience = getAudienceList(); 
		const ticket = await client.verifyIdToken({ idToken: m[1], audience: audience });
		const payload = ticket.getPayload();
		if (ALLOWED.length && !ALLOWED.includes(payload.email)) return res.sendStatus(403);
		req.user = { email: payload.email, sub: payload.sub, name: payload.name };
		next();
	} catch (e) {
		console.warn('Auth fail:', e?.message);
		res.sendStatus(401);
	}
};
