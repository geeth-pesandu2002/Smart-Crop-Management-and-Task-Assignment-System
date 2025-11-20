// backend/models/Task.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    by:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text:{ type: String, trim: true },
    at:  { type: Date, default: Date.now }
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,

  // assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // individual
  groupId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, // group (shared)
  plotId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Plot' },  // optional
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // workflow
  status:   { type: String, enum: ['pending','in_progress','blocked','completed'], default: 'pending' },
  priority: { type: String, enum: ['low','normal','high'], default: 'normal' },
  dueDate:  Date,
  startDate: { type: Date },

  // attachments
  voiceUrl: { type: String, default: '' },

  // progress percentage (0-100)
  progress: { type: Number, min: 0, max: 100, default: 0 },

  // comments / notes
  notes:    [noteSchema]
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
