const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

console.log('[BOOT] Iniciando servidor Exercise Tracker');

const User = require('./models/User');
const Exercise = require('./models/Exercise');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(`${process.cwd()}/public`));

console.log('[MONGOOSE] Conectando a MongoDB...');
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', (err) => {
  console.error('[MONGOOSE ERROR] Error de conexión a MongoDB:', err.message);
});
db.once('open', () => {
  console.log('[MONGOOSE] Conexión exitosa con MongoDB');
});

app.get('/', (req, res) => {
  console.log('[GET] Acceso a /');
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  try {
    console.log('[POST] /api/users', req.body);
    const user = new User({ username: req.body.username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.error('[POST /api/users] Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    console.log('[GET] /api/users');
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    console.error('[GET /api/users] Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    console.log(`[POST] /api/users/${req.params._id}/exercises`, req.body);
    const { description, duration, date } = req.body;
    const user = await User.findById(req.params._id);
    if (!user) {
      console.warn(`[POST /api/users/:_id/exercises] Usuario no encontrado: ${req.params._id}`);
      return res.json({ error: 'User not found' });
    }

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });
    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      description: exercise.description,
      duration: exercise.duration
    });
  } catch (err) {
    console.error('[POST /api/users/:_id/exercises] Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    console.log(`[GET] /api/users/${req.params._id}/logs`, req.query);
    const { from, to, limit } = req.query;
    const user = await User.findById(req.params._id);
    if (!user) {
      console.warn(`[GET /api/users/:_id/logs] Usuario no encontrado: ${req.params._id}`);
      return res.json({ error: 'User not found' });
    }

    let filter = { userId: user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let query = Exercise.find(filter).select('description duration date -_id');
    if (limit) query = query.limit(parseInt(limit));

    const log = (await query).map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      _id: user._id,
      count: log.length,
      log
    });
  } catch (err) {
    console.error('[GET /api/users/:_id/logs] Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('[BOOT] App is listening on port ' + listener.address().port);
});
