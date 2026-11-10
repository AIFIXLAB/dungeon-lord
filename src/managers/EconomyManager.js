// EconomyManager — รายรับ รายจ่าย ค่าบำรุงรายวัน อาหาร ร้านค้า Merchant (GDD §18–20)
import { BALANCE } from '../config/balance.js';
import { ROOMS } from '../data/rooms.js';
import { TRAPS } from '../data/traps.js';
import { ITEMS, SHOP } from '../data/items.js';
import { speciesInfo } from './MonsterManager.js';

export const INCOME_LABELS = {
  hero_defeat: 'รางวัลกำจัดผู้กล้า', loot_gold: 'ทองจาก Loot', equipment_sale: 'ขายอุปกรณ์', material_sale: 'ขายวัตถุดิบ',
  event: 'เหตุการณ์', refund: 'เงินคืน',
};
export const EXPENSE_LABELS = {
  monster_recruitment: 'จ้างมอนสเตอร์', monster_food: 'ซื้ออาหาร', monster_training: 'ฝึกมอนสเตอร์', room_construction: 'ก่อสร้าง',
  room_upgrade: 'อัปเกรดห้อง', maintenance: 'ค่าบำรุงรักษา', trap_production: 'กับดัก', evolution: 'วิวัฒนาการ',
  core_upgrade: 'อัปเกรด Core', boss_summon: 'อัญเชิญบอส', fusion: 'Fusion', expansion: 'ขยายพื้นที่', shop: 'ซื้อของ Merchant', item_upgrade: 'อัปเกรดไอเทม',
  crafting: 'คราฟต์', stolen: 'ถูกขโมย', event: 'เหตุการณ์',
};

export class EconomyManager {
  constructor(game) { this.game = game; }
  get e() { return this.game.state.economy; }

  record(kind, cat, amount) {
    const bucket = kind === 'income' ? this.e.today.income : this.e.today.expense;
    bucket[cat] = (bucket[cat] || 0) + amount;
  }

  earn(cat, amount, countsAsIncome = true) {
    amount = Math.round(amount);
    if (amount <= 0) return;
    this.game.state.gold += amount;
    this.record('income', cat, amount);
    if (countsAsIncome) this.game.state.stats.totalIncome += amount;
  }

  spend(cat, amount) {
    amount = Math.round(amount);
    if (amount < 0) return false;
    if (this.game.state.gold < amount) return false;
    this.game.state.gold -= amount;
    this.record('expense', cat, amount);
    return true;
  }

  // ---------- ค่าใช้จ่ายรายวัน ----------
  dailyUpkeep() {
    const g = this.game;
    const monsters = g.state.monsters.reduce((s, m) => s + g.monsters.upkeep(m), 0);
    const rooms = g.dungeon.d.rooms.reduce((s, r) => s + Math.round((ROOMS[r.type].upkeep || 0) * Math.pow(BALANCE.economy.roomUpkeepGrowth, r.level - 1) * (1 + (g.state.dungeonLevel - 1) * 0.15)), 0);
    const traps = g.dungeon.d.traps.reduce((s, t) => s + (TRAPS[t.type].upkeep || 0), 0);
    return { monsters, rooms, traps, total: monsters + rooms + traps };
  }

  foodNeed() { return this.game.state.monsters.reduce((s, m) => s + (speciesInfo(m.species).foodPerDay || 1), 0); }
  foodProduction() {
    return this.game.dungeon.roomsOfType('food_farm').reduce((s, r) => s + this.game.dungeon.roomEffect(r, 'foodPerDay') * this.game.cleaning.efficiency(r), 0);
  }

  foodPrice() { return BALANCE.economy.foodPrice * (this.game.state.shopDiscountDays > 0 ? 0.75 : 1); }

  buyFood(qty) {
    qty = Math.floor(qty); if (qty <= 0) return { ok: false, reason: 'จำนวนไม่ถูกต้อง' };
    const cost = Math.ceil(qty * this.foodPrice());
    if (!this.spend('monster_food', cost)) return { ok: false, reason: 'Gold ไม่พอ' };
    this.game.state.food += qty;
    return { ok: true, cost };
  }

  shopItems() {
    const lvl = this.game.state.dungeonLevel;
    const disc = this.game.state.shopDiscountDays > 0 ? 0.75 : 1;
    const repDisc = 1 - Math.min(0.1, this.game.state.reputation / 5000);
    return SHOP.filter((s) => s.unlock <= lvl).map((s) => ({ ...s, price: Math.round(ITEMS[s.item].price * (s.priceMult || 1) * disc * repDisc) }));
  }

  buyItem(itemId) {
    const s = this.shopItems().find((x) => x.item === itemId);
    if (!s) return { ok: false, reason: 'ไม่มีขาย' };
    if (this.game.state.gold < s.price) return { ok: false, reason: 'Gold ไม่พอ' };
    const d = ITEMS[itemId];
    const stackExists = d.stack && this.game.inventory.count(itemId) > 0;
    if (!stackExists && this.game.inventory.freeSlots() <= 0) return { ok: false, reason: 'คลังเต็ม' };
    this.spend('shop', s.price);
    this.game.inventory.add(itemId, 1, 'common');
    return { ok: true };
  }

  // เรียกทุกเที่ยงคืน
  endOfDay() {
    const g = this.game;
    // 1) อาหาร
    g.state.food += Math.floor(this.foodProduction());
    if (g.state.settings.autoBuyFood) {
      const short = this.foodNeed() - g.state.food;
      if (short > 0) {
        const affordable = Math.min(short, Math.floor(g.state.gold / this.foodPrice()));
        if (affordable > 0) this.buyFood(affordable);
      }
    }
    const fed = new Set();
    // ให้อาหารตัวที่ Loyalty ต่ำก่อน
    const order = [...g.state.monsters].sort((a, b) => a.loyalty - b.loyalty);
    for (const m of order) {
      const need = speciesInfo(m.species).foodPerDay || 1;
      if (g.state.food >= need) { g.state.food -= need; fed.add(m.id); }
    }
    const unfed = g.state.monsters.length - fed.size;
    if (unfed > 0) g.notify(`อาหารไม่พอ! มอนสเตอร์ ${unfed} ตัวหิว (Loyalty และ ATK ลด)`, 'bad');
    // 2) ค่าบำรุง
    const up = this.dailyUpkeep();
    let paid = true;
    if (!this.spend('maintenance', up.total)) {
      paid = false;
      const part = g.state.gold;
      if (part > 0) this.spend('maintenance', part);
      g.notify(`จ่ายค่าบำรุงไม่ครบ (${up.total} Gold) — มอนสเตอร์ไม่พอใจ`, 'bad');
    }
    g.monsters.dailyNeeds(fed, paid);
    // 3) ปิดบัญชีวัน
    const inc = Object.values(this.e.today.income).reduce((a, b) => a + b, 0);
    const exp = Object.values(this.e.today.expense).reduce((a, b) => a + b, 0);
    this.e.history.push({ day: g.time.day - 1, income: inc, expense: exp, profit: inc - exp, detail: this.e.today });
    if (this.e.history.length > BALANCE.economy.historyDays) this.e.history.shift();
    this.e.today = { income: {}, expense: {} };
    if (g.state.shopDiscountDays > 0) g.state.shopDiscountDays--;
  }
}
