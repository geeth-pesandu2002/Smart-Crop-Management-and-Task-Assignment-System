// backend/models/Profit.js
const mongoose = require('mongoose');

const profitSchema = new mongoose.Schema({
  plot: { type: mongoose.Schema.Types.ObjectId, ref: 'Plot', required: true },
  date: { type: Date, required: true },
  harvestedQty: { type: Number, default: 0 },
  discardedQty: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

profitSchema.index({ plot: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Profit', profitSchema);
