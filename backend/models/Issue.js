// backend/models/Issue.js
const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  type: { type: String, enum: ['DISEASE','PEST','WEATHER','RESOURCE','HARVEST','OTHER'], required: true },
  title: { type: String, required: true, trim: true },
  description: String,
  plotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { type: String, enum: ['LOW','MEDIUM','HIGH'], default: 'MEDIUM' },
  status: { type: String, enum: ['OPEN','IN_PROGRESS','RESOLVED','DISMISSED'], default: 'OPEN' },
  attachments: [{ url: String, kind: { type: String, enum: ['IMAGE','AUDIO','DOC'], default: 'IMAGE' } }],
  tags: [String]
}, { timestamps: true });

IssueSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Issue', IssueSchema);
