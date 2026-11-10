// EventManager — Random Events พร้อมทางเลือกของผู้เล่น (GDD §24)
import { BALANCE } from '../config/balance.js';
import { EVENTS } from '../data/events.js';
import { TRAPS } from '../data/traps.js';

export class EventManager {
  constructor(game) { this.game = game; }

  daily() {
    const g = this.game, s = g.state;
    if (s.pendingEvent) return;
    // Monster Rebellion: เมื่อ Loyalty เฉลี่ยต่ำ
    const avgLoy = s.monsters.length ? s.monsters.reduce((a, m) => a + m.loyalty, 0) / s.monsters.length : 100;
    if (avgLoy < 30 && g.rng.chance(0.5)) return this.trigger('monster_rebellion');
    if (!g.rng.chance(BALANCE.events.dailyChance)) return;
    const pool = {};
    for (const [id, e] of Object.entries(EVENTS)) if (e.weight > 0 && e.minLevel <= s.dungeonLevel) pool[id] = e.weight;
    this.trigger(g.rng.weighted(pool));
  }

  trigger(id) {
    const g = this.game;
    if (!EVENTS[id]) return;
    g.state.pendingEvent = { id, day: g.time.day };
    g.bus.emit('event', g.state.pendingEvent);
    if (g.headless) this.choose(0);
  }

  choose(index) {
    const g = this.game, s = g.state, rng = g.rng;
    const pe = s.pendingEvent; if (!pe) return { ok: false };
    const ev = EVENTS[pe.id];
    const c = ev.choices[index]; if (!c) return { ok: false };
    const e = c.effect;
    if (e.gold) {
      const amt = Array.isArray(e.gold) ? rng.int(e.gold[0], e.gold[1]) : e.gold;
      if (amt >= 0) g.economy.earn('event', amt, false);
      else if (!g.economy.spend('event', -amt)) { g.notify('Gold ไม่พอ — เลือกทางอื่น', 'bad'); return { ok: false, reason: 'Gold ไม่พอ' }; }
    }
    if (e.goldPerMonster) {
      const cost = -e.goldPerMonster * s.monsters.length;
      if (!g.economy.spend('event', cost)) { g.notify('Gold ไม่พอ — เลือกทางอื่น', 'bad'); return { ok: false, reason: 'Gold ไม่พอ' }; }
    }
    if (e.reputation) g.reputation.add(e.reputation, 'event');
    if (e.shopDiscountDays) s.shopDiscountDays = (s.shopDiscountDays || 0) + e.shopDiscountDays;
    if (e.sickMonsters) g.cleaning.outbreak(rng.int(1, e.sickMonsters));
    if (e.loyaltyAll) for (const m of s.monsters) m.loyalty = Math.max(0, Math.min(100, m.loyalty + e.loyaltyAll));
    if (e.freeMonster) {
      const pool = g.monsters.recruitableSpecies();
      const r = g.monsters.recruit(rng.pick(pool), null, true);
      if (!r.ok) g.notify('ที่พักเต็ม — มอนสเตอร์อพยพจากไป', 'warn');
    }
    if (e.raid) {
      const lvl = s.dungeonLevel;
      g.heroes.spawnParty(Math.min(6, 2 + lvl), { raid: true });
    }
    if (e.trapDamage) for (const t of g.dungeon.d.traps) t.durability = Math.max(0, Math.round(t.durability - TRAPS[t.type].durability * e.trapDamage));
    if (e.debris) {
      const rooms = g.dungeon.d.rooms.filter((r) => r.type !== 'core_room');
      for (let i = 0; i < e.debris && rooms.length; i++) {
        const p = g.dungeon.randomTileInRoom(rng.pick(rooms), rng);
        g.cleaning.spawn('debris', p.x, p.y);
      }
    }
    s.pendingEvent = null;
    g.notify(`${ev.th}: ${c.label}`, 'info');
    return { ok: true };
  }
}
