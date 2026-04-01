
//  auth.js — it meant for Login, Signup, Session Management


const getUsers   = ()     => JSON.parse(localStorage.getItem('moodie_users') || '{}');
const saveUsers  = u      => localStorage.setItem('moodie_users', JSON.stringify(u));
const getSession = ()     => localStorage.getItem('moodie_session') || '';
const setSession = u      => localStorage.setItem('moodie_session', u);
const clearSess  = ()     => localStorage.removeItem('moodie_session');

let currentUser = '';
let userName    = '';
let activeTab   = 'login';

// ── TAB SWITCHER ─────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  const isSignup = tab === 'signup';
  document.getElementById('tab-login').classList.toggle('active', !isSignup);
  document.getElementById('tab-signup').classList.toggle('active', isSignup);
  document.getElementById('auth-name').style.display    = isSignup ? 'block' : 'none';
  document.getElementById('pw-strength').style.display  = isSignup ? 'block' : 'none';
  document.getElementById('auth-btn').textContent       = isSignup ? 'Create account' : 'Sign in';
  document.getElementById('auth-error').classList.remove('show');
  document.getElementById('auth-ok').classList.remove('show');
  document.getElementById('auth-user').value = '';
  document.getElementById('auth-pass').value = '';
  document.getElementById('auth-name').value = '';
  document.getElementById('pw-bar').style.width = '0';
  setTimeout(() => document.getElementById(isSignup ? 'auth-name' : 'auth-user').focus(), 60);
}

// ── PASSWORD STRENGTH BAR ────────────────────────────────────
function pwStrength() {
  if (activeTab !== 'signup') return;
  const pw = document.getElementById('auth-pass').value;
  let s = 0;
  if (pw.length >= 6)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const bar = document.getElementById('pw-bar');
  bar.style.width      = [0, 25, 50, 75, 100][s] + '%';
  bar.style.background = ['', '#e87a7a', '#e8c97a', '#a3c97a', '#69d68b'][s] || '#e87a7a';
}

// ── MESSAGES ─────────────────────────────────────────────────
function showErr(msg) {
  const e = document.getElementById('auth-error');
  e.textContent = msg; e.classList.add('show');
}
function showOk(msg) {
  const e = document.getElementById('auth-ok');
  e.textContent = msg; e.classList.add('show');
}

// ── SUBMIT HANDLER ───────────────────────────────────────────
function authSubmit() {
  document.getElementById('auth-error').classList.remove('show');
  document.getElementById('auth-ok').classList.remove('show');

  const uname = document.getElementById('auth-user').value.trim().toLowerCase();
  const pass  = document.getElementById('auth-pass').value;
  if (!uname) { showErr('Please enter a username.'); return; }
  if (!pass)  { showErr('Please enter a password.'); return; }

  const users = getUsers();

  if (activeTab === 'login') {
    if (!users[uname])                        { showErr('No account found. Sign up first!'); return; }
    if (users[uname].password !== btoa(pass)) { showErr('Incorrect password. Try again.');   return; }
    doLogin(uname, users[uname].name);
  } else {
    const name = document.getElementById('auth-name').value.trim();
    if (!name)          { showErr('Please enter your name.'); return; }
    if (uname.length<3) { showErr('Username must be at least 3 characters.'); return; }
    if (pass.length<6)  { showErr('Password must be at least 6 characters.'); return; }
    if (users[uname])   { showErr('Username already taken. Choose another.'); return; }
    users[uname] = { name, password: btoa(pass), log: [] };
    saveUsers(users);
    showOk('Account created! Signing you in…');
    setTimeout(() => doLogin(uname, name), 900);
  }
}

// ── LOGIN / LOGOUT ───────────────────────────────────────────
function doLogin(uname, name) {
  currentUser = uname;
  userName    = name;
  setSession(uname);
  document.getElementById('user-chip-name').textContent = userName;
  document.getElementById('user-chip').style.display    = 'flex';
  document.getElementById('logout-btn').style.display   = 'inline-block';
  document.getElementById('mood-headline').innerHTML    = `How are you<br><em>feeling today,<br>${userName}?</em>`;
  updateLog();
  showScreen('mood');
}

function logout() {
  currentUser = ''; userName = '';
  clearSess();
  mood = null; resultText = null; history = [];
  document.getElementById('user-chip').style.display    = 'none';
  document.getElementById('logout-btn').style.display   = 'none';
  document.getElementById('history-bar').style.display  = 'none';
  document.querySelectorAll('.mood-tile').forEach(t => t.classList.remove('selected'));
  document.getElementById('continue-btn').classList.remove('visible');
  document.getElementById('mood-headline').innerHTML = `How are you<br><em>feeling today?</em>`;
  switchTab('login');
  showScreen('auth');
}

function editName() {
  const n = prompt('Update your display name:', userName);
  if (n && n.trim()) {
    userName = n.trim();
    const u = getUsers();
    if (u[currentUser]) { u[currentUser].name = userName; saveUsers(u); }
    document.getElementById('user-chip-name').textContent = userName;
    document.getElementById('mood-headline').innerHTML = `How are you<br><em>feeling today,<br>${userName}?</em>`;
  }
}

// ── SESSION RESTORE ON LOAD ──────────────────────────────────
function initAuth() {
  const saved = getSession();
  if (saved) {
    const u = getUsers();
    if (u[saved]) { doLogin(saved, u[saved].name); return; }
  }
  showScreen('auth');
  setTimeout(() => document.getElementById('auth-user').focus(), 300);
}
