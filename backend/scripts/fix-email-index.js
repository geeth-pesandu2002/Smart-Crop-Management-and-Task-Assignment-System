// backend/scripts/fix-email-index.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_farm';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    const coll = mongoose.connection.db.collection('users');

    const idx = await coll.indexes();
    const emailIdx = idx.find(i => i.key && i.key.email === 1);
    if (emailIdx) {
      console.log('Dropping old index:', emailIdx.name);
      await coll.dropIndex(emailIdx.name);
    } else {
      console.log('No existing email index found.');
    }

    console.log('Creating partial unique index on email...');
    await coll.createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { email: { $type: 'string', $ne: '' } } }
    );

    console.log('Done.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
