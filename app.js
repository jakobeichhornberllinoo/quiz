/* Tutoriums-Quiz – eine Datei für beide Rollen:
   - Host (Beamer):        index.html?host
   - Teilnehmende (Handy): index.html?code=123456
   Ablauf und Punkte nach dem Vorbild der Mentimeter-Quiz-Competition:
   richtige Antwort = 500–1000 Punkte je nach Schnelligkeit (oder fest 1000), falsch/keine = 0. */
'use strict';

const P = new URLSearchParams(location.search);
const CFG = window.QUIZ_CONFIG || {};
const HAS_FIREBASE = !!(CFG.firebase && CFG.firebase.databaseURL);
const LOCAL = P.get('backend') === 'local' || !HAS_FIREBASE;
const FB_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

const COLORS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'];
const SHAPES = ['▲', '◆', '●', '■', '★', '⬢'];   // nur noch für die Editor-Vorschau
// Kahoot-Formen als SVG: Dreieck, Raute, Kreis, Quadrat (+ Stern, Sechseck für Antwort 5/6)
const SHAPE_SVG = [
  '<polygon points="50,8 94,88 6,88"/>',
  '<polygon points="50,4 96,50 50,96 4,50"/>',
  '<circle cx="50" cy="50" r="44"/>',
  '<rect x="10" y="10" width="80" height="80"/>',
  '<polygon points="50,5 61,38 96,38 68,59 79,94 50,73 21,94 32,59 4,38 39,38"/>',
  '<polygon points="27,6 73,6 96,50 73,94 27,94 4,50"/>'
];
const ICON_SVG = {
  check: '<path d="M20 52 L41 72 L80 30" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
  cross: '<path d="M27 27 L73 73 M73 27 L27 73" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="round"/>',
  clock: '<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="10"/><path d="M50 28 V52 L66 62" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>',
  bolt: '<polygon points="58,4 18,58 46,58 40,96 82,40 54,40" fill="currentColor"/>',
  flame: '<path d="M50 6 C56 26 78 36 78 62 A28 28 0 0 1 22 62 C22 46 32 38 36 28 C40 40 46 44 50 44 C52 32 48 18 50 6Z" fill="currentColor"/>',
  lock: '<rect x="20" y="44" width="60" height="46" rx="8" fill="currentColor"/><path d="M33 44 V32 A17 17 0 0 1 67 32 V44" fill="none" stroke="currentColor" stroke-width="10"/>',
  unlock: '<rect x="20" y="44" width="60" height="46" rx="8" fill="currentColor"/><path d="M33 44 V32 A17 17 0 0 1 66 26" fill="none" stroke="currentColor" stroke-width="10"/>',
  sound: '<polygon points="10,38 30,38 54,16 54,84 30,62 10,62" fill="currentColor"/><path d="M66 32 A22 22 0 0 1 66 68 M76 20 A38 38 0 0 1 76 80" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>',
  mute: '<polygon points="10,38 30,38 54,16 54,84 30,62 10,62" fill="currentColor"/><path d="M66 36 L90 64 M90 36 L66 64" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>',
  expand: '<path d="M10 36 V10 H36 M64 10 H90 V36 M90 64 V90 H64 M36 90 H10 V64" fill="none" stroke="currentColor" stroke-width="10"/>',
  user: '<circle cx="50" cy="32" r="20" fill="currentColor"/><path d="M12 92 C12 66 30 56 50 56 C70 56 88 66 88 92Z" fill="currentColor"/>'
};
function svgEl(inner, cls) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 100 100');
  s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  s.innerHTML = inner;   // nur Konstanten aus diesem Skript, nie Nutzereingaben
  return s;
}
const shapeEl = i => svgEl(SHAPE_SVG[i] || SHAPE_SVG[0], 'shape');
const icon = (name, cls) => svgEl(ICON_SVG[name], 'icon ' + (cls || ''));

// Namensgenerator wie bei Kahoot („Adjektiv + Tier“), damit niemand seinen echten Namen nehmen muss
const NAME_ADJ = ['Flink', 'Mutig', 'Schlau', 'Wild', 'Fröhlich', 'Kühn', 'Lustig', 'Ruhig', 'Stark', 'Schnell', 'Wach', 'Klug', 'Frech', 'Sanft', 'Tapfer', 'Heiter'];
const NAME_ANIMAL = [['Fuchs', 'er'], ['Dachs', 'er'], ['Biber', 'er'], ['Igel', 'er'], ['Luchs', 'er'], ['Pinguin', 'er'], ['Adler', 'er'], ['Hase', 'er'], ['Elch', 'er'], ['Otter', 'er'],
  ['Eule', 'e'], ['Robbe', 'e'], ['Katze', 'e'], ['Möwe', 'e'], ['Hummel', 'e'], ['Ente', 'e'], ['Gans', 'e'],
  ['Reh', 'es'], ['Zebra', 'es'], ['Wiesel', 'es'], ['Lama', 'es'], ['Pony', 'es'], ['Gnu', 'es']];
function randomName() {
  for (;;) {
    const a = NAME_ADJ[Math.random() * NAME_ADJ.length | 0], [t, end] = NAME_ANIMAL[Math.random() * NAME_ANIMAL.length | 0];
    const n = `${a}${end} ${t}`;
    if (n.length <= 20) return n;
  }
}
const AVATARS = ['🦊', '🐼', '🐸', '🦉', '🐙', '🦁', '🐯', '🐨', '🐵', '🐧', '🦄', '🐢',
  '🐝', '🦋', '🐬', '🦖', '🐳', '🦔', '🐺', '🐮', '🐷', '🐰', '🦩', '🦜'];
const INTRO_MS = 4000;   // Frage wird vorgelesen, bevor die Antworten erscheinen (muss zu style.css .intro-bar passen)
const GRACE_MS = 2500;   // Nach Ablauf der Zeit noch auf unterwegs befindliche Antworten warten (mobile Daten!)
const RING_LEN = 2 * Math.PI * 45;

const EXAMPLE = `# Beispiel-Quiz – ersetze mich durch deine Fragen
// Zeilen mit // sind Kommentare und werden ignoriert.
// ?  Frage        +  richtige Antwort        -  falsche Antwort
// =  Freitext: akzeptierte Antworten, mehrere mit | trennen
// Zeit: 30    (optional, Sekunden nur für diese Frage)
// Bild: https://...   (optional, wird auf dem Beamer gezeigt)
// Punkte: doppelt     (optional, doppelte Punkte wie bei Kahoot)
// Typ: Umfrage        (optional, Meinungsfrage ohne richtige Antwort und ohne Punkte)

? Wie viele Punkte gibt es höchstens für eine richtige Antwort?
- 100
- 500
+ 1000
- 10.000

? Wahr oder falsch: Wer schneller richtig antwortet, bekommt mehr Punkte.
+ Wahr
- Falsch
Zeit: 15

? Was bringt 0 Punkte? (mehrere Antworten gelten als richtig)
+ Eine falsche Antwort
+ Gar keine Antwort
- Eine langsame richtige Antwort

? In welcher Stadt findet dieses Tutorium statt?
= Münster
Zeit: 30
Punkte: doppelt

? Wie fandet ihr das Quiz?
- Super
- Ganz okay
- Zu schwer
Typ: Umfrage
`;

/* ===================== Hilfsfunktionen ===================== */

const app = document.getElementById('app');
const $ = (sel, root = document) => root.querySelector(sel);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtCode = c => String(c).replace(/^(\d{3})(\d{3})$/, '$1 $2');
const fmtSec = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
const fmtNum = n => Number(n || 0).toLocaleString('de-DE');
const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* egal */ } };

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const view = (...nodes) => app.replaceChildren(...nodes);

function toast(msg, ms = 3500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Konnte nicht laden: ' + src));
    document.head.append(s);
  });
}

// Bei „Alle Cookies blockieren“ wirft schon der Zugriff auf localStorage – dann eben ohne Speichern weiter
const store = {
  get(k, area) { try { return JSON.parse((area || localStorage).getItem(k)); } catch (e) { return null; } },
  set(k, v, area) { try { (area || localStorage).setItem(k, JSON.stringify(v)); } catch (e) { /* voll/gesperrt */ } },
  del(k, area) { try { (area || localStorage).removeItem(k); } catch (e) { /* egal */ } }
};

function rid(n = 10) {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (const x of crypto.getRandomValues(new Uint32Array(n))) s += a[x % a.length];
  return s;
}

// Freitext-Vergleich: Groß/klein, Umlaute, Akzente und Satzzeichen egal
function norm(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Mentimeter "Time-based": 1000 (sofort) bis 500 (letzte Sekunde); "Fixed": immer 1000
function points(ok, ms, durMs, mode) {
  if (!ok) return 0;
  if (mode === 'fest') return 1000;
  return Math.round(1000 * (1 - clamp(ms / durMs, 0, 1) / 2));
}

// Gleiche Punktzahl = gleicher Platz (1, 2, 2, 4)
function rankMap(scores) {
  const arr = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const r = {};
  let rank = 0, prev = null;
  arr.forEach(([pid, s], i) => { if (s !== prev) { rank = i + 1; prev = s; } r[pid] = rank; });
  return r;
}

function cleanPlayers(v) {
  const r = {};
  if (v && typeof v === 'object') for (const [k, p] of Object.entries(v)) if (p && typeof p.name === 'string') r[k] = p;
  return r;
}

function countUp(el, from, to, ms = 1000, prefix = '') {
  const t0 = performance.now();
  (function f(now) {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = prefix + fmtNum(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1 && el.isConnected) requestAnimationFrame(f);
  })(t0);
  // Hintergrund-Tabs pausieren requestAnimationFrame – Endwert trotzdem sicher anzeigen
  setTimeout(() => { if (el.isConnected) el.textContent = prefix + fmtNum(to); }, ms + 100);
}

function download(name, text, type = 'text/plain') {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function toggleFS() {
  if (document.fullscreenElement) document.exitFullscreen && document.exitFullscreen();
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
}

async function keepAwake() {
  keepAwake.wanted = true;
  if (keepAwake.lock && !keepAwake.lock.released) return;
  try { if ('wakeLock' in navigator) keepAwake.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* nicht unterstützt oder ohne Nutzergeste */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && keepAwake.wanted) keepAwake();
});

// Firebase-get() wartet offline unbegrenzt – nach 10 s mit verständlicher Meldung abbrechen
function withTimeout(p, ms = 10000) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('keine Verbindung (Zeitüberschreitung)')), ms))]);
}

// Serverzeit (Firebase gleicht die Uhr jedes Geräts ab), damit Beamer und Handys denselben Countdown haben
const serverNow = () => Date.now() + ((db && db.offset) || 0);

function setConn(c) {
  clearTimeout(setConn.t);
  if (c) document.body.classList.remove('offline');
  else setConn.t = setTimeout(() => document.body.classList.add('offline'), 2000);
}

function joinUrl(code) {
  const base = CFG.publicUrl || (location.origin + location.pathname);
  const u = new URL(base.replace(/index\.html$/, ''), location.href);
  u.search = '';
  u.hash = '';
  if (code) u.searchParams.set('code', code);
  if (LOCAL) u.searchParams.set('backend', 'local');
  return u.toString();
}
const shortUrl = () => { const u = new URL(joinUrl('')); return (u.host + u.pathname).replace(/\/$/, ''); };

async function makeQR(el, text) {
  try {
    if (!window.QRCode) await loadScript(QR_LIB);
    el.replaceChildren();
    new window.QRCode(el, { text, width: 512, height: 512, colorDark: '#1a0b3d', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  } catch (e) {
    el.replaceChildren(h('div', { class: 'qr-fail' }, 'QR-Code nicht verfügbar – bitte Adresse und Code abtippen'));
  }
}

/* ===================== Ton (WebAudio, keine Dateien) ===================== */

const Sound = {
  ctx: null, on: true, music: null,
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* kein Ton */ } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur = 0.15, type = 'sine', vol = 0.2, when = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  },
  pop() { this.tone(660, 0.12, 'triangle', 0.15); this.tone(990, 0.1, 'triangle', 0.1, 0.06); },
  tick() { this.tone(1200, 0.05, 'square', 0.05); },
  gong() { this.tone(196, 0.8, 'sine', 0.25); this.tone(392, 0.6, 'sine', 0.1); },
  reveal() { [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.15, i * 0.09)); },
  fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.16, i * 0.14)); },
  // Frage: treibender Loop; Warteraum ('lobby'): ruhigerer Loop wie Kahoots Lobby-Musik
  startMusic(kind = 'question') {
    this.stopMusic();
    if (!this.on || !this.ctx) return;
    const lobby = kind === 'lobby';
    const notes = lobby ? [262, 330, 392, 330, 294, 349, 440, 349] : [220, 277, 330, 277, 247, 311, 370, 311];
    let i = 0;
    this.music = setInterval(() => {
      const f = notes[i % notes.length];
      this.tone(f, lobby ? 0.3 : 0.18, 'triangle', lobby ? 0.035 : 0.045);
      if (i % 2 === 0) this.tone(f / 2, 0.12, 'sine', lobby ? 0.05 : 0.07);
      i++;
    }, lobby ? 340 : 230);
  },
  stopMusic() { clearInterval(this.music); this.music = null; }
};

/* ===================== Konfetti ===================== */

function confetti(duration = 4000) {
  const cv = document.getElementById('confetti');
  const ctx = cv.getContext('2d');
  const d = window.devicePixelRatio || 1;
  const W = cv.width = innerWidth * d, H = cv.height = innerHeight * d;
  cv.style.display = 'block';
  const cols = ['#e21b3c', '#1368ce', '#ffc00a', '#26890c', '#ff7ae0', '#ffffff'];
  const ps = Array.from({ length: 180 }, () => ({
    x: Math.random() * W, y: -Math.random() * H * 0.6,
    vx: (Math.random() - 0.5) * 4 * d, vy: (2 + Math.random() * 4) * d,
    s: (6 + Math.random() * 8) * d, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
    c: cols[Math.random() * cols.length | 0]
  }));
  const end = performance.now() + duration;
  cancelAnimationFrame(confetti.raf);
  (function frame(now) {
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05 * d; p.r += p.vr;
      if (now < end && p.y > H) { p.y = -20; p.vy = (2 + Math.random() * 4) * d; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (now < end + 3000) confetti.raf = requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, H); cv.style.display = 'none'; }
  })(performance.now());
}

/* ===================== Datenbank: Firebase oder lokaler Testmodus ===================== */

async function initDB() {
  if (LOCAL) return localDB();
  await loadScript(FB_SDK + 'firebase-app-compat.js');
  await loadScript(FB_SDK + 'firebase-database-compat.js');
  firebase.initializeApp(CFG.firebase);
  const fdb = firebase.database();
  const api = {
    local: false,
    offset: 0,
    get: async p => (await fdb.ref(p).get()).val(),
    set: (p, v) => fdb.ref(p).set(v),
    update: (p, o) => fdb.ref(p).update(o),
    remove: p => fdb.ref(p).remove(),
    on(p, cb) {
      const r = fdb.ref(p);
      const f = s => cb(s.val());
      r.on('value', f, err => toast('Datenbankfehler: ' + err.message, 8000));
      return () => r.off('value', f);
    },
    onDisconnectUpdate: (p, o) => fdb.ref(p).onDisconnect().update(o),
    cancelDisconnect: p => fdb.ref(p).onDisconnect().cancel(),
    onConnected(cb) {
      const r = fdb.ref('.info/connected');
      const f = s => cb(!!s.val());
      r.on('value', f);
      return () => r.off('value', f);
    }
  };
  fdb.ref('.info/serverTimeOffset').on('value', s => { api.offset = Number(s.val()) || 0; });
  return api;
}

// Testmodus: ein JSON-Baum im localStorage, andere Tabs werden über das storage-Event benachrichtigt.
// Bildet die Firebase-Semantik nach, die die App braucht (null = löschen, leere Objekte verschwinden).
function localDB() {
  const KEY = 'quiz-local-db';
  const subs = new Set();
  const parts = p => p.split('/').filter(Boolean);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const read = (t, p) => {
    let o = t;
    for (const k of parts(p)) { if (o == null || typeof o !== 'object') return null; o = o[k]; }
    return o === undefined ? null : o;
  };
  const setPath = (t, p, v) => {
    const ks = parts(p);
    if (!ks.length) return v == null ? {} : JSON.parse(JSON.stringify(v));
    let o = t;
    for (const k of ks.slice(0, -1)) { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
    const last = ks[ks.length - 1];
    if (v == null) delete o[last]; else o[last] = JSON.parse(JSON.stringify(v));
    return t;
  };
  const prune = o => {
    if (o === null || typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.map(prune);
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      const pv = prune(v);
      if (pv == null) continue;
      if (typeof pv === 'object' && !Array.isArray(pv) && !Object.keys(pv).length) continue;
      r[k] = pv;
    }
    return r;
  };
  function notify() {
    const t = load();
    for (const s of subs) {
      const j = JSON.stringify(read(t, s.p) ?? null);
      if (j !== s.last) { s.last = j; try { s.cb(JSON.parse(j)); } catch (e) { console.error(e); } }
    }
  }
  function commit(fn) {
    const t = prune(fn(load())) || {};
    localStorage.setItem(KEY, JSON.stringify(t));
    setTimeout(notify, 0);
    return Promise.resolve();
  }
  window.addEventListener('storage', e => { if (e.key === KEY) notify(); });
  return {
    local: true,
    offset: 0,
    get: p => Promise.resolve(read(load(), p) ?? null),
    set: (p, v) => commit(t => setPath(t, p, v)),
    update: (p, o) => commit(t => { for (const [k, v] of Object.entries(o)) t = setPath(t, p + '/' + k, v); return t; }),
    remove: p => commit(t => setPath(t, p, null)),
    on(p, cb) { const s = { p, cb, last: undefined }; subs.add(s); setTimeout(notify, 0); return () => subs.delete(s); },
    onDisconnectUpdate: () => Promise.resolve(),
    cancelDisconnect: () => Promise.resolve(),
    onConnected(cb) { setTimeout(() => cb(true), 0); return () => {}; }
  };
}

/* ===================== Quiz-Textformat ===================== */

function parseQuiz(text) {
  const questions = [], errors = [];
  let title = '', cur = null;
  String(text).replace(/\r/g, '').split('\n').forEach((raw, i) => {
    const ln = i + 1, line = raw.trim();
    if (!line || line.startsWith('//')) return;
    if (line.startsWith('#')) { if (!title) title = line.replace(/^#+/, '').trim(); return; }
    if (line.startsWith('?')) {
      cur = { text: line.slice(1).trim(), options: [], correct: [], answers: [], time: null, image: null, line: ln };
      questions.push(cur);
      if (!cur.text) errors.push(`Zeile ${ln}: Frage ohne Text`);
      return;
    }
    let m = line.match(/^zeit\s*:\s*(\d+)\s*(s|sek|sekunden)?$/i);
    if (m && cur) { cur.time = clamp(+m[1], 5, 300); return; }
    m = line.match(/^bild\s*:\s*(https?:\/\/\S+)$/i);
    if (m && cur) { cur.image = m[1]; return; }
    // Kahoot-Optionen pro Frage
    if (cur && /^typ\s*:\s*umfrage$/i.test(line)) { cur.poll = true; return; }
    if (cur && /^punkte\s*:\s*(doppelt|2x|x2)$/i.test(line)) { cur.double = true; return; }
    if (!cur) { errors.push(`Zeile ${ln}: steht vor der ersten Frage (Fragen beginnen mit „?“)`); return; }
    if (line[0] === '+' || line[0] === '-') {
      const t = line.slice(1).trim();
      if (!t) { errors.push(`Zeile ${ln}: Antwort ohne Text`); return; }
      if (line[0] === '+') cur.correct.push(cur.options.length);
      cur.options.push(t);
      return;
    }
    if (line[0] === '=') {
      line.slice(1).split('|').map(s => s.trim()).filter(Boolean).forEach(a => cur.answers.push(a));
      return;
    }
    errors.push(`Zeile ${ln}: unbekannt – Zeilen beginnen mit ?, +, -, =, „Zeit:“, „Bild:“, „Typ: Umfrage“ oder „Punkte: doppelt“`);
  });
  questions.forEach((q, n) => {
    const lbl = `Frage ${n + 1} (Zeile ${q.line})`;
    if (q.options.length && q.answers.length) errors.push(`${lbl}: entweder Antworten mit +/- oder Freitext mit =, nicht beides`);
    else if (q.answers.length) {
      q.type = 'text';
      if (q.poll) errors.push(`${lbl}: eine Umfrage braucht Antworten mit -, keinen Freitext`);
    } else {
      q.type = 'mc';
      if (q.options.length < 2) errors.push(`${lbl}: braucht mindestens 2 Antworten`);
      if (q.options.length > 6) errors.push(`${lbl}: höchstens 6 Antworten`);
      if (q.poll) q.correct = [];   // Umfrage: keine richtige Antwort, keine Punkte
      else if (q.options.length && !q.correct.length) errors.push(`${lbl}: keine richtige Antwort markiert (Zeile mit + beginnen)`);
    }
    if (q.poll) q.double = false;
  });
  if (!questions.length) errors.push('Noch keine Frage – eine Frage beginnt mit „?“');
  return { title, questions, errors };
}

// Reihenfolge der Antworten einmal pro Raum mischen; Wahr/Falsch bleibt, wie es ist
function shuffleQuestion(q) {
  if (q.type !== 'mc' || q.poll || q.options.every(o => /^(wahr|falsch|richtig|ja|nein)$/i.test(o))) return q;
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map(i => q.options[i]), correct: order.map((o, i) => q.correct.includes(o) ? i : -1).filter(i => i >= 0) };
}

/* ===================== HOST (Beamer) ===================== */

const Host = {
  code: null, quiz: null, settings: null, players: {}, state: null, seq: 0,
  results: {}, answers: {}, timeouts: [], ticker: null, closing: false,
  unsubPlayers: null, unsubAnswers: null, lastNext: 0, chipEls: {},
  id: rid(6),   // Kennung dieses Tabs, damit ein zweiter Host-Tab erkannt wird

  init() {
    document.title = 'Quiz leiten';
    document.addEventListener('keydown', e => this.onKey(e));
    window.addEventListener('beforeunload', e => {
      if (this.state && !['lobby', 'end'].includes(this.state.phase)) { e.preventDefault(); e.returnValue = ''; }
    });
    db.onConnected(setConn);
    this.editor();
  },

  later(fn, ms) { this.timeouts.push(setTimeout(fn, ms)); },
  clearLater() { this.timeouts.forEach(clearTimeout); this.timeouts = []; clearInterval(this.ticker); },
  count() { return Object.keys(this.players).length; },
  total() { return this.quiz.questions.length; },
  path(p = '') { return `rooms/${this.code}${p ? '/' + p : ''}`; },

  onKey(e) {
    if (!this.state || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); this.next(); }
    else if (e.key === 'f' || e.key === 'F') toggleFS();
  },

  /* ---------- Editor ---------- */

  editor() {
    this.state = null;
    this.clearLater();
    Sound.stopMusic();
    document.body.dataset.mood = '';
    const settings = Object.assign({ time: 20, mode: 'schnell', board: true, shuffle: true, sound: true, phoneText: false, namegen: false },
      store.get('quiz-host-settings') || {});
    const saveSettings = () => store.set('quiz-host-settings', settings);
    const saved = store.get('quiz-host-text');
    const ta = h('textarea', { class: 'editor', spellcheck: 'false', 'aria-label': 'Fragen' });
    ta.value = typeof saved === 'string' && saved.trim() ? saved : EXAMPLE;
    const preview = h('div', { class: 'preview' });
    const startBtn = h('button', { class: 'btn big primary', onclick: () => go() }, 'Raum öffnen ▶');

    const update = () => {
      const r = parseQuiz(ta.value);
      store.set('quiz-host-text', ta.value);
      startBtn.disabled = r.errors.length > 0;
      preview.replaceChildren(
        r.errors.length
          ? h('div', { class: 'errors' }, h('b', null, `${r.errors.length} Problem${r.errors.length > 1 ? 'e' : ''}:`), h('ul', null, r.errors.map(e => h('li', null, e))))
          : h('div', { class: 'okmsg' }, `✔ ${r.questions.length} Frage${r.questions.length > 1 ? 'n' : ''} bereit${r.title ? ' – „' + r.title + '“' : ''}`),
        ...r.questions.map((q, i) => h('div', { class: 'pq' },
          h('div', { class: 'pq-h' }, h('span', null, `${i + 1}. ${q.text}`),
            h('span', { class: 'pq-t' }, q.poll ? h('span', { class: 'tag' }, 'Umfrage') : null, q.double ? h('span', { class: 'tag' }, '2× Punkte') : null, `${q.time || settings.time} s`)),
          q.type === 'text'
            ? h('div', { class: 'pq-o right' }, 'Freitext: ' + q.answers.join(' | '))
            : q.options.map((o, j) => h('div', { class: 'pq-o' + (q.correct.includes(j) ? ' right' : '') }, h('span', { class: 'pq-s ' + COLORS[j] }, shapeEl(j)), o))
        ))
      );
      return r;
    };
    let debounce;
    ta.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(update, 250); });

    const go = () => {
      const r = update();
      if (r.errors.length) return toast('Bitte erst die markierten Probleme beheben.');
      Sound.init();
      Sound.on = settings.sound;
      this.start(r, settings);
    };

    const select = (key, opts) => {
      const s = h('select', { onchange: () => { settings[key] = /^\d+$/.test(s.value) ? +s.value : s.value; saveSettings(); update(); } },
        opts.map(([v, l]) => h('option', { value: v, selected: String(settings[key]) === String(v) }, l)));
      return s;
    };
    const check = (key, label) => h('label', { class: 'check' },
      h('input', { type: 'checkbox', checked: !!settings[key], onchange: e => { settings[key] = e.target.checked; saveSettings(); } }), label);

    const fileIn = h('input', { type: 'file', accept: '.txt,.md,text/plain', style: 'display:none', onchange: () => {
      const f = fileIn.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => { ta.value = String(fr.result); update(); toast(`„${f.name}“ geladen`); };
      fr.readAsText(f, 'utf-8');
      fileIn.value = '';
    } });

    const resumeBox = h('div');
    const sess = store.get('quiz-host-session');
    if (sess && sess.code) {
      db.get(`rooms/${sess.code}/state`).then(st => {
        if (!st || st.phase === 'end') return;
        const where = st.phase === 'lobby' ? 'Warteraum' : `Frage ${st.qi + 1} von ${st.total}`;
        resumeBox.replaceChildren(h('div', { class: 'resume' },
          h('span', null, `Laufendes Quiz in Raum ${fmtCode(sess.code)} (${where})`),
          h('button', { class: 'btn primary', onclick: () => this.resume(sess) }, 'Fortsetzen ▶')));
      }).catch(() => {});
    }

    document.body.dataset.view = 'editor';
    view(h('div', { class: 'editor-page' },
      h('header', { class: 'ed-head' },
        h('h1', null, 'Tutoriums-Quiz'),
        h('span', { class: 'badge ' + (LOCAL ? 'warn' : 'good') }, LOCAL ? 'Testmodus' : 'Online (Firebase)')),
      LOCAL ? h('div', { class: 'notice' }, HAS_FIREBASE
        ? 'Testmodus (backend=local): läuft nur zwischen Tabs in diesem Browser.'
        : 'Testmodus: In config.js ist noch keine Firebase-Datenbank eingetragen. Handys können noch nicht beitreten – zum Ausprobieren im Warteraum „Test-Teilnehmer öffnen“ nutzen.') : null,
      resumeBox,
      h('div', { class: 'editor-wrap' },
        h('section', null,
          h('div', { class: 'row' },
            h('h2', null, 'Fragen'),
            h('div', { class: 'row-btns' },
              h('button', { class: 'btn small', onclick: () => fileIn.click() }, 'Datei laden'),
              h('button', { class: 'btn small', onclick: () => { const r = parseQuiz(ta.value); download((r.title || 'quiz').replace(/[^\p{L}\p{N} _-]+/gu, '').trim().replace(/\s+/g, '-') + '.txt', ta.value); } }, 'Als Datei speichern'),
              h('button', { class: 'btn small', onclick: () => { if (confirm('Den aktuellen Text durch das Beispiel ersetzen?')) { ta.value = EXAMPLE; update(); } } }, 'Beispiel'))),
          ta, fileIn,
          h('details', { class: 'help' }, h('summary', null, 'Format-Hilfe'),
            h('pre', null, '# Titel des Quiz\n\n? Frage\n+ richtige Antwort\n- falsche Antwort\n- falsche Antwort\nZeit: 30          (optional)\nBild: https://…   (optional)\nPunkte: doppelt   (optional)\n\n? Freitext-Frage\n= Antwort | andere Schreibweise\n\n? Umfrage ohne Punkte\n- Option A\n- Option B\nTyp: Umfrage\n\nMehrere + sind erlaubt (jede davon zählt als richtig).\n2–6 Antworten pro Frage. Zeilen mit // werden ignoriert.'))),
        h('section', null,
          h('div', { class: 'card settings' },
            h('h2', null, 'Einstellungen'),
            h('label', null, 'Zeit pro Frage (Standard)', select('time', [10, 15, 20, 30, 45, 60, 90, 120].map(s => [s, s + ' Sekunden']))),
            h('label', null, 'Punkte', select('mode', [['schnell', 'Nach Schnelligkeit (500–1000)'], ['fest', 'Fest (1000 pro richtige)']])),
            check('board', 'Zwischenstand nach jeder Frage'),
            check('shuffle', 'Antworten zufällig mischen (außer Wahr/Falsch)'),
            check('phoneText', 'Fragen und Antworten auch auf den Handys zeigen (aus = nur Farben und Formen, wie Kahoot)'),
            check('namegen', 'Namensgenerator: Handys bekommen zufällige Spitznamen'),
            check('sound', 'Musik und Töne')),
          preview,
          h('div', { class: 'start-row' }, startBtn))
      )));
    update();
  },

  /* ---------- Raum anlegen / fortsetzen ---------- */

  async start(r, settings) {
    if (this.starting) return;   // Doppelklick auf „Raum öffnen“
    this.starting = true;
    let code = null, players = {};
    try {
      // Aus dem Warteraum zurück in den Editor? Dann denselben Raum weiterverwenden – wer schon drin ist, bleibt drin.
      // (nur wenn man in diesem Tab gerade aus dem Warteraum kam – kein alter Raum aus der Generalprobe)
      const reuse = this.reuseCode;
      this.reuseCode = null;
      let seq = 1;
      if (reuse) {
        const st = await withTimeout(db.get(`rooms/${reuse}/state`)).catch(() => null);
        if (st && st.phase === 'lobby') {
          code = reuse;
          seq = (st.seq || 0) + 1;
          players = cleanPlayers(await withTimeout(db.get(`rooms/${code}/players`)));
        }
      }
      for (let i = 0; i < 12 && !code; i++) {
        const c = String(100000 + Math.floor(Math.random() * 900000));
        if (!(await withTimeout(db.get(`rooms/${c}/meta`)))) code = c;
      }
      if (!code) throw new Error('kein freier Code gefunden');
      this.quiz = { title: r.title || 'Quiz', questions: settings.shuffle ? r.questions.map(shuffleQuestion) : r.questions };
      this.settings = { ...settings };
      this.state = { phase: 'lobby', qi: -1, total: r.questions.length, seq, host: this.id };
      await withTimeout(db.update(`rooms/${code}`, { meta: { created: Date.now(), title: this.quiz.title, namegen: !!settings.namegen }, state: this.state, locked: null }));
    } catch (e) {
      this.state = null;
      return toast('Raum konnte nicht erstellt werden: ' + e.message, 8000);
    } finally {
      this.starting = false;
    }
    this.code = code;
    this.seq = this.state.seq;
    this.players = players;
    this.results = {};
    this.locked = false;
    this.saveSession();
    this.subscribe();
    this.render();
    keepAwake();
  },

  async resume(sess) {
    let room;
    try { room = await withTimeout(db.get(`rooms/${sess.code}`)); } catch (e) { return toast('Fortsetzen fehlgeschlagen: ' + e.message); }
    if (!room || !room.state) { store.del('quiz-host-session'); toast('Diesen Raum gibt es nicht mehr.'); return this.editor(); }
    Sound.init();
    this.code = sess.code;
    this.quiz = sess.quiz;
    this.settings = sess.settings;
    Sound.on = !!this.settings.sound;
    this.players = cleanPlayers(room.players);
    this.locked = !!room.locked;
    this.results = {};
    for (const [k, v] of Object.entries(room.results || {})) if (v) this.results[k] = v;
    // Steuerung ausdrücklich übernehmen: ein evtl. noch offener alter Host-Tab sieht die höhere seq und gibt ab
    this.seq = (room.state.seq || 1) + 1;
    this.state = { ...room.state, seq: this.seq, host: this.id };
    db.update(this.path(), { state: this.state }).catch(e => toast('Speichern fehlgeschlagen: ' + e.message, 8000));
    this.subscribe();
    keepAwake();
    const st = this.state;
    if (st.phase === 'intro') { this.goIntro(st.qi); return; }
    if (st.phase === 'question') {
      this.answers = (room.answers && room.answers[st.qi]) || {};
      this.closing = false;
      this.render();   // kann schon closeQuestion auslösen (Zeit um oder alle haben geantwortet)
      if (this.closing) return;
      if (serverNow() < st.endsAt) { this.watchAnswers(st.qi); this.startTicker(); Sound.startMusic(); }
      else this.closeQuestion('time');
      return;
    }
    this.render();
  },

  saveSession() { store.set('quiz-host-session', { code: this.code, quiz: this.quiz, settings: this.settings }); },

  subscribe() {
    this.unsubPlayers && this.unsubPlayers();
    this.unsubPlayers = db.on(this.path('players'), v => {
      this.players = cleanPlayers(v);
      this.onPlayers();
    });
    // Schaltet ein zweiter Host-Tab weiter, gibt dieser Tab die Steuerung ab (sonst laufen zwei Timer)
    this.unsubState && this.unsubState();
    this.unsubState = db.on(this.path('state'), v => {
      if (!v || !this.state || v.host === this.id || !(v.seq >= this.seq)) return;
      const sess = { code: this.code, quiz: this.quiz, settings: this.settings };
      this.leaveRoom();
      this.clearLater();
      Sound.stopMusic();
      this.state = null;
      view(h('div', { class: 'player' }, h('div', { class: 'center' },
        h('h2', { class: 'big-title' }, 'Dieses Quiz wird gerade in einem anderen Tab geleitet.'),
        h('button', { class: 'btn primary', onclick: () => this.resume(sess) }, 'Hier übernehmen'))));
    });
  },

  leaveRoom() {
    this.unsubPlayers && this.unsubPlayers();
    this.unsubAnswers && this.unsubAnswers();
    this.unsubState && this.unsubState();
    this.unsubPlayers = this.unsubAnswers = this.unsubState = null;
  },

  onPlayers() {
    if (!this.state) return;
    const c = $('#tbCount');
    if (c) c.textContent = String(this.count());
    if (this.state.phase === 'lobby') this.updateChips(false);
    if (this.state.phase === 'question') this.updateAnswerCount();
  },

  /* ---------- Zustandswechsel ---------- */

  setState(st, extra = {}) {
    this.seq++;
    this.state = { ...st, total: this.total(), seq: this.seq, host: this.id };
    this.clearLater();
    this.render();
    return db.update(this.path(), { state: this.state, ...extra }).catch(e => toast('Speichern fehlgeschlagen: ' + e.message, 8000));
  },

  next() {
    const now = Date.now();
    if (!this.state || now - this.lastNext < 600) return;   // Doppelklick/Taste + Klick abfangen
    this.lastNext = now;
    const st = this.state, last = st.qi >= this.total() - 1;
    switch (st.phase) {
      case 'lobby':
        if (!this.count()) return toast('Noch niemand beigetreten.');
        Sound.init();
        return this.goIntro(0);
      case 'intro': return this.goQuestion();
      case 'question': return this.closeQuestion('manual');
      case 'reveal':
        if (last) return this.goEnd();
        return this.settings.board ? this.setState({ phase: 'leaderboard', qi: st.qi }) : this.goIntro(st.qi + 1);
      case 'leaderboard': return this.goIntro(st.qi + 1);
    }
  },

  goIntro(qi) {
    const q = this.quiz.questions[qi];
    const dur = q.time || this.settings.time;
    const pub = { qi, text: q.text, type: q.type, dur, showText: !!this.settings.phoneText, poll: !!q.poll, double: !!q.double };
    if (q.type === 'mc') pub.options = q.options;
    if (q.image) pub.image = q.image;
    this.unsubAnswers && this.unsubAnswers();
    this.unsubAnswers = null;
    Sound.stopMusic();
    this.setState({ phase: 'intro', qi, dur }, { question: pub, [`answers/${qi}`]: null, [`results/${qi}`]: null });
    Sound.gong();
    this.later(() => this.goQuestion(), INTRO_MS);
  },

  goQuestion() {
    if (!this.state || this.state.phase !== 'intro') return;
    const { qi, dur } = this.state;
    this.answers = {};
    this.closing = false;
    this.setState({ phase: 'question', qi, dur, endsAt: serverNow() + dur * 1000 });
    this.watchAnswers(qi);
    this.startTicker();
    Sound.startMusic();
  },

  watchAnswers(qi) {
    this.unsubAnswers && this.unsubAnswers();
    this.unsubAnswers = db.on(this.path(`answers/${qi}`), v => { this.answers = v || {}; this.updateAnswerCount(); });
  },

  startTicker() {
    clearInterval(this.ticker);
    this.ticker = setInterval(() => this.tick(), 100);
    this.tick();
  },

  tick() {
    const st = this.state;
    if (!st || st.phase !== 'question') return;
    const left = Math.max(0, st.endsAt - serverNow());
    const ring = $('#ring');
    if (ring) ring.style.strokeDashoffset = String(RING_LEN * (1 - left / (st.dur * 1000)));
    const num = $('#ringNum'), sec = Math.ceil(left / 1000);
    if (num && num.textContent !== String(sec)) {
      num.textContent = sec;
      if (sec <= 5 && sec > 0 && !this.closing) { Sound.tick(); num.parentElement.classList.add('hurry'); }
    }
    if (left <= 0) this.closeQuestion('time');
  },

  updateAnswerCount() {
    if (!this.state || this.state.phase !== 'question') return;
    const ids = Object.keys(this.players);
    const n = ids.filter(p => this.answers[p]).length;
    const el = $('#ansCount');
    if (el) el.textContent = String(n);
    const active = ids.filter(p => this.players[p].connected !== false);
    if (active.length && active.every(p => this.answers[p])) this.closeQuestion('all');
  },

  async closeQuestion(reason) {
    if (!this.state || this.state.phase !== 'question' || this.closing) return;
    this.closing = true;
    clearInterval(this.ticker);
    Sound.stopMusic();
    const qi = this.state.qi, seq = this.seq;
    const status = $('#qStatus');
    if (status) status.textContent = reason === 'all' ? 'Alle haben geantwortet!' : reason === 'time' ? 'Zeit abgelaufen!' : 'Beendet';
    const wrap = $('.host.question');
    if (wrap) wrap.classList.add('closed');
    await sleep(reason === 'time' ? GRACE_MS : 500);
    if (this.seq !== seq || !this.state || this.state.phase !== 'question') return;
    let answers = this.answers;
    try { answers = (await withTimeout(db.get(this.path(`answers/${qi}`)), 4000)) || {}; } catch (e) { /* lokale Kopie nehmen */ }
    if (this.seq !== seq || !this.state) return;
    this.unsubAnswers && this.unsubAnswers();
    this.unsubAnswers = null;
    const res = this.computeResults(qi, answers);
    const extra = { [`results/${qi}`]: res.pub };
    for (const [pid, p] of Object.entries(res.players)) {
      extra[`players/${pid}/score`] = p.score;
      extra[`players/${pid}/streak`] = p.streak;
    }
    this.results[qi] = res.pub;
    this.setState({ phase: 'reveal', qi, dur: this.state.dur }, extra);
    Sound.reveal();
  },

  computeResults(qi, answers) {
    const q = this.quiz.questions[qi];
    const durMs = (q.time || this.settings.time) * 1000;
    const counts = q.type === 'mc' ? q.options.map(() => 0) : [];
    const textMap = new Map();
    const gains = {}, ok = {}, msMap = {};
    let fastest = null, correctCount = 0, answered = 0;
    for (const [pid, a] of Object.entries(answers || {})) {
      const p = this.players[pid];
      if (!p || !a || typeof a !== 'object') continue;
      let right = false;
      if (q.type === 'mc') {
        const c = Number(a.c);
        if (!Number.isInteger(c) || c < 0 || c >= q.options.length) continue;
        counts[c]++;
        right = q.correct.includes(c);
      } else {
        const t = String(a.t || '').trim().slice(0, 80);
        const n = norm(t);
        if (!n) continue;
        right = q.answers.some(x => norm(x) === n);
        const e = textMap.get(n) || { t, n: 0, ok: right };
        e.n++;
        textMap.set(n, e);
      }
      answered++;
      const ms = Math.round(clamp(Number.isFinite(Number(a.ms)) ? Number(a.ms) : durMs, 0, durMs));
      msMap[pid] = ms;
      if (q.poll) { gains[pid] = 0; continue; }   // Umfrage: nur zählen, keine Punkte
      ok[pid] = right;
      gains[pid] = points(right, ms, durMs, this.settings.mode) * (q.double ? 2 : 1);
      if (right) {
        correctCount++;
        if (!fastest || ms < fastest.ms) fastest = { pid, name: p.name, avatar: p.avatar || '', ms };
      }
    }
    const players = {};
    for (const [pid, p] of Object.entries(this.players)) {
      const score = (p.score || 0) + (gains[pid] || 0);
      const streak = q.poll ? (p.streak || 0) : ok[pid] ? (p.streak || 0) + 1 : 0;
      players[pid] = { score, streak };
      p.score = score;
      p.streak = streak;
    }
    const scores = Object.fromEntries(Object.entries(players).map(([k, v]) => [k, v.score]));
    const ranks = rankMap(scores);
    // Wie Kahoot auf dem Handy: „… Punkte hinter <Name>“ – der nächstbessere Platz
    const order = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const behind = {};
    order.forEach((pid, i) => {
      for (let j = i - 1; j >= 0; j--) {
        if (scores[order[j]] > scores[pid]) { behind[pid] = { name: this.players[order[j]].name, d: scores[order[j]] - scores[pid] }; break; }
      }
    });
    const textTop = [...textMap.values()].sort((a, b) => b.n - a.n).slice(0, 6);
    const pub = {
      qi, type: q.type, poll: !!q.poll, double: !!q.double, correct: q.type === 'mc' ? q.correct : [], accepted: q.type === 'text' ? q.answers : [],
      counts, textTop, answered, correctCount, fastest, gains, ok, ms: msMap, ranks, behind, n: Object.keys(players).length
    };
    return { pub, players };
  },

  goEnd() {
    const scores = Object.fromEntries(Object.entries(this.players).map(([k, p]) => [k, p.score || 0]));
    Sound.stopMusic();
    this.setState({ phase: 'end', qi: this.state.qi }, { final: { ranks: rankMap(scores), n: Object.keys(scores).length } });
  },

  /* ---------- Ansichten ---------- */

  render() {
    document.body.dataset.mood = '';
    document.body.dataset.view = 'host';
    const ph = this.state.phase;
    if (ph === 'lobby') this.renderLobby();
    else if (ph === 'intro') this.renderIntro();
    else if (ph === 'question') this.renderQuestion();
    else if (ph === 'reveal') this.renderReveal();
    else if (ph === 'leaderboard') this.renderBoard();
    else if (ph === 'end') this.renderEnd();
  },

  // Untere Leiste wie bei Kahoot: Fragezähler links, Beitrittsdaten Mitte, Steuerung rechts
  topbar() {
    const st = this.state;
    const soundBtn = h('button', { class: 'iconbtn', title: 'Musik an/aus' }, icon(Sound.on ? 'sound' : 'mute'));
    soundBtn.addEventListener('click', () => {
      Sound.on = !Sound.on;
      this.settings.sound = Sound.on;
      if (!Sound.on) Sound.stopMusic();
      else {
        Sound.init();
        if (st.phase === 'question' && !this.closing) Sound.startMusic();
        if (st.phase === 'lobby') Sound.startMusic('lobby');
      }
      soundBtn.replaceChildren(icon(Sound.on ? 'sound' : 'mute'));
      this.saveSession();
    });
    // Sperre auch während des Spiels aufheben können (im Warteraum gibt es den großen Knopf)
    let lockB = null;
    if (st.phase !== 'lobby') {
      lockB = h('button', { class: 'iconbtn', title: this.locked ? 'Gesperrt – klicken zum Freigeben' : 'Offen – klicken zum Sperren' }, icon(this.locked ? 'lock' : 'unlock'));
      lockB.addEventListener('click', () => {
        this.locked = !this.locked;
        lockB.replaceChildren(icon(this.locked ? 'lock' : 'unlock'));
        lockB.title = this.locked ? 'Gesperrt – klicken zum Freigeben' : 'Offen – klicken zum Sperren';
        db.set(this.path('locked'), this.locked || null).catch(e => toast(e.message));
      });
    }
    return h('div', { class: 'footbar' },
      h('div', { class: 'fb-left' }, st.qi >= 0 && st.phase !== 'end' ? `${st.qi + 1} / ${this.total()}` : ''),
      h('div', { class: 'fb-mid' }, 'Beitreten: ', h('b', null, shortUrl()), h('span', { class: 'fb-sep' }), 'PIN ', h('b', { class: 'mono' }, fmtCode(this.code))),
      h('div', { class: 'fb-right' },
        h('span', { class: 'fb-count', title: 'Teilnehmende' }, icon('user'), h('span', { id: 'tbCount' }, String(this.count()))),
        lockB,
        soundBtn,
        h('button', { class: 'iconbtn', title: 'Vollbild (Taste F)', onclick: toggleFS }, icon('expand'))));
  },

  renderLobby() {
    const qr = h('div', { class: 'qr' });
    this.chipEls = {};
    const fileWarn = location.protocol === 'file:' && !CFG.publicUrl && !LOCAL;
    const lockBtn = h('button', { class: 'btn lockbtn' + (this.locked ? ' on' : ''), title: 'Beitritt sperren/freigeben' });
    const paintLock = () => {
      lockBtn.classList.toggle('on', this.locked);
      lockBtn.replaceChildren(icon(this.locked ? 'lock' : 'unlock'), this.locked ? 'Gesperrt' : 'Offen');
    };
    paintLock();
    lockBtn.addEventListener('click', () => {
      this.locked = !this.locked;
      paintLock();
      db.set(this.path('locked'), this.locked || null).catch(e => toast(e.message));
    });
    view(h('div', { class: 'host lobby' },
      h('div', { class: 'pin-bar' },
        h('div', { class: 'pin-join' }, 'Beitreten auf', h('b', null, shortUrl())),
        h('div', { class: 'pin-box' }, h('span', null, 'Spiel-PIN:'), h('b', { class: 'pin mono' }, fmtCode(this.code))),
        qr),
      h('div', { class: 'lobby-mid' },
        h('div', { class: 'count-box' }, icon('user'), h('span', { id: 'lobbyCount' }, '0')),
        h('div', { class: 'lobby-title' }, this.quiz.title),
        h('div', { class: 'row-btns' },
          lockBtn,
          h('button', { class: 'btn big', id: 'startBtn', onclick: () => this.next() }, 'Start'))),
      fileWarn ? h('div', { class: 'notice' }, 'Die Seite ist als Datei geöffnet – Handys erreichen diese Adresse nicht. Bitte publicUrl in config.js eintragen.') : null,
      LOCAL ? h('div', { class: 'notice' }, 'Testmodus – nur Tabs in diesem Browser können beitreten. ',
        h('a', { href: joinUrl(this.code), target: '_blank', rel: 'noopener' }, 'Test-Teilnehmer öffnen')) : null,
      h('div', { class: 'chips', id: 'chips' }, h('div', { class: 'chips-empty' }, 'Warte auf Spieler …')),
      h('div', { class: 'lobby-foot' },
        h('span', null, 'Namen anklicken = entfernen'),
        h('button', { class: 'btn small ghost', onclick: () => { this.reuseCode = this.code; this.leaveRoom(); this.editor(); } }, 'Fragen bearbeiten')),
      this.topbar()));
    makeQR(qr, joinUrl(this.code));
    this.updateChips(true);
    if (!Sound.music) Sound.startMusic('lobby');
  },

  updateChips(silent) {
    const chips = $('#chips');
    if (!chips) return;
    for (const pid of Object.keys(this.chipEls)) if (!this.players[pid]) { this.chipEls[pid].remove(); delete this.chipEls[pid]; }
    let added = 0;
    for (const [pid, p] of Object.entries(this.players)) {
      if (!this.chipEls[pid]) {
        const el = h('button', { class: 'chip' + (silent ? '' : ' pop'), title: 'Klicken zum Entfernen' },
          h('span', { class: 'nm' }, p.name));
        el.addEventListener('click', () => this.kick(pid, el));
        this.chipEls[pid] = el;
        chips.append(el);
        added++;
      }
      this.chipEls[pid].classList.toggle('off', p.connected === false);
    }
    const empty = $('.chips-empty', chips);
    if (empty) empty.style.display = this.count() ? 'none' : '';
    if (added && !silent) Sound.pop();
    const c = $('#lobbyCount');
    if (c) c.textContent = this.count();
    const sb = $('#startBtn');
    if (sb) sb.disabled = !this.count();
  },

  kick(pid, el) {
    if (el.classList.contains('kick')) { db.remove(this.path(`players/${pid}`)).catch(e => toast(e.message)); return; }
    const nm = $('.nm', el), old = nm.textContent;
    el.classList.add('kick');
    nm.textContent = 'Entfernen?';
    setTimeout(() => { if (el.isConnected) { el.classList.remove('kick'); nm.textContent = old; } }, 2500);
  },

  qBar() {
    const q = this.quiz.questions[this.state.qi];
    return h('div', { class: 'q-bar' }, q.text);
  },

  tags(q) {
    return [q.double ? h('span', { class: 'tag hot' }, '2× Punkte') : null, q.poll ? h('span', { class: 'tag' }, 'Umfrage – keine Punkte') : null];
  },

  renderIntro() {
    const q = this.quiz.questions[this.state.qi];
    view(h('div', { class: 'host intro' },
      h('div', { class: 'intro-body' },
        h('div', { class: 'intro-num' }, `Frage ${this.state.qi + 1} von ${this.total()}`, this.tags(q)),
        h('div', { class: 'intro-card' }, q.text),
        q.image ? h('img', { class: 'q-img', src: q.image, alt: '' }) : null,
        h('div', { class: 'intro-bar' }, h('div'))),
      h('div', { class: 'host-actions' }, h('span'), h('button', { class: 'btn small', onclick: () => this.next() }, 'Überspringen')),
      this.topbar()));
  },

  renderQuestion() {
    const q = this.quiz.questions[this.state.qi];
    view(h('div', { class: 'host question' + (this.closing ? ' closed' : '') },
      this.qBar(),
      h('div', { class: 'q-mid' },
        h('div', { class: 'timer' }, h('span', { id: 'ringNum' }, String(this.state.dur))),
        h('div', { class: 'q-media' },
          q.image ? h('img', { class: 'q-img', src: q.image, alt: '' }) : null,
          h('div', { class: 'q-tags' }, this.tags(q)),
          h('div', { class: 'q-status', id: 'qStatus' })),
        h('div', { class: 'ans-box' }, h('div', { class: 'ans-n', id: 'ansCount' }, '0'), h('div', null, 'Antworten'))),
      q.type === 'mc'
        ? h('div', { class: 'tiles n' + q.options.length }, q.options.map((o, i) =>
          h('div', { class: `tile ${COLORS[i]}`, style: `--d:${i * 70}ms` }, shapeEl(i), h('span', { class: 'tile-t' }, o))))
        : h('div', { class: 'type-hint' }, 'Antwort auf dem Handy eintippen'),
      h('div', { class: 'host-actions' },
        h('span', { class: 'hint' }, 'Leertaste = weiter'),
        h('button', { class: 'btn small', onclick: () => this.next() }, 'Überspringen')),
      this.topbar()));
    this.updateAnswerCount();
    this.tick();
  },

  renderReveal() {
    const qi = this.state.qi, q = this.quiz.questions[qi], r = this.results[qi] || {};
    const last = qi >= this.total() - 1;
    let main;
    if (q.type === 'mc') {
      const counts = q.options.map((_, i) => (r.counts && r.counts[i]) || 0);
      const max = Math.max(1, ...counts);
      const mark = i => q.poll ? '' : q.correct.includes(i) ? ' right' : ' wrong';
      main = [
        h('div', { class: 'bars' }, q.options.map((o, i) => {
          const bar = h('div', { class: `bar ${COLORS[i]}` });
          this.later(() => { bar.style.height = (counts[i] ? 4 + counts[i] / max * 96 : 0) + '%'; }, 80);
          return h('div', { class: 'bar-col' + mark(i) },
            h('div', { class: 'bar-n' }, String(counts[i])),
            h('div', { class: 'bar-track' }, bar),
            h('div', { class: `bar-base ${COLORS[i]}` }, shapeEl(i), q.poll ? null : icon(q.correct.includes(i) ? 'check' : 'cross')));
        })),
        h('div', { class: 'tiles n' + q.options.length }, q.options.map((o, i) =>
          h('div', { class: `tile ${COLORS[i]}${q.poll ? '' : q.correct.includes(i) ? ' right' : ' dim'}`, style: '--d:0ms' },
            shapeEl(i), h('span', { class: 'tile-t' }, o), q.poll ? null : icon(q.correct.includes(i) ? 'check' : 'cross', 'tile-mark'))))
      ];
    } else {
      const top = r.textTop || [];
      main = [h('div', { class: 'text-res' },
        h('div', { class: 'accepted' }, icon('check'), 'Richtig: ', h('b', null, q.answers.join(' / '))),
        h('div', { class: 'text-top' }, top.length
          ? top.map(e => h('div', { class: 'tt' + (e.ok ? ' ok' : '') }, icon(e.ok ? 'check' : 'cross'), h('span', null, e.t), h('b', null, String(e.n))))
          : h('div', { class: 'hint' }, 'Keine Antworten')))];
    }
    const fast = q.poll ? null : r.fastest
      ? h('div', { class: 'fastest' }, icon('bolt'), 'Am schnellsten richtig: ', h('b', null, r.fastest.name), h('span', { class: 'fast-t' }, fmtSec(r.fastest.ms)))
      : h('div', { class: 'fastest none' }, r.answered ? 'Diesmal lag niemand richtig' : 'Keine Antworten eingegangen');
    view(h('div', { class: 'host reveal' },
      this.qBar(),
      fast,
      main,
      h('div', { class: 'host-actions' },
        h('span', { class: 'stat' }, q.poll ? `Umfrage · ${r.answered || 0} Stimmen` : `${r.correctCount || 0} von ${r.answered || 0} richtig`),
        h('button', { class: 'btn big', onclick: () => this.next() },
          last ? 'Siegerehrung' : this.settings.board ? 'Weiter' : 'Nächste Frage')),
      this.topbar()));
  },

  sortedPlayers() {
    return Object.entries(this.players)
      .map(([pid, p]) => ({ pid, name: p.name, avatar: p.avatar || '🙂', score: p.score || 0 }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'de'));
  },

  renderBoard() {
    const qi = this.state.qi, gains = (this.results[qi] && this.results[qi].gains) || {};
    const now = this.sortedPlayers();
    now.forEach(x => { x.gain = gains[x.pid] || 0; x.prev = x.score - x.gain; });
    const before = [...now].sort((a, b) => b.prev - a.prev || a.name.localeCompare(b.name, 'de'));
    const prevIdx = new Map(before.map((x, i) => [x.pid, i]));
    const ranks = rankMap(Object.fromEntries(now.map(x => [x.pid, x.score])));
    const top = now.slice(0, 5);   // Kahoot zeigt die Top 5
    const board = h('div', { class: 'board', style: `height:${Math.max(1, top.length) * 11}vh` });
    top.forEach((x, i) => {
      const pi = prevIdx.get(x.pid);
      const sc = h('span', { class: 'sc' }, fmtNum(x.prev));
      const row = h('div', { class: 'brow' + (i === 0 ? ' lead' : ''), style: `--i:${pi < top.length ? pi : top.length}` + (pi < top.length ? '' : ';opacity:0') },
        h('span', { class: 'rk' }, String(ranks[x.pid])), h('span', { class: 'nm' }, x.name),
        x.gain ? h('span', { class: 'gain' }, '+' + fmtNum(x.gain)) : null, sc);
      board.append(row);
      this.later(() => { row.style.setProperty('--i', i); row.style.opacity = '1'; countUp(sc, x.prev, x.score, 1200); }, 700);
    });
    view(h('div', { class: 'host board-v' },
      h('div', { class: 'title-box' }, 'Zwischenstand'),
      board,
      h('div', { class: 'host-actions' },
        h('span', { class: 'stat' }, `Nach Frage ${qi + 1} von ${this.total()}`),
        h('button', { class: 'btn big', onclick: () => this.next() }, 'Weiter')),
      this.topbar()));
  },

  renderEnd() {
    const list = this.sortedPlayers();
    const ranks = rankMap(Object.fromEntries(list.map(x => [x.pid, x.score])));
    const pod = i => list[i] ? h('div', { class: `pod p${i + 1}` },
      h('div', { class: 'pod-name' }, list[i].name),
      h('div', { class: 'pod-block' },
        h('div', { class: 'medal' }, String(ranks[list[i].pid])),
        h('div', { class: 'pod-score' }, fmtNum(list[i].score)))) : h('div', { class: 'pod empty' });
    // Datenschutz: Namen, Antworten und Punkte nach der Sitzung aus Firebase löschen (zweimal klicken)
    const delBtn = h('button', { class: 'btn small ghost' }, 'Raum löschen');
    delBtn.addEventListener('click', async () => {
      if (!delBtn.classList.contains('armed')) {
        delBtn.classList.add('armed');
        delBtn.textContent = 'Wirklich löschen? Nochmal klicken';
        setTimeout(() => { if (delBtn.isConnected) { delBtn.classList.remove('armed'); delBtn.textContent = 'Raum löschen'; } }, 4000);
        return;
      }
      try { await withTimeout(db.remove(this.path())); } catch (e) { return toast('Löschen fehlgeschlagen: ' + e.message, 6000); }
      this.leaveRoom();
      store.del('quiz-host-session');
      toast('Raum gelöscht – Namen, Antworten und Punkte sind entfernt.');
      this.editor();
    });
    view(h('div', { class: 'host end' },
      h('div', { class: 'title-box' }, this.quiz.title),
      h('div', { class: 'podium' }, pod(1), pod(0), pod(2)),
      list.length > 3 ? h('div', { class: 'rest' }, list.slice(3, 10).map(x =>
        h('div', { class: 'rest-row' }, h('span', { class: 'rk' }, ranks[x.pid] + '.'), h('span', null, x.name), h('b', null, fmtNum(x.score))))) : null,
      h('div', { class: 'host-actions' },
        h('div', { class: 'row-btns' },
          h('button', { class: 'btn small', onclick: () => this.exportCSV() }, 'Ergebnisse (CSV)'),
          delBtn),
        h('button', { class: 'btn big', onclick: () => { this.leaveRoom(); store.del('quiz-host-session'); this.editor(); } }, 'Neues Quiz')),
      this.topbar()));
    const show = (cls, ms) => this.later(() => { const el = $('.pod.' + cls); if (el) el.classList.add('show'); }, ms);
    show('p3', 600); show('p2', 1700);
    this.later(() => { const el = $('.pod.p1'); if (el) el.classList.add('show'); confetti(5000); Sound.fanfare(); }, 2900);
  },

  async exportCSV() {
    let results = this.results;
    try { results = (await withTimeout(db.get(this.path('results')), 3000)) || this.results; } catch (e) { /* lokale Kopie */ }
    const n = this.total();
    const list = this.sortedPlayers();
    const ranks = rankMap(Object.fromEntries(list.map(x => [x.pid, x.score])));
    const cell = v => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // Namen wie „=1+1“ nicht als Excel-Formel ausführen
      return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows = [['Platz', 'Name', 'Punkte', 'Richtig', ...Array.from({ length: n }, (_, i) => 'Frage ' + (i + 1))]];
    for (const x of list) {
      let right = 0;
      const per = Array.from({ length: n }, (_, i) => {
        const r = results && results[i];
        if (r && r.poll) return r.ms && x.pid in r.ms ? 'Stimme' : '–';
        if (!r || !r.ok || !(x.pid in r.ok)) return '–';
        if (r.ok[x.pid]) right++;
        return (r.gains && r.gains[x.pid]) || 0;
      });
      rows.push([ranks[x.pid], x.name, x.score, right, ...per]);
    }
    const date = new Date().toISOString().slice(0, 10);
    download(`Quiz-Ergebnisse-${date}.csv`, '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n'), 'text/csv');
  }
};

/* ===================== TEILNEHMENDE (Handy) ===================== */

// Wer den Tab schließt und den QR-Code neu scannt, soll derselbe Spieler bleiben (localStorage).
// Im Testmodus pro Tab (sessionStorage), damit mehrere Test-Teilnehmer in einem Browser möglich sind.
const PSTORE = (() => { try { return LOCAL ? sessionStorage : localStorage; } catch (e) { return null; } })();

const Player = {
  code: null, pid: null, me: null, state: null, q: null, results: null, final: null,
  answeredQi: -1, sentQi: -1, myAnswer: null, t0: 0, t0Qi: -1, expiredQi: -1, checkedQi: -1, checkingQi: -1, resQi: -1,
  unsubs: [], resUnsub: null, finalUnsub: null, expireT: null, lastKey: null, online: false,

  init() {
    db.onConnected(setConn);
    // Nach Standby/App-Wechsel: Timer-Balken und Ablaufzeit neu berechnen
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.state) { this.lastKey = null; this.render(); }
    });
    const code = (P.get('code') || '').replace(/\D/g, '');
    const sess = store.get('quiz-player', PSTORE);
    if (sess && sess.code && sess.pid && (!code || sess.code === code)) {
      view(h('div', { class: 'player' }, h('div', { class: 'center' }, h('div', { class: 'spinner' }), 'Verbinde …')));
      Promise.all([
        withTimeout(db.get(`rooms/${sess.code}/players/${sess.pid}`)),
        withTimeout(db.get(`rooms/${sess.code}/state`)),
        withTimeout(db.get(`rooms/${sess.code}/meta`))
      ]).then(([p, st, meta]) => {
        // Ohne Code in der Adresse nie in ein beendetes oder altes Quiz (z. B. von letzter Woche) zurück
        const fresh = meta && Date.now() - (meta.created || 0) < 6 * 3600 * 1000;
        if (p && p.name && st && (code || (st.phase !== 'end' && fresh))) this.enter(sess.code, sess.pid);
        else this.joinForm(code);
      }).catch(e => this.joinForm(code, 'Verbindung fehlgeschlagen: ' + e.message));
    } else this.joinForm(code);
  },

  cleanup() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.resUnsub && this.resUnsub();
    this.finalUnsub && this.finalUnsub();
    this.resUnsub = this.finalUnsub = null;
    clearTimeout(this.expireT);
    Object.assign(this, { me: null, state: null, q: null, results: null, final: null, answeredQi: -1, sentQi: -1, myAnswer: null,
      t0Qi: -1, expiredQi: -1, checkedQi: -1, checkingQi: -1, resQi: -1, lastKey: null, online: false });
  },

  // Schritt 1 wie bei Kahoot: Spiel-PIN (entfällt, wenn der QR-Code sie schon mitbringt)
  joinForm(code = '', msg = '') {
    this.cleanup();
    document.body.dataset.mood = '';
    if (code) return this.nameStep(code, msg);
    const codeIn = h('input', { class: 'inp mono', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Spiel-PIN', maxlength: '7', 'aria-label': 'Spiel-PIN' });
    const err = h('div', { class: 'err' }, msg);
    const btn = h('button', { class: 'btn big dark', type: 'submit' }, 'Eingeben');
    view(h('div', { class: 'player join-page' },
      h('div', { class: 'logo' }, 'Quiz!'),
      h('form', { class: 'join-card', onsubmit: async e => {
        e.preventDefault();
        const c = codeIn.value.replace(/\D/g, '');
        if (c.length !== 6) { err.textContent = 'Die PIN hat 6 Ziffern.'; return; }
        btn.disabled = true;
        const meta = await this.checkRoom(c, err);
        btn.disabled = false;
        if (meta) this.nameStep(c, '', meta);
      } }, codeIn, btn),
      err,
      LOCAL ? h('div', { class: 'hint' }, 'Testmodus – funktioniert nur im selben Browser wie der Host.') : null,
      h('a', { class: 'hostlink', href: '?host' + (P.get('backend') === 'local' ? '&backend=local' : '') }, 'Ich leite das Quiz')));
    setTimeout(() => codeIn.focus(), 50);
  },

  async checkRoom(code, err) {
    try {
      const [st, meta] = await Promise.all([withTimeout(db.get(`rooms/${code}/state`)), withTimeout(db.get(`rooms/${code}/meta`))]);
      if (!st) { err.textContent = 'Kein Quiz mit dieser PIN gefunden.'; return null; }
      if (st.phase === 'end') { err.textContent = 'Dieses Quiz ist schon vorbei.'; return null; }
      // Gesperrt? Dann schon beim PIN-Schritt Bescheid sagen (wer schon drin war, kommt über init() zurück)
      const sess = store.get('quiz-player', PSTORE);
      if (!(sess && sess.code === code) && await withTimeout(db.get(`rooms/${code}/locked`)).catch(() => null)) {
        err.textContent = 'Das Spiel ist gesperrt.';
        return null;
      }
      return meta || {};
    } catch (e) {
      err.textContent = 'Verbindung fehlgeschlagen: ' + e.message;
      return null;
    }
  },

  // Schritt 2: Spitzname eingeben – oder, wenn der Tutor den Namensgenerator eingeschaltet hat, würfeln
  async nameStep(code, msg = '', meta) {
    const err = h('div', { class: 'err' }, msg);
    if (!meta) {
      view(h('div', { class: 'player join-page' }, h('div', { class: 'logo' }, 'Quiz!'), h('div', { class: 'spinner' })));
      meta = await this.checkRoom(code, err);
      if (!meta) {
        return view(h('div', { class: 'player join-page' },
          h('div', { class: 'logo' }, 'Quiz!'),
          h('div', { class: 'join-card' }, err,
            h('button', { class: 'btn big dark', onclick: () => this.nameStep(code) }, 'Nochmal versuchen'),
            h('button', { class: 'btn ghost-dark', onclick: () => this.joinForm('') }, 'Andere PIN eingeben'))));
      }
    }
    const gen = !!meta.namegen;
    let genName = randomName();
    const nameIn = h('input', { class: 'inp', maxlength: '20', autocomplete: 'off', autocapitalize: 'words', placeholder: 'Spitzname', enterkeyhint: 'go', 'aria-label': 'Spitzname' });
    nameIn.value = store.get('quiz-name') || '';
    const genEl = h('div', { class: 'gen-name' }, genName);
    const btn = h('button', { class: 'btn big dark', type: 'submit' }, 'Los geht’s!');
    view(h('div', { class: 'player join-page' },
      h('div', { class: 'logo' }, 'Quiz!'),
      h('form', { class: 'join-card', onsubmit: e => { e.preventDefault(); this.join(code, gen ? genName : nameIn.value, err, btn, !gen); } },
        h('div', { class: 'join-pin' }, 'PIN ', h('b', { class: 'mono' }, fmtCode(code))),
        gen ? [h('div', { class: 'hint-dark' }, 'Dein Spitzname:'), genEl,
          h('button', { class: 'btn ghost-dark', type: 'button', onclick: () => { genName = randomName(); genEl.textContent = genName; } }, 'Neu würfeln')]
          : nameIn,
        btn),
      err));
    if (!gen) setTimeout(() => nameIn.focus(), 50);
  },

  async join(codeRaw, nameRaw, err, btn, remember = true) {
    const code = String(codeRaw).replace(/\D/g, '');
    const name = String(nameRaw).replace(/\s+/g, ' ').trim().slice(0, 20);
    if (code.length !== 6) { err.textContent = 'Die PIN hat 6 Ziffern.'; return; }
    if (!name) { err.textContent = 'Bitte gib einen Spitznamen ein.'; return; }
    btn.disabled = true;
    err.textContent = '';
    try {
      const st = await withTimeout(db.get(`rooms/${code}/state`));
      if (!st) { err.textContent = 'Kein Quiz mit dieser PIN gefunden.'; btn.disabled = false; return; }
      if (st.phase === 'end') { err.textContent = 'Dieses Quiz ist schon vorbei.'; btn.disabled = false; return; }
      const [players0, locked] = await Promise.all([withTimeout(db.get(`rooms/${code}/players`)), withTimeout(db.get(`rooms/${code}/locked`))]);
      const players = cleanPlayers(players0);
      const sess = store.get('quiz-player', PSTORE);
      const pid = sess && sess.code === code && sess.pid ? sess.pid : rid();
      // Gesperrt (Schloss im Warteraum): Neue kommen nicht mehr rein, wer schon drin war, schon
      if (locked && !players[pid]) { err.textContent = 'Das Spiel ist gesperrt.'; btn.disabled = false; return; }
      const taken = new Set(Object.entries(players).filter(([k]) => k !== pid).map(([, p]) => p.name.toLowerCase()));
      let final = name;
      for (let i = 2; taken.has(final.toLowerCase()); i++) final = `${name.slice(0, 17)} ${i}`;
      const existing = players[pid];
      const data = { name: final, connected: true };
      if (!existing) Object.assign(data, { avatar: AVATARS[Math.random() * AVATARS.length | 0], score: 0, streak: 0, joinedAt: Date.now() });
      await withTimeout(db.update(`rooms/${code}/players/${pid}`, data));
      if (remember) store.set('quiz-name', name);
      store.set('quiz-player', { code, pid }, PSTORE);
      Sound.init();
      keepAwake();
      this.enter(code, pid);
    } catch (e) {
      err.textContent = 'Verbindung fehlgeschlagen: ' + e.message;
      btn.disabled = false;
    }
  },

  enter(code, pid) {
    this.cleanup();
    this.code = code;
    this.pid = pid;
    const base = `rooms/${code}`, me = `${base}/players/${pid}`;
    view(h('div', { class: 'player' }, h('div', { class: 'center' }, h('div', { class: 'spinner' }), 'Verbinde …')));
    this.unsubs.push(db.on(me, v => {
      // Raum nach der Siegerehrung gelöscht: Endbildschirm (Platz, Punkte) stehen lassen
      if (!(v && v.name) && this.state && this.state.phase === 'end') return this.detach();
      const had = !!this.me;
      this.me = v && v.name ? v : null;
      if (!this.me && had) return this.leave('Du wurdest aus dem Quiz entfernt.');
      // Ein verspätetes onDisconnect der alten Verbindung hat uns fälschlich auf offline gesetzt
      if (this.me && this.me.connected === false && this.online) db.update(me, { connected: true }).catch(() => {});
      const s = $('#pScore');
      if (s && this.me) s.textContent = fmtNum(this.me.score);
      this.render();
    }));
    this.unsubs.push(db.on(`${base}/question`, v => { this.q = v; this.render(); }));
    this.unsubs.push(db.on(`${base}/state`, v => {
      if (!v && this.state && this.state.phase === 'end') return this.detach();
      if (!v) return this.leave('Dieses Quiz gibt es nicht mehr.');
      const prev = this.state;
      this.state = v;
      this.onState(prev);
    }));
    this.unsubs.push(db.onConnected(c => {
      this.online = c;
      if (!c || !this.pid) return;
      // Firebase-Empfehlung: erst onDisconnect anmelden, dann online melden
      Promise.resolve(db.onDisconnectUpdate(me, { connected: false }))
        .then(() => db.update(me, { connected: true }))
        .catch(() => {});
    }));
    keepAwake();
  },

  // Vom (gelöschten) Raum abmelden, aber den aktuellen Bildschirm stehen lassen
  detach() {
    if (this.code && this.pid) Promise.resolve(db.cancelDisconnect(`rooms/${this.code}/players/${this.pid}`)).catch(() => {});
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.resUnsub && this.resUnsub();
    this.finalUnsub && this.finalUnsub();
    this.resUnsub = this.finalUnsub = null;
    store.del('quiz-player', PSTORE);
  },

  leave(msg) {
    if (this.code && this.pid) Promise.resolve(db.cancelDisconnect(`rooms/${this.code}/players/${this.pid}`)).catch(() => {});
    store.del('quiz-player', PSTORE);
    const code = this.code;
    this.pid = null;
    this.joinForm(code || '', msg);
  },

  onState(prev) {
    const st = this.state;
    if ((st.phase === 'reveal' || st.phase === 'leaderboard') && this.resQi !== st.qi) {
      this.resUnsub && this.resUnsub();
      this.results = null;
      this.resQi = st.qi;
      this.resUnsub = db.on(`rooms/${this.code}/results/${st.qi}`, v => { this.results = v; this.render(); });
    }
    if (st.phase === 'end' && !this.finalUnsub) {
      // null ignorieren, sobald das Endergebnis da ist (z. B. wenn der Tutor den Raum danach löscht)
      this.finalUnsub = db.on(`rooms/${this.code}/final`, v => { if (v || !this.final) { this.final = v; this.render(); } });
    }
    // Kennt das Handy die Frage schon (intro→question oder Host-Tab-Übernahme), weiß es selbst, ob es geantwortet hat
    const normalFlow = prev && prev.qi === st.qi && (prev.phase === 'intro' || prev.phase === 'question');
    if (st.phase === 'question' && this.checkedQi !== st.qi && !normalFlow) {
      // Neu geladen oder mitten in der Frage beigetreten: erst prüfen, ob schon geantwortet wurde,
      // sonst könnte man ein zweites Mal antworten und die erste Antwort überschreiben
      const qi = st.qi;
      this.checkedQi = qi;
      this.checkingQi = qi;
      withTimeout(db.get(`rooms/${this.code}/answers/${qi}/${this.pid}`), 5000).then(a => {
        if (a && this.answeredQi !== qi) { this.answeredQi = qi; this.sentQi = qi; this.myAnswer = a; }
      }).catch(() => {}).finally(() => {
        if (this.checkingQi === qi) { this.checkingQi = -1; this.lastKey = null; this.render(); }
      });
    }
    if (st.phase === 'question' && (!prev || prev.phase !== 'question')) vibrate(40);
    this.render();
  },

  render() {
    const st = this.state;
    if (!st || !this.me) return;
    const key = [st.phase, st.qi, st.seq, this.q && this.q.qi, this.answeredQi === st.qi, this.sentQi === st.qi,
      this.expiredQi === st.qi, this.checkingQi === st.qi, !!this.results, !!this.final].join('|');
    if (key === this.lastKey) return;
    this.lastKey = key;
    document.body.dataset.mood = '';
    switch (st.phase) {
      case 'lobby': return this.renderLobby();
      case 'intro': return this.renderIntro();
      case 'question': return this.renderQuestion();
      case 'reveal': case 'leaderboard': return this.renderResult();
      case 'end': return this.renderEnd();
    }
  },

  // Kahoot-Handy: oben Fragezähler, unten Spitzname und Punktestand
  topline() {
    const st = this.state;
    const inGame = st && st.qi >= 0 && st.phase !== 'lobby' && st.phase !== 'end';
    return h('div', { class: 'p-top' }, h('span', null, inGame ? `${st.qi + 1} / ${st.total}` : `PIN ${fmtCode(this.code)}`));
  },

  footer() {
    return h('div', { class: 'p-foot' },
      h('span', { class: 'p-me' }, this.me.name),
      h('span', { class: 'p-score', id: 'pScore' }, fmtNum(this.me.score)));
  },

  screen(cls, ...content) {
    view(h('div', { class: 'player ' + cls }, this.topline(), h('div', { class: 'center' }, ...content), this.footer()));
  },

  renderLobby() {
    this.screen('wait',
      h('h2', { class: 'big-title' }, 'Du bist dabei!'),
      h('div', { class: 'sub' }, 'Siehst du deinen Spitznamen auf dem Beamer?'));
  },

  renderIntro() {
    const st = this.state, q = this.q && this.q.qi === st.qi ? this.q : null;
    this.screen('intro',
      h('div', { class: 'q-circle pop-in' }, String(st.qi + 1)),
      h('h2', { class: 'big-title' }, `Frage ${st.qi + 1}`),
      q && q.double ? h('div', { class: 'tag hot' }, '2× Punkte') : null,
      q && q.poll ? h('div', { class: 'tag' }, 'Umfrage – keine Punkte') : null,
      q && q.showText ? h('div', { class: 'p-qtext center-t' }, q.text) : null,
      h('div', { class: 'loader' }, [0, 1, 2, 3].map(i => h('span', { class: COLORS[i] }, shapeEl(i)))));
  },

  renderQuestion() {
    const st = this.state, q = this.q;
    if (!q || q.qi !== st.qi || this.checkingQi === st.qi) return this.screen('wait', h('div', { class: 'spinner' }), 'Lade Frage …');
    if (this.answeredQi === st.qi) return this.renderAnswered();
    const durMs = st.dur * 1000;
    // Restzeit laut Beamer (Serverzeit) – entscheidend nach Neuladen, spätem Beitritt oder Standby
    const serverLeft = st.endsAt ? st.endsAt - serverNow() : durMs;
    if (this.t0Qi !== st.qi) {
      // Antwortzeit ab Anzeige auf dem Handy messen (Netzlaufzeit zählt nicht mit),
      // außer die Frage läuft schon deutlich länger (dann zählt die Zeit seit Fragebeginn)
      this.t0Qi = st.qi;
      this.t0 = Date.now() - (serverLeft < durMs - 1500 ? clamp(durMs - serverLeft, 0, durMs) : 0);
    }
    const left = Math.max(0, Math.min(durMs - (Date.now() - this.t0), serverLeft));
    if (left <= 0 || this.expiredQi === st.qi) {
      this.expiredQi = st.qi;
      return this.screen('wait', h('div', { class: 'res-icon' }, icon('clock')), h('h2', { class: 'big-title' }, 'Zeit abgelaufen'), h('div', { class: 'sub' }, 'Warte auf die Auflösung …'));
    }
    const fill = h('div', { class: 'p-bar-fill', style: `width:${left / durMs * 100}%` });
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.transition = `width ${left}ms linear`; fill.style.width = '0%'; }));
    let body;
    const opts = q.options || [];
    if (q.type === 'mc') {
      // Standard wie Kahoot: nur Farbe + Form (Frage und Antworten stehen auf dem Beamer)
      body = h('div', { class: `p-opts n${opts.length}${q.showText ? ' with-text' : ''}` }, opts.map((o, i) =>
        h('button', { class: `p-opt ${COLORS[i]}`, style: `--d:${i * 50}ms`, 'aria-label': q.showText ? o : `Antwort ${i + 1}`, onclick: () => this.answer({ c: i }) },
          shapeEl(i), q.showText ? h('span', { class: 'p-opt-t' }, o) : null)));
    } else {
      const inp = h('input', { class: 'inp', maxlength: '80', placeholder: 'Deine Antwort', autocomplete: 'off', enterkeyhint: 'send', 'aria-label': 'Antwort' });
      body = h('form', { class: 'p-text', onsubmit: e => { e.preventDefault(); const t = inp.value.trim(); if (t) this.answer({ t }); } },
        inp, h('button', { class: 'btn big dark', type: 'submit' }, 'Absenden'));
      setTimeout(() => inp.focus(), 60);
    }
    view(h('div', { class: 'player q' },
      this.topline(),
      h('div', { class: 'p-bar' }, fill),
      q.showText || q.type === 'text' ? h('div', { class: 'p-qtext' }, q.text) : null,
      body,
      this.footer()));
    clearTimeout(this.expireT);
    this.expireT = setTimeout(() => {
      if (this.state && this.state.phase === 'question' && this.state.qi === st.qi && this.answeredQi !== st.qi) {
        this.expiredQi = st.qi;
        this.render();
      }
    }, left);
  },

  answer(a) {
    const st = this.state;
    if (!st || st.phase !== 'question' || this.answeredQi === st.qi || this.expiredQi === st.qi) return;
    if ((st.endsAt && st.endsAt - serverNow() <= 0) || Date.now() - this.t0 >= st.dur * 1000) {
      this.expiredQi = st.qi;   // Tipp kam zu spät (z. B. Timer im Hintergrund gedrosselt)
      return this.render();
    }
    const ms = Math.round(clamp(Date.now() - this.t0, 0, st.dur * 1000));
    const qi = st.qi;
    this.answeredQi = qi;
    this.myAnswer = { ...a, ms };
    clearTimeout(this.expireT);
    vibrate(25);
    keepAwake();
    this.render();
    // Firebase-set() wartet offline still – erst nach Bestätigung des Servers „Antwort angekommen“ anzeigen
    db.set(`rooms/${this.code}/answers/${qi}/${this.pid}`, { ...a, ms }).then(() => {
      if (this.answeredQi === qi) { this.sentQi = qi; this.render(); }
    }).catch(e => {
      if (this.answeredQi === qi && this.state && this.state.phase === 'question' && this.state.qi === qi) {
        this.answeredQi = -1;
        this.myAnswer = null;
        this.render();
      }
      toast('Antwort nicht angekommen – bitte nochmal tippen. (' + e.message + ')', 6000);
    });
  },

  renderAnswered() {
    const a = this.myAnswer || {};
    const sent = this.sentQi === this.state.qi;
    const chosen = Number.isInteger(a.c) ? h('div', { class: `chosen ${COLORS[a.c]}` }, shapeEl(a.c)) : null;
    this.screen('wait',
      chosen,
      h('h2', { class: 'big-title' }, sent ? 'Antwort angekommen' : 'Wird gesendet …'),
      h('div', { class: 'sub' }, sent ? 'Mal sehen, ob du richtig liegst …' : 'Bitte Seite offen lassen'),
      sent ? h('div', { class: 'loader' }, [0, 1, 2, 3].map(i => h('span', { class: COLORS[i] }, shapeEl(i)))) : h('div', { class: 'spinner' }));
  },

  renderResult() {
    const r = this.results;
    if (!r) return this.screen('wait', h('div', { class: 'spinner' }), h('div', { class: 'sub' }, 'Auswertung …'));
    const pid = this.pid;
    const rank = r.ranks && r.ranks[pid];
    const behind = r.behind && r.behind[pid];
    const place = rank ? h('div', { class: 'place' },
      h('b', null, `Du bist auf Platz ${rank}`),
      rank === 1 ? h('span', null, 'Du führst!') : behind ? h('span', null, `${fmtNum(behind.d)} Punkte hinter ${behind.name}`) : null) : null;
    if (r.poll) {
      const voted = r.ms && pid in r.ms;
      return this.screen('result', h('div', { class: 'res-icon' }, icon(voted ? 'check' : 'clock')),
        h('h2', { class: 'big-title' }, voted ? 'Danke für deine Stimme' : 'Keine Stimme abgegeben'),
        h('div', { class: 'sub' }, 'Umfrage – hier gibt es keine Punkte'), place);
    }
    const answered = r.ok && pid in r.ok;
    const right = answered && r.ok[pid] === true;
    const gain = (r.gains && r.gains[pid]) || 0;
    const q = this.q && this.q.qi === r.qi ? this.q : null;
    let solution = null;
    if (!right) {
      if (r.type === 'mc' && q && q.options) solution = (r.correct || []).map(i => q.options[i]).filter(Boolean).join(' / ');
      else if (r.type === 'text') solution = (r.accepted || [])[0];
    }
    document.body.dataset.mood = right ? 'ok' : answered ? 'bad' : 'none';
    const gainEl = h('div', { class: 'gain-pill' }, '+ 0');
    if (right) countUp(gainEl, 0, gain, 900, '+ ');
    if (this.state.phase === 'reveal') vibrate(right ? [30, 40, 30] : 120);
    const streak = this.me.streak || 0;
    this.screen('result',
      h('h2', { class: 'big-title' }, right ? 'Richtig' : answered ? 'Falsch' : 'Zeit vorbei'),
      h('div', { class: 'res-icon pop-in' }, icon(right ? 'check' : answered ? 'cross' : 'clock')),
      right && streak >= 2 ? h('div', { class: 'streak' }, icon('flame'), `Antwortserie ${streak}`) : null,
      right ? gainEl : h('div', { class: 'gain-pill' }, answered ? 'Nächstes Mal klappt’s!' : 'Schneller sein!'),
      right && r.fastest && r.fastest.pid === pid ? h('div', { class: 'badge-fast' }, icon('bolt'), 'Du warst am schnellsten!') : null,
      solution ? h('div', { class: 'solution' }, 'Richtig: ', h('b', null, solution)) : null,
      place);
  },

  renderEnd() {
    const f = this.final;
    const rank = f && f.ranks ? f.ranks[this.pid] : null;
    if (rank && rank <= 3) confetti(4000);
    this.screen('result end',
      rank ? h('div', { class: 'medal big ' + (rank <= 3 ? 'm' + rank : '') }, String(rank)) : h('div', { class: 'spinner' }),
      h('h2', { class: 'big-title' }, rank === 1 ? 'Gewonnen!' : rank && rank <= 3 ? 'Auf dem Podest!' : rank ? `Platz ${rank}` : 'Quiz beendet'),
      rank ? h('div', { class: 'sub' }, `von ${f.n} · ${fmtNum(this.me.score)} Punkte`) : null,
      h('div', { class: 'sub' }, 'Danke fürs Mitmachen!'));
  }
};

/* ===================== Start ===================== */

let db;
(async function main() {
  try {
    db = await initDB();
  } catch (e) {
    view(h('div', { class: 'player' }, h('div', { class: 'center' },
      h('h2', { class: 'big-title' }, 'Keine Verbindung zur Datenbank'),
      h('div', { class: 'sub' }, e.message),
      h('button', { class: 'btn primary', onclick: () => location.reload() }, 'Nochmal versuchen'))));
    return;
  }
  document.body.dataset.view = P.has('host') ? 'host' : 'player';
  if (P.has('host')) Host.init(); else Player.init();
})();
