// Voci-Kiste · Elternseite
const { sb, error: setupErr } = makeClient();
let tab = 'overview', units = [], kids = [], states = {}, sessions = [];
let editing = null, sure = null, pinEdit = null;
const WD = ['So','Mo','Di','Mi','Do','Fr','Sa'];
const KIND = { practice:'Üben', test:'Test', learn:'Anschauen', grammar:'Grammatik' };

async function init(){
  if(setupErr){ $('#view').innerHTML = setupMessage(setupErr); return }
  const { data:{ session } } = await sb.auth.getSession();
  session ? afterLogin(session) : renderLogin();
}

function renderLogin(msg = ''){
  $('#me').hidden = true; $('#tabs').hidden = true;
  $('#view').innerHTML = `<form class="panel login" id="lf"><h2>Anmelden</h2>
    <label class="label" for="lf-mail">E-Mail</label><input class="field" id="lf-mail" type="email" autocomplete="username" required>
    <label class="label" for="lf-pw">Passwort</label><input class="field" id="lf-pw" type="password" autocomplete="current-password" required>
    ${msg ? `<p class="error">${esc(msg)}</p>` : ''}
    <button class="primary" type="submit" id="lf-go">Anmelden</button></form>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); $('#lf-go').disabled = true;
    const { data, error } = await sb.auth.signInWithPassword({ email:$('#lf-mail').value.trim(), password:$('#lf-pw').value });
    if(error){
      console.error(error);
      const m = error.message || '';
      return renderLogin(/invalid login credentials/i.test(m) ? 'E-Mail oder Passwort stimmt nicht.'
        : /email not confirmed/i.test(m) ? 'Die E-Mail ist noch nicht bestätigt. In Supabase beim Benutzer «Confirm email» wählen.'
        : 'Anmelden fehlgeschlagen: ' + m + (error.status ? ' (' + error.status + ')' : ''));
    }
    afterLogin(data.session);
  };
}

async function afterLogin(session){
  const { data:isAdmin, error:adminErr } = await sb.rpc('is_admin');
  if(adminErr){ console.error(adminErr); $('#view').innerHTML = `<div class="empty"><h2>Angemeldet, aber Fehler</h2><p>${esc(adminErr.message)}</p><p class="hint">Wurde setup.sql in Supabase ausgeführt?</p></div>`; $('#me').hidden = false; return }
  $('#me').hidden = false; $('#me-mail').textContent = session.user.email;
  if(!isAdmin){
    $('#view').innerHTML = `<div class="empty"><h2>Kein Zugang</h2><p>Die E-Mail <b>${esc(session.user.email)}</b> steht nicht in der Admin-Liste. Im Supabase SQL Editor ausführen:</p><p><code>insert into admins(email) values ('${esc(session.user.email)}');</code></p></div>`;
    return;
  }
  $('#tabs').hidden = false;
  await loadAll(); render();
}
$('#logout').onclick = async () => { await sb.auth.signOut(); renderLogin() };
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; editing = null; sure = null; pinEdit = null; document.querySelectorAll('#tabs button').forEach(x => x.setAttribute('aria-selected', x === b)); render() });

async function loadAll(){
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  const [u, k, s, se] = await Promise.all([
    sb.from('units').select('id,title,ord,words').order('ord').order('title'),
    sb.from('kids').select('id,name,created_at').order('name'),
    sb.from('kid_state').select('kid_id,cards,stars,streak,last_day,updated_at'),
    sb.from('sessions').select('kid_id,kind,unit_ids,answers,correct,seconds,started_at,ended_at').gte('ended_at', since).order('ended_at', { ascending:false }).limit(2000)
  ]);
  const bad = [u, k, s, se].find(r => r.error); if(bad){ console.error(bad.error); toast('Laden fehlgeschlagen: ' + bad.error.message) }
  units = u.data || []; kids = k.data || []; sessions = se.data || [];
  states = {}; (s.data || []).forEach(x => states[x.kid_id] = x);
}

function render(){ ({ overview:renderOverview, words:renderWords, kids:renderKids })[tab]() }

/* ---------- Fortschritt ---------- */
const mins = s => s < 60 ? (s ? '<1' : '0') : String(Math.round(s / 60));
const dayKey = iso => new Date(iso).toLocaleDateString('sv-SE');
function relDay(d){
  if(!d) return 'noch nie';
  const diff = Math.round((new Date(today()) - new Date(d)) / 864e5);
  return diff <= 0 ? 'heute' : diff === 1 ? 'gestern' : `vor ${diff} Tagen`;
}
function mondayKey(){ const d = new Date(); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.toLocaleDateString('sv-SE') }

function renderOverview(){
  const v = $('#view');
  if(!kids.length){ v.innerHTML = `<div class="empty"><h2>Noch keine Kinder</h2><p>Unter «Kinder» Namen und PIN eintragen. Danach erscheint hier der Fortschritt.</p></div>`; return }
  const mon = mondayKey();
  v.innerHTML = `<div class="row" style="justify-content:space-between"><p class="hint">Übungszeit zählt nur aktive Zeit. Pausen über 90 Sekunden zwischen zwei Antworten fallen weg.</p><button class="ghost" id="reload">Aktualisieren</button></div>
  <div class="kids">${kids.map(k => {
    const st = states[k.id] || { cards:{} }, ss = sessions.filter(x => x.kid_id === k.id);
    const byDay = {}; ss.forEach(x => { const d = dayKey(x.ended_at); byDay[d] = (byDay[d] || 0) + (x.seconds || 0) });
    const week = ss.filter(x => dayKey(x.ended_at) >= mon);
    const weekSec = week.reduce((a, x) => a + (x.seconds || 0), 0);
    const days14 = [...Array(14)].map((_, i) => today(i - 13));
    const active14 = days14.filter(d => byDay[d]).length;
    const last = ss[0]?.ended_at ? dayKey(ss[0].ended_at) : st.last_day;
    const lastTest = ss.find(x => x.kind === 'test' && x.answers);
    return `<article class="panel">
      <div class="kidhead"><h2>${esc(k.name)}</h2><span class="hint">zuletzt geübt: <b>${relDay(last)}</b></span></div>
      <div class="kpis">
        <div class="kpi"><b>${mins(weekSec)}</b><span>Minuten diese Woche</span></div>
        <div class="kpi"><b>${week.length}</b><span>Runden diese Woche</span></div>
        <div class="kpi"><b>${active14}<small style="font-size:.9rem;color:var(--muted)"> / 14</small></b><span>Übungstage (2 Wochen)</span></div>
        <div class="kpi"><b>${lastTest ? (Math.round((1 + 5 * lastTest.correct / lastTest.answers) * 2) / 2).toFixed(1) : '–'}</b><span>letzte Testnote (ca.)</span></div>
      </div>
      <section><span class="label">Letzte 14 Tage</span>
        <div class="days">${days14.map(d => { const s = byDay[d] || 0, lv = !s ? '' : s < 300 ? 'l1' : s < 900 ? 'l2' : 'l3'; const dt = new Date(d); return `<div class="day ${d === today() ? 'today' : ''}" title="${dt.toLocaleDateString('de-CH')}: ${mins(s)} Min."><i class="${lv}"></i><small>${WD[dt.getDay()]}</small></div>` }).join('')}</div>
        <div class="legend"><span><i style="background:var(--line)"></i>nicht geübt</span><span><i style="background:color-mix(in srgb,var(--accent) 30%,var(--line))"></i>unter 5 Min.</span><span><i style="background:color-mix(in srgb,var(--accent) 65%,var(--line))"></i>5–15 Min.</span><span><i style="background:var(--accent)"></i>über 15 Min.</span></div>
      </section>
      <section><span class="label">Karteikasten pro Unité</span>
        ${units.length ? `<div class="tw"><table><thead><tr><th>Unité</th><th style="width:40%">Fächer</th><th class="num">sitzt</th><th class="num">fällig</th></tr></thead><tbody>
        ${units.map(u => {
          const ws = (u.words || []).filter(w => w.fr && w.de), c = [0,0,0,0,0,0]; let due = 0;
          ws.forEach(w => { const card = st.cards?.[u.id + '|' + w.fr]; c[card?.box || 0]++; if(card && card.due <= today()) due++ });
          const n = ws.length || 1;
          return `<tr><td>${esc(u.title)}</td><td><div class="boxbar" title="${c.map((x, i) => FACH[i].n + ': ' + x).join(' · ')}">${c.map((x, i) => x ? `<i style="width:${x / n * 100}%;background:var(--f${i})"></i>` : '').join('')}</div></td><td class="num">${c[5]} / ${ws.length}</td><td class="num">${due}</td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="legend">${FACH.map((f, i) => `<span><i style="background:var(--f${i})"></i>${f.n}</span>`).join('')}</div>` : '<p class="hint">Noch keine Wörter.</p>'}
      </section>
      <details class="unit"><summary>Letzte Runden <small>${ss.length} in 60 Tagen</small></summary><div class="body">
        ${ss.length ? `<div class="tw"><table><thead><tr><th>Wann</th><th>Art</th><th class="num">Minuten</th><th class="num">Richtig</th></tr></thead><tbody>
        ${ss.slice(0, 20).map(x => `<tr><td>${new Date(x.ended_at).toLocaleString('de-CH', { weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' })}</td><td><span class="tag ${x.kind === 'test' ? 'test' : ''}">${KIND[x.kind] || esc(x.kind)}</span></td><td class="num">${mins(x.seconds || 0)}</td><td class="num">${x.kind === 'learn' ? '–' : `${x.correct} / ${x.answers}`}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="hint">Noch keine Runden.</p>'}
      </div></details>
    </article>`;
  }).join('')}</div>`;
  $('#reload').onclick = async () => { await loadAll(); render(); toast('Aktualisiert') };
}

/* ---------- Wörter ---------- */
function renderWords(){
  const v = $('#view');
  const editor = u => `<form class="edit" id="ed"><label class="label" for="ed-t">Name der Unité</label><input id="ed-t" required value="${esc(u?.title || '')}" placeholder="z. B. Unité 1 – À l'école">
    <label class="label" for="ed-w">Wörter: pro Zeile Französisch ; Deutsch ; Beispielsatz (freiwillig)</label>
    <textarea id="ed-w" placeholder="le cahier ; das Heft&#10;la gomme ; der Radiergummi ; Voilà la gomme.">${esc((u?.words || []).map(w => w.fr + ' ; ' + w.de + (w.ex ? ' ; ' + w.ex : '')).join('\n'))}</textarea>
    <p class="hint">Mehrere richtige Antworten mit / trennen, z. B. «der Schüler / die Schülerin». Auch aus Excel kopierte Spalten (Tabulator) funktionieren.</p>
    <div class="row"><button class="primary" type="submit">Speichern</button><button class="ghost" type="button" id="ed-x">Abbrechen</button></div></form>`;
  v.innerHTML = `<div class="stack-v" style="gap:14px">
    ${units.map(u => `<details class="unit" ${editing === u.id ? 'open' : ''}><summary>${esc(u.title)} <small>${(u.words || []).length} Wörter</small></summary><div class="body">
      ${editing === u.id ? editor(u) : `<div class="tw"><table><thead><tr><th>Français</th><th>Deutsch</th></tr></thead><tbody>
      ${(u.words || []).map(w => `<tr><td>${hasTTS ? `<button class="mini" data-say="${esc(w.fr)}" aria-label="Anhören">${SPK}</button>` : ''}<b>${esc(w.fr)}</b>${w.ex ? `<br><span class="ex">${esc(w.ex)}</span>` : ''}</td><td>${esc(w.de)}</td></tr>`).join('')}</tbody></table></div>
      <div class="row"><button class="ghost" data-edit="${esc(u.id)}">Bearbeiten</button><button class="ghost" data-up="${esc(u.id)}" aria-label="Nach oben">↑</button><button class="ghost" data-down="${esc(u.id)}" aria-label="Nach unten">↓</button><button class="danger ${sure === u.id ? 'sure' : ''}" data-del="${esc(u.id)}">${sure === u.id ? 'Wirklich löschen?' : 'Löschen'}</button></div>`}
    </div></details>`).join('')}
    ${editing === 'new' ? `<div class="unit"><div class="body" style="padding-top:16px">${editor(null)}</div></div>` : '<button class="primary" id="add" style="align-self:flex-start">Neue Unité eintragen</button>'}
  </div>`;
  v.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
  v.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { editing = b.dataset.edit; sure = null; render() });
  v.querySelectorAll('[data-up],[data-down]').forEach(b => b.onclick = () => move(b.dataset.up || b.dataset.down, b.dataset.up ? -1 : 1));
  v.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const id = b.dataset.del; if(sure !== id){ sure = id; render(); return } sure = null;
    const { error } = await sb.from('units').delete().eq('id', id);
    if(error){ console.error(error); return toast('Löschen hat nicht geklappt: ' + error.message) }
    units = units.filter(u => u.id !== id); render(); toast('Unité gelöscht');
  });
  const add = $('#add'); if(add) add.onclick = () => { editing = 'new'; render() };
  const f = $('#ed'); if(!f) return;
  $('#ed-x').onclick = () => { editing = null; render() };
  f.onsubmit = async e => {
    e.preventDefault();
    const words = $('#ed-w').value.split('\n').map(l => l.split(/\s*(?:;|\t|=)\s*/)).filter(p => p.length >= 2 && p[0].trim() && p[1].trim()).map(p => { const w = { fr:p[0].trim(), de:p[1].trim() }; const ex = p.slice(2).filter(Boolean).join('; ').trim(); if(ex) w.ex = ex; return w });
    if(!words.length) return toast('Bitte mindestens eine Zeile «Französisch ; Deutsch» eintragen.');
    const old = units.find(u => u.id === editing);
    const row = { id: old ? old.id : 'u-' + Date.now().toString(36), title:$('#ed-t').value.trim(), ord: old ? old.ord : (units.length ? Math.max(...units.map(x => x.ord || 0)) + 1 : 1), words, updated_at:new Date().toISOString() };
    const { error } = await sb.from('units').upsert(row);
    if(error){ console.error(error); return toast('Speichern hat nicht geklappt: ' + error.message) }
    const i = units.findIndex(u => u.id === row.id); i >= 0 ? units[i] = row : units.push(row);
    units.sort((a, b) => a.ord - b.ord); editing = null; render(); toast('Gespeichert');
  };
}
async function move(id, d){
  const i = units.findIndex(u => u.id === id), j = i + d; if(j < 0 || j >= units.length) return;
  [units[i], units[j]] = [units[j], units[i]];
  units.forEach((u, k) => u.ord = k + 1); render();
  const { error } = await sb.from('units').upsert(units.map(u => ({ id:u.id, title:u.title, ord:u.ord, words:u.words })));
  if(error) toast('Reihenfolge konnte nicht gespeichert werden.');
}

/* ---------- Kinder ---------- */
function renderKids(){
  const v = $('#view');
  v.innerHTML = `<div class="stack-v" style="gap:16px">
    <div class="panel"><h2>Kind eintragen</h2>
      <form class="row" id="kf" autocomplete="off">
        <input class="field" id="kf-name" placeholder="Vorname" required maxlength="30" style="flex:2 1 160px">
        <input class="field" id="kf-pin" placeholder="PIN (4 Ziffern)" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" style="flex:1 1 120px">
        <button class="primary" type="submit">Eintragen</button>
      </form>
      <p class="hint">Am besten nur den Vornamen oder einen Spitznamen verwenden. Die Kinder wählen auf der Übungsseite ihren Namen und tippen die PIN.</p>
    </div>
    ${kids.length ? `<div class="panel"><h2>Eingetragene Kinder</h2><div class="tw"><table><tbody>
      ${kids.map(k => `<tr><td><b>${esc(k.name)}</b></td><td>
        ${pinEdit === k.id ? `<form class="row" data-pinform="${esc(k.name)}"><input class="field" style="max-width:140px" placeholder="Neue PIN" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"><button class="primary" type="submit">Speichern</button><button class="ghost" type="button" data-pincancel>Abbrechen</button></form>`
        : `<div class="row" style="justify-content:flex-end"><button class="ghost" data-pin="${esc(k.id)}">PIN ändern</button><button class="danger ${sure === k.id ? 'sure' : ''}" data-delkid="${esc(k.id)}">${sure === k.id ? 'Mit Fortschritt löschen?' : 'Löschen'}</button></div>`}
      </td></tr>`).join('')}</tbody></table></div></div>` : ''}
  </div>`;
  $('#kf').onsubmit = async e => {
    e.preventDefault();
    const name = $('#kf-name').value.trim(), p = $('#kf-pin').value.trim();
    if(kids.some(k => k.name.toLowerCase() === name.toLowerCase())) return toast('Diesen Namen gibt es schon. Für eine neue PIN «PIN ändern» wählen.');
    const { error } = await sb.rpc('admin_set_kid', { p_name:name, p_pin:p });
    if(error) return toast(error.message.includes('4 Ziffern') ? 'Die PIN muss aus 4 Ziffern bestehen.' : 'Eintragen hat nicht geklappt: ' + error.message);
    await loadAll(); render(); toast(name + ' eingetragen');
  };
  v.querySelectorAll('[data-pin]').forEach(b => b.onclick = () => { pinEdit = b.dataset.pin; sure = null; render() });
  v.querySelectorAll('[data-pincancel]').forEach(b => b.onclick = () => { pinEdit = null; render() });
  v.querySelectorAll('[data-pinform]').forEach(f => f.onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.rpc('admin_set_kid', { p_name:f.dataset.pinform, p_pin:f.querySelector('input').value.trim() });
    if(error) return toast('Die PIN muss aus 4 Ziffern bestehen.');
    pinEdit = null; render(); toast('PIN geändert');
  });
  v.querySelectorAll('[data-delkid]').forEach(b => b.onclick = async () => {
    const id = b.dataset.delkid; if(sure !== id){ sure = id; render(); return } sure = null;
    const { error } = await sb.from('kids').delete().eq('id', id);
    if(error){ console.error(error); return toast('Löschen hat nicht geklappt: ' + error.message) }
    await loadAll(); render(); toast('Gelöscht');
  });
}

init();
