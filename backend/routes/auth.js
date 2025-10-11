// backend/routes/auth.js
const router = require('express').Router();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require(path.join(__dirname, '..', 'models', 'User')); // case-safe
const { auth } = require('../auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[auth] WARNING: JWT_SECRET not set. Using a dev fallback secret.');
}

/* ---------------- DEV register (optional) ---------------- */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'missing fields' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const u = await User.create({
      name,
      email: String(email).trim().toLowerCase(),
      passwordHash,
      role,
    });
    res.json({ id: u._id });
  } catch (e) {
    console.error('REGISTER ERROR', e);
    res.status(400).json({ error: 'register failed' });
  }
});

/* ---------------- LOGIN (email OR userId + password) ---------------- */
router.post('/login', async (req, res) => {
  try {
    const emailNorm = String(req.body?.email || '').trim().toLowerCase();
    const userId    = String(req.body?.userId || '').trim();
    const password  = String(req.body?.password || '');
    if (!password) return res.status(400).json({ error: 'password required' });

    let u = null;
    if (emailNorm) u = await User.findOne({ email: emailNorm });
    if (!u && userId) u = await User.findOne({ userId });
    if (!u) return res.status(401).json({ error: 'invalid credentials' });
    if (u.status !== 'active') return res.status(403).json({ error: 'inactive user' });

    const ok = await bcrypt.compare(password, u.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign(
      { id: u._id, role: u.role, name: u.name, email: u.email, userId: u.userId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = {
      _id: u._id,
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

    res.json({ token, role: u.role, name: u.name, id: u._id, user: safeUser });
  } catch (e) {
    console.error('LOGIN ERROR', e);
    res.status(500).json({ error: 'server error' });
  }
});

/* ---------------- LOGIN for mobile (userId/email + PIN) ----------------
   Accept ALIASES so the app can post to any of these:
   - /login-staff
   - /staff-login
   - /mobile-login
----------------------------------------------------------------------- */
const staffLoginPaths = ['/login-staff', '/staff-login', '/mobile-login'];
router.post(staffLoginPaths, async (req, res) => {
  try {
    const userId = String(req.body?.userId || '').trim();
    const email  = String(req.body?.email || '').trim().toLowerCase();
    const pin    = String(req.body?.pin || '');

    if ((!userId && !email) || !pin) {
      return res.status(400).json({ error: 'userId/email & pin required' });
    }

    let u = null;
    if (userId) u = await User.findOne({ userId });
    if (!u && email) u = await User.findOne({ email });
    if (!u) return res.status(401).json({ error: 'invalid credentials' });
    if (u.status !== 'active') return res.status(403).json({ error: 'inactive user' });

    const ok = await bcrypt.compare(pin, u.pinHash || '');
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign(
      { id: u._id, role: u.role, name: u.name, userId: u.userId, email: u.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const safeUser = {
      _id: u._id,
      name: u.name,
      userId: u.userId,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      status: u.status || 'active',
      mustChangePassword: !!u.mustChangePassword,
    };

    res.json({ token, role: u.role, name: u.name, id: u._id, user: safeUser });
  } catch (e) {
    console.error('LOGIN STAFF ERROR', e);
    res.status(500).json({ error: 'server error' });
  }
});

/* ---------------- ME ---------------- */
router.get('/me', auth(), async (req, res) => {
  try {
    res.json(req.user);
  } catch {
    res.status(500).json({ error: 'failed to fetch me' });
  }
});

/* ---------------- CHANGE PASSWORD ---------------- */
router.post('/change-password', auth(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'password too short' });
    }

    const u = await User.findById(req.user._id);
    if (!u) return res.status(404).json({ error: 'user not found' });

    const ok = await bcrypt.compare(String(currentPassword || ''), u.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'current password incorrect' });

    u.passwordHash = await bcrypt.hash(String(newPassword), 10);
    u.mustChangePassword = false;
    await u.save();

    res.json({ ok: true });
  } catch (e) {
    console.error('CHANGE PASSWORD ERROR', e);
    res.status(500).json({ error: 'change password failed' });
  }
});

module.exports = router;
