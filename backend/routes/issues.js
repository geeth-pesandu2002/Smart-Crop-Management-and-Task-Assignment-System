// backend/routes/issues.js
const router = require('express').Router();
const Issue = require('../models/Issue');

// Create
router.post('/', async (req,res)=>{
  try { res.status(201).json(await Issue.create(req.body)); }
  catch(e){ res.status(400).json({ error: e.message }); }
});

// List (filters: ?status=&plotId=&priority=&q=)
router.get('/', async (req,res)=>{
  const { status, plotId, priority, q } = req.query;
  const where = {};
  if (status) where.status = status;
  if (plotId) where.plotId = plotId;
  if (priority) where.priority = priority;
  if (q) where.$text = { $search: q };
  try { res.json(await Issue.find(where).sort('-createdAt').lean()); }
  catch(e){ res.status(500).json({ error: e.message }); }
});

// Update
router.patch('/:id', async (req,res)=>{
  try {
    const upd = req.body;
    if (upd.status === 'RESOLVED' && !upd.resolvedAt) upd.resolvedAt = new Date();
    const out = await Issue.findByIdAndUpdate(req.params.id, upd, { new:true });
    if (!out) return res.status(404).json({ error: 'Not found' });
    res.json(out);
  } catch(e){ res.status(400).json({ error: e.message }); }
});

module.exports = router;
