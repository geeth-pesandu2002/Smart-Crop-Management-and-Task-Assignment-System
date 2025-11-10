// backend/routes/users.js
const path = require('path');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
// NOTE: keep model import all-lowercase to avoid Windows/Linux casing issues
const User = require(path.join(__dirname, '..', 'models', 'user'));
const { auth } = require('../auth');

/* ---------- helpers ---------- */
function pad(n, width = 4) { return String(n).padStart(width, '0'); }
async function nextUserId(prefix) {
  const rx = new RegExp(`^${prefix}-\\d{4}$`);
  const latest = await User.find({ userId: { $regex: rx } })
    .sort({ userId: -1 })
    .limit(1)
    .lean();
  const last = latest[0]?.userId?.split('-')?.[1];
  const seq  = Number(last || 0) + 1;
  return `${prefix}-${pad(seq)}`;
}
function randPin4() { return pad(Math.floor(Math.random() * 10000), 4); }

/* ---------- list users ---------- */
router.get('/', auth(['manager']), async (req, res) => {
  try {
    const { role, status, q } = req.query;
    const filter = {};
    if (role)   filter.role   = role;
    if (status) filter.status = status;
    if (q) {
      const rx = new RegExp(String(q).trim(), 'i');
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
      role:   roleRaw = 'staff',
      phone = '',
      gender: genderRaw = 'other',
      joinedAt: joinedAtRaw,
      address = '',
      password = '',
      email:  emailRaw,     // may be absent/blank
      pin:    pinRaw
    } = req.body || {};

    if (!name) return res.status(400).json({ error: 'name required' });

    // Normalize role labels from the UI (e.g. "Field Staff")
    const roleKey = String(roleRaw).trim().toLowerCase().replace(/\s+/g, ' ');
    const roleMap = { 'field staff': 'staff', 'field_staff': 'staff', staff: 'staff', supervisor: 'supervisor' };
    const role = roleMap[roleKey];
    if (!role) return res.status(400).json({ error: 'invalid role' });

    // Normalize gender
    const g = String(genderRaw).trim().toLowerCase();
    const gender = ['male', 'female', 'other'].includes(g) ? g : 'other';

    // Accept email only if non-empty, valid, and not the manager's own email
    const creatorEmail = (req.user?.email || '').trim().toLowerCase();
    let email;
    if (typeof emailRaw === 'string') {
      const e = emailRaw.trim().toLowerCase();
      const looksLikeEmail = /\S+@\S+\.\S+/.test(e);
      if (e && looksLikeEmail && e !== creatorEmail) email = e;
      // else leave as undefined so it doesn't get indexed
    }

    // Parse joined date
    let joinedAt;
    if (joinedAtRaw) {
      const d = new Date(joinedAtRaw);
      if (!isNaN(d.getTime())) joinedAt = d;
    }

    // IDs, passwords, PINs
    const prefix = role === 'supervisor' ? 'SV' : 'FS';
    const userId = await nextUserId(prefix);

    const tempPassword = password && password.length >= 6
      ? password
      : Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const chosenPin = pinRaw && /^\d{4,6}$/.test(String(pinRaw)) ? String(pinRaw) : randPin4();
    const pinHash   = await bcrypt.hash(chosenPin, 10);

    const u = await User.create({
      userId,
      name: String(name).trim(),
      role,
      phone: String(phone).trim(),
      gender,
      joinedAt,
      address: String(address).trim(),
      email,                     // undefined if blank/invalid → not indexed
      status: 'active',
      passwordHash,
      mustChangePassword: true,
      pinHash,
      pinUpdatedAt: new Date(),
    });

    res.json({ id: u._id, userId, tempPassword, tempPin: chosenPin });
  } catch (e) {
    if (e && e.code === 11000) {
      // Unique index violation (likely the email index)
      const key = Object.keys(e.keyPattern || e.keyValue || {})[0] || 'field';
      return res.status(409).json({ error: `duplicate ${key}` });
    }
    console.error('create user failed', e);
    res.status(400).json({ error: 'create user failed', details: String(e?.message || e) });
  }
});

/* ---------- update / status / reset / delete ---------- */
router.patch('/:id', auth(['manager']), async (req, res) => {
  try {
    const allowed = (({
      name, phone, role, status, gender, joinedAt, address, avatarUrl, email
    }) => ({ name, phone, role, status, gender, joinedAt, address, avatarUrl, email }))(req.body || {});
    if (allowed.email) {
      const e = String(allowed.email).trim().toLowerCase();
      allowed.email = /\S+@\S+\.\S+/.test(e) ? e : undefined;
    }
    if (allowed.joinedAt) {
      const d = new Date(allowed.joinedAt);
      allowed.joinedAt = isNaN(d.getTime()) ? undefined : d;
    }
    if (allowed.gender) {
      const gg = String(allowed.gender).trim().toLowerCase();
      if (!['male', 'female', 'other'].includes(gg)) delete allowed.gender; else allowed.gender = gg;
    }
    if (allowed.role) {
      const r = String(allowed.role).trim().toLowerCase().replace(/\s+/g, ' ');
      allowed.role = r === 'field staff' ? 'staff' : r;
      if (!['staff', 'supervisor', 'manager'].includes(allowed.role)) delete allowed.role;
    }
    const updated = await User.findByIdAndUpdate(req.params.id, allowed, { new: true })
      .select('_id userId name email role phone status gender joinedAt address avatarUrl mustChangePassword');
    res.json(updated);
  } catch (e) {
    console.error('update user failed', e);
    res.status(400).json({ error: 'update failed' });
  }
});

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

router.delete('/:id', auth(['manager']), async (req, res) => {
  try {
    const userId = req.params.id;
    const mongoose = require('mongoose');
    const userObjId = mongoose.Types.ObjectId(userId);

    // Remove user from all groups
    const Group = require('../models/Group');
    await Group.updateMany({}, { $pull: { members: userObjId } });

    // Delete all tasks assigned to or created by the user
  const Task = require('../models/task');
    await Task.deleteMany({ $or: [ { assignedTo: userObjId }, { createdBy: userObjId } ] });

    // Delete all leaves for the user
    const Leave = require('../models/Leave');
    await Leave.deleteMany({ user: userObjId });

    // Delete all reports by the user
    const Report = require('../models/Report');
    await Report.deleteMany({ userId: userObjId });

    // Delete all resource usages created by the user
    const ResourceUsage = require('../models/ResourceUsage');
    await ResourceUsage.deleteMany({ createdBy: userObjId });

    // Delete all issues reported by the user
    const Issue = require('../models/Issue');
    await Issue.deleteMany({ reportedBy: userObjId });

    // Remove user as manager from plots
    const Plot = require('../models/Plot');
    await Plot.updateMany({ manager: userObjId }, { $unset: { manager: "" } });

    // Finally, delete the user document
    await User.findByIdAndDelete(userObjId);
    res.json({ ok: true });
  } catch (e) {
    console.error('delete user failed', e);
    res.status(400).json({ error: 'delete failed' });
  }
});

module.exports = router;
