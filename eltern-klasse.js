// Voci-Kiste · Elternseite: Klassenwörter der Kinder prüfen und freigeben
let sugg = null, suggErr = '', suggEdit = {}, ownList = null;
const hexToBlob = (hex, type) => { if(!hex) return null; const h = String(hex).replace(/^\\x/, ''); const b = new Uint8Array(h.length / 2); for(let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return new Blob([b], { type: type || 'audio/webm' }) };
const extOf = m => /mp4|m4a|aac/.test(m || '') ? 'm4a' : /ogg/.test(m || '') ? 'ogg' : 'webm';
async function loadSugg(){
  const { data, error } = await sb.from('suggestions').select('id,kind,unit_id,fr,de,fr_audio,de_audio,mime,status,created_at,kid_id').eq('status', 'pending').order('created_at');
  suggErr = error ? error.message : ''; sugg = data || [];
  const o = await sb.from('own_clips').select('key,path,kid_name,updated_at').order('updated_at', { ascending:false }); ownList = o.data || [];
  updSuggBadge();
}
function updSuggBadge(){ const b = document.querySelector('#tabs [data-t="klasse"]'); if(b) b.textContent = 'Klassenwörter' + (sugg && sugg.length ? ` (${sugg.length})` : '') }
async function renderKlasse(){
  const v = $('#view');
  if(sugg === null){ v.innerHTML = '<p class="hint">Wird geladen …</p>'; await loadSugg() }
  const kname = id => (kids.find(k => k.id === id) || {}).name || '?';
  const uOf = id => units.find(u => u.id === id);
  if(suggErr){ v.innerHTML = `<div class="empty"><h2>Noch nicht eingerichtet</h2><p>Für die Klassenwörter braucht die Datenbank zwei neue Tabellen. Bitte <b>klassenwoerter.sql</b> einmal im Supabase SQL Editor ausführen.</p><p class="hint">${esc(suggErr)}</p></div>`; return }
  v.innerHTML = `<div class="stack-v" style="gap:16px">
    <div class="panel"><h2>Vorschläge der Kinder</h2>
      <p class="hint">Die Kinder können Wörter für «Langage de classe» vorschlagen und selbst einsprechen. Freigegebene Wörter üben danach alle Kinder. Sie können Französisch und Deutsch vor der Freigabe noch korrigieren.</p>
      ${sugg.length ? sugg.map(s => { const e = suggEdit[s.id] || (suggEdit[s.id] = { fr:s.fr, de:s.de }); const u = uOf(s.unit_id);
        const dup = s.kind === 'word' && u && (u.words || []).some(w => audioKey(w.fr).toLowerCase() === audioKey(e.fr).toLowerCase());
        return `<div class="sugrow" data-id="${s.id}">
          <div class="hint">${esc(kname(s.kid_id))} · ${esc(u ? uname(u) : s.unit_id)} · ${new Date(s.created_at).toLocaleDateString('de-CH')} · ${s.kind === 'rec' ? 'Aufnahme zu einem bestehenden Wort' : 'neues Wort'}</div>
          <div class="sg2"><label class="label">Französisch<input class="field" data-f="fr" value="${esc(e.fr)}" ${s.kind === 'rec' ? 'readonly' : ''}></label>${s.fr_audio ? `<button class="ghost" data-pl="fr">${SPK} Aufnahme</button>` : '<span class="hint">ohne Aufnahme</span>'}</div>
          <div class="sg2"><label class="label">Deutsch<input class="field" data-f="de" value="${esc(e.de)}" ${s.kind === 'rec' ? 'readonly' : ''}></label>${s.de_audio ? `<button class="ghost" data-pl="de">${SPK} Aufnahme</button>` : '<span class="hint">ohne Aufnahme</span>'}</div>
          ${dup ? '<p class="hint">Dieses Wort gibt es schon. Bei der Freigabe werden nur die Aufnahmen übernommen.</p>' : ''}
          <div class="row"><button class="primary" data-ok>Freigeben</button><button class="danger" data-no>Ablehnen</button></div></div>` }).join('') : '<p>Zurzeit gibt es keine offenen Vorschläge.</p>'}
    </div>
    <div class="panel"><h2>Eigene Aufnahmen</h2>
      <p class="hint">Diese Aufnahmen hören die Kinder als «Unsere Stimme» neben der Profi-Stimme.</p>
      ${ownList && ownList.length ? `<div class="tw"><table><thead><tr><th>Text</th><th>Von</th><th></th></tr></thead><tbody>${ownList.map(o => `<tr><td><button class="mini" data-po="${esc(o.key)}" aria-label="Anhören">${SPK}</button>${o.key.startsWith('de:') ? '<b>DE</b> ' + esc(o.key.slice(3)) : esc(o.key)}</td><td>${esc(o.kid_name || '')}</td><td><button class="ghost" data-delown="${esc(o.key)}">Entfernen</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">Noch keine.</p>'}
    </div></div>`;
  v.querySelectorAll('.sugrow').forEach(row => {
    const s = sugg.find(x => x.id === +row.dataset.id), e = suggEdit[s.id];
    row.querySelectorAll('[data-f]').forEach(i => i.oninput = () => e[i.dataset.f] = i.value);
    row.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { const bl = hexToBlob(s[b.dataset.pl + '_audio'], s.mime); if(bl){ stopSpeech(); new Audio(URL.createObjectURL(bl)).play().catch(() => toast('Dieser Browser kann die Aufnahme nicht abspielen.')) } });
    row.querySelector('[data-ok]').onclick = async ev => { ev.target.disabled = true; try{ await approveSugg(s, e.fr.trim(), e.de.trim(), kname(s.kid_id)); toast('Freigegeben'); sugg = null; renderKlasse() }catch(err){ ev.target.disabled = false; toast(err.message) } };
    row.querySelector('[data-no]').onclick = async ev => { ev.target.disabled = true; const { error } = await sb.from('suggestions').update({ status:'rejected', fr_audio:null, de_audio:null }).eq('id', s.id); if(error) return toast(error.message); sugg = null; renderKlasse() };
  });
  v.querySelectorAll('[data-po]').forEach(b => b.onclick = () => { OWN = OWN || {}; ownList.forEach(o => OWN[o.key] = o); playOwn(b.dataset.po) });
  v.querySelectorAll('[data-delown]').forEach(b => b.onclick = async () => { const o = ownList.find(x => x.key === b.dataset.delown); b.disabled = true;
    await sb.storage.from('audio').remove([o.path]); const { error } = await sb.from('own_clips').delete().eq('key', o.key); if(error) toast(error.message); sugg = null; renderKlasse() });
}
async function approveSugg(s, fr, de, kidName){
  if(!fr) throw new Error('Französisch fehlt.');
  if(s.kind === 'word'){
    const { data:u, error } = await sb.from('units').select('id,words').eq('id', s.unit_id).single(); if(error) throw error;
    const words = u.words || [];
    if(!words.some(w => audioKey(w.fr).toLowerCase() === audioKey(fr).toLowerCase())){
      words.push({ fr, de });
      const up = await sb.from('units').update({ words, updated_at:new Date().toISOString() }).eq('id', s.unit_id); if(up.error) throw up.error;
      const lu = units.find(x => x.id === s.unit_id); if(lu) lu.words = words;
    }
  }
  for(const lang of ['fr', 'de']){
    const blob = hexToBlob(s[lang + '_audio'], s.mime); if(!blob) continue;
    const key = lang === 'fr' ? audioKey(fr) : 'de:' + audioKey(de); if(lang === 'de' && !de) continue;
    const path = `own/${s.id}-${lang}.${extOf(s.mime)}`;
    const up = await sb.storage.from('audio').upload(path, blob, { upsert:true, contentType: blob.type, cacheControl:'3600' }); if(up.error) throw new Error('Aufnahme speichern: ' + up.error.message);
    const db = await sb.from('own_clips').upsert({ key, path, kid_name:kidName, updated_at:new Date().toISOString() }); if(db.error) throw db.error;
  }
  const { error } = await sb.from('suggestions').update({ status:'approved', fr, de, fr_audio:null, de_audio:null }).eq('id', s.id); if(error) throw error;
}
