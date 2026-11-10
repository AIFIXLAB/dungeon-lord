// HeroManager — ผู้กล้า 60 คลาส (Hero Class Design Bible): ค่าสถานะ, Rank Scaling, ปาร์ตี้ + Formation,
// Hero AI ตามลำดับความสำคัญ (§6.1), Summon, Revive, ตรวจจับกับดัก, รางวัลเมื่อกำจัด, การโจมตี Core
import { BALANCE } from '../config/balance.js';
import { HERO_CLASSES, HERO_RANKS, HERO_NAMES, HERO_TITLES, HERO_BASE, heroLootFor } from '../data/heroes.js';
import { LEVELS } from '../data/levels.js';
import { CLASS_MATERIALS } from '../data/items.js';
import { TRAPS } from '../data/traps.js';
import { uid, dist, hourOf } from '../core/util.js';
import { moveToward, clearPath } from '../core/movement.js';
import { dirOf } from './CombatManager.js';

const HB = BALANCE.heroes;
const SUMMON_KINDS = {
  skeleton: { name: 'Skeleton', sprite: 'mon_skeleton', scale: 0.45, attack: 'melee', range: 1, ttl: 30 },
  familiar: { name: 'Familiar', sprite: 'mon_bat', scale: 0.35, attack: 'melee', range: 1, ttl: 25 },
  elemental: { name: 'Elemental', sprite: 'mon_wisp', scale: 0.5, attack: 'magic', range: 3.5, ttl: 30 },
  turret: { name: 'Turret', sprite: 'mon_clockwork', scale: 0.5, attack: 'ranged', range: 4.5, ttl: 30, immobile: true },
  wolf: { name: 'Pet Wolf', sprite: 'mon_wolf', scale: 0.5, attack: 'melee', range: 1, ttl: 35 },
  spirit: { name: 'Spirit Guard', sprite: 'mon_ghost', scale: 0.5, attack: 'magic', range: 3, ttl: 30 },
  totem: { name: 'Totem', sprite: 'mon_mandrake', scale: 0.4, attack: 'magic', range: 3.5, ttl: 25, immobile: true },
};

export class HeroManager {
  constructor(game) { this.game = game; this.auraTimer = 0; }
  get list() { return this.game.state.heroes; }

  combatStats(h) { return h.stats; }

  // ---------- Schedule ----------
  dailyCount() {
    const s = this.game.state;
    return Math.min(HB.maxDailyCount, Math.floor(HB.baseDailyCount + (s.dungeonLevel - 1) * HB.perLevelDaily + Math.min(HB.maxRepBonus, s.reputation * HB.perReputation)));
  }

  scheduleDay(dayStartMinutes) {
    const g = this.game, rng = g.rng;
    const lvl = LEVELS[g.state.dungeonLevel - 1];
    let remaining = this.dailyCount();
    const sched = [];
    while (remaining > 0) {
      const size = Math.min(remaining, rng.int(1, lvl.party));
      remaining -= size;
      const hour = rng.chance(HB.nightSpawnChance) ? (rng.chance(0.5) ? rng.range(22, 24) : rng.range(0, 6)) : rng.range(HB.spawnStartHour, HB.spawnEndHour);
      sched.push({ time: dayStartMinutes + hour * 60, size });
    }
    sched.sort((a, b) => a.time - b.time);
    g.state.heroSchedule = sched;
  }

  // ---------- Stats (Hero Bible §1–2) ----------
  computeStats(cls, rank, level) {
    const c = HERO_CLASSES[cls];
    const mult = HB.rankMultiplier[rank] * (1 + HB.levelGrowth * (level - 1)) * (rank === 'F' ? HB.fScale : 1);
    const b = HERO_BASE;
    return {
      hp: Math.round(b.hp * c.mult.hp * mult), atk: b.atk * c.mult.atk * mult, matk: b.matk * c.mult.matk * mult,
      def: b.def * c.mult.def * mult, mdef: b.mdef * c.mult.mdef * mult,
      spd: b.spd * c.mult.spd, acc: b.acc + level * 0.5, eva: b.eva * (c.mult.spd > 1.2 ? 2 : 1), crit: b.crit + (c.role.includes('Assassin') || c.role.includes('Duelist') ? 0.08 : 0),
      critDmg: 1.5, res: Math.min(0.4, level * 0.006 + (c.ai.resistStatus ? 0.15 : 0)), mp: Math.round(b.mp * Math.max(0.8, c.mult.matk) + level * 2),
      range: c.range, aspd: 1, element: c.element, weaponElement: c.attack === 'magic' ? c.element : 'physical',
      resist: c.ai.resist || {}, weak: c.weak, family: 'human', roleTag: c.role,
      dmgTaken: 1, cdMult: 1, healMult: 1, statusMult: 1,
    };
  }

  pickRank() {
    const g = this.game, rng = g.rng;
    const ranks = LEVELS[g.state.dungeonLevel - 1].ranks;
    const main = ranks[ranks.length - 1];
    if (ranks.length === 1) return main;
    const pMain = 0.45 + Math.min(0.35, g.state.reputation / 1200);
    return rng.chance(pMain) ? main : rng.pick(ranks.slice(0, -1));
  }

  classesForRank(rank) {
    const ri = HERO_RANKS.indexOf(rank);
    return Object.keys(HERO_CLASSES).filter((c) => HERO_RANKS.indexOf(HERO_CLASSES[c].minRank) <= ri);
  }

  // สุ่มปาร์ตี้ให้มีบทบาทหลากหลาย (แนวหน้า / แนวหลัง / Healer)
  spawnParty(size, opts = {}) {
    const g = this.game, rng = g.rng;
    const rank = opts.rank || this.pickRank();
    const pool = this.classesForRank(rank);
    const front = pool.filter((c) => HERO_CLASSES[c].row === 'front');
    const back = pool.filter((c) => HERO_CLASSES[c].row === 'back');
    const healers = pool.filter((c) => HERO_CLASSES[c].ai.healer);
    const picks = [];
    for (let i = 0; i < size; i++) {
      if (i === 0) picks.push(rng.pick(front));
      else if (i === 2 && healers.length && rng.chance(0.7)) picks.push(rng.pick(healers));
      else picks.push(rng.pick(rng.chance(0.5) ? front : back));
    }
    picks.sort((a, b) => (HERO_CLASSES[a].row === 'front' ? 0 : 1) - (HERO_CLASSES[b].row === 'front' ? 0 : 1));
    const party = { id: uid(g, 'p'), members: [], rank, coreDamaged: false, raid: !!opts.raid, escaped: 0, knownTraps: [] };
    const e = g.dungeon.d.entrance;
    picks.forEach((cls, i) => {
      const h = this.createHero(cls, rank, party.id);
      h.x = e.x - 1 - i * 0.9; h.y = e.y + 0.5 + (i % 2 ? 0.2 : -0.2);
      h.enterDelay = i * 0.5;
      party.members.push(h.id);
      this.list.push(h);
    });
    g.state.parties.push(party);
    g.state.heroCodex ||= {};
    for (const c of picks) g.state.heroCodex[c] = (g.state.heroCodex[c] || 0) + 1;
    g.notify(`ผู้กล้า Rank ${rank} (${size} คน: ${picks.map((c) => HERO_CLASSES[c].name).join(', ')}) มาถึงดันเจี้ยน!${opts.raid ? ' [RAID]' : ''}`, 'warn');
    g.audio?.play('alert');
    g.bus.emit('heroes_arrived', party);
    return party;
  }

  createHero(cls, rank, partyId) {
    const g = this.game, rng = g.rng;
    const c = HERO_CLASSES[cls];
    const [lo, hi] = HB.rankLevel[rank];
    const level = rng.int(lo, hi);
    const st = this.computeStats(cls, rank, level);
    return {
      id: uid(g, 'h'), side: 'hero', cls, className: c.name, rank, level, roleTag: c.role,
      name: `${rng.pick(HERO_NAMES)} ${rng.chance(0.4) ? rng.pick(HERO_TITLES) : ''}`.trim(),
      stats: st, hp: st.hp, mp: st.mp, partyId, row: c.row, attackKind: c.attack,
      ai: { ...c.ai }, state: 'entering', inside: false, x: 0, y: 0, facing: 1, dir: 'right', status: [],
      skillCd: {}, atkTimer: 0, dmgBy: {}, gold: Math.round(rng.int(...BALANCE.loot.pouchGold) * HB.rankMultiplier[rank] * (1 + level * 0.05)),
      lootedTreasure: false,
    };
  }

  heroSkills(h) {
    if (h.summon) return [];
    return HERO_CLASSES[h.cls].skills.map((s, i) => ({ key: `s${i}`, spec: s }));
  }

  party(id) { return this.game.state.parties.find((p) => p.id === id); }

  // ---------- Update ----------
  update(dt) {
    const g = this.game;
    const sched = g.state.heroSchedule;
    while (sched.length && sched[0].time <= g.state.time) this.spawnParty(sched.shift().size);
    const monsters = g.monsters.all().filter((m) => !m.ko && !m.dead && m.hp > 0);
    for (const h of this.list) {
      if (h.dead || h.escaped) continue;
      g.combat.tickCooldowns(h, dt);
      if (h.downed) { h.downed -= dt; if (h.downed <= 0) this.finalizeDeath(h, h.killer ? g.combat.findUnit(h.killer) : null); continue; }
      if (h.summon) { h.ttl -= dt; if (h.ttl <= 0 || !this.party(h.partyId)) { h.dead = true; continue; } }
      if (!h.inside) { this.enter(h, dt); continue; }
      g.combat.tickStatus(h, dt);
      if (h.dead || h.downed) continue;
      if (!g.combat.canAct(h)) { h.moving = false; continue; }
      if (!h.summon) this.checkTraps(h);
      if (h.dead || h.downed) continue;
      this.think(h, dt, monsters);
    }
    this.auraTimer -= dt;
    if (this.auraTimer <= 0) {
      this.auraTimer = BALANCE.core.auraInterval;
      const core = g.dungeon.coreRoom();
      const dmg = BALANCE.core.auraDamagePerLevel * core.level * (1 + (g.state.dungeonLevel - 1) * 0.5);
      for (const h of this.list) {
        if (h.dead || h.downed || !h.inside) continue;
        if (g.dungeon.roomIdAt(Math.floor(h.x), Math.floor(h.y)) === core.id) g.combat.applyDamage(null, h, Math.round(dmg), { color: '#d88aff' });
      }
    }
    if (this.list.some((h) => h.dead || h.escaped)) {
      g.state.heroes = this.list.filter((h) => !h.dead && !h.escaped);
      g.state.parties = g.state.parties.filter((p) => p.members.some((id) => g.state.heroes.find((h) => h.id === id && !h.summon)));
    }
  }

  enter(h, dt) {
    if (h.enterDelay > 0) { h.enterDelay -= dt; return; }
    const e = this.game.dungeon.entrancePos();
    const dx = e.x - h.x, dy = e.y - h.y, d = Math.hypot(dx, dy);
    const sp = this.game.combat.moveSpeed(h) * dt;
    h.moving = true; h.facing = 1; h.dir = 'right';
    if (d <= sp) { h.x = e.x; h.y = e.y; h.inside = true; h.state = 'advance'; }
    else { h.x += dx / d * sp; h.y += dy / d * sp; }
  }

  checkTraps(h) {
    const g = this.game;
    const tx = Math.floor(h.x), ty = Math.floor(h.y);
    const party = this.party(h.partyId);
    for (const t of g.dungeon.d.traps) {
      if (t.cd > 0 || t.durability <= 0) continue;
      const def = TRAPS[t.type];
      if (Math.hypot(t.x + 0.5 - h.x, t.y + 0.5 - h.y) > def.range) continue;
      if (def.range <= 0.9 && (t.x !== tx || t.y !== ty)) continue;
      const known = party?.knownTraps?.includes(t.id);
      if ((h.ai.disarm || known) && g.rng.chance(known ? 0.6 : BALANCE.traps.rogueDisarmChance)) {
        t.durability = Math.max(0, t.durability - 5); t.cd = def.cooldown;
        g.combat.text(h, 'DISARM', '#cccccc');
        continue;
      }
      t.cd = def.cooldown; t.durability -= BALANCE.traps.durabilityPerTrigger; t.fired = 0.3;
      const dmg = def.damage * Math.pow(BALANCE.traps.upgradeDamageMult, t.level - 1) * (1 + (g.state.dungeonLevel - 1) * BALANCE.traps.levelScale) * 3;
      const targets = def.aoe ? this.list.filter((o) => o.inside && !o.dead && !o.downed && Math.hypot(o.x - h.x, o.y - h.y) <= def.aoe) : [h];
      for (const tg of targets) {
        const ts = tg.stats;
        let d = dmg * (100 / (100 + ts.def * 0.5)) * g.combat.elementMult(def.element, tg, ts);
        if (ts.weak.includes('trap')) d *= BALANCE.combat.tagWeakness;
        g.combat.applyDamage(null, tg, Math.max(1, Math.round(d)), { color: '#ffaa4a' });
        if (def.status && !tg.dead) g.combat.addStatus(tg, def.status);
      }
      g.combat.burst({ x: t.x + 0.5, y: t.y + 0.5 }, def.aoe || 0.5, def.element === 'none' ? 'trap' : def.element);
      g.audio?.play('trap');
      if (t.durability <= 0) g.notify(`${def.name} พังแล้ว — ซ่อมได้ที่เมนูดันเจี้ยน`, 'warn');
      if (h.dead || h.downed) return;
    }
  }

  trapCost(h) {
    const p = this.party(h.partyId);
    if (!h.ai.disarm && !(p?.knownTraps?.length)) return null;
    const traps = this.game.dungeon.trapAt;
    return (x, y) => (traps.has(`${x},${y}`) && (h.ai.disarm || p.knownTraps.includes(traps.get(`${x},${y}`).id)) ? 4 : 0);
  }

  detectTraps(h) {
    const p = this.party(h.partyId); if (!p) return false;
    const near = this.game.dungeon.d.traps.filter((t) => Math.hypot(t.x + 0.5 - h.x, t.y + 0.5 - h.y) < 5 && !p.knownTraps.includes(t.id));
    if (!near.length) return false;
    for (const t of near) p.knownTraps.push(t.id);
    this.game.combat.text(h, `พบกับดัก ${near.length}`, '#ffe48a');
    return true;
  }

  summon(h, kind, inCombat) {
    if (!inCombat) return false;
    const g = this.game;
    const k = SUMMON_KINDS[kind] || SUMMON_KINDS.familiar;
    if (this.list.filter((s) => s.summon && s.owner === h.id).length >= 2) return false;
    const base = h.stats;
    const s = {
      id: uid(g, 'h'), side: 'hero', summon: true, owner: h.id, cls: h.cls, className: k.name, name: `${k.name} (${h.name})`, rank: h.rank, level: h.level,
      roleTag: 'Summon', sprite: k.sprite, spriteScale: k.scale,
      stats: { ...base, hp: Math.round(base.hp * 0.45), atk: Math.max(base.atk, base.matk) * 0.55, matk: Math.max(base.atk, base.matk) * 0.55, def: base.def * 0.6, mdef: base.mdef * 0.6, range: k.range, weak: [], resist: {} },
      partyId: h.partyId, row: 'front', attackKind: k.attack, ai: { target: 'nearest', retreatAt: 0, immobile: k.immobile },
      state: 'advance', inside: true, x: h.x + g.rng.range(-0.5, 0.5), y: h.y + g.rng.range(-0.5, 0.5), facing: 1, dir: 'down', status: [], skillCd: {}, atkTimer: 0, dmgBy: {}, gold: 0, ttl: k.ttl,
    };
    if (!g.dungeon.walkable(Math.floor(s.x), Math.floor(s.y))) { s.x = h.x; s.y = h.y; }
    s.hp = s.stats.hp;
    this.list.push(s);
    g.combat.burst(s, 0.8, 'arcane');
    return true;
  }

  reviveNearby(h, pct) {
    const t = this.list.find((o) => o.downed && o.partyId === h.partyId && dist(o, h) < 5);
    if (!t) return false;
    t.downed = 0; t.hp = Math.round(t.stats.hp * pct); t.state = 'advance'; t.killer = null; t.status = [];
    this.game.combat.burst(t, 1, 'heal');
    this.game.combat.text(t, 'REVIVE!', '#fff6c0', true);
    return true;
  }

  // ---------- Hero AI (Hero Bible §6) ----------
  think(h, dt, monsters) {
    const g = this.game, cb = g.combat;
    const st = h.stats;
    const hpR = h.hp / st.hp;
    // Fear: มีโอกาสถอยหนี
    if (cb.hasStatus(h, 'fear') && !h.feared && g.rng.chance(0.3)) { h.feared = 2.5; }
    if (h.feared > 0) { h.feared -= dt; const e = g.dungeon.entrancePos(); moveToward(g, h, e.x, e.y, dt, cb.moveSpeed(h)); return; }
    // Priority 3: ถอยเมื่อ HP ต่ำ
    if (h.state !== 'retreat' && !h.summon && h.ai.retreatAt > 0 && hpR < h.ai.retreatAt) { h.state = 'retreat'; clearPath(h); cb.text(h, 'RETREAT!', '#ffcc4a'); }
    const allies = this.list.filter((o) => o.partyId === h.partyId && o.inside && !o.dead && !o.downed);
    const vis = monsters.filter((m) => dist(m, h) <= HB.detectRange + (h.attackKind !== 'melee' ? 1 : 0) && g.dungeon.los(h, m));
    if (h.state === 'retreat') {
      // Healer ยังรักษาตัวเองได้ขณะถอย
      if (cb.trySkill(h, this.heroSkills(h).filter((s) => ['heal', 'buff'].includes(s.spec.type)), vis, allies)) return;
      const e = g.dungeon.entrancePos();
      const r = moveToward(g, h, e.x, e.y, dt, cb.moveSpeed(h) * 0.8);
      if (r === 'arrived' || dist(h, e) < 0.4) this.escape(h);
      return;
    }
    // Priority 1–2: Revive / Heal / สกิลตามสถานการณ์
    if (cb.trySkill(h, this.heroSkills(h), vis, allies)) return;
    let target = h.target ? vis.find((m) => m.id === h.target) : null;
    if (!target || (h.tauntedBy && h.tauntT > 0)) target = cb.pickTarget(h, vis);
    if (target) {
      h.target = target.id; h.state = 'fight';
      const range = cb.attackRange(h);
      const d = dist(h, target);
      // Kite: แถวหลังรักษาระยะห่าง
      if (h.ai.kite && d < 1.6 && range > 2 && cb.canMove(h)) {
        const dx = h.x - target.x, dy = h.y - target.y, l = Math.hypot(dx, dy) || 1;
        const nx = h.x + dx / l * 1.2, ny = h.y + dy / l * 1.2;
        if (g.dungeon.walkable(Math.floor(nx), Math.floor(ny))) { moveToward(g, h, nx, ny, dt, cb.moveSpeed(h)); h.dir = dirOf(h, target); return; }
      }
      if (d <= range) {
        h.moving = false; h.facing = target.x < h.x ? -1 : 1; h.dir = dirOf(h, target);
        if (!(h.atkTimer > 0)) { cb.basicAttack(h, target); h.atkTimer = cb.attackCooldown(h); }
      } else if (!h.ai.immobile && cb.canMove(h)) moveToward(g, h, target.x, target.y, dt, cb.moveSpeed(h), this.trapCost(h));
      return;
    }
    h.target = null;
    if (h.ai.immobile) { h.moving = false; return; }
    if (h.summon) {
      const owner = this.list.find((o) => o.id === h.owner);
      if (owner && dist(owner, h) > 1.5) moveToward(g, h, owner.x, owner.y, dt, cb.moveSpeed(h)); else h.moving = false;
      return;
    }
    const core = g.dungeon.corePos();
    if (dist(h, core) <= 1.3) {
      h.state = 'attack_core'; h.moving = false; h.facing = core.x < h.x ? -1 : 1; h.dir = dirOf(h, core);
      if (!(h.atkTimer > 0)) { this.attackCore(h); h.atkTimer = cb.attackCooldown(h); }
      return;
    }
    if (h.ai.greedy && !h.lootedTreasure) {
      const tr = g.dungeon.roomsOfType('treasure_room')[0];
      if (tr) {
        const c = g.dungeon.roomCenter(tr);
        const r = moveToward(g, h, c.x, c.y, dt, cb.moveSpeed(h), this.trapCost(h));
        h.state = 'loot';
        if (r === 'arrived' || dist(h, c) < 0.8) {
          h.lootedTreasure = true;
          const stolen = Math.min(g.state.gold, Math.round(12 * HB.rankMultiplier[h.rank] * (1 + h.level * 0.1)));
          if (stolen > 0) { g.state.gold -= stolen; h.gold += stolen; g.economy.record('expense', 'stolen', stolen); g.notify(`${h.name} ขโมยทองไป ${stolen}! (กำจัดเพื่อเอาคืน)`, 'bad'); }
        }
        if (r !== 'blocked') return;
      } else h.lootedTreasure = true;
    }
    h.state = 'advance';
    if (h.row === 'back' && allies.some((a) => a.row === 'front' && a.state === 'fight' && dist(a, h) < 4.5)) { h.moving = false; return; }
    if (moveToward(g, h, core.x, core.y, dt, cb.moveSpeed(h), this.trapCost(h)) === 'blocked') h.moving = false;
  }

  attackCore(h) {
    const g = this.game;
    const core = g.state.core;
    const coreRoom = g.dungeon.coreRoom();
    const atk = h.attackKind === 'magic' ? h.stats.matk : h.stats.atk;
    const cdef = BALANCE.core.defPerLevel * (coreRoom.level - 1) + 10;
    const dmg = Math.max(1, Math.round(atk * 100 / (100 + cdef)));
    core.hp = Math.max(0, core.hp - dmg);
    core.hitFlash = 0.2; core.alarm = g.state.time + 60;
    h.lunge = 0.2;
    const p = this.party(h.partyId); if (p) p.coreDamaged = true;
    g.combat.text(g.dungeon.corePos(), `-${dmg}`, '#ff4aff');
    g.reputation.add(-0.15, 'core_damage');
    if (!core.warned || (core.hp < core.maxHp * 0.3 && core.warned < 2)) { core.warned = (core.warned || 0) + 1; g.notify('Dungeon Core ถูกโจมตี!', 'bad'); }
    if (core.hp <= 0) g.defeat(h);
  }

  escape(h) {
    const g = this.game;
    h.escaped = true;
    if (h.summon) return;
    g.state.stats.escapes++;
    g.reputation.add(-HB.escapeRepLoss, 'hero_escape');
    const p = this.party(h.partyId);
    if (p) { p.escaped++; this.checkPartyEnd(p); }
    g.notify(`${h.name} (${h.className}) หลบหนีไปได้! ชื่อเสียงลดลง`, 'bad');
  }

  onHeroDeath(h, killer) {
    if (h.dead || h.downed) return;
    if (h.summon) { h.dead = true; this.game.combat.burst(h, 0.6, 'arcane'); return; }
    // ถ้ามีผู้ที่ Revive ได้ในปาร์ตี้ → สลบ 8 วินาที รอการชุบชีวิต
    const reviver = this.list.find((o) => o.partyId === h.partyId && o !== h && !o.dead && !o.downed && o.ai?.reviver);
    if (reviver) { h.downed = 8; h.hp = 0; h.status = []; h.killer = killer?.id || null; h.moving = false; this.game.combat.text(h, 'DOWN', '#ffcc4a'); return; }
    this.finalizeDeath(h, killer);
  }

  finalizeDeath(h, killer) {
    const g = this.game, rng = g.rng;
    if (h.dead) return;
    h.dead = true; h.downed = 0;
    g.state.stats.kills++;
    g.audio?.play('kill');
    g.cleaning.spawn('corpse', h.x, h.y, { cls: h.cls, rank: h.rank });
    for (let i = rng.int(1, 2); i > 0; i--) g.cleaning.spawn('blood', h.x + rng.range(-0.5, 0.5), h.y + rng.range(-0.5, 0.5));
    const loot = this.rollLoot(h);
    if (loot.items.length || loot.gold) g.cleaning.spawn('loot', h.x + rng.range(-0.3, 0.3), h.y + rng.range(-0.3, 0.3), loot);
    const tr = g.dungeon.roomsOfType('treasure_room')[0];
    const tBonus = tr ? g.dungeon.roomEffect(tr, 'goldBonus') : 0;
    const p = this.party(h.partyId);
    const raid = p?.raid ? 1.5 : 1;
    const killerM = killer?.side === 'monster' ? killer : null;
    const greedy = killerM?.trait === 'greedy' ? 1.1 : 1;
    const bounty = Math.round(HB.rankBounty[h.rank] * (1 + h.level * 0.02) * (1 + tBonus) * raid * greedy);
    g.economy.earn('hero_defeat', bounty);
    g.reputation.add(HB.rankRep[h.rank], 'hero_kill');
    const expTotal = 10 * HB.rankMultiplier[h.rank] * (1 + h.level * 0.18) * raid;
    const totalDmg = Object.values(h.dmgBy).reduce((a, b) => a + b, 0) || 1;
    const got = new Set();
    for (const [mid, dmgv] of Object.entries(h.dmgBy)) {
      const m = g.monsters.get(mid); if (!m) continue;
      g.monsters.gainExp(m, expTotal * (0.5 + 0.7 * dmgv / totalDmg)); got.add(mid);
    }
    for (const m of g.state.monsters) if (!got.has(m.id) && !m.ko && dist(m, h) <= BALANCE.monsters.expShareRadius) g.monsters.gainExp(m, expTotal * 0.3);
    if (killerM) killerM.kills++;
    g.combat.text(h, `+${bounty}G`, '#ffd84a', true, -0.8);
    g.bus.emit('hero_killed', h);
    if (p) this.checkPartyEnd(p);
  }

  checkPartyEnd(p) {
    const g = this.game;
    const remaining = p.members.filter((id) => { const h = this.list.find((x) => x.id === id); return h && !h.dead && !h.escaped; });
    if (remaining.length) return;
    for (const s of this.list) if (s.summon && s.partyId === p.id) s.dead = true;
    if (p.escaped === 0 && !p.coreDamaged) {
      g.state.stats.defenses++;
      g.reputation.add(BALANCE.reputation.defenseBonus, 'defense');
      g.notify(`ป้องกันดันเจี้ยนสำเร็จ! กำจัดปาร์ตี้ Rank ${p.rank} ทั้งหมด`, 'good');
      const boss = g.monsters.currentBoss();
      if (boss && !boss.ko && g.rng.chance(BALANCE.boss.soulDropOnDefend * (1 + HERO_RANKS.indexOf(p.rank)))) { g.inventory.add('boss_soul', 1); g.notify('ได้รับ Boss Soul จากการป้องกัน!', 'good'); }
    } else if (p.escaped === 0) g.notify('กำจัดปาร์ตี้ได้ แต่ Core ได้รับความเสียหาย (ไม่นับเป็นการป้องกันสำเร็จ)', 'warn');
  }

  rollLoot(h) {
    const g = this.game, rng = g.rng, L = BALANCE.loot;
    const items = [];
    const c = HERO_CLASSES[h.cls];
    const tr = g.dungeon.roomsOfType('treasure_room')[0];
    const rareBonus = tr ? g.dungeon.roomEffect(tr, 'rareBonus') : 0;
    if (rng.chance(L.equipmentDropChance + rareBonus * 0.5)) {
      const weights = { ...L.rarityWeights };
      const ri = HERO_RANKS.indexOf(h.rank);
      weights.common = Math.max(10, weights.common - ri * 8 - rareBonus * 100);
      weights.uncommon += ri * 4; weights.rare += ri * 2 + rareBonus * 30; weights.epic += ri * 0.8;
      items.push({ itemId: rng.pick(heroLootFor(h.cls)), rarity: rng.weighted(weights), qty: 1 });
    }
    if (rng.chance(L.materialDropChance)) items.push({ itemId: rng.pick(CLASS_MATERIALS[c.attack] || ['bone']), rarity: 'common', qty: rng.int(1, 2) });
    if (rng.chance(L.crystalDropChance[h.rank] + rareBonus * 0.1)) items.push({ itemId: rng.chance(0.75) ? 'evolution_crystal' : 'fusion_crystal', rarity: 'rare', qty: 1 });
    if (rng.chance(L.coreDropChance[h.rank])) items.push({ itemId: 'monster_core', rarity: 'epic', qty: 1 });
    if (rng.chance(L.potionDropChance)) items.push({ itemId: 'health_potion', rarity: 'common', qty: 1 });
    return { items, gold: h.gold };
  }

  isNight() { const hh = hourOf(this.game.state.time); return hh >= BALANCE.time.nightStartHour || hh < BALANCE.time.dayStartHour; }
}

export { SUMMON_KINDS };
