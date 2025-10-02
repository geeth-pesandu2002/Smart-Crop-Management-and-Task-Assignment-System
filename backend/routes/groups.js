// backend/routes/groups.js
const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const { auth } = require('../auth');

// list
router.get('/', auth(['manager']), async (_req, res) => {
  const groups = await Group.find().populate('members', 'name email status').sort('name');
  res.json(groups);
});

// create
router.post('/', auth(['manager']), async (req, res) => {
  const { name, members = [] } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const g = await Group.create({ name, members });
  res.json(g);
});

// add one member
router.patch('/:id/add', auth(['manager']), async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  await Group.findByIdAndUpdate(req.params.id, { $addToSet: { members: userId } });
  const g = await Group.findById(req.params.id).populate('members', 'name email status');
  res.json(g);
});

// remove one member
router.patch('/:id/remove', auth(['manager']), async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  await Group.findByIdAndUpdate(req.params.id, { $pull: { members: userId } });
  const g = await Group.findById(req.params.id).populate('members', 'name email status');
  res.json(g);
});

// rename / set members in one go
router.patch('/:id', auth(['manager']), async (req, res) => {
  const { name, members } = req.body || {};
  const update = {};
  if (name) update.name = name;
  if (Array.isArray(members)) update.members = members;
  const g = await Group.findByIdAndUpdate(req.params.id, update, { new: true })
                       .populate('members', 'name email status');
  res.json(g);
});

// delete
router.delete('/:id', auth(['manager']), async (req, res) => {
  await Group.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
