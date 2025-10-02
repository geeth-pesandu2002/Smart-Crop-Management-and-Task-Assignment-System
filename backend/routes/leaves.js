// backend/routes/leaves.js
const router = require('express').Router();
const Leave  = require('../models/Leave');
const { auth } = require('../auth');

// ---- helpers ----
function parseDateAny(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input) ? null : input;

  // Try native first
  const n = new Date(input);
  if (!isNaN(n)) return n;

  // dd/mm/yyyy or mm/dd/yyyy
  const m = /^(\d{2})[\/-](\d{2})[\/-](\d{4})$/.exec(String(input).trim());
  if (m) {
    const A = new Date(`${m[3]}-${m[1]}-${m[2]}T00:00:00`);
    if (!isNaN(A)) return A;
    const B = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);
    if (!isNaN(B)) return B;
  }
  return null;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// ---- Create/approve a leave ----
router.post('/', auth(['manager']), async (req, res) => {
  try {
    const { user, startDate, endDate, reason = '' } = req.body || {};
    if (!user || !startDate || !endDate) {
      return res.status(400).json({ error: 'user, startDate and endDate are required' });
    }

    const s = parseDateAny(startDate);
    const e = endOfDay(parseDateAny(endDate));
    if (!s || !e || e < s) return res.status(400).json({ error: 'Invalid date range' });

    // Disallow overlapping approved leaves: (start <= e) AND (end >= s)
    const overlap = await Leave.findOne({
      user,
      status: 'approved',
      startDate: { $lte: e },
      endDate:   { $gte: s },
    });
    if (overlap) return res.status(409).json({ error: 'Overlapping leave exists' });

    const leave = await Leave.create({
      user, startDate: s, endDate: e, reason, createdBy: req.user._id,
    });

    res.json(leave);
  } catch (e) {
    console.error('[leaves] create error:', e);
    res.status(500).json({ error: e?.message || 'create failed' });
  }
});

// ---- List leaves (optional: user / date window) ----
router.get('/', auth(['manager']), async (req, res) => {
  try {
    const { user, from, to } = req.query || {};
    const q = {};
    if (user) q.user = user;

    const f = from ? parseDateAny(from) : null;
    const t = to   ? endOfDay(parseDateAny(to)) : null;

    if (f || t) {
      // any leave overlapping the window
      q.startDate = { ...(q.startDate || {}) };
      q.endDate   = { ...(q.endDate   || {}) };
      if (t) q.startDate.$lte = t;
      if (f) q.endDate.$gte   = f;
    }

    const items = await Leave.find(q)
      .sort({ startDate: -1 })
      .populate('user', 'name phone role status userId');

    res.json(items);
  } catch (e) {
    console.error('[leaves] list error:', e);
    res.status(500).json({ error: e?.message || 'list failed' });
  }
});

// ---- Leaves active on a given day (default today) ----
router.get('/active', auth(['manager']), async (req, res) => {
  try {
    const day = req.query.date ? parseDateAny(req.query.date) : new Date();
    if (!day) return res.status(400).json({ error: 'Bad date' });

    const items = await Leave.find({
      status: 'approved',
      startDate: { $lte: day },
      endDate:   { $gte: day },
    }).populate('user', 'name phone role status userId');

    res.json(items);
  } catch (e) {
    console.error('[leaves] active error:', e);
    res.status(500).json({ error: e?.message || 'active failed' });
  }
});

// ---- Extend a leave's end date ----
router.patch('/:id/extend', auth(['manager']), async (req, res) => {
  try {
    const { endDate } = req.body || {};
    const newEnd = endOfDay(parseDateAny(endDate));
    if (!newEnd) return res.status(400).json({ error: 'Invalid endDate' });

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: 'not found' });
    if (newEnd < leave.startDate) {
      return res.status(400).json({ error: 'endDate must be >= startDate' });
    }
    if (newEnd <= leave.endDate) {
      return res.status(400).json({ error: 'endDate must be later than current endDate' });
    }

    leave.endDate = newEnd;
    await leave.save();
    res.json(leave);
  } catch (e) {
    console.error('[leaves] extend error:', e);
    res.status(500).json({ error: e?.message || 'extend failed' });
  }
});

// ---- End leave today ----
router.patch('/:id/end-today', auth(['manager']), async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { endDate: endOfDay(new Date()), status: 'ended' },
      { new: true }
    );
    if (!leave) return res.status(404).json({ error: 'not found' });
    res.json(leave);
  } catch (e) {
    console.error('[leaves] end-today error:', e);
    res.status(500).json({ error: e?.message || 'end-today failed' });
  }
});

module.exports = router;
