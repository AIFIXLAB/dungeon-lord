// InventoryManager — คลัง (แท็บ, Lock, ขาย, ขาย Common ทั้งหมด, ใช้, สวมใส่, อัปเกรด),
// ระบบแปรรูป (Processing Stations), ครัวมอนสเตอร์ (Monster Cuisine) และบัฟอาหาร — ตาม Hero Loot & Cuisine Spec
import { BALANCE } from '../config/balance.js';
import { ITEMS, RECIPES, STATIONS, LEGACY_ITEMS } from '../data/items.js';
import { uid } from '../core/util.js';

const L = BALANCE.loot;
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const BASE_SLOTS = 24;

export class InventoryManager {
  constructor(game) { this.game = game; }
  get items() { return this.game.state.inventory; }
  get st() { return (this.game.state.stations ||= {}); }
  get jobs() { return (this.game.state.procJobs ||= []); }

  itemName(itemId) { return ITEMS[itemId]?.th || ITEMS[itemId]?.name || itemId; }
  def(it) { return ITEMS[it.itemId]; }

  capacity() {
    return BASE_SLOTS + this.game.dungeon.roomsOfType('storage_room', false).reduce((s, r) => s + this.game.dungeon.roomCapacity(r), 0);
  }
  usedSlots() { return this.items.length; }
  freeSlots() { return this.capacity() - this.usedSlots(); }
  count(itemId) { return this.items.filter((i) => i.itemId === itemId).reduce((s, i) => s + i.qty, 0); }
  stackLimit() { return BALANCE.inventory.stackLimit; }

  // ไอเทมทุกชนิดซ้อนกันได้ (แยกตาม +อัปเกรด) — คืน true เมื่อเก็บได้ครบ
  add(itemId, qty = 1) {
    itemId = LEGACY_ITEMS[itemId] || itemId;
    if (!ITEMS[itemId]) { console.warn('Unknown item', itemId); return true; }
    let left = qty;
    for (const ex of this.items) {
      if (left <= 0) break;
      if (ex.itemId !== itemId || ex.plus) continue;
      const room = this.stackLimit() - ex.qty;
      const n = Math.min(room, left); ex.qty += n; left -= n;
    }
    while (left > 0 && this.freeSlots() > 0) {
      const n = Math.min(this.stackLimit(), left);
      this.items.push({ uid: uid(this.game, 'i'), itemId, qty: n, plus: 0, locked: false });
      left -= n;
    }
    if (left < qty) this.game.bus.emit('item_added', { itemId, qty: qty - left });
    return left === 0;
  }
  canAdd(itemId, qty = 1) {
    let space = this.freeSlots() * this.stackLimit();
    for (const ex of this.items) if (ex.itemId === itemId && !ex.plus) space += this.stackLimit() - ex.qty;
    return space >= qty;
  }

  removeById(itemId, qty) {
    if (this.count(itemId) < qty) return false;
    let left = qty;
    for (const it of [...this.items].sort((a, b) => a.qty - b.qty)) {
      if (it.itemId !== itemId || left <= 0) continue;
      const take = Math.min(it.qty, left);
      it.qty -= take; left -= take;
      if (it.qty <= 0) this.items.splice(this.items.indexOf(it), 1);
    }
    return true;
  }
  takeOne(it) { it.qty--; if (it.qty <= 0) this.items.splice(this.items.indexOf(it), 1); }

  get(uidv) { return this.items.find((i) => i.uid === uidv) || null; }
  getEquipped(uidv) { return this.game.state.equipped[uidv] || null; }
  rarityOf(it) { return ITEMS[it.itemId]?.rarity || 'common'; }

  itemStats(it) {
    const d = ITEMS[it.itemId]; if (!d?.stats) return {};
    const m = 1 + 0.12 * (it.plus || 0);
    const out = {};
    for (const [k, v] of Object.entries(d.stats)) out[k] = k === 'crit' ? +(v * m).toFixed(3) : Math.round(v * m * 10) / 10;
    return out;
  }

  // sell_price_formula: floor(base_price × rarity_multiplier × (1 + market_bonus))
  marketBonus() { return Math.min(0.2, this.game.state.reputation / 5000); }
  sellPrice(it) { const d = ITEMS[it.itemId]; return Math.max(1, Math.floor(d.price * (1 + 0.15 * (it.plus || 0)) * (1 + this.marketBonus()))); }

  sell(uidv, qty = null) {
    const it = this.get(uidv); if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    if (it.locked) return { ok: false, reason: 'ไอเทมถูกล็อก' };
    const n = Math.min(it.qty, qty ?? it.qty);
    const price = this.sellPrice(it) * n;
    it.qty -= n;
    if (it.qty <= 0) this.items.splice(this.items.indexOf(it), 1);
    this.game.economy.earn(ITEMS[it.itemId].cat === 'equipment' ? 'equipment_sale' : 'material_sale', price);
    return { ok: true, gold: price };
  }

  sellAllCommon() {
    let gold = 0, n = 0;
    for (const it of [...this.items]) {
      if (it.locked || this.rarityOf(it) !== 'common' || it.plus) continue;
      if (['special'].includes(ITEMS[it.itemId].cat)) continue;
      gold += this.sell(it.uid).gold || 0; n++;
    }
    return { ok: n > 0, gold, count: n, reason: n ? '' : 'ไม่มีไอเทม Common ที่ขายได้' };
  }

  toggleLock(uidv) { const it = this.get(uidv); if (it) it.locked = !it.locked; return { ok: !!it }; }

  equip(m, uidv) {
    const it = this.get(uidv); if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    const d = ITEMS[it.itemId];
    if (!d.slot) return { ok: false, reason: 'สวมใส่ไม่ได้' };
    if (m.equipment[d.slot]) { const r = this.unequip(m, d.slot); if (!r.ok) return r; }
    const piece = { uid: uid(this.game, 'e'), itemId: it.itemId, qty: 1, plus: it.plus || 0 };
    this.takeOne(it);
    this.game.state.equipped[piece.uid] = piece;
    const before = this.game.monsters.stats(m).hp;
    m.equipment[d.slot] = piece.uid;
    const after = this.game.monsters.stats(m).hp;
    m.hp = Math.max(1, Math.min(after, m.hp + (after - before)));
    return { ok: true };
  }

  unequip(m, slot, force = false) {
    const u = m.equipment[slot]; if (!u) return { ok: false, reason: 'ไม่มีไอเทม' };
    const it = this.game.state.equipped[u];
    if (!force && it && !it.plus && !this.canAdd(it.itemId)) return { ok: false, reason: 'คลังเต็ม' };
    if (!force && it?.plus && this.freeSlots() <= 0) return { ok: false, reason: 'คลังเต็ม' };
    delete this.game.state.equipped[u];
    m.equipment[slot] = null;
    if (it) {
      let ok;
      if (it.plus) { ok = this.freeSlots() > 0; if (ok) this.items.push({ ...it, uid: uid(this.game, 'i'), locked: false }); }
      else ok = this.add(it.itemId, 1);
      if (!ok) {
        const p = this.game.monsters.homePos();
        this.game.cleaning.spawn('loot', p.x, p.y, { items: [{ itemId: it.itemId, qty: 1 }], gold: 0 });
        this.game.notify(`คลังเต็ม — ${this.itemName(it.itemId)} ถูกวางไว้ที่พื้น`, 'warn');
      }
    }
    const max = this.game.monsters.stats(m).hp;
    if (m.hp > max) m.hp = max;
    return { ok: true };
  }

  use(uidv, m) {
    const g = this.game;
    const it = this.get(uidv); if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    const d = ITEMS[it.itemId];
    if (d.feed) return this.feed(uidv, m);
    if (!d.use) return { ok: false, reason: 'ใช้ไม่ได้' };
    const u = d.use;
    if (u.gold) { const gold = g.rng.int(u.gold[0], u.gold[1]); g.economy.earn('loot_gold', gold); this.takeOne(it); return { ok: true, gold }; }
    if (!m) return { ok: false, reason: 'เลือกมอนสเตอร์' };
    if (m.ko && !u.heal) return { ok: false, reason: 'มอนสเตอร์หมดสติ' };
    const max = g.monsters.stats(m).hp;
    if (u.heal) { if (m.ko) m.ko.until = Math.min(m.ko.until, g.state.time + 30); else m.hp = Math.min(max, m.hp + max * u.heal); }
    if (u.mp) m.mp = g.monsters.stats(m).mp;
    if (u.fatigue) m.fatigue = Math.max(0, m.fatigue + u.fatigue);
    if (u.loyalty) m.loyalty = Math.min(100, m.loyalty + u.loyalty);
    if (u.hunger) m.hunger = Math.max(0, m.hunger + u.hunger);
    if (u.cure) g.combat.cleanse(m);
    this.takeOne(it);
    g.combat.burst(m, 0.6, 'heal');
    return { ok: true };
  }

  // ---------- Monster Cuisine ----------
  feed(uidv, m) {
    const g = this.game;
    const it = this.get(uidv); if (!it) return { ok: false, reason: 'ไม่พบอาหาร' };
    const r = RECIPES[ITEMS[it.itemId].feed];
    if (!m) return { ok: false, reason: 'เลือกมอนสเตอร์' };
    if (m.ko) return { ok: false, reason: 'มอนสเตอร์หมดสติ' };
    // หนึ่งบัฟต่อหนึ่งตัว — มื้อใหม่แทนที่มื้อเก่า (food_buff_rule)
    m.foodBuff = { id: ITEMS[it.itemId].feed, buff: { ...r.buff }, until: g.state.time + r.hours * 60 };
    if (r.buff.healFull) m.hp = g.monsters.stats(m).hp;
    m.hunger = Math.max(0, m.hunger - 40);
    m.loyalty = Math.min(100, m.loyalty + 3);
    this.takeOne(it);
    g.combat.burst(m, 0.8, 'buff');
    g.combat.text(m, r.name, '#ffd27a');
    return { ok: true };
  }

  canCook(rid, times = 1) {
    const r = RECIPES[rid]; if (!r) return { ok: false, reason: 'ไม่พบสูตร' };
    if (!this.st.kitchen) return { ok: false, reason: 'ต้องสร้างครัวมอนสเตอร์ก่อน' };
    for (const [k, q] of Object.entries(r.ingredients)) if (this.count(k) < q * times) return { ok: false, reason: `${this.itemName(k)} ไม่พอ (${this.count(k)}/${q * times})` };
    if (this.busy('kitchen') >= this.stationSlots('kitchen')) return { ok: false, reason: 'ครัวกำลังทำงานเต็ม' };
    return { ok: true };
  }
  cook(rid, times = 1) {
    const chk = this.canCook(rid, times); if (!chk.ok) return chk;
    const r = RECIPES[rid];
    for (const [k, q] of Object.entries(r.ingredients)) this.removeById(k, q * times);
    this.jobs.push({ id: uid(this.game, 'j'), st: 'kitchen', out: { [rid]: times }, start: this.game.state.time, end: this.game.state.time + r.cookHours * 60 * Math.sqrt(times) });
    return { ok: true };
  }

  // ---------- Processing Stations ----------
  stationSlots(st) { return this.st[st] ? (this.st[st].level || 1) : 0; }
  busy(st) { return this.jobs.filter((j) => j.st === st).length; }
  buildStation(st) {
    const s = STATIONS[st]; if (!s) return { ok: false, reason: 'ไม่มีสถานีนี้' };
    if (s.unlock > this.game.state.dungeonLevel) return { ok: false, reason: `ปลดล็อกที่ Dungeon Lv.${s.unlock}` };
    const lvl = this.st[st]?.level || 0;
    if (lvl >= 3) return { ok: false, reason: 'ระดับสูงสุดแล้ว' };
    const cost = this.stationCost(st);
    if (!this.game.economy.spend('station', cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    this.st[st] = { level: lvl + 1 };
    this.game.notify(`${s.th} Lv.${lvl + 1} พร้อมใช้งาน`, 'good');
    return { ok: true };
  }
  stationCost(st) { return Math.round(STATIONS[st].cost * Math.pow(2.2, this.st[st]?.level || 0)); }

  canProcess(uidv, times = 1) {
    const it = this.get(uidv); if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    if (it.locked) return { ok: false, reason: 'ไอเทมถูกล็อก' };
    const d = ITEMS[it.itemId];
    if (!d.proc) return { ok: false, reason: 'แปรรูปไม่ได้' };
    if (!this.st[d.proc.st]) return { ok: false, reason: `ต้องสร้าง ${STATIONS[d.proc.st].th} ก่อน` };
    const need = (d.procIn || 1) * times;
    if (this.count(it.itemId) < need) return { ok: false, reason: `ต้องใช้ ${need} ชิ้น` };
    if (this.game.state.gold < (d.proc.gold || 0) * times) return { ok: false, reason: 'Gold ไม่พอ' };
    if (this.busy(d.proc.st) >= this.stationSlots(d.proc.st)) return { ok: false, reason: 'สถานีกำลังทำงานเต็ม' };
    return { ok: true, d, need };
  }
  process(uidv, times = 1) {
    const chk = this.canProcess(uidv, times); if (!chk.ok) return chk;
    const { d, need } = chk;
    const it = this.get(uidv);
    if (d.proc.gold) this.game.economy.spend('processing', d.proc.gold * times);
    const itemId = it.itemId;
    this.removeById(itemId, need);
    const out = {}; for (const [k, q] of Object.entries(d.proc.out)) out[k] = q * times;
    const hours = (0.5 + RARITY_ORDER.indexOf(d.rarity) * 0.5) * Math.sqrt(times);
    this.jobs.push({ id: uid(this.game, 'j'), st: d.proc.st, input: itemId, out, start: this.game.state.time, end: this.game.state.time + hours * 60 });
    return { ok: true };
  }

  update() {
    const t = this.game.state.time;
    for (const j of [...this.jobs]) {
      if (t < j.end) continue;
      if (j.out && !Object.entries(j.out).every(([k, q]) => this.canAdd(k, q))) {
        if (!j.warned) { this.game.notify(`${STATIONS[j.st].th}: คลังเต็ม รอที่ว่างเพื่อรับผลผลิต`, 'warn'); j.warned = true; }
        continue;
      }
      for (const [k, q] of Object.entries(j.out)) this.add(k, q);
      this.jobs.splice(this.jobs.indexOf(j), 1);
      const names = Object.entries(j.out).map(([k, q]) => `${this.itemName(k)} x${q}`).join(', ');
      this.game.notify(`${STATIONS[j.st].th}: เสร็จแล้ว — ได้ ${names}`, 'good');
    }
    // หมดเวลาบัฟอาหาร
    for (const m of this.game.state.monsters) if (m.foodBuff && t >= m.foodBuff.until) m.foodBuff = null;
  }

  upgradeCost(it) { return Math.round(Math.max(30, ITEMS[it.itemId].price) * L.itemUpgradeCostMult * ((it.plus || 0) + 1) * 2); }
  upgrade(uidv) {
    let it = this.get(uidv) || this.game.state.equipped[uidv];
    if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    if (!ITEMS[it.itemId].stats) return { ok: false, reason: 'อัปเกรดไม่ได้' };
    if ((it.plus || 0) >= L.itemUpgradeMax) return { ok: false, reason: 'สูงสุดแล้ว' };
    const cost = this.upgradeCost(it);
    if (this.count('steel_ingot') < 1 + (it.plus || 0)) return { ok: false, reason: `ต้องใช้แท่งเหล็กกล้า x${1 + (it.plus || 0)}` };
    if (!this.game.economy.spend('item_upgrade', cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    this.removeById('steel_ingot', 1 + (it.plus || 0));
    if (this.get(uidv) && it.qty > 1) { // แยกชิ้นที่อัปเกรดออกจากกอง
      it.qty--; const one = { uid: uid(this.game, 'i'), itemId: it.itemId, qty: 1, plus: 0, locked: it.locked }; this.items.push(one); it = one;
    }
    it.plus = (it.plus || 0) + 1;
    return { ok: true, uid: it.uid };
  }

  sort(mode = 'type') {
    const cats = ['equipment', 'loot', 'gem', 'material', 'food', 'special'];
    const cmp = {
      type: (a, b) => cats.indexOf(ITEMS[a.itemId].cat) - cats.indexOf(ITEMS[b.itemId].cat) || a.itemId.localeCompare(b.itemId),
      rarity: (a, b) => RARITY_ORDER.indexOf(this.rarityOf(b)) - RARITY_ORDER.indexOf(this.rarityOf(a)),
      price: (a, b) => this.sellPrice(b) * b.qty - this.sellPrice(a) * a.qty,
      qty: (a, b) => b.qty - a.qty,
    }[mode];
    if (cmp) this.items.sort(cmp);
  }
}

export { RARITY_ORDER };
