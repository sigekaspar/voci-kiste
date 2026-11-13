// Voci-Abenteuer · weitere Spielmodi: Wort-Arena (Kampf) und Buchstaben-Bäckerei (Rechtschreibung)
// Nutzt die Hilfen aus spiel.js (G, sfx, particles, startLoop, overlay, leitner …)
// Jeder Modus: 4 Levels + Boss pro Ebene
const MODES = {
  run: { name: 'Wort-Sprung', short: 'Sprung', levels: ['Französisch erkennen', 'Französisch erkennen', 'Französisch wählen', 'Französisch wählen'], boss: 'Wolken-Boss' },
  arena: { name: 'Wort-Arena', short: 'Arena', speed: [14, 18, 23], q: [8, 10, 12], bossHP: [6, 8, 10],
    levels: [{ dir: 'fr', champ: 0, sx: 1, label: 'Hören und hauen' }, { dir: 'de', champ: 0, sx: 1.05, label: 'Französisch finden' }, { dir: 'mix', champ: 1, sx: 1.15, label: 'Gemischtes Getümmel' }, { dir: 'mix', champ: 2, sx: 1.3, label: 'Nacht der Champions' }],
    boss: 'Grummel-König' },
  bakery: { name: 'Bäckerei', short: 'Bäckerei', baseTime: [45, 36, 28], extraEb: [0, 1, 2], bossWords: [6, 8, 10],
    levels: [{ q: 6, extra: 0, time: 1, label: 'Erste Brötchen' }, { q: 7, extra: 2, time: 1, label: 'Mit Extra-Buchstaben' }, { q: 7, extra: 1, time: 1.15, listen: true, label: 'Diktat-Backstube' }, { q: 8, extra: 3, time: .7, label: 'Express-Bestellung' }],
    boss: 'Backwettbewerb' }
};
const MODE_IDS = ['run', 'arena', 'bakery'];
// Sterne-Schlüssel: Wort-Sprung wie bisher, Arena «A0», Bäckerei «B0» (Ebene)
function mKey(uid, mode, eb, i){ return mode === 'run' ? sKey(uid, eb, i) : `${uid}:${mode === 'arena' ? 'A' : 'B'}${eb}:${i}` }
function parseKey(k){ const p = k.split(':'); if(p.length === 2) return { uid: p[0], mode: 'run', eb: 0, i: +p[1] };
  if(/^[AB]\d$/.test(p[1])) return { uid: p[0], mode: p[1][0] === 'A' ? 'arena' : 'bakery', eb: +p[1][1], i: +p[2] }; return { uid: p[0], mode: 'run', eb: +p[1], i: +p[2] } }
function ebOpenM(uid, mode, eb){ return eb === 0 || (G.stars[mKey(uid, mode, eb - 1, 4)] || 0) >= 1 }
function startMode(mode, u, wi, eb, li){
  if(mode === 'run') return li === 4 ? startBoss(u, wi, eb) : startRun(u, li, wi, eb);
  return mode === 'arena' ? startArena(u, wi, eb, li) : startBakery(u, wi, eb, li);
}
const KING = ['..k.k.k.k...', '..kYkYkYk...', '..kYYYYYk...', '..kkkkkkk...', '..kGGGGGk...', '..kGkWkGk...', '..kGGGGGk...', '.kBBBBBBBk..', 'kBkBBYBBkBk.', 'kGkBBBBBkGk.', '..kBk.kBk...', '..kkk.kkk...'];

/* ---------- Grummel-Gegner (12×12) ---------- */
const FOES = {
  slime: ['............', '....kkkk....', '..kkBBBBkk..', '.kBBBBBBBBk.', '.kBWBBBBWBk.', 'kBBkBBBBkBBk', 'kBBBBBBBBBBk', 'kBBBBkkBBBBk', 'kBBBBBBBBBBk', '.kDDDDDDDDk.', '..kkkkkkkk..', '............'],
  shroom: ['...kkkkkk...', '..kRRWRRRk..', '.kRWRRRRWRk.', 'kRRRRRWRRRRk', 'kkkkkkkkkkkk', '..kBBBBBBk..', '..kBkBBkBk..', '..kBBBBBBk..', '..kBBkkBBk..', '...kBBBBk...', '..kkk..kkk..', '............'],
  bat: ['............', 'k..........k', 'kk...kk...kk', 'kBk.kBBk.kBk', 'kBBkBBBBkBBk', 'kBBBBWBWBBBk', '.kBBBkkBBBk.', '..kBBBBBBk..', '...kkBBkk...', '.....kk.....', '............', '............'],
  knight: ['...kkkkk....', '..kGGGGGk...', '..kGkkkGk...', '..kGkWkGk...', '..kGGGGGk...', '.kBBBBBBBk..', 'kBkBBBBBkBk.', 'kGkBBYBBkGk.', '..kBBBBBk...', '..kBk.kBk...', '..kkk.kkk...', '............']
};
const FOEPAL = [
  { B: '#8fd46b', D: '#5a9e45' }, { B: '#b9a3e3', D: '#8a72bf' }, { B: '#7ec4e6', D: '#4a8fb5' }, { B: '#f2a654', D: '#c47a2c' }, { B: '#e86a6a', D: '#b54646' }
];
function drawFoe(c, type, pal, x, y, scale, flip, hurt){
  const p = hurt ? { k: ART.INK, B: '#ffffff', D: '#ffd0d0', W: '#ffffff', R: '#ffffff', G: '#ffffff', Y: '#ffffff' }
    : { k: ART.INK, W: '#ffffff', R: '#e86a6a', G: '#b8c0cc', Y: '#f2c94c', ...pal, B: type === 'shroom' ? '#fff3dd' : pal.B };
  ART.draw(c, FOES[type], p, x, y, flip, scale);
}

/* ---------- gemeinsame Hilfen ---------- */
function modeBar(S, extra = ''){
  return `<div class="qbar"><div class="hearts" id="hearts"></div><span class="combo" id="combo"></span><span class="prog" id="prog"></span>${extra}<button class="hud-btn" id="quit">Karte</button></div>`;
}
function heartsUI(S){ $('#hearts').innerHTML = Array.from({ length: S.maxH }, (_, i) => `<i class="${i < S.hearts ? '' : 'off'}"></i>`).join('') }
function modeMult(S){ return Math.min(CFG.comboMax, 1 + Math.floor(S.combo / CFG.comboStep)) }
function comboText(S){ const el = $('#combo'); el.textContent = S.combo >= 2 ? `Kombo ${S.combo} · ×${modeMult(S)}` : ''; el.classList.remove('big'); void el.offsetWidth; if(S.combo >= 2) el.classList.add('big') }
function rewardRight(S, box, base, xpBase, x, y){
  S.combo++; S.correct++; G.totals.correct++; prog.stars = (prog.stars || 0) + 1; G.totals.bestCombo = Math.max(G.totals.bestCombo, S.combo);
  rfOf(S, mKey(S.u.id, S.mode, S.eb, S.li)); const gain = coinGain(base, modeMult(S), S); S.coins += gain; addCoins(gain);
  addXP(Math.round(xpBase * S.E.reward * (1 + .12 * skl('weise'))));
  floatText(box, '+' + gain, x, y, '#fff3b0');
  if(S.combo % CFG.comboStep === 0) sfx.combo(modeMult(S));
  comboText(S); touchDay(); save();
  return gain;
}
function newModeState(u, wi, eb, mode, items){
  const E = EBENEN[eb], maxH = Math.max(1, CFG.hearts + E.hearts + [0, 1, 1, 2, 2, 3][skl('herz')]);
  return { u, wi, eb, E, mode, items, qi: -1, hearts: maxH, maxH, combo: 0, errors: 0, correct: 0, coins: 0, secs: 0, lastAct: Date.now(), started: new Date().toISOString(), t: 0,
    shields: [0, 1, 1, 2, 2, 3][skl('schild')], jokers: [0, 1, 1, 2, 2, 3][skl(mode === 'arena' ? 'ajoker' : 'rezept')], th: ART.THEMES[wi % ART.THEMES.length] };
}
function loseCombo(S, box){
  if(S.shields > 0 && S.combo > 0){ S.shields--; floatText(box, 'Schild!', 40, 30, '#b8e4f5'); return }
  S.combo = 0; comboText(S);
}
function endMode(S, quit){
  stopLoop(); curView = 'result';
  const boss = S.li === 4, k = mKey(S.u.id, S.mode, S.eb, S.li);
  const won = boss ? !!S.bossWon : S.hearts > 0;
  const stars = quit || !won ? 0 : S.errors === 0 ? 3 : S.errors <= 2 ? 2 : 1;
  rfOf(S, k);
  const prev = G.stars[k] || 0, firstWin = boss && stars && !prev;
  if(stars > prev) G.stars[k] = stars;
  if(stars) countPlay(k, prev);
  const bonus = Math.round(Math.max(0, stars - prev) * CFG.starBonus * S.E.reward) + (boss && stars ? Math.round(CFG.bossWin * S.E.reward * S.rf) : 0); if(bonus) addCoins(bonus);
  const chest = firstWin; // goldene Truhe nur beim ersten Sieg
  if(boss && stars) G.totals.bosses++;
  if(boss && stars){ G.totals.modeBoss = G.totals.modeBoss || {}; G.totals.modeBoss[S.mode] = (G.totals.modeBoss[S.mode] || 0) + 1 }
  log(S, 'game'); const nb = checkBadges(); save(); hud();
  if(quit) return renderMap();
  if(stars) sfx.win(); else sfx.wrong();
  const M = MODES[S.mode];
  const title = boss ? (stars ? (S.mode === 'arena' ? 'Der Grummel-König ist besiegt!' : 'Backwettbewerb gewonnen!') : (S.mode === 'arena' ? 'Der König war stärker. Nochmals!' : 'Chef Grognon war schneller!'))
    : S.mode === 'arena' ? (stars ? 'Arena gewonnen!' : 'K.o.! Nochmals?') : (stars ? 'Alles gebacken!' : 'Die Küche ist zu heiss!');
  const again = () => startMode(S.mode, S.u, S.wi, S.eb, S.li);
  const next = () => stars && S.li < 4 ? startMode(S.mode, S.u, S.wi, S.eb, S.li + 1) : again();
  overlay(`<div class="board dialog"><h2>${title}</h2>
    <div class="bigstars">${[1, 2, 3].map(s => `<i class="${stars >= s ? 'on' : ''}"></i>`).join('')}</div>
    ${S.mode === 'bakery' && stars ? '<canvas id="cake" width="40" height="30" style="width:160px;height:120px"></canvas>' : ''}
    <div class="gains"><span><i class="coin"></i>+${S.coins + bonus}</span><span>${S.correct} richtig</span></div>
    ${firstWin && S.eb < 2 ? `<p><b>Neue Ebene freigeschaltet:</b> ${esc(EBENEN[S.eb + 1].name)} (${EBENEN[S.eb + 1].tag}) in ${esc(M.name)}</p>` : ''}
    ${chest ? '<p>Dafür gibt es eine goldene Truhe!</p>' : ''}${replayNote(S)}
    ${nb.length ? `<p><b>Neues Abzeichen:</b> ${nb.map(b => esc(b[1])).join(', ')}</p>` : ''}
    <div class="row"><button class="pbtn" id="ov-next">${stars && S.li < 4 ? (S.li === 3 ? 'Zum Boss' : 'Weiter') : 'Nochmals'}</button><button class="pbtn alt" id="ov-map">Zur Karte</button></div></div>`,
    { '#ov-next': () => { closeOverlay(); const go = () => afterDaily(S, next); chest ? openChest(S.eb ? 'eb' + S.eb : 'boss', go) : go() },
      '#ov-map': () => { closeOverlay(); const go = () => afterDaily(S, renderMap); chest ? openChest(S.eb ? 'eb' + S.eb : 'boss', go) : go() } });
  const cake = $('#cake'); if(cake) drawCake(cake.getContext('2d'), S.correct);
}

/* ===================== Wort-Arena ===================== */
function startArena(u, wi, eb = 0, li = 0){
  curView = 'game';
  const M = MODES.arena, boss = li === 4, L = boss ? { dir: 'mix', champ: 0, sx: 1.1 } : M.levels[li];
  const S = newModeState(u, wi, eb, 'arena', pickWords(u, boss ? M.bossHP[eb] + 8 : M.q[eb] + li));
  preloadSpeech(S.items.map(x => x.w.fr));
  S.li = li; S.boss = boss; S.home = boss ? 96 : 148; S.kingHP = M.bossHP[eb]; S.kingMax = S.kingHP; S.kingHurt = 0; S.kingX = 238;
  S.foes = []; S.px = S.home; S.pstate = 'idle'; S.super = 0; S.superOn = false; S.frame = 0; S.ft = 0; S.blink = 0; S.shake = 0;
  const P = particles();
  $('#screen').innerHTML = `<section class="stage">${modeBar(S, '<button class="hud-btn" id="joker" hidden>Joker</button>')}
    <div class="board qword" id="q"></div>
    ${boss ? `<div class="bossbar"><span>Grummel-König${eb ? ' · ' + esc(S.E.name) : ''}</span><span class="hp"><i id="hp" style="width:100%"></i></span></div>` : ''}
    <div class="canvasbox arena" id="box"><canvas id="cv" width="${ART.W}" height="${ART.H}"></canvas><div id="tags"></div><span class="ebbadge">${esc(S.E.name)} · ${boss ? 'Boss' : 'Level ' + (li + 1)}</span></div>
    <div class="superbar"><span>Super</span><span class="hp"><i id="sup" style="width:0%"></i></span><button class="pbtn" id="superbtn" disabled>Super-Attacke!</button></div>
    <p class="hint" style="text-align:center">Tippe den Gegner mit der richtigen Bedeutung an. Tasten 1, 2, 3 gehen auch.</p></section>`;
  const cv = $('#cv'), c = cv.getContext('2d'), box = $('#box'), tags = $('#tags');
  heartsUI(S);
  $('#quit').onclick = () => confirmQuit(() => endMode(S, true));
  const jk = () => { const j = $('#joker'); j.hidden = !S.jokers; j.textContent = `Joker ×${S.jokers}` }; jk();
  $('#joker').onclick = () => { if(!S.jokers || S.pstate !== 'idle') return; const w = S.foes.filter(f => !f.right && f.state === 'walk'); if(!w.length) return; const f = w[0]; f.state = 'flee'; S.jokers--; jk(); sfx.buy() };
  const supUI = () => { $('#sup').style.width = Math.min(100, S.super) + '%'; const b = $('#superbtn'); b.disabled = S.super < 100 || S.superOn; b.classList.toggle('glow', S.super >= 100 && !S.superOn); b.textContent = S.superOn ? 'Super bereit!' : 'Super-Attacke!' };
  $('#superbtn').onclick = () => { if(S.super >= 100){ S.superOn = true; S.super = 0; supUI(); sfx.level(); floatText(box, 'SUPER!', 38, 20, '#ffe27a') } };
  supUI();

  function spawn(){
    S.qi++;
    if(S.boss && S.qi >= S.items.length) S.items.push(...pickWords(u, 6));
    if(S.qi >= S.items.length || S.hearts <= 0) return finish();
    const x = S.items[S.qi];
    const dir = L.dir === 'mix' ? (Math.random() < .5 ? 'de' : 'fr') : L.dir; // fr: französisch hören, deutsche Schilder
    const field = dir === 'fr' ? 'de' : 'fr', right = x.w[field];
    const words = shuffle([right, ...distractors(S.u, x, field, 2)]);
    const champ = !S.boss && S.qi >= S.items.length - L.champ;
    const sides = S.boss ? [-1, -1, -1] : shuffle([-1, 1, Math.random() < .5 ? -1 : 1]);
    const types = Object.keys(FOES);
    S.foes = words.map((w, i) => {
      const side = sides[i], isRight = w === right;
      return { word: w, right: isRight, side, x: side < 0 ? -26 - i * (S.boss ? 30 : 22) : ART.W + 2 + i * 22, y: 0, type: types[(S.qi + i) % types.length], pal: FOEPAL[(S.qi * 3 + i) % FOEPAL.length],
        scale: champ && isRight ? 3 : 2, champ: champ && isRight, hp: champ && isRight ? (Math.random() < .12 * skl('kraft') ? 1 : 2) : 1, state: 'walk', hurt: 0, vx: 0, vy: 0, rot: 0, bob: Math.random() * 6, id: i };
    });
    S.foes.sort((a, b) => a.x - b.x).forEach((f, i) => f.n = i + 1);
    S.dir = dir; S.cur = x;
    $('#prog').textContent = S.boss ? `König: ${S.kingHP} Leben` : `${S.qi + 1} / ${S.items.length}${champ ? ' · Champion!' : ''}`;
    $('#q').innerHTML = dir === 'fr'
      ? `<button class="say" id="say" aria-label="Anhören">${SPK2}</button><span>${esc(x.w.fr)}<small>Welcher Gegner trägt die richtige Bedeutung?</small></span>`
      : `<span>${esc(x.w.de)}<small>Welcher Gegner trägt das französische Wort?</small></span>`;
    if(dir === 'fr'){ $('#say').onclick = () => speak(x.w.fr); setTimeout(() => speak(x.w.fr), 200) }
    tags.innerHTML = S.foes.map(f => `<button class="foetag" data-f="${f.id}"><b>${f.n}</b> ${esc(f.word)}</button>`).join('');
    tags.querySelectorAll('.foetag').forEach(b => b.onclick = () => attack(S.foes.find(f => f.id === +b.dataset.f)));
    S.pstate = 'idle';
  }
  function attack(f){
    if(!f || S.pstate !== 'idle' || f.state !== 'walk') return;
    activeTick(S);
    S.target = f; S.pstate = 'dash'; S.dt = 0; S.fromX = S.px; sfx.jump();
  }
  keyFn = e => { if(curView !== 'game') return; const k = +e.key; if(k >= 1 && k <= 3){ e.preventDefault(); attack(S.foes.find(f => f.n === k)) } if(e.key === ' ' && !$('#superbtn').disabled){ e.preventDefault(); $('#superbtn').click() } if(e.key === 'Escape') $('#quit').click() };
  addEventListener('keydown', keyFn);

  function hit(f){
    const x = S.cur;
    if(f.right){
      f.hp--; f.hurt = .25; S.shake = .2; sfx.hit(); P.add(f.x + 12, f.y - 10, CONFETTI, 16, 90);
      if(f.hp > 0 && !S.superOn){ floatText(box, 'Nochmals!', 60, 30, '#ffe27a'); S.pstate = 'back'; S.dt = 0; return }
      f.state = 'fly'; f.vx = (f.x < S.px ? -1 : 1) * 170; f.vy = -120;
      if(S.boss){ f.vx = 230; f.vy = -150; f.toKing = true }
      leitner(x.key, true, false); G.totals.answers++;
      rewardRight(S, box, f.champ ? CFG.coin * 3 : CFG.coin * 1.4, CFG.xpCorrect, f.x / ART.W * 100, 25);
      S.super = Math.min(100, S.super + (f.champ ? 40 : 25) + 6 * skl('super'));
      if(S.superOn){ S.superOn = false; S.foes.forEach(o => { if(o.state === 'walk'){ o.state = 'fly'; o.vx = S.boss ? 230 : (o.x < S.px ? -1 : 1) * 170; o.vy = -110; if(S.boss) o.toKing = true; P.add(o.x + 12, o.y - 10, CONFETTI, 10, 80); addCoins(1); S.coins += 1 } }); floatText(box, 'Wirbel-Attacke!', 30, 40, '#ffe27a') }
      else S.foes.forEach(o => { if(o !== f && o.state === 'walk') o.state = 'flee' });
      supUI();
      if(S.dir === 'de') speak(x.w.fr);
      S.pstate = 'back'; S.dt = 0; S.next = .9;
    } else {
      f.hurt = .15; sfx.wrong(); floatText(box, 'Geblockt!', f.x / ART.W * 100, 30, '#ffd0d0');
      wrongAnswer(f);
    }
  }
  function wrongAnswer(by){
    const x = S.cur;
    S.errors++; S.hearts--; heartsUI(S); loseCombo(S, box); leitner(x.key, false, false); G.totals.answers++;
    S.blink = 1; touchDay(); save();
    const r = S.foes.find(f => f.right);
    tags.querySelectorAll('.foetag').forEach(b => { const f = S.foes.find(o => o.id === +b.dataset.f); if(f && f.right) b.classList.add('right'); else if(f === by) b.classList.add('wrong') });
    if(S.dir === 'fr') setTimeout(() => speak(x.w.fr), 300);
    S.foes.forEach(o => { if(o.state === 'walk') o.state = 'flee' });
    S.pstate = 'back'; S.dt = 0; S.next = 1.6;
  }
  function finish(){ if(S.pstate === 'end') return; S.pstate = 'end'; setTimeout(() => endMode(S, false), 700) }
  function kingHit(f){
    const dmg = Math.random() < .12 * skl('kraft') ? 2 : 1;
    S.kingHP = Math.max(0, S.kingHP - dmg); S.kingHurt = .35; S.shake = .35; sfx.hit(); P.add(S.kingX + 20, ART.GROUND - 40, CONFETTI, 24, 110);
    if(dmg > 1) floatText(box, 'Kraftschlag!', 62, 20, '#ffe27a');
    $('#hp').style.width = (S.kingHP / S.kingMax * 100) + '%'; $('#prog').textContent = `König: ${S.kingHP} Leben`;
    if(S.kingHP <= 0){ S.bossWon = true; S.kingDead = 0; sfx.win(); P.add(S.kingX + 20, ART.GROUND - 40, CONFETTI, 60, 140); finish() }
  }

  S.next = .5; S.pstate = 'wait';
  startLoop(dt => {
    S.t += dt; S.ft += dt; if(S.ft > .14){ S.ft = 0; S.frame = (S.frame + 1) % 3 }
    if(S.pstate === 'wait' || (S.pstate === 'idle' && S.next > 0 && !S.foes.some(f => f.state === 'walk'))){ S.next -= dt; if(S.next <= 0){ S.next = 0; spawn() } }
    const speed = M.speed[eb] * L.sx * (1 - .07 * skl('zeit'));
    // Gegner bewegen
    for(const f of S.foes){
      f.hurt = Math.max(0, f.hurt - dt);
      if(f.state === 'walk' && S.pstate !== 'end'){
        f.x += (f.x < S.px ? 1 : -1) * speed * dt;
        if(Math.abs(f.x + 6 * f.scale - (S.px + 12)) < 18 + 3 * f.scale && S.pstate === 'idle'){
          if(f.right){ f.state = 'bump'; f.bt = 0; sfx.hit(); S.shake = .3; P.add(S.px + 12, ART.GROUND - 20, ['#e86a6a', '#fff'], 10, 60); wrongAnswer(f) }
          else { f.state = 'flee' }
        }
      } else if(f.state === 'fly'){ f.vy += 300 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 10;
        if(f.toKing && f.x + 12 >= S.kingX && !f.hitKing){ f.hitKing = true; f.vx = 60; f.vy = -60; if(f.right || !f.right) kingHit(f) } }
      else if(f.state === 'flee'){ f.x += (f.x < S.px ? -1 : 1) * 90 * dt; f.y = -Math.abs(Math.sin(S.t * 14)) * 3 }
      else if(f.state === 'bump'){ f.bt += dt; f.x += (f.x < S.px ? -1 : 1) * 60 * dt; if(f.bt > .3) f.state = 'flee' }
    }
    S.foes = S.foes.filter(f => f.x > -110 && f.x < ART.W + 80 && f.y < 120);
    if(S.pstate === 'idle' && S.qi >= 0 && !S.foes.some(f => f.state === 'walk') && S.next === 0) S.next = .4;
    // Pip
    let px = S.px, py = 0;
    if(S.pstate === 'dash'){ S.dt += dt; const tx = S.target.x + (S.target.x < S.home ? 6 * S.target.scale + 4 : -24); const k = Math.min(1, S.dt / .22); px = S.fromX + (tx - S.fromX) * k; py = -Math.sin(k * Math.PI) * 10;
      if(k >= 1){ S.px = tx; S.pstate = 'punch'; S.dt = 0; hit(S.target) } }
    else if(S.pstate === 'punch'){ S.dt += dt; if(S.dt > .2){ S.pstate = 'back'; S.dt = 0 } }
    else if(S.pstate === 'back'){ S.dt += dt; const k = Math.min(1, S.dt / .3); S.px += (S.home - S.px) * k; px = S.px; if(k >= 1){ S.px = S.home; S.pstate = S.hearts <= 0 ? 'end' : 'idle'; if(S.hearts <= 0) finish() } }
    // Zeichnen
    const sx = S.shake > 0 ? (Math.random() - .5) * 4 : 0; S.shake = Math.max(0, S.shake - dt);
    c.save(); c.translate(sx, 0);
    ART.scene(c, S.th, S.t, 40 + S.wi * 90, { night: eb === 2 });
    // Arena-Boden: Holzzaun links und rechts
    c.fillStyle = '#8a5a3c'; for(let x = 0; x < ART.W; x += 16){ c.fillRect(x, ART.GROUND - 18, 3, 18) } c.fillRect(0, ART.GROUND - 14, ART.W, 3);
    c.fillStyle = ART.INK; c.fillRect(0, ART.GROUND - 15, ART.W, 1);
    for(const f of S.foes){
      const fx = f.x | 0, fy = (ART.GROUND - 12 * f.scale + f.y + (f.state === 'walk' ? -Math.abs(Math.sin(S.t * 8 + f.bob)) * 2 : 0)) | 0;
      if(f.state === 'fly'){ c.save(); c.translate(fx + 6 * f.scale, fy + 6 * f.scale); c.rotate(f.rot); drawFoe(c, f.type, f.pal, -6 * f.scale, -6 * f.scale, f.scale, f.x > S.home, true); c.restore() }
      else drawFoe(c, f.type, f.pal, fx, fy, f.scale, f.x > S.home, f.hurt > 0);
      f.sy = fy;
      if(f.state === 'walk'){ const nx = fx + 6 * f.scale - 4, ny = fy - 11; c.fillStyle = ART.INK; c.fillRect(nx, ny, 9, 9); c.fillStyle = '#fff6e9'; c.fillRect(nx + 1, ny + 1, 7, 7);
        c.fillStyle = ART.INK; const D = { 1: ['.k.', 'kk.', '.k.', '.k.', 'kkk'], 2: ['kk.', '..k', '.k.', 'k..', 'kkk'], 3: ['kk.', '..k', '.k.', '..k', 'kk.'] }[f.n] || [];
        D.forEach((r, yy) => [...r].forEach((ch, xx) => { if(ch === 'k') c.fillRect(nx + 3 + xx, ny + 2 + yy, 1, 1) })) }
    }
    if(S.boss && !(S.bossWon && S.kingDead > .6)){ if(S.bossWon) S.kingDead += dt;
      const ky = ART.GROUND - 48 + Math.sin(S.t * 2) * 2, kx = S.kingX + (S.kingHurt > 0 ? (Math.random() - .5) * 4 : 0); S.kingHurt = Math.max(0, S.kingHurt - dt);
      const pal = S.kingHurt > 0 ? { k: ART.INK, B: '#fff', G: '#fff', W: '#fff', Y: '#fff' } : { k: ART.INK, B: S.th.boss[0], G: '#b8c0cc', W: '#fff7c2', Y: '#f2c94c' };
      ART.draw(c, KING, pal, kx, ky, true, 4) }
    if(S.boss && S.bossWon) ART.chest(c, S.kingX + 8, ART.GROUND - 24, 2, true);
    if(G.look.pet) ART.creature(c, G.look.pet, S.home - 26, ART.GROUND - 24, 2, ART.petStage(G.cards[G.look.pet] || 1), S.t);
    const vis = S.blink > 0 ? Math.floor(S.blink * 10) % 2 === 0 : true; S.blink = Math.max(0, S.blink - dt);
    if(vis) ART.pip(c, px | 0, ART.GROUND - 30 + py, G.look, S.pstate === 'dash' ? 1 : S.pstate === 'punch' ? 2 : S.frame, 2);
    if(S.pstate === 'punch'){ const fx = S.target.x < S.home ? px - 4 : px + 24; c.fillStyle = '#fff3b0'; c.fillRect(fx, ART.GROUND - 18, 6, 4); c.fillStyle = ART.INK; c.fillRect(fx, ART.GROUND - 19, 6, 1) }
    if(S.superOn){ c.fillStyle = Math.sin(S.t * 20) > 0 ? '#ffe27a' : '#fff'; for(let i = 0; i < 6; i++){ const a = S.t * 6 + i; c.fillRect(px + 12 + Math.cos(a) * 18 | 0, ART.GROUND - 15 + Math.sin(a) * 18 | 0, 2, 2) } }
    P.step(c, dt);
    c.restore();
    // Wortschilder über den Gegnern ausrichten
    tags.querySelectorAll('.foetag').forEach(b => { const f = S.foes.find(o => o.id === +b.dataset.f);
      if(!f || f.state === 'fly' || f.state === 'flee'){ b.style.display = 'none'; return }
      b.style.display = ''; b.style.left = Math.min(78, Math.max(22, (f.x + 6 * f.scale) / ART.W * 100)) + '%'; b.style.top = (14 + (f.n - 1) * 17) + '%';
      b.disabled = f.state !== 'walk' || S.pstate !== 'idle' });
  });
}

/* ===================== Buchstaben-Bäckerei ===================== */
const ARTICLES = ['le', 'la', 'l’', 'les', 'un', 'une'];
function splitArticle(fr){
  const s = fr.replace(/'/g, '’').replace(/\s*\([^)]*\)/g, '').trim();
  const m = s.match(/^(le |la |l’|les |un |une )(.+)$/i);
  return m ? { art: m[1].trim().toLowerCase(), rest: m[2] } : { art: null, rest: s };
}
function bakeable(x){ const { rest } = splitArticle(x.w.fr); const core = rest.replace(/[\s’'\-.!?,]/g, ''); return core.length >= 2 && core.length <= 12 && !/[…\/;]/.test(rest) }
function drawCake(c, n){
  c.clearRect(0, 0, 40, 30);
  c.fillStyle = ART.INK; c.fillRect(4, 13, 32, 15); c.fillRect(2, 27, 36, 2);
  c.fillStyle = '#f7c9a3'; c.fillRect(5, 14, 30, 13);
  c.fillStyle = '#f7a1c4'; c.fillRect(5, 14, 30, 4); for(let x = 6; x < 34; x += 4) c.fillRect(x, 18, 2, 2);
  c.fillStyle = '#ffffff'; c.fillRect(5, 22, 30, 1);
  const k = Math.min(8, Math.max(1, n));
  for(let i = 0; i < k; i++){ const x = 7 + i * 3.6 | 0; c.fillStyle = ['#7ec4e6', '#e86a6a', '#7fb069', '#b9a3e3'][i % 4]; c.fillRect(x, 8, 2, 5); c.fillStyle = '#f2b84b'; c.fillRect(x, 5, 2, 3); c.fillStyle = '#fff3b0'; c.fillRect(x, 5, 1, 1) }
}
function startBakery(u, wi, eb = 0, li = 0){
  curView = 'game';
  const M = MODES.bakery, boss = li === 4, L = boss ? { q: M.bossWords[eb], extra: 1, time: 1 } : M.levels[li];
  let pool = wordsOf(u).filter(bakeable);
  if(pool.length < 4) pool = units.filter(o => o.level === u.level).flatMap(wordsOf).filter(bakeable);
  const picked = pickWords({ ...u, words: pool.map(p => p.w) }, L.q + (boss ? 6 : 0)).map(x => ({ ...x, key: pool.find(p => p.w === x.w)?.key || x.key }));
  const S = newModeState(u, wi, eb, 'bakery', picked);
  preloadSpeech(picked.map(x => x.w.fr));
  S.li = li; S.boss = boss; S.goal = L.q; S.baked = 0; S.rival = 0;
  S.maxMiss = 3 + [0, 1, 1, 2, 2, 3][skl('schaber')];
  const timeMul = (1 + .12 * skl('zeit')) * (1 + .12 * skl('ofen'));
  // Boss: Chef Grognon backt gleichzeitig. Wer zuerst alle Wörter hat, gewinnt.
  S.rivalTime = boss ? M.baseTime[eb] * .62 * L.q * timeMul : 0;
  const P = particles();
  $('#screen').innerHTML = `<section class="stage">${modeBar(S, '<button class="hud-btn" id="joker" hidden>Joker</button>')}
    ${boss ? `<div class="race"><div><span>Du</span><span class="hp"><i id="me-bar" style="width:0%"></i></span></div><div><span>Chef Grognon</span><span class="hp rival"><i id="rival-bar" style="width:0%"></i></span></div></div>` : ''}
    <div class="canvasbox bake" id="box"><canvas id="cv" width="${ART.W}" height="${ART.H}"></canvas><span class="ebbadge">${esc(S.E.name)} · ${boss ? 'Boss' : 'Level ' + (li + 1)}</span></div>
    <div class="board bakeq"><div class="qword" id="q"></div><div class="charge" ${boss ? 'hidden' : ''}><i id="timer"></i></div><div class="dough" id="dough"></div><div class="tray" id="tray"></div><p class="msg" id="msg"></p></div></section>`;
  const cv = $('#cv'), c = cv.getContext('2d'), box = $('#box');
  heartsUI(S);
  $('#quit').onclick = () => confirmQuit(() => endMode(S, true));
  const jk = () => { const j = $('#joker'); j.hidden = !S.jokers; j.textContent = `Joker ×${S.jokers}` }; jk();
  $('#joker').onclick = () => { if(!S.jokers || !S.word || S.word.done) return; S.jokers--; jk(); sfx.buy(); hintNext() };

  function next(){
    S.qi++;
    if(S.boss && S.qi >= S.items.length) S.items.push(...pickWords({ ...u, words: pool.map(p => p.w) }, 4).map(x => ({ ...x, key: pool.find(p => p.w === x.w)?.key || x.key })));
    if((S.boss ? S.baked >= S.goal : S.qi >= S.items.length) || S.hearts <= 0) return finish();
    const x = S.items[S.qi], { art, rest } = splitArticle(x.w.fr);
    const chars = [...rest];
    const need = chars.map((ch, i) => /[\s’'\-.!?,]/.test(ch) ? null : i).filter(i => i !== null);
    const letters = need.map(i => ({ ch: chars[i], i }));
    const extras = 'eaisnrtluoc'.split('').sort(() => Math.random() - .5).slice(0, L.extra + M.extraEb[eb]).map(ch => ({ ch, i: -1 }));
    S.word = { x, art, artDone: !art, chars, need, pos: 0, miss: 0, tiles: shuffle([...letters, ...extras]).map((t, k) => ({ ...t, id: k, used: false })), done: false };
    S.time = M.baseTime[eb] * L.time * timeMul * (chars.length > 8 ? 1.3 : 1); S.left = S.time;
    $('#prog').textContent = S.boss ? `${S.baked} / ${S.goal} gebacken` : `${S.qi + 1} / ${S.items.length}`;
    const how = art ? 'Zuerst den richtigen Begleiter, dann die Buchstaben' : 'Back das französische Wort, Buchstabe für Buchstabe';
    $('#q').innerHTML = L.listen
      ? `<button class="say" id="say" aria-label="Nochmals anhören">${SPK2}</button><span>Hör gut zu!<small>${esc(x.w.de)} · ${how}</small></span>`
      : `<span>${esc(x.w.de)}<small>${how}</small></span>`;
    if(L.listen){ $('#say').onclick = () => speak(x.w.fr); setTimeout(() => speak(x.w.fr), 250) }
    $('#msg').textContent = ''; $('#msg').className = 'msg';
    render();
  }
  function render(){
    const W = S.word;
    $('#dough').innerHTML = (W.art ? `<span class="slot art ${W.artDone ? 'on' : 'cur'}">${W.artDone ? esc(W.art) : '?'}</span>` : '') +
      W.chars.map((ch, i) => { const isGap = !W.need.includes(i); const filled = isGap || W.need.indexOf(i) < W.pos;
        return ch === ' ' ? '<span class="slot gap"></span>' : `<span class="slot ${filled ? 'on' : ''} ${!filled && W.need.indexOf(i) === W.pos && W.artDone ? 'cur' : ''} ${isGap ? 'fixed' : ''}">${filled ? esc(ch) : ''}</span>` }).join('');
    $('#tray').innerHTML = !W.artDone
      ? ARTICLES.map(a => `<button class="cookie art" data-art="${esc(a)}">${esc(a)}</button>`).join('')
      : W.tiles.map(t => `<button class="cookie" data-t="${t.id}" ${t.used ? 'disabled' : ''}>${esc(t.ch)}</button>`).join('');
    $('#tray').querySelectorAll('[data-art]').forEach(b => b.onclick = () => pickArt(b.dataset.art, b));
    $('#tray').querySelectorAll('[data-t]').forEach(b => b.onclick = () => pickTile(+b.dataset.t, b));
  }
  function wobble(b){ if(!b) return; b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope') }
  function miss(b, why){
    const W = S.word; W.miss++; activeTick(S); sfx.wrong(); wobble(b);
    $('#msg').className = 'msg bad'; $('#msg').textContent = why;
    if(S.boss){ S.rival = Math.min(1, S.rival + .03); floatText(box, 'Grognon holt auf!', 10, 20, '#ffd0d0') }
    if(W.miss >= S.maxMiss){ fail('Zu viele Fehler. So schreibt man es: ' + W.x.w.fr) }
  }
  function pickArt(a, b){
    const W = S.word; if(W.done || W.artDone) return;
    if(a === W.art){ W.artDone = true; sfx.coin(); $('#msg').className = 'msg ok'; $('#msg').textContent = 'Richtiger Begleiter!'; render() }
    else miss(b, 'Nicht dieser Begleiter. Ist das Wort männlich oder weiblich?');
  }
  function pickTile(id, b){
    const W = S.word; if(W.done || !W.artDone) return;
    const t = W.tiles.find(t => t.id === id); if(!t || t.used) return;
    const want = W.chars[W.need[W.pos]];
    if(t.ch.toLowerCase() === want.toLowerCase()){
      t.used = true; W.pos++; sfx.click(); activeTick(S);
      P.add(60 + W.pos * 14, 110, ['#f7c9a3', '#fff3dd'], 5, 40);
      if(W.pos >= W.need.length) return success();
      render();
    } else {
      const look = deacc(t.ch.toLowerCase()) === deacc(want.toLowerCase()) ? 'Fast! Achte auf den Akzent.' : 'Dieser Buchstabe kommt noch nicht.';
      miss(b, look);
    }
  }
  function hintNext(){
    const W = S.word;
    if(!W.artDone){ const b = [...$('#tray').querySelectorAll('[data-art]')].find(x => x.dataset.art === W.art); b && b.classList.add('hint'); return }
    const want = W.chars[W.need[W.pos]]; const t = W.tiles.find(t => !t.used && t.ch.toLowerCase() === want.toLowerCase());
    const b = t && $('#tray').querySelector(`[data-t="${t.id}"]`); b && b.classList.add('hint');
  }
  keyFn = e => {
    if(curView !== 'game' || !S.word || S.word.done || e.ctrlKey || e.metaKey) return;
    if(e.key === 'Escape') return $('#quit').click();
    if(e.key.length !== 1) return;
    const W = S.word, k = e.key.toLowerCase();
    if(!W.artDone) return;
    const t = W.tiles.find(t => !t.used && t.ch.toLowerCase() === k) || W.tiles.find(t => !t.used && deacc(t.ch.toLowerCase()) === k);
    if(t){ e.preventDefault(); pickTile(t.id, $('#tray').querySelector(`[data-t="${t.id}"]`)) }
  };
  addEventListener('keydown', keyFn);
  function success(){
    const W = S.word; W.done = true;
    const clean = W.miss === 0;
    leitner(W.x.key, true, clean); G.totals.answers++;
    if(!clean) loseCombo(S, box);
    rewardRight(S, box, CFG.coin * (1 + W.need.length / 5), CFG.xpCorrect + W.need.length, 50, 30);
    S.baked++; S.oven = 1.2; sfx.chest(); speak(W.x.w.fr);
    if(S.boss){ $('#me-bar').style.width = (S.baked / S.goal * 100) + '%'; $('#prog').textContent = `${S.baked} / ${S.goal} gebacken`; if(S.baked >= S.goal){ $('#msg').textContent = 'Erste! Du hast gewonnen!'; return finish() } }
    $('#msg').className = 'msg ok'; $('#msg').textContent = clean ? 'Perfekt gebacken!' : 'Gebacken!';
    render(); $('#tray').innerHTML = '';
    setTimeout(next, 1300);
  }
  function fail(text){
    const W = S.word; W.done = true;
    S.errors++; S.hearts--; heartsUI(S); S.combo = 0; comboText(S); leitner(W.x.key, false, false); G.totals.answers++;
    S.burnt = 1.2; touchDay(); save();
    $('#msg').className = 'msg bad'; $('#msg').textContent = text;
    W.pos = W.need.length; W.artDone = true; render(); $('#tray').innerHTML = '';
    setTimeout(() => speak(W.x.w.fr), 300);
    setTimeout(next, 2400);
  }
  function finish(){ if(S.ended) return; S.ended = true; S.word = null; if(S.boss) S.bossWon = S.baked >= S.goal && S.rival < 1; setTimeout(() => endMode(S, false), 700) }

  next();
  startLoop(dt => {
    S.t += dt;
    if(S.boss && !S.ended){ S.rival = Math.min(1, S.rival + dt / S.rivalTime); $('#rival-bar').style.width = (S.rival * 100) + '%';
      if(S.rival >= 1){ S.hearts = 0; heartsUI(S); $('#msg').className = 'msg bad'; $('#msg').textContent = 'Chef Grognon war schneller!'; finish() } }
    else if(S.word && !S.word.done){ S.left -= dt; $('#timer').style.width = Math.max(0, S.left / S.time * 100) + '%'; if(S.left <= 0) fail('Die Zeit ist um! So schreibt man es: ' + S.word.x.w.fr) }
    // Backstube
    c.fillStyle = '#f6e3c8'; c.fillRect(0, 0, ART.W, ART.H);
    c.fillStyle = '#ead2b0'; for(let y = 0; y < 110; y += 12) for(let x = (y / 12) % 2 * 12; x < ART.W; x += 24) c.fillRect(x, y, 12, 12);
    c.fillStyle = '#8a5a3c'; c.fillRect(0, 110, ART.W, 70); c.fillStyle = '#b07a52'; for(let x = 0; x < ART.W; x += 20) c.fillRect(x + 2, 114, 14, 2);
    c.fillStyle = ART.INK; c.fillRect(0, 109, ART.W, 1);
    // Ofen
    c.fillStyle = ART.INK; c.fillRect(216, 30, 82, 80); c.fillStyle = '#c96a4a'; c.fillRect(218, 32, 78, 78);
    for(let y = 34; y < 108; y += 8) for(let x = 220 + (y / 8 % 2) * 6; x < 294; x += 12){ c.fillStyle = '#b55a3c'; c.fillRect(x, y, 10, 6) }
    c.fillStyle = ART.INK; c.fillRect(234, 64, 46, 34); c.fillStyle = S.oven > 0 ? '#ffd27a' : S.burnt > 0 ? '#5a4a58' : '#e8925a'; c.fillRect(236, 66, 42, 30);
    if(S.oven > 0 || Math.sin(S.t * 3) > .6){ c.fillStyle = '#f2b84b'; for(let i = 0; i < 4; i++) c.fillRect(240 + i * 10, 88 + Math.sin(S.t * 10 + i) * 2 | 0, 4, 6) }
    if(S.burnt > 0){ c.fillStyle = '#6b6b78'; for(let i = 0; i < 5; i++) c.fillRect(244 + i * 6, 30 - (1.2 - S.burnt) * 40 - i * 4 | 0, 5, 5) }
    S.oven = Math.max(0, (S.oven || 0) - dt); S.burnt = Math.max(0, (S.burnt || 0) - dt);
    // Regal mit gebackenen Wörtern
    c.fillStyle = ART.INK; c.fillRect(16, 40, 170, 3); c.fillRect(16, 72, 170, 3);
    for(let i = 0; i < S.baked; i++){ const row = i < 8 ? 0 : 1, x = 22 + (i % 8) * 20, y = row ? 60 : 28; c.fillStyle = ART.INK; c.fillRect(x - 1, y - 1, 16, 13); c.fillStyle = ['#f2b84b', '#e0a35c', '#f7c9a3', '#f7a1c4'][i % 4]; c.fillRect(x, y, 14, 11); c.fillStyle = '#fff3dd'; c.fillRect(x + 3, y + 2, 2, 2); c.fillRect(x + 9, y + 5, 2, 2) }
    if(S.boss){ ART.pip(c, 30, 110 - 30, { color: 'coal', hat: 'chef', face: 'mustache' }, Math.floor(S.t * 5) % 3, 2);
      c.fillStyle = ART.INK; c.fillRect(20, 72, 46, 3); for(let i = 0; i < Math.floor(S.rival * S.goal); i++){ c.fillStyle = ART.INK; c.fillRect(21 + i * 5, 64, 5, 8); c.fillStyle = '#a0704e'; c.fillRect(22 + i * 5, 65, 3, 6) } }
    // Bäcker Pip mit Kochmütze
    ART.pip(c, 120, 110 - 30, { ...G.look, hat: 'chef' }, Math.floor(S.t * 3) % 3 === 0 ? 0 : 2, 2);
    if(G.look.pet) ART.creature(c, G.look.pet, 92, 110 - 24, 2, ART.petStage(G.cards[G.look.pet] || 1), S.t);
    // Teig auf dem Tisch
    const W = S.word; if(W){ const k = W.need.length ? W.pos / W.need.length : 0; c.fillStyle = ART.INK; c.fillRect(40, 132, 160, 16); c.fillStyle = '#fff3dd'; c.fillRect(42, 134, 156 * k | 0, 12) }
    P.step(c, dt);
  });
}
