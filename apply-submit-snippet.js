/**
 * apply.html — updated submitApp() to POST directly to your backend API
 * instead of (or in addition to) Formspree.
 *
 * Replace the fetch() call inside submitApp() in apply.html with this.
 * Set API_URL to wherever your server is running.
 */

const API_URL = 'https://your-api-server.com/api/applications'; // ← change this

async function submitApp() {
  // ... (validation stays the same) ...

  const app = {
    id:        now.getTime().toString(),
    name,
    email,
    appliedAt: now.toISOString(),
    position:  selPosition,
    answers:   { q1, q2, q3, q4, q5, q6, q7 },
  };

  // Save to backend
  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(app),
    });
    if (!res.ok) throw new Error('API error');
  } catch (e) {
    console.warn('Backend submit failed, falling back to Formspree:', e);
  }

  // Also send Formspree email as a backup notification
  fetch('https://formspree.io/f/mzdqbgno', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body:    JSON.stringify({
      _subject:       'Job Application — ' + selPosition + ' — ' + name,
      '01_Name':      name,
      '02_Email':     email,
      '03_Position':  selPosition,
      '04_Applied':   now.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }),
      'Q1': q1, 'Q2': q2, 'Q3': q3,
      'Q4': q4, 'Q5': q5, 'Q6': q6, 'Q7': q7 || 'N/A',
    }),
  }).catch(() => {});

  // Show confirmation screen
  goStep(3);
}
