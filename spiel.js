// Voci-Abenteuer · Wörter üben als Pixel-Abenteuer
// ===== Balance: hier lässt sich alles einfach anpassen =====
const CFG = {
  runQuestions: 8,        // Fragen pro Level
  hearts: 3,              // Herzen pro Level
  speed: 34,              // Tempo der Plattformen (Pixel pro Sekunde), ≈ 8 Sekunden Bedenkzeit
  speedPerCombo: 2.5,     // schneller pro Kombo-Schritt
  coin: 5,                // Münzen pro richtigem Wort (mal Kombo-Faktor)
  comboStep: 3,           // alle 3 richtigen in Folge steigt der Faktor
  comboMax: 5,            // höchster Faktor ×5
  starBonus: 10,          // Münzen pro Stern am Levelende
  bossHP: 6, bossTime: 25, bossCoin: 10, bossWin: 60,
  xpCorrect: 10, xpLevel: lvl => 100 + 40 * (lvl - 1),
  dailySecs: 600,         // Tagesziel: 10 Minuten aktives Spielen
  teamPerKid: 150,        // Teamziel pro Kind und Woche (richtige Antworten, wird auf dem Server gerechnet)
  dupCoins: 25,           // Münzen für ein doppeltes Wesen
  rarity: [70, 25, 5], rarityBoss: [45, 40, 15],
  idleCap: 60
};
// Drei Ebenen pro Welt: jede schwerer, aber mit mehr Belohnung
const EBENEN = [
  { name: 'Wiese', tag: 'Normal', speed: 1, q: 8, hearts: 0, bossHP: 6, bossTime: 25, reward: 1, rar: [70, 25, 5] },
  { name: 'Berg', tag: 'Schwer', speed: 1.3, q: 10, hearts: 0, bossHP: 8, bossTime: 20, reward: 1.6, rar: [55, 35, 10] },
  { name: 'Sternenhimmel', tag: 'Meister', speed: 1.6, q: 12, hearts: -1, bossHP: 10, bossTime: 15, reward: 2.5, rar: [35, 45, 20] }
];
// Kräfte: je 5 Stufen
const SKILLS = [
  // [id, Name, Beschreibung, Preise Stufe 1–5, Wirkung, Gilt für]
  ['herz', 'Extra-Herz', 'Mehr Herzen in jedem Level', [120, 260, 450, 700, 1000], l => `${[0, 1, 1, 2, 2, 3][l]} Herz(en) mehr`, 'all'],
  ['zeit', 'Zeitlupe', 'Mehr Zeit: langsamere Plattformen und Gegner, längere Ofenuhr', [80, 180, 320, 500, 750], l => `${l * 7}% mehr Zeit`, 'all'],
  ['magnet', 'Münzmagnet', 'Mehr Münzen pro Wort', [100, 220, 380, 600, 900], l => `+${l * 15}% Münzen`, 'all'],
  ['weise', 'Weisheit', 'Mehr XP für jedes Wort', [80, 170, 300, 480, 700], l => `+${l * 12}% XP`, 'all'],
  ['schild', 'Kombo-Schild', 'Ein Fehler zerstört die Kombo nicht', [150, 300, 500, 750, 1100], l => `${[0, 1, 1, 2, 2, 3][l]} Schild(e) pro Level`, 'all'],
  ['klee', 'Glücksklee', 'Seltenere Wesen in Truhen', [150, 320, 520, 780, 1100], l => `+${l * 6}% Glück`, 'all'],
  ['joker', 'Sprung-Joker', 'Streicht eine falsche Plattform weg, beim Wolken-Boss gibt er die ersten Buchstaben', [90, 200, 350, 550, 800], l => `${[0, 1, 1, 2, 2, 3][l]} Joker pro Level`, 'run'],
  ['stern', 'Sternwurf', 'Chance auf Doppel-Treffer beim Wolken-Boss', [120, 250, 420, 650, 950], l => `${l * 12}% Chance`, 'run'],
  ['ajoker', 'Arena-Joker', 'Jagt einen falschen Gegner davon', [90, 200, 350, 550, 800], l => `${[0, 1, 1, 2, 2, 3][l]} Joker pro Level`, 'arena'],
  ['kraft', 'Kraftschlag', 'Champions fallen schneller, Doppel-Treffer beim Grummel-König', [120, 250, 420, 650, 950], l => `${l * 12}% Chance`, 'arena'],
  ['super', 'Super-Ladung', 'Die Super-Leiste füllt sich schneller', [100, 220, 380, 600, 900], l => `+${l * 6}% pro Treffer`, 'arena'],
  ['rezept', 'Rezeptbuch', 'Zeigt den nächsten richtigen Buchstaben', [90, 200, 350, 550, 800], l => `${[0, 1, 1, 2, 2, 3][l]} Tipp(s) pro Level`, 'bakery'],
  ['ofen', 'Grosser Ofen', 'Mehr Zeit in der Bäckerei und beim Backwettbewerb', [100, 220, 380, 600, 900], l => `+${l * 12}% Ofenzeit`, 'bakery'],
  ['schaber', 'Teigschaber', 'Mehr Fehler pro Wort erlaubt', [120, 250, 420, 650, 950], l => `${3 + [0, 1, 1, 2, 2, 3][l]} Fehler pro Wort`, 'bakery']
];
const SKILL_GROUPS = [['all', 'Für alle Spiele'], ['run', 'Wort-Sprung'], ['arena', 'Wort-Arena'], ['bakery', 'Bäckerei']];
const RANKS = [[1, 'Petit pois'], [3, 'Escargot'], [5, 'Explorateur'], [8, 'Chevalier'], [12, 'Champion'], [16, 'Héros'], [20, 'Légende'], [25, 'Majesté des mots']];
const rankOf = lvl => RANKS.filter(r => lvl >= r[0]).pop()[1];
const COLOR_P = { berry: 0, mint: 40, sky: 40, lav: 60, honey: 60, cocoa: 80, night: 120, rose: 80, sun: 100, forest: 120, ocean: 140, snow: 160, coal: 180, gold: 400, rainbow: 600 };
const COLOR_L = { gold: 10, rainbow: 15 };
const HAT_P = [['flower', 50, 1], ['cap', 70, 1], ['flowercrown', 90, 2], ['beret', 100, 2], ['bunny', 120, 3], ['cat', 120, 3], ['chef', 140, 4], ['straw', 150, 4], ['party', 170, 5], ['headphones', 200, 6], ['pirate', 220, 6], ['helmet', 240, 7], ['propeller', 260, 8], ['viking', 300, 9], ['tophat', 320, 10], ['crown', 400, 12], ['wizard', 450, 14], ['halo', 600, 18]];
const FACE_P = [['glasses', 80, 2], ['sunglasses', 150, 4], ['hearts', 200, 6], ['mustache', 250, 8]];
const TRAIL_P = [['leaves', 100, 2], ['bubbles', 140, 3], ['sparkle', 180, 4], ['hearts', 220, 5], ['snow', 260, 7], ['stars', 320, 9], ['fire', 400, 11], ['rainbow', 700, 15]];
const SHOP = [
  ...Object.entries(ART.COLORS).map(([k, c]) => ({ id: 'color_' + k, kind: 'color', key: k, name: c[2], price: COLOR_P[k] ?? 100, lvl: COLOR_L[k] || 1 })),
  ...HAT_P.map(([k, p, l]) => ({ id: 'hat_' + k, kind: 'hat', key: k, name: ART.HATS[k].name, price: p, lvl: l })),
  ...FACE_P.map(([k, p, l]) => ({ id: 'face_' + k, kind: 'face', key: k, name: ART.FACES[k].name, price: p, lvl: l })),
  ...TRAIL_P.map(([k, p, l]) => ({ id: 'trail_' + k, kind: 'trail', key: k, name: ART.TRAILS[k].name, price: p, lvl: l }))
];
const CHESTS = [['wood', 'Holztruhe', 150, 'Ein zufälliges Wesen', 'normal'], ['gold', 'Goldtruhe', 450, 'Bessere Chancen auf seltene Wesen', 'boss']];
const BADGES = [
  ['first', 'Erster Schritt', 'Ein Level geschafft', G => Object.keys(G.stars).length >= 1],
  ['perfect', 'Perfekt!', 'Ein Level mit 3 Sternen', G => Object.values(G.stars).some(s => s >= 3)],
  ['boss', 'Boss-Bezwinger', 'Einen Boss besiegt', G => G.totals.bosses >= 1],
  ['boss5', 'Wolkenjäger', '5 Bosse besiegt', G => G.totals.bosses >= 5],
  ['combo10', 'Kombo-König', '10 richtige in Folge', G => G.totals.bestCombo >= 10],
  ['w100', '100 Wörter', '100 Wörter richtig', G => G.totals.correct >= 100],
  ['w500', 'Wort-Profi', '500 Wörter richtig', G => G.totals.correct >= 500],
  ['daily5', 'Fleissig', '5 Mal das Tagesziel', G => G.daily.count >= 5],
  ['coll8', 'Sammler', '8 verschiedene Wesen', G => Object.keys(G.cards).length >= 8],
  ['coll16', 'Grosser Sammler', '16 verschiedene Wesen', G => Object.keys(G.cards).length >= 16],
  ['collall', 'Alle gefunden!', 'Alle ' + ART.CREATURES.length + ' Wesen', G => Object.keys(G.cards).length >= ART.CREATURES.length],
  ['pet3', 'Wesen-Flüsterer', 'Ein Wesen auf Stufe 3', G => Object.values(G.cards).some(n => n >= 6)],
  ['shop3', 'Modeprofi', '3 Sachen im Shop gekauft', G => Object.keys(G.owned).filter(k => k !== 'color_berry').length >= 3],
  ['shop10', 'Stilikone', '10 Sachen im Shop gekauft', G => Object.keys(G.owned).filter(k => k !== 'color_berry').length >= 10],
  ['skill1', 'Erste Kraft', 'Eine Kraft gekauft', G => Object.values(G.skills).some(l => l >= 1)],
  ['skill5', 'Voll aufgeladen', 'Eine Kraft auf Stufe 5', G => Object.values(G.skills).some(l => l >= 5)],
  ['berg', 'Bergsteiger', 'Die Ebene Berg erreicht', G => Object.keys(G.stars).some(k => parseKey(k).eb >= 1)],
  ['sterne', 'Sternenkind', 'Die Ebene Sternenhimmel erreicht', G => Object.keys(G.stars).some(k => parseKey(k).eb === 2)],
  ['meister', 'Meister-Bezwinger', 'Einen Boss im Sternenhimmel besiegt', G => Object.keys(G.stars).some(k => { const p = parseKey(k); return p.eb === 2 && p.i === 4 })],
  ['king', 'Königsstürzer', 'Den Grummel-König besiegt', G => Object.keys(G.stars).some(k => { const p = parseKey(k); return p.mode === 'arena' && p.i === 4 })],
  ['bake', 'Meisterbäcker', 'Den Backwettbewerb gewonnen', G => Object.keys(G.stars).some(k => { const p = parseKey(k); return p.mode === 'bakery' && p.i === 4 })],
  ['tri', 'Dreifach-Held', 'In allen drei Spielen einen Boss besiegt', G => ['run', 'arena', 'bakery'].every(m => Object.keys(G.stars).some(k => { const p = parseKey(k); return p.mode === m && p.i === 4 }))],
  ['lvl10', 'Aufsteiger', 'Spieler-Level 10', G => lvlOf(G.xp).lvl >= 10],
  ['lvl20', 'Legende', 'Spieler-Level 20', G => lvlOf(G.xp).lvl >= 20],
  ['rich', 'Schatzsucher', '2000 Münzen verdient', G => (G.totals.earned || 0) >= 2000],
  ['world', 'Welt-Meister', 'Alle Sterne einer Welt', G => worldsFull(G) >= 1]
];
const SLOT = [['var(--berry)', '#e86a6a', '#b54646', '1', '↑'], ['var(--mint)', '#5fc4a0', '#3a9479', '2', '→'], ['var(--honey)', '#f2b84b', '#c98a24', '3', '↓']];

const { sb, error: setupErr } = makeClient();
if(sb) loadCloudAudio(sb);
let kid = ls.get('vk-kid', null), units = [], prog = null, G = null, team = null, group = null;
const SPK2 = '<svg viewBox="0 0 24 24" fill="none" stroke="#3b2d3f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="#3b2d3f"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

/* ---------- Ton (nur Effekte) ---------- */
let AC = null, muted = ls.get('vk-mute', false);
function ac(){ if(!AC){ try{ AC = new (window.AudioContext || window.webkitAudioContext)() }catch{ AC = null } } if(AC && AC.state === 'suspended') AC.resume(); return AC }
function tone(f, d, type = 'square', vol = .08, when = 0, slide = 0){
  const a = ac(); if(!a || muted) return;
  const t0 = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t0 + d);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + d);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + d + .02);
}
const sfx = {
  click: () => tone(660, .05, 'square', .04),
  jump: () => tone(300, .18, 'square', .06, 0, 500),
  coin: () => { tone(988, .07, 'square', .06); tone(1319, .16, 'square', .06, .07) },
  combo: n => [523, 659, 784, 1047].slice(0, 2 + Math.min(2, n)).forEach((f, i) => tone(f, .1, 'triangle', .08, i * .06)),
  wrong: () => { tone(220, .25, 'triangle', .1, 0, -90); tone(180, .3, 'triangle', .08, .12, -60) },
  splash: () => { for(let i = 0; i < 5; i++) tone(500 + Math.random() * 900, .06, 'triangle', .03, i * .03) },
  hit: () => { tone(140, .2, 'sawtooth', .07, 0, -80); tone(880, .1, 'square', .05, .02) },
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'square', .06, i * .11)),
  level: () => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .12, 'triangle', .09, i * .07)),
  chest: () => [880, 1175, 1568, 2093].forEach((f, i) => tone(f, .2, 'triangle', .06, i * .09)),
  buy: () => { tone(784, .08, 'square', .05); tone(1047, .12, 'square', .05, .08) }
};
function setMute(m){ muted = m; ls.set('vk-mute', m); $('#btn-mute').innerHTML = m ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#3b2d3f" stroke-width="2.4"><path d="M11 5 6 9H3v6h3l5 4z" fill="#3b2d3f"/><path d="M16 9l5 6M21 9l-5 6"/></svg>' : SPK2.replace('<svg ', '<svg width="22" height="22" '); $('#btn-mute').setAttribute('aria-label', m ? 'Ton an' : 'Ton aus') }

/* ---------- Spielstand ---------- */
function freshGame(){ return { coins: 0, xp: 0, stars: {}, skills: {}, ebSel: {}, owned: { color_berry: 1 }, look: { color: 'berry', hat: null, pet: null, face: null, trail: null }, cards: {}, badges: {}, daily: { day: '', secs: 0, done: false, count: 0 }, totals: { correct: 0, answers: 0, bestCombo: 0, bosses: 0 }, team: { week: '', claimed: false }, group: null } }
function mergeGame(g){ const f = freshGame(); g = g || {}; return { ...f, ...g, look: { ...f.look, ...(g.look || {}) }, daily: { ...f.daily, ...(g.daily || {}) }, totals: { ...f.totals, ...(g.totals || {}) }, team: { ...f.team, ...(g.team || {}) }, owned: { ...f.owned, ...(g.owned || {}) }, stars: g.stars || {}, cards: g.cards || {}, badges: g.badges || {}, skills: g.skills || {}, ebSel: g.ebSel || {} } }
const skl = id => (G && G.skills[id]) || 0;
function migrateStars(g){ // alte Stationen (Arena = 5, Bäckerei = 6) werden zu Level 1 des Modus
  Object.keys(g.stars).forEach(k => { const p = k.split(':'); const last = +p[p.length - 1]; if(last !== 5 && last !== 6) return;
    const eb = p.length === 2 ? 0 : +p[1]; const nk = `${p[0]}:${last === 5 ? 'A' : 'B'}${eb}:0`; g.stars[nk] = Math.max(g.stars[nk] || 0, g.stars[k]); delete g.stars[k] });
  // Joker für alle Modi wurde aufgeteilt: bisherige Stufe gilt auch für Arena und Bäckerei
  if(g.skills.joker && g.skills.ajoker === undefined){ g.skills.ajoker = g.skills.joker; g.skills.rezept = g.skills.joker }
  if(!MODE_IDS.includes(g.mode)) g.mode = 'run';
  return g;
}
const sKey = (uid, eb, i) => eb ? `${uid}:${eb}:${i}` : `${uid}:${i}`;
const ebOpen = (uid, eb) => eb === 0 || (G.stars[sKey(uid, eb - 1, 4)] || 0) >= 1;
function lvlOf(xp){ let l = 1, need = CFG.xpLevel(1); while(xp >= need){ xp -= need; l++; need = CFG.xpLevel(l) } return { lvl: l, cur: xp, need } }
function worldsFull(g){ return units.filter(u => [0, 1, 2, 3, 4].every(i => (g.stars[u.id + ':' + i] || 0) >= 3)).length }
const ckey = () => 'vk-game-' + kid.name.toLowerCase();

let saveT = null, saving = false, dirty = false;
function save(){ dirty = true; ls.set(ckey(), { G, prog }); clearTimeout(saveT); saveT = setTimeout(flushSave, 1500) }
async function flushSave(){
  if(!dirty || saving) return; saving = true; dirty = false;
  const [a, b] = await Promise.all([
    sb.rpc('kid_save_game', { p_name: kid.name, p_pin: kid.pin, p_game: G }),
    sb.rpc('kid_save', { p_name: kid.name, p_pin: kid.pin, p_cards: prog.cards, p_stars: prog.stars || 0, p_streak: prog.streak || 0, p_last_day: prog.lastDay || null })
  ]);
  saving = false;
  if(a.error || b.error){ dirty = true; console.error(a.error || b.error); toast('Speichern hat nicht geklappt, ich versuche es nochmals.'); clearTimeout(saveT); saveT = setTimeout(flushSave, 8000) }
}
addEventListener('pagehide', () => { if(dirty) flushSave() });
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden' && dirty) flushSave() });

function touchDay(){
  const t = today();
  if(prog.lastDay !== t){ prog.streak = prog.lastDay === today(-1) ? (prog.streak || 0) + 1 : 1; prog.lastDay = t }
  if(G.daily.day !== t) G.daily = { ...G.daily, day: t, secs: 0, done: false };
}
function leitner(key, right, strong){
  const cur = prog.cards[key] || { box: 0, due: today() };
  let box = cur.box || 0;
  if(right){
    if(strong) box = box === 0 ? 2 : Math.min(5, box + 1);
    else if(box < 3) box = box + 1;
    else return;
    prog.cards[key] = { box, due: today(cur.box === 5 && box === 5 ? 30 : NEXT[box]) };
  } else prog.cards[key] = { box: 1, due: today(1) };
}

/* ---------- Start ---------- */
async function init(){
  setMute(muted);
  if(setupErr){ $('#screen').innerHTML = setupMessage(setupErr); return }
  if(!kid) return needLogin();
  const [u, l] = await Promise.all([
    sb.from('units').select('id,title,ord,level,words').order('ord'),
    sb.rpc('kid_login', { p_name: kid.name, p_pin: kid.pin })
  ]);
  if(l.error || !l.data) return needLogin();
  if(u.error){ $('#screen').innerHTML = `<div class="board empty"><h2>Keine Verbindung</h2><p>${esc(u.error.message)}</p></div>`; return }
  units = (u.data || []).filter(x => (x.words || []).filter(w => w.fr && w.de).length >= 6);
  const d = l.data;
  prog = { cards: d.cards || {}, stars: d.stars || 0, streak: d.streak || 0, lastDay: d.last_day || '' };
  G = migrateStars(mergeGame(d.game));
  const qm = new URLSearchParams(location.search).get('m'); if(MODE_IDS.includes(qm)) G.mode = qm;
  const local = ls.get(ckey(), null); // nicht gespeicherte Daten auf diesem Gerät
  if(local && local.G && (local.G.xp || 0) > (G.xp || 0)){ G = migrateStars(mergeGame(local.G)); if(MODE_IDS.includes(qm)) G.mode = qm; prog = { ...prog, ...local.prog }; save() }
  touchDay();
  const groups = [...new Set(units.map(x => x.level || ''))];
  group = groups.includes(G.group) ? G.group : groups[groups.length - 1];
  $('#hud').hidden = false; hud();
  loadTeam(); renderMap();
}
function needLogin(){
  $('#hud').hidden = true;
  $('#screen').innerHTML = `<div class="board empty"><h2>Wer spielt?</h2><p>Melde dich zuerst in der Voci-Kiste mit deinem Namen und deiner PIN an.</p><a class="pbtn" href="index.html">Zur Voci-Kiste</a></div>`;
}
async function loadTeam(){
  const { data } = await sb.rpc('team_week', { p_name: kid.name, p_pin: kid.pin });
  if(data){ team = data; if(G.team.week !== data.week) G.team = { week: data.week, claimed: false }; if(curView === 'map') renderGoals() }
}

/* ---------- HUD ---------- */
function avatarCanvas(cv, look, frame = 0){
  const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
  ART.pip(c, (cv.width - 12) / 2 | 0, cv.height - 15, look || G.look, frame);
}
function hud(){
  $('#hud-name').textContent = kid.name;
  const L = lvlOf(G.xp);
  $('#hud-lvl').textContent = L.lvl + ' · ' + rankOf(L.lvl);
  $('#hud-xp').style.width = (L.cur / L.need * 100) + '%';
  $('#hud-coins').textContent = G.coins;
  avatarCanvas($('#hud-ava'), G.look);
}
$('#hud-me').onclick = () => { sfx.click(); stopLoop(); renderMap() };
$('#btn-shop').onclick = () => { sfx.click(); stopLoop(); renderShop() };
$('#btn-album').onclick = () => { sfx.click(); stopLoop(); renderAlbum() };
$('#btn-badges').onclick = () => { sfx.click(); stopLoop(); renderBadges() };
$('#btn-mute').onclick = () => { setMute(!muted); if(!muted) sfx.click() };

function addCoins(n, el){ G.coins += n; if(n > 0) G.totals.earned = (G.totals.earned || 0) + n; $('#hud-coins').textContent = G.coins; if(el) floatText(el, '+' + n) }
function addXP(n){
  const before = lvlOf(G.xp).lvl; G.xp += n; const after = lvlOf(G.xp).lvl; hud();
  if(after > before){ sfx.level(); const r = rankOf(after); toast('Level ' + after + '! ' + (r !== rankOf(before) ? 'Neuer Rang: ' + r : 'Neue Sachen im Shop?')) }
}
function floatText(box, text, x = 22, y = 40, color = '#fff'){
  const s = document.createElement('span'); s.className = 'float'; s.textContent = text; s.style.left = x + '%'; s.style.top = y + '%'; s.style.color = color;
  box.appendChild(s); setTimeout(() => s.remove(), 1000);
}

/* ---------- Karte ---------- */
let curView = 'map';
function renderMap(){
  curView = 'map'; hud();
  const groups = [...new Set(units.map(x => x.level || ''))];
  const list = units.filter(u => (u.level || '') === group);
  $('#screen').innerHTML = `
    <section class="mapgoals" id="goals"></section>
    <nav class="modetabs">${MODE_IDS.map(m => `<button data-modetab="${m}" aria-pressed="${G.mode === m}"><canvas width="24" height="24" data-mico="${m}"></canvas><span>${MODES[m].name}</span></button>`).join('')}</nav>
    ${groups.length > 1 ? `<nav class="lvltabs">${groups.map(g => `<button data-g="${esc(g)}" aria-pressed="${g === group}">${esc(LEVELS[g] || g || 'Weitere')}</button>`).join('')}</nav>` : ''}
    ${list.length ? `<section class="worlds">${list.map((u, wi) => worldHTML(u, wi)).join('')}</section>` : `<div class="board empty"><h2>Noch keine Welten</h2><p>Es braucht mindestens 6 Wörter pro Unité.</p></div>`}`;
  renderGoals();
  document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { sfx.click(); group = b.dataset.g; G.group = group; save(); renderMap() });
  document.querySelectorAll('[data-modetab]').forEach(b => b.onclick = () => { sfx.click(); G.mode = b.dataset.modetab; save(); renderMap() });
  list.forEach((u, wi) => {
    const cv = document.getElementById('ban-' + u.id); if(!cv) return;
    const eb = curEb(u.id), mode = G.mode;
    const c = cv.getContext('2d'); c.save(); c.translate(0, -108); ART.scene(c, ART.THEMES[wi % ART.THEMES.length], 2, wi * 140 + 30, { night: eb === 2 });
    if(mode === 'arena'){ drawFoe(c, 'slime', FOEPAL[wi % FOEPAL.length], 230, ART.GROUND - 12, 1, true); drawFoe(c, 'knight', FOEPAL[(wi + 2) % FOEPAL.length], 252, ART.GROUND - 12, 1, true) }
    if(mode === 'bakery'){ c.fillStyle = ART.INK; c.fillRect(226, ART.GROUND - 22, 28, 22); c.fillStyle = '#c96a4a'; c.fillRect(227, ART.GROUND - 21, 26, 21); c.fillStyle = '#ffd27a'; c.fillRect(232, ART.GROUND - 12, 16, 8) }
    ART.pip(c, 200, ART.GROUND - 15, mode === 'bakery' ? { ...G.look, hat: 'chef' } : G.look, 0);
    if(G.look.pet) ART.creature(c, G.look.pet, 182, ART.GROUND - 12, 1, ART.petStage(G.cards[G.look.pet] || 1)); c.restore();
    const bc = document.getElementById('bossico-' + u.id); if(bc){ const t = ART.THEMES[wi % ART.THEMES.length], bctx = bc.getContext('2d');
      if(mode === 'arena') ART.draw(bctx, KING, { k: ART.INK, B: t.boss[0], G: '#b8c0cc', W: '#fff7c2', Y: '#f2c94c' }, 4, 2, true, 1);
      else if(mode === 'bakery') ART.pip(bctx, 4, 1, { color: 'coal', hat: 'chef', face: 'mustache' }, 0);
      else ART.boss(bctx, 0, 0, t.boss[0], t.boss[1]) }
  });
  document.querySelectorAll('.ebtab').forEach(b => b.onclick = () => {
    const uid = b.dataset.w, eb = +b.dataset.eb;
    if(!ebOpenM(uid, G.mode, eb)){ sfx.wrong(); toast('Besiege zuerst den ' + MODES[G.mode].boss + ' der Ebene ' + EBENEN[eb - 1].name + '!'); return }
    sfx.click(); G.ebSel[G.mode + ':' + uid] = eb; save(); renderMap();
  });
  document.querySelectorAll('[data-mico]').forEach(cv => { const c = cv.getContext('2d');
    if(cv.dataset.mico === 'arena'){ drawFoe(c, 'slime', { B: '#8fd46b', D: '#5a9e45' }, 12, 11, 1, true); ART.pip(c, 0, 9, G.look, 2) }
    else if(cv.dataset.mico === 'bakery'){ ART.pip(c, 2, 9, { ...G.look, hat: 'chef' }, 0); c.fillStyle = ART.INK; c.fillRect(14, 17, 10, 6); c.fillStyle = '#f2b84b'; c.fillRect(15, 18, 8, 4) }
    else { c.fillStyle = ART.INK; c.fillRect(10, 18, 14, 4); c.fillStyle = '#5fc4a0'; c.fillRect(11, 18, 12, 2); ART.pip(c, 4, 3, G.look, 1) } });
  document.querySelectorAll('.node[data-u]').forEach(b => b.onclick = () => {
    if(b.classList.contains('locked')){ sfx.wrong(); toast('Zuerst das Level davor schaffen!'); return }
    sfx.click(); ac();
    const u = units.find(x => x.id === b.dataset.u), i = +b.dataset.i, wi = list.indexOf(u);
    startMode(G.mode, u, wi, curEb(u.id), i);
  });
}
function curEb(uid){ const m = G.mode, e = G.ebSel[m + ':' + uid] ?? (m === 'run' ? G.ebSel[uid] : 0) ?? 0; return ebOpenM(uid, m, e || 0) ? (e || 0) : 0 }
function worldHTML(u, wi){
  const th = ART.THEMES[wi % ART.THEMES.length], mode = G.mode, M = MODES[mode];
  const eb = curEb(u.id);
  const st = i => G.stars[mKey(u.id, mode, eb, i)] || 0;
  const open = i => i === 0 || st(i - 1) >= 1;
  const total = [0, 1, 2].reduce((a, e) => a + [0, 1, 2, 3, 4].reduce((b, i) => b + (G.stars[mKey(u.id, mode, e, i)] || 0), 0), 0);
  const nextI = [0, 1, 2, 3, 4].find(i => open(i) && !st(i));
  return `<article class="world eb${eb}">
    <div class="banner"><canvas id="ban-${esc(u.id)}" width="320" height="70"></canvas><h2>${esc(u.title)}</h2><small>${total} / 45 ★</small></div>
    <div class="ebtabs">${EBENEN.map((E, e) => { const o = ebOpenM(u.id, mode, e); return `<button class="ebtab" data-w="${esc(u.id)}" data-eb="${e}" aria-pressed="${e === eb}" ${o ? '' : 'data-lock="1"'}>${o ? '' : '<span aria-hidden="true">🔒</span> '}${E.name}<small>${E.tag}</small></button>` }).join('')}</div>
    <div class="path">${[0, 1, 2, 3, 4].map(i => {
      const boss = i === 4, lock = !open(i);
      return `<button class="node ${boss ? 'boss' : ''} ${lock ? 'locked' : ''} ${i === nextI ? 'next' : ''}" data-u="${esc(u.id)}" data-i="${i}" aria-label="${boss ? M.boss : 'Level ' + (i + 1)}${lock ? ', gesperrt' : ''}" title="${esc(boss ? (mode === 'run' ? th.bossName : M.boss) : (M.levels[i].label || M.levels[i]))}">
        ${boss ? (lock ? '?' : `<canvas id="bossico-${esc(u.id)}" width="20" height="16"></canvas>`) : (lock ? '·' : i + 1)}
        ${!lock ? `<span class="st">${[1, 2, 3].map(s => `<i class="${st(i) >= s ? 'on' : ''}"></i>`).join('')}</span>` : ''}</button>`;
    }).join('')}</div>
    <p class="lvlinfo">${esc(M.name)} · ${EBENEN[eb].name}: ${[0, 1, 2, 3].map(i => esc(M.levels[i].label || M.levels[i])).filter((v, i, a) => a.indexOf(v) === i).join(' · ')} · Boss: ${esc(mode === 'run' ? th.bossName : M.boss)}</p></article>`;
}
function ringSVG(p, col){
  const r = 22, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 54 54"><circle cx="27" cy="27" r="${r}" fill="#fff6e9" stroke="#e8d9c4" stroke-width="7"/><circle cx="27" cy="27" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-dasharray="${c * Math.min(1, p)} ${c}" transform="rotate(-90 27 27)"/><circle cx="27" cy="27" r="${r + 4}" fill="none" stroke="#3b2d3f" stroke-width="2"/></svg>`;
}
function renderGoals(){
  const el = $('#goals'); if(!el) return;
  const mins = Math.floor(G.daily.secs / 60), goalM = CFG.dailySecs / 60;
  const tp = team ? team.correct / team.goal : 0;
  el.innerHTML = `
    <div class="board goal">${ringSVG(G.daily.secs / CFG.dailySecs, '#f2b84b')}<div><b>${G.daily.done ? 'Tagesziel geschafft!' : 'Tagesziel'}</b><small>${Math.min(mins, goalM)} von ${goalM} Minuten${G.daily.done ? ' · weiter so!' : ' · dann gibt es eine Truhe'}</small></div></div>
    <div class="board goal"><div style="flex:1;min-width:0"><b>Teamziel der Woche</b><small>${team ? `${team.correct} von ${team.goal} Wörtern, alle Kinder zusammen` : 'wird geladen …'}</small><div class="tbar"><i style="width:${Math.min(100, tp * 100)}%"></i></div>
      ${team && tp >= 1 && !G.team.claimed ? '<button class="pbtn mint claim" id="team-claim">Teamtruhe öffnen</button>' : ''}</div></div>`;
  const tc = $('#team-claim'); if(tc) tc.onclick = () => { G.team.claimed = true; save(); openChest('team', () => renderMap()) };
}

/* ---------- Wörter auswählen ---------- */
function wordsOf(u){ return (u.words || []).filter(w => w.fr && w.de).map(w => ({ w, key: u.id + '|' + w.fr })) }
function pickWords(u, n){
  const ws = wordsOf(u);
  const score = x => { const c = prog.cards[x.key]; const box = c ? c.box : 0; const due = !c || c.due <= today(); return (due ? 0 : 10) + box * 2 + Math.random() * 3 };
  const sorted = ws.map(x => [score(x), x]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
  const out = sorted.slice(0, Math.min(n, sorted.length));
  while(out.length < n) out.push(sorted[out.length % sorted.length]);
  return shuffle(out);
}
function distractors(u, x, field, k = 2){
  const pool = [...wordsOf(u), ...units.filter(o => o !== u && o.level === u.level).flatMap(wordsOf)].filter(o => o.w[field] !== x.w[field]);
  const same = pool.filter(o => o.w.fr.split(' ')[0] === x.w.fr.split(' ')[0]); // gleicher Artikel = schwieriger
  const pick = shuffle(same.slice()).slice(0, 1).concat(shuffle(pool.slice()));
  const res = []; for(const o of pick){ if(res.length >= k) break; if(!res.includes(o.w[field])) res.push(o.w[field]) }
  return res;
}

/* ---------- Spiel-Schleife ---------- */
let raf = null, loopFn = null, keyFn = null;
function startLoop(fn){ if(raf) cancelAnimationFrame(raf); loopFn = fn; let last = performance.now(); const step = now => { const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; loopFn(dt); raf = requestAnimationFrame(step) }; raf = requestAnimationFrame(step) }
function stopLoop(){ if(raf) cancelAnimationFrame(raf); raf = null; loopFn = null; if(keyFn){ removeEventListener('keydown', keyFn); keyFn = null } }
function particles(){ const P = []; return { add(x, y, col, n = 8, sp = 60){ for(let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, v = sp * (.4 + Math.random()); P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: .8 + Math.random() * .4, col: Array.isArray(col) ? col[i % col.length] : col }) } }, step(c, dt){ for(let i = P.length - 1; i >= 0; i--){ const p = P[i]; p.life -= dt; if(p.life <= 0){ P.splice(i, 1); continue } p.vy += 160 * dt; p.x += p.vx * dt; p.y += p.vy * dt; c.fillStyle = p.col; c.fillRect(p.x | 0, p.y | 0, 2, 2) } } } }
const CONFETTI = ['#e86a6a', '#5fc4a0', '#f2b84b', '#7ec4e6', '#b9a3e3', '#fff'];
function activeTick(S){ const now = Date.now(); const d = Math.min(CFG.idleCap, (now - S.lastAct) / 1000); S.lastAct = now; S.secs += d; G.daily.secs += d;
  if(!G.daily.done && G.daily.secs >= CFG.dailySecs){ G.daily.done = true; G.daily.count = (G.daily.count || 0) + 1; S.dailyNow = true } }

/* ---------- Wort-Sprung ---------- */
function startRun(u, li, wi, eb = 0){
  curView = 'game';
  const E = EBENEN[eb], th = ART.THEMES[wi % ART.THEMES.length];
  const frde = eb === 0 ? li < 2 : eb === 1 ? li % 2 === 0 : null; // Meister: gemischt
  const items = pickWords(u, E.q);
  preloadSpeech(items.map(x => x.w.fr));
  const maxH = Math.max(1, CFG.hearts + E.hearts + [0, 1, 1, 2, 2, 3][skl('herz')]);
  const S = { u, li, wi, eb, E, th, frdeMode: frde, frde: frde ?? true, items, qi: -1, hearts: maxH, maxH, shields: [0, 1, 1, 2, 2, 3][skl('schild')], jokers: [0, 1, 1, 2, 2, 3][skl('joker')], trail: [], tt: 0, combo: 0, errors: 0, correct: 0, coins: 0, secs: 0, lastAct: Date.now(), started: new Date().toISOString(),
    phase: 'run', t: 0, off: 0, cx: 999, py: 0, vy: 0, choice: null, opts: [], ansSlot: -1, crumble: 0, frame: 0, ft: 0, blink: 0, pDropY: 0 };
  const P = particles();
  $('#screen').innerHTML = `<section class="stage">
    <div class="qbar"><div class="hearts" id="hearts"></div><span class="combo" id="combo"></span><span class="prog" id="prog"></span><span class="perks" id="perks"></span><button class="hud-btn" id="joker" hidden>Joker</button><button class="hud-btn" id="quit">Karte</button></div>
    <div class="board qword" id="q"></div>
    <div class="canvasbox" id="box"><canvas id="cv" width="${ART.W}" height="${ART.H}"></canvas><span class="ebbadge">${esc(E.name)}</span></div>
    <div class="answers" id="ans"></div></section>`;
  const cv = $('#cv'), c = cv.getContext('2d'), box = $('#box');
  $('#quit').onclick = () => confirmQuit(() => { endRun(S, true) });
  const hearts = () => { $('#hearts').innerHTML = Array.from({ length: S.maxH }, (_, i) => `<i class="${i < S.hearts ? '' : 'off'}"></i>`).join('') };
  const perks = () => { $('#perks').textContent = S.shields ? `Schild ×${S.shields}` : ''; const j = $('#joker'); j.hidden = !S.jokers; j.textContent = `Joker ×${S.jokers}` };
  perks();
  $('#joker').onclick = () => {
    if(!S.jokers || S.phase !== 'approach' || S.choice !== null || S.jokered) return;
    const wrong = [0, 1, 2].filter(i => i !== S.ansSlot && !S.gone.includes(i)); if(!wrong.length) return;
    const k = wrong[Math.random() * wrong.length | 0]; S.gone.push(k); S.jokers--; S.jokered = true; sfx.buy(); perks();
    const b = document.querySelector(`.ans[data-i="${k}"]`); if(b){ b.disabled = true; b.style.opacity = .35 }
  };
  const mult = () => Math.min(CFG.comboMax, 1 + Math.floor(S.combo / CFG.comboStep));
  const comboUI = () => { const m = mult(); const el = $('#combo'); el.textContent = S.combo >= 2 ? `Kombo ${S.combo} · ×${m}` : ''; el.classList.remove('big'); void el.offsetWidth; if(S.combo >= 2) el.classList.add('big') };
  hearts();
  const PLAT = [ART.GROUND - 100, ART.GROUND - 66, ART.GROUND - 32], PW = 56, PX = 56, LAND = PX + 12 - PW / 2 | 0, JUMP = .5;

  function nextQ(){
    S.qi++; S.choice = null; S.crumble = 0;
    if(S.qi >= S.items.length || S.hearts <= 0) return finish();
    if(S.frdeMode === null) S.frde = Math.random() < .5;
    S.gone = []; S.jokered = false;
    const x = S.items[S.qi], field = S.frde ? 'de' : 'fr';
    const right = x.w[field], opts = shuffle([right, ...distractors(S.u, x, field)]);
    S.opts = opts; S.ansSlot = opts.indexOf(right); S.cx = ART.W + 20; S.phase = 'approach';
    $('#prog').textContent = `${S.qi + 1} / ${S.items.length}`;
    $('#q').innerHTML = S.frde
      ? `<button class="say" id="say" aria-label="Anhören">${SPK2}</button><span>${esc(x.w.fr)}<small>Was heisst das? Spring auf das richtige Wort!</small></span>`
      : `<span>${esc(x.w.de)}<small>Wie heisst das auf Französisch?</small></span>`;
    if(S.frde){ $('#say').onclick = () => speak(x.w.fr); setTimeout(() => speak(x.w.fr), 200) }
    $('#ans').innerHTML = opts.map((o, i) => `<button class="ans" data-i="${i}"><span class="flag" style="background:${SLOT[i][0]}">${SLOT[i][3]}</span>${esc(o)}<span class="key">Taste ${SLOT[i][3]} oder ${SLOT[i][4]}</span></button>`).join('');
    document.querySelectorAll('.ans').forEach(b => b.onclick = () => choose(+b.dataset.i));
  }
  function choose(i){
    if(S.phase !== 'approach' || S.choice !== null || (S.gone || []).includes(i)) return;
    S.choice = i; S.phase = 'rush'; sfx.click(); activeTick(S);
    document.querySelectorAll('.ans').forEach((b, j) => { b.disabled = true; if(j === i) b.style.outline = '4px solid #3b2d3f' });
  }
  keyFn = e => { if(curView !== 'game') return; const k = { '1': 0, '2': 1, '3': 2, ArrowUp: 0, ArrowRight: 1, ArrowDown: 2 }[e.key]; if(k !== undefined){ e.preventDefault(); choose(k) } if(e.key === 'Escape') $('#quit').click() };
  addEventListener('keydown', keyFn);

  function judge(){
    const x = S.items[S.qi], ok = S.choice === S.ansSlot;
    document.querySelectorAll('.ans').forEach((b, j) => { if(j === S.ansSlot) b.classList.add('right'); else if(j === S.choice) b.classList.add('wrong') });
    leitner(x.key, ok, false);
    G.totals.answers++;
    if(ok){
      S.combo++; S.correct++; G.totals.correct++; prog.stars = (prog.stars || 0) + 1;
      G.totals.bestCombo = Math.max(G.totals.bestCombo, S.combo);
      const m = mult(), gain = Math.round(CFG.coin * m * S.E.reward * (1 + .15 * skl('magnet'))); S.coins += gain; addCoins(gain); addXP(Math.round(CFG.xpCorrect * S.E.reward * (1 + .12 * skl('weise'))));
      floatText(box, '+' + gain, 18, 22, '#fff3b0');
      P.add(PX + 12, PLAT[S.choice] - 16, CONFETTI, 18, 80);
      sfx.coin(); if(S.combo && S.combo % CFG.comboStep === 0){ sfx.combo(m); floatText(box, '×' + m + '!', 40, 30, '#ffd0e0') }
      if(!S.frde) speak(x.w.fr);
    } else {
      if(S.shields > 0 && S.combo > 0){ S.shields--; perks(); floatText(box, 'Schild!', 40, 30, '#b8e4f5') } else S.combo = 0;
      S.errors++; S.hearts--; hearts(); sfx.wrong();
      if(S.frde) setTimeout(() => speak(x.w.fr), 300);
    }
    comboUI(); touchDay(); save();
    return ok;
  }
  function finish(){ S.phase = 'end'; setTimeout(() => endRun(S, false), 500) }

  startLoop(dt => {
    S.t += dt; S.ft += dt; if(S.ft > .12){ S.ft = 0; S.frame = (S.frame + 1) % 3 }
    const v = (CFG.speed + CFG.speedPerCombo * Math.min(8, S.combo)) * S.E.speed * (1 - .07 * skl('zeit'));
    const sp = S.phase === 'rush' ? 230 : (S.phase === 'end' ? 20 : v);
    S.off += sp * dt;
    if(S.cx < 900) S.cx -= sp * dt;
    const jumpAt = LAND + v * JUMP;
    if(S.phase === 'run' && S.t > .6) nextQ();
    if((S.phase === 'approach' || S.phase === 'rush') && S.cx <= jumpAt){
      if(S.choice === null){ // Zeit abgelaufen: Pip läuft weiter und fällt ins Wasser
        S.phase = 'fall'; S.vy = -40; S.timeout = true; activeTick(S);
        document.querySelectorAll('.ans').forEach(b => b.disabled = true); judge();
      } else { S.phase = 'jump'; S.jt = 0; S.jfrom = 0; S.jto = PLAT[S.choice] - (ART.GROUND); sfx.jump() }
    }
    let pyOff = 0;
    if(S.phase === 'jump'){
      S.jt += dt; const k = Math.min(1, S.jt / JUMP);
      pyOff = S.jfrom + (S.jto - S.jfrom) * k - Math.sin(k * Math.PI) * 26;
      if(k >= 1){ S.ok = judge(); S.phase = S.ok ? 'ride' : 'crumble'; S.pt = 0 }
    } else if(S.phase === 'ride'){
      pyOff = S.jto; S.pt += dt;
      if(S.cx + PW < PX - 2){ S.phase = 'drop'; S.dt0 = 0 }
    } else if(S.phase === 'drop'){
      S.dt0 += dt; const k = Math.min(1, S.dt0 / .35); pyOff = S.jto * (1 - k) - Math.sin(k * Math.PI) * 8;
      if(k >= 1){ S.phase = 'gap'; }
    } else if(S.phase === 'crumble'){
      S.pt += dt; S.crumble = Math.min(1, S.pt / .7); pyOff = S.jto + S.crumble * S.crumble * 60;
      if(S.pt > .25 && !S.splashed){ S.splashed = true }
      if(S.crumble >= 1){ S.phase = 'fall'; S.vy = 0; S.pDropY = S.jto + 60 }
    } else if(S.phase === 'fall'){
      S.vy += 320 * dt; S.pDropY = (S.pDropY || 0) + S.vy * dt; pyOff = S.pDropY;
      if(pyOff > 30 && !S.splash2){ S.splash2 = true; sfx.splash(); P.add(PX + 12, ART.GROUND + 10, ['#b8e4f5', '#7ec4e6', '#fff'], 16, 70) }
      if(S.cx + PW + 10 < PX - 2){ S.phase = 'gap'; S.blink = 1.2; S.pDropY = 0; S.vy = 0; S.splash2 = false; S.splashed = false; S.timeout = false }
    }
    if(S.phase === 'gap' && S.cx < -80){ S.cx = 999; S.phase = 'run'; S.t = 0 }
    // Zeichnen
    const gaps = S.cx < 900 ? [[S.cx - 4 | 0, S.cx + PW + 8 | 0]] : [];
    ART.scene(c, S.th, S.t, S.off, { gaps, night: S.eb === 2 });
    if(S.cx < 900) S.opts.forEach((o, i) => { if((S.gone || []).includes(i) && S.choice === null) return; const crum = i !== S.choice ? 0 : S.phase === 'crumble' ? S.crumble : (S.phase === 'fall' && !S.timeout) ? 1 : 0; if(crum < 1) ART.platform(c, S.cx | 0, PLAT[i], PW, SLOT[i][1], SLOT[i][2], crum) });
    // Spur hinter der Figur
    const TR = ART.TRAILS[G.look.trail];
    if(TR){ S.tt += dt; if(S.tt > .07){ S.tt = 0; S.trail.push({ x: PX + 2, y: ART.GROUND - 8 + pyOff - Math.random() * 16, life: 1, col: TR.cols[Math.random() * TR.cols.length | 0] }) }
      for(let i = S.trail.length - 1; i >= 0; i--){ const p = S.trail[i]; p.life -= dt * 1.4; p.x -= sp * dt; p.y -= 6 * dt; if(p.life <= 0 || p.x < -4){ S.trail.splice(i, 1); continue } ART.trailDot(c, TR, p.x, p.y, p.col) } }
    if(G.look.pet) ART.creature(c, G.look.pet, PX - 30, ART.GROUND - 24 + (Math.sin(S.t * 10) > 0 ? -2 : 0), 2, ART.petStage(G.cards[G.look.pet] || 1), S.t);
    const visible = S.blink > 0 ? (Math.floor(S.blink * 10) % 2 === 0) : true; if(S.blink > 0) S.blink -= dt;
    if(visible) ART.pip(c, PX, ART.GROUND - 30 + pyOff, G.look, (S.phase === 'jump' || S.phase === 'fall') ? 1 : S.frame, 2);
    if(S.phase === 'ride' && S.pt < .8){ for(let i = 0; i < 3; i++) ART.coin(c, PX + 12 + i * 12 - 12, PLAT[S.choice] - 40 - S.pt * 30 + i * 3, S.t + i) }
    P.step(c, dt);
    // Zeitbalken
    if(S.phase === 'approach'){ const k = Math.max(0, (S.cx - jumpAt) / (ART.W + 20 - jumpAt)); c.fillStyle = '#3b2d3f'; c.fillRect(8, 6, 82, 6); c.fillStyle = k > .3 ? '#5fc4a0' : '#e86a6a'; c.fillRect(9, 7, 80 * k | 0, 4) }
  });
}
function confirmQuit(go){
  overlay(`<div class="board dialog"><h2>Zur Karte?</h2><p>Die Münzen aus diesem Level behältst du.</p><div class="row"><button class="pbtn" id="ov-yes">Ja, zur Karte</button><button class="pbtn alt" id="ov-no">Weiterspielen</button></div></div>`,
    { '#ov-yes': () => { closeOverlay(); go() }, '#ov-no': closeOverlay });
}
function endRun(S, quit){
  stopLoop(); curView = 'result';
  const k = sKey(S.u.id, S.eb, S.li);
  const stars = quit || S.hearts <= 0 ? 0 : S.errors === 0 ? 3 : S.errors <= 2 ? 2 : 1;
  const prev = G.stars[k] || 0;
  if(stars > prev) G.stars[k] = stars;
  const bonus = Math.round(stars * CFG.starBonus * S.E.reward); if(bonus) addCoins(bonus);
  log(S, 'game');
  const nb = checkBadges();
  save(); hud();
  if(quit) return renderMap();
  if(stars) sfx.win(); else sfx.wrong();
  const title = stars === 3 ? 'Perfekt!' : stars === 2 ? 'Super gemacht!' : stars === 1 ? 'Geschafft!' : 'Fast!';
  overlay(`<div class="board dialog">
    <h2>${title}</h2>
    <div class="bigstars">${[1, 2, 3].map(s => `<i class="${stars >= s ? 'on' : ''}"></i>`).join('')}</div>
    ${stars ? '' : '<p>Die Herzen sind leer. Versuch es nochmals, du schaffst das!</p>'}
    <div class="gains"><span><i class="coin"></i>+${S.coins + bonus}</span><span>${S.correct} / ${S.items.length} richtig</span></div>
    ${nb.length ? `<p><b>Neues Abzeichen:</b> ${nb.map(b => esc(b[1])).join(', ')}</p>` : ''}
    <div class="row"><button class="pbtn" id="ov-next">${stars ? 'Weiter' : 'Nochmals'}</button><button class="pbtn alt" id="ov-map">Zur Karte</button></div></div>`,
    { '#ov-next': () => { closeOverlay(); afterDaily(S, () => {
        if(!stars) startRun(S.u, S.li, S.wi, S.eb); else if(S.li < 3) startRun(S.u, S.li + 1, S.wi, S.eb); else startBoss(S.u, S.wi, S.eb) }) },
      '#ov-map': () => { closeOverlay(); afterDaily(S, renderMap) } });
}
function afterDaily(S, then){
  if(S.dailyNow){ S.dailyNow = false; sfx.level(); overlay(`<div class="board dialog"><h2>Tagesziel geschafft!</h2><p>${CFG.dailySecs / 60} Minuten geübt. Dafür gibt es eine Truhe!</p><button class="pbtn" id="ov-ok">Truhe öffnen</button></div>`, { '#ov-ok': () => { closeOverlay(); openChest('daily', then) } }) }
  else then();
}
function log(S, kind){
  if(!S.correct && !S.errors) return;
  sb.rpc('kid_log', { p_name: kid.name, p_pin: kid.pin, p_kind: kind, p_units: [S.u.id], p_answers: S.correct + S.errors, p_correct: S.correct, p_seconds: Math.round(S.secs), p_started: S.started })
    .then(({ error }) => { if(error) console.error(error) });
}

/* ---------- Boss ---------- */
function startBoss(u, wi, eb = 0){
  curView = 'game';
  const E = EBENEN[eb], th = ART.THEMES[wi % ART.THEMES.length];
  const items = pickWords(u, E.bossHP + 6);
  preloadSpeech(items.map(x => x.w.fr));
  const maxH = Math.max(1, CFG.hearts + E.hearts + [0, 1, 1, 2, 2, 3][skl('herz')]);
  const bossTime = E.bossTime * (1 + .12 * skl('zeit'));
  const S = { u, li: 4, wi, eb, E, th, items, qi: -1, hp: E.bossHP, maxHP: E.bossHP, hearts: maxH, maxH, jokers: [0, 1, 1, 2, 2, 3][skl('joker')], combo: 0, errors: 0, correct: 0, coins: 0, secs: 0, lastAct: Date.now(), started: new Date().toISOString(), t: 0, charge: 0, shots: [], hurt: 0, shake: 0, phurt: 0, phase: 'fight' };
  const P = particles();
  $('#screen').innerHTML = `<section class="stage">
    <div class="qbar"><div class="hearts" id="hearts"></div><span class="combo" id="combo"></span><button class="hud-btn" id="quit">Karte</button></div>
    <div class="bossbar"><span>${esc(th.bossName)}${eb ? ' · ' + esc(E.name) : ''}</span><span class="hp"><i id="hp" style="width:100%"></i></span><button class="hud-btn" id="joker" hidden>Joker</button></div>
    <div class="canvasbox" id="box"><canvas id="cv" width="${ART.W}" height="${ART.H}"></canvas></div>
    <div class="board typebox">
      <div class="qword" id="q"></div>
      <div class="charge"><i id="charge"></i></div>
      <form id="f" autocomplete="off"><input id="inp" aria-label="Französisches Wort" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="auf Französisch …"><button class="pbtn" type="submit">Wurf!</button></form>
      <div class="accents">${ACC.map(a => `<button type="button" data-c="${esc(a)}">${esc(a)}</button>`).join('')}</div>
      <p class="msg" id="msg">Schreib das Wort auf Französisch. Jedes richtige Wort trifft ${esc(th.bossName)}!</p>
    </div></section>`;
  const cv = $('#cv'), c = cv.getContext('2d'), box = $('#box'), inp = $('#inp');
  const hearts = () => { $('#hearts').innerHTML = Array.from({ length: S.maxH }, (_, i) => `<i class="${i < S.hearts ? '' : 'off'}"></i>`).join('') };
  hearts();
  const jk = () => { const j = $('#joker'); j.hidden = !S.jokers; j.textContent = `Joker ×${S.jokers}` }; jk();
  $('#joker').onclick = () => { if(!S.jokers || S.phase !== 'fight' || inp.disabled || S.hinted) return; const x = S.items[S.qi]; const t = S.toDe ? x.w.de : x.w.fr;
    const n = Math.max(2, Math.ceil(t.length / 3)); inp.value = t.slice(0, n); inp.focus(); S.jokers--; S.hinted = true; jk(); sfx.buy() };
  $('#quit').onclick = () => confirmQuit(() => { stopLoop(); log(S, 'game'); save(); renderMap() });
  document.querySelectorAll('.accents button').forEach(b => b.onclick = () => { const p = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, p) + b.dataset.c + inp.value.slice(inp.selectionEnd ?? p); inp.focus(); inp.setSelectionRange(p + 1, p + 1) });
  function nextQ(){
    S.qi++; if(S.qi >= S.items.length) S.items.push(...pickWords(u, 4));
    const x = S.items[S.qi]; S.charge = 0; S.hinted = false; S.toDe = S.qi % 2 === 1; // abwechselnd: auf Französisch, dann auf Deutsch schreiben
    $('#q').innerHTML = S.toDe
      ? `<button class="say" id="say" aria-label="Anhören">${SPK2}</button><span>${esc(x.w.fr)}<small>Was heisst das auf Deutsch?</small></span>`
      : `<span>${esc(x.w.de)}<small>Wie heisst das auf Französisch?</small></span>`;
    inp.placeholder = S.toDe ? 'auf Deutsch …' : 'auf Französisch …';
    document.querySelector('.accents').hidden = S.toDe;
    if(S.toDe){ $('#say').onclick = () => speak(x.w.fr); setTimeout(() => speak(x.w.fr), 200) }
    inp.value = ''; inp.disabled = false; inp.focus();
  }
  function mult(){ return Math.min(CFG.comboMax, 1 + Math.floor(S.combo / CFG.comboStep)) }
  function answer(val){
    if(S.phase !== 'fight') return;
    const x = S.items[S.qi]; activeTick(S);
    const target = S.toDe ? x.w.de : x.w.fr;
    const r = val === null ? { r: 'wrong' } : checkGame(val, target, S.toDe ? 'de' : 'fr');
    const hit = r.r !== 'wrong';
    leitner(x.key, hit, r.r === 'ok' || r.r === 'accent' || r.r === 'syn');
    G.totals.answers++;
    const msg = $('#msg');
    if(hit){
      S.combo++; S.correct++; G.totals.correct++; prog.stars = (prog.stars || 0) + 1; G.totals.bestCombo = Math.max(G.totals.bestCombo, S.combo);
      const gain = Math.round(CFG.bossCoin * mult() * S.E.reward * (1 + .15 * skl('magnet'))); S.coins += gain; addCoins(gain); addXP(Math.round((CFG.xpCorrect + 5) * S.E.reward * (1 + .12 * skl('weise'))));
      S.shots.push({ x: 80, y: ART.GROUND - 22, t: 0, from: 'me' });
      if(Math.random() < .12 * skl('stern')){ S.shots.push({ x: 80, y: ART.GROUND - 22, t: -.15, from: 'me' }); floatText(box, 'Doppel-Treffer!', 30, 30, '#fff3b0') } sfx.jump(); if(!S.toDe) speak(x.w.fr);
      msg.className = 'msg ok';
      msg.textContent = { ok: 'Treffer!', accent: `Treffer! So schreibt man es: ${target}`, syn: `Treffer! Auch richtig. Im Heft steht: ${target}`,
        article: `Treffer! Mit Artikel: ${target}`, typo: `Treffer! Kleiner Tippfehler, richtig ist: ${target}` }[r.r];
      floatText(box, '+' + gain, 20, 50, '#fff3b0');
    } else {
      S.combo = 0; S.errors++;
      S.shots.push({ x: 210, y: 70, t: 0, from: 'boss' }); sfx.wrong();
      msg.className = 'msg bad'; msg.textContent = (val === null ? 'Zu langsam! ' : 'Leider falsch. ') + 'Richtig ist: ' + target;
      setTimeout(() => speak(x.w.fr), 300);
      S.items.push(x); // kommt nochmals dran
    }
    $('#combo').textContent = S.combo >= 2 ? `Kombo ${S.combo} · ×${mult()}` : '';
    touchDay(); save();
    inp.disabled = true;
    setTimeout(() => { if(S.phase === 'fight') nextQ() }, hit ? 900 : 1900);
  }
  $('#f').onsubmit = e => { e.preventDefault(); if(!inp.value.trim()) return inp.focus(); answer(inp.value) };
  keyFn = e => { if(e.key === 'Escape') $('#quit').click() }; addEventListener('keydown', keyFn);
  nextQ();
  startLoop(dt => {
    S.t += dt;
    if(S.phase === 'fight' && !inp.disabled){ S.charge += dt / bossTime; $('#charge').style.width = Math.min(100, S.charge * 100) + '%'; if(S.charge >= 1) answer(null) }
    ART.scene(c, S.th, S.t, S.t * 6, { night: true });
    // Geschosse
    for(let i = S.shots.length - 1; i >= 0; i--){
      const s = S.shots[i]; s.t += dt;
      const k = Math.max(0, Math.min(1, s.t / .45));
      if(s.from === 'me'){ const x = 80 + (224 - 80) * k, y = ART.GROUND - 22 - Math.sin(k * Math.PI) * 50 + (70 - ART.GROUND + 22) * k;
        c.fillStyle = '#fff3b0'; c.fillRect(x - 2 | 0, y - 2 | 0, 5, 5); c.fillStyle = '#f2c94c'; c.fillRect(x - 1 | 0, y - 1 | 0, 3, 3); P.add(x, y, '#fff3b0', 1, 10);
        if(k >= 1){ S.shots.splice(i, 1); S.hp--; S.hurt = .3; S.shake = .3; sfx.hit(); P.add(225, 70, CONFETTI, 14, 70); $('#hp').style.width = Math.max(0, S.hp / S.maxHP * 100) + '%'; if(S.hp <= 0 && S.phase === 'fight') win() } }
      else { const x = 210 + (66 - 210) * k, y = 70 + (ART.GROUND - 20 - 70) * k;
        c.fillStyle = '#7ec4e6'; c.fillRect(x | 0, y | 0, 3, 5); c.fillStyle = '#b8e4f5'; c.fillRect(x | 0, y | 0, 1, 2);
        if(k >= 1){ S.shots.splice(i, 1); S.hearts--; S.phurt = 1; hearts(); P.add(66, ART.GROUND - 16, ['#7ec4e6', '#b8e4f5'], 10, 50); if(S.hearts <= 0) lose() } }
    }
    const bob = Math.sin(S.t * 2) * 4, sx = S.shake > 0 ? (Math.random() - .5) * 4 : 0;
    if(S.hurt > 0) S.hurt -= dt; if(S.shake > 0) S.shake -= dt;
    if(S.phase !== 'won') ART.boss(c, 205 + sx, 52 + bob, S.th.boss[0], S.th.boss[1], S.hurt > 0, 2);
    if(G.look.pet) ART.creature(c, G.look.pet, 20, ART.GROUND - 24 + (Math.sin(S.t * 6) > 0 ? -2 : 0), 2, ART.petStage(G.cards[G.look.pet] || 1), S.t);
    const vis = S.phurt > 0 ? Math.floor(S.phurt * 10) % 2 === 0 : true; if(S.phurt > 0) S.phurt -= dt;
    if(vis) ART.pip(c, 54, ART.GROUND - 30, G.look, Math.floor(S.t * 4) % 3 === 0 ? 0 : 2, 2);
    if(S.phase === 'won'){ ART.chest(c, 206, ART.GROUND - 24 - Math.max(0, 40 - S.wt * 80), 2, true); S.wt += dt }
    P.step(c, dt);
  });
  function win(){
    S.phase = 'won'; S.wt = 0; sfx.win(); inp.disabled = true;
    P.add(225, 70, CONFETTI, 60, 120);
    const k = sKey(u.id, eb, 4), stars = S.errors === 0 ? 3 : S.errors <= 2 ? 2 : 1;
    const firstWin = !G.stars[k];
    if(stars > (G.stars[k] || 0)) G.stars[k] = stars;
    const winC = Math.round(CFG.bossWin * S.E.reward);
    G.totals.bosses++; addCoins(winC);
    log(S, 'game'); const nb = checkBadges(); save();
    setTimeout(() => { stopLoop(); overlay(`<div class="board dialog"><h2>${esc(S.th.bossName)} ist besiegt!</h2>
      <div class="bigstars">${[1, 2, 3].map(s => `<i class="${stars >= s ? 'on' : ''}"></i>`).join('')}</div>
      <div class="gains"><span><i class="coin"></i>+${S.coins + winC}</span><span>${S.correct} Treffer</span></div>
      ${firstWin && eb < 2 ? `<p><b>Neue Ebene freigeschaltet:</b> ${esc(EBENEN[eb + 1].name)} (${EBENEN[eb + 1].tag})</p>` : ''}
      ${nb.length ? `<p><b>Neues Abzeichen:</b> ${nb.map(b => esc(b[1])).join(', ')}</p>` : ''}
      <p>Der Boss hat eine goldene Truhe fallen lassen!</p><button class="pbtn" id="ov-ok">Truhe öffnen</button></div>`,
      { '#ov-ok': () => { closeOverlay(); openChest(eb ? 'eb' + eb : 'boss', () => afterDaily(S, renderMap)) } }) }, 1400);
  }
  function lose(){
    S.phase = 'lost'; inp.disabled = true; sfx.wrong(); log(S, 'game'); save();
    setTimeout(() => { stopLoop(); overlay(`<div class="board dialog"><h2>Ups, keine Herzen mehr!</h2><p>${esc(S.th.bossName)} hat noch ${S.hp} Leben. Mit jedem Versuch kennst du mehr Wörter.</p>
      <div class="gains"><span><i class="coin"></i>+${S.coins}</span></div><div class="row"><button class="pbtn" id="ov-again">Nochmals</button><button class="pbtn alt" id="ov-map">Zur Karte</button></div></div>`,
      { '#ov-again': () => { closeOverlay(); afterDaily(S, () => startBoss(u, wi, eb)) }, '#ov-map': () => { closeOverlay(); afterDaily(S, renderMap) } }) }, 900);
  }
}

/* ---------- Truhen ---------- */
function openChest(kind, then){
  const base = kind === 'eb1' ? EBENEN[1].rar : kind === 'eb2' ? EBENEN[2].rar : (kind === 'boss' || kind === 'team' || kind === 'gold') ? CFG.rarityBoss : CFG.rarity;
  const lk = skl('klee'), w = [Math.max(10, base[0] - 6 * lk), base[1] + 4 * lk, base[2] + 2 * lk];
  let r = Math.random() * w.reduce((a, b) => a + b), rar = 0; while(r > w[rar]){ r -= w[rar]; rar++ }
  const pool = ART.CREATURES.filter(c => c[5] === rar);
  const fresh = pool.filter(c => !G.cards[c[0]]);
  const src = fresh.length && Math.random() < .7 ? fresh : pool;
  const pick = src[Math.random() * src.length | 0] || pool[0];
  const isNew = !G.cards[pick[0]];
  G.cards[pick[0]] = (G.cards[pick[0]] || 0) + 1;
  if(!isNew) G.coins += CFG.dupCoins;
  const nb = checkBadges(); save(); hud();
  const stg = ART.petStage(G.cards[pick[0]]), grew = !isNew && stg > ART.petStage(G.cards[pick[0]] - 1);
  overlay(`<div class="board dialog"><h2>${kind === 'team' ? 'Teamtruhe!' : kind === 'daily' ? 'Tagestruhe!' : kind === 'wood' ? 'Holztruhe!' : 'Truhe!'}</h2>
    <div class="chest"><canvas id="ch" width="32" height="32"></canvas></div><p class="hint" id="ch-hint">Tippe auf die Truhe!</p>
    <div id="ch-res" hidden><h3 style="font-size:1.6rem">${esc(pick[1])}</h3><p><span class="rar r${rar}">${['Normal', 'Selten', 'Episch'][rar]}</span></p>
      <p>${isNew ? 'Neu in deinem Album!' : grew ? `${esc(pick[1])} hat sich weiterentwickelt: Stufe ${stg}!` : `Hast du schon (${G.cards[pick[0]]}×). Dafür gibt es ${CFG.dupCoins} Münzen. Ab 3× und 6× entwickelt es sich.`}</p>
      ${nb.length ? `<p><b>Neues Abzeichen:</b> ${nb.map(b => esc(b[1])).join(', ')}</p>` : ''}
      <div class="row"><button class="pbtn" id="ov-ok">Super!</button>${isNew ? '<button class="pbtn alt" id="ov-pet">Als Begleiter</button>' : ''}</div></div></div>`, {});
  const cv = $('#ch'), c = cv.getContext('2d'); let opened = false, t = 0, id = 0;
  const drawC = () => { c.clearRect(0, 0, 32, 32); if(!opened){ const s = Math.sin(t * 20) * (t % 1.2 > .9 ? 1 : 0); ART.chest(c, 8 + s, 12, 1, kind !== 'daily' && kind !== 'wood') } else ART.creature(c, pick[0], 10, 10 - Math.max(0, 6 - t * 20), 1, stg, t); t += .016; id = requestAnimationFrame(drawC) };
  drawC();
  const openIt = () => { if(opened) return; opened = true; t = 0; sfx.chest(); $('#ch-hint').hidden = true; $('#ch-res').hidden = false;
    $('#ov-ok').onclick = () => { cancelAnimationFrame(id); closeOverlay(); then && then() };
    const pb = $('#ov-pet'); if(pb) pb.onclick = () => { G.look.pet = pick[0]; save(); cancelAnimationFrame(id); closeOverlay(); then && then() } };
  cv.parentElement.onclick = openIt; cv.parentElement.style.cursor = 'pointer';
}

/* ---------- Abzeichen ---------- */
function checkBadges(){ const nb = BADGES.filter(b => !G.badges[b[0]] && b[3](G)); nb.forEach(b => G.badges[b[0]] = today()); return nb }
function badgeIcon(cv, i, on){
  const c = cv.getContext('2d'); c.clearRect(0, 0, 28, 28);
  const cols = ['#f2b84b', '#e86a6a', '#5fc4a0', '#7ec4e6', '#b9a3e3'];
  c.fillStyle = ART.INK; c.fillRect(6, 2, 16, 3); c.fillRect(3, 5, 22, 16); c.fillRect(6, 21, 16, 3); c.fillRect(10, 24, 8, 3);
  c.fillStyle = on ? cols[i % cols.length] : '#d9c9b2'; c.fillRect(7, 3, 14, 2); c.fillRect(4, 6, 20, 14); c.fillRect(7, 21, 14, 2); c.fillRect(11, 24, 6, 2);
  c.fillStyle = on ? '#fff3b0' : '#efe4d4'; const st = [[13, 8], [12, 10], [13, 10], [14, 10], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [12, 13], [13, 13], [14, 13], [11, 14], [12, 14], [14, 14], [15, 14], [10, 15], [11, 15], [15, 15], [16, 15]];
  st.forEach(([x, y]) => c.fillRect(x, y, 1, 1));
}
function renderBadges(){
  curView = 'badges';
  $('#screen').innerHTML = `<section class="board"><div class="panelhead"><h2>Abzeichen</h2><span class="hint">${Object.keys(G.badges).length} von ${BADGES.length}</span></div></section>
    <section class="grid">${BADGES.map((b, i) => `<div class="item badge ${G.badges[b[0]] ? '' : 'locked'}"><canvas width="28" height="28" data-b="${i}"></canvas><b>${esc(b[1])}</b><small>${esc(b[2])}</small></div>`).join('')}</section>
    <section class="board"><p class="hint">${G.totals.correct} Wörter richtig · beste Kombo ${G.totals.bestCombo} · ${G.totals.bosses} Bosse besiegt · Tagesziel ${G.daily.count || 0} Mal geschafft</p></section>`;
  document.querySelectorAll('[data-b]').forEach(cv => badgeIcon(cv, +cv.dataset.b, !!G.badges[BADGES[+cv.dataset.b][0]]));
}

/* ---------- Shop ---------- */
let shopTab = 'skill';
const SHOPTABS = [['skill', 'Kräfte'], ['hat', 'Mützen'], ['face', 'Gesicht'], ['color', 'Farben'], ['trail', 'Spuren'], ['chest', 'Truhen']];
function renderShop(){
  curView = 'shop';
  const L = lvlOf(G.xp).lvl;
  const head = `<section class="board"><div class="panelhead"><h2>Shop</h2><span class="hud-coins"><i class="coin"></i>${G.coins}</span></div>
    <nav class="tabs2" style="margin-top:8px">${SHOPTABS.map(([k, n]) => `<button data-t="${k}" aria-pressed="${shopTab === k}">${n}</button>`).join('')}</nav>
    <p class="hint" style="margin-top:6px">${shopTab === 'skill' ? 'Jede Kraft hat 5 Stufen. Die oberen gelten in allen drei Spielen, die anderen nur in einem.' : shopTab === 'chest' ? 'In Truhen stecken Wesen. Doppelte Wesen entwickeln sich weiter.' : 'Mit höherem Level gibt es neue Sachen. Münzen verdienst du mit richtigen Wörtern.'}</p></section>`;
  let body = '';
  if(shopTab === 'skill'){
    const card = ([id, name, desc, prices, eff]) => { const l = skl(id), max = l >= 5, p = prices[l];
      return `<div class="item skill"><div class="sk-top"><b>${esc(name)}</b><span class="pips">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= l ? 'on' : ''}"></i>`).join('')}</span></div>
        <small>${esc(desc)}</small><small class="eff">${l ? 'Jetzt: ' + eff(l) : 'Noch nicht gekauft'}${max ? '' : ' → Stufe ' + (l + 1) + ': ' + eff(l + 1)}</small>
        ${max ? '<span class="maxed">Maximal!</span>' : `<button data-skill="${id}" ${G.coins < p ? 'disabled' : ''}><i class="coin"></i> ${p}</button>`}</div>` };
    body = SKILL_GROUPS.map(([g, title]) => `<h3 class="skgroup">${esc(title)}</h3><section class="skills">${SKILLS.filter(x => x[5] === g).map(card).join('')}</section>`).join('');
  } else if(shopTab === 'chest'){
    body = `<section class="grid">${CHESTS.map(([id, name, price, desc]) => `<div class="item"><canvas width="20" height="16" data-chest="${id}"></canvas><b>${esc(name)}</b><small>${esc(desc)}</small><span class="price"><i class="coin"></i>${price}</span><button data-buychest="${id}" ${G.coins < price ? 'disabled' : ''}>Kaufen</button></div>`).join('')}</section>`;
  } else {
    const items = SHOP.filter(s => s.kind === shopTab);
    const worn = s => G.look[s.kind] === s.key;
    body = `<section class="grid">${items.map(s => { const own = !!G.owned[s.id], lock = !own && L < s.lvl;
      return `<div class="item ${worn(s) ? 'worn' : ''} ${lock ? 'lvl-lock' : ''}"><canvas width="${s.kind === 'trail' ? 24 : 16}" height="20" data-s="${s.id}"></canvas><b>${esc(s.name)}</b>
        ${own ? `<button class="${worn(s) ? 'alt' : ''}" data-wear="${s.id}">${worn(s) ? (s.kind === 'color' ? 'Trägst du' : 'Ablegen') : 'Anziehen'}</button>`
          : lock ? `<small>ab Level ${s.lvl}</small>` : `<span class="price"><i class="coin"></i>${s.price}</span><button data-buy="${s.id}" ${G.coins < s.price ? 'disabled' : ''}>Kaufen</button>`}</div>` }).join('')}</section>`;
  }
  $('#screen').innerHTML = head + body;
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { sfx.click(); shopTab = b.dataset.t; renderShop() });
  document.querySelectorAll('[data-s]').forEach(cv => { const s = SHOP.find(x => x.id === cv.dataset.s);
    if(s.kind === 'trail'){ const c = cv.getContext('2d'), tr = ART.TRAILS[s.key]; for(let i = 0; i < 7; i++) ART.trailDot(c, tr, 1 + i * 3, 4 + (i * 7) % 12, tr.cols[i % tr.cols.length]); ART.pip(c, 12, 5, { ...G.look }, 0) }
    else avatarCanvas(cv, { ...G.look, [s.kind]: s.key }) });
  document.querySelectorAll('[data-chest]').forEach(cv => ART.chest(cv.getContext('2d'), 2, 2, 1, cv.dataset.chest === 'gold'));
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const s = SHOP.find(x => x.id === b.dataset.buy); if(G.coins < s.price) return; G.coins -= s.price; G.owned[s.id] = 1; G.look[s.kind] = s.key; sfx.buy(); const nb = checkBadges(); if(nb.length) toast('Neues Abzeichen: ' + nb[0][1]); save(); hud(); renderShop() });
  document.querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { const s = SHOP.find(x => x.id === b.dataset.wear); if(s.kind === 'color') G.look.color = s.key; else G.look[s.kind] = G.look[s.kind] === s.key ? null : s.key; sfx.click(); save(); hud(); renderShop() });
  document.querySelectorAll('[data-skill]').forEach(b => b.onclick = () => { const sk = SKILLS.find(x => x[0] === b.dataset.skill), l = skl(sk[0]), p = sk[3][l]; if(l >= 5 || G.coins < p) return;
    G.coins -= p; G.skills[sk[0]] = l + 1; sfx.level(); toast(sk[1] + ' jetzt auf Stufe ' + (l + 1) + '!'); const nb = checkBadges(); if(nb.length) setTimeout(() => toast('Neues Abzeichen: ' + nb[0][1]), 1500); save(); hud(); renderShop() });
  document.querySelectorAll('[data-buychest]').forEach(b => b.onclick = () => { const ch = CHESTS.find(x => x[0] === b.dataset.buychest); if(G.coins < ch[2]) return; G.coins -= ch[2]; hud(); save(); openChest(ch[0] === 'gold' ? 'gold' : 'wood', () => renderShop()) });
}

/* ---------- Album ---------- */
function renderAlbum(){
  curView = 'album';
  const n = Object.keys(G.cards).length;
  $('#screen').innerHTML = `<section class="board"><div class="panelhead"><h2>Album</h2><span class="hint">${n} von ${ART.CREATURES.length} Wesen</span></div><p class="hint">Truhen gibt es für besiegte Bosse, das Tagesziel und das Teamziel. Ein Wesen kann dich als Begleiter durchs Spiel begleiten.</p></section>
    <section class="grid">${ART.CREATURES.map(cr => { const have = G.cards[cr[0]];
      return `<div class="item cre ${have ? (G.look.pet === cr[0] ? 'worn' : '') : 'locked'}"><canvas width="14" height="17" data-c="${cr[0]}"></canvas><b>${have ? esc(cr[1]) : '???'}</b><span class="rar r${cr[5]}">${['Normal', 'Selten', 'Episch'][cr[5]]}</span>
        ${have ? `<button class="${G.look.pet === cr[0] ? 'alt' : ''}" data-pet="${cr[0]}">${G.look.pet === cr[0] ? 'Begleitet dich' : 'Als Begleiter'}</button><small>Stufe ${ART.petStage(have)} · ${have}×</small>` : ''}</div>` }).join('')}</section>`;
  document.querySelectorAll('[data-c]').forEach(cv => ART.creature(cv.getContext('2d'), cv.dataset.c, 1, 4, 1, ART.petStage(G.cards[cv.dataset.c] || 1), 1));
  document.querySelectorAll('[data-pet]').forEach(b => b.onclick = () => { G.look.pet = G.look.pet === b.dataset.pet ? null : b.dataset.pet; sfx.click(); save(); renderAlbum() });
}

/* ---------- Overlay ---------- */
function overlay(html, handlers){
  closeOverlay();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'ov'; o.innerHTML = html; document.body.appendChild(o);
  Object.entries(handlers || {}).forEach(([sel, fn]) => { const el = o.querySelector(sel); if(el) el.onclick = () => { sfx.click(); fn() } });
  const first = o.querySelector('button'); if(first) first.focus();
}
function closeOverlay(){ const o = $('#ov'); if(o) o.remove() }

init();
