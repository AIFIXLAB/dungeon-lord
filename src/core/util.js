// ยูทิลิตี้พื้นฐาน: RNG แบบ seed (บันทึกลงเซฟได้), EventBus, ฟังก์ชันช่วย

export class RNG {
  constructor(seed = Date.now() >>> 0) { this.s = seed >>> 0; }
  next() {
    // mulberry32
    let t = (this.s += 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  weighted(obj) {
    const entries = Object.entries(obj);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
    return entries[entries.length - 1][0];
  }
}

export class EventBus {
  constructor() { this.h = {}; }
  on(ev, fn) { (this.h[ev] ||= []).push(fn); return () => this.off(ev, fn); }
  off(ev, fn) { this.h[ev] = (this.h[ev] || []).filter((f) => f !== fn); }
  emit(ev, data) {
    for (const fn of this.h[ev] || []) {
      try { fn(data); } catch (e) { console.error(`[bus:${ev}]`, e); }
    }
  }
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const fmt = (n) => Math.floor(n).toLocaleString('en-US');
export const deepClone = (o) => JSON.parse(JSON.stringify(o));

export function uid(game, prefix) {
  game.state.nextId = (game.state.nextId || 1) + 1;
  return `${prefix}${game.state.nextId.toString(36)}`;
}

export function hourOf(minutes) { return Math.floor((minutes % 1440) / 60); }
export function dayOf(minutes) { return Math.floor(minutes / 1440) + 1; }
export function timeString(minutes) {
  const h = hourOf(minutes);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
