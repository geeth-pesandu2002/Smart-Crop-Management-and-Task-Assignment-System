// backend/routes/tasks.js
const path = require('path');
const express = require('express');
const router = express.Router();
const Task  = require(path.join(__dirname, '..', 'models', 'Task.js'));
const Group = require(path.join(__dirname, '..', 'models', 'Group.js'));
const Plot  = require(path.join(__dirname, '..', 'models', 'Plot.js'));
const { auth } = require('../auth');
const multer = require('multer');

const ALLOW_MANAGER_STATUS_OVERRIDE =
  String(process.env.ALLOW_MANAGER_STATUS_OVERRIDE || 'false') === 'true';

/* ---------------- Helpers for mobile sync ---------------- */
const toServerStatus = (s) => (s === 'done' ? 'completed' : s);
const toMobileStatus = (s) => (s === 'completed' ? 'done' : s);

/** Visibility: direct assignee OR any shared group task */
const visibilityForUser = (user) => ({
  $or: [
    { assignedTo: user?._id },
    { groupId: { $exists: true, $ne: null } },
  ],
});

/** Sinhala-friendly plot label (e.g., "Plot D" -> "D") */
function toSiPlotLabel(fieldName) {
  if (!fieldName) return null;
  const cleaned = String(fieldName)
    .replace(/_/g, ' ')
    .replace(/^\s*(plot|field|section)\s*/i, '')
    .trim();
  return cleaned || null;
}

/** Is this user the task assignee OR a member of the task's group? */
async function isAssigneeOrGroupMember(taskDoc, userId) {
  if (!taskDoc) return false;
  if (taskDoc.assignedTo && String(taskDoc.assignedTo) === String(userId)) return true;
  if (taskDoc.groupId) {
    const g = await Group.findById(taskDoc.groupId).select('members').lean();
    if (g?.members?.some((m) => String(m) === String(userId))) return true;
  }
  return false;
}

/* ---------------- voice upload ---------------- */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(__dirname, '..', 'uploads', 'voice')),
  filename: (_req, file, cb) =>
    cb(
      null,
      Date.now() +
        '_' +
        Math.random().toString(36).slice(2) +
        path.extname(file.originalname)
    ),
});
const upload = multer({ storage });

router.post('/voice', auth(['manager']), upload.single('voice'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const host = req.get('host');
  const proto = req.protocol || 'http';
  res.json({ url: `${proto}://${host}/api/uploads/voice/${req.file.filename}` });
});

/* ---------------- create task (individual or group) ---------------- */
router.post('/', auth(['manager']), async (req, res) => {
  try {
    const {
      title, description, assignedTo, groupId,
      priority = 'normal', dueDate, plotId, voiceUrl = '',
      sharedGroupTask = true, startDate
    } = req.body || {};

    if (!title) return res.status(400).json({ error: 'title required' });
    if (!assignedTo && !groupId) {
      return res.status(400).json({ error: 'assign to user or group' });
    }

    // individual
    if (assignedTo && !groupId) {
      const t = await Task.create({
        title, description, assignedTo, priority, dueDate, plotId, voiceUrl, createdBy: req.user._id, startDate
      });
      return res.json(t);
    }

    // group
    const group = await Group.findById(groupId).select('members');
    if (!group) return res.status(400).json({ error: 'group not found' });

    if (sharedGroupTask) {
      const t = await Task.create({
        title, description, groupId, priority, dueDate, plotId, voiceUrl, createdBy: req.user._id, startDate
      });
      return res.json(t);
    } else {
      const docs = group.members.map(m => ({
        title, description, assignedTo: m, priority, dueDate, plotId, voiceUrl, createdBy: req.user._id, startDate
      }));
      const created = await Task.insertMany(docs);
      return res.json(created);
    }
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'create failed' });
  }
});

/* ---------------- list tasks (manager) ---------------- */
router.get('/', auth(['manager']), async (req, res) => {
  const { status, priority, staff, group, plot, page = 1, limit = 10, sort = 'createdAt:desc' } = req.query;

  const q = {};
  if (status)   q.status = status;
  if (priority) q.priority = priority;
  if (staff)    q.assignedTo = staff;
  if (group)    q.groupId = group;
  if (plot)     q.plotId  = plot;

  let [sortField, sortDir] = (sort || '').split(':');
  if (!sortField) sortField = 'createdAt';
  const sortSpec = { [sortField]: (sortDir === 'asc' ? 1 : -1) };

  const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
  const perPage  = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip     = (pageNum - 1) * perPage;

  const [items, total] = await Promise.all([
    Task.find(q)
  .populate('assignedTo', 'name email gender address joinedAt phone')
      .populate('groupId', 'name')
      .populate('plotId', 'fieldName')
      .sort(sortSpec)
      .skip(skip)
      .limit(perPage),
    Task.countDocuments(q)
  ]);

  res.json({
    items,
    total,
    page: pageNum,
    limit: perPage,
    pages: Math.ceil(total / perPage)
  });
});

/* ---------------- my tasks (staff/supervisor/manager) ---------------- */
router.get('/mine', auth(), async (req, res) => {
  const since = Number(req.query.since || 0);
  const updatedSince = since ? { updatedAt: { $gte: new Date(since) } } : {};
  const q = { $and: [visibilityForUser(req.user), updatedSince] };
  const tasks = await Task.find(q)
    .populate('plotId', 'fieldName')
    .sort('-updatedAt');
  res.json(tasks);
});

/* ---------------- update status (assignee or group member ONLY) ---------------- */
router.patch('/:id/status', auth(), async (req, res) => {
  const { status } = req.body || {};
  if (!['pending','in_progress','blocked','completed'].includes(status)) {
    return res.status(400).json({ error: 'bad status' });
  }

  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });

  const allowedStaff = await isAssigneeOrGroupMember(t, req.user._id);
  const isManager = req.user.role === 'manager';

  // Manager cannot change unless the env flag is explicitly enabled AND a reason is provided.
  if (!allowedStaff) {
    if (!(isManager && ALLOW_MANAGER_STATUS_OVERRIDE)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'reason required' });
    t.notes = t.notes || [];
    t.notes.push({ by: req.user._id, text: `Manager override: ${reason}`, at: new Date() });
  }

  t.status = status;
  await t.save();
  res.json(t);
});

/* ---------------- edit task (manager) ---------------- */
router.put('/:id', auth(['manager']), async (req, res) => {
  const allowed = ['title','description','priority','dueDate','plotId','assignedTo','groupId','voiceUrl','startDate'];
  const patch = {};
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

  const t = await Task.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

/* ---------------- delete task (manager) ---------------- */
router.delete('/:id', auth(['manager']), async (req, res) => {
  const t = await Task.findByIdAndDelete(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

/* ---------------- summary for dashboard (manager) ---------------- */
router.get('/summary', auth(['manager']), async (_req, res) => {
  const counts = await Task.aggregate([{ $group: { _id: '$status', c: { $sum: 1 } } }]);
  const map = Object.fromEntries(counts.map(x => [x._id, x.c]));
  res.json({
    total: (map.pending||0)+(map.in_progress||0)+(map.blocked||0)+(map.completed||0),
    pending: map.pending||0,
    in_progress: map.in_progress||0,
    blocked: map.blocked||0,
    completed: map.completed||0
  });
});

/* ---------------- board view (manager) ---------------- */
router.get('/board', auth(['manager']), async (req, res) => {
  const { plot, staff, group, priority } = req.query;
  const q = {};
  if (priority) q.priority = priority;
  if (staff)    q.assignedTo = staff;
  if (group)    q.groupId = group;
  if (plot)     q.plotId  = plot;

  const all = await Task.find(q)
  .populate('assignedTo', 'name gender address joinedAt phone')
    .populate('groupId', 'name')
    .populate('plotId', 'fieldName')
    .sort('-createdAt');

  const buckets = { pending: [], in_progress: [], blocked: [], completed: [] };
  all.forEach(t => buckets[t.status]?.push(t));
  res.json(buckets);
});

/* ============================================================
   MOBILE SYNC ENDPOINTS
   ============================================================ */

router.post('/mobile-sync/push', auth(), async (req, res) => {
  try {
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
    const acceptedIds = [];

    for (const u of updates) {
      if (!u?.id) continue;
      const t = await Task.findById(u.id);
      if (!t) continue;

      // ✅ Only assignee or a member of the task's group can push status
      const allowed = await isAssigneeOrGroupMember(t, req.user._id);
      if (!allowed) continue;

      const mobileAt  = Number(u.updatedAt || 0);
      const serverAt  = Number(new Date(t.updatedAt).getTime());
      if (mobileAt && mobileAt < serverAt) continue; // stale client update

      const patch = { status: toServerStatus(u.status || t.status) };
      await Task.updateOne(
        { _id: t._id },
        { $set: { ...patch } },
        { timestamps: true }
      );

      acceptedIds.push(String(t._id));
    }

    res.json({ acceptedIds });
  } catch (e) {
    console.error('mobile-sync/push error:', e);
    res.status(400).json({ error: 'push failed' });
  }
});

/**
 * GET /api/tasks/mobile-sync/pull?since=<ms>
 */
router.get('/mobile-sync/pull', auth(), async (req, res) => {
  try {
    const since = Number(req.query?.since || 0);
    const sinceFilter = since ? { updatedAt: { $gt: new Date(since) } } : {};
    const q = { $and: [visibilityForUser(req.user), sinceFilter] };

    const rows = await Task.find(q)
      .populate('plotId', 'fieldName')
      .sort('-updatedAt')
      .lean();

    const tasks = rows.map(r => {
      const fieldName = r.plotId?.fieldName ?? null;
      return {
        id: String(r._id),
        title: r.title,
        description: r.description ?? null,
        status: toMobileStatus(r.status),
        priority: r.priority || 'normal',
        dueDate: r.dueDate ? Number(new Date(r.dueDate).getTime()) : null,
        plotCode: toSiPlotLabel(fieldName),
        updatedAt: Number(new Date(r.updatedAt).getTime()),
      };
    });

    res.json({ tasks });
  } catch (e) {
    console.error('mobile-sync/pull error:', e);
    res.status(400).json({ error: 'pull failed' });
  }
});

/**
 * GET /api/tasks/mobile/:id
 */
router.get('/mobile/:id', auth(), async (req, res) => {
  try {
    const r = await Task.findById(req.params.id)
      .populate('plotId', 'fieldName')
      .lean();
    if (!r) return res.status(404).json({ error: 'not found' });

    // Read allowed for manager; updates are restricted above
    const fieldName = r.plotId?.fieldName ?? null;

    return res.json({
      id: String(r._id),
      title: r.title || '',
      description: r.description ?? null,
      status: toMobileStatus(r.status),
      priority: r.priority || 'normal',
      dueDate: r.dueDate ? Number(new Date(r.dueDate).getTime()) : null,
      plotCode: toSiPlotLabel(fieldName),
      updatedAt: Number(new Date(r.updatedAt).getTime()),
    });
  } catch (e) {
    console.error('mobile detail error:', e);
    res.status(400).json({ error: 'detail failed' });
  }
});

/* =========================
   COMMENTS / NOTES API
   ========================= */

router.get('/:id/comments', auth(), async (req, res) => {
  const t = await Task.findById(req.params.id).populate('notes.by', 'name email role');
  if (!t) return res.status(404).json({ error: 'not found' });

  const isAssignee = t.assignedTo && String(t.assignedTo) === String(req.user._id);
  const isManager  = req.user.role === 'manager';
  if (!isAssignee && !isManager) return res.status(403).json({ error: 'forbidden' });

  res.json(t.notes || []);
});

router.post('/:id/comment', auth(), async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });

  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });

  const isAssignee = t.assignedTo && String(t.assignedTo) === String(req.user._id);
  const isManager  = req.user.role === 'manager';
  if (!isAssignee && !isManager) return res.status(403).json({ error: 'forbidden' });

  const note = { by: req.user._id, text: text.trim(), at: new Date() };
  t.notes.push(note);
  await t.save();

  const saved = await Task.findById(req.params.id).populate('notes.by', 'name email role');
  res.json(saved.notes);
});

module.exports = router;
