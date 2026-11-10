// InventoryManager — เก็บ จัดเรียง ขาย ใช้ สวมใส่ ถอด อัปเกรด คราฟต์ (GDD §17)
import { BALANCE } from '../config/balance.js';
import { ITEMS, RECIPES } from '../data/items.js';
import { uid } from '../core/util.js';

const L = BALANCE.loot;
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const BASE_SLOTS = 12;

export class InventoryManager {
  constructor(game) { this.game = game; }
  get items() { return this.game.state.inventory; }

  itemName(itemId) { return ITEMS[itemId]?.name || itemId; }
  def(it) { return ITEMS[it.itemId]; }

  capacity() {
    return BASE_SLOTS + this.game.dungeon.roomsOfType('storage_room', false).reduce((s, r) => s + this.game.dungeon.roomCapacity(r), 0);
  }
  usedSlots() { return this.items.length; }
  freeSlots() { return this.capacity() - this.usedSlots(); }

  count(itemId) { return this.items.filter((i) => i.itemId === itemId).reduce((s, i) => s + i.qty, 0); }

  // คืน true เมื่อเก็บได้สำเร็จ
  add(itemId, qty = 1, rarity = 'common') {
    const d = ITEMS[itemId];
    if (!d) { console.warn('Unknown item', itemId); return true; }
    if (d.stack) {
      const ex = this.items.find((i) => i.itemId === itemId);
      if (ex) { ex.qty += qty; return true; }
      if (this.freeSlots() <= 0) return false;
      this.items.push({ uid: uid(this.game, 'i'), itemId, rarity: d.type === 'crystal' ? 'rare' : 'common', qty, plus: 0 });
      return true;
    }
    for (let k = 0; k < qty; k++) {
      if (this.freeSlots() <= 0) return false;
      this.items.push({ uid: uid(this.game, 'i'), itemId, rarity, qty: 1, plus: 0 });
    }
    return true;
  }

  removeById(itemId, qty) {
    let left = qty;
    for (const it of [...this.items]) {
      if (it.itemId !== itemId || left <= 0) continue;
      const take = Math.min(it.qty, left);
      it.qty -= take; left -= take;
      if (it.qty <= 0) this.items.splice(this.items.indexOf(it), 1);
    }
    return left === 0;
  }

  get(uidv) { return this.items.find((i) => i.uid === uidv) || null; }
  getEquipped(uidv) { return this.game.state.equipped[uidv] || null; }

  itemStats(it) {
    const d = ITEMS[it.itemId]; if (!d?.stats) return {};
    const m = (L.rarityStatMult[it.rarity] || 1) * (1 + 0.1 * (it.plus || 0));
    const out = {};
    for (const [k, v] of Object.entries(d.stats)) out[k] = k === 'crit' || k === 'spd' ? +(v * m).toFixed(2) : Math.round(v * m * 10) / 10;
    return out;
  }

  sellPrice(it) {
    const d = ITEMS[it.itemId];
    return Math.max(1, Math.round(d.price * (L.rarityPriceMult[it.rarity] || 1) * (1 + 0.15 * (it.plus || 0)) * BALANCE.economy.sellMultiplier));
  }

  sell(uidv, qty = null) {
    const it = this.get(uidv); if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    const n = Math.min(it.qty, qty ?? it.qty);
    const price = this.sellPrice(it) * n;
    it.qty -= n;
    if (it.qty <= 0) this.items.splice(this.items.indexOf(it), 1);
    const cat = ITEMS[it.itemId].type === 'material' ? 'material_sale' : 'equipment_sale';
    this.game.economy.earn(cat, price);
    return { ok: true, gold: price };
  }

  equip(m, uidv) {
    const it = this.get(uidv); if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    const d = ITEMS[it.itemId];
    if (!d.slot) return { ok: false, reason: 'สวมใส่ไม่ได้' };
    if (m.equipment[d.slot]) {
      const r = this.unequip(m, d.slot); if (!r.ok) return r;
    }
    this.items.splice(this.items.indexOf(it), 1);
    this.game.state.equipped[it.uid] = it;
    const before = this.game.monsters.stats(m).hp;
    m.equipment[d.slot] = it.uid;
    const after = this.game.monsters.stats(m).hp;
    m.hp = Math.max(1, Math.min(after, m.hp + (after - before)));
    return { ok: true };
  }

  unequip(m, slot, force = false) {
    const u = m.equipment[slot]; if (!u) return { ok: false, reason: 'ไม่มีไอเทม' };
    const it = this.game.state.equipped[u];
    if (!force && this.freeSlots() <= 0) return { ok: false, reason: 'คลังเต็ม' };
    delete this.game.state.equipped[u];
    m.equipment[slot] = null;
    if (it) {
      if (this.freeSlots() > 0) this.items.push(it);
      else {
        const p = this.game.monsters.homePos();
        this.game.cleaning.spawn('loot', p.x, p.y, { items: [{ itemId: it.itemId, rarity: it.rarity, qty: 1 }], gold: 0 });
        this.game.notify(`คลังเต็ม — ${this.itemName(it.itemId)} ถูกวางไว้ที่พื้น`, 'warn');
      }
    }
    const max = this.game.monsters.stats(m).hp;
    if (m.hp > max) m.hp = max;
    return { ok: true };
  }

  use(uidv, m) {
    const it = this.get(uidv); if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    const d = ITEMS[it.itemId];
    if (!d.use) return { ok: false, reason: 'ใช้ไม่ได้' };
    if (!m) return { ok: false, reason: 'เลือกมอนสเตอร์' };
    if (m.ko && !d.use.heal) return { ok: false, reason: 'มอนสเตอร์หมดสติ' };
    const max = this.game.monsters.stats(m).hp;
    if (d.use.heal) {
      if (m.ko) { m.ko.until = Math.min(m.ko.until, this.game.state.time + 30); }
      else m.hp = Math.min(max, m.hp + max * d.use.heal);
    }
    if (d.use.fatigue) m.fatigue = Math.max(0, m.fatigue + d.use.fatigue);
    if (d.use.loyalty) m.loyalty = Math.min(100, m.loyalty + d.use.loyalty);
    if (d.use.hunger) m.hunger = Math.max(0, m.hunger + d.use.hunger);
    it.qty--;
    if (it.qty <= 0) this.items.splice(this.items.indexOf(it), 1);
    this.game.combat.burst(m, 0.6, 'heal');
    return { ok: true };
  }

  upgradeCost(it) {
    return Math.round(ITEMS[it.itemId].price * (L.rarityPriceMult[it.rarity] || 1) * L.itemUpgradeCostMult * ((it.plus || 0) + 1));
  }

  upgrade(uidv) {
    const it = this.get(uidv) || this.game.state.equipped[uidv];
    if (!it) return { ok: false, reason: 'ไม่พบไอเทม' };
    if (!ITEMS[it.itemId].stats) return { ok: false, reason: 'อัปเกรดไม่ได้' };
    if ((it.plus || 0) >= L.itemUpgradeMax) return { ok: false, reason: 'สูงสุดแล้ว' };
    const cost = this.upgradeCost(it);
    if (!this.game.economy.spend('item_upgrade', cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    it.plus = (it.plus || 0) + 1;
    return { ok: true };
  }

  canCraft(recipe) {
    for (const [mat, q] of Object.entries(recipe.materials)) if (this.count(mat) < q) return { ok: false, reason: `${this.itemName(mat)} ไม่พอ` };
    if (this.game.state.gold < recipe.gold) return { ok: false, reason: 'Gold ไม่พอ' };
    const stackExists = ITEMS[recipe.result].stack && this.items.some((i) => i.itemId === recipe.result);
    if (!stackExists && this.freeSlots() <= 0) return { ok: false, reason: 'คลังเต็ม' };
    return { ok: true };
  }

  craft(recipeId) {
    const r = RECIPES.find((x) => x.id === recipeId); if (!r) return { ok: false, reason: 'ไม่พบสูตร' };
    const chk = this.canCraft(r); if (!chk.ok) return chk;
    this.game.economy.spend('crafting', r.gold);
    for (const [mat, q] of Object.entries(r.materials)) this.removeById(mat, q);
    const rarity = this.game.rng.chance(0.15) ? 'uncommon' : 'common';
    this.add(r.result, 1, rarity);
    this.game.notify(`คราฟต์ ${this.itemName(r.result)} สำเร็จ`, 'good');
    return { ok: true };
  }

  sort(mode = 'type') {
    const order = ['weapon', 'armor', 'helmet', 'shield', 'ring', 'necklace', 'potion', 'crystal', 'material'];
    const cmp = {
      type: (a, b) => order.indexOf(ITEMS[a.itemId].type) - order.indexOf(ITEMS[b.itemId].type) || a.itemId.localeCompare(b.itemId),
      rarity: (a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
      price: (a, b) => this.sellPrice(b) * b.qty - this.sellPrice(a) * a.qty,
    }[mode];
    if (cmp) this.items.sort(cmp);
  }
}

export { RARITY_ORDER };
