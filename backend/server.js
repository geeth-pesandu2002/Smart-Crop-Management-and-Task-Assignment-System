// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_farm';
const ALLOW_MANAGER_STATUS_OVERRIDE =
  String(process.env.ALLOW_MANAGER_STATUS_OVERRIDE || 'false') === 'true';

app.use(cors());
app.use(express.json());
// Ensure uploads dir exists and serve it
const uploadsDir = path.join(__dirname, 'uploads');
try { require('fs').mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
app.use('/uploads', express.static(uploadsDir));
// Also serve the same uploads under the API prefix so clients that build URLs
// using the API base (eg. http://host:4000/api + '/uploads/xxx') will work.
app.use('/api/uploads', express.static(uploadsDir));
// Ensure voice subfolder exists so multer can write files there
try { require('fs').mkdirSync(path.join(uploadsDir, 'voice'), { recursive: true }); } catch (e) {}

app.get('/', (_req, res) => res.send('OK'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Routers ---
const authRouter      = require('./routes/auth.js');
const tasksRouter     = require('./routes/tasks.js');
const usersRouter     = require('./routes/users.js');
const groupsRouter    = require('./routes/groups.js');
const plotsRouter     = require('./routes/plots.js');
const resourcesRouter = require('./routes/resources.js');
const leavesRouter    = require('./routes/leaves.js');
const issuesRouter    = require('./routes/issues.js');
const reportsRouter   = require('./routes/reports.js');
const uploadsRouter   = require('./routes/uploads.js');

// Helper to assert an Express router
function assertRouter(name, r) {
  const ok =
    r && typeof r === 'function' &&
    typeof r.handle === 'function' &&
    typeof r.use === 'function';
  console.log(`${name.padEnd(9)} router typeof:`, typeof r, ok ? '(ok)' : '(BAD)');
  if (!ok) throw new Error(`${name} router is not an Express router. Did you 'module.exports = router'?`);
}

// Verify all routers early
assertRouter('auth',      authRouter);
assertRouter('tasks',     tasksRouter);
assertRouter('users',     usersRouter);
assertRouter('groups',    groupsRouter);
assertRouter('plots',     plotsRouter);
assertRouter('resources', resourcesRouter);
assertRouter('leaves',    leavesRouter);
assertRouter('issues',    issuesRouter);
assertRouter('reports',   reportsRouter);

// Mount
app.use('/api/auth',      authRouter);
app.use('/api/tasks',     tasksRouter);
app.use('/api/users',     usersRouter);
app.use('/api/groups',    groupsRouter);
app.use('/api/plots',     plotsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/leaves',    leavesRouter);
app.use('/api/issues',    issuesRouter);
app.use('/api/reports',   reportsRouter);
app.use('/api/uploads',   uploadsRouter);

console.log('Booting server...');
console.log('PORT:', PORT);
console.log('MONGO_URI:', MONGO_URI);
console.log('ALLOW_MANAGER_STATUS_OVERRIDE:', ALLOW_MANAGER_STATUS_OVERRIDE);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Mongo connected');
    app.listen(PORT, '0.0.0.0', () => {
      console.log('API running on port', PORT);
    });
  })
  .catch(err => {
    console.error('Mongo error:', err?.message || err);
    process.exitCode = 1;
  });

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
});
