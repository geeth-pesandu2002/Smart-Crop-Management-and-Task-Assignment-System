// backend/models/Leave.js
const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startDate: { type: Date, required: true, index: true },
  endDate:   { type: Date, required: true, index: true },
  reason:    { type: String, default: '' },
  status:    { type: String, enum: ['approved', 'ended', 'cancelled'], default: 'approved' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

LeaveSchema.index({ user: 1, startDate: 1, endDate: 1 });

LeaveSchema.statics.isOnDate = async function(userId, date) {
  const d = new Date(date);
  return this.exists({
    user: userId, status: 'approved',
    startDate: { $lte: d }, endDate: { $gte: d }
  });
};

module.exports = mongoose.model('Leave', LeaveSchema);
