// Voci-Kiste · Kinderseite
const IDLE_CAP = 90; // Sekunden: längere Pausen zählen nicht als Übungszeit

const { sb, error: setupErr } = makeClient();
if(sb) loadCloudAudio(sb);
let kid = ls.get('vk-kid', null);       // { name, pin }
let units = [], sel = new Set(), dir = 'de-fr', how = 'write', view = 'start', sess = null;
let gameInfo = null;
let prog = { cards:{}, stars:0, streak:0, lastDay:'' };
let pin = '', pinFor = null, pinErr = '';
let gUnit = ls.get('vk-gunit', null);

/* ---------- Daten ---------- */
function allWords(ids){ const out = []; for(const u of units){ if(ids && !ids.has(u.id)) continue; (u.words || []).forEach(w => { if(w.fr && w.de) out.push({ u:u.id, w, key:u.id + '|' + w.fr }) }) } return out }
const boxOf = k => prog.cards[k]?.box || 0;
const isDue = k => { const c = prog.cards[k]; return !c || c.due <= today() };
const progKey = () => 'vk-prog-' + (kid?.name || '').toLowerCase();

let saving = false, again = false, saveT = null, unsaved = false;
function saveProg(){ ls.set(progKey(), prog); unsaved = true; clearTimeout(saveT); saveT = setTimeout(flush, 1500) }
async function flush(){
  if(!unsaved || !kid) return;
  if(saving){ again = true; return }
  saving = true; unsaved = false;
  const { error } = await sb.rpc('kid_save', { p_name:kid.name, p_pin:kid.pin, p_cards:prog.cards, p_stars:prog.stars || 0, p_streak:prog.streak || 0, p_last_day:prog.lastDay || null });
  saving = false;
  if(error){ console.error(error); unsaved = true; toast('Speichern hat nicht geklappt: ' + error.message) }
  if(again){ again = false; flush() }
}
window.addEventListener('pagehide', () => { if(unsaved) flush() });
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden' && unsaved) flush() });

function touchDay(){ const t = today(); if(prog.lastDay === t) return; prog.streak = prog.lastDay === today(-1) ? (prog.streak || 0) + 1 : 1; prog.lastDay = t }

/* ---------- Start & Anmelden ---------- */
async function init(){
  if(setupErr){ $('#view').innerHTML = setupMessage(setupErr); return }
  dir = ls.get('vk-dir', 'de-fr'); how = ls.get('vk-how', 'write');
  const { data, error } = await sb.from('units').select('id,title,ord,level,words,grammar').order('ord').order('title');
  if(error){ console.error(error); $('#view').innerHTML = `<div class="empty"><h2>Keine Verbindung</h2><p>Die Wörter konnten nicht geladen werden: ${esc(error.message)}</p></div>`; return }
  units = data || [];
  loadOwnClips(sb).then(() => { if(kid && view === 'words' && !sess) render() });
  if(kid) await login(kid.name, kid.pin, true); else renderWho();
}

async function renderWho(){
  showChrome(false);
  const v = $('#view');
  const { data, error } = await sb.rpc('kid_names');
  if(error){ v.innerHTML = `<div class="empty"><p>Die Namen konnten nicht geladen werden.</p></div>`; return }
  if(!data?.length){ v.innerHTML = `<div class="empty"><h2>Noch niemand eingetragen</h2><p>Die Eltern tragen auf der Elternseite zuerst die Kinder mit PIN ein.</p></div>`; return }
  v.innerHTML = `<section><h2>Wer übt heute?</h2><div class="who">${data.map(k => `<button data-n="${esc(k.name)}"><span class="ava">${esc(k.name.slice(0,1).toUpperCase())}</span>${esc(k.name)}</button>`).join('')}</div></section>`;
  v.querySelectorAll('.who button').forEach(b => b.onclick = () => { pinFor = b.dataset.n; pin = ''; pinErr = ''; renderPin() });
}

function renderPin(){
  const v = $('#view');
  v.innerHTML = `<div class="pinbox" id="pinbox"><h2>Hallo ${esc(pinFor)}!</h2><p class="hint">Tippe deine PIN</p>
    <div class="dots">${[0,1,2,3].map(i => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join('')}</div>
    ${pinErr ? `<p class="error">${esc(pinErr)}</p>` : ''}
    <div class="pad">${[1,2,3,4,5,6,7,8,9].map(n => `<button data-k="${n}">${n}</button>`).join('')}<button data-k="back" aria-label="Löschen">⌫</button><button data-k="0">0</button><button data-k="x" aria-label="Zurück">✕</button></div></div>`;
  if(pinErr){ $('#pinbox').classList.add('shake') }
  v.querySelectorAll('.pad button').forEach(b => b.onclick = () => key(b.dataset.k));
}
async function key(k){
  if(k === 'x'){ renderWho(); return }
  if(k === 'back'){ pin = pin.slice(0, -1); pinErr = ''; renderPin(); return }
  if(pin.length >= 4) return;
  pin += k; pinErr = ''; renderPin();
  if(pin.length === 4){
    const ok = await login(pinFor, pin, false);
    if(!ok){ pin = ''; pinErr = 'Diese PIN stimmt nicht. Nochmals!'; renderPin() }
  }
}
document.addEventListener('keydown', e => { if(!kid && pinFor && $('#pinbox')){ if(/^[0-9]$/.test(e.key)) key(e.key); else if(e.key === 'Backspace') key('back') } });

async function login(name, p, silent){
  const { data, error } = await sb.rpc('kid_login', { p_name:name, p_pin:p });
  if(error || !data){
    if(silent){ ls.del('vk-kid'); kid = null; renderWho() }
    return false;
  }
  kid = { name:data.name, pin:p }; ls.set('vk-kid', kid);
  prog = { cards:data.cards || {}, stars:data.stars || 0, streak:data.streak || 0, lastDay:data.last_day || '' };
  // Falls auf diesem Gerät neuere, noch nicht gespeicherte Daten liegen
  const local = ls.get(progKey(), null);
  if(local && local.lastDay && (!prog.lastDay || local.lastDay > prog.lastDay)){ prog = local; unsaved = true; flush() }
  sel = new Set(ls.get('vk-sel-' + kid.name.toLowerCase(), []).filter(id => units.some(u => u.id === id)));
  const firstW = units.find(u => (u.words || []).length); if(!sel.size && firstW) sel.add(firstW.id);
  gameInfo = data.game || null;
  view = 'start'; sess = null; render();
  return true;
}
$('#logout').onclick = async () => { await flush(); ls.del('vk-kid'); kid = null; sess = null; renderWho() };

function showChrome(on){ $('#stats').hidden = !on; $('#tabs').hidden = !on || view === 'start'; if(on) $('#logout').textContent = kid.name + ' · Abmelden' }

/* ---------- Ansichten ---------- */
const TABS = { home:'#tab-home', gram:'#tab-gram', words:'#tab-words' };
$('#tab-start').onclick = () => setTab('start');
$('#brand').onclick = () => { if(kid) setTab('start') };
function setTab(t){ if(sess) endSession(); view = t; sess = null; for(const [k, id] of Object.entries(TABS)) $(id).setAttribute('aria-selected', k === t); render() }
for(const [k, id] of Object.entries(TABS)) $(id).onclick = () => setTab(k);

function render(){
  showChrome(true);
  $('#stars').textContent = prog.stars || 0;
  $('#streak').textContent = (prog.lastDay === today() || prog.lastDay === today(-1)) ? (prog.streak || 0) : 0;
  if(sess) return renderSess();
  view === 'start' ? renderStart() : view === 'words' ? renderWords() : view === 'gram' ? renderGram() : renderHome();
}

/* ---------- Startmenü: Üben oder eines der drei Spiele ---------- */
const TILE_ICONS = {
  learn:`<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="8" width="26" height="34" rx="4" fill="#ffd35a" stroke="#18202f" stroke-width="3" transform="rotate(-12 27 25)"/><rect x="24" y="8" width="26" height="34" rx="4" fill="#8fd3ff" stroke="#18202f" stroke-width="3" transform="rotate(8 37 25)"/><text x="38" y="32" font-family="Fredoka,sans-serif" font-weight="700" font-size="16" fill="#18202f" text-anchor="middle" transform="rotate(8 37 25)">é</text><rect x="8" y="32" width="48" height="24" rx="5" fill="#2747c4" stroke="#18202f" stroke-width="3"/><rect x="26" y="40" width="12" height="5" rx="2.5" fill="#fff"/></svg>`,
  run:`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 40 Q24 8 38 26" fill="none" stroke="#18202f" stroke-width="3" stroke-dasharray="1 6" stroke-linecap="round"/><rect x="4" y="44" width="20" height="8" rx="3" fill="#5fc4a0" stroke="#18202f" stroke-width="3"/><rect x="34" y="34" width="24" height="8" rx="3" fill="#5fc4a0" stroke="#18202f" stroke-width="3"/><circle cx="46" cy="20" r="7" fill="#f2b84b" stroke="#18202f" stroke-width="3"/><rect x="44.5" y="16" width="3" height="8" rx="1.5" fill="#fff3b0"/></svg>`,
  arena:`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 L54 14 V30 C54 44 44 53 32 58 C20 53 10 44 10 30 V14 Z" fill="#e86a6a" stroke="#18202f" stroke-width="3" stroke-linejoin="round"/><path d="M32 18 l4.5 9.2 10.1 1.4-7.3 7.1 1.7 10-9-4.7-9 4.7 1.7-10-7.3-7.1 10.1-1.4z" fill="#ffe27a" stroke="#18202f" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  bakery:`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 40 C6 24 18 16 32 16 C46 16 58 24 58 40 C58 46 52 48 46 48 H18 C12 48 6 46 6 40Z" fill="#f7c98f" stroke="#18202f" stroke-width="3"/><path d="M20 26 l4 10 M32 22 v12 M44 26 l-4 10" stroke="#c98a24" stroke-width="3.5" stroke-linecap="round"/><rect x="10" y="48" width="44" height="6" rx="3" fill="#b9a3e3" stroke="#18202f" stroke-width="3"/></svg>`
};
function renderStart(){
  const v = $('#view'), all = allWords(null), due = all.filter(x => isDue(x.key)).length;
  const g = gameInfo || {}, coins = g.coins || 0;
  const tile = (k, href, title, sub, extra) => `<${href ? `a href="${href}"` : 'button type="button" id="go-uebe"'} class="tile t-${k}"><span class="ticon">${TILE_ICONS[k]}</span><span class="ttext"><strong>${title}</strong><span>${sub}</span>${extra ? `<em>${extra}</em>` : ''}</span></${href ? 'a' : 'button'}>`;
  v.innerHTML = `<div class="stack-v">
    <div class="hello"><h2>Salut ${esc(kid.name)}!</h2><p>Was machst du heute?</p></div>
    <nav class="tiles" aria-label="Auswahl">
      ${tile('learn', '', 'Üben', 'Karteikasten, Grammatik und Wörter', all.length ? (due ? `${due} Karten sind heute dran` : 'Heute alles erledigt') : '')}
      ${tile('run', 'spiel.html?m=run', 'Wort-Sprung', 'Hüpf auf das richtige Wort', '')}
      ${tile('arena', 'spiel.html?m=arena', 'Wort-Arena', 'Besiege die Grummel-Monster', '')}
      ${tile('bakery', 'spiel.html?m=bakery', 'Bäckerei', 'Back jedes Wort richtig', '')}
    </nav>
    ${gameInfo ? `<p class="hint center">In den Spielen hast du <b>${coins}</b> Münzen gesammelt.</p>` : ''}
    ${units.some(isLdc) ? `<div class="center"><button class="ghost" id="go-klasse">${MIC} Ein Klassenwort vorschlagen</button></div>` : ''}
  </div>`;
  $('#go-uebe').onclick = () => setTab('home');
  const gk = $('#go-klasse'); if(gk) gk.onclick = () => { const l = units.filter(isLdc); suggForm = { unit: l[l.length - 1].id, kind:'word', fr:'', de:'', rec:{} }; setTab('words') };
}

function renderHome(){
  const v = $('#view');
  const wu = units.filter(u => (u.words || []).length);
  if(!wu.length){ v.innerHTML = `<div class="empty"><h2>Noch keine Wörter</h2><p>Die Eltern tragen die Wörter auf der Elternseite ein.</p></div>`; return }
  const ws = allWords(sel), counts = [0,0,0,0,0,0];
  ws.forEach(x => counts[boxOf(x.key)]++);
  const due = ws.filter(x => isDue(x.key)).length, max = Math.max(1, ...counts);
  v.innerHTML = `<div class="stack-v">
  <section><span class="label">Welche Unité?</span>
    ${byLevel(wu).map(([lv, us]) => `<div class="lvl"><span class="lvl-h">${esc(lv)}</span><div class="chips">${us.map(u => `<button class="chip" data-u="${esc(u.id)}" aria-pressed="${sel.has(u.id)}">${esc(u.title)}<span>${(u.words || []).length} Wörter</span></button>`).join('')}</div></div>`).join('')}
  </section>
  <section><span class="label">Dein Karteikasten</span>
    <div class="panel">
      <div class="faecher">${counts.map((c, i) => `<div class="fach" style="--c:var(--f${i})"><div class="fstack"><i style="height:${c ? Math.max(6, c / max * 100) : 0}%"></i></div><b>${c}</b><small>${FACH[i].n}<br>${FACH[i].d}</small></div>`).join('')}</div>
      <p class="hint">Richtig: Die Karte rutscht ein Fach weiter. Falsch: zurück in Fach 1. In Fach 5 sitzt das Wort.</p>
    </div>
  </section>
  <section class="settings">
    <div><span class="label">Richtung</span><div class="seg" id="dir">
      <button data-d="de-fr" aria-pressed="${dir === 'de-fr'}">Deutsch → Français</button>
      <button data-d="fr-de" aria-pressed="${dir === 'fr-de'}">Français → Deutsch</button></div></div>
    <div><span class="label">So übe ich</span><div class="seg" id="how">
      <button data-h="write" aria-pressed="${how === 'write'}">Schreiben</button>
      <button data-h="choice" aria-pressed="${how === 'choice'}">Auswählen</button>
      ${hasTTS ? `<button data-h="listen" aria-pressed="${how === 'listen'}">Hören</button>` : ''}</div></div>
  </section>
  <section><span class="label">Ganzes Ça roule wiederholen</span>
    <div class="review">${byLevel(wu).map(([lv, us]) => { const lvl = us[0].level || ''; const ids = new Set(us.map(u => u.id)), all = allWords(ids).length, pos = reviewPos(lvl);
      return `<div class="panel rv"><div><b>${esc(lv)}</b><span class="hint">${all} Wörter aus ${us.length} Unités · ohne Note</span></div>
        <div class="row"><button class="primary" data-rv="${esc(lvl)}">Kleine Etappe <small>15 Wörter gemischt</small></button>
        <button class="ghost" data-rvall="${esc(lvl)}">${pos > 0 && pos < all ? `Weiter bei Wort ${pos + 1} von ${all}` : 'Alle Wörter der Reihe nach'}</button></div></div>` }).join('')}</div>
  </section>
  ${(() => { const vl = byLevel(wu).map(([lv, us]) => [lv, us[0].level || '', verbsOf(units, us[0].level || '')]).filter(x => x[2].length);
    return vl.length ? `<section><span class="label">Verben konjugieren · Présent</span><div class="review">${vl.map(([lv, lvl, vs]) => `<div class="panel rv"><div><b>${esc(lv)}</b><span class="hint">${vs.length} Verben: ${vs.slice(0, 6).map(v => esc(v.inf)).join(', ')}${vs.length > 6 ? ' …' : ''}</span></div>
      <div class="row"><button class="primary" data-verbs="${esc(lvl)}">Verben üben <small>12 Formen</small></button><button class="ghost" data-spick="${esc(lvl)}">Spickzettel</button></div></div>`).join('')}</div></section>` : '' })()}
  <section class="actions">
    <button class="act" id="go-learn" ${ws.length ? '' : 'disabled'}><strong>Anschauen</strong><span>Karten umdrehen und anhören</span></button>
    <button class="act main" id="go-practice" ${ws.length ? '' : 'disabled'}><strong>Üben</strong><span>${due ? `${Math.min(due, 12)} Karten sind dran` : 'Heute alles erledigt – trotzdem üben'}</span></button>
    <button class="act" id="go-test" ${ws.length >= 4 ? '' : 'disabled'}><strong>Test</strong><span>${Math.min(10, ws.length)} Wörter mit Note</span></button>
  </section></div>`;
  v.querySelectorAll('.chip').forEach(b => b.onclick = () => { const id = b.dataset.u; sel.has(id) ? sel.delete(id) : sel.add(id); ls.set('vk-sel-' + kid.name.toLowerCase(), [...sel]); render() });
  v.querySelectorAll('#dir button').forEach(b => b.onclick = () => { dir = b.dataset.d; ls.set('vk-dir', dir); render() });
  v.querySelectorAll('#how button').forEach(b => b.onclick = () => { how = b.dataset.h; ls.set('vk-how', how); render() });
  v.querySelectorAll('[data-verbs]').forEach(b => b.onclick = () => startVerbs(b.dataset.verbs));
  v.querySelectorAll('[data-spick]').forEach(b => b.onclick = () => showSpick(b.dataset.spick));
  v.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => startReview(b.dataset.rv, false));
  v.querySelectorAll('[data-rvall]').forEach(b => b.onclick = () => startReview(b.dataset.rvall, true));
  $('#go-learn').onclick = () => start('learn'); $('#go-practice').onclick = () => start('practice'); $('#go-test').onclick = () => start('test');
}

/* ---------- Gesamtwiederholung pro Ça roule ---------- */
const reviewKey = lvl => 'vk-review-' + (kid?.name || '').toLowerCase() + '-' + lvl;
const reviewPos = lvl => ls.get(reviewKey(lvl), 0) || 0;
function startReview(lvl, inOrder){
  const us = units.filter(u => (u.level || '') === lvl && (u.words || []).length), ids = new Set(us.map(u => u.id));
  const ws = allWords(ids); if(!ws.length) return;
  let items, startAt = 0;
  if(inOrder){ items = ws; startAt = reviewPos(lvl); if(startAt >= ws.length) startAt = 0 }
  else { // kleine Etappe: schwächere Wörter häufiger, aber aus allen Unités gemischt
    const w = x => 6 - Math.min(5, boxOf(x.key)) + Math.random() * 3;
    items = shuffle(ws.slice().sort((a, b) => w(b) - w(a)).slice(0, 40)).slice(0, 15);
  }
  const now = Date.now();
  sess = { kind: inOrder ? 'reviewall' : 'review', lvl, how: how === 'listen' && !hasTTS ? 'write' : how, dir, items, i:startAt, startAt, res:[], requeued:new Set(), answered:null, flip:false, pool:ws,
           units:[...ids], startedAt:new Date(now).toISOString(), last:now, secs:0, steps:0, logged:false };
  preloadSpeech(items.slice(startAt, startAt + 20).flatMap(x => [x.w.fr]));
  render(); window.scrollTo({ top:0 });
}

/* ---------- Verben konjugieren ---------- */
const bareForm = (form, i) => form.replace(/^(je |j’|tu |il |elle |on |nous |vous |ils |elles )/, '');
function verbTable(v, mark = -1){
  return `<table class="vtab">${[0, 1, 2, 3, 4, 5].map(i => { const f = verbForm(v.inf, v.refl, i, false), b = bareForm(f), pre = f.slice(0, f.length - b.length);
    const st = IRREG[v.inf] ? b : b.slice(0, b.length - ENDS_ER[i].length);
    return `<tr class="${i === mark ? 'on' : ''}"><td>${esc(pre.trim())}</td><td>${IRREG[v.inf] ? `<b>${esc(b)}</b>` : `${esc(st)}<b>${esc(b.slice(st.length))}</b>`}</td><td class="hint">${esc(PRON_DE[i])}</td></tr>` }).join('')}</table>`;
}
function showSpick(lvl){
  const vs = verbsOf(units, lvl), reg = vs.filter(v => !IRREG[v.inf]), irr = vs.filter(v => IRREG[v.inf]);
  const ex = reg.find(v => v.inf === 'raconter') || reg[0];
  $('#view').innerHTML = `<div class="stack-v"><div class="sesshead"><span class="label">Spickzettel · Présent</span><button class="ghost" id="back">Zurück</button></div>
    <div class="panel"><h2>Verben auf -er</h2><p>Nimm den Stamm (ohne <b>-er</b>) und hänge die Endung an: <b>-e, -es, -e, -ons, -ez, -ent</b>. Vor einem Vokal wird <b>je</b> zu <b>j’</b>.</p>
      ${ex ? `<p class="hint">Beispiel: ${esc(ex.inf)} (${esc(ex.de)})</p>${verbTable(ex)}` : ''}
      ${reg.length > 1 ? `<p class="hint">Genau so: ${reg.filter(v => v !== ex).map(v => esc(v.inf)).join(', ')}</p>` : ''}</div>
    ${irr.map(v => `<div class="panel"><h2>${esc(v.inf)} <small class="hint">${esc(v.de)} · unregelmässig</small></h2>${verbTable(v)}</div>`).join('')}</div>`;
  $('#back').onclick = () => render();
}
function startVerbs(lvl){
  const vs = verbsOf(units, lvl); if(!vs.length) return;
  const all = vs.flatMap(v => [0, 1, 2, 3, 4, 5].map(i => { const alt = (i === 2 || i === 5) && Math.random() < .5, form = verbForm(v.inf, v.refl, i, alt);
    return { v, i, alt, form, key: 'verb|' + v.inf + '|' + i, w: { fr: form, de: v.inf + ' · ' + (alt ? PRON_FR2 : PRON_FR)[i] } } }));
  const due = all.filter(x => isDue(x.key)), pool = (due.length >= 6 ? due : all).sort((a, b) => boxOf(a.key) - boxOf(b.key) || Math.random() - .5);
  const items = shuffle(pool.slice(0, 24)).slice(0, 12), now = Date.now();
  sess = { kind:'verbs', lvl, items, i:0, res:[], requeued:new Set(), answered:null, units:[...new Set(vs.map(v => v.unit))], startedAt:new Date(now).toISOString(), last:now, secs:0, steps:0, logged:false };
  preloadSpeech(items.map(x => x.form));
  render(); window.scrollTo({ top:0 });
}
function renderVerbQ(head){
  const v = $('#view'), s = sess, it = s.items[s.i], a = s.answered, pron = (it.alt ? PRON_FR2 : PRON_FR)[it.i], pre = it.form.slice(0, it.form.length - bareForm(it.form).length);
  const T = a && { ok:['Richtig!', ''], accent:['Fast richtig!', 'Achte auf die Akzente.'], wrong:['Leider falsch.', 'So heisst es:'] }[a.r];
  v.innerHTML = `<div class="stack-v" style="gap:16px">${head}<div class="qcard">
    <span class="qlang">Setze das Verb in die richtige Form</span>
    <span class="qword">${esc(it.v.inf)}</span><span class="hint">${esc(it.v.de)}${IRREG[it.v.inf] ? ' · unregelmässig' : ''}</span>
    <form class="answer verbform" id="f" autocomplete="off"><span class="pron">${esc(pre.trim() || pron)}</span><input id="inp" aria-label="Verbform" autocapitalize="off" autocorrect="off" spellcheck="false" ${a ? 'readonly' : ''} value="${esc(a ? a.input : '')}">
      ${a ? '' : `<div class="accents">${ACC.map(c => `<button type="button" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div><button class="primary" type="submit">Prüfen</button>`}</form>
    ${a ? `<div class="fb ${a.r}"><h3>${T[0]}</h3>${T[1] ? `<p>${T[1]}</p>` : ''}<p class="sol">${hasTTS ? `<button class="mini" id="saysol" aria-label="Anhören">${SPK}</button>` : ''}${esc(it.form)}</p>${verbTable(it.v, it.i)}<button class="primary" id="next">${s.i === s.items.length - 1 ? 'Zum Resultat' : 'Weiter'}</button></div>` : ''}
  </div></div>`;
  $('#stop').onclick = () => { s.i = s.items.length; render() };
  if(!a){
    const inp = $('#inp'); inp.focus();
    v.querySelectorAll('.accents button').forEach(b => b.onclick = () => { const p = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, p) + b.dataset.c + inp.value.slice(p); inp.focus(); inp.setSelectionRange(p + 1, p + 1) });
    $('#f').onsubmit = e => { e.preventDefault(); const val = inp.value.trim(); if(!val) return;
      const full = pre + val, c1 = check(full, it.form), c2 = check(val, it.form), c = c1.r === 'ok' || c2.r === 'ok' ? { r:'ok' } : c1.r === 'accent' || c2.r === 'accent' ? { r:'accent' } : { r:'wrong' };
      verbAnswer(val, c) };
  } else {
    $('#next').onclick = () => { s.answered = null; s.i++; render() }; $('#next').focus();
    const ss = $('#saysol'); if(ss) ss.onclick = () => speak(it.form);
    if(a.r !== 'wrong' && hasTTS && !s.said){ s.said = true; speak(it.form) }
  }
}
function verbAnswer(input, c){
  const s = sess, it = s.items[s.i]; tick(); s.answered = { input, ...c }; s.said = false;
  s.res.push({ it, r:c.r, input });
  const right = c.r === 'ok' || c.r === 'accent'; if(right) prog.stars = (prog.stars || 0) + 1;
  const cur = prog.cards[it.key] || { box:0, due:today() }; let box = cur.box || 0;
  box = right ? (box === 0 ? 2 : Math.min(5, box + 1)) : 1;
  prog.cards[it.key] = { box, due: today(right ? (cur.box === 5 ? 30 : NEXT[box]) : 1) };
  if(!right && !s.requeued.has(it.key)){ s.requeued.add(it.key); s.items.push(it) }
  touchDay(); saveProg(); render();
}

/* ---------- Runde ---------- */
function start(kind){
  if(kind === 'grammar') return startGram();
  const ws = allWords(sel); let items;
  if(kind === 'practice'){
    const due = ws.filter(x => isDue(x.key)).sort((a, b) => boxOf(a.key) - boxOf(b.key) || Math.random() - .5);
    items = shuffle(due.length ? due.slice(0, 12) : shuffle(ws.slice()).slice(0, 10));
  } else if(kind === 'test') items = shuffle(ws.slice()).slice(0, 10);
  else items = ws.slice();
  const now = Date.now();
  sess = { kind, how: kind === 'test' && how === 'choice' ? 'write' : how, dir, items, i:0, res:[], requeued:new Set(), answered:null, flip:false, pool:ws,
           units:[...sel], startedAt:new Date(now).toISOString(), last:now, secs:0, steps:0, logged:false };
  preloadSpeech(items.flatMap(x => [x.w.fr, x.w.ex]));
  render(); window.scrollTo({ top:0 });
}
function tick(){ const now = Date.now(); sess.secs += Math.min(IDLE_CAP, (now - sess.last) / 1000); sess.last = now; sess.steps++ }
async function endSession(){
  const s = sess; if(!s || s.logged || !kid) return; s.logged = true;
  if(!s.steps) return;
  const good = s.res.filter(r => r.r === 'ok' || r.r === 'accent').length;
  const { error } = await sb.rpc('kid_log', { p_name:kid.name, p_pin:kid.pin, p_kind:s.kind, p_units:s.units, p_answers:s.res.length, p_correct:good, p_seconds:Math.round(s.secs), p_started:s.startedAt });
  if(error){ console.error(error); toast('Übungszeit nicht gespeichert: ' + error.message) }
  flush();
}
function q(){ const it = sess.items[sess.i]; const fr = sess.how === 'listen' || sess.dir === 'de-fr'; return { it, ask: fr ? it.w.de : it.w.fr, target: fr ? it.w.fr : it.w.de, frAnswer: fr } }

function renderSess(){
  const v = $('#view'), s = sess, n = s.items.length;
  if(s.i >= n) return renderResult();
  const head = `<div class="sesshead"><span class="label">${({ learn:'Anschauen', test:'Test', grammar:'Grammatik', review:'Wiederholung', reviewall:'Alle Wörter', verbs:'Verben' })[s.kind] || 'Üben'} · ${s.i + 1} / ${n}</span><button class="ghost" id="stop">${s.kind === 'reviewall' ? 'Pause' : 'Beenden'}</button></div><div class="bar"><i style="width:${s.i / n * 100}%"></i></div>`;
  if(s.kind === 'grammar') return renderGramQ(head);
  if(s.kind === 'verbs') return renderVerbQ(head);
  const { it, ask, target, frAnswer } = q();
  if(s.kind === 'learn'){
    v.innerHTML = `<div class="stack-v" style="gap:16px">${head}<div class="qcard">
      <button class="flip ${s.flip ? 'on' : ''}" id="flip" aria-label="Karte umdrehen"><div class="in">
        <div class="side"><span class="qlang">${s.dir === 'de-fr' ? 'Deutsch' : 'Français'}</span><span class="qword">${esc(s.dir === 'de-fr' ? it.w.de : it.w.fr)}</span><span class="hint">Tippen zum Umdrehen</span></div>
        <div class="side back"><span class="qlang">${s.dir === 'de-fr' ? 'Français' : 'Deutsch'}</span><span class="qword">${esc(s.dir === 'de-fr' ? it.w.fr : it.w.de)}</span>${it.w.ex ? `<span class="ex">${esc(it.w.ex)}</span>` : ''}</div>
      </div></button>
      <div class="navrow"><button class="ghost" id="prev" ${s.i ? '' : 'disabled'}>‹ Zurück</button>${hasTTS ? `<button class="speak" id="say" aria-label="Französisch anhören">${SPK}</button><button class="speak de" id="sayde" aria-label="Deutsch anhören">${DE_SPK}</button>` : ''}${ownOf(it.w.fr) ? `<button class="speak de" id="sayown" aria-label="Unsere Stimme">${MIC}<b>${esc(ownOf(it.w.fr).kid_name || 'Wir')}</b></button>` : ''}<button class="primary" id="next">${s.i === n - 1 ? 'Fertig' : 'Weiter ›'}</button></div>
    </div></div>`;
    $('#flip').onclick = () => { s.flip = !s.flip; $('#flip').classList.toggle('on', s.flip) };
    $('#prev').onclick = () => { s.i--; s.flip = false; render() };
    $('#next').onclick = () => { tick(); s.i++; s.flip = false; render() };
    if(hasTTS){ $('#say').onclick = () => speak(it.w.fr); $('#sayde').onclick = () => speakDe(it.w.de) }
    const so = $('#sayown'); if(so) so.onclick = () => playOwn(it.w.fr);
    $('#stop').onclick = () => { s.i = s.items.length; render() };
    return;
  }
  const a = s.answered;
  let prompt;
  if(s.how === 'listen') prompt = `<span class="qlang">Hör zu und schreib auf Französisch</span><button class="speak big" id="say" aria-label="Nochmals anhören">${SPK}</button>`;
  else prompt = `<span class="qlang">${frAnswer ? 'Wie heisst das auf Französisch?' : 'Was heisst das auf Deutsch?'}</span><span class="qword">${esc(ask)}</span>${!frAnswer && hasTTS ? `<button class="speak" id="say" aria-label="Anhören">${SPK}</button>` : ''}${frAnswer && hasTTS ? `<button class="speak de" id="sayde" aria-label="Auf Deutsch anhören">${DE_SPK}</button>` : ''}`;
  let body = '';
  if(s.how === 'choice'){
    if(!s.opts){ const others = shuffle(s.pool.map(x => frAnswer ? x.w.fr : x.w.de).filter(t => t !== target)); s.opts = shuffle([target, ...[...new Set(others)].slice(0, 3)]) }
    body = `<div class="choices">${s.opts.map((o, i) => `<button data-o="${i}" ${a ? 'disabled' : ''} class="${a ? (o === target ? 'right' : (a.input === o ? 'wrong' : '')) : ''}">${esc(o)}</button>`).join('')}</div>`;
  } else {
    body = `<form class="answer" id="f" autocomplete="off"><input id="inp" aria-label="Antwort" autocapitalize="off" autocorrect="off" spellcheck="false" ${a ? 'readonly' : ''} value="${esc(a ? a.input : '')}">
      ${frAnswer && !a ? `<div class="accents">${ACC.map(c => `<button type="button" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      ${a ? '' : '<button class="primary" type="submit">Prüfen</button>'}</form>`;
  }
  let fb = '';
  if(a){
    const T = { ok:['Richtig!',''], accent:['Fast richtig!', `Achte auf die Akzente: <b>${esc(accentDiff(a.input, a.t))}</b>`], article:['Fast! Der Artikel fehlt.', 'Lerne das Wort immer mit le, la oder l\''], wrong:['Leider falsch.','Richtig ist:'] }[a.r];
    fb = `<div class="fb ${a.r}"><h3>${T[0]}</h3>${T[1] ? `<p>${T[1]}</p>` : ''}${a.r !== 'ok' ? `<p class="sol">${esc(target)}</p>` : ''}${s.how === 'listen' ? `<p>Auf Deutsch: ${esc(it.w.de)}</p>` : ''}${it.w.ex ? `<p class="ex">${hasTTS ? `<button class="mini" id="sayex" aria-label="Beispielsatz anhören">${SPK}</button>` : ''}${esc(it.w.ex)}</p>` : ''}<button class="primary" id="next">${s.i === n - 1 ? 'Zum Resultat' : 'Weiter'}</button></div>`;
  }
  v.innerHTML = `<div class="stack-v" style="gap:16px">${head}<div class="qcard">${prompt}${body}${fb}</div></div>`;
  $('#stop').onclick = () => { s.i = s.items.length; render() };
  const say = $('#say'); if(say) say.onclick = () => speak(it.w.fr);
  const sx = $('#sayex'); if(sx) sx.onclick = () => speak(it.w.ex);
  const sd = $('#sayde'); if(sd) sd.onclick = () => speakDe(it.w.de);
  if(s.how === 'listen' && !a && !s.spoken){ s.spoken = true; setTimeout(() => speak(it.w.fr), 250) }
  if(s.how === 'choice' && !a) v.querySelectorAll('.choices button').forEach(b => b.onclick = () => { const o = s.opts[+b.dataset.o]; answer(o, o === target ? { r:'ok', t:target } : { r:'wrong', t:target }) });
  if(s.how !== 'choice' && !a){
    const inp = $('#inp'); inp.focus();
    v.querySelectorAll('.accents button').forEach(b => b.onclick = () => { const p = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, p) + b.dataset.c + inp.value.slice(inp.selectionEnd ?? p); inp.focus(); inp.setSelectionRange(p + 1, p + 1) });
    $('#f').onsubmit = e => { e.preventDefault(); if(!inp.value.trim()){ inp.focus(); return } answer(inp.value, check(inp.value, target)) };
  }
  const nx = $('#next'); if(nx){ nx.focus(); nx.onclick = () => { s.i++; s.answered = null; s.opts = null; s.spoken = false; render() } }
}

function answer(input, c){
  const s = sess, { it } = q(); tick(); s.answered = { input, ...c };
  s.res.push({ it, r:c.r, input });
  if(c.r === 'ok' || c.r === 'accent') prog.stars = (prog.stars || 0) + 1;
  if(s.kind === 'practice' || s.kind === 'review' || s.kind === 'reviewall'){
    const k = it.key, cur = prog.cards[k] || { box:0, due:today() };
    const right = c.r === 'ok' || c.r === 'accent';
    let box = cur.box || 0;
    if(right) box = cur.box === 0 ? 2 : Math.min(5, box + 1);
    else if(c.r === 'article') box = Math.max(1, box);
    else box = 1;
    prog.cards[k] = { box, due: today(right ? (cur.box === 5 ? 30 : NEXT[box]) : 1) };
    if(!right && !s.requeued.has(k) && s.kind !== 'reviewall'){ s.requeued.add(k); s.items.push(it) }
    if(s.kind === 'reviewall') ls.set(reviewKey(s.lvl), s.i + 1);
  }
  touchDay(); saveProg(); render();
}

function renderResult(){
  const s = sess, n = s.res.length;
  endSession();
  if(s.kind === 'learn'){
    $('#view').innerHTML = `<div class="result"><h2>Gut angeschaut!</h2><p>Jetzt bei «Üben» zeigen, was du dir gemerkt hast.</p><div class="row"><button class="primary" id="home">Zum Karteikasten</button><button class="ghost" id="tostart">Zum Start</button></div></div>`;
    $('#home').onclick = () => { sess = null; render() }; $('#tostart').onclick = () => setTab('start'); return;
  }
  if(s.kind === 'reviewall'){
    const total = s.items.length, pos = Math.min(total, reviewPos(s.lvl)), fin = pos >= total;
    if(fin) ls.set(reviewKey(s.lvl), 0);
    const g = s.res.filter(r => r.r === 'ok' || r.r === 'accent').length;
    $('#view').innerHTML = `<div class="result"><h2>${fin ? 'Geschafft! Alle Wörter von ' + esc(LEVELS[s.lvl] || s.lvl) + ' wiederholt.' : 'Pause. Gut gemacht!'}</h2>
      <p>${fin ? 'Das war richtig viel. Bravo!' : `Du bist bei Wort ${pos} von ${total}. Nächstes Mal geht es dort weiter.`}</p>
      <div class="big3"><div><b>${g}</b><span>richtig in dieser Runde</span></div><div><b>${s.res.length - g}</b><span>kommen in den Karteikasten</span></div></div>
      <div class="row">${fin ? '' : '<button class="primary" id="more">Weitermachen</button>'}<button class="ghost" id="home">Zum Karteikasten</button><button class="ghost" id="tostart">Zum Start</button></div></div>`;
    $('#home').onclick = () => { sess = null; render() }; $('#tostart').onclick = () => setTab('start');
    const mo = $('#more'); if(mo) mo.onclick = () => startReview(s.lvl, true);
    return;
  }
  const good = s.res.filter(r => r.r === 'ok' || r.r === 'accent').length, half = s.res.filter(r => r.r === 'article').length;
  const wrong = s.res.filter(r => r.r !== 'ok' && r.r !== 'accent');
  let extra = '';
  if(s.kind === 'test' && n){ const pts = good + half * .5; const note = Math.round((1 + 5 * pts / n) * 2) / 2; extra = `<div><b>${note.toFixed(1)}</b><span>Note (${pts} von ${n} Punkten)</span></div>` }
  const msg = !n ? 'Keine Antworten in dieser Runde.' : good === n ? 'Super, alles gewusst! Très bien!' : good / n >= .7 ? 'Gut gemacht! Bien joué!' : 'Dranbleiben – morgen sitzt es besser.';
  $('#view').innerHTML = `<div class="result"><h2>${msg}</h2>
    <div class="big3"><div><b>${good}</b><span>richtig</span></div><div><b>${wrong.length}</b><span>${s.kind === 'practice' || s.kind === 'review' ? 'nochmals üben' : 'falsch oder fast'}</span></div>${extra}</div>
    ${wrong.length ? `<span class="label">Diese Wörter nochmals anschauen</span><div class="tw"><table><thead><tr><th>Deutsch</th><th>Français</th><th>Deine Antwort</th></tr></thead><tbody>${wrong.map(r => `<tr><td>${esc(r.it.w.de)}</td><td><b>${esc(r.it.w.fr)}</b></td><td>${esc(r.input)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="row"><button class="primary" id="home">Zum Karteikasten</button><button class="ghost" id="tostart">Zum Start</button><button class="ghost" id="more">Nochmals</button></div></div>`;
  $('#home').onclick = () => { sess = null; render() }; $('#tostart').onclick = () => setTab('start');
  $('#more').onclick = () => s.kind === 'review' ? startReview(s.lvl, false) : s.kind === 'verbs' ? startVerbs(s.lvl) : start(s.kind);
}


/* ---------- Grammatik ---------- */
const gUnits = () => units.filter(u => u.grammar && (u.grammar.rules?.length || u.grammar.tasks?.length));
const filled = t => t.t === 'l' ? (t.say === t.a ? t.say : t.say + ' → ' + t.a) : t.q.includes('___') ? t.q.replace('___', t.a) : t.a;
const blank = q => esc(q).replace('___', '<span class="blank">?</span>');

function renderGram(){
  const v = $('#view'), gu = gUnits();
  if(!gu.length){ v.innerHTML = `<div class="empty"><h2>Noch keine Grammatik</h2><p>Die Eltern tragen die Grammatik pro Unité ein.</p></div>`; return }
  if(!gu.some(u => u.id === gUnit)) gUnit = gu[0].id;
  const u = gu.find(x => x.id === gUnit), g = u.grammar, n = (g.tasks || []).length;
  v.innerHTML = `<div class="stack-v">
    <section><span class="label">Welche Unité?</span>
      ${byLevel(gu).map(([lv, us]) => `<div class="lvl"><span class="lvl-h">${esc(lv)}</span><div class="chips">${us.map(x => `<button class="chip" data-g="${esc(x.id)}" aria-pressed="${x.id === gUnit}">${esc(x.title)}<span>${(x.grammar.rules || []).map(r => esc(r.h)).join(' · ')}</span></button>`).join('')}</div></div>`).join('')}
    </section>
    ${(g.rules || []).map(r => `<article class="panel rule"><h2>${esc(r.h)}</h2><p>${esc(r.text)}</p>
      ${r.ex?.length ? `<div class="tw"><table><tbody>${r.ex.map(([fr, de]) => `<tr><td>${hasTTS ? `<button class="mini" data-say="${esc(fr.replace(/[→·]/g, ','))}" aria-label="Anhören">${SPK}</button>` : ''}<b>${esc(fr)}</b></td><td>${esc(de)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${r.more ? `<p class="hint">${esc(r.more)}</p>` : ''}</article>`).join('')}
    ${n ? `<section class="actions" style="grid-template-columns:1fr"><button class="act main" id="go-gram"><strong>Grammatik üben</strong><span>${Math.min(10, n)} Aufgaben zu ${esc(uname(u))}</span></button></section>` : ''}
  </div>`;
  v.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { gUnit = b.dataset.g; ls.set('vk-gunit', gUnit); render() });
  v.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
  const go = $('#go-gram'); if(go) go.onclick = () => start('grammar');
}

function startGram(){
  const u = gUnits().find(x => x.id === gUnit); if(!u) return;
  const items = shuffle((u.grammar.tasks || []).filter(t => hasTTS || t.t !== 'l')).slice(0, 10).map(t => ({ g:t, w:{ fr:filled(t), de:t.de || '' }, key:'g|' + u.id }));
  const now = Date.now();
  preloadSpeech(items.flatMap(x => [x.w.fr, x.g.say]));
  sess = { kind:'grammar', items, i:0, res:[], requeued:new Set(), answered:null, units:[u.id], startedAt:new Date(now).toISOString(), last:now, secs:0, steps:0, logged:false };
  render(); window.scrollTo({ top:0 });
}

function renderGramQ(head){
  const v = $('#view'), s = sess, n = s.items.length, it = s.items[s.i], t = it.g, a = s.answered;
  const prompt = t.t === 'l'
    ? `<span class="qlang">Hör gut zu</span><button class="speak big" id="sayq" aria-label="Nochmals anhören">${SPK}</button>`
    : t.t === 'w'
    ? `<span class="qlang">Schreib die richtige Form</span><span class="qword">${esc(t.q)}</span>`
    : `<span class="qlang">Was passt?</span><span class="qword">${blank(t.q)}</span>`;
  const write = t.t === 'w' || (t.t === 'l' && !t.choices);
  const hint = t.de ? `<p class="hint">${esc(t.de)}</p>` : '';
  let body;
  if(write){
    body = `<form class="answer" id="f" autocomplete="off"><input id="inp" aria-label="Antwort" autocapitalize="off" autocorrect="off" spellcheck="false" ${a ? 'readonly' : ''} value="${esc(a ? a.input : '')}">
      ${!a && !/^[0-9]+$/.test(t.a) ? `<div class="accents">${ACC.map(c => `<button type="button" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}${!a ? '<button class="primary" type="submit">Prüfen</button>' : ''}</form>`;
  } else {
    body = `<div class="choices">${t.choices.map((o, i) => `<button data-o="${i}" ${a ? 'disabled' : ''} class="${a ? (o === t.a ? 'right' : (a.input === o ? 'wrong' : '')) : ''}">${esc(o.trim())}</button>`).join('')}</div>`;
  }
  let fb = '';
  if(a){
    const T = { ok:'Richtig!', accent:'Fast richtig! Achte auf die Akzente.', article:'Fast!', wrong:'Leider falsch.' }[a.r];
    fb = `<div class="fb ${a.r}"><h3>${T}</h3><p class="sol">${hasTTS ? `<button class="mini" id="saysol" aria-label="Anhören">${SPK}</button>` : ''}${esc(it.w.fr)}</p>${t.de ? `<p>${esc(t.de)}</p>` : ''}<button class="primary" id="next">${s.i === n - 1 ? 'Zum Resultat' : 'Weiter'}</button></div>`;
  }
  v.innerHTML = `<div class="stack-v" style="gap:16px">${head}<div class="qcard">${prompt}${a ? '' : hint}${body}${fb}</div></div>`;
  $('#stop').onclick = () => { s.i = s.items.length; render() };
  const ss = $('#saysol'); if(ss) ss.onclick = () => speak(t.t === 'l' ? t.say : it.w.fr);
  const sq = $('#sayq'); if(sq) sq.onclick = () => speak(t.say);
  if(t.t === 'l' && !a && !s.spoken){ s.spoken = true; setTimeout(() => speak(t.say), 250) }
  if(!a && write){
    const inp = $('#inp'); if(/^[0-9]+$/.test(t.a)) inp.inputMode = 'numeric'; inp.focus();
    v.querySelectorAll('.accents button').forEach(b => b.onclick = () => { const p = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, p) + b.dataset.c + inp.value.slice(inp.selectionEnd ?? p); inp.focus(); inp.setSelectionRange(p + 1, p + 1) });
    $('#f').onsubmit = e => { e.preventDefault(); if(!inp.value.trim()){ inp.focus(); return } const c = check(inp.value, t.a); answer(inp.value, c.r === 'article' ? { r:'wrong', t:t.a } : c) };
  }
  if(!a && !write) v.querySelectorAll('.choices button').forEach(b => b.onclick = () => { const o = t.choices[+b.dataset.o]; answer(o, o === t.a ? { r:'ok', t:t.a } : { r:'wrong', t:t.a }) });
  const nx = $('#next'); if(nx){ nx.focus(); nx.onclick = () => { s.i++; s.answered = null; s.spoken = false; render() } }
}

/* ---------- Wörter (nur anschauen) ---------- */
/* ---------- Wörterliste und Klassenwörter ---------- */
const isLdc = u => /^langage de classe/i.test(u.title || '');
let mySugg = null, suggForm = null; // suggForm: { unit, kind, fr, de, rec:{ fr:{blob,url}, de:{blob,url} } }
async function loadMySugg(){ const { data, error } = await sb.rpc('kid_suggestions', { p_name:kid.name, p_pin:kid.pin }); mySugg = error ? [] : (data || []); if(view === 'words' && !sess) render() }
function renderWords(){
  const v = $('#view');
  const wu = units.filter(u => (u.words || []).length);
  if(!wu.length){ v.innerHTML = `<div class="empty"><p>Noch keine Wörter eingetragen.</p></div>`; return }
  if(mySugg === null){ mySugg = []; loadMySugg() }
  const ldc = units.filter(isLdc);
  const ownBtns = t => { const o = ownOf(t); return o ? `<button class="mini own" data-own="${esc(t)}" aria-label="Unsere Stimme: ${esc(o.kid_name || '')}">${MIC}<span>${esc(o.kid_name || 'Wir')}</span></button>` : '' };
  const ST = { pending:['wartet auf Freigabe', ''], approved:['freigegeben', 'ok'], rejected:['nicht übernommen', 'bad'] };
  v.innerHTML = `<div class="stack-v" style="gap:14px">
    ${ldc.length ? `<div class="panel klasse"><div class="row" style="justify-content:space-between"><h2>Klassenwörter</h2>${suggForm ? '' : '<button class="primary" id="sugg-new">Neues Wort vorschlagen</button>'}</div>
      <p class="hint">Du kennst ein Wort aus dem Französisch-Unterricht, das noch fehlt? Schlag es vor und sprich es selbst ein. Wenn die Eltern es freigeben, können alle Kinder damit üben.</p>
      ${suggForm ? suggFormHTML(ldc) : ''}
      ${mySugg && mySugg.length ? `<span class="label">Deine Vorschläge</span><ul class="sugg">${mySugg.map(x => `<li><b>${esc(x.fr)}</b>${x.de ? ' · ' + esc(x.de) : ''}${x.kind === 'rec' ? ' <small class="hint">(Aufnahme)</small>' : ''}<span class="tag ${ST[x.status]?.[1] || ''}">${ST[x.status]?.[0] || esc(x.status)}</span></li>`).join('')}</ul>` : ''}
    </div>` : ''}
    ${wu.map(u => `<details class="unit" ${sel.has(u.id) || (isLdc(u) && suggForm) ? 'open' : ''}><summary>${esc(uname(u))} <small>${(u.words || []).length} Wörter</small></summary><div class="body">
    <div class="tw"><table><thead><tr><th>Français</th><th>Deutsch</th><th>Fach</th></tr></thead><tbody>
    ${(u.words || []).map(w => { const b = boxOf(u.id + '|' + w.fr); return `<tr><td><span class="sayrow">${hasTTS ? `<button class="mini" data-say="${esc(w.fr)}" aria-label="Anhören">${SPK}</button>` : ''}${ownBtns(w.fr)}</span><b>${esc(w.fr)}</b>${w.ex ? `<br><span class="ex">${esc(w.ex)}</span>` : ''}</td>
      <td><span class="sayrow">${hasTTS ? `<button class="mini de" data-sayde="${esc(w.de)}" aria-label="Deutsch anhören">${DE_SPK}</button>` : ''}${ownBtns('de:' + w.de)}</span>${esc(w.de)}${isLdc(u) ? `<br><button class="ghost small" data-recfor="${esc(u.id)}" data-fr="${esc(w.fr)}" data-de="${esc(w.de)}">${MIC} Selbst aufnehmen</button>` : ''}</td>
      <td><span class="dot" style="${b ? `background:var(--f${b})` : ''}">${b || 'neu'}</span></td></tr>` }).join('')}
    </tbody></table></div></div></details>`).join('')}</div>`;
  v.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
  v.querySelectorAll('[data-sayde]').forEach(b => b.onclick = () => speakDe(b.dataset.sayde));
  v.querySelectorAll('[data-own]').forEach(b => b.onclick = () => playOwn(b.dataset.own));
  const nb = $('#sugg-new'); if(nb) nb.onclick = () => { suggForm = { unit: ldc[ldc.length - 1].id, kind:'word', fr:'', de:'', rec:{} }; render(); const f = $('#sg-fr'); if(f) f.focus() };
  v.querySelectorAll('[data-recfor]').forEach(b => b.onclick = () => { suggForm = { unit: b.dataset.recfor, kind:'rec', fr: b.dataset.fr, de: b.dataset.de, rec:{} }; render(); window.scrollTo({ top:0, behavior:'smooth' }) });
  if(suggForm) wireSuggForm(ldc);
}
function suggFormHTML(ldc){
  const f = suggForm, ro = f.kind === 'rec' ? 'readonly' : '';
  const recBtn = lang => { const r = f.rec[lang]; return `<div class="recbox"><button type="button" class="ghost rec ${recording === lang ? 'on' : ''}" data-rec="${lang}">${MIC} ${recording === lang ? 'Stopp' : r ? 'Nochmals aufnehmen' : lang === 'fr' ? 'Französisch einsprechen' : 'Deutsch einsprechen'}</button>${r ? `<button type="button" class="mini" data-playrec="${lang}" aria-label="Anhören">${SPK}</button><button type="button" class="ghost small" data-delrec="${lang}">Löschen</button>` : ''}</div>` };
  return `<form class="suggform" id="sg" autocomplete="off">
    ${f.kind === 'rec' ? `<p><b>Aufnahme für:</b> ${esc(f.fr)} · ${esc(f.de)}</p>` : `<label class="label">Für<select class="field" id="sg-unit">${ldc.map(u => `<option value="${esc(u.id)}" ${u.id === f.unit ? 'selected' : ''}>${esc(uname(u))}</option>`).join('')}</select></label>`}
    <div class="sg2"><label class="label">Französisch<input class="field" id="sg-fr" ${ro} maxlength="80" value="${esc(f.fr)}" placeholder="z. B. Ouvrez vos livres." autocapitalize="off" spellcheck="false"></label>${recBtn('fr')}</div>
    <div class="sg2"><label class="label">Deutsch<input class="field" id="sg-de" ${ro} maxlength="80" value="${esc(f.de)}" placeholder="z. B. Öffnet eure Bücher."></label>${recBtn('de')}</div>
    ${f.kind === 'rec' ? '' : `<div class="accents">${ACC.map(c => `<button type="button" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>`}
    <p class="hint">Die Aufnahmen sind freiwillig. Sprich nah ans Gerät, höchstens 5 Sekunden.</p>
    <p class="error" id="sg-err"></p>
    <div class="row"><button class="primary" type="submit" id="sg-send">Vorschlag schicken</button><button class="ghost" type="button" id="sg-cancel">Abbrechen</button></div></form>`;
}
let recording = null, recMR = null, recTimer = null;
function wireSuggForm(ldc){
  const f = suggForm, fr = $('#sg-fr'), de = $('#sg-de');
  const keep = () => { if(f.kind !== 'rec'){ f.fr = fr.value; f.de = de.value; const u = $('#sg-unit'); if(u) f.unit = u.value } };
  [fr, de].forEach(i => i.oninput = keep); const us = $('#sg-unit'); if(us) us.onchange = keep;
  let lastIn = fr; [fr, de].forEach(i => i.onfocus = () => lastIn = i);
  document.querySelectorAll('#sg .accents button').forEach(b => b.onclick = () => { const i = lastIn, p = i.selectionStart ?? i.value.length; i.value = i.value.slice(0, p) + b.dataset.c + i.value.slice(p); keep(); i.focus(); i.setSelectionRange(p + 1, p + 1) });
  document.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => { keep(); toggleRec(b.dataset.rec) });
  document.querySelectorAll('[data-playrec]').forEach(b => b.onclick = () => { const r = f.rec[b.dataset.playrec]; if(r){ stopSpeech(); new Audio(r.url).play() } });
  document.querySelectorAll('[data-delrec]').forEach(b => b.onclick = () => { keep(); delete f.rec[b.dataset.delrec]; render() });
  $('#sg-cancel').onclick = () => { stopRec(); suggForm = null; render() };
  $('#sg').onsubmit = async e => {
    e.preventDefault(); keep(); stopRec();
    const err = m => { $('#sg-err').textContent = m };
    if(!f.fr.trim()) return err('Bitte das französische Wort eintragen.');
    if(f.kind === 'word' && !f.de.trim()) return err('Bitte auch sagen, was es auf Deutsch heisst.');
    if(f.kind === 'rec' && !f.rec.fr && !f.rec.de) return err('Bitte zuerst etwas aufnehmen.');
    const b64 = async r => r ? await new Promise(res => { const fr2 = new FileReader(); fr2.onload = () => res(String(fr2.result).split(',')[1] || ''); fr2.readAsDataURL(r.blob) }) : null;
    $('#sg-send').disabled = true;
    const { error } = await sb.rpc('kid_suggest', { p_name:kid.name, p_pin:kid.pin, p_unit:f.unit, p_kind:f.kind, p_fr:f.fr.trim(), p_de:f.de.trim(),
      p_fr_audio: await b64(f.rec.fr), p_de_audio: await b64(f.rec.de), p_mime: (f.rec.fr || f.rec.de)?.blob.type || '' });
    if(error){ $('#sg-send').disabled = false; return err(/function|schema cache/i.test(error.message) ? 'Das Vorschlagen ist noch nicht eingerichtet. Die Eltern müssen die Datenbank zuerst ergänzen.' : 'Hat nicht geklappt: ' + error.message) }
    suggForm = null; toast('Danke! Die Eltern schauen deinen Vorschlag an.'); mySugg = null; render();
  };
}
function stopRec(){ clearTimeout(recTimer); if(recMR && recMR.state !== 'inactive') try{ recMR.stop() }catch{} }
async function toggleRec(lang){
  if(recording){ const was = recording; stopRec(); if(was === lang) return }
  if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){ toast('Auf diesem Gerät kann man leider nicht aufnehmen.'); return }
  let stream; try{ stream = await navigator.mediaDevices.getUserMedia({ audio:true }) }catch{ toast('Das Mikrofon ist nicht erlaubt. Bitte im Browser erlauben.'); return }
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
  const chunks = []; recMR = new MediaRecorder(stream, type ? { mimeType:type, audioBitsPerSecond:32000 } : undefined);
  recMR.ondataavailable = e => { if(e.data.size) chunks.push(e.data) };
  recMR.onstop = () => { stream.getTracks().forEach(t => t.stop()); recording = null;
    if(chunks.length && suggForm){ const blob = new Blob(chunks, { type: recMR.mimeType || type || 'audio/webm' }); suggForm.rec[lang] = { blob, url:URL.createObjectURL(blob) } }
    render() };
  recording = lang; recMR.start(); render();
  recTimer = setTimeout(stopRec, 5000);
}

document.addEventListener('keydown', e => { if(e.key === 'Enter' && sess && sess.answered){ const nx = $('#next'); if(nx && document.activeElement !== nx){ e.preventDefault(); nx.click() } } });
init();
