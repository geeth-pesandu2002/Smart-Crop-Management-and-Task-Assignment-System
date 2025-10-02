// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-farm';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_req, res) => res.send('OK'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

const authRouter       = require('./routes/auth.js');
const tasksRouter      = require('./routes/tasks.js');
const usersRouter      = require('./routes/users.js');
const groupsRouter     = require('./routes/groups.js');
const plotsRouter      = require('./routes/plots.js');
const resourcesRouter  = require('./routes/resources.js');
const leavesRouter     = require('./routes/leaves.js'); 
const issuesRouter = require('./routes/issues.js');  // ⬅️

console.log('auth   router typeof:',   typeof authRouter);
console.log('tasks  router typeof:',   typeof tasksRouter);
console.log('users  router typeof:',   typeof usersRouter);
console.log('groups router typeof:',   typeof groupsRouter);
console.log('plots  router typeof:',   typeof plotsRouter);
console.log('leaves router typeof:',   typeof leavesRouter); // ⬅️

if (typeof authRouter   !== 'function') throw new Error('Auth router is not a function');
if (typeof tasksRouter  !== 'function') throw new Error('Tasks router is not a function');
if (typeof usersRouter  !== 'function') throw new Error('Users router is not a function');
if (typeof groupsRouter !== 'function') throw new Error('Groups router is not a function');
if (typeof plotsRouter  !== 'function') throw new Error('Plots router is not a function');
if (typeof leavesRouter !== 'function') throw new Error('Leaves router is not a function'); // ⬅️

app.use('/api/auth',      authRouter);
app.use('/api/tasks',     tasksRouter);
app.use('/api/users',     usersRouter);
app.use('/api/groups',    groupsRouter);
app.use('/api/plots',     plotsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/leaves',    leavesRouter);
app.use('/api/issues', issuesRouter);                   // ⬅️

console.log('Booting server...');
console.log('PORT:', PORT);
console.log('MONGO_URI:', MONGO_URI);

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
