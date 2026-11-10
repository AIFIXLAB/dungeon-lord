// TrainingManager — ฝึก ATK/DEF/HP/SPD/MAG/Skill ใน Training Room (GDD §7)
import { BALANCE } from '../config/balance.js';
import { PERSONALITIES } from '../data/monsters.js';
import { moveToward } from '../core/movement.js';

const TB = BALANCE.training;
// Monster Bible §10.1
export const TRAINING_TYPES = {
  atk: { name: 'Strength Training', th: 'ฝึกพลัง (ATK)', stat: 'atk' },
  matk: { name: 'Magic Training', th: 'ฝึกเวท (MATK)', stat: 'matk' },
  def: { name: 'Defense Training', th: 'ฝึกป้องกัน (DEF)', stat: 'def' },
  mdef: { name: 'Spirit Training', th: 'ฝึกต้านเวท (MDEF)', stat: 'mdef' },
  hp: { name: 'Endurance Training', th: 'ฝึกความอึด (HP)', stat: 'hp' },
  spd: { name: 'Speed Training', th: 'ฝึกความเร็ว (SPD)', stat: 'spd' },
  acc: { name: 'Accuracy Training', th: 'ฝึกความแม่น (ACC)', stat: 'acc' },
  res: { name: 'Resistance Training', th: 'ฝึกต้านสถานะ (RES)', stat: 'res' },
  skill: { name: 'Skill Training', th: 'ฝึกสกิล', stat: 'skill' },
  loyalty: { name: 'Loyalty Training', th: 'ฝึกความภักดี', stat: 'loyalty' },
};
export function fatigueEfficiency(f) { for (const [max, e] of BALANCE.training.fatigueBands) if (f <= max) return e; return 0; }

export class TrainingManager {
  constructor(game) { this.game = game; }

  cost(m) { return TB.baseCost + TB.costPerLevel * m.level; }

  rooms() { return this.game.dungeon.roomsOfType('training_room'); }
  slotsUsed(room) { return this.game.state.monsters.filter((m) => m.training && m.training.roomId === room.id).length; }
  freeRoom() { return this.rooms().find((r) => this.slotsUsed(r) < this.game.dungeon.roomCapacity(r)) || null; }

  start(m, type, repeat = true) {
    if (!TRAINING_TYPES[type]) return { ok: false, reason: 'ประเภทการฝึกไม่ถูกต้อง' };
    if (!this.rooms().length) return { ok: false, reason: 'ต้องสร้าง Training Room ก่อน' };
    if (m.ko) return { ok: false, reason: 'มอนสเตอร์หมดสติอยู่' };
    if (m.isBoss) return { ok: false, reason: 'บอสฝึกไม่ได้' };
    if (fatigueEfficiency(m.fatigue) <= 0) return { ok: false, reason: 'Fatigue เกิน 80 — ให้พักก่อน' };
    if (type === 'skill' && m.skillMastery >= TB.skillMasteryMax) return { ok: false, reason: 'Skill Mastery สูงสุดแล้ว' };
    this.game.monsters.assign(m, { type: 'train', stat: type, repeat });
    return { ok: true };
  }

  cancel(m, toGuard) {
    if (m.training) {
      m.training = null;
    }
    if (toGuard && m.assignment.type === 'train') m.assignment = { type: 'guard', roomId: this.game.dungeon.defaultGuardRoom()?.id };
  }

  update(m, dt) {
    const g = this.game;
    const a = m.assignment;
    if (!m.training) {
      const room = this.freeRoom();
      if (!room) { m.ai = 'wait_train'; g.monsters.guard(m, dt); return; }
      const inRoom = g.dungeon.roomIdAt(Math.floor(m.x), Math.floor(m.y)) === room.id;
      if (!inRoom) {
        m.ai = 'to_train';
        if (!m.patrol || g.dungeon.roomIdAt(Math.floor(m.patrol.x), Math.floor(m.patrol.y)) !== room.id) m.patrol = g.dungeon.randomTileInRoom(room, g.rng);
        const r = moveToward(g, m, m.patrol.x, m.patrol.y, dt, g.combat.moveSpeed(m));
        if (r === 'blocked') m.patrol = null;
        return;
      }
      const cost = this.cost(m);
      if (!g.economy.spend('monster_training', cost)) {
        g.notify(`Gold ไม่พอสำหรับฝึก ${m.name} (${cost}) — กลับไปเฝ้าห้อง`, 'warn');
        this.cancel(m, true);
        return;
      }
      m.training = { roomId: room.id, type: a.stat, start: g.state.time, end: g.state.time + TB.sessionHours * 60 };
      m.moving = false;
    }
    m.ai = 'training';
    m.moving = false;
    m.trainAnim = (m.trainAnim || 0) + dt;
    if (g.state.time >= m.training.end) this.complete(m);
  }

  complete(m) {
    const g = this.game;
    const t = m.training;
    const room = g.dungeon.getRoom(t.roomId);
    const tr = PERSONALITIES[m.trait] || {};
    let eff = (room ? g.dungeon.roomEffect(room, 'trainMult') * g.cleaning.efficiency(room) : 1) * (tr.trainMult || 1);
    eff *= Math.max(0.3, fatigueEfficiency(m.fatigue));
    if (m.hunger >= BALANCE.monsters.hungerHighThreshold) eff *= 0.7;
    const def = TRAINING_TYPES[t.type];
    let msg;
    if (def.stat === 'skill') {
      m.skillMastery = Math.min(TB.skillMasteryMax, (m.skillMastery || 0) + 0.34 * eff);
      msg = `Skill Mastery ${m.skillMastery.toFixed(1)}`;
    } else if (def.stat === 'loyalty') {
      m.loyalty = Math.min(100, m.loyalty + TB.loyaltyGain * eff);
      msg = `Loyalty ${Math.round(m.loyalty)}`;
    } else {
      const gain = +(TB.statGain[def.stat] * eff * (def.stat === 'res' ? 1 : 1 + m.level * 0.05)).toFixed(3);
      m.trained[def.stat] = +((m.trained[def.stat] || 0) + gain).toFixed(2);
      if (def.stat === 'hp') m.hp += gain;
      msg = `${def.stat.toUpperCase()} +${gain}`;
    }
    m.fatigue = Math.min(100, m.fatigue + TB.fatiguePerSession * (tr.fatigueMult || 1));
    g.monsters.gainExp(m, TB.expPerSession * eff);
    g.combat.text(m, msg, '#8affc8');
    g.state.stats.trainings++;
    m.training = null;
    // บาดเจ็บเมื่อเหนื่อยเกิน
    if (m.fatigue > 60 && g.rng.chance(BALANCE.monsters.injuryChanceHighFatigue * (m.fatigue > 80 ? 2 : 1))) {
      g.notify(`${m.name} บาดเจ็บจากการฝึกหนักเกินไป!`, 'bad');
      g.monsters.knockout(m, null);
      m.ko.until = g.state.time + 3 * 60;
      return;
    }
    if (!m.assignment.repeat || (def.stat === 'skill' && m.skillMastery >= TB.skillMasteryMax) || (def.stat === 'loyalty' && m.loyalty >= 100)) {
      this.cancel(m, true);
      g.notify(`${m.name} ฝึกเสร็จแล้ว (${msg})`, 'info');
    }
  }
}
