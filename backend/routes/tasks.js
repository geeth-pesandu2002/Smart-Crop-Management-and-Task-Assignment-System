// backend/routes/tasks.js
const path = require('path');
const express = require('express');
const router = express.Router();
const Task  = require(path.join(__dirname, '..', 'models', 'Task.js'));
const Group = require(path.join(__dirname, '..', 'models', 'Group.js'));
const Plot  = require(path.join(__dirname, '..', 'models', 'Plot.js'));
const { auth } = require('../auth');
const multer = require('multer');

// ---- voice upload ----
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'voice')),
  filename: (_req, file, cb) =>
    cb(null, Date.now() + '_' + Math.random().toString(36).slice(2) + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post('/voice', auth(['manager']), upload.single('voice'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/voice/${req.file.filename}` });
});

// ---- create task (individual or group) ----
router.post('/', auth(['manager']), async (req, res) => {
  try {
    const {
      title, description, assignedTo, groupId,
      priority = 'normal', dueDate, plotId, voiceUrl = '',
      sharedGroupTask = true
    } = req.body || {};

    if (!title) return res.status(400).json({ error: 'title required' });
    if (!assignedTo && !groupId) return res.status(400).json({ error: 'assign to user or group' });

    // individual
    if (assignedTo && !groupId) {
      const t = await Task.create({
        title, description, assignedTo, priority, dueDate, plotId, voiceUrl, createdBy: req.user.id
      });
      return res.json(t);
    }

    // group
    const group = await Group.findById(groupId).select('members');
    if (!group) return res.status(400).json({ error: 'group not found' });

    if (sharedGroupTask) {
      const t = await Task.create({
        title, description, groupId, priority, dueDate, plotId, voiceUrl, createdBy: req.user.id
      });
      return res.json(t);
    } else {
      const docs = group.members.map(m => ({
        title, description, assignedTo: m, priority, dueDate, plotId, voiceUrl, createdBy: req.user.id
      }));
      const created = await Task.insertMany(docs);
      return res.json(created);
    }
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'create failed' });
  }
});

// ---- list tasks (manager) with filters + pagination ----
// GET /tasks?status=&priority=&staff=&group=&plot=&page=1&limit=10&sort=createdAt:desc
router.get('/', auth(['manager']), async (req, res) => {
  const { status, priority, staff, group, plot, page = 1, limit = 10, sort = 'createdAt:desc' } = req.query;

  const q = {};
  if (status)   q.status = status;
  if (priority) q.priority = priority;
  if (staff)    q.assignedTo = staff;
  if (group)    q.groupId = group;
  if (plot)     q.plotId  = plot;

  // sort parser: field:dir
  let [sortField, sortDir] = (sort || '').split(':');
  if (!sortField) sortField = 'createdAt';
  const sortSpec = { [sortField]: (sortDir === 'asc' ? 1 : -1) };

  const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
  const perPage  = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip     = (pageNum - 1) * perPage;

  const [items, total] = await Promise.all([
    Task.find(q)
      .populate('assignedTo', 'name email')
      .populate('groupId', 'name')
      .populate('plotId', 'code')
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

// ---- my tasks (staff/supervisor/manager) ----
router.get('/mine', auth(), async (req, res) => {
  const since = Number(req.query.since || 0);
  const updatedSince = since ? { updatedAt: { $gte: new Date(since) } } : {};

  // tasks assigned directly to the user OR any shared group tasks
  const visibility = { $or: [{ assignedTo: req.user.id }, { groupId: { $exists: true, $ne: null } }] };

  const q = { $and: [visibility, updatedSince] };
  const tasks = await Task.find(q).sort('-updatedAt');
  res.json(tasks);
});

// ---- update status (assignee or manager) ----
router.patch('/:id/status', auth(), async (req, res) => {
  const { status } = req.body || {};
  if (!['pending','in_progress','blocked','completed'].includes(status)) {
    return res.status(400).json({ error: 'bad status' });
  }
  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  const isAssignee = String(t.assignedTo) === req.user.id;
  const isManager  = req.user.role === 'manager';
  if (!isAssignee && !isManager) return res.status(403).json({ error: 'forbidden' });
  t.status = status;
  await t.save();
  res.json(t);
});

// ---- edit task (manager) ----
router.put('/:id', auth(['manager']), async (req, res) => {
  const allowed = ['title','description','priority','dueDate','plotId','assignedTo','groupId','voiceUrl'];
  const patch = {};
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

  const t = await Task.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
});

// ---- delete task (manager) ----
router.delete('/:id', auth(['manager']), async (req, res) => {
  const t = await Task.findByIdAndDelete(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

// ---- summary for dashboard (manager) ----
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

// ---- board view (manager) ----
router.get('/board', auth(['manager']), async (req, res) => {
  const { plot, staff, group, priority } = req.query;
  const q = {};
  if (priority) q.priority = priority;
  if (staff)    q.assignedTo = staff;
  if (group)    q.groupId = group;
  if (plot)     q.plotId  = plot;

  const all = await Task.find(q)
    .populate('assignedTo', 'name')
    .populate('groupId', 'name')
    .populate('plotId', 'code')
    .sort('-createdAt');

  const buckets = { pending: [], in_progress: [], blocked: [], completed: [] };
  all.forEach(t => buckets[t.status]?.push(t));
  res.json(buckets);
});

/* =========================
   COMMENTS / NOTES API
   ========================= */

// List notes for a task (manager, or the task assignee)
router.get('/:id/comments', auth(), async (req, res) => {
  const t = await Task.findById(req.params.id).populate('notes.by', 'name email role');
  if (!t) return res.status(404).json({ error: 'not found' });

  const isAssignee = t.assignedTo && String(t.assignedTo) === req.user.id;
  const isManager  = req.user.role === 'manager';
  if (!isAssignee && !isManager) return res.status(403).json({ error: 'forbidden' });

  res.json(t.notes || []);
});

// Add a note to a task (manager, or the task assignee)
router.post('/:id/comment', auth(), async (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });

  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });

  const isAssignee = t.assignedTo && String(t.assignedTo) === req.user.id;
  const isManager  = req.user.role === 'manager';
  if (!isAssignee && !isManager) return res.status(403).json({ error: 'forbidden' });

  const note = { by: req.user.id, text: text.trim(), at: new Date() };
  t.notes.push(note);
  await t.save();

  // return the latest list with author names
  const saved = await Task.findById(req.params.id).populate('notes.by', 'name email role');
  res.json(saved.notes);
});

module.exports = router;
