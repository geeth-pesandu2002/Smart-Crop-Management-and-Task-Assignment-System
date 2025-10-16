const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userCode: { type: String },
  userName: { type: String },
  field: { type: String, required: true },
  date: { type: Date, required: true },
  issueType: { type: String, required: true },
  description: { type: String },
  photoUrl: { type: String },
  voiceUrl: { type: String },
  createdAt: { type: Date, default: () => new Date() },
});

module.exports = mongoose.models.Report || mongoose.model('Report', reportSchema);
