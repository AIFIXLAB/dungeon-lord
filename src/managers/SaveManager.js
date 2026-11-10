// SaveManager — บันทึก/โหลด: Manual, Auto, หลายช่อง, รหัส 4 ตัว (Cloud ผ่าน /api/save), Version, Validation (GDD §28)
import { BALANCE } from '../config/balance.js';
import { MONSTERS } from '../data/monsters.js';
import { BOSSES } from '../data/bosses.js';
import { ROOMS } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';
import { HERO_CLASSES } from '../data/heroes.js';
import { TRAPS } from '../data/traps.js';

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
const FORMAT = 'DLME';
const PREFIX = 'dlme_';

export function normalizeCode(c) { return String(c || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); }

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ----- Storage adapter (localStorage หรือ memory ในโหมดทดสอบ) -----
export function makeLocalStore() {
  try {
    const ls = globalThis.localStorage;
    const t = '__dlme_t'; ls.setItem(t, '1'); ls.removeItem(t);
    return { get: (k) => ls.getItem(k), set: (k, v) => ls.setItem(k, v), del: (k) => ls.removeItem(k), persistent: true };
  } catch {
    const m = new Map();
    return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, v), del: (k) => m.delete(k), persistent: false };
  }
}

export class SaveManager {
  constructor(game, store = makeLocalStore(), fetchImpl = globalThis.fetch?.bind(globalThis)) {
    this.game = game; this.store = store; this.fetch = fetchImpl;
    this.apiBase = '/api/save';
    this.cloudAvailable = null; // null = ยังไม่ทราบ
  }

  // ---------- Serialize ----------
  serialize(state = this.game.state) {
    const clean = JSON.parse(JSON.stringify(state, (k, v) => (k === 'path' || k === 'pathKey' || k === 'pathVer' ? undefined : v)));
    const body = JSON.stringify(clean);
    return {
      format: FORMAT, version: BALANCE.saveVersion, savedAt: new Date().toISOString(),
      day: Math.floor(clean.time / 1440) + 1, dungeonLevel: clean.dungeonLevel, gold: clean.gold,
      checksum: fnv1a(body), data: clean,
    };
  }

  // ---------- Validate ----------
  validate(obj) {
    const errors = [];
    if (!obj || typeof obj !== 'object') return { ok: false, errors: ['ไม่ใช่ข้อมูลเซฟ'] };
    if (obj.format !== FORMAT) errors.push('รูปแบบไฟล์ไม่ถูกต้อง');
    if (typeof obj.version !== 'number' || obj.version > BALANCE.saveVersion) errors.push(`เวอร์ชันเซฟไม่รองรับ (${obj.version})`);
    const d = obj.data;
    if (!d || typeof d !== 'object') return { ok: false, errors: [...errors, 'ไม่มีข้อมูลเกม'] };
    if (!obj._migrated && fnv1a(JSON.stringify(d)) !== obj.checksum) errors.push('Checksum ไม่ตรง (ข้อมูลเสียหายหรือถูกแก้ไข)');
    const num = (v) => typeof v === 'number' && Number.isFinite(v);
    if (!num(d.gold) || d.gold < 0) errors.push('Gold ไม่ถูกต้อง');
    if (!num(d.time) || d.time < 0) errors.push('เวลาในเกมไม่ถูกต้อง');
    if (!num(d.dungeonLevel) || d.dungeonLevel < 1 || d.dungeonLevel > 10) errors.push('Dungeon Level ไม่ถูกต้อง');
    if (!Array.isArray(d.monsters)) errors.push('ข้อมูลมอนสเตอร์ไม่ถูกต้อง');
    else for (const m of d.monsters) {
      if (!MONSTERS[m.species] && !BOSSES[m.species]) errors.push(`ไม่รู้จักสายพันธุ์ ${m.species}`);
      if (!num(m.level) || m.level < 1 || m.level > BALANCE.monsters.levelCap) errors.push(`Level ของ ${m.name} ไม่ถูกต้อง`);
      if (!m.id) errors.push('มอนสเตอร์ไม่มี ID');
    }
    if (new Set((d.monsters || []).map((m) => m.id)).size !== (d.monsters || []).length) errors.push('Monster ID ซ้ำ');
    if (!d.dungeon || !Array.isArray(d.dungeon.rooms)) errors.push('ข้อมูลห้องไม่ถูกต้อง');
    else {
      for (const r of d.dungeon.rooms) if (!ROOMS[r.type]) errors.push(`ไม่รู้จักห้อง ${r.type}`);
      if (!d.dungeon.rooms.some((r) => r.type === 'core_room')) errors.push('ไม่มีห้อง Core');
      for (const t of d.dungeon.traps || []) if (!TRAPS[t.type]) errors.push(`ไม่รู้จักกับดัก ${t.type}`);
    }
    if (!Array.isArray(d.inventory)) errors.push('ข้อมูลคลังไม่ถูกต้อง');
    else for (const it of d.inventory) if (!ITEMS[it.itemId]) errors.push(`ไม่รู้จักไอเทม ${it.itemId}`);
    for (const h of d.heroes || []) if (!HERO_CLASSES[h.cls]) errors.push(`ไม่รู้จัก Class ${h.cls}`);
    if (!d.core || !num(d.core.hp)) errors.push('ข้อมูล Core ไม่ถูกต้อง');
    return { ok: errors.length === 0, errors: errors.slice(0, 8) };
  }

  // แปลงเซฟเวอร์ชันเก่า (v1 = Prototype 0.1) ให้ใช้กับระบบใหม่ได้
  migrate(obj) {
    if (!obj?.data || obj.version >= BALANCE.saveVersion) return obj;
    const d = obj.data;
    if (obj.version === 1) {
      const MAP = { kobold: 'rat', spider: 'cave_spider', myconid: 'mushroom', dark_mage: 'dark_elf', crystal_golem: 'iron_golem', gargoyle: 'nightmare', abyss_demon: 'archdemon', chaos_dragon: 'black_dragon',
        acid_slime: 'slime_blue', ancient_slime_king: 'slime_king', goblin_rogue: 'goblin_warrior', goblin_assassin: 'goblin_champion', goblin_king: 'goblin_champion', death_knight: 'dark_knight', lich_knight: 'lich',
        vampire_bat: 'giant_bat', kobold_foreman: 'rat', venom_spider: 'giant_spider', arch_imp: 'flame_imp', elder_myconid: 'giant_mushroom' };
      for (const m of d.monsters || []) {
        if (MAP[m.species]) m.species = MAP[m.species];
        if (!MONSTERS[m.species]) m.species = 'slime';
        m.trained = { hp: (m.trained?.hp || 0) * 2.5, atk: (m.trained?.atk || 0) * 2.5, matk: (m.trained?.mag || 0) * 2.5, def: (m.trained?.def || 0) * 2, mdef: 0, spd: 0, acc: 0, res: 0 };
        if (m.assignment?.stat === 'mag') m.assignment.stat = 'matk';
        m.mutations ||= []; m.phase = 1; m.isBoss = false; m.hp = 1; m.ko = null;
      }
      d.heroes = []; d.parties = [];
      d.core.maxHp = Math.max(d.core.maxHp, BALANCE.start.coreHp); d.core.hp = d.core.maxHp;
      d.summons = []; d.fusions = []; d.codex ||= {};
      obj.version = 2;
      obj._migrated = true;
    }
    return obj;
  }

  parse(text) {
    let obj;
    try { obj = JSON.parse(text); } catch { return { ok: false, errors: ['อ่านไฟล์เซฟไม่ได้ (JSON เสีย)'] }; }
    if (obj && obj.version < BALANCE.saveVersion) {
      if (!obj.data || fnv1a(JSON.stringify(obj.data)) !== obj.checksum) return { ok: false, errors: ['Checksum ไม่ตรง (ข้อมูลเสียหายหรือถูกแก้ไข)'] };
    }
    obj = this.migrate(obj);
    const v = this.validate(obj);
    return v.ok ? { ok: true, save: obj } : { ok: false, errors: v.errors, save: obj };
  }

  // ---------- Local slots ----------
  slotKey(slot) { return `${PREFIX}slot_${slot}`; }

  slotInfo(slot) {
    const raw = this.store.get(this.slotKey(slot));
    if (!raw) return { slot, empty: true };
    const p = this.parse(raw);
    if (!p.ok) return { slot, corrupt: true, errors: p.errors };
    return { slot, day: p.save.day, level: p.save.dungeonLevel, gold: p.save.gold, savedAt: p.save.savedAt };
  }

  // force=false จะไม่เขียนทับช่องที่ข้อมูลเสียหาย (ป้องกันการสูญหาย)
  saveSlot(slot, { force = false } = {}) {
    const key = this.slotKey(slot);
    const existing = this.store.get(key);
    if (existing && !force) {
      const p = this.parse(existing);
      if (!p.ok) return { ok: false, corrupt: true, reason: 'ช่องนี้มีเซฟที่เสียหาย — ยืนยันก่อนเขียนทับ' };
    }
    try {
      const text = JSON.stringify(this.serialize());
      if (existing) this.store.set(`${key}_bak`, existing);
      this.store.set(key, text);
      // ตรวจสอบหลังเขียน
      if (!this.parse(this.store.get(key)).ok) throw new Error('verify failed');
      return { ok: true, size: text.length };
    } catch (e) {
      return { ok: false, reason: `บันทึกไม่สำเร็จ: ${e.message}` };
    }
  }

  loadSlot(slot) {
    const raw = this.store.get(this.slotKey(slot));
    if (!raw) return { ok: false, reason: 'ช่องว่าง' };
    const p = this.parse(raw);
    if (!p.ok) return { ok: false, reason: `เซฟเสียหาย: ${p.errors.join(', ')}`, hasBackup: !!this.store.get(`${this.slotKey(slot)}_bak`) };
    return { ok: true, data: p.save.data };
  }

  loadBackup(slot) {
    const raw = this.store.get(`${this.slotKey(slot)}_bak`);
    if (!raw) return { ok: false, reason: 'ไม่มีข้อมูลสำรอง' };
    const p = this.parse(raw);
    return p.ok ? { ok: true, data: p.save.data } : { ok: false, reason: 'ข้อมูลสำรองเสียหายด้วย' };
  }

  autoSave() { return this.saveSlot('auto'); }

  // ---------- Cloud (รหัส 4 ตัว) ----------
  async api(method, params = '', body = null) {
    if (!this.fetch) throw new Error('no fetch');
    const res = await this.fetch(`${this.apiBase}${params}`, {
      method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* not json */ }
    if (!json || typeof json !== 'object') throw new Error(`API ไม่ตอบกลับ (${res.status})`);
    return { status: res.status, json };
  }

  async checkCloud() {
    try {
      const r = await this.api('GET', '?ping=1');
      this.cloudAvailable = r.status === 200 && r.json.ok === true && r.json.storage === true;
      this.cloudReason = r.json.storage === false ? 'ยังไม่ได้ตั้งค่าฐานข้อมูลบน Vercel' : '';
    } catch { this.cloudAvailable = false; this.cloudReason = 'ไม่พบเซิร์ฟเวอร์ (โหมดออฟไลน์)'; }
    return this.cloudAvailable;
  }

  localCodeKey(code) { return `${PREFIX}code_${code}`; }

  randomCode() {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return c;
  }

  async newCode() {
    if (this.cloudAvailable === null) await this.checkCloud();
    if (this.cloudAvailable) {
      try {
        const r = await this.api('POST', '?action=new', {});
        if (r.json.ok && CODE_RE.test(r.json.code)) return { ok: true, code: r.json.code, cloud: true };
        return { ok: false, reason: r.json.error || 'สร้างรหัสไม่สำเร็จ' };
      } catch (e) { return { ok: false, reason: e.message }; }
    }
    for (let i = 0; i < 50; i++) {
      const c = this.randomCode();
      if (!this.store.get(this.localCodeKey(c))) return { ok: true, code: c, cloud: false };
    }
    return { ok: false, reason: 'สร้างรหัสไม่สำเร็จ' };
  }

  async saveToCode(code) {
    code = normalizeCode(code);
    if (!CODE_RE.test(code)) return { ok: false, reason: 'รหัสต้องเป็น 4 ตัว (A–Z, 2–9 ไม่มี I/O/0/1)' };
    const payload = this.serialize();
    if (this.cloudAvailable === null) await this.checkCloud();
    if (this.cloudAvailable) {
      try {
        const r = await this.api('POST', '', { code, save: payload });
        if (r.json.ok) { this.game.state.saveCode = code; return { ok: true, cloud: true, code }; }
        return { ok: false, reason: r.json.error || 'บันทึกไม่สำเร็จ' };
      } catch (e) {
        this.cloudAvailable = false;
      }
    }
    try {
      const key = this.localCodeKey(code);
      const prev = this.store.get(key);
      if (prev) this.store.set(`${key}_bak`, prev);
      this.store.set(key, JSON.stringify(payload));
      this.game.state.saveCode = code;
      return { ok: true, cloud: false, code };
    } catch (e) { return { ok: false, reason: e.message }; }
  }

  async loadFromCode(code) {
    code = normalizeCode(code);
    if (!CODE_RE.test(code)) return { ok: false, reason: 'รหัสต้องเป็น 4 ตัว' };
    if (this.cloudAvailable === null) await this.checkCloud();
    let raw = null, source = 'local';
    if (this.cloudAvailable) {
      try {
        const r = await this.api('GET', `?code=${code}`);
        if (r.status === 404) return { ok: false, reason: 'ไม่พบเซฟของรหัสนี้' };
        if (!r.json.ok) return { ok: false, reason: r.json.error || 'โหลดไม่สำเร็จ' };
        raw = JSON.stringify(r.json.save); source = 'cloud';
      } catch { this.cloudAvailable = false; }
    }
    if (!raw) raw = this.store.get(this.localCodeKey(code));
    if (!raw) return { ok: false, reason: 'ไม่พบเซฟของรหัสนี้' };
    const p = this.parse(raw);
    if (!p.ok) return { ok: false, reason: `เซฟเสียหาย: ${p.errors.join(', ')}` };
    p.save.data.saveCode = code;
    return { ok: true, data: p.save.data, source };
  }

  exportText() { return JSON.stringify(this.serialize()); }
}
