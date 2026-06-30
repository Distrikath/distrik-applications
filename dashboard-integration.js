/**
 * Distrik Applications — Dashboard Integration
 *
 * Drop this into your existing employee dashboard.
 * Set API_BASE and API_KEY to match your server.
 *
 * Usage:
 *   const api = new ApplicationsAPI('https://your-api.com', 'your-key');
 *   const { applications } = await api.list();
 *   await api.update(id, { status: 'interview', rating: 4 });
 */

const API_BASE = 'https://your-api-server.com';  // ← change this
const API_KEY  = 'your-secret-key';              // ← change this (keep server-side in prod)

class ApplicationsAPI {
  constructor(base = API_BASE, key = API_KEY) {
    this.base = base.replace(/\/$/, '');
    this.key  = key;
  }

  _headers() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.key,
    };
  }

  /** List all applications. Optional filters: { position, status, sort } */
  async list({ position, status, sort } = {}) {
    const params = new URLSearchParams();
    if (position) params.set('position', position);
    if (status)   params.set('status',   status);
    if (sort)     params.set('sort',     sort);

    const res = await fetch(`${this.base}/api/applications?${params}`, {
      headers: this._headers(),
    });
    if (!res.ok) throw new Error(`List failed: ${res.status}`);
    return res.json(); // { applications: [...], total: n }
  }

  /** Get a single application by id */
  async get(id) {
    const res = await fetch(`${this.base}/api/applications/${id}`, {
      headers: this._headers(),
    });
    if (!res.ok) throw new Error(`Get failed: ${res.status}`);
    return res.json();
  }

  /** Update status, rating and/or notes. Pass only the fields you want to change. */
  async update(id, { status, rating, notes } = {}) {
    const body = {};
    if (status !== undefined) body.status = status;
    if (rating !== undefined) body.rating = rating;
    if (notes  !== undefined) body.notes  = notes;

    const res = await fetch(`${this.base}/api/applications/${id}`, {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    return res.json(); // { success: true }
  }

  /** Delete an application */
  async remove(id) {
    const res = await fetch(`${this.base}/api/applications/${id}`, {
      method: 'DELETE',
      headers: this._headers(),
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    return res.json(); // { success: true }
  }
}

// ── Example usage ─────────────────────────────────────────────────────────────

async function exampleUsage() {
  const api = new ApplicationsAPI(API_BASE, API_KEY);

  // Fetch all applications, newest first
  const { applications, total } = await api.list();
  console.log(`${total} total applications`);

  // Filter by position
  const receptionApps = await api.list({ position: 'Reception' });

  // Filter by status + sort by rating
  const shortlisted = await api.list({ status: 'reviewing', sort: 'rating' });

  // Update a specific application
  await api.update('1234567890', {
    status: 'interview',
    rating: 4,
    notes:  'Great experience, strong barista background. Schedule for next Tuesday.',
  });

  // Delete one
  await api.remove('1234567890');
}

// Application object shape (what the API returns):
// {
//   id:        "1719700000000",
//   name:      "Sarah Johnson",
//   email:     "sarah@example.com",
//   appliedAt: "2026-06-30T09:00:00.000Z",
//   position:  "Reception",            // or "Second in Charge" | "Fuel Bar / Reception" | "Supply" | "All Rounder"
//   answers: {
//     q1: "Why this position...",
//     q2: "Why a good fit...",
//     q3: "Previous experience...",
//     q4: "Interest in DISTRIK...",
//     q5: "Career goals...",
//     q6: "Availability...",
//     q7: "Anything else...",          // optional
//   },
//   status:    "new",                  // new | reviewing | interview | rejected | hired
//   rating:    0,                      // 0–5
//   notes:     "",                     // manager notes
//   createdAt: "2026-06-30T09:00:00Z",
// }
