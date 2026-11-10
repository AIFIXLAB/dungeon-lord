// MonsterManager — ข้อมูลมอนสเตอร์รายตัว, สูตรค่าสถานะ (Base × Level Growth × Tier × Training × Equipment × Mutation),
// EXP/Level, Evolution, Boss (Phase / Enrage / Minion), Summon ชั่วคราว, Monster AI
import { BALANCE } from '../config/balance.js';
import { MONSTERS, PERSONALITIES, MUTATIONS, RARITY_ORDER, RARITY_UPKEEP, ROLE_TH } from '../data/monsters.js';
import { BOSSES, BOSS_TIERS } from '../data/bosses.js';
import { SKILLS, ROLE_PASSIVES } from '../data/skills.js';
import { uid, dist, clamp } from '../core/util.js';
import { moveToward, clearPath } from '../core/movement.js';

const MB = BALANCE.monsters, BB = BALANCE.boss;
const FRONT_ROLES = new Set(['tank', 'bruiser', 'dps', 'assassin', 'worker', 'boss']);

// แปลงข้อมูลบอสให้อยู่ในรูปแบบเดียวกับมอนสเตอร์
const BOSS_RARITY = { 1: 'rare', 2: 'epic', 3: 'epic', 4: 'legendary', 5: 'mythic' };
function bossSkillSpec(boss, sk, i) {
  const el = boss.element; const mag = ['mage', 'controller', 'summoner', 'healer', 'support'].includes(boss.role);
  const kind = mag ? 'mag' : 'phys';
  const ctl = /time stop|zero|petrif|frozen/i.test(sk.name) ? 'stun' : /root|web|prison/i.test(sk.name) ? 'root' : /curse|nightfall/i.test(sk.name) ? 'curse' : /ink/i.test(sk.name) ? 'blind' : 'slow';
  const map = {
    dmg: { type: 'dmg', kind, power: 2.2, cd: 7, element: el, range: mag ? 4 : 1.6 },
    aoe: { type: 'aoe', kind, power: 1.5, cd: 10, element: el, radius: 2.2, range: 3.6, status: SKILLS[`nova_${el}`]?.status },
    summon: { type: 'summon', cd: 24 },
    heal: { type: 'buff', target: 'self', status: { id: 'regen', dur: 9, pct: 0.025 }, cd: 18 },
    buff: { type: 'buff', target: 'self', status: { id: 'dr_up', dur: 8, pct: 0.35 }, cd: 16 },
    rally: { type: 'buff', target: 'party', radius: 6, status: { id: 'atk_up', dur: 8, pct: 0.3 }, cd: 16 },
    control: { type: 'debuff', status: { id: ctl, dur: ctl === 'stun' ? 1.5 : 3, chance: 0.8 }, cd: 12, range: 4 },
  };
  return { ...map[sk.type], name: sk.name, phase: i < 2 ? 1 : i === 2 ? 2 : 3 };
}
export function speciesInfo(id) {
  if (MONSTERS[id]) return MONSTERS[id];
  const b = BOSSES[id];
  if (!b) return MONSTERS.slime;
  return {
    id, name: b.name, role: 'boss', bossRole: b.role, element: b.element, rarity: BOSS_RARITY[b.tier], family: 'boss', tier: b.tier,
    base: Object.fromEntries(Object.entries(b.base).map(([k, v]) => [k, ['hp', 'atk', 'matk', 'def', 'mdef'].includes(k) ? Math.round(v * BB.statScale) : v])),
    growth: { hp: BB.levelGrowth, atk: BB.levelGrowth, matk: BB.levelGrowth, def: BB.levelGrowth, mdef: BB.levelGrowth },
    attack: b.base.range > 2 ? 'magic' : 'melee', upkeep: BOSS_TIERS[b.tier].upkeep, foodPerDay: 5 + b.tier * 3, food: 'Boss Feast',
    bossSkills: b.skills.map((s, i) => bossSkillSpec(b, s, i)), resist: {}, weak: b.weak, clean: 0.3, scale: b.scale, sprite: b.sprite,
    isBoss: true, evolutions: [], recruitable: false,
  };
}
export function tierOf(level) { let t = MB.tiers[0]; for (const x of MB.tiers) if (level >= x.from) t = x; return t; }
const MINION_BY_FAMILY = { slime: 'slime', goblin: 'goblin', undead: 'skeleton', insect: 'cave_spider', beast: 'wolf', plant: 'mushroom', construct: 'golem', demon: 'imp', dragon: 'fire_drake', spirit: 'wisp', aquatic: 'lizardman', holy: 'pink_slime', elemental: 'wisp', boss: 'skeleton' };
const BOSS_MINION = { water: 'slime', physical: 'goblin', poison: 'cave_spider', earth: 'golem', nature: 'mushroom', ice: 'ice_slime', fire: 'fire_slime', dark: 'skeleton', lightning: 'spark_slime', light: 'pink_slime', arcane: 'wisp', wind: 'bat' };

export class MonsterManager {
  constructor(game) { this.game = game; }
  get list() { return this.game.state.monsters; }
  get summons() { return (this.game.state.summons ||= []); }
  get(id) { return this.list.find((m) => m.id === id) || null; }
  all() { return [...this.list, ...this.summons]; }

  expToNext(level) { return Math.round(MB.expBase * Math.pow(MB.expGrowth, level - 1) + 10 * level); }
  levelCap(m) { return MB.levelCap + (m.mutations || []).reduce((s, k) => s + (MUTATIONS[k]?.levelCap || 0), 0); }

  // ---------- Stats (Monster Bible §6.1) ----------
  baseStats(m) {
    const sp = speciesInfo(m.species), b = sp.base, gr = sp.growth;
    const L = m.level - 1, tier = sp.isBoss ? 1 : tierOf(m.level).mult, t = m.trained || {};
    const grow = (k) => b[k] * (1 + L * (gr[k] || 0.06)) * tier;
    const s = {
      hp: grow('hp') + (t.hp || 0), atk: grow('atk') + (t.atk || 0), matk: grow('matk') + (t.matk || 0),
      def: grow('def') + (t.def || 0), mdef: grow('mdef') + (t.mdef || 0),
      spd: b.spd + (t.spd || 0), acc: (b.acc || 90) + (t.acc || 0), eva: b.eva || 5, crit: b.crit || 0.05, critDmg: b.critDmg || 1.5,
      res: (b.res || 0) + (t.res || 0), mp: (b.mp || 50) + m.level * 2, range: b.range || 1, aspd: b.aspd || 1,
    };
    if (m.isBoss) {
      const br = this.game.dungeon.roomsOfType('boss_room')[0];
      const bonus = 1 + (br ? this.game.dungeon.roomEffect(br, 'bossBonus') : 0);
      for (const k of ['hp', 'atk', 'matk', 'def', 'mdef']) s[k] *= bonus;
    }
    for (const k of m.mutations || []) for (const [st, v] of Object.entries(MUTATIONS[k]?.mods || {})) if (s[st] != null) s[st] *= 1 + v;
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const it = m.equipment?.[slot] && this.game.inventory.getEquipped(m.equipment[slot]);
      if (!it) continue;
      for (const [k, v] of Object.entries(this.game.inventory.itemStats(it))) s[k] = (s[k] || 0) + v;
    }
    if (m.temp) for (const k of ['hp', 'atk', 'matk', 'def', 'mdef']) s[k] *= m.tempScale || 0.6;
    return s;
  }

  stats(m) {
    const s = this.baseStats(m);
    return { hp: Math.round(s.hp), atk: Math.round(s.atk), matk: Math.round(s.matk), def: Math.round(s.def), mdef: Math.round(s.mdef), spd: Math.round(s.spd), acc: Math.round(s.acc), eva: Math.round(s.eva), crit: s.crit, res: s.res, mp: Math.round(s.mp), range: s.range };
  }

  combatStats(m) {
    const s = this.baseStats(m);
    const sp = speciesInfo(m.species);
    const tr = PERSONALITIES[m.trait] || {};
    const pas = m.level >= MB.passiveUnlockLevel ? ROLE_PASSIVES[sp.role] || {} : {};
    let mult = (tr.atkMult || 1) * (pas.atkMult || 1);
    if (!m.temp) {
      if (m.fatigue >= MB.fatigueHighThreshold) mult *= BALANCE.combat.lowFatiguePenalty;
      if (m.hunger >= MB.hungerHighThreshold) mult *= BALANCE.combat.hungryPenalty;
      if (m.loyalty < 25) mult *= BALANCE.combat.lowLoyaltyPenalty;
    }
    if (m.isBoss) {
      if (m.phase >= 2) mult *= 1 + BB.phase2Atk;
      if (m.phase >= 3) mult *= 1 + (BB.phase3Atk - BB.phase2Atk);
      if (m.enraged) mult *= 1 + BB.enrageAtk;
    }
    let def = s.def;
    if (m.assignment?.type === 'guard') {
      const room = this.game.dungeon.roomAtTile(Math.floor(m.x), Math.floor(m.y));
      if (room && room.id === m.assignment.roomId && room.type === 'guard_room') def *= 1 + this.game.dungeon.roomEffect(room, 'defBonus');
    }
    const berserk = (m.mutations || []).reduce((a, k) => a + (MUTATIONS[k]?.berserk || 0), 0);
    return {
      hp: Math.round(s.hp), mp: s.mp, atk: s.atk * mult, matk: s.matk * mult, def, mdef: s.mdef,
      spd: s.spd * (m.isBoss && m.phase >= 2 ? 1 + BB.phase2Spd : 1), acc: s.acc, eva: s.eva + (pas.eva || 0), crit: s.crit + (pas.crit || 0), critDmg: s.critDmg,
      res: s.res + (pas.res || 0) + (m.isBoss ? 0.4 : 0), range: s.range, aspd: s.aspd,
      element: sp.element, resist: sp.resist || {}, weak: sp.weak || [], family: sp.family, roleTag: sp.role,
      dmgTaken: (pas.dmgTaken || 1) * (tr.dmgTaken || 1), cdMult: (pas.cdMult || 1) * (tr.cdMult || 1),
      healMult: pas.healMult || 1, workMult: pas.workMult || 1, statusMult: pas.statusMult || 1, berserk,
      rarityRank: RARITY_ORDER.indexOf(sp.rarity),
    };
  }

  activeSkills(m) {
    const sp = speciesInfo(m.species);
    if (sp.isBoss) return sp.bossSkills.map((s, i) => ({ key: `b${i}`, spec: s })).filter((s) => (m.phase || 1) >= s.spec.phase);
    const list = sp.skills.filter((s) => m.level >= s.unlock).map((s) => s.id);
    if (m.inheritedSkill && !list.includes(m.inheritedSkill)) list.push(m.inheritedSkill);
    return list.filter((id) => SKILLS[id]).map((id) => ({ key: id, spec: SKILLS[id] }));
  }
  passive(m) { const sp = speciesInfo(m.species); return m.level >= MB.passiveUnlockLevel ? ROLE_PASSIVES[sp.role] : null; }
  upkeep(m) {
    const sp = speciesInfo(m.species);
    const mut = (m.mutations || []).reduce((a, k) => a + (MUTATIONS[k]?.upkeep || 0), 0);
    return Math.round((sp.upkeep || RARITY_UPKEEP[sp.rarity] || 5) * (1 + (m.level - 1) * MB.upkeepPerLevel) * (1 + mut));
  }

  // ---------- Recruitment ----------
  recruitableSpecies() {
    const lvl = this.game.state.dungeonLevel;
    return Object.keys(MONSTERS).filter((id) => MONSTERS[id].recruitable && MONSTERS[id].unlock <= lvl);
  }
  recruitCost(id) { return Math.round(MONSTERS[id].cost * (1 - Math.min(0.15, this.game.state.reputation / 4000))); }
  capacityLeft() { return this.game.dungeon.barracksCapacity() - this.list.length; }

  canRecruit(id) {
    const d = MONSTERS[id];
    if (!d?.recruitable) return { ok: false, reason: 'จ้างไม่ได้ (ได้จากวิวัฒนาการหรือ Fusion)' };
    if (d.unlock > this.game.state.dungeonLevel) return { ok: false, reason: `ต้องมี Dungeon Level ${d.unlock}` };
    if (this.capacityLeft() <= 0) return { ok: false, reason: 'ที่พักเต็ม — สร้าง/อัปเกรด Barracks' };
    if (this.game.state.gold < this.recruitCost(id)) return { ok: false, reason: 'Gold ไม่พอ' };
    return { ok: true };
  }

  recruit(id, name = null, free = false) {
    if (!free) {
      const chk = this.canRecruit(id); if (!chk.ok) return chk;
      this.game.economy.spend('monster_recruitment', this.recruitCost(id));
    } else if (this.capacityLeft() <= 0) return { ok: false, reason: 'ที่พักเต็ม' };
    const m = this.create(id, name);
    this.list.push(m);
    this.discover(id, 'owned');
    this.game.notify(`${m.name} (${speciesInfo(id).name}) เข้าร่วมดันเจี้ยน!`, 'good');
    this.game.bus.emit('monster_recruited', m);
    return { ok: true, monster: m };
  }

  create(species, name = null, level = 1) {
    const g = this.game, rng = g.rng;
    const sp = speciesInfo(species);
    const spawn = this.homePos();
    const defaultAssign = sp.role === 'worker' || (sp.clean >= 1.6) ? { type: 'clean' } : sp.isBoss ? { type: 'guard', roomId: g.dungeon.roomsOfType('boss_room')[0]?.id || g.dungeon.defaultGuardRoom()?.id } : { type: 'guard', roomId: g.dungeon.defaultGuardRoom()?.id || null };
    const m = {
      id: uid(g, 'm'), side: 'monster', species, name: (name || '').trim().slice(0, 16) || `${sp.name} #${g.state.nextId}`,
      level, exp: 0, trained: { hp: 0, atk: 0, matk: 0, def: 0, mdef: 0, spd: 0, acc: 0, res: 0 }, skillMastery: 0,
      trait: rng.pick(Object.keys(PERSONALITIES)), loyalty: MB.loyaltyStart, fatigue: 0, hunger: 0, stage: sp.stage || 0,
      equipment: { weapon: null, armor: null, accessory: null }, status: [], mutations: [], locked: false,
      row: FRONT_ROLES.has(sp.role) ? 'front' : 'back', attackKind: sp.attack,
      assignment: defaultAssign, x: spawn.x, y: spawn.y, facing: 1, dir: 'down',
      ai: 'idle', ko: null, kills: 0, joinedDay: g.time?.day || 1, atkTimer: 0, skillCd: {},
      isBoss: !!sp.isBoss, phase: 1,
    };
    m.hp = this.stats(m).hp; m.mp = this.stats(m).mp;
    return m;
  }

  dismiss(id) {
    const m = this.get(id); if (!m) return { ok: false, reason: 'ไม่พบมอนสเตอร์' };
    if (m.locked) return { ok: false, reason: 'มอนสเตอร์ถูกล็อกอยู่' };
    for (const slot of ['weapon', 'armor', 'accessory']) if (m.equipment[slot]) this.game.inventory.unequip(m, slot, true);
    this.game.state.monsters = this.list.filter((x) => x.id !== id);
    this.game.notify(`ปลด ${m.name} ออกจากดันเจี้ยนแล้ว`, 'info');
    return { ok: true };
  }

  rename(id, name) {
    const m = this.get(id); if (!m) return { ok: false };
    const n = String(name || '').trim().slice(0, 16);
    if (!n) return { ok: false, reason: 'ชื่อว่าง' };
    m.name = n; return { ok: true };
  }

  assign(m, assignment) {
    const g = this.game;
    if (assignment.type === 'guard') {
      const r = assignment.roomId && g.dungeon.getRoom(assignment.roomId);
      if (!r) assignment.roomId = g.dungeon.defaultGuardRoom()?.id || null;
    }
    if (m.training) g.training.cancel(m, true);
    if (m.carrying?.length) g.cleaning.dropCarried(m);
    if (m.job) g.cleaning.releaseJob(m);
    m.assignment = assignment; m.ai = 'idle'; m.resting = false;
    clearPath(m);
    return { ok: true };
  }
  setRow(m, row) { if (row === 'front' || row === 'back') m.row = row; }
  homePos() {
    const g = this.game;
    const b = g.dungeon.roomsOfType('barracks')[0] || g.dungeon.coreRoom();
    return g.dungeon.randomTileInRoom(b, g.rng);
  }

  // ---------- Codex (Monster Bible §23) ----------
  discover(id, kind = 'seen') {
    const cx = (this.game.state.codex ||= {});
    const e = (cx[id] ||= { seen: 0, owned: 0, evolved: 0, fused: 0, ko: 0 });
    e[kind] = (e[kind] || 0) + 1;
  }

  // ---------- EXP / Level ----------
  gainExp(m, amount) {
    if (!m || m.temp || m.level >= this.levelCap(m)) return;
    const tr = PERSONALITIES[m.trait] || {};
    m.exp += amount * (tr.expMult || 1);
    let leveled = false;
    const tierBefore = tierOf(m.level).name;
    while (m.level < this.levelCap(m) && m.exp >= this.expToNext(m.level)) {
      m.exp -= this.expToNext(m.level);
      const before = this.stats(m).hp;
      m.level++;
      const after = this.stats(m).hp;
      m.hp = Math.min(after, m.hp + (after - before));
      leveled = true;
      if (m.level === MB.passiveUnlockLevel) this.game.notify(`${m.name} ปลดล็อก Passive: ${this.passive(m)?.name}`, 'good');
      if (speciesInfo(m.species).skills?.some((s) => s.unlock === m.level)) this.game.notify(`${m.name} ได้รับสกิลใหม่!`, 'good');
    }
    if (m.level >= this.levelCap(m)) m.exp = 0;
    if (leveled) {
      if (!m.isBoss && tierOf(m.level).name !== tierBefore) this.game.notify(`${m.name} เลื่อนเป็น ${tierOf(m.level).name}!`, 'good');
      this.game.combat.text(m, `LEVEL ${m.level}!`, '#ffe14a', true, -0.4);
      this.game.combat.burst(m, 0.8, 'buff');
      this.game.bus.emit('monster_levelup', m);
      this.game.audio?.play('levelup');
    }
  }

  // ---------- Evolution ----------
  evolutionOptions(m) { return (speciesInfo(m.species).evolutions || []).filter((id) => MONSTERS[id]); }
  evolutionCheck(m, targetId) {
    const t = MONSTERS[targetId];
    if (!t?.evo || t.evo.from !== m.species) return { ok: false, reqs: [], reason: 'วิวัฒนาการไม่ได้' };
    const needLevel = BALANCE.evolution.stageLevels[(t.evo.stage || 1) - 1] ?? 99;
    const inv = this.game.inventory;
    const reqs = [
      { label: `Level ${needLevel}`, met: m.level >= needLevel },
      { label: `Dungeon Level ${t.evo.dungeonLevel}`, met: this.game.state.dungeonLevel >= t.evo.dungeonLevel },
      { label: `${t.evo.gold} Gold`, met: this.game.state.gold >= t.evo.gold },
    ];
    for (const [mat, q] of Object.entries(t.evo.materials || {})) reqs.push({ label: `${inv.itemName(mat)} x${q} (มี ${inv.count(mat)})`, met: inv.count(mat) >= q });
    return { ok: reqs.every((r) => r.met), reqs };
  }
  evolve(m, targetId) {
    const chk = this.evolutionCheck(m, targetId);
    if (!chk.ok) return { ok: false, reason: 'ยังไม่ผ่านเงื่อนไข' };
    const t = MONSTERS[targetId];
    if (!this.game.economy.spend('evolution', t.evo.gold)) return { ok: false, reason: 'Gold ไม่พอ' };
    for (const [mat, q] of Object.entries(t.evo.materials || {})) this.game.inventory.removeById(mat, q);
    const ratio = m.hp / this.stats(m).hp;
    const oldName = speciesInfo(m.species).name;
    m.species = targetId; m.stage = t.evo.stage; m.attackKind = t.attack;
    m.hp = Math.round(this.stats(m).hp * Math.max(ratio, 0.5));
    m.evolveFx = 1.5;
    this.discover(targetId, 'evolved'); this.discover(targetId, 'owned');
    this.game.combat.burst(m, 1.6, 'evolve');
    this.game.combat.text(m, 'EVOLUTION!', '#ff8aff', true, -0.6);
    this.game.notify(`${m.name} วิวัฒนาการจาก ${oldName} เป็น ${t.name}!`, 'good');
    this.game.audio?.play('evolve');
    this.game.bus.emit('monster_evolved', m);
    return { ok: true };
  }

  // ---------- Boss Management ----------
  currentBoss() { return this.list.find((m) => m.isBoss) || null; }
  bossCost(id) { return BOSS_TIERS[BOSSES[id].tier].cost; }
  canSummonBoss(id, useSoul = false) {
    const b = BOSSES[id]; if (!b) return { ok: false, reason: 'ไม่มีบอสนี้' };
    const tier = BOSS_TIERS[b.tier];
    if (tier.unlock > this.game.state.dungeonLevel) return { ok: false, reason: `ปลดล็อกที่ Dungeon Lv.${tier.unlock}` };
    if (!this.game.dungeon.roomsOfType('boss_room').length) return { ok: false, reason: 'ต้องสร้าง Boss Room ก่อน' };
    if (this.currentBoss()) return { ok: false, reason: 'มีบอสประจำดันเจี้ยนแล้ว (ปลดตัวเดิมก่อน)' };
    if (useSoul) { if (this.game.inventory.count('boss_soul') < b.tier) return { ok: false, reason: `ต้องใช้ Boss Soul x${b.tier}` }; }
    else if (this.game.state.gold < this.bossCost(id)) return { ok: false, reason: 'Gold ไม่พอ' };
    return { ok: true };
  }
  summonBoss(id, useSoul = false) {
    const chk = this.canSummonBoss(id, useSoul); if (!chk.ok) return chk;
    const b = BOSSES[id];
    if (useSoul) this.game.inventory.removeById('boss_soul', b.tier);
    else this.game.economy.spend('boss_summon', this.bossCost(id));
    const lvl = Math.max(1, this.game.state.dungeonLevel * 4 - 3);
    const m = this.create(id, b.name, lvl);
    const room = this.game.dungeon.roomsOfType('boss_room')[0];
    const c = this.game.dungeon.roomCenter(room); m.x = c.x; m.y = c.y;
    m.assignment = { type: 'guard', roomId: room.id };
    m.trait = 'brave';
    this.list.push(m);
    this.discover(id, 'owned');
    this.game.combat.burst(m, 2.5, 'evolve');
    this.game.notify(`อัญเชิญบอส ${b.name} สำเร็จ! (${BOSS_TIERS[b.tier].name})`, 'good');
    this.game.audio?.play('rankup');
    return { ok: true, monster: m };
  }

  // ---------- Combat hooks ----------
  onHit(m) {
    const tr = PERSONALITIES[m.trait] || {};
    m.fatigue = Math.min(100, m.fatigue + MB.fatigueFromCombatPerHit * (tr.fatigueMult || 1));
  }

  knockout(m, killer) {
    const g = this.game;
    if (m.temp) { m.hp = 0; m.dead = true; g.combat.burst(m, 0.6, 'dark'); return; }
    const hosp = g.dungeon.roomsOfType('hospital')[0];
    const koCount = this.list.filter((x) => x.ko && x.ko.hospital).length;
    const useHosp = hosp && koCount < g.dungeon.roomCapacity(hosp);
    const mult = useHosp ? MB.hospitalRecoveryMult * g.dungeon.roomEffect(hosp, 'healMult') : 1;
    const hours = (m.isBoss ? BB.knockoutHours : MB.knockoutRecoveryHours) / mult;
    m.ko = { until: g.state.time + hours * 60, hospital: !!useHosp, fade: 0.6 };
    m.hp = 0; m.status = []; m.ai = 'ko'; m.phase = 1; m.enraged = false; m.combatT = 0;
    if (m.training) g.training.cancel(m, false);
    if (m.carrying?.length) g.cleaning.dropCarried(m);
    if (m.job) g.cleaning.releaseJob(m);
    m.loyalty = clamp(m.loyalty - 3, 0, 100);
    g.state.stats.monsterKOs++;
    this.discover(m.species, 'ko');
    g.notify(`${m.name} หมดสติ! (ฟื้นใน ${hours.toFixed(1)} ชม.${useHosp ? ' ที่โรงพยาบาล' : ''})`, m.isBoss ? 'bad' : 'warn');
    g.audio?.play('ko');
    const dest = useHosp ? hosp : (g.dungeon.roomsOfType('barracks')[0] || g.dungeon.coreRoom());
    const p = g.dungeon.randomTileInRoom(dest, g.rng);
    m.x = p.x; m.y = p.y; clearPath(m);
    for (const h of g.state.heroes) if (h.target === m.id) h.target = null;
  }

  // Minion ชั่วคราว (บอส / Summoner)
  summonMinions(owner) {
    const g = this.game;
    const sp = speciesInfo(owner.species);
    const kind = sp.isBoss ? (BOSS_MINION[sp.element] || 'skeleton') : (MINION_BY_FAMILY[sp.family] || 'skeleton');
    if (this.summons.filter((s) => s.owner === owner.id).length >= BB.minionCount + 1) return false;
    for (let i = 0; i < (sp.isBoss ? BB.minionCount : 1); i++) {
      const s = this.create(kind, `${speciesInfo(kind).name} (Minion)`, Math.max(1, Math.floor(owner.level * 0.6)));
      s.temp = true; s.tempScale = sp.isBoss ? 0.6 : 0.5; s.ttl = BB.minionDespawnSec; s.owner = owner.id;
      s.x = owner.x + g.rng.range(-0.8, 0.8); s.y = owner.y + g.rng.range(-0.8, 0.8);
      if (!g.dungeon.walkable(Math.floor(s.x), Math.floor(s.y))) { s.x = owner.x; s.y = owner.y; }
      s.assignment = { ...owner.assignment }; s.hp = this.stats(s).hp; s.trait = 'aggressive';
      this.summons.push(s);
      g.combat.burst(s, 0.8, 'dark');
    }
    return true;
  }

  // ---------- AI (GDD §30 / Monster Bible §16) ----------
  update(dt) {
    const g = this.game;
    const dtMin = dt * BALANCE.time.gameMinutesPerSecond;
    const heroes = g.state.heroes.filter((h) => h.hp > 0 && h.inside && !h.downed);
    const heroesPresent = heroes.length > 0;
    for (const m of this.all()) {
      g.combat.tickCooldowns(m, dt);
      if (m.evolveFx > 0) m.evolveFx -= dt;
      if (m.temp) { m.ttl -= dt; if (!heroesPresent) m.ttl -= dt * 3; if (m.ttl <= 0) m.dead = true; if (m.dead) continue; }
      if (m.ko) {
        if (m.ko.fade > 0) m.ko.fade -= dt;
        if (g.state.time >= m.ko.until) { m.ko = null; m.hp = Math.round(this.stats(m).hp * 0.6); m.ai = 'idle'; g.notify(`${m.name} ฟื้นแล้ว`, 'info'); }
        continue;
      }
      g.combat.tickStatus(m, dt);
      if (m.ko || m.dead) continue;
      if (m.isBoss) this.bossTick(m, dt, heroesPresent);
      if (!g.combat.canAct(m)) { m.moving = false; continue; }
      if (g.combat.hasStatus(m, 'fear') && m.fearT === undefined && g.rng.chance(0.3)) m.fearT = 2;
      if (m.fearT > 0) { m.fearT -= dt; m.ai = 'retreat'; this.goRest(m, dt, dtMin); if (m.fearT <= 0) m.fearT = undefined; continue; }
      this.think(m, dt, dtMin, heroes, heroesPresent);
    }
    if (this.summons.some((s) => s.dead)) this.game.state.summons = this.summons.filter((s) => !s.dead);
  }

  bossTick(m, dt, heroesPresent) {
    const g = this.game;
    const r = m.hp / this.stats(m).hp;
    const ph = r <= BB.phase3 ? 3 : r <= BB.phase2 ? 2 : 1;
    if (ph > (m.phase || 1)) {
      m.phase = ph;
      g.combat.burst(m, 3, 'evolve');
      g.combat.text(m, ph === 2 ? 'PHASE 2 — ENRAGED!' : 'PHASE 3 — FINAL!', '#ff4a6a', true, -1);
      g.notify(`${m.name} เข้าสู่ Phase ${ph}!`, 'warn');
      if (speciesInfo(m.species).bossSkills.some((s) => s.type === 'summon')) this.summonMinions(m);
    }
    if (m.ai === 'fight' && heroesPresent) {
      m.combatT = (m.combatT || 0) + dt;
      if (!m.enraged && m.combatT > BB.enrageSeconds) { m.enraged = true; g.combat.text(m, 'ENRAGE!', '#ff2a2a', true, -1); }
    } else if (!heroesPresent) { m.combatT = 0; m.enraged = false; if (m.hp / this.stats(m).hp > 0.95) m.phase = 1; }
  }

  postOf(m) {
    if (m.assignment.type !== 'guard') return null;
    return this.game.dungeon.getRoom(m.assignment.roomId) || this.game.dungeon.defaultGuardRoom();
  }

  findThreat(m, heroes) {
    const g = this.game;
    const tr = PERSONALITIES[m.trait] || {};
    if (m.lastAttacker) {
      const h = heroes.find((x) => x.id === m.lastAttacker);
      if (h && dist(h, m) < 5 && !g.combat.hasStatus(h, 'stealth')) return h;
      m.lastAttacker = null;
    }
    const isGuard = m.assignment.type === 'guard';
    const range = isGuard ? MB.aggroRange * (tr.aggroBonus || 1) : 1.6;
    const post = isGuard ? this.postOf(m) : null;
    const postC = post ? g.dungeon.roomCenter(post) : null;
    let best = null, bd = Infinity;
    for (const h of heroes) {
      if (g.combat.hasStatus(h, 'stealth') && dist(h, m) > 1.3) continue;
      const d = dist(h, m);
      if (isGuard) {
        const inPost = post && h.x >= post.x - 1 && h.x < post.x + post.w + 1 && h.y >= post.y - 1 && h.y < post.y + post.h + 1;
        const coreAlarm = g.state.core.alarm > g.state.time && h.state === 'attack_core' && !m.isBoss;
        if (inPost || coreAlarm) { if (d < bd) { bd = d; best = h; } continue; }
      }
      if (d > range) continue;
      if (postC && dist(h, postC) > MB.leashRange * (tr.aggroBonus || 1)) continue;
      if (!g.dungeon.los(m, h)) continue;
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  }

  think(m, dt, dtMin, heroes, heroesPresent) {
    const g = this.game;
    const st = this.combatStats(m);
    const tr = PERSONALITIES[m.trait] || {};
    if (tr.retreatAt && m.hp / st.hp < tr.retreatAt && heroesPresent && !m.isBoss) m.ai = 'retreat';
    if (m.ai === 'retreat') {
      if (m.hp / st.hp > 0.7 || !heroesPresent) m.ai = 'idle';
      else { this.goRest(m, dt, dtMin); return; }
    }
    const threat = this.findThreat(m, heroes);
    if (threat) {
      m.resting = false;
      if (m.training) g.training.cancel(m, false);
      m.ai = 'fight';
      const allies = this.all().filter((x) => !x.ko && !x.dead && dist(x, m) < 6);
      const nearHeroes = heroes.filter((h) => dist(h, m) < 6);
      if (g.combat.trySkill(m, this.activeSkills(m), nearHeroes, allies)) return;
      const range = g.combat.attackRange(m);
      const d = dist(m, threat);
      if (d <= range && g.dungeon.los(m, threat)) {
        m.moving = false; m.facing = threat.x < m.x ? -1 : 1;
        if (!(m.atkTimer > 0)) { g.combat.basicAttack(m, threat); m.atkTimer = g.combat.attackCooldown(m); }
      } else if (g.combat.canMove(m)) moveToward(g, m, threat.x, threat.y, dt, g.combat.moveSpeed(m));
      return;
    }
    if (m.ai === 'fight') { m.ai = 'idle'; clearPath(m); }
    if (m.temp) { this.guard(m, dt); return; }
    // ฟื้นฟูนอกการต่อสู้
    if (m.hp < st.hp) m.hp = Math.min(st.hp, m.hp + st.hp * 0.06 / 60 * dtMin);
    const regenMut = (m.mutations || []).reduce((a, k) => a + (MUTATIONS[k]?.regen || 0), 0);
    if (regenMut && m.hp < st.hp) m.hp = Math.min(st.hp, m.hp + st.hp * regenMut * dt);
    const needRest = m.fatigue >= MB.fatigueHighThreshold || (m.resting && m.fatigue > 20);
    if (m.assignment.type === 'rest' || (needRest && !m.training && (!heroesPresent || m.assignment.type !== 'guard'))) { this.goRest(m, dt, dtMin); return; }
    m.resting = false;
    switch (m.assignment.type) {
      case 'train': g.training.update(m, dt); break;
      case 'clean': g.cleaning.update(m, dt, st); break;
      default: this.guard(m, dt);
    }
  }

  goRest(m, dt, dtMin) {
    const g = this.game;
    const room = g.dungeon.roomsOfType('barracks')[0] || g.dungeon.coreRoom();
    const inRoom = g.dungeon.roomAtTile(Math.floor(m.x), Math.floor(m.y));
    if (!inRoom || inRoom.id !== room.id) {
      if (!m.restTarget || g.dungeon.roomIdAt(Math.floor(m.restTarget.x), Math.floor(m.restTarget.y)) !== room.id) m.restTarget = g.dungeon.randomTileInRoom(room, g.rng);
      const r = moveToward(g, m, m.restTarget.x, m.restTarget.y, dt, g.combat.moveSpeed(m));
      if (r === 'blocked') m.restTarget = null;
      if (m.ai !== 'retreat') m.ai = 'to_rest';
      return;
    }
    m.moving = false; m.resting = true; if (m.ai !== 'retreat') m.ai = 'rest';
    const mult = room.type === 'barracks' ? g.dungeon.roomEffect(room, 'restMult') : 0.6;
    const dirty = g.cleaning.isDirty(room) ? 0.6 : 1;
    m.fatigue = Math.max(0, m.fatigue - MB.restFatiguePerHour / 60 * dtMin * mult * dirty * (m.trait === 'lazy' ? 1.2 : 1));
    const max = this.stats(m).hp;
    m.hp = Math.min(max, m.hp + max * MB.restHealPerHour / 60 * dtMin * mult);
  }

  guard(m, dt) {
    const g = this.game;
    const post = this.postOf(m);
    if (!post) { m.moving = false; return; }
    const inRoom = g.dungeon.roomIdAt(Math.floor(m.x), Math.floor(m.y)) === post.id;
    if (!inRoom) {
      if (!m.patrol || g.dungeon.roomIdAt(Math.floor(m.patrol.x), Math.floor(m.patrol.y)) !== post.id) m.patrol = g.dungeon.randomTileInRoom(post, g.rng);
      m.ai = 'return';
      if (moveToward(g, m, m.patrol.x, m.patrol.y, dt, g.combat.moveSpeed(m)) === 'blocked') m.patrol = null;
      return;
    }
    m.patrolWait = (m.patrolWait || 0) - dt;
    if (m.patrolWait <= 0 && !m.moving) {
      let p = m.isBoss ? g.dungeon.roomCenter(post) : g.dungeon.randomTileInRoom(post, g.rng);
      if (m.row === 'back' && !m.isBoss) {
        const c = g.dungeon.corePos();
        for (let i = 0; i < 3; i++) { const q = g.dungeon.randomTileInRoom(post, g.rng); if (dist(q, c) < dist(p, c)) p = q; }
      }
      m.patrol = p; m.patrolWait = g.rng.range(3, 7);
    }
    m.ai = 'patrol';
    if (m.patrol && moveToward(g, m, m.patrol.x, m.patrol.y, dt, g.combat.moveSpeed(m) * 0.5) !== 'moving') m.moving = false;
  }

  // ---------- Daily ----------
  dailyNeeds(fed, paid) {
    const g = this.game;
    for (const m of this.list) {
      const tr = PERSONALITIES[m.trait] || {};
      const decay = tr.loyaltyDecay || 1;
      if (fed.has(m.id)) m.hunger = Math.max(0, m.hunger - 50);
      else { m.hunger = Math.min(100, m.hunger + MB.hungerPerDay); m.loyalty -= 6 * decay; }
      if (!paid) m.loyalty -= 5 * decay;
      if (tr.name === 'Greedy' && g.state.gold < 100) m.loyalty -= 3;
      const bar = g.dungeon.roomsOfType('barracks')[0];
      if (bar && fed.has(m.id) && paid) m.loyalty += g.dungeon.roomEffect(bar, 'loyaltyPerDay');
      m.loyalty = clamp(Math.round(m.loyalty), 0, 100);
    }
    for (const m of this.list.filter((x) => x.loyalty <= 0 && !x.locked)) {
      g.notify(`${m.name} Loyalty หมด และหนีออกจากดันเจี้ยน!`, 'bad');
      this.dismiss(m.id);
      g.reputation.add(-3, 'monster_rebellion');
    }
  }
}

export { ROLE_TH };
