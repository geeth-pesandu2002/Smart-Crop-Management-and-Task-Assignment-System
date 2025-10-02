// backend/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth } = require('../auth');

/* ---------- helpers ---------- */
function pad(n, width = 4) { return String(n).padStart(width, '0'); }
async function nextUserId(prefix) {
  // Find highest sequence for this prefix (e.g., FS-0001, SV-0003)
  const rx = new RegExp(`^${prefix}-\\d{4}$`);
  const latest = await User.find({ userId: { $regex: rx } })
    .sort({ userId: -1 })
    .limit(1)
    .lean();
  const last = latest[0]?.userId?.split('-')?.[1];
  const seq = Number(last || 0) + 1;
  return `${prefix}-${pad(seq)}`;
}
function randPin4() {
  return pad(Math.floor(Math.random() * 10000), 4);
}

/* ---------- list users (filter/search) ---------- */
router.get('/', auth(['manager']), async (req, res) => {
  try {
    const { role, status, q } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (q) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { userId: rx }];
    }
    const users = await User.find(filter)
      .select('_id userId name email role phone status gender joinedAt address avatarUrl mustChangePassword')
      .sort('name');
    res.json(users);
  } catch (e) {
    console.error('list users error', e);
    res.status(500).json({ error: 'failed to list users' });
  }
});

/* ---------- create staff/supervisor ---------- */
router.post('/', auth(['manager']), async (req, res) => {
  try {
    const {
      name,
      role = 'staff',
      phone = '',
      gender = 'other',
      joinedAt,
      address = '',
      password = '',
      email,          // optional (supervisors might have email)
      pin             // optional custom PIN (4–6 digits)
    } = req.body || {};

    if (!name) return res.status(400).json({ error: 'name required' });
    if (!['staff', 'supervisor'].includes(role)) {
      return res.status(400).json({ error: 'invalid role' });
    }

    const prefix = role === 'supervisor' ? 'SV' : 'FS';
    const userId = await nextUserId(prefix);

    // Password
    const tempPassword = password && password.length >= 6
      ? password
      : Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // PIN (default 4 digits)
    const chosenPin = pin && /^\d{4,6}$/.test(String(pin)) ? String(pin) : randPin4();
    const pinHash = await bcrypt.hash(chosenPin, 10);

    const u = await User.create({
      userId,
      name,
      role,
      phone,
      gender,
      joinedAt: joinedAt ? new Date(joinedAt) : undefined,
      address,
      email: email ? String(email).trim().toLowerCase() : undefined,
      status: 'active',
      passwordHash,
      mustChangePassword: true,
      pinHash,
      pinUpdatedAt: new Date(),
    });

    res.json({
      id: u._id,
      userId,
      tempPassword,
      tempPin: chosenPin,
    });
  } catch (e) {
    console.error('create user failed', e);
    res.status(400).json({ error: 'create user failed' });
  }
});

/* ---------- update user ---------- */
router.patch('/:id', auth(['manager']), async (req, res) => {
  try {
    const allowed = (({
      name, phone, role, status, gender, joinedAt, address, avatarUrl, email
    }) => ({ name, phone, role, status, gender, joinedAt, address, avatarUrl, email }))(req.body || {});
    if (allowed.email) allowed.email = String(allowed.email).trim().toLowerCase();
    if (allowed.joinedAt) allowed.joinedAt = new Date(allowed.joinedAt);

    const updated = await User.findByIdAndUpdate(req.params.id, allowed, { new: true })
      .select('_id userId name email role phone status gender joinedAt address avatarUrl mustChangePassword');
    res.json(updated);
  } catch (e) {
    console.error('update user failed', e);
    res.status(400).json({ error: 'update failed' });
  }
});

/* ---------- explicit status toggle (optional) ---------- */
router.patch('/:id/status', auth(['manager']), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['active', 'on_leave'].includes(status)) {
      return res.status(400).json({ error: 'bad status' });
    }
    const u = await User.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .select('_id name status');
    res.json(u);
  } catch (e) {
    console.error('status update failed', e);
    res.status(400).json({ error: 'status update failed' });
  }
});

/* ---------- reset password (returns temp once) ---------- */
router.post('/:id/reset-password', auth(['manager']), async (req, res) => {
  try {
    const temp = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(temp, 10);
    await User.findByIdAndUpdate(req.params.id, { passwordHash, mustChangePassword: true });
    res.json({ ok: true, tempPassword: temp });
  } catch (e) {
    console.error('reset password failed', e);
    res.status(400).json({ error: 'reset failed' });
  }
});

/* ---------- reset PIN (returns temp once) ---------- */
router.post('/:id/reset-pin', auth(['manager']), async (req, res) => {
  try {
    const pin = randPin4();
    const pinHash = await bcrypt.hash(pin, 10);
    await User.findByIdAndUpdate(req.params.id, { pinHash, pinUpdatedAt: new Date() });
    res.json({ ok: true, tempPin: pin });
  } catch (e) {
    console.error('reset pin failed', e);
    res.status(400).json({ error: 'reset pin failed' });
  }
});

/* ---------- delete user ---------- */
router.delete('/:id', auth(['manager']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error('delete user failed', e);
    res.status(400).json({ error: 'delete failed' });
  }
});

module.exports = router;
