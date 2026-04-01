//  app.js — Mood Selection, Results, Chat (Groq / Llama 3 Version)


const MOODS = {
  happy:   { emoji: '😊', color: '#a3c97a', label: 'Happy'   },
  sad:     { emoji: '😔', color: '#7aafe8', label: 'Sad'     },
  anxious: { emoji: '😰', color: '#e8c97a', label: 'Anxious' },
  angry:   { emoji: '😠', color: '#e87a7a', label: 'Angry'   },
  tired:   { emoji: '😴', color: '#b07ae8', label: 'Tired'   },
  meh:     { emoji: '😐', color: '#9e9a94', label: 'Meh'     },
};

const SYS = `You are Moodie — a warm, emotionally intelligent mood companion. Speak calmly and genuinely. Avoid clichés.

When given a mood, respond EXACTLY in this format:
TASKS:
1. [specific task suited to mood]
2. [specific task]
3. [specific task]

SUGGESTIONS:
1. [wellness or mindset tip]
2. [tip]
3. [tip]

AFFIRMATION:
[One short, genuine sentence — not cheesy]

For follow-up messages: reply naturally, warmly, concisely (under 150 words). You remember the user's mood and name.`;

let mood       = null;
let resultText = null;
let history    = [];

// ── SCREEN ROUTING ───────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = document.getElementById('screen-' + id);
  el.style.display = 'flex';
  requestAnimationFrame(() => el.classList.add('active'));
}

function logoClick() {
  if (currentUser) showScreen('mood');
}

// ── MOOD PICKER ──────────────────────────────────────────────
function selectMood(el) {
  document.querySelectorAll('.mood-tile').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  mood = el.dataset.mood;
  document.getElementById('continue-btn').classList.add('visible');
}

// ── API CALL HELPER (GROQ VERSION) ───────────────────────────
async function callGroq(messages) {
  if (!CONFIG.API_KEY || CONFIG.API_KEY.includes('YOUR_GROQ_API_KEY')) {
    throw new Error('API key not set. Get your free key at https://console.groq.com');
  }

  // Prepend system message — Groq uses OpenAI-compatible format
  const fullMessages = [
    { role: 'system', content: SYS },
    ...messages
  ];

  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
    },
    body: JSON.stringify({
      model:      CONFIG.MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      temperature: 0.7,
      messages:   fullMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();

  try {
    return data.choices[0].message.content;
  } catch (e) {
    throw new Error('Unexpected response from Groq API.');
  }
}

// ── RESULTS ──────────────────────────────────────────────────
async function goToResults() {
  if (!mood) return;
  showScreen('results');

  const m = MOODS[mood];
  document.getElementById('result-greeting').innerHTML =
    `${userName}, you're feeling <em>${m.label.toLowerCase()}</em> today`;

  const badge = document.getElementById('mood-badge');
  badge.textContent = m.emoji + ' ' + m.label;
  badge.style.setProperty('--badge-color', m.color);

  document.getElementById('results-content').innerHTML =
    `<div class="loading-state"><div class="loader-ring"></div><div class="loader-text">Personalising your plan…</div></div>`;
  document.getElementById('chat-jump-btn').classList.remove('visible');

  try {
    const userMsg = `My name is ${userName} and my current mood: ${mood}`;
    resultText = await callGroq([{ role: 'user', content: userMsg }]);

    history = [
      { role: 'user',      content: userMsg    },
      { role: 'assistant', content: resultText },
    ];

    // Save to per-user log
    const users = getUsers();
    if (users[currentUser]) {
      users[currentUser].log = users[currentUser].log || [];
      users[currentUser].log.unshift({
        mood,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      users[currentUser].log = users[currentUser].log.slice(0, 7);
      saveUsers(users);
    }

    updateLog();
    renderCards(resultText);
    document.getElementById('chat-jump-btn').classList.add('visible');

  } catch (e) {
    document.getElementById('results-content').innerHTML =
      `<div class="loading-state">
        <div class="loader-text" style="color:#e87a7a;text-align:center;">
          ${e.message || 'Something went wrong. Please try again.'}
        </div>
      </div>`;
  }
}

function renderCards(text) {
  const tasks = [], tips = [];
  let aff = '', cur = null;

  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (line.startsWith('TASKS'))       { cur = 't'; continue; }
    if (line.startsWith('SUGGESTIONS')) { cur = 's'; continue; }
    if (line.startsWith('AFFIRMATION')) { cur = 'a'; continue; }
    const m = line.match(/^\d+\.\s+(.+)/);
    if (m && cur === 't')        tasks.push(m[1]);
    else if (m && cur === 's')   tips.push(m[1]);
    else if (cur === 'a' && line.length > 2) aff = line;
  }

  const rows = arr => arr.map((t, i) =>
    `<div class="item-row"><div class="item-num">0${i + 1}</div><div class="item-text">${t}</div></div>`
  ).join('');

  const fallT = ['Do one small thing you have been putting off', 'Write down 3 things that went well', 'Take a 10-minute walk outside'];
  const fallS = ['Drink a glass of water right now', 'Step away from screens for 5 min', 'Take 3 slow, deep breaths'];

  document.getElementById('results-content').innerHTML = `
    <div class="results-grid">
      <div class="result-card card-tasks">
        <div class="card-label">Tasks for you</div>
        ${rows(tasks.length ? tasks : fallT)}
      </div>
      <div class="result-card card-tips">
        <div class="card-label">Suggestions</div>
        ${rows(tips.length ? tips : fallS)}
      </div>
      ${aff ? `<div class="result-card card-full">
        <div class="card-label">Today's affirmation</div>
        <div class="affirmation-text">${aff}</div>
      </div>` : ''}
    </div>`;
}

// ── CHAT ─────────────────────────────────────────────────────
function goToChat() {
  const m = MOODS[mood];
  document.getElementById('chat-mood-pill').textContent = m.emoji + ' ' + m.label;
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';
  if (resultText) {
    const cleanIntro = resultText.replace(/(TASKS:|SUGGESTIONS:|AFFIRMATION:)/g, '\n$1');
    addMsg('bot', cleanIntro);
  }
  showScreen('chat');
}

function addMsg(role, text) {
  const msgs = document.getElementById('messages');
  const d    = document.createElement('div');
  d.className   = 'msg msg-' + role;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const msgs = document.getElementById('messages');
  const d    = document.createElement('div');
  d.className = 'msg-typing';
  d.id        = 'typing';
  d.innerHTML = '<div class="dp"></div><div class="dp"></div><div class="dp"></div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendChat() {
  const inp = document.getElementById('chat-input');
  const msg = inp.value.trim();
  if (!msg) return;

  inp.value = '';
  addMsg('user', msg);
  showTyping();
  history.push({ role: 'user', content: msg });

  try {
    const reply = await callGroq(history);
    history.push({ role: 'assistant', content: reply });
    document.getElementById('typing')?.remove();
    addMsg('bot', reply);
  } catch (e) {
    document.getElementById('typing')?.remove();
    addMsg('bot', e.message || 'Something went wrong. Please try again.');
  }
}

// ── MOOD LOG ─────────────────────────────────────────────────
function updateLog() {
  const users = getUsers();
  const log   = (users[currentUser]?.log) || [];
  const bar   = document.getElementById('history-bar');

  if (!log.length) { bar.style.display = 'none'; return; }

  bar.style.display = 'flex';
  bar.innerHTML = `<span class="history-label">Recent</span>` +
    log.slice(0, 6).map(e =>
      `<span class="history-chip">
        ${MOODS[e.mood].emoji} ${MOODS[e.mood].label}
        <span style="color:var(--text3);font-size:11px;">${e.time}</span>
      </span>`
    ).join('');
}

// ── INIT ─────────────────────────────────────────────────────
initAuth();