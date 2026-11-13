// Voci-Abenteuer · Pixelgrafik: Figuren, Wesen, Bosse und gemütliche Landschaften
const ART = (() => {
  const INK = '#3b2d3f';
  // ---------- Figur «Pip» (12×14) ----------
  const PIP_HEAD = [
    '...kkkkkk...',
    '..kssssssk..',
    '.kssssssssk.',
    '.kssesssesk.',
    '.kcssssssck.',
    '..kssmmssk..',
    '...kkkkkk...'];
  const PIP_BODY = [
    '..kHhhhhhHk.',
    '.kHhhhhhhhHk',
    '.khhhhwwhhhk',
    '..kHhhhhhHk.'];
  const LEGS = [
    ['..kppkkppk..', '..kppk.kppk.', '.kbbk...kbbk', '.kkk.....kkk'],
    ['...kppppk...', '...kpkkpk...', '..kbbkkbbk..', '..kkk..kkk..'],
    ['..kppkkppk..', '.kppk..kppk.', 'kbbk....kbbk', 'kkk......kkk']];
  const COLORS = {
    berry: ['#e86a6a', '#b54646', 'Himbeere'], mint: ['#5fc4a0', '#3a9479', 'Minze'], sky: ['#7ec4e6', '#4a8fb5', 'Himmel'],
    lav: ['#b9a3e3', '#8a72bf', 'Lavendel'], honey: ['#f2b84b', '#c98a24', 'Honig'], cocoa: ['#a0704e', '#6e4a31', 'Kakao'], night: ['#4b5a8a', '#2f3a63', 'Nacht'],
    rose: ['#f7a1c4', '#d4709a', 'Rosa'], sun: ['#ffd84a', '#d9a91e', 'Sonne'], forest: ['#3f8f5a', '#2a6640', 'Tanne'], ocean: ['#2f7fc1', '#1f5a8f', 'Ozean'],
    snow: ['#f4f6fb', '#b8c2d8', 'Schnee'], coal: ['#3a3a48', '#22222c', 'Kohle'], gold: ['#f2c94c', '#b8902a', 'Gold'], rainbow: ['#e86a6a', '#7b5fc4', 'Regenbogen']
  };
  const RAINBOW = ['#e86a6a', '#f2b84b', '#7fb069', '#7ec4e6'];
  const HATS = {
    beret: { name: 'Béret', rows: ['....kkk.....', '..kkRRRkk...', '.kRRRRRRRk..', '.kkkkkkkkkk.'], pal: { R: '#3e4a7a' }, dy: -3 },
    crown: { name: 'Krone', rows: ['..k..k..k...', '.kYkkYkkYk..', '.kYYYYYYYk..', '.kkkkkkkkk..'], pal: { Y: '#f2c94c' }, dy: -3 },
    cap: { name: 'Mütze', rows: ['...kkkkk....', '..kRRRRRk...', '.kRRRRRRRkkk', '.kkkkkkkkkkk'], pal: { R: '#e86a6a' }, dy: -3 },
    flower: { name: 'Blume', rows: ['......kk....', '.....kPPk...', '......kk....'], pal: { P: '#f7a1c4' }, dy: -2 },
    helmet: { name: 'Ritterhelm', rows: ['.....k......', '...kkGkk....', '..kGGGGGk...', '.kGGGGGGGk..', '.kGkkkkkGk..'], pal: { G: '#b8c0cc' }, dy: -4 },
    wizard: { name: 'Zauberhut', rows: ['......kk....', '.....kVVk...', '....kVYVk...', '...kVVVVVk..', '..kVVVVVVVk.', '.kkkkkkkkkkk'], pal: { V: '#7b5fc4', Y: '#f2c94c' }, dy: -5 },
    chef: { name: 'Kochmütze', rows: ['..kkk.kkk...', '.kWWWkWWWk..', '.kWWWWWWWk..', '..kWWWWWk...', '..kkkkkkk...'], pal: { W: '#ffffff' }, dy: -4 },
    party: { name: 'Partyhut', rows: ['.....kk.....', '....kYYk....', '...kRYRk....', '..kYRYRYk...', '.kkkkkkkkk..'], pal: { R: '#e86a6a', Y: '#f2c94c' }, dy: -5 },
    tophat: { name: 'Zylinder', rows: ['..kkkkkkk...', '..kBBBBBk...', '..kBBBBBk...', '..kRRRRRk...', 'kkkkkkkkkkk.'], pal: { B: '#2e2a3a', R: '#e86a6a' }, dy: -5 },
    pirate: { name: 'Piratenhut', rows: ['...kkkkkk...', '..kBBBBBBk..', '.kBBBWWBBBk.', 'kkkkkkkkkkkk'], pal: { B: '#2e2a3a', W: '#ffffff' }, dy: -4 },
    viking: { name: 'Wikingerhelm', rows: ['k..........k', 'kW.kkkkkk.Wk', '.kkGGGGGGkk.', '.kGGGGGGGGk.', '.kkkkkkkkkk.'], pal: { W: '#fff3dd', G: '#b8c0cc' }, dy: -4 },
    bunny: { name: 'Hasenohren', rows: ['..kk....kk..', '.kWk....kWk.', '.kPk....kPk.', '.kWk....kWk.', '..kk....kk..'], pal: { W: '#ffffff', P: '#f7a1c4' }, dy: -5 },
    cat: { name: 'Katzenohren', rows: ['.k.......k..', 'kOk.....kOk.', 'kPOk...kOPk.', 'kkkk...kkkk.'], pal: { O: '#3a3a48', P: '#f7a1c4' }, dy: -3 },
    propeller: { name: 'Propellermütze', rows: ['..RRk.kBB...', '....kYk.....', '...kRBRk....', '..kRBRBRk...', '.kkkkkkkkk..'], pal: { R: '#e86a6a', B: '#7ec4e6', Y: '#f2c94c' }, dy: -5 },
    headphones: { name: 'Kopfhörer', rows: ['...kkkkkk...', '..k......k..', '.kk......kk.', 'kRRk....kRRk', 'kRRk....kRRk'], pal: { R: '#e86a6a' }, dy: -1 },
    halo: { name: 'Heiligenschein', rows: ['..kkkkkkk...', '.kYYYYYYYk..', '..kkkkkkk...'], pal: { Y: '#ffe27a' }, dy: -6 },
    flowercrown: { name: 'Blumenkranz', rows: ['.P.Y.P.Y.P..', 'kGkGkGkGkGk.'], pal: { P: '#f7a1c4', Y: '#f2c94c', G: '#7fb069' }, dy: -1 },
    straw: { name: 'Strohhut', rows: ['...kkkkk....', '..kYYYYYk...', '..kRRRRRk...', 'kkYYYYYYYkk.', '.kkkkkkkkk..'], pal: { Y: '#f2d27a', R: '#e86a6a' }, dy: -4 }
  };
  const FACES = {
    sunglasses: { name: 'Sonnenbrille', rows: ['..kkkkkkkk..', '..kBBkkBBk..'], pal: { B: '#2e2a3a' }, dy: 2 },
    glasses: { name: 'Brille', rows: ['...kkkkkk...', '...kekkek...'], pal: { e: '#2a2230' }, dy: 2 },
    hearts: { name: 'Herzbrille', rows: ['...RRkRR....', '...RRkRR....'], pal: { R: '#e86a6a' }, dy: 2 },
    mustache: { name: 'Schnauz', rows: ['...kk..kk...', '..kkkkkkkk..'], pal: {}, dy: 4 }
  };
  const TRAILS = {
    sparkle: { name: 'Glitzer', cols: ['#fff3b0', '#ffffff'] }, hearts: { name: 'Herzen', cols: ['#f7a1c4', '#e86a6a'], heart: true },
    rainbow: { name: 'Regenbogen', cols: ['#e86a6a', '#f2b84b', '#ffe27a', '#7fb069', '#7ec4e6', '#b9a3e3'] }, leaves: { name: 'Blätter', cols: ['#7fb069', '#c08a3e', '#e0a35c'] },
    bubbles: { name: 'Seifenblasen', cols: ['#b8e4f5', '#ffffff'], ring: true }, fire: { name: 'Feuer', cols: ['#f2b84b', '#e86a6a', '#ffe27a'] },
    stars: { name: 'Sterne', cols: ['#ffe27a', '#f2c94c'], star: true }, snow: { name: 'Schneeflocken', cols: ['#ffffff', '#dfe7f5'] }
  };
  function trailDot(ctx, tr, x, y, col){
    ctx.fillStyle = col; x |= 0; y |= 0;
    if(tr.heart){ ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y + 1, 3, 1); ctx.fillRect(x + 1, y + 2, 1, 1) }
    else if(tr.ring){ ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1); ctx.fillRect(x + 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + 2, 1, 1) }
    else if(tr.star){ ctx.fillRect(x + 1, y, 1, 3); ctx.fillRect(x, y + 1, 3, 1) }
    else ctx.fillRect(x, y, 2, 2);
  }
  const BASEPAL = { k: INK, s: '#f7c9a3', e: '#2a2230', c: '#f29b9b', m: '#c0505a', w: '#ffffff', p: '#5a4a6b', b: '#6b4a3a' };

  function draw(ctx, rows, pal, x, y, flip = false, scale = 1){
    const w = rows[0].length;
    for(let r = 0; r < rows.length; r++) for(let c = 0; c < w; c++){
      const ch = rows[r][c]; if(ch === '.') continue;
      const col = pal[ch]; if(!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round((x + (flip ? w - 1 - c : c) * scale) * 2) / 2, Math.round((y + r * scale) * 2) / 2, scale, scale);
    }
  }
  // ---------- Hauptfigur Charlie, das Faultier (24×26 feine Pixel = 12×13 grobe) ----------
  const mir = rows => rows.map(r => r + [...r].reverse().join(''));
  const CH_HEAD = mir([
    '........kkkk', '......kkgggf', '.....kgfffff', '....kfffffff', '...kffffllll', '..kfflllllll',
    '..kfleeeelll', '.kffeeeowlll', '.kffeeeoolll', '.kffleeellln', '..kfflrllllm', '..kffflllllL', '...kkfffffff']);
  CH_HEAD[7] = '.kffeeewollllllwoeeeffk.'; // Glanzpunkt in beiden Augen oben links
  const CH_BODY = mir([
    '....kkhhhhhH', '...khhhhhhhH', '..kfkhhhhhhh', '.kffkhhhHhhh', '.kgfkhhhhhhh', '.kffkhhhhhhh', '.kffkHHHHHHH', '.kcckffffffF', '..kckkffffff']);
  const CH_LEGS = [
    ['......kfffk..kfffk......', '......kfffk..kfffk......', '.....kdddk....kdddk.....', '.....kkkk......kkkk.....'],
    ['.......kfffkkfffk.......', '......kfffk..kfffk......', '......kdddk..kdddk......', '......kkkk....kkkk......'],
    ['.....kfffk....kfffk.....', '....kfffk......kfffk....', '....kdddk......kdddk....', '....kkkk........kkkk....']];
  const CH_PAL = { k: INK, f: '#9a7656', F: '#7a5a40', g: '#b8946f', l: '#efdcbc', L: '#d9c19c', e: '#5a3f2c', o: '#1d1620', w: '#ffffff', n: '#2a1f1a', m: '#a8485a', c: '#f3ead8', r: '#f2a0a0', d: '#6e4a31' };
  // Charlie: gleiche Grösse wie die alte Figur (12×14 grobe Pixel), aber doppelt so fein gezeichnet
  function pip(ctx, x, y, look = {}, frame = 0, scale = 1, opt = {}){
    const col = COLORS[look.color] || COLORS.berry, p = scale / 2;
    const pal = { ...CH_PAL, h: col[0], H: col[1] };
    const y0 = y + scale; // Kopf beginnt eine grobe Zeile tiefer, Füsse bleiben am Boden
    const clip = opt.clip; // nur bis zu dieser Höhe zeichnen (für den Korb)
    if(clip !== undefined){ ctx.save(); ctx.beginPath(); ctx.rect(x - 40, y - 60, 12 * scale + 80, clip - (y - 60)); ctx.clip() }
    draw(ctx, CH_HEAD, pal, x, y0, false, p);
    if(look.color === 'rainbow') CH_BODY.forEach((row, i) => { const rc = RAINBOW[Math.floor(i / 2) % RAINBOW.length]; draw(ctx, [row], { ...pal, h: rc, H: rc }, x, y0 + (13 + i) * p, false, p) });
    else draw(ctx, CH_BODY, pal, x, y0 + 13 * p, false, p);
    // Strickmuster am Pulli
    ctx.fillStyle = col[1]; for(let i = 0; i < 5; i++) ctx.fillRect(x + (7 + i * 2.5) * p, y0 + 17.5 * p, p, p);
    draw(ctx, CH_LEGS[((frame | 0) % 3 + 3) % 3], pal, x, y0 + 22 * p, false, p);
    const face = FACES[look.face];
    if(face) draw(ctx, face.rows, { k: INK, ...face.pal }, x, y + (face.dy + 2) * scale, false, scale);
    const hat = HATS[look.hat];
    if(hat) draw(ctx, hat.rows, { k: INK, ...hat.pal }, x, y + (hat.dy + 1) * scale, false, scale);
    if(clip !== undefined) ctx.restore();
  }
  // ---------- Charlies Korb mit Deckel ----------
  const LIDS = {
    swiss: { name: 'Schweizer Kreuze', base: '#d93a3a', dark: '#a82828', mark: '#ffffff', pat: 'cross' },
    blue: { name: 'Sternennacht', base: '#3e5aa8', dark: '#2a3f7a', mark: '#ffe27a', pat: 'star' },
    mint: { name: 'Kleeblatt', base: '#5fc4a0', dark: '#3a9479', mark: '#2f7a4f', pat: 'clover' },
    dots: { name: 'Tupfen', base: '#f7a1c4', dark: '#d4709a', mark: '#ffffff', pat: 'dot' },
    honey: { name: 'Honigwaben', base: '#f2b84b', dark: '#c98a24', mark: '#fff3b0', pat: 'dot' },
    stripes: { name: 'Streifen', base: '#ffffff', dark: '#c3c8d8', mark: '#e86a6a', pat: 'stripe' },
    hearts: { name: 'Herzen', base: '#fff0f4', dark: '#e8c3cf', mark: '#e86a6a', pat: 'heart' },
    night: { name: 'Mondschein', base: '#2e2a4a', dark: '#1c1930', mark: '#fff7c2', pat: 'moon' },
    gold: { name: 'Gold', base: '#f2c94c', dark: '#b8902a', mark: '#fff3b0', pat: 'cross' },
    rainbow: { name: 'Regenbogen', base: '#e86a6a', dark: '#7b5fc4', mark: '#ffffff', pat: 'rainbow' }
  };
  const MARK = { cross: ['.w.', 'www', '.w.'], star: ['.w.', 'www', 'w.w'], clover: ['w.w', '.w.', 'w.w'], dot: ['ww', 'ww'], heart: ['w.w', 'www', '.w.'], moon: ['ww', 'w.', 'ww'] };
  // Korb 28×18 feine Pixel; open: 0 = zu, 1 = Deckel ganz offen (hochgeklappt)
  function basket(ctx, x, y, lidKey = 'swiss', open = 0, scale = 2){
    const p = scale / 2, L = LIDS[lidKey] || LIDS.swiss, R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a * p, y + b * p, w * p, h * p) };
    // Korb: geflochten
    R(1, 6, 26, 12, INK); R(2, 7, 24, 10, '#c99a5b');
    for(let r = 0; r < 5; r++) for(let cc = 0; cc < 12; cc++){ R(2 + cc * 2 + (r % 2), 7 + r * 2, 1, 2, '#9c6f3a') }
    R(2, 7, 24, 1, '#e0b878'); R(2, 16, 24, 1, '#8a5a30'); R(0, 6, 28, 2, INK); R(1, 6, 26, 1, '#b07a42');
    R(3, 17, 3, 1, INK); R(22, 17, 3, 1, INK);
    // Deckel
    const lift = open * 9, tilt = open;
    ctx.save(); ctx.translate(x + 1 * p, y + (6 - lift) * p); ctx.rotate(-tilt * .5);
    const D = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(a * p, b * p, w * p, h * p) };
    D(-1, -6, 28, 7, INK); D(0, -5, 26, 5, L.base); D(2, -7, 22, 2, INK); D(3, -6, 20, 1, L.base); D(0, -1, 26, 1, L.dark); D(11, -9, 4, 2, INK); D(12, -8, 2, 1, '#b07a42');
    if(L.pat === 'rainbow'){ ['#e86a6a', '#f2b84b', '#7fb069', '#7ec4e6', '#b9a3e3'].forEach((c, i) => D(0, -5 + i, 26, 1, c)) }
    else if(L.pat === 'stripe'){ for(let i = 0; i < 26; i += 4) D(i, -5, 2, 4, L.mark) }
    else { const m = MARK[L.pat] || MARK.cross; [2, 9, 16, 22].forEach((mx, j) => m.forEach((row, ry) => [...row].forEach((ch, rx) => { if(ch === 'w') D(mx + rx, -4 + ry + (j % 2 ? 0 : 0), 1, 1, L.mark) }))) }
    D(1, -5, 3, 1, '#ffffff55');
    ctx.restore();
  }
  // ---------- Pixel-Wesen fürs Album (12×12) ----------
  const SHAPES = {
    blob: ['....kkkk....', '..kkBBBBkk..', '.kBBBBBBBBk.', '.kBBWBBWBBk.', 'kBBBeBBeBBBk', 'kBBBBBBBBBBk', 'kBcBBmmBBcBk', 'kBBBBBBBBBBk', '.kBBBBBBBBk.', '.kDDDDDDDDk.', '..kkkkkkkk..', '............'],
    bird: ['....kkk.....', '...kBBBk....', '..kBBBBBk...', '..kBeBBBkkk.', '.kOkBBBBBBk.', '..kkBBBBBDk.', '...kBBBBDDk.', '...kBWWBDk..', '....kBBBk...', '.....kOk....', '.....kOk....', '....kk.kk...'],
    bunny: ['..kk....kk..', '.kBk....kBk.', '.kPk....kPk.', '.kBk....kBk.', '..kkBBBBkk..', '.kBBBBBBBBk.', '.kBeBBBBeBk.', '.kBBcmmcBBk.', '..kBBBBBBk..', '.kBBWWWWBBk.', '.kBBBBBBBBk.', '..kkk..kkk..'],
    snail: ['............', '.....kkkk...', '....kSSSSk..', '...kSkkkSSk.', '...kSkSSkSk.', 'k..kSkkSkSk.', 'kek.kSSSkSk.', 'kBk..kkkSSk.', 'kBBkkkkkkkk.', 'kBBBBBBBBBk.', '.kkkkkkkkkk.', '............'],
    frog: ['.kkk....kkk.', 'kWWek..kWWek', 'kWWWkkkkWWWk', '.kBBBBBBBBk.', 'kBBBBBBBBBBk', 'kBBmmmmmmBBk', 'kBBBBBBBBBBk', '.kBDDDDDDBk.', 'kBBkBBBBkBBk', 'kBk.kBBk.kBk', 'kkk.kkkk.kkk', '............'],
    owl: ['.k........k.', 'kBk......kBk', 'kBBkkkkkkBBk', 'kBWWBBBBWWBk', 'kWWeWBBWeWWk', 'kBWWBOOBWWBk', 'kBBBBOOBBBBk', 'kBDDDDDDDDBk', 'kBDDDDDDDDBk', '.kBDDDDDDBk.', '..kOOkkOOk..', '..kkk..kkk..'],
    cat: ['.k.......k..', 'kBk.....kBk.', 'kPBkkkkkBPk.', 'kBBBBBBBBBk.', 'kBeBBBBBeBk.', 'kBBBcmcBBBk.', '.kBBBBBBBk..', '..kBBBBBk..k', '.kBBBBBBBkBk', '.kBWBBBWBkk.', '.kBkBkBkBk..', '.kk.kk.kk...'],
    dragon: ['...k...k....', '..kOk.kOk...', '..kBBkBBk...', '.kBBBBBBBk..', 'kBBeBBBeBBk.', 'kBBBBBBBBBkk', 'kBBBmmBBBkWk', '.kBBBBBBkWWk', 'kBDDDDDBBkWk', 'kBDDDDDBBBk.', '.kBBkkBBBk..', '.kkk.kkkk...'],
    fox: ['.k........k.', 'kOk......kOk', 'kOOk....kOOk', 'kOOOkkkkOOOk', '.kOOOOOOOOk.', '.kOeOOOOeOk.', '.kOOWkkWOOk.', '..kWWWWWWk..', '...kOOOOk...', '..kOOOOOOk..', '..kOkOOkOk..', '..kk.kk.kk..']
  };
  const CREATURES = [
    ['croquette', 'Croquette', 'blob', '#f2b84b', '#c98a24', 0], ['pomponne', 'Pomponne', 'blob', '#f7a1c4', '#d4709a', 0], ['menthe', 'Menthe', 'blob', '#5fc4a0', '#3a9479', 0],
    ['piou', 'Piou', 'bird', '#7ec4e6', '#4a8fb5', 0], ['cerise', 'Cerise', 'bird', '#e86a6a', '#b54646', 0], ['lilas', 'Lilas', 'bird', '#b9a3e3', '#8a72bf', 1],
    ['noisette', 'Noisette', 'bunny', '#c9a27e', '#8f6c4e', 0], ['flocon', 'Flocon', 'bunny', '#f4f1ff', '#c3bde0', 1], ['caramel', 'Caramel', 'bunny', '#e0a35c', '#a8743a', 0],
    ['escargot', 'Escargot', 'snail', '#a7d18a', '#6e9b55', 0], ['galette', 'Galette', 'snail', '#f2c94c', '#b8902a', 1], ['orage', 'Orage', 'snail', '#6c7bb5', '#465390', 1],
    ['renardo', 'Renardo', 'fox', '#ef8a4a', '#b85e2a', 1], ['neige', 'Neige', 'fox', '#eef2fb', '#b8c2d8', 2], ['etoile', 'Étoile', 'blob', '#ffe27a', '#e0a92a', 2], ['minuit', 'Minuit', 'fox', '#4b5a8a', '#2f3a63', 2],
    ['grenouille', 'Grenouille', 'frog', '#7fd06b', '#4f9e45', 0], ['rainette', 'Rainette', 'frog', '#6cc3e8', '#3f8fb5', 1], ['hibou', 'Hibou', 'owl', '#b08560', '#7d5a3c', 0], ['chouette', 'Chouette', 'owl', '#f1ede4', '#c9c0ad', 1],
    ['minou', 'Minou', 'cat', '#f2a654', '#c47a2c', 0], ['mistigri', 'Mistigri', 'cat', '#4a4458', '#2e2a3a', 1], ['dragonnet', 'Dragonnet', 'dragon', '#8fd46b', '#5a9e45', 2], ['flamme', 'Flamme', 'dragon', '#ef7a5a', '#b84e33', 2]
  ];
  const petStage = n => n >= 6 ? 3 : n >= 3 ? 2 : 1;
  function creature(ctx, id, x, y, scale = 1, stage = 1, t = 0){
    const c = CREATURES.find(c => c[0] === id); if(!c) return;
    const pal = { k: INK, B: c[3], D: c[4], W: '#ffffff', e: '#2a2230', c: '#f29b9b', m: c[2] === 'frog' ? '#c0505a' : '#c0505a', O: c[2] === 'fox' ? c[3] : '#f2a23a', P: '#f7a1c4', S: c[4] };
    draw(ctx, SHAPES[c[2]], pal, x, y, false, scale);
    if(stage >= 2){ ctx.fillStyle = '#fff7c2'; [[-2, 2], [12, 4], [-1, 9], [12, 10]].forEach(([dx, dy], i) => { if(Math.sin(t * 6 + i * 1.7) > -.2) ctx.fillRect(x + dx * scale, y + dy * scale, scale, scale) }) }
    if(stage >= 3) draw(ctx, ['k.k.k', 'kYkYk', 'kYYYk', 'kkkkk'], { k: INK, Y: '#f2c94c' }, x + 4 * scale, y - 4 * scale, false, scale);
  }
  // ---------- Boss-Wolke (20×16) ----------
  const BOSS = [
    '.......kkkkk........', '.....kkBBBBBkk......', '....kBBBBBBBBBkkk...', '..kkBBBBBBBBBBBBBk..', '.kBBBBBBBBBBBBBBBBk.', '.kBBkkBBBBBBBkkBBBk.',
    'kBBBBBkkBBBkkBBBBBBk', 'kBBBBkeekBkeekBBBBBk', 'kBBBBkeekBkeekBBBBBk', 'kBBBBBkkBBBkkBBBBBBk', 'kBBBBBBBkkkBBBBBBBBk', '.kBBBBBkBBBkBBBBBBk.',
    '.kDDBBBBBBBBBBBBDDk.', '..kDDDDDDDDDDDDDDk..', '...kkkkkkkkkkkkkk...', '....................'];
  function boss(ctx, x, y, base, dark, hurt = false, scale = 1){
    draw(ctx, BOSS, { k: INK, B: hurt ? '#ffffff' : base, D: hurt ? '#ffd0d0' : dark, e: '#fff7c2' }, x, y, false, scale);
  }
  // ---------- Truhe (16×13) ----------
  const CHEST = ['..kkkkkkkkkkkk..', '.kWWWWWWWWWWWWk.', 'kWwwwwwwwwwwwwWk', 'kWwwwwwwwwwwwwWk', 'kkkkkkkYYkkkkkkk', 'kWWWWWkYYkWWWWWk', 'kWwwwwkkkkwwwwWk', 'kWwwwwwwwwwwwwWk', 'kWwwwwwwwwwwwwWk', 'kWwwwwwwwwwwwwWk', 'kWWWWWWWWWWWWWWk', '.kkkkkkkkkkkkkk.'];
  function chest(ctx, x, y, scale = 1, gold = false){ draw(ctx, CHEST, { k: INK, W: gold ? '#c98a24' : '#8a5a3c', w: gold ? '#f2c94c' : '#b07a52', Y: '#f2c94c' }, x, y, false, scale) }

  // ---------- Landschaften ----------
  const THEMES = [
    { name: 'Wiese', sky: ['#ffe3c4', '#f7c2c9', '#e5b3d3'], hill1: '#c3d9a0', hill2: '#8fc276', hill3: '#6aa55d', ground: '#7a5236', grass: '#7fb069', boss: ['#9aa0b8', '#6c7290'], bossName: 'Grognon' },
    { name: 'See', sky: ['#d8f0ff', '#b9dcf2', '#c9c4ee'], hill1: '#a9cfe0', hill2: '#7fb6cc', hill3: '#5a9a8a', ground: '#6e5038', grass: '#6aa86f', boss: ['#7f8fb0', '#55628a'], bossName: 'Brumo' },
    { name: 'Herbst', sky: ['#ffe2b5', '#f9c28f', '#f0a39a'], hill1: '#e8b77a', hill2: '#d48f52', hill3: '#a8683a', ground: '#6b4430', grass: '#c08a3e', boss: ['#a98a8a', '#7a5e5e'], bossName: 'Ronchon' },
    { name: 'Abendrot', sky: ['#ffd3b0', '#f3a3b5', '#b897d6'], hill1: '#d8a3c4', hill2: '#a983b8', hill3: '#7d6aa3', ground: '#5c4258', grass: '#8a7bb5', boss: ['#8c7aa8', '#63557f'], bossName: 'Bougon' },
    { name: 'Schnee', sky: ['#eef3ff', '#d9e2f7', '#c9cdee'], hill1: '#ffffff', hill2: '#dfe7f5', hill3: '#b9c7e0', ground: '#7f7a95', grass: '#e9f0fb', boss: ['#a3b1cc', '#75839f'], bossName: 'Frisson' },
    { name: 'Garten', sky: ['#fff0c9', '#ffd6a8', '#f6b9a8'], hill1: '#d6e6a0', hill2: '#a7cf7c', hill3: '#7fb069', ground: '#7a5236', grass: '#8cc06b', boss: ['#b0a080', '#82735a'], bossName: 'Grincheux' }
  ];
  const W = 320, H = 180, GROUND = 150;
  function hash(n){ n = Math.sin(n * 127.1) * 43758.5453; return n - Math.floor(n) }
  function sky(ctx, th, night){
    const cols = night ? ['#2b2440', '#3b3160', '#5a4a80'] : th.sky;
    const band = H / 3;
    for(let i = 0; i < 3; i++){ ctx.fillStyle = cols[i]; ctx.fillRect(0, i * band | 0, W, band + 1 | 0) }
    // Pixel-Dither zwischen den Bändern
    for(let i = 1; i < 3; i++){ ctx.fillStyle = cols[i]; for(let x = 0; x < W; x += 2) ctx.fillRect(x + (i % 2), (i * band | 0) - 2, 1, 1), ctx.fillRect(x, (i * band | 0) - 4, 1, 1) }
  }
  function hills(ctx, col, base, amp, freq, off, seed){
    ctx.fillStyle = col;
    for(let x = 0; x < W; x++){
      const wx = x + off;
      const h = Math.sin((wx + seed) * freq) * amp + Math.sin((wx + seed * 3) * freq * 2.3) * amp * .35;
      const top = Math.round(base - h);
      ctx.fillRect(x, top, 1, H - top);
      if(hash(wx * .5 + seed) > .5){ ctx.fillStyle = '#ffffff22'; ctx.fillRect(x, top, 1, .5); ctx.fillStyle = col }
      if(hash(wx * 1.9 + seed) > .97){ ctx.fillStyle = '#00000018'; ctx.fillRect(x, top + 4 + hash(wx) * 10, .5, .5); ctx.fillStyle = col }
    }
  }
  const hp = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h) }; // feine Pixel (halbe Einheiten erlaubt)
  function cloud(ctx, x, y, s){
    hp(ctx, x + 2 * s, y, 8 * s, 2 * s, '#fffaf2'); hp(ctx, x, y + 2 * s, 14 * s, 3 * s, '#fffaf2'); hp(ctx, x + 4 * s, y - 2 * s, 5 * s, 2 * s, '#fffaf2');
    hp(ctx, x + 1.5 * s, y + .5 * s, .5 * s, 1.5 * s, '#fffaf2'); hp(ctx, x + 10 * s, y + .5 * s, .5 * s, 1.5 * s, '#fffaf2'); hp(ctx, x - .5 * s, y + 2.5 * s, .5 * s, 2 * s, '#fffaf2'); hp(ctx, x + 14 * s, y + 2.5 * s, .5 * s, 2 * s, '#fffaf2');
    hp(ctx, x + 4.5 * s, y - 1.5 * s, 2 * s, .5 * s, '#ffffff'); hp(ctx, x + 2.5 * s, y + .5 * s, 3 * s, .5 * s, '#ffffff');
    hp(ctx, x, y + 4 * s, 14 * s, 1 * s, '#f3e4dc'); hp(ctx, x + 1 * s, y + 3.5 * s, 12 * s, .5 * s, '#f8ede6');
  }
  function tree(ctx, x, y, th){
    hp(ctx, x + 4, y + 10, 4, 9, INK); hp(ctx, x + 5, y + 10, 2, 9, '#6b4a3a'); hp(ctx, x + 5, y + 11, .5, 7, '#8a6248'); hp(ctx, x + 6.5, y + 13, .5, 2, '#4f3528');
    // runde Krone aus Blätterbüscheln
    hp(ctx, x + 1, y - 2, 10, 1, INK); hp(ctx, x - 1, y, 14, 9, INK); hp(ctx, x, y - 1, 12, 12, INK); hp(ctx, x + 1, y + 11, 10, 1, INK);
    hp(ctx, x + 1, y - 1, 10, 12, th.hill3); hp(ctx, x, y, 12, 10, th.hill3);
    hp(ctx, x + 1.5, y, 6, 4, th.hill2); hp(ctx, x + 1, y + 1, 4, 4, th.hill2); hp(ctx, x + 7, y + 4, 3, 2.5, th.hill2);
    hp(ctx, x + 2.5, y + .5, 1.5, 1, '#ffffff55'); hp(ctx, x + 2, y + 1.5, .5, .5, '#ffffff77');
    for(let i = 0; i < 6; i++){ const a = hash(x * .37 + i * 3.1), b = hash(x * .91 + i); hp(ctx, x + 1 + a * 10, y + 1 + b * 9, .5, .5, i % 2 ? '#00000022' : '#ffffff33') }
    hp(ctx, x + 1, y + 9, 10, 1, '#00000022');
    if(hash(x * 1.3) > .6){ hp(ctx, x + 8, y + 2, 1, 1, '#e86a6a'); hp(ctx, x + 3, y + 6, 1, 1, '#e86a6a'); hp(ctx, x + 8.25, y + 2, .5, .5, '#ffc0c0') }
  }
  function house(ctx, x, y){
    hp(ctx, x - 1, y + 5, 20, 15, INK); hp(ctx, x - 3, y + 3, 24, 4, INK); hp(ctx, x + 2, y - 2, 14, 6, INK);
    hp(ctx, x, y + 6, 18, 13, '#fff3dd'); hp(ctx, x, y + 6, 18, .5, '#e9d9bd');
    for(let i = 0; i < 4; i++) hp(ctx, x + .5, y + 8 + i * 3, 17, .5, '#f3e6cc');
    hp(ctx, x - 2, y + 4, 22, 2, '#d9645c'); hp(ctx, x + 3, y - 1, 12, 5, '#d9645c');
    for(let i = 0; i < 6; i++) hp(ctx, x + 3.5 + i * 2, y - .5 + (i % 2), .5, 4, '#b84d47');
    hp(ctx, x + 3, y - 1, 12, .5, '#ef8a80');
    hp(ctx, x + 2.5, y + 8.5, 5, 5, INK); hp(ctx, x + 3, y + 9, 4, 4, '#f2c94c'); hp(ctx, x + 4.75, y + 9, .5, 4, INK); hp(ctx, x + 3, y + 10.75, 4, .5, INK); hp(ctx, x + 3.25, y + 9.25, 1, 1, '#fff3b0');
    hp(ctx, x + 10.5, y + 10.5, 5, 8.5, INK); hp(ctx, x + 11, y + 11, 4, 8, '#8a5a3c'); hp(ctx, x + 11.5, y + 11.5, 1.5, 3, '#a8744f'); hp(ctx, x + 14, y + 15, .5, .5, '#f2c94c');
    hp(ctx, x + 1, y + 17, 2, 2, '#7fb069'); hp(ctx, x + 1.5, y + 16.5, .5, .5, '#f7a1c4'); hp(ctx, x + 16, y + 17, 2, 2, '#7fb069'); hp(ctx, x + 16.5, y + 16.5, .5, .5, '#fff3b0');
  }
  function ground(ctx, th, off, gaps = []){
    for(let x = 0; x < W; x++){
      if(gaps.some(([a, b]) => x >= a && x < b)) continue;
      const wx = Math.floor(x + off);
      hp(ctx, x, GROUND + 3, 1, H - GROUND, th.ground);
      hp(ctx, x, GROUND, 1, 4 + (hash(wx) > .7 ? 1 : 0), th.grass);
      // Grashalme und Schatten in feinen Pixeln
      const hb = hash(wx * 1.7);
      if(hb > .45) hp(ctx, x + (hb > .7 ? .5 : 0), GROUND - .5 - (hb > .85 ? .5 : 0), .5, hb > .85 ? 1 : .5, th.grass);
      if(hash(wx * 2.3) > .6) hp(ctx, x, GROUND + 2.5, .5, .5, '#00000022');
      hp(ctx, x, GROUND + 4 + (hash(wx) > .7 ? 1 : 0), 1, .5, '#00000026');
      if(hash(wx * 7) > .93){ hp(ctx, x, GROUND + 10 + (wx % 13), 2, 2, '#00000022'); hp(ctx, x, GROUND + 10 + (wx % 13), 1, .5, '#ffffff22') }
      if(hash(wx * 11) > .9) hp(ctx, x + .5, GROUND + 7 + (wx % 17), .5, .5, '#ffffff1a');
      if(hash(wx * 3) > .96){ const fc = ['#f7a1c4', '#fff3b0', '#ffffff', '#b9a3e3'][wx % 4]; hp(ctx, x + .5, GROUND - 1.5, .5, 1.5, th.hill3); hp(ctx, x, GROUND - 3, 1.5, 1.5, fc); hp(ctx, x + .5, GROUND - 2.5, .5, .5, '#f2c94c') }
    }
    hp(ctx, 0, GROUND - 1, W, 1, INK);
    gaps.forEach(([a, b]) => { hp(ctx, a, GROUND + 8, b - a, H - GROUND, '#7ec4e6'); hp(ctx, a, GROUND + 8, b - a, .5, '#b8e4f5'); ctx.fillStyle = '#b8e4f5'; for(let x = a; x < b; x += 6) ctx.fillRect(x + ((off / 3 | 0) % 6), GROUND + 9, 3, .5);
      ctx.fillStyle = '#5aa8d0'; for(let x = a + 2; x < b; x += 9) ctx.fillRect(x + ((off / 5 | 0) % 9), GROUND + 14, 2, .5) });
  }
  function scene(ctx, th, t, off, opts = {}){
    const night = !!opts.night;
    sky(ctx, th, night);
    if(night){
      for(let i = 0; i < 40; i++){ const x = hash(i) * W | 0, y = hash(i + 50) * 90 | 0; ctx.fillStyle = (Math.sin(t * 2 + i) > .3) ? '#fff7c2' : '#b9a3e3'; ctx.fillRect(x, y, 1, 1) }
      ctx.fillStyle = '#fff7c2'; ctx.fillRect(250, 20, 16, 16); ctx.fillStyle = '#5a4a80'; ctx.fillRect(256, 18, 12, 14);
    } else {
      ctx.fillStyle = '#fff3c9'; ctx.fillRect(244, 26, 18, 18); ctx.fillRect(243, 27, 20, 16); ctx.fillStyle = '#ffe08a'; ctx.fillRect(246, 28, 14, 14); ctx.fillStyle = '#fff6c8'; ctx.fillRect(247, 29, 4, 2); ctx.fillRect(247, 29, 2, 4);
      ctx.fillStyle = '#fff3c955'; for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2 + t * .2, r = 14 + Math.sin(t * 2 + i) * 1.5; ctx.fillRect(253 + Math.cos(a) * r, 35 + Math.sin(a) * r, 1, 1) }
      for(let i = 0; i < 5; i++){ const cx = ((i * 83 - off * .15 - t * 4) % (W + 60) + W + 60) % (W + 60) - 40; cloud(ctx, cx | 0, 18 + (i * 17) % 40, 2) }
    }
    hills(ctx, night ? '#463a6a' : th.hill1, 112, 10, .018, off * .2, 10);
    hills(ctx, night ? '#3a305a' : th.hill2, 128, 9, .03, off * .45, 50);
    // Häuser und Bäume auf der mittleren Ebene
    const o3 = off * .7;
    for(let i = Math.floor(o3 / 46) - 1; i < Math.floor(o3 / 46) + 9; i++){
      const x = Math.round(i * 46 - o3), r = hash(i + 3);
      if(r > .8) house(ctx, x, 122); else if(r > .3) tree(ctx, x, 124 + (r * 6 | 0), night ? { hill3: '#2f2850', hill2: '#3e3566' } : th);
    }
    hills(ctx, night ? '#2f2850' : th.hill3, 146, 4, .05, off * .7, 90);
    ground(ctx, night ? { ground: '#3a2e45', grass: '#5a5285', hill3: '#2f2850' } : th, off, opts.gaps || []);
    if(night) for(let i = 0; i < 8; i++){ const x = (hash(i + 9) * W + Math.sin(t + i) * 10) | 0, y = 90 + (hash(i + 20) * 50 + Math.cos(t * 1.3 + i) * 6) | 0; ctx.fillStyle = Math.sin(t * 3 + i) > 0 ? '#fff7a0' : '#d8e07a'; ctx.fillRect(x, y, 2, 2) }
  }
  function platform(ctx, x, y, w, col, dark, crumble = 0){
    if(crumble > 0) y += crumble * crumble * 60;
    ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, w + 2, 12);
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(x, y + 4, w, 6);
    ctx.fillStyle = '#b07a52'; for(let i = 0; i < w; i += 8) ctx.fillRect(x + i + 1, y + 5, 5, 1);
    ctx.fillStyle = '#6e4630'; for(let i = 3; i < w; i += 8) ctx.fillRect(x + i, y + 7.5, 3, .5);
    ctx.fillStyle = INK; for(let i = 2; i < w; i += 12) ctx.fillRect(x + i, y + 5.5, .5, .5);
    ctx.fillStyle = col; ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#ffffff44'; ctx.fillRect(x, y, w, .5);
    ctx.fillStyle = dark; ctx.fillRect(x, y + 3, w, 1);
    ctx.fillStyle = dark; for(let i = 1; i < w; i += 5) ctx.fillRect(x + i, y + 4, .5, 1 + (i % 3) * .5);
    ctx.fillStyle = INK; ctx.fillRect(x + w / 2 - 1 | 0, y - 12, 1, 12);
    ctx.fillStyle = col; ctx.fillRect(x + w / 2 | 0, y - 12, 7, 5);
    ctx.fillStyle = INK; ctx.fillRect(x + w / 2 | 0, y - 13, 8, 1); ctx.fillRect(x + w / 2 + 7 | 0, y - 12, 1, 5); ctx.fillRect(x + w / 2 | 0, y - 7, 8, 1);
  }
  function coin(ctx, x, y, t){
    const w = Math.max(1, Math.round(Math.abs(Math.cos(t * 6)) * 6));
    ctx.fillStyle = INK; ctx.fillRect(x - w / 2 - 1 | 0, y - 4, w + 2, 9);
    ctx.fillStyle = '#f2c94c'; ctx.fillRect(x - w / 2 | 0, y - 3, w, 7);
    ctx.fillStyle = '#fff3b0'; if(w > 2) ctx.fillRect(x - w / 2 + 1 | 0, y - 2, 1, 3);
  }
  function ctx(cv){ if(!cv._lw){ cv._lw = cv.width; cv._lh = cv.height; cv.width = cv._lw * 2; cv.height = cv._lh * 2 } const c = cv.getContext('2d'); c.setTransform(2, 0, 0, 2, 0, 0); c.imageSmoothingEnabled = false; return c }
  return { ctx, LIDS, basket, W, H, GROUND, COLORS, HATS, FACES, TRAILS, trailDot, petStage, CREATURES, THEMES, INK, draw, pip, creature, boss, chest, scene, platform, coin, hash };
})();
