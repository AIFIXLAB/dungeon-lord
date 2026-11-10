// CleaningManager — ศพ เลือด Loot เศษซาก, Worker AI จัดลำดับงาน, ผลกระทบของห้องสกปรก (GDD §16)
import { BALANCE } from '../config/balance.js';
import { uid, dist } from '../core/util.js';
import { moveToward, clearPath } from '../core/movement.js';
import { speciesInfo } from './MonsterManager.js';

const CB = BALANCE.cleaning;

export class CleaningManager {
  constructor(game) { this.game = game; }
  get floor() { return this.game.state.floor; }

  spawn(type, x, y, data = {}) {
    const g = this.game;
    // วางบน tile ที่เดินได้เท่านั้น
    if (!g.dungeon.walkable(Math.floor(x), Math.floor(y))) { x = Math.floor(x) + 0.5; y = Math.floor(y) + 0.5; }
    if (!g.dungeon.walkable(Math.floor(x), Math.floor(y))) { const e = g.dungeon.entrancePos(); x = e.x; y = e.y; }
    const o = { id: uid(g, 'f'), type, x, y, claimedBy: null, age: 0, variant: g.rng.int(0, 2), ...data };
    this.floor.push(o);
    return o;
  }

  roomOf(o) { return this.game.dungeon.roomIdAt(Math.floor(o.x), Math.floor(o.y)); }

  dirtCount(room) {
    return this.floor.filter((o) => o.type !== 'loot' && this.roomOf(o) === room.id).length;
  }
  isDirty(room) { return this.dirtCount(room) > CB.dirtyThreshold; }
  dirtyRooms() { return this.game.dungeon.d.rooms.filter((r) => this.isDirty(r)); }
  efficiency(room) { return this.isDirty(room) ? 0.7 : 1; }

  cleaners() { return this.game.state.monsters.filter((m) => m.assignment.type === 'clean' && !m.ko); }

  releaseJob(m) {
    const o = this.floor.find((f) => f.id === m.job);
    if (o && o.claimedBy === m.id) o.claimedBy = null;
    m.job = null; m.workT = 0;
  }

  dropCarried(m) {
    for (const c of m.carrying || []) {
      const o = this.spawn(c.type, m.x, m.y, c.data || {});
      o.claimedBy = null;
    }
    m.carrying = [];
  }

  capacity(m) {
    return CB.carryCapacity + Math.floor(m.level / 10);
  }

  workSpeed(m, st) {
    const g = this.game;
    const sp = speciesInfo(m.species);
    const room = g.dungeon.roomsOfType('cleaning_room')[0];
    const roomMult = room ? g.dungeon.roomEffect(room, 'workMult') : 1;
    const fat = m.fatigue >= BALANCE.monsters.fatigueHighThreshold ? 0.6 : 1;
    const lazy = m.trait === 'lazy' ? 0.8 : 1;
    return CB.baseSpeed * (sp.clean || 1) * (st?.workMult || 1) * roomMult * fat * lazy * (1 + m.level * 0.02);
  }

  // เลือกงานตามลำดับความสำคัญ: loot > corpse > debris > blood (ปรับได้ใน balance)
  pickJob(m) {
    let best = null, bs = -Infinity;
    const heroes = this.game.state.heroes;
    const invFull = this.game.inventory.freeSlots() <= 0;
    for (const o of this.floor) {
      if (o.claimedBy && o.claimedBy !== m.id) continue;
      if (o.type === 'loot' && invFull && !o.gold) continue;
      // ไม่เข้าใกล้จุดที่ยังมีผู้กล้า
      if (heroes.some((h) => h.inside && !h.dead && dist(h, o) < 2.5)) continue;
      if (!this.game.dungeon.isReachable(Math.floor(o.x), Math.floor(o.y))) continue;
      const s = (CB.priority[o.type] || 1) * 10 - dist(m, o) + Math.min(o.age / 60, 5);
      if (s > bs) { bs = s; best = o; }
    }
    return best;
  }

  depositTarget(m) {
    const g = this.game;
    const hasLoot = m.carrying.some((c) => c.type === 'loot');
    const room = hasLoot
      ? (g.dungeon.roomsOfType('storage_room')[0] || g.dungeon.coreRoom())
      : (g.dungeon.roomsOfType('cleaning_room')[0] || null);
    if (room) return { room, pos: g.dungeon.roomCenter(room) };
    return { room: null, pos: g.dungeon.entrancePos() }; // ไม่มี Cleaning Room → นำไปทิ้งที่ทางเข้า
  }

  update(m, dt, st) {
    const g = this.game;
    m.carrying ||= [];
    // ---------- Working on job ----------
    if (m.job) {
      const o = this.floor.find((f) => f.id === m.job);
      if (!o) { m.job = null; return; }
      if (dist(m, o) > 0.35) {
        m.ai = 'to_job';
        const r = moveToward(g, m, o.x, o.y, dt, g.combat.moveSpeed(m));
        if (r === 'blocked') { this.releaseJob(m); o.age = -120; }
        return;
      }
      m.ai = 'cleaning'; m.moving = false;
      m.workT = (m.workT || 0) + dt * this.workSpeed(m, st);
      if (m.workT >= (CB.workTime[o.type] || 1)) {
        m.workT = 0;
        this.floor.splice(this.floor.indexOf(o), 1);
        m.job = null;
        if (o.type === 'blood') { g.state.stats.cleaned++; }
        else {
          const { id, x, y, claimedBy, type, age, ...data } = o;
          m.carrying.push({ type: o.type, data });
        }
        g.monsters.gainExp(m, 1.2);
        m.fatigue = Math.min(100, m.fatigue + 0.6 * (m.trait === 'lazy' ? 0.7 : 1));
      }
      return;
    }
    // ---------- Deliver ----------
    const full = m.carrying.length >= this.capacity(m);
    const next = full ? null : this.pickJob(m);
    if (next) { next.claimedBy = m.id; m.job = next.id; m.workT = 0; clearPath(m); return; }
    if (m.carrying.length) {
      const { room, pos } = this.depositTarget(m);
      const inside = room ? g.dungeon.roomIdAt(Math.floor(m.x), Math.floor(m.y)) === room.id : dist(m, pos) < 0.6;
      if (!inside) {
        m.ai = 'deliver';
        const r = moveToward(g, m, pos.x, pos.y, dt, g.combat.moveSpeed(m));
        if (r !== 'blocked') return;
      }
      this.deposit(m, room);
      return;
    }
    // ---------- Idle ----------
    m.ai = 'idle_worker';
    const home = g.dungeon.roomsOfType('cleaning_room')[0] || g.dungeon.roomsOfType('barracks')[0];
    if (home && g.dungeon.roomIdAt(Math.floor(m.x), Math.floor(m.y)) !== home.id) {
      if (!m.patrol || g.dungeon.roomIdAt(Math.floor(m.patrol.x), Math.floor(m.patrol.y)) !== home.id) m.patrol = g.dungeon.randomTileInRoom(home, g.rng);
      moveToward(g, m, m.patrol.x, m.patrol.y, dt, g.combat.moveSpeed(m) * 0.7);
    } else m.moving = false;
  }

  deposit(m, room) {
    const g = this.game, rng = g.rng;
    const keep = [];
    for (const c of m.carrying) {
      if (c.type === 'loot') {
        if (c.data.gold) { g.economy.earn('loot_gold', c.data.gold); c.data.gold = 0; }
        const left = [];
        for (const it of c.data.items || []) {
          if (!g.inventory.add(it.itemId, it.qty, it.rarity)) left.push(it);
        }
        if (left.length) { c.data.items = left; keep.push(c); }
        else g.state.stats.cleaned++;
      } else if (c.type === 'corpse') {
        const cr = g.dungeon.roomsOfType('cleaning_room')[0];
        const mult = cr ? g.dungeon.roomEffect(cr, 'boneMult') : 0.5;
        if (rng.chance(CB.corpseBoneChance * mult)) g.inventory.add('bone', 1 + (rng.chance(0.3 * mult) ? 1 : 0));
        if (rng.chance(0.25 * mult)) g.inventory.add(rng.pick(['hide', 'iron_scrap', 'mana_gel']), 1);
        g.state.stats.cleaned++;
      } else {
        if (rng.chance(0.3)) g.inventory.add('iron_scrap', 1);
        g.state.stats.cleaned++;
      }
    }
    if (keep.length && !m.warnedFull) { g.notify('คลังเต็ม! Loot ค้างอยู่กับทีมทำความสะอาด — ขายไอเทมหรือสร้าง Storage Room', 'warn'); m.warnedFull = true; }
    if (!keep.length) m.warnedFull = false;
    m.carrying = keep;
    if (keep.length) {
      // วาง loot ที่เหลือไว้ที่พื้น เพื่อไม่ให้ค้าง
      this.dropCarried(m);
      for (const o of this.floor) if (o.type === 'loot' && dist(o, m) < 0.2) o.age = -600;
    }
  }

  // ---------- Hourly / daily effects ----------
  hourly() {
    const g = this.game;
    for (const o of this.floor) o.age += 60;
    const dirty = new Set(this.dirtyRooms().map((r) => r.id));
    if (!dirty.size) return;
    for (const m of g.state.monsters) {
      if (m.ko) continue;
      const rid = g.dungeon.roomIdAt(Math.floor(m.x), Math.floor(m.y));
      if (rid && dirty.has(rid)) m.loyalty = Math.max(0, m.loyalty - CB.dirtyLoyaltyLossPerHour);
    }
  }

  daily() {
    const g = this.game;
    const dirty = this.dirtyRooms();
    if (dirty.length) {
      g.reputation.add(-CB.dirtyRepLossPerDay * dirty.length, 'dirty');
      g.notify(`ห้องสกปรก ${dirty.length} ห้อง — ชื่อเสียงลดลง (มอบหมายมอนสเตอร์ทำความสะอาด)`, 'warn');
      if (g.rng.chance(CB.diseaseChancePerDay * Math.min(1, dirty.length / 2))) this.outbreak(1);
    }
  }

  outbreak(n) {
    const g = this.game;
    const healthy = g.state.monsters.filter((m) => !m.ko && !g.combat.hasStatus(m, 'sick'));
    for (let i = 0; i < n && healthy.length; i++) {
      const m = healthy.splice(g.rng.int(0, healthy.length - 1), 1)[0];
      m.status.push({ id: 'sick', t: 24 * 60 / BALANCE.time.gameMinutesPerSecond, power: 0.2 });
      g.notify(`${m.name} ป่วยจากโรคระบาด! (ค่าสถานะ -20%)`, 'bad');
    }
  }
}
