//  app.js — Mood Selection, Results, Chat (OpenRouter — 3 Model Version)

const MOODS = {
  happy:   { emoji: '😊', color: '#a3c97a', label: 'Happy'   },
  sad:     { emoji: '😔', color: '#7aafe8', label: 'Sad'     },
  anxious: { emoji: '😰', color: '#e8c97a', label: 'Anxious' },
  angry:   { emoji: '😠', color: '#e87a7a', label: 'Angry'   },
  tired:   { emoji: '😴', color: '#b07ae8', label: 'Tired'   },
  meh:     { emoji: '😐', color: '#9e9a94', label: 'Meh'     },
};

// System prompt for the FIRST mood message only (structured cards)
const SYS_RESULTS = `You are Moodie. The user just selected their mood. Respond EXACTLY in this format and nothing else:

TASKS:
1. [specific task for this mood]
2. [specific task]
3. [specific task]

SUGGESTIONS:
1. [genuine wellness tip]
2. [tip]
3. [tip]

AFFIRMATION:
[One short honest sentence, not cheesy]`;

// System prompt for CHAT — completely different, no structure allowed
const SYS_CHAT = `You are Moodie — not an AI, not a bot. You are like a close elder sibling or best friend who genuinely cares.

STRICT RULES — break any of these and you fail:
- NEVER use TASKS, SUGGESTIONS, AFFIRMATION, bullet points, or numbered lists. Ever. Not even once.
- NEVER write more than 3-4 sentences per reply
- NEVER say "I understand", "That must be hard", "I'm here for you" — these are fake phrases
- NEVER sound like a therapist or assistant
- ALWAYS reply like you're texting a close friend — casual, warm, short
- Use Hindi/Hinglish naturally if they use it (bhai, yaar, arre, etc.)
- Sometimes just ask one small question instead of giving advice
- When they're sad — just be present first, don't fix
- When they're happy — match their energy!
- When they say something serious like suicide/self harm — be gentle, real, and suggest iCall (9152987821)

Example of GOOD reply: "arre yaar kya hua bata 😔 main sun raha hun"
Example of BAD reply: "I understand you're feeling sad. Here are some suggestions: 1. Take a walk..."

You are their person. Be real. Be short. Be warm.`;

let mood        = null;
let resultText  = null;
let history     = [];
let chatStarted = false; // tracks if we're in chat mode

// ── MODEL SWITCHER ───────────────────────────────────────────
function initModelSwitcher() {
  const switcher = document.getElementById('model-switcher');
  if (!switcher) return;

  switcher.innerHTML = Object.entries(CONFIG.MODELS).map(([key, m]) => `
    <button
      class="model-btn ${key === CONFIG.ACTIVE_MODEL ? 'active' : ''}"
      data-model="${key}"
      style="--model-color:${m.color}"
      onclick="selectModel('${key}')"
      title="${m.desc}"
    >
      <span class="model-icon">${m.icon}</span>
      <span class="model-label">${m.label}</span>
    </button>
  `).join('');
}

function selectModel(key) {
  CONFIG.ACTIVE_MODEL = key;
  document.querySelectorAll('.model-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.model === key);
  });
  const m = CONFIG.MODELS[key];
  showToast(`${m.icon} ${m.label} — ${m.desc}`);
}

function showToast(msg) {
  let t = document.getElementById('model-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'model-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}

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

// ── API CALL — uses different system prompt for results vs chat ──
async function callAI(messages, isChat = false) {
  if (!CONFIG.API_KEY || CONFIG.API_KEY.includes('YOUR_GROQ') || CONFIG.API_KEY.includes('YOUR_OPENROUTER')) {
    throw new Error('API key not set. Get your free key at https://console.groq.com');
  }

  const model = CONFIG.MODELS[CONFIG.ACTIVE_MODEL];

  // Use SYS_CHAT for all chat messages, SYS_RESULTS only for first mood message
  const systemPrompt = isChat ? SYS_CHAT : SYS_RESULTS;

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${CONFIG.API_KEY}`,
      
    },
    
    body: JSON.stringify({
      model:       model.id,
      max_tokens:  CONFIG.MAX_TOKENS,
      temperature: isChat ? 0.9 : 0.75,  // higher temp in chat = more natural
      messages:    fullMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error("Free limit hit 😅 Switch model ya kal try karo!");
    if (res.status === 404) throw new Error("Model abhi available nahi. Upar se Auto switch karo!");
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  try {
    return data.choices[0].message.content;
  } catch (e) {
    throw new Error('Unexpected response from API.');
  }
}

// ── RESULTS ──────────────────────────────────────────────────
async function goToResults() {
  if (!mood) return;
  chatStarted = false;
  showScreen('results');

  const m = MOODS[mood];
  document.getElementById('result-greeting').innerHTML =
    `${userName}, you're feeling <em>${m.label.toLowerCase()}</em> today`;

  const badge = document.getElementById('mood-badge');
  badge.textContent = m.emoji + ' ' + m.label;
  badge.style.setProperty('--badge-color', m.color);

  const activeModel = CONFIG.MODELS[CONFIG.ACTIVE_MODEL];
  document.getElementById('results-content').innerHTML =
    `<div class="loading-state">
      <div class="loader-ring"></div>
      <div class="loader-text">Moodie is thinking about you… ${activeModel.icon}</div>
    </div>`;
  document.getElementById('chat-jump-btn').classList.remove('visible');

  try {
    const userMsg = `My name is ${userName} and my current mood is: ${mood}`;
    // isChat = false — use structured SYS_RESULTS prompt
    resultText = await callAI([{ role: 'user', content: userMsg }], false);

    // Chat history starts fresh — uses SYS_CHAT from here
    history = [
      { role: 'user',      content: `My name is ${userName}. I'm feeling ${mood} today.` },
      { role: 'assistant', content: `Got it ${userName}, I'm here with you 💙` },
    ];

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
        <div class="loader-text" style="color:#e87a7a;text-align:center;line-height:1.6;">
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

  const activeModel = CONFIG.MODELS[CONFIG.ACTIVE_MODEL];

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
    </div>
    <div class="model-credit">${activeModel.icon} Powered by ${activeModel.label}</div>`;
}

// ── CHAT ─────────────────────────────────────────────────────
function goToChat() {
  chatStarted = true;
  const m = MOODS[mood];
  document.getElementById('chat-mood-pill').textContent = m.emoji + ' ' + m.label;

  const activeModel = CONFIG.MODELS[CONFIG.ACTIVE_MODEL];
  const modelPill = document.getElementById('chat-model-pill');
  if (modelPill) {
    modelPill.textContent = activeModel.icon + ' ' + activeModel.label;
    modelPill.style.color = activeModel.color;
    modelPill.style.borderColor = activeModel.color + '44';
  }

  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';

  // Opening message from Moodie — warm, short, NOT structured
  const openings = {
    happy:   `arre waah ${userName}! khush ho aaj 😊 kya hua bata!`,
    sad:     `hey ${userName} 😔 kya hua yaar? bata mujhe...`,
    anxious: `${userName} saans lo pehle 💙 main hun yahan. kya chal raha hai?`,
    angry:   `arre ${userName} kaun hai jo tang kar raha hai 😤 bata mujhe`,
    tired:   `yaar kitna kaam kar lete ho 😴 rest karo thoda. kya hua?`,
    meh:     `${userName} theek nahi lag raha kuch? baat kar mere se 🙂`,
  };

  addMsg('bot', openings[mood] || `hey ${userName} 💙 kya chal raha hai?`);
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
    // Always isChat = true in chat screen
    const reply = await callAI(history, true);
    history.push({ role: 'assistant', content: reply });
    document.getElementById('typing')?.remove();
    addMsg('bot', reply);
  } catch (e) {
    document.getElementById('typing')?.remove();
    addMsg('bot', '⚠️ ' + (e.message || 'Kuch gadbad ho gayi, dobara try karo!'));
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
initModelSwitcher();
