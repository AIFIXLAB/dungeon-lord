// DungeonManager — แผนที่ Tile, ห้อง, ทางเดิน, การเชื่อมต่อ, A* Pathfinding, ขยายพื้นที่
import { BALANCE } from '../config/balance.js';
import { ROOMS } from '../data/rooms.js';
import { LEVELS } from '../data/levels.js';
import { TRAPS } from '../data/traps.js';
import { uid } from '../core/util.js';

const T_ROCK = 0, T_CORRIDOR = 1, T_ROOM = 2;

export class DungeonManager {
  constructor(game) {
    this.game = game;
    this.W = BALANCE.world.width;
    this.H = BALANCE.world.height;
    this.version = 0;
    this.rebuild();
  }

  get d() { return this.game.state.dungeon; }

  // ---------- Grid ----------
  rebuild() {
    const W = this.W, H = this.H;
    this.tile = new Uint8Array(W * H);
    this.roomAt = new Array(W * H).fill(null);
    for (const k of this.d.corridors) {
      const [x, y] = k.split(',').map(Number);
      if (this.inWorld(x, y)) this.tile[y * W + x] = T_CORRIDOR;
    }
    for (const r of this.d.rooms) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        if (!this.inWorld(x, y)) continue;
        this.tile[y * W + x] = T_ROOM;
        this.roomAt[y * W + x] = r.id;
      }
    }
    this.trapAt = new Map();
    for (const t of this.d.traps) this.trapAt.set(`${t.x},${t.y}`, t);
    this.updateConnectivity();
    this.version++;
    this.game.bus?.emit('map_changed', this.version);
  }

  inWorld(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  inArea(x, y) {
    const a = this.d.area;
    return x >= a.x && y >= a.y && x < a.x + a.w && y < a.y + a.h;
  }
  tileType(x, y) { return this.inWorld(x, y) ? this.tile[y * this.W + x] : T_ROCK; }
  walkable(x, y) { return this.tileType(x, y) !== T_ROCK; }
  roomIdAt(x, y) { return this.inWorld(x, y) ? this.roomAt[y * this.W + x] : null; }
  roomAtTile(x, y) { const id = this.roomIdAt(x, y); return id ? this.getRoom(id) : null; }
  getRoom(id) { return this.d.rooms.find((r) => r.id === id) || null; }
  roomsOfType(type, activeOnly = true) {
    return this.d.rooms.filter((r) => r.type === type && (!activeOnly || r.status === 'active'));
  }
  coreRoom() { return this.d.rooms.find((r) => r.type === 'core_room'); }
  corePos() { const r = this.coreRoom(); return { x: r.x + Math.floor(r.w / 2) + 0.5, y: r.y + Math.floor(r.h / 2) + 0.5 }; }
  entrancePos() { return { x: this.d.entrance.x + 0.5, y: this.d.entrance.y + 0.5 }; }
  roomCenter(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }

  updateConnectivity() {
    const W = this.W;
    const seen = new Uint8Array(W * this.H);
    const { x: ex, y: ey } = this.d.entrance;
    const q = [[ex, ey]];
    if (this.walkable(ex, ey)) seen[ey * W + ex] = 1;
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!this.inWorld(nx, ny) || seen[ny * W + nx] || !this.walkable(nx, ny)) continue;
        seen[ny * W + nx] = 1; q.push([nx, ny]);
      }
    }
    this.reach = seen;
    for (const r of this.d.rooms) {
      r.status = seen[r.y * W + r.x] ? 'active' : 'disconnected';
    }
  }
  isReachable(x, y) { return !!this.reach?.[y * this.W + x]; }
  coreReachable() { const c = this.coreRoom(); return c && this.isReachable(c.x, c.y); }

  // ---------- Placement validation (GDD §4) ----------
  roomDims(type, rot) {
    const [w, h] = ROOMS[type].size;
    return rot % 2 ? [h, w] : [w, h];
  }

  canPlaceRoom(type, x, y, rot = 0, ignoreRoomId = null) {
    const def = ROOMS[type];
    if (!def) return { ok: false, reason: 'ไม่มีห้องประเภทนี้' };
    const lvl = this.game.state.dungeonLevel;
    if (def.unlock > lvl) return { ok: false, reason: `ต้องมี Dungeon Level ${def.unlock}` };
    if (def.unique && !ignoreRoomId && this.d.rooms.some((r) => r.type === type)) return { ok: false, reason: 'สร้างได้เพียง 1 ห้อง' };
    const [w, h] = this.roomDims(type, rot);
    for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
      if (!this.inArea(tx, ty)) return { ok: false, reason: 'อยู่นอกพื้นที่ที่ปลดล็อก' };
      if (tx === this.d.entrance.x && ty === this.d.entrance.y) return { ok: false, reason: 'ทับทางเข้า' };
      const rid = this.roomIdAt(tx, ty);
      if (rid && rid !== ignoreRoomId) return { ok: false, reason: 'ห้ามสร้างทับห้องเดิม' };
      if (this.tileType(tx, ty) === T_CORRIDOR) return { ok: false, reason: 'ทับทางเดิน (ลบทางเดินก่อน)' };
      if (this.trapAt.has(`${tx},${ty}`)) return { ok: false, reason: 'ทับกับดัก' };
    }
    // ต้องติดกับพื้นที่เดินได้ที่เชื่อมกับทางเข้า (ไม่งั้นใช้งานไม่ได้) — อนุญาตวางแต่เตือน
    let connected = false;
    for (let ty = y - 1; ty <= y + h && !connected; ty++) for (let tx = x - 1; tx <= x + w; tx++) {
      const inside = tx >= x && tx < x + w && ty >= y && ty < y + h;
      const diag = (tx === x - 1 || tx === x + w) && (ty === y - 1 || ty === y + h);
      if (inside || diag) continue;
      const rid = this.roomIdAt(tx, ty);
      if (rid && rid === ignoreRoomId) continue;
      if (this.walkable(tx, ty) && this.isReachable(tx, ty)) { connected = true; break; }
    }
    return { ok: true, connected, w, h };
  }

  buildRoom(type, x, y, rot = 0) {
    const g = this.game;
    const chk = this.canPlaceRoom(type, x, y, rot);
    if (!chk.ok) return chk;
    const cost = ROOMS[type].cost;
    if (!g.economy.spend('room_construction', cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    const room = { id: uid(g, 'r'), type, x, y, w: chk.w, h: chk.h, rot, level: 1, status: 'active' };
    this.d.rooms.push(room);
    this.game.state.stats.roomsBuilt++;
    this.rebuild();
    g.notify(`สร้าง ${ROOMS[type].th} แล้ว${room.status === 'disconnected' ? ' (ยังไม่เชื่อมทางเดิน — ใช้งานไม่ได้)' : ''}`, room.status === 'active' ? 'good' : 'warn');
    g.bus.emit('room_built', room);
    return { ok: true, room };
  }

  upgradeCost(room) {
    const def = ROOMS[room.type];
    if (room.type === 'core_room') return BALANCE.core.upgradeCost[room.level] ?? null;
    if (room.level >= BALANCE.rooms.maxLevel) return null;
    return Math.round(Math.max(def.cost, 100) * Math.pow(BALANCE.rooms.upgradeCostGrowth, room.level));
  }

  upgradeRoom(roomId) {
    const g = this.game; const room = this.getRoom(roomId);
    if (!room) return { ok: false, reason: 'ไม่พบห้อง' };
    const cost = this.upgradeCost(room);
    if (cost == null || room.level >= BALANCE.rooms.maxLevel) return { ok: false, reason: 'ระดับสูงสุดแล้ว' };
    if (!g.economy.spend(room.type === 'core_room' ? 'core_upgrade' : 'room_upgrade', cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    room.level++;
    if (room.type === 'core_room') {
      const core = g.state.core;
      core.maxHp = this.coreMaxHp(); core.hp = core.maxHp;
    }
    g.notify(`อัปเกรด ${ROOMS[room.type].th} เป็น Lv.${room.level}`, 'good');
    g.bus.emit('room_upgraded', room);
    return { ok: true };
  }

  coreMaxHp() {
    const lvl = this.coreRoom()?.level || 1;
    return BALANCE.start.coreHp + BALANCE.core.hpPerLevel * (lvl - 1);
  }

  canModifyLayout() {
    if (this.game.state.heroes.length > 0) return { ok: false, reason: 'ย้าย/รื้อไม่ได้ขณะมีผู้กล้าในดันเจี้ยน' };
    return { ok: true };
  }

  // ทดสอบว่าการเปลี่ยนแผนที่ยังทำให้ Core เชื่อมกับทางเข้าอยู่หรือไม่
  simulate(mutator) {
    const backup = JSON.stringify({ rooms: this.d.rooms, corridors: this.d.corridors });
    mutator();
    this.rebuild();
    const ok = this.coreReachable();
    const snap = JSON.parse(backup);
    return { ok, restore: () => { this.d.rooms = snap.rooms; this.d.corridors = snap.corridors; this.rebuild(); } };
  }

  demolishRoom(roomId) {
    const g = this.game; const room = this.getRoom(roomId);
    if (!room) return { ok: false, reason: 'ไม่พบห้อง' };
    if (room.type === 'core_room') return { ok: false, reason: 'รื้อห้อง Core ไม่ได้' };
    const lay = this.canModifyLayout(); if (!lay.ok) return lay;
    const test = this.simulate(() => { this.d.rooms = this.d.rooms.filter((r) => r.id !== roomId); });
    if (!test.ok) { test.restore(); return { ok: false, reason: 'รื้อแล้ว Core จะไม่เชื่อมกับทางเข้า' }; }
    test.restore();
    if (room.type === 'barracks') {
      const capAfter = this.barracksCapacity() - this.roomCapacity(room);
      if (g.state.monsters.length > capAfter) return { ok: false, reason: 'ที่พักจะไม่พอสำหรับมอนสเตอร์' };
    }
    if (room.type === 'storage_room') {
      const capAfter = g.inventory.capacity() - this.roomCapacity(room);
      if (g.inventory.usedSlots() > capAfter) return { ok: false, reason: 'คลังจะล้น — ขายหรือใช้ไอเทมก่อน' };
    }
    this.d.rooms = this.d.rooms.filter((r) => r.id !== roomId);
    // ส่งมอนสเตอร์ที่ประจำห้องนี้กลับ guard ห้องแรก
    for (const m of g.state.monsters) {
      if (m.assignment.roomId === roomId) g.monsters.assign(m, { type: 'guard', roomId: this.defaultGuardRoom()?.id || null });
    }
    const refund = Math.floor(ROOMS[room.type].cost * BALANCE.economy.roomRefund);
    g.economy.earn('refund', refund, false);
    this.rebuild();
    g.notify(`รื้อ ${ROOMS[room.type].th} (คืนเงิน ${refund})`, 'info');
    return { ok: true };
  }

  moveRoom(roomId, x, y, rot) {
    const g = this.game; const room = this.getRoom(roomId);
    if (!room) return { ok: false, reason: 'ไม่พบห้อง' };
    const lay = this.canModifyLayout(); if (!lay.ok) return lay;
    const chk = this.canPlaceRoom(room.type, x, y, rot, roomId);
    if (!chk.ok) return chk;
    const old = { x: room.x, y: room.y, w: room.w, h: room.h, rot: room.rot };
    const test = this.simulate(() => { Object.assign(room, { x, y, w: chk.w, h: chk.h, rot }); });
    if (!test.ok) { test.restore(); return { ok: false, reason: 'ตำแหน่งใหม่ทำให้ Core ไม่เชื่อมกับทางเข้า' }; }
    // simulate ได้ restore เป็น object ใหม่ ต้องหา room ใหม่อีกครั้ง
    test.restore();
    const r2 = this.getRoom(roomId);
    Object.assign(r2, { x, y, w: chk.w, h: chk.h, rot });
    this.rebuild();
    // ย้ายมอนสเตอร์และสิ่งของที่อยู่ในห้องเดิมตามไปด้วย
    const dx = x - old.x, dy = y - old.y;
    const inOld = (p) => p.x >= old.x && p.x < old.x + old.w && p.y >= old.y && p.y < old.y + old.h;
    for (const m of g.state.monsters) if (inOld(m)) { m.x = Math.min(x + r2.w - 0.5, m.x + dx); m.y = Math.min(y + r2.h - 0.5, m.y + dy); m.path = null; }
    for (const f of g.state.floor) if (inOld(f)) { f.x = Math.min(x + r2.w - 0.5, f.x + dx); f.y = Math.min(y + r2.h - 0.5, f.y + dy); }
    g.notify(`ย้าย ${ROOMS[room.type].th} แล้ว`, 'info');
    return { ok: true };
  }

  // ---------- Corridors ----------
  canPlaceCorridor(x, y) {
    if (!this.inArea(x, y)) return { ok: false, reason: 'นอกพื้นที่' };
    if (this.tileType(x, y) !== T_ROCK) return { ok: false, reason: 'มีสิ่งก่อสร้างอยู่แล้ว' };
    return { ok: true };
  }
  buildCorridor(x, y, silent = false) {
    const chk = this.canPlaceCorridor(x, y);
    if (!chk.ok) return chk;
    if (!this.game.economy.spend('room_construction', BALANCE.economy.corridorCost)) return { ok: false, reason: 'Gold ไม่พอ' };
    this.d.corridors.push(`${x},${y}`);
    this.rebuild();
    if (!silent) this.game.audio?.play('build');
    return { ok: true };
  }
  removeCorridor(x, y) {
    const key = `${x},${y}`;
    if (!this.d.corridors.includes(key)) return { ok: false, reason: 'ไม่ใช่ทางเดิน' };
    if (x === this.d.entrance.x && y === this.d.entrance.y) return { ok: false, reason: 'ลบทางเข้าไม่ได้' };
    const lay = this.canModifyLayout(); if (!lay.ok) return lay;
    if (this.trapAt.has(key)) return { ok: false, reason: 'มีกับดักอยู่ (รื้อกับดักก่อน)' };
    const test = this.simulate(() => { this.d.corridors = this.d.corridors.filter((k) => k !== key); });
    if (!test.ok) { test.restore(); return { ok: false, reason: 'ลบแล้ว Core จะไม่เชื่อมกับทางเข้า' }; }
    test.restore();
    this.d.corridors = this.d.corridors.filter((k) => k !== key);
    this.rebuild();
    return { ok: true };
  }

  // ---------- Area expansion ----------
  expansionCost() {
    const n = this.d.expansions || 0;
    return Math.round(BALANCE.expansion.baseCost * Math.pow(BALANCE.expansion.costGrowth, n));
  }
  canExpand(dir) {
    const a = this.d.area, step = BALANCE.expansion.step;
    const max = LEVELS[this.game.state.dungeonLevel - 1].maxArea;
    if (dir === 'right') {
      if (a.w + step > max.w) return { ok: false, reason: 'ถึงขนาดสูงสุดของ Dungeon Level นี้' };
      if (a.x + a.w + step > this.W) return { ok: false, reason: 'สุดขอบโลก' };
    } else if (dir === 'up' || dir === 'down') {
      if (a.h + step > max.h) return { ok: false, reason: 'ถึงขนาดสูงสุดของ Dungeon Level นี้' };
      if (dir === 'up' && a.y - step < 0) return { ok: false, reason: 'สุดขอบโลก' };
      if (dir === 'down' && a.y + a.h + step > this.H) return { ok: false, reason: 'สุดขอบโลก' };
    } else return { ok: false, reason: 'ทิศทางไม่ถูกต้อง' };
    return { ok: true, cost: this.expansionCost() };
  }
  expand(dir) {
    const chk = this.canExpand(dir); if (!chk.ok) return chk;
    if (!this.game.economy.spend('expansion', chk.cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    const a = this.d.area, step = BALANCE.expansion.step;
    if (dir === 'right') a.w += step;
    if (dir === 'up') { a.y -= step; a.h += step; }
    if (dir === 'down') a.h += step;
    this.d.expansions = (this.d.expansions || 0) + 1;
    this.rebuild();
    this.game.notify(`ขยายพื้นที่ดันเจี้ยน → ${a.w}x${a.h}`, 'good');
    return { ok: true };
  }

  // ---------- Capacities ----------
  roomCapacity(r) { const c = ROOMS[r.type].capacity; return c ? c[r.level - 1] : 0; }
  roomEffect(r, key) { const e = ROOMS[r.type].effect?.[key]; return e ? e[r.level - 1] : 0; }
  barracksCapacity() {
    return 2 + this.roomsOfType('barracks').reduce((s, r) => s + this.roomCapacity(r), 0);
  }
  defaultGuardRoom() { return this.roomsOfType('guard_room')[0] || this.coreRoom(); }

  // ---------- Traps ----------
  maxTraps() {
    const w = this.roomsOfType('trap_workshop')[0];
    return w ? this.roomEffect(w, 'maxTraps') : 0;
  }
  canPlaceTrap(type, x, y) {
    const def = TRAPS[type];
    if (!def) return { ok: false, reason: 'ไม่มีกับดักนี้' };
    if (!this.roomsOfType('trap_workshop').length) return { ok: false, reason: 'ต้องสร้าง Trap Workshop ก่อน' };
    if (def.unlock > this.game.state.dungeonLevel) return { ok: false, reason: `ต้องมี Dungeon Level ${def.unlock}` };
    if (this.d.traps.length >= this.maxTraps()) return { ok: false, reason: 'กับดักเต็มโควตา (อัปเกรด Trap Workshop)' };
    if (!this.walkable(x, y)) return { ok: false, reason: 'ต้องวางบนพื้นที่เดินได้' };
    if (x === this.d.entrance.x && y === this.d.entrance.y) return { ok: false, reason: 'วางที่ทางเข้าไม่ได้' };
    const r = this.roomAtTile(x, y);
    if (r?.type === 'core_room') return { ok: false, reason: 'วางในห้อง Core ไม่ได้' };
    if (this.trapAt.has(`${x},${y}`)) return { ok: false, reason: 'มีกับดักอยู่แล้ว' };
    return { ok: true };
  }
  placeTrap(type, x, y) {
    const chk = this.canPlaceTrap(type, x, y); if (!chk.ok) return chk;
    const def = TRAPS[type];
    if (!this.game.economy.spend('trap_production', def.cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    this.d.traps.push({ id: uid(this.game, 't'), type, x, y, level: 1, durability: def.durability, cd: 0 });
    this.rebuild();
    this.game.notify(`วาง ${def.name}`, 'good');
    return { ok: true };
  }
  trapUpgradeCost(t) { return Math.round(TRAPS[t.type].cost * BALANCE.traps.upgradeCostMult * t.level); }
  upgradeTrap(id) {
    const t = this.d.traps.find((q) => q.id === id); if (!t) return { ok: false, reason: 'ไม่พบกับดัก' };
    const ws = this.roomsOfType('trap_workshop')[0];
    if (!ws) return { ok: false, reason: 'ต้องมี Trap Workshop' };
    if (t.level >= 5) return { ok: false, reason: 'ระดับสูงสุดแล้ว' };
    if (t.level >= ws.level) return { ok: false, reason: `อัปเกรด Trap Workshop เป็น Lv.${t.level + 1} ก่อน` };
    if (!this.game.economy.spend('trap_production', this.trapUpgradeCost(t))) return { ok: false, reason: 'Gold ไม่พอ' };
    t.level++; t.durability = TRAPS[t.type].durability + (t.level - 1) * 10;
    return { ok: true };
  }
  repairTrap(id) {
    const t = this.d.traps.find((q) => q.id === id); if (!t) return { ok: false, reason: 'ไม่พบกับดัก' };
    const max = TRAPS[t.type].durability + (t.level - 1) * 10;
    if (t.durability >= max) return { ok: false, reason: 'ยังไม่เสียหาย' };
    const cost = Math.ceil((max - t.durability) / max * TRAPS[t.type].cost * 0.4);
    if (!this.game.economy.spend('trap_production', cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    t.durability = max;
    return { ok: true };
  }
  removeTrap(id) {
    const t = this.d.traps.find((q) => q.id === id); if (!t) return { ok: false, reason: 'ไม่พบกับดัก' };
    this.d.traps = this.d.traps.filter((q) => q.id !== id);
    this.game.economy.earn('refund', Math.floor(TRAPS[t.type].cost * 0.3), false);
    this.rebuild();
    return { ok: true };
  }

  // ---------- Pathfinding (A*, 8 ทิศ ไม่ตัดมุม) ----------
  findPath(sx, sy, tx, ty, costFn = null) {
    sx = Math.floor(sx); sy = Math.floor(sy); tx = Math.floor(tx); ty = Math.floor(ty);
    if (!this.walkable(tx, ty)) return null;
    if (!this.walkable(sx, sy)) {
      // ยูนิตอยู่นอกแผนที่ (กำลังเดินเข้า) — เริ่มจากทางเข้า
      sx = this.d.entrance.x; sy = this.d.entrance.y;
    }
    if (sx === tx && sy === ty) return [{ x: tx + 0.5, y: ty + 0.5 }];
    const W = this.W, N = W * this.H;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = new MinHeap();
    const h = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
    const s = sy * W + sx, goal = ty * W + tx;
    g[s] = 0; heap.push(s, h(sx, sy));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
    let iter = 0;
    while (heap.size && iter++ < 20000) {
      const cur = heap.pop();
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy, c] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.walkable(nx, ny)) continue;
        if (dx && dy && (!this.walkable(cx + dx, cy) || !this.walkable(cx, cy + dy))) continue;
        const ni = ny * W + nx;
        if (closed[ni]) continue;
        const extra = costFn ? costFn(nx, ny) : 0;
        const ng = g[cur] + c + extra;
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; heap.push(ni, ng + h(nx, ny)); }
      }
    }
    if (came[goal] === -1) return null;
    const path = [];
    for (let i = goal; i !== s && i !== -1; i = came[i]) path.push({ x: (i % W) + 0.5, y: ((i / W) | 0) + 0.5 });
    path.reverse();
    return path;
  }

  // Line of sight บน grid (ผ่านเฉพาะ tile ที่เดินได้)
  los(a, b) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!this.walkable(Math.floor(a.x + (b.x - a.x) * t), Math.floor(a.y + (b.y - a.y) * t))) return false;
    }
    return true;
  }

  randomTileInRoom(r, rng) {
    return { x: r.x + rng.int(0, r.w - 1) + 0.5, y: r.y + rng.int(0, r.h - 1) + 0.5 };
  }

  // ---------- ประเมินความยากของเส้นทาง (GDD §4) ----------
  evaluateDifficulty() {
    const g = this.game;
    const e = this.entrancePos(), c = this.corePos();
    const path = this.findPath(e.x, e.y, c.x, c.y);
    if (!path) return { score: 0, label: 'Core ไม่เชื่อมต่อ!', length: 0 };
    const roomsOnPath = new Set();
    let traps = 0;
    for (const p of path) {
      const rid = this.roomIdAt(Math.floor(p.x), Math.floor(p.y)); if (rid) roomsOnPath.add(rid);
      if (this.trapAt.has(`${Math.floor(p.x)},${Math.floor(p.y)}`)) traps++;
    }
    let power = 0, monsterCount = 0, roomLv = 0;
    for (const m of g.state.monsters) {
      if (m.assignment.type === 'guard' && roomsOnPath.has(m.assignment.roomId) && !m.ko) {
        const s = g.monsters.stats(m);
        power += (s.hp * 0.2 + s.atk * 2 + s.def * 1.5 + s.mag * 1.5); monsterCount++;
      }
    }
    for (const rid of roomsOnPath) roomLv += this.getRoom(rid).level;
    let branches = 0;
    for (const p of path) {
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.walkable(Math.floor(p.x) + dx, Math.floor(p.y) + dy)) n++;
      if (n >= 3) branches++;
    }
    const core = g.state.core;
    const score = Math.round(power + traps * 25 + roomLv * 10 + path.length * 2 + branches * 3 + core.maxHp * 0.1);
    const label = score < 120 ? 'ง่ายมาก' : score < 250 ? 'ง่าย' : score < 500 ? 'ปานกลาง' : score < 1000 ? 'ยาก' : score < 2500 ? 'ยากมาก' : 'นรก';
    return { score, label, length: path.length, traps, monsterCount, rooms: roomsOnPath.size, branches, path };
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(k, p) {
    this.k.push(k); this.p.push(p);
    let i = this.k.length - 1;
    while (i > 0) {
      const pa = (i - 1) >> 1;
      if (this.p[pa] <= this.p[i]) break;
      [this.k[pa], this.k[i]] = [this.k[i], this.k[pa]]; [this.p[pa], this.p[i]] = [this.p[i], this.p[pa]];
      i = pa;
    }
  }
  pop() {
    const top = this.k[0];
    const lk = this.k.pop(), lp = this.p.pop();
    if (this.k.length) {
      this.k[0] = lk; this.p[0] = lp;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < this.k.length && this.p[l] < this.p[m]) m = l;
        if (r < this.k.length && this.p[r] < this.p[m]) m = r;
        if (m === i) break;
        [this.k[m], this.k[i]] = [this.k[i], this.k[m]]; [this.p[m], this.p[i]] = [this.p[i], this.p[m]];
        i = m;
      }
    }
    return top;
  }
}

export { T_ROCK, T_CORRIDOR, T_ROOM };
