// Voci-Kiste · Hilfsfunktionen für beide Seiten
const SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const FACH = [{n:'Neu',d:'noch nie'},{n:'Fach 1',d:'jeden Tag'},{n:'Fach 2',d:'nach 1 Tag'},{n:'Fach 3',d:'nach 3 Tagen'},{n:'Fach 4',d:'nach 1 Woche'},{n:'Fach 5',d:'sitzt!'}];

const $ = s => document.querySelector(s);
const LEVELS = { CR3:'Ça roule 3', CR4:'Ça roule 4' };
const uname = u => (u.level && LEVELS[u.level] ? LEVELS[u.level] + ' · ' : '') + u.title;
// Gruppiert Unités nach Klasse: [[«Ça roule 3», [...]], ...]
function byLevel(list){ const m = new Map(); list.forEach(u => { const k = u.level || ''; if(!m.has(k)) m.set(k, []); m.get(k).push(u) }); return [...m].map(([k, us]) => [LEVELS[k] || k || 'Weitere', us]) }
// Teilt «a / b, c; d» in Alternativen, aber nicht innerhalb von Klammern
function splitAlts(t){ const out = []; let cur = '', depth = 0; for(const ch of t){ if(ch === '(') depth++; if(ch === ')') depth = Math.max(0, depth - 1); if(depth === 0 && '/;,'.includes(ch)){ out.push(cur); cur = '' } else cur += ch } out.push(cur); return out.map(x => x.trim()).filter(Boolean) }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d }catch{ return d } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch{} },
  del(k){ try{ localStorage.removeItem(k) }catch{} }
};
function today(off = 0){ const d = new Date(); d.setDate(d.getDate() + off); return d.toLocaleDateString('sv-SE') }
function toast(t){ const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2600) }
function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]] } return a }

// Aussprache: zuerst aufgenommene Audiodateien (audio/index.json), sonst Stimme des Geräts
const hasSynth = 'speechSynthesis' in window;
const hasTTS = true;
let AUDIO = null, curAudio = null;
fetch('audio/index.json', { cache:'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { AUDIO = j }).catch(() => {});
const audioKey = t => String(t || '').replace(/[’`´]/g, "'").replace(/\s+/g, ' ').trim();
function bestVoice(){
  const vs = speechSynthesis.getVoices().filter(v => /^fr/i.test(v.lang));
  const score = v => (/natural|online|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (/google|amélie|amelie|thomas|audrey|denise|henri|marie/i.test(v.name) ? 2 : 0) + (/fr-fr/i.test(v.lang) ? 1 : 0);
  return vs.sort((a, b) => score(b) - score(a))[0];
}
function synth(t){
  if(!hasSynth) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = .85;
    const v = bestVoice(); if(v) u.voice = v;
    speechSynthesis.speak(u);
  }catch{}
}
function speak(t){
  const f = AUDIO && AUDIO[audioKey(t)];
  if(f){
    try{
      if(curAudio) curAudio.pause();
      curAudio = new Audio('audio/' + f);
      curAudio.play().catch(() => synth(t));
      return;
    }catch{}
  }
  synth(t);
}
if(hasSynth) try{ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {} }catch{}

/* ---------- Leitner-Karteikasten ---------- */
const NEXT = {1:1, 2:1, 3:3, 4:7, 5:14};
const ACC = ['é','è','ê','à','â','ç','ù','û','î','ï','ô','ë','œ',"'"];

/* ---------- Prüfen ---------- */
const norm = s => s.toLowerCase().replace(/[’`´]/g, "'").replace(/\.\.\./g, '…').replace(/\s*…\s*/g, ' … ').replace(/\s+([!?])/g, '$1').replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();
// Auch ohne Klammerteil und ohne Klammern gültig: «da (ist)» → «da», «da ist»
const variants = t => [...new Set([t, t.replace(/\s*\([^)]*\)\s*/g, ' ').trim(), t.replace(/[()]/g, '')])].filter(Boolean);
const deacc = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
const noArt = s => s.replace(/^(le |la |les |l'|un |une |des |der |die |das |ein |eine )/, '').trim();
function check(input, target){
  const a = norm(input); if(!a) return { r:'wrong' };
  const alts = splitAlts(target).flatMap(variants);
  for(const t of alts) if(a === norm(t)) return { r:'ok', t };
  for(const t of alts) if(deacc(a) === deacc(norm(t))) return { r:'accent', t };
  for(const t of alts){ const n = norm(t); if(noArt(n) !== n && deacc(a) === deacc(noArt(n))) return { r:'article', t } }
  return { r:'wrong', t: alts[0] };
}
/* ---------- Nachsichtig prüfen (Spiel): Tippfehler, Umlaute, Artikel, deutsche Synonyme ---------- */
const umlaut = s => s.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u').replace(/ß/g, 'ss');
const loose = s => umlaut(deacc(norm(String(s)).replace(/ß/g, 'ss'))).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const ART_RE = /^(le |la |les |l'|un |une |des |du |de la |der |die |das |den |dem |ein |eine |einen |einem )/;
const core = s => loose(norm(String(s)).replace(ART_RE, ''));
let SYN = {};
fetch('synonyme.json', { cache:'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => { SYN = {}; Object.entries(j || {}).forEach(([k, v]) => { if(Array.isArray(v)) SYN[core(k)] = v }) }).catch(() => {});
function lev(a, b){
  if(a === b) return 0; const m = a.length, n = b.length; if(!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for(let i = 1; i <= m; i++){ const cur = [i]; for(let j = 1; j <= n; j++){ cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); } prev = cur }
  return prev[n];
}
const tolerance = len => len <= 3 ? 0 : len <= 6 ? 1 : len <= 11 ? 2 : 3;
// Ergebnis: ok, accent, syn (Synonym), article, typo, wrong
function checkGame(input, target, lang){
  const base = check(input, target);
  if(base.r === 'ok' || base.r === 'accent') return base;
  const own = splitAlts(target).flatMap(variants);
  const alts = own.map(t => ({ t, syn:false }));
  if(lang === 'de') own.forEach(t => (SYN[core(t)] || []).forEach(s => alts.push({ t:s, syn:true, of:t })));
  const a = loose(input), ac = core(input);
  if(!a) return { r:'wrong', t: own[0] };
  for(const x of alts) if(a === loose(x.t)) return { r: x.syn ? 'syn' : 'accent', t: x.syn ? x.of : x.t };
  for(const x of alts) if(ac && ac === core(x.t)) return { r: x.syn ? 'syn' : lang === 'de' ? 'ok' : 'article', t: x.syn ? x.of : x.t };
  for(const x of alts){ const c = core(x.t); if(ac && lev(ac, c) <= tolerance(c.length)) return { r:'typo', t: x.syn ? x.of : x.t } }
  return { r:'wrong', t: own[0] };
}
function accentDiff(input, t){ const a = [...norm(input)], b = [...norm(t)]; return [...new Set(b.filter((c, i) => c !== a[i] && /[^\x00-\x7f]/.test(c)))].join(' ') }

function makeClient(){
  const C = window.VOCI_CONFIG || {};
  if(!C.url || !C.key || C.url.includes('DEIN-PROJEKT') || C.key.includes('DEIN-')) return { error: 'config' };
  if(!window.supabase || !window.supabase.createClient) return { error: 'lib' };
  const url = C.url.trim().replace(/\/(rest|auth)\/v1\/?.*$/, '').replace(/\/+$/, '');
  return { sb: window.supabase.createClient(url, C.key.trim()) };
}
function setupMessage(err){
  return err === 'config'
    ? `<div class="empty"><h2>Noch nicht verbunden</h2><p>In der Datei <b>config.js</b> fehlen noch die Angaben von Supabase (Project URL und anon/Publishable key). Siehe Anleitung, Schritt 4.</p></div>`
    : `<div class="empty"><h2>Keine Verbindung</h2><p>Die Supabase-Bibliothek konnte nicht geladen werden. Ist das Internet verbunden? Seite neu laden.</p></div>`;
}
