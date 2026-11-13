// Voci-Kiste · Elternseite: Aussprache mit Azure-Stimmen erzeugen
const VOICES = [
  ['fr-CH-ArianeNeural', 'Ariane · Schweiz · Frau'], ['fr-CH-FabriceNeural', 'Fabrice · Schweiz · Mann'],
  ['fr-FR-DeniseNeural', 'Denise · Frankreich · Frau'], ['fr-FR-HenriNeural', 'Henri · Frankreich · Mann'],
  ['fr-FR-VivienneMultilingualNeural', 'Vivienne · Frankreich · Frau'], ['fr-FR-RemyMultilingualNeural', 'Rémy · Frankreich · Mann'],
  ['fr-FR-EloiseNeural', 'Eloise · Frankreich · Kinderstimme']
];
const VOICES_DE = [['de-CH-LeniNeural', 'Leni · Schweiz · Frau'], ['de-CH-JanNeural', 'Jan · Schweiz · Mann'], ['de-DE-KatjaNeural', 'Katja · Deutschland · Frau'], ['de-DE-ConradNeural', 'Conrad · Deutschland · Mann']];
const RATES = [['0%', 'normal'], ['-10%', 'etwas langsamer'], ['-20%', 'langsam']];
const AZ_GAP = 3200; // Gratisstufe: höchstens etwa 20 Anfragen pro Minute
let az = { ...{ region:'switzerlandnorth', key:'', voice:'fr-CH-ArianeNeural', voiceDe:'de-CH-LeniNeural', rate:'-10%', remember:false }, ...ls.get('vk-azure', {}) };
let audioTexts = null, audioFilter = '', gen = null;

function azSaveSettings(){ ls.set('vk-azure', az.remember ? az : { ...az, key:'' }) }
const xmlEsc = s => String(s).replace(/[<>&'"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[c]));
async function sha12(s){ const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 12) }

let azNoSilence = false; // falls Azure die Pausen-Angabe nicht kennt
const isDe = key => String(key).startsWith('de:');
const voiceFor = key => isDe(key) ? az.voiceDe : az.voice;
async function azureTTS(text, voice){
  voice = voice || voiceFor(text); if(isDe(text)) text = text.slice(3);
  const lang = voice.slice(0, 5);
  const sil = azNoSilence ? '' : '<mstts:silence type="Leading-exact" value="20ms"/><mstts:silence type="Tailing-exact" value="120ms"/>';
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}"><voice name="${voice}">${sil}<prosody rate="${az.rate}">${xmlEsc(speakable(text))}</prosody></voice></speak>`;
  let r;
  try{
    r = await fetch(`https://${az.region.trim().toLowerCase()}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method:'POST', headers:{ 'Ocp-Apim-Subscription-Key':az.key.trim(), 'Content-Type':'application/ssml+xml', 'X-Microsoft-OutputFormat':'audio-24khz-48kbitrate-mono-mp3' }, body:ssml });
  }catch(e){ throw Object.assign(new Error('Azure ist nicht erreichbar. Stimmt die Region (z. B. switzerlandnorth)?'), { fatal:true }) }
  if(r.status === 429) throw Object.assign(new Error('Zu viele Anfragen, kurze Pause …'), { retry:true });
  if(r.status === 401 || r.status === 403) throw Object.assign(new Error('Der Schlüssel wird nicht akzeptiert. Bitte KEY 1 und Region prüfen.'), { fatal:true });
  if(r.status === 400 && !azNoSilence){ azNoSilence = true; return azureTTS(text, voice) }
  if(r.status === 400) throw new Error('Azure kennt diese Stimme in dieser Region nicht oder der Text ist ungültig.');
  if(!r.ok) throw new Error('Azure-Fehler ' + r.status);
  return await r.blob();
}
async function storeClip(key, blob){
  const voice = voiceFor(key);
  const path = voice + '/' + await sha12(key) + '.mp3';
  const up = await sb.storage.from('audio').upload(path, blob, { upsert:true, contentType:'audio/mpeg', cacheControl:'31536000' });
  if(up.error) throw Object.assign(new Error('Speichern in Supabase fehlgeschlagen: ' + up.error.message), { fatal:true });
  const row = { key, path, voice, updated_at:new Date().toISOString() };
  const db = await sb.from('audio_clips').upsert(row);
  if(db.error) throw Object.assign(new Error('Speichern in Supabase fehlgeschlagen: ' + db.error.message), { fatal:true });
  CLOUD = CLOUD || {}; CLOUD[key] = row;
}
async function loadAudioTexts(){
  const { data, error } = await sb.from('units').select('id,title,ord,level,words,grammar').order('ord');
  if(error){ toast('Wörter konnten nicht geladen werden: ' + error.message); return [] }
  await loadCloudAudio(sb);
  const kindOrder = { 'Wort':0, 'Verb':1, 'Satz':2, 'Grammatik':3, 'Deutsch':4 };
  return collectTexts(data || []).sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]);
}
const status = t => { const c = CLOUD && CLOUD[t.key]; if(c) return c.voice === voiceFor(t.key) ? ['az', 'Azure'] : ['old', 'Azure (andere Stimme)']; return (AUDIO && AUDIO[t.key]) ? ['a', 'Stimme A'] : ['dev', 'Gerätestimme'] };
const mmss = s => { s = Math.round(s); return (s >= 60 ? Math.floor(s / 60) + ' Min. ' : '') + (s % 60) + ' Sek.' };

async function renderAudio(){
  const v = $('#view');
  if(!audioTexts){ v.innerHTML = '<p class="hint">Wird geladen …</p>'; audioTexts = await loadAudioTexts() }
  const missing = audioTexts.filter(t => status(t)[0] !== 'az');
  const done = audioTexts.length - missing.length;
  const list = audioTexts.filter(t => !audioFilter || t.key.toLowerCase().includes(audioFilter.toLowerCase()) || t.unit.toLowerCase().includes(audioFilter.toLowerCase()));
  v.innerHTML = `<div class="stack-v" style="gap:16px">
    <div class="panel"><h2>Azure-Verbindung</h2>
      <div class="row" style="align-items:flex-end">
        <div style="flex:1 1 160px;display:flex;flex-direction:column;gap:4px"><label class="label" for="az-region">Region</label><input class="field" id="az-region" value="${esc(az.region)}" placeholder="switzerlandnorth" autocomplete="off"></div>
        <div style="flex:3 1 260px;display:flex;flex-direction:column;gap:4px"><label class="label" for="az-key">Schlüssel (KEY 1)</label><input class="field" id="az-key" type="password" value="${esc(az.key)}" placeholder="aus Azure: Schlüssel und Endpunkt" autocomplete="off"></div>
      </div>
      <label class="row hint" style="gap:6px"><input type="checkbox" id="az-remember" ${az.remember ? 'checked' : ''}> Schlüssel auf diesem Gerät merken</label>
      <p class="hint">Der Schlüssel bleibt in Ihrem Browser und wird nur an Microsoft geschickt. In der Datenbank wird er nicht gespeichert.</p>
    </div>
    <div class="panel"><h2>Stimme</h2>
      <div class="row" style="align-items:flex-end">
        <div style="flex:2 1 220px;display:flex;flex-direction:column;gap:4px"><label class="label" for="az-voice">Französische Stimme</label><select class="field" id="az-voice">${VOICES.map(([k, n]) => `<option value="${k}" ${az.voice === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div style="flex:2 1 220px;display:flex;flex-direction:column;gap:4px"><label class="label" for="az-voice-de">Deutsche Stimme</label><select class="field" id="az-voice-de">${VOICES_DE.map(([k, n]) => `<option value="${k}" ${az.voiceDe === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div style="flex:1 1 150px;display:flex;flex-direction:column;gap:4px"><label class="label" for="az-rate">Tempo</label><select class="field" id="az-rate">${RATES.map(([k, n]) => `<option value="${k}" ${az.rate === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>
      <div class="row"><input class="field" id="az-sample" style="flex:1 1 240px" value="Bonjour ! Je m’appelle Léa. Septante, quatre-vingts, nonante. Les rollers."><button class="ghost" id="az-try">Probe anhören</button><button class="ghost" id="az-try-de">Deutsche Probe</button></div>
      <p class="error" id="az-err" ${''}></p>
    </div>
    <div class="panel"><h2>Aufnahmen erzeugen</h2>
      <p><b>${done}</b> von <b>${audioTexts.length}</b> Texten haben schon Aufnahmen mit dieser Stimme.</p>
      ${(() => { const c = { old:0, a:0, dev:0 }; audioTexts.forEach(t => { const s = status(t)[0]; if(c[s] !== undefined) c[s]++ });
        return c.old + c.a + c.dev ? `<p class="hint">Noch nicht mit dieser Stimme: ${c.old ? c.old + ' mit einer anderen Azure-Stimme, ' : ''}${c.a ? c.a + ' mit der alten Stimme A, ' : ''}${c.dev ? c.dev + ' nur mit der Gerätestimme' : ''}`.replace(/, $/, '') + '.</p>' : '<p class="hint">Alle Texte laufen mit dieser Stimme.</p>' })()}
      <div class="row"><button class="ghost" id="az-check">Aufnahmen prüfen</button><span class="hint" id="az-check-res"></span></div>
      <div class="bar"><i id="az-bar" style="width:${audioTexts.length ? done / audioTexts.length * 100 : 0}%"></i></div>
      <p class="hint" id="az-prog">${gen ? 'Läuft …' : missing.length ? `Für die fehlenden ${missing.length} Texte braucht es etwa ${mmss(missing.length * AZ_GAP / 1000)}, weil die Gratisstufe nur rund 20 Aufnahmen pro Minute erlaubt. Lassen Sie die Seite so lange offen. Sie können jederzeit stoppen und später weitermachen.` : 'Alles erzeugt.'}</p>
      <div class="row">
        ${gen ? '<button class="danger" id="az-stop">Stopp</button>' : `<button class="primary" id="az-missing" ${missing.filter(t => !isDe(t.key)).length ? '' : 'disabled'}>Fehlende französische (${missing.filter(t => !isDe(t.key)).length})</button><button class="primary" id="az-missing-de" ${missing.filter(t => isDe(t.key)).length ? '' : 'disabled'}>Fehlende deutsche (${missing.filter(t => isDe(t.key)).length})</button><button class="ghost" id="az-all">Alle neu erzeugen</button>`}
      </div>
    </div>
    <div class="panel"><div class="row" style="justify-content:space-between"><h2>Alle Texte</h2><input class="field" id="az-filter" style="max-width:240px" placeholder="Suchen …" value="${esc(audioFilter)}"></div>
      <p class="hint">Klingt ein Text falsch? Hier können Sie ihn anhören und einzeln neu erzeugen, zum Beispiel mit einer anderen Stimme.</p>
      <div class="tw"><table><thead><tr><th>Text</th><th>Art</th><th>Aufnahme</th><th></th></tr></thead><tbody>
      ${list.slice(0, 400).map(t => { const [s, n] = status(t); return `<tr><td><button class="mini" data-play="${esc(t.key)}" aria-label="Anhören">${SPK}</button>${isDe(t.key) ? '<b>DE</b> ' + esc(t.key.slice(3)) : esc(t.key)}<br><small class="hint">${esc(t.unit)}</small></td><td>${t.kind}</td><td><span class="tag ${s === 'az' ? 'test' : ''}">${n}</span></td><td><button class="ghost" data-regen="${esc(t.key)}">Neu</button></td></tr>` }).join('')}
      </tbody></table></div>${list.length > 400 ? `<p class="hint">${list.length - 400} weitere, bitte die Suche nutzen.</p>` : ''}
    </div></div>`;
  const read = () => { az.region = $('#az-region').value.trim(); az.key = $('#az-key').value.trim(); az.voice = $('#az-voice').value; az.voiceDe = $('#az-voice-de').value; az.rate = $('#az-rate').value; az.remember = $('#az-remember').checked; azSaveSettings() };
  ['#az-region', '#az-key', '#az-rate', '#az-remember'].forEach(s => $(s).onchange = read);
  $('#az-voice').onchange = $('#az-voice-de').onchange = () => { read(); if(!gen) renderAudio() };
  const err = m => { const e = $('#az-err'); if(e) e.textContent = m || '' };
  const need = () => { read(); if(!az.key || !az.region){ err('Bitte zuerst Region und Schlüssel eintragen.'); return false } return true };
  $('#az-try').onclick = async () => { if(!need()) return; err(''); $('#az-try').disabled = true;
    try{ const b = await azureTTS($('#az-sample').value); const a = new Audio(URL.createObjectURL(b)); a.play() }catch(e){ err(e.message) } $('#az-try').disabled = false };
  $('#az-try-de').onclick = async () => { if(!need()) return; err(''); $('#az-try-de').disabled = true;
    try{ const b = await azureTTS('de:Grüezi! Das ist die Gummi, der Bleistift und das Heft.'); const a = new Audio(URL.createObjectURL(b)); a.play() }catch(e){ err(e.message) } $('#az-try-de').disabled = false };
  $('#az-filter').oninput = e => { audioFilter = e.target.value; clearTimeout(renderAudio.t); renderAudio.t = setTimeout(() => { renderAudio().then(() => { const f = $('#az-filter'); f.focus(); f.setSelectionRange(f.value.length, f.value.length) }) }, 300) };
  document.querySelectorAll('[data-play]').forEach(b => b.onclick = () => speak(b.dataset.play));
  document.querySelectorAll('[data-regen]').forEach(b => b.onclick = async () => { if(!need()) return; b.disabled = true; b.textContent = '…';
    try{ const blob = await azureTTS(b.dataset.regen); await storeClip(b.dataset.regen, blob); speak(b.dataset.regen); toast('Neu erzeugt') }catch(e){ err(e.message) } renderAudio() });
  const stop = $('#az-stop'); if(stop) stop.onclick = () => { if(gen) gen.stop = true };
  $('#az-check').onclick = async () => {
    const btn = $('#az-check'), res = $('#az-check-res'); btn.disabled = true;
    const rows = Object.values(CLOUD || {}); const broken = []; let n = 0;
    for(let i = 0; i < rows.length; i += 8){
      await Promise.all(rows.slice(i, i + 8).map(async r => { try{ const x = await fetch(cloudURL(r), { method:'HEAD', cache:'no-store' }); if(!x.ok) broken.push(r.key) }catch{ broken.push(r.key) } n++ }));
      res.textContent = `${n} von ${rows.length} geprüft …`;
    }
    btn.disabled = false;
    if(!broken.length){ res.textContent = `Alle ${rows.length} Azure-Aufnahmen sind abrufbar.`; return }
    res.innerHTML = `${broken.length} Aufnahmen sind nicht abrufbar. <button class="ghost" id="az-fix">Diese neu erzeugen</button>`;
    $('#az-fix').onclick = () => { if(!need()) return; generate(audioTexts.filter(t => broken.includes(t.key))) };
  };
  const run = (all, de) => { if(!need()) return; err(''); generate(all ? audioTexts.slice() : audioTexts.filter(t => status(t)[0] !== 'az' && isDe(t.key) === !!de)) };
  const m = $('#az-missing'); if(m) m.onclick = () => run(false);
  const md = $('#az-missing-de'); if(md) md.onclick = () => run(false, true);
  const al = $('#az-all'); if(al) al.onclick = () => run(true);
}

async function generate(todo){
  gen = { stop:false, done:0, total:todo.length, t0:Date.now() };
  let wake = null; try{ wake = await navigator.wakeLock?.request('screen') }catch{}
  await renderAudio();
  let last = 0;
  for(let i = 0; i < todo.length && !gen.stop; i++){
    const wait = AZ_GAP - (Date.now() - last); if(wait > 0) await new Promise(r => setTimeout(r, wait));
    last = Date.now();
    try{
      const blob = await azureTTS(todo[i].key);
      await storeClip(todo[i].key, blob);
      gen.done++;
    }catch(e){
      if(e.retry){ i--; await new Promise(r => setTimeout(r, 20000)); continue }
      const el = $('#az-err'); if(el) el.textContent = e.message;
      if(e.fatal) break;
    }
    const p = $('#az-prog'), bar = $('#az-bar');
    if(p){ const left = (todo.length - i - 1) * AZ_GAP / 1000; p.textContent = `${gen.done} von ${todo.length} erzeugt · noch etwa ${mmss(left)} · zuletzt: ${todo[i].key}` }
    if(bar && audioTexts){ const d = audioTexts.filter(t => status(t)[0] === 'az').length; bar.style.width = d / audioTexts.length * 100 + '%' }
  }
  const n = gen.done; gen = null; try{ wake && wake.release() }catch{}
  toast(n + ' Aufnahmen erzeugt'); if(tab === 'audio') renderAudio(); checkAudioGaps();
}

// Hinweis auf der Elternseite, wenn neue Texte noch keine Azure-Aufnahme haben (z. B. neue Wörter, Klassenwörter)
async function checkAudioGaps(){
  try{
    audioTexts = await loadAudioTexts();
    const fr = audioTexts.filter(t => !isDe(t.key) && status(t)[0] !== 'az').length, de = audioTexts.filter(t => isDe(t.key) && status(t)[0] !== 'az').length;
    const tabB = document.querySelector('#tabs [data-t="audio"]'); if(tabB) tabB.textContent = 'Aussprache' + (fr ? ` (${fr})` : '');
    const h = $('#audio-hint'); if(!h) return;
    h.hidden = !fr;
    if(fr) h.innerHTML = `<b>${fr} französische Texte</b> haben noch keine Azure-Aufnahme und werden darum mit der alten Stimme gelesen${de ? ` (dazu ${de} deutsche)` : ''}. <button class="primary" id="audio-hint-go">Jetzt erzeugen</button>`;
    const go = $('#audio-hint-go'); if(go) go.onclick = () => { const b = document.querySelector('#tabs [data-t="audio"]'); if(b) b.click() };
  }catch(e){ console.warn(e) }
}
