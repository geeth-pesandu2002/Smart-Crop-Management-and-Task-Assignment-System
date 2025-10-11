// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Identity
  name:   { type: String, required: true, trim: true },
  userId: { type: String, unique: true, sparse: true, index: true }, // e.g., SV-0001 / FS-0001

  // NOTE: don't put `unique` here; we’ll define a proper index below
  email:  { type: String, lowercase: true, trim: true, sparse: true },

  // Auth
  passwordHash: String,
  pinHash: String,
  mustChangePassword: { type: Boolean, default: false },

  // Role & status
  role:   { type: String, enum: ['manager', 'supervisor', 'staff'], required: true },
  status: { type: String, enum: ['active', 'on_leave'], default: 'active' },

  // Contact & profile
  phone:   { type: String, default: '' },
  gender:  { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  address: { type: String, default: '' },
  joinedAt:{ type: Date },
}, { timestamps: true });

// Unique email only when a non-empty string is present
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string', $ne: '' } },
  }
);

// helper to generate sequential userId per role prefix (SV-0001, FS-0001)
userSchema.statics.nextUserId = async function(prefix = 'ST') {
  const last = await this.findOne({ userId: new RegExp(`^${prefix}-\\d{4}$`) })
    .sort({ userId: -1 })
    .select('userId')
    .lean();
  const lastNum = last ? parseInt(last.userId.split('-')[1], 10) : 0;
  const next = String(lastNum + 1).padStart(4, '0');
  return `${prefix}-${next}`;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
