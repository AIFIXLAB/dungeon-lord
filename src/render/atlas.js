// Atlas loader — sprite ที่ตัดจาก sprite sheet (assets/sprites/*.png + atlas.json) และภาพห้อง (assets/rooms/*.webp)
// รองรับการฝังไฟล์ไว้ใน window.__ASSETS__ (ใช้ในไฟล์พรีวิวแบบไฟล์เดียว)
const A = (typeof window !== 'undefined' && window.__ASSETS__) || null;
const state = { ready: false, map: {}, sheets: {}, rooms: {}, listeners: [] };

function loadImage(src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

export async function loadAssets() {
  if (typeof window === 'undefined') return false;
  try {
    state.map = A?.atlas || { ...(await fetch('assets/sprites/atlas.json').then((r) => r.json())), ...(await fetch('assets/items/atlas.json').then((r) => r.json())) };
    const names = [...new Set(Object.values(state.map).map((v) => v[0]))];
    const imgs = await Promise.all(names.map((n) => loadImage(A?.sheets?.[n] || (n === 'items' ? 'assets/items/items.webp' : n === 'traps' ? 'assets/traps/traps.webp' : `assets/sprites/${n}.webp`))));
    names.forEach((n, i) => { if (imgs[i]) state.sheets[n] = imgs[i]; });
    state.ready = true;
    for (const fn of state.listeners) fn();
    return true;
  } catch (e) {
    console.warn('โหลด sprite atlas ไม่สำเร็จ — ใช้ sprite สำรอง', e);
    return false;
  }
}
export function onAssetsReady(fn) { if (state.ready) fn(); else state.listeners.push(fn); }
export function assetsReady() { return state.ready; }

export function sprite(id) {
  const e = state.map[id]; if (!e) return null;
  const img = state.sheets[e[0]]; if (!img) return null;
  return { img, x: e[1], y: e[2], w: e[3], h: e[4] };
}

// ภาพห้อง (โหลดเมื่อจำเป็น)
export function roomImage(name, onload) {
  if (!name || typeof window === 'undefined') return null;
  const r = state.rooms[name];
  if (r) return r.img && r.loaded ? r.img : null;
  const img = new Image();
  state.rooms[name] = { img, loaded: false };
  img.onload = () => { state.rooms[name].loaded = true; onload?.(); };
  img.src = A?.rooms?.[name] || `assets/rooms/${name}.webp`;
  return null;
}

// data URL สำหรับไอคอนใน UI
const urlCache = new Map();
export function spriteIcon(id, size = 48) {
  const key = `${id}|${size}`;
  if (urlCache.has(key)) return urlCache.get(key);
  const s = sprite(id); if (!s) return null;
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const k = Math.min(size / s.w, size / s.h);
  const w = s.w * k, h = s.h * k;
  ctx.drawImage(s.img, s.x, s.y, s.w, s.h, (size - w) / 2, size - h, w, h);
  const url = c.toDataURL();
  urlCache.set(key, url);
  return url;
}
