// Voci-Kiste · Hilfsfunktionen für beide Seiten
const SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const FACH = [{n:'Neu',d:'noch nie'},{n:'Fach 1',d:'jeden Tag'},{n:'Fach 2',d:'nach 1 Tag'},{n:'Fach 3',d:'nach 3 Tagen'},{n:'Fach 4',d:'nach 1 Woche'},{n:'Fach 5',d:'sitzt!'}];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d }catch{ return d } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch{} },
  del(k){ try{ localStorage.removeItem(k) }catch{} }
};
function today(off = 0){ const d = new Date(); d.setDate(d.getDate() + off); return d.toLocaleDateString('sv-SE') }
function toast(t){ const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2600) }
function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]] } return a }

const hasTTS = 'speechSynthesis' in window;
function speak(t){
  if(!hasTTS) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = .85;
    const v = speechSynthesis.getVoices().find(v => /^fr/i.test(v.lang)); if(v) u.voice = v;
    speechSynthesis.speak(u);
  }catch{}
}
if(hasTTS) try{ speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => {} }catch{}

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
