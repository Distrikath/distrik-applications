/**
 * Distrik — Job Applications API
 * Node.js + Express + SQLite (better-sqlite3)
 *
 * Endpoints:
 *   POST   /api/applications          — submit new application (public)
 *   GET    /api/applications          — list all applications  (auth)
 *   GET    /api/applications/:id      — single application     (auth)
 *   PATCH  /api/applications/:id      — update status/rating/notes (auth)
 *   DELETE /api/applications/:id      — delete application     (auth)
 *
 * Auth: pass  X-API-Key: <your-key>  header on every protected request.
 */

require('dotenv').config();

const express  = require('express');
const Database = require('better-sqlite3');
const cors     = require('cors');
const path     = require('path');

const app     = express();
const PORT    = process.env.PORT    || 3001;
const API_KEY = process.env.API_KEY || 'change-this-secret-key';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'applications.db');

// ── Database ──────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    position   TEXT NOT NULL,
    q1         TEXT DEFAULT '',
    q2         TEXT DEFAULT '',
    q3         TEXT DEFAULT '',
    q4         TEXT DEFAULT '',
    q5         TEXT DEFAULT '',
    q6         TEXT DEFAULT '',
    q7         TEXT DEFAULT '',
    status     TEXT DEFAULT 'new'
                    CHECK(status IN ('new','reviewing','interview','rejected','hired')),
    rating     INTEGER DEFAULT 0
                    CHECK(rating BETWEEN 0 AND 5),
    notes      TEXT DEFAULT '',
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
`);

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*',
}));

function requireAuth(req, res, next) {
  const key =
    req.headers['x-api-key'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToApp(row) {
  if (!row) return null;
  return {
    id:        row.id,
    name:      row.name,
    email:     row.email,
    appliedAt: row.applied_at,
    position:  row.position,
    answers: {
      q1: row.q1, q2: row.q2, q3: row.q3,
      q4: row.q4, q5: row.q5, q6: row.q6, q7: row.q7,
    },
    status:    row.status,
    rating:    row.rating,
    notes:     row.notes,
    createdAt: row.created_at,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/applications
 * Body: { id?, name, email, appliedAt?, position, answers: { q1..q7 } }
 * Public — called directly from apply.html on form submit.
 */
app.post('/api/applications', (req, res) => {
  const { id, name, email, appliedAt, position, answers } = req.body;

  if (!name || !email || !position || !answers) {
    return res.status(400).json({ error: 'name, email, position and answers are required.' });
  }

  const appId = id || Date.now().toString();
  const at    = appliedAt || new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR IGNORE INTO applications
        (id, name, email, applied_at, position, q1, q2, q3, q4, q5, q6, q7)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      appId, name, email, at, position,
      answers.q1 || '', answers.q2 || '', answers.q3 || '',
      answers.q4 || '', answers.q5 || '', answers.q6 || '', answers.q7 || '',
    );

    return res.status(201).json({ success: true, id: appId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error.' });
  }
});

/**
 * GET /api/applications
 * Query params: position, status, sort (date|rating|status)
 * Returns: { applications: [...], total: n }
 */
app.get('/api/applications', requireAuth, (req, res) => {
  const { position, status, sort } = req.query;

  let sql    = 'SELECT * FROM applications WHERE 1=1';
  const args = [];

  if (position) { sql += ' AND position = ?'; args.push(position); }
  if (status)   { sql += ' AND status = ?';   args.push(status); }

  sql += {
    rating: ' ORDER BY rating DESC, applied_at DESC',
    status: ' ORDER BY status ASC, applied_at DESC',
  }[sort] || ' ORDER BY applied_at DESC';

  const rows = db.prepare(sql).all(...args);
  return res.json({ applications: rows.map(rowToApp), total: rows.length });
});

/**
 * GET /api/applications/:id
 */
app.get('/api/applications/:id', requireAuth, (req, res) => {
  const app = rowToApp(
    db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id)
  );
  if (!app) return res.status(404).json({ error: 'Not found.' });
  return res.json(app);
});

/**
 * PATCH /api/applications/:id
 * Body (any combination): { status?, rating?, notes? }
 */
app.patch('/api/applications/:id', requireAuth, (req, res) => {
  const allowed = ['status', 'rating', 'notes'];
  const fields  = [];
  const args    = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      args.push(req.body[key]);
    }
  }

  if (!fields.length) {
    return res.status(400).json({ error: 'Provide at least one of: status, rating, notes.' });
  }

  args.push(req.params.id);
  const result = db.prepare(`UPDATE applications SET ${fields.join(', ')} WHERE id = ?`).run(...args);

  if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
  return res.json({ success: true });
});

/**
 * DELETE /api/applications/:id
 */
app.delete('/api/applications/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found.' });
  return res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Distrik Applications API → http://localhost:${PORT}`);
  console.log(`API key loaded: ${API_KEY === 'change-this-secret-key' ? '⚠ using default — set API_KEY in .env' : '✓'}`);
});
