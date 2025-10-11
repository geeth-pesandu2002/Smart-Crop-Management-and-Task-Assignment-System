const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/user');

// Use the SAME DB as your running API
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_farm';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[seed] connected:', MONGO_URI);

    const mk = async (name, email, role, pw = 'pass1234') => {
      const passwordHash = await bcrypt.hash(pw, 10);
      // Upsert by email
      await User.findOneAndUpdate(
        { email: String(email).trim().toLowerCase() },
        {
          name,
          email: String(email).trim().toLowerCase(),
          role,
          passwordHash,
          status: 'active',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`[seed] upserted: ${name} (${email}) role=${role}`);
    };

    await mk('Manager',    'manager@farm.com',    'manager',    'pass1234');
    await mk('Supervisor', 'supervisor@farm.com', 'supervisor', 'pass1234');
    await mk('Staff One',  'staff1@farm.com',     'staff',      'pass1234');

    console.log('[seed] done');
    process.exit(0);
  } catch (e) {
    console.error('[seed] error', e);
    process.exit(1);
  }
})();
