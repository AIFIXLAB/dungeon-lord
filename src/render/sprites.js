// Pixel Art Sprites 16x16 — วาดจากข้อความ (ตัวอักษร = สีจาก palette) แล้ว cache เป็น canvas
// o=outline a=สีหลัก b=เงา c=ไฮไลต์ e=ตา w=ขาว d=รายละเอียด m=โลหะ h=ผม/หมวก s=ผิว

export const SPRITES = {
  slime: [
    '................',
    '................',
    '................',
    '................',
    '......oooo......',
    '....ooaaaaoo....',
    '...oaccaaaaao...',
    '..oaccaaaaaaao..',
    '..oaawwaaawwao..',
    '.oaaaweaaaweaao.',
    '.oaaaaaaaaaaaao.',
    '.oaaaaabbaaaaao.',
    '.obaaaaaaaaaabo.',
    '..obbbbbbbbbbo..',
    '...oooooooooo...',
    '................',
  ],
  goblin: [
    '................',
    '.....oooooo.....',
    '....oaaaaaao....',
    '.oo.oaaaaaao.oo.',
    '.oaooawaawaooao.',
    '..oaaaeaaeaaao..',
    '...oaaaaaaaao...',
    '....oawwwwao....',
    '.....oaaaao.....',
    '....oddddddo....',
    '...oaddddddao...',
    '...oaoddddoao...',
    '.....oddddo.....',
    '.....obbobbo....',
    '....oobo.oboo...',
    '................',
  ],
  skeleton: [
    '................',
    '.....oooooo.....',
    '....oaaaaaao....',
    '....oaooaooa....',
    '....oaoeaoea....',
    '....oaaaaaao....',
    '.....oawawo.....',
    '......oaao......',
    '....ooaaaaoo....',
    '...oa.obbo.ao...',
    '...oa.oaao.ao...',
    '....o.obbo.o....',
    '......oaao......',
    '.....oa..ao.....',
    '....ooa..aoo....',
    '................',
  ],
  bat: [
    '................',
    '................',
    '................',
    '.o............o.',
    '.oo..o....o..oo.',
    '.oao.oo..oo.oao.',
    '.oaaoaaooaaoaao.',
    '.oabaaeaaeaabao.',
    '.oaabaaaaaabaao.',
    '..oaabawwabaao..',
    '..oaa.oaao.aao..',
    '...oo..oo..oo...',
    '................',
    '................',
    '................',
    '................',
  ],
  kobold: [
    '................',
    '................',
    '....oo....oo....',
    '....oaooooao....',
    '....oaaaaaao....',
    '...oaaeaaeaao...',
    '...oaaaaaaaaoo..',
    '....oaawwaaaao..',
    '.....oaaaaooo...',
    '....oddddddo....',
    '...oaddddddao...',
    '...oa.dddd.ao...',
    '......dddd...ob.',
    '.....obbobbo.ob.',
    '....oob..boo....',
    '................',
  ],
  wolf: [
    '................',
    '................',
    '................',
    '..oo............',
    '.oaao...........',
    '.oaaaoo.........',
    'oaeaaaaooooooo..',
    'owaaaaaaaaaaaaoo',
    '.oowaaaaaaaaaaao',
    '...oaacccaaaabo.',
    '...oaaaaaaaaabo.',
    '...oabooooobao..',
    '...oao.....oao..',
    '...ob.......ob..',
    '...oo.......oo..',
    '................',
  ],
  spider: [
    '................',
    '................',
    '................',
    '................',
    '.o.....oo.....o.',
    '..o...oaao...o..',
    '...oooaaaaooo...',
    'o..oaaaaaaaao..o',
    '.ooaaeaaaaeaaoo.',
    '...oaaaaaaaao...',
    '..o.oaabbaao.o..',
    '.o..oaaaaaao..o.',
    'o....oaaaao....o',
    '......oooo......',
    '................',
    '................',
  ],
  imp: [
    '................',
    '...o........o...',
    '...oo......oo...',
    '....odooooodo...',
    '....oaaaaaaao...',
    '...oaawaawaaao..',
    '...oaaeaaeaaao..',
    'oo..oaaddaao..oo',
    'oaoooaaaaaaoooao',
    '.oaaoaaaaaaoaao.',
    '..oo.oaaaao.oo..',
    '.....oabbao.....',
    '.....oa..ao...o.',
    '....oo....oo.od.',
    '..............o.',
    '................',
  ],
  myconid: [
    '................',
    '.....oooooo.....',
    '...ooaacaaaoo...',
    '..oaacaaacaaao..',
    '.oaaaaaaaaaaaao.',
    '.ocaaacaaaaacao.',
    '.oobbbbbbbbbboo.',
    '...occccccccoo..',
    '....occecceco...',
    '....occccccco...',
    '...ooccccccoo...',
    '..oc.occcco.co..',
    '.....occcco.....',
    '.....oc..co.....',
    '....ooo..ooo....',
    '................',
  ],
  ghost: [
    '................',
    '................',
    '.....oooooo.....',
    '....oaaaaaao....',
    '...oaaaaaaaao...',
    '...oaaeaaeaao...',
    '...oaaeaaeaao...',
    '...oaaaaaaaao...',
    '..oaaaaoaaaaao..',
    '..oaaaaaaaaaao..',
    '..oaaaaaaaaaao..',
    '..obaaaaaaaabo..',
    '..obbaaaaaabbo..',
    '..obobbobbobo...',
    '..o.o..o..o.o...',
    '................',
  ],
  golem: [
    '................',
    '.....oooooo.....',
    '....oaaaaaao....',
    '....oaeaaeao....',
    '..oooaaaaaaooo..',
    '.oaaobbbbbboaao.',
    'oaaaoaaaaaaoaaao',
    'oabaoaaabaaoabao',
    'oaaaoaaaaaaoaaao',
    'obbo.oaaaao.obbo',
    '.oo..oabbao..oo.',
    '.....oaaaao.....',
    '....oaao.oaao...',
    '....oaao.oaao...',
    '...ooooo.ooooo..',
    '................',
  ],
  dragon: [
    '................',
    '..o.....o.......',
    '..oo...oo.......',
    '..oaoooao.......',
    '..oaaaaaao..oo..',
    '.oaeaaaaao.oaao.',
    '.owwaaaaaoooaaao',
    '..oooaaaaaaaaaao',
    '...oaaddaaaaaao.',
    '..oaaddddaaabo..',
    '.oaaaddddaaabo..',
    '.oaaaaddaaaaao..',
    '..oaabaaaabao...',
    '..oao.....oao.ao',
    '..oo.......ooaao',
    '..............o.',
  ],
  robe: [
    '................',
    '.......oo.......',
    '......oaao......',
    '.....oaaaao.....',
    '....oaaaaaao....',
    '....oaoeeoao....',
    '....oaosssoao...',
    '.....oaaaaao....',
    '....oaabbaaao...',
    '...osaabbaaaso..',
    '...o.aabbaaa.o..',
    '....oaabbaaao...',
    '....oaabbaaao...',
    '...oaaabbaaaao..',
    '...oooooooooooo.',
    '................',
  ],
  hero: [
    '................',
    '......hhhh......',
    '.....hhhhhh.....',
    '.....hsssshh....',
    '.....seseesh....',
    '.....ssssss.....',
    '......ssss......',
    '....oaaaaaao....',
    '...saaaaaaaas...',
    '...saabaabaas...',
    '...s.aaaaaa.s...',
    '....obbbbbbo....',
    '....obbo.bbo....',
    '....oo....oo....',
    '...ooo....ooo...',
    '................',
  ],
};

const BASE_COLORS = { o: '#1a1020', w: '#ffffff', e: '#1a1020', s: '#f0c8a0', m: '#c8c8d0', h: '#6a4a2a', d: '#6a4a2a', c: '#ffffff', b: '#000000', a: '#888888' };

const cache = new Map();

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

// palette: { a, b, c, d, e, ... }, accessory: 'crown' | 'crown_gold' | 'helm' | 'helm_dark' | 'hood' | 'mask' | 'horns'
export function getSprite(name, palette = {}, accessory = null, variant = 'normal') {
  const key = `${name}|${JSON.stringify(palette)}|${accessory}|${variant}`;
  if (cache.has(key)) return cache.get(key);
  const rows = SPRITES[name] || SPRITES.slime;
  const cv = makeCanvas(16, 16);
  const ctx = cv.getContext('2d');
  const pal = { ...BASE_COLORS, ...palette };
  if (!palette.b && palette.a) pal.b = shade(palette.a, -0.35);
  if (!palette.c && palette.a) pal.c = shade(palette.a, 0.45);
  for (let y = 0; y < 16; y++) {
    const row = (rows[y] || '').padEnd(16, '.');
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      ctx.fillStyle = variant === 'white' ? '#ffffff' : variant === 'shadow' ? '#000000' : (pal[ch] || '#ff00ff');
      ctx.fillRect(x, y, 1, 1);
    }
  }
  if (accessory && variant === 'normal') drawAccessory(ctx, accessory, name);
  if (accessory && variant === 'white') { ctx.globalCompositeOperation = 'source-atop'; }
  cache.set(key, cv);
  return cv;
}

function drawAccessory(ctx, acc, base) {
  const top = base === 'slime' ? 3 : base === 'skeleton' || base === 'goblin' ? 0 : 1;
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  if (acc === 'crown' || acc === 'crown_gold') {
    const g = acc === 'crown_gold' ? '#ffd84a' : '#e8c84a', r = acc === 'crown_gold' ? '#ff3a6a' : '#3a8aff';
    for (let x = 5; x <= 10; x++) px(x, top + 1, g);
    px(5, top, g); px(7, top, g); px(8, top, g); px(10, top, g); px(7, top + 1, r); px(8, top + 1, r);
    for (let x = 5; x <= 10; x++) px(x, top + 2, '#1a1020');
  } else if (acc === 'helm' || acc === 'helm_dark') {
    const m = acc === 'helm' ? '#a8b0c8' : '#3a3a4a', h = acc === 'helm' ? '#e8e8f0' : '#a82a2a';
    for (let x = 4; x <= 11; x++) { px(x, top + 1, m); px(x, top + 2, m); }
    for (let x = 5; x <= 10; x++) px(x, top, m);
    px(7, top - 1 < 0 ? 0 : top - 1, h); px(8, top - 1 < 0 ? 0 : top - 1, h);
  } else if (acc === 'hood') {
    for (let x = 4; x <= 11; x++) px(x, top + 1, '#2a2a35');
    for (let x = 5; x <= 10; x++) px(x, top, '#2a2a35');
  } else if (acc === 'mask') {
    for (let x = 4; x <= 11; x++) px(x, top + 6, '#1a1a22');
  } else if (acc === 'horns') {
    px(3, top, '#ffe8a8'); px(4, top + 1, '#ffe8a8'); px(12, top, '#ffe8a8'); px(11, top + 1, '#ffe8a8');
  }
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`;
}

// Silhouette สีขาวสำหรับ hit flash
export function getFlash(name, palette, accessory) {
  return getSprite(name, palette, null, 'white');
}

// ไอคอนสำหรับ UI (data URL) — ใช้ใน DOM
const iconCache = new Map();
export function spriteDataURL(name, palette, accessory, scale = 3) {
  const key = `${name}|${JSON.stringify(palette)}|${accessory}|${scale}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const src = getSprite(name, palette, accessory);
  const c = document.createElement('canvas'); c.width = 16 * scale; c.height = 16 * scale;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, 16 * scale, 16 * scale);
  const url = c.toDataURL();
  iconCache.set(key, url);
  return url;
}

// ---------- ไอเทม (ไอคอน 8x8 วาดโปรแกรม) ----------
export const ITEM_ICONS = {
  weapon: ['......mo', '.....mo.', '....mo..', '...mo...', '.dmo....', '..d.....', '.d.d....', 'd.......'],
  armor: ['.aa..aa.', 'aaaaaaaa', 'aabaabaa', '.aaaaaa.', '.aaaaaa.', '.abbbba.', '.aaaaaa.', '........'],
  helmet: ['..mmmm..', '.mmmmmm.', 'mmmmmmmm', 'mmoooomm', 'mm....mm', 'm......m', '........', '........'],
  shield: ['.mmmmmm.', 'mmaaaamm', 'maaddaam', 'maddddam', 'maaddaam', '.maaaam.', '..mmmm..', '...mm...'],
  ring: ['...dd...', '..dccd..', '..mmmm..', '.m....m.', '.m....m.', '.m....m.', '..mmmm..', '........'],
  necklace: ['m......m', '.m....m.', '..m..m..', '...mm...', '...dd...', '..dccd..', '...dd...', '........'],
  potion: ['...oo...', '...mm...', '..oaao..', '.oaaaao.', '.acaaaa.', '.aaaaaa.', '..aaaa..', '........'],
  material: ['........', '..aab...', '.aaaabb.', 'aacaaab.', 'aaaaabb.', '.abbbb..', '........', '........'],
  crystal: ['...cc...', '..caac..', '.caaaac.', '.caaaab.', '.caaaab.', '..cabb..', '...bb...', '........'],
};

export function itemIconURL(type, color, scale = 4) {
  const key = `${type}|${color}|${scale}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const rows = ITEM_ICONS[type] || ITEM_ICONS.material;
  const pal = { a: color, b: shade(color, -0.35), c: shade(color, 0.5), m: '#c8c8d0', d: '#8a5a2a', o: '#2a2030' };
  const c = document.createElement('canvas'); c.width = 8 * scale; c.height = 8 * scale;
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return; ctx.fillStyle = pal[ch] || color; ctx.fillRect(x * scale, y * scale, scale, scale);
  }));
  const url = c.toDataURL();
  iconCache.set(key, url);
  return url;
}
