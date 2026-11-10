// ProgressionManager — Dungeon Level 1–10, เงื่อนไข Rank Up (GDD §21–22) และ Reputation (GDD §25)
import { BALANCE } from '../config/balance.js';
import { LEVELS, REQ_LABELS } from '../data/levels.js';
import { MONSTERS, isRecruitable } from '../data/monsters.js';
import { ROOMS } from '../data/rooms.js';

export class ReputationManager {
  constructor(game) { this.game = game; }
  add(amount, reason) {
    const s = this.game.state;
    s.reputation = Math.max(0, Math.min(BALANCE.reputation.maxRep, +(s.reputation + amount).toFixed(2)));
    s.repLog ||= {};
    s.repLog[reason] = +((s.repLog[reason] || 0) + amount).toFixed(2);
  }
  title() {
    const r = this.game.state.reputation;
    return r < 20 ? 'ไม่มีใครรู้จัก' : r < 80 ? 'ข่าวลือ' : r < 200 ? 'เป็นที่รู้จัก' : r < 500 ? 'น่าเกรงขาม' : r < 1200 ? 'ตำนาน' : 'จอมมาร';
  }
}

export class ProgressionManager {
  constructor(game) { this.game = game; }

  current() { return LEVELS[this.game.state.dungeonLevel - 1]; }
  next() { return LEVELS[this.game.state.dungeonLevel] || null; }

  values() {
    const s = this.game.state;
    return {
      kills: s.stats.kills,
      rooms: s.dungeon.rooms.filter((r) => r.status === 'active').length,
      monsters: s.monsters.length,
      totalIncome: s.stats.totalIncome,
      defenses: s.stats.defenses,
    };
  }

  requirements() {
    const req = this.current().req;
    if (!req) return [];
    const v = this.values();
    return Object.entries(req).map(([k, need]) => ({ key: k, label: REQ_LABELS[k], have: v[k], need, met: v[k] >= need }));
  }

  canRankUp() {
    const next = this.next();
    if (!next) return { ok: false, reason: 'ถึงระดับสูงสุดแล้ว' };
    if (this.game.state.heroes.length) return { ok: false, reason: 'รอให้ผู้กล้าออกจากดันเจี้ยนก่อน' };
    const reqs = this.requirements();
    if (!reqs.every((r) => r.met)) return { ok: false, reason: 'ยังไม่ผ่านเงื่อนไข' };
    return { ok: true };
  }

  rankUp() {
    const chk = this.canRankUp(); if (!chk.ok) return chk;
    const g = this.game;
    g.state.dungeonLevel++;
    const lv = this.current();
    const newMonsters = Object.keys(MONSTERS).filter((id) => isRecruitable(id) && MONSTERS[id].unlock === lv.level).map((id) => MONSTERS[id].name);
    const newRooms = Object.keys(ROOMS).filter((id) => ROOMS[id].unlock === lv.level).map((id) => ROOMS[id].th);
    g.reputation.add(10 * lv.level, 'rank_up');
    g.state.core.hp = g.state.core.maxHp;
    g.inventory.add('boss_soul', 1);
    g.notify(`ดันเจี้ยนเลื่อนเป็น Level ${lv.level} — ${lv.name}! (ได้รับ Boss Soul x1)`, 'good');
    g.audio?.play('rankup');
    g.bus.emit('rank_up', { level: lv.level, newMonsters, newRooms, unlocks: lv.unlocks });
    return { ok: true, level: lv.level, newMonsters, newRooms };
  }
}
