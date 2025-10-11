// backend/auth.js
const jwt = require('jsonwebtoken');
const User = require('./models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[auth] WARNING: JWT_SECRET not set. Using a dev fallback secret.');
}

/**
 * Role-aware auth middleware.
 */
module.exports.auth = (roles = []) => async (req, res, next) => {
  try {
    const hdr = String(req.headers.authorization || '');
    const parts = hdr.split(' ');
    const token = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : '';
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const u = await User.findById(payload.id);
    if (!u) return res.status(401).json({ error: 'unauthorized' });

    if (roles.length && !roles.includes(u.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Expose BOTH _id and id (string) so older code keeps working
    req.user = {
      _id: u._id,
      id: String(u._id),
      name: u.name,
      email: u.email,
      userId: u.userId,
      role: u.role,
      phone: u.phone || '',
      status: u.status || 'active',
      gender: u.gender,
      joinedAt: u.joinedAt,
      mustChangePassword: !!u.mustChangePassword,
    };

    next();
  } catch (e) {
    console.error('[auth] middleware error:', e);
    res.status(401).json({ error: 'unauthorized' });
  }
};
