// TrapManager — กับดัก 50 ชนิด: ตรวจจับ, รูปแบบดาเมจ (hit/proj/line/aoe/field/chain/room), สถานะผิดปกติ,
// ผลัก/ดึง/วาร์ป, Trap Level 1–5, Trap Synergy (คอมโบ) และ Synergy กับมอนสเตอร์ — ตาม Dungeon Trap Database
import { BALANCE } from '../config/balance.js';
import { TRAPS, TRAP_LEVELS, TYPE_ELEMENT, TYPE_COLOR } from '../data/traps.js';
import { dist } from '../core/util.js';

const TB = BALANCE.traps;

export class TrapManager {
  constructor(game) { this.game = game; this.fields = []; this.marks = []; }
  get list() { return this.game.state.dungeon.traps; }
  def(t) { return TRAPS[t.type]; }
  lv(t) { return TRAP_LEVELS[(t.level || 1) - 1]; }
  range(t) { return this.def(t).range * (this.lv(t).range || 1); }
  cooldown(t) { return this.def(t).cd * (this.lv(t).cd || 1); }
  maxDurability(t) { return this.def(t).durability + ((t.level || 1) - 1) * 10; }
  center(t) { return { x: t.x + 0.5, y: t.y + 0.5 }; }

  // ดาเมจพื้นฐานหลังคูณระดับกับดักและระดับดันเจี้ยน (Final Damage = Base × Trap Level Multiplier × ...)
  baseDamage(t) {
    return this.def(t).dmg * this.lv(t).dmg * (1 + (this.game.state.dungeonLevel - 1) * TB.levelScale) * TB.damageScale;
  }

  // Synergy กับมอนสเตอร์ในห้องเดียวกัน
  monsterSynergy(t) {
    const g = this.game;
    const rid = g.dungeon.roomIdAt(t.x, t.y);
    const near = g.state.monsters.filter((m) => !m.ko && (rid ? g.dungeon.roomIdAt(Math.floor(m.x), Math.floor(m.y)) === rid : dist(m, this.center(t)) < 4));
    const s = { fire: false, ice: false, poison: false, dark: false, demon: false, lightning: false };
    for (const m of near) {
      const st = g.monsters.combatStats(m);
      if (st.element in s) s[st.element] = true;
      if (st.family === 'demon') s.demon = true;
    }
    return s;
  }

  damageTo(t, h, base, syn) {
    const g = this.game, cb = g.combat, d = this.def(t);
    const hs = cb.stats(h);
    let dmg = base;
    if (d.type === 'physical') dmg *= 100 / (100 + Math.max(0, hs.def));
    else if (d.type !== 'true') dmg *= 100 / (100 + Math.max(0, hs.mdef));
    if (d.type !== 'true') dmg *= cb.elementMult(TYPE_ELEMENT[d.type], h, hs);
    if ((hs.weak || []).includes('trap')) dmg *= BALANCE.combat.tagWeakness;
    // ---- Trap combos ----
    const has = (id) => cb.hasStatus(h, id);
    if (d.tags?.includes('arrow') && has('slow')) dmg *= 1.2;                       // Frost + Arrow
    if (d.type === 'fire' && has('root')) dmg *= 1.25;                               // Pit + Fire
    if (d.type === 'fire' && has('slow')) dmg *= 1.2;                                // Dragon Breath + Frost
    if (d.tags?.includes('lightning') && has('slow')) dmg *= 1.2;                    // Gravity + Lightning
    if (d.tags?.includes('hand') && has('root')) dmg *= 1.3;                         // Cage + Demon Hand
    if (d.type === 'physical' && (has('curse') || has('armor_break'))) dmg *= 1.3;   // Curse + Spike
    // ---- โบนัสเฉพาะกับดัก ----
    if (d.bonus === 'lowMana' && (h.mp ?? hs.mp) / (hs.mp || 1) < 0.3) dmg *= d.index === 34 ? 1.3 : 1.25;
    if (d.bonus === 'vsBleed' && has('bleed')) dmg *= 1.2;
    if (d.bonus === 'trapped' && (has('root') || has('slow'))) dmg *= 1.5;
    if (d.bonus === 'vsDark' && (hs.element === 'dark' || /Necromancer|Warlock|Dark Knight|Shadowblade/.test(h.className))) dmg *= 1.5;
    if (d.execute && h.hp / hs.hp < d.execute) dmg *= 1.5;
    // ---- Synergy มอนสเตอร์ ----
    if (syn.fire && d.type === 'fire') dmg *= 1.15;
    if (syn.dark && d.type === 'shadow') dmg *= 1.15;
    if (syn.demon && d.rarity === 'legendary') dmg *= 1.1;
    if (d.index === 50 && (t.level || 1) >= 5) dmg *= 1.5;
    return Math.max(1, Math.round(dmg));
  }

  hit(t, h, base, syn, opts = {}) {
    const g = this.game, d = this.def(t);
    if (h.dead || h.downed) return 0;
    const dmg = this.damageTo(t, h, base * (opts.mult || 1), syn);
    const killed = g.combat.applyDamage(null, h, dmg, { color: TYPE_COLOR[d.type] });
    if (!killed && !opts.noStatus) this.applyStatuses(t, h, syn);
    return dmg;
  }

  applyStatuses(t, h, syn) {
    const g = this.game, d = this.def(t), L5 = (t.level || 1) >= 5;
    const list = [...(d.status || [])];
    if (L5 && d.index === 1) list.push(['poison', 3, 1]);
    if (L5 && d.index === 10) list.push(['freeze', 1.5, 0.3]);
    if (L5 && d.index === 46) list.push(['slow', 3, 1, 0.4]);
    for (const [id, sec, chance, pct] of list) {
      let dur = sec;
      if (syn.ice && ['slow', 'freeze'].includes(id)) dur *= 1.2;
      if (syn.poison && id === 'poison') dur *= 1.2;
      if (L5 && d.index === 46 && id === 'fear') dur += 2;
      let p = pct;
      if (L5 && d.index === 13 && pct) p = pct * 1.5;
      g.combat.addStatus(h, { id, dur, chance, pct: p });
    }
  }

  // ---------- Displacement ----------
  push(h, from, tiles) {
    const g = this.game;
    const dx = h.x - from.x, dy = h.y - from.y, l = Math.hypot(dx, dy) || 1;
    for (let s = tiles; s > 0; s -= 0.5) {
      const nx = h.x + dx / l * s, ny = h.y + dy / l * s;
      if (g.dungeon.walkable(Math.floor(nx), Math.floor(ny))) { h.x = nx; h.y = ny; h.path = null; return; }
    }
  }
  pullTo(h, to, max = 99) {
    const dx = to.x - h.x, dy = to.y - h.y, l = Math.hypot(dx, dy);
    const s = Math.min(l, max);
    if (l > 0.01) { h.x += dx / l * s; h.y += dy / l * s; h.path = null; }
  }
  teleport(t, h) {
    const g = this.game, rng = g.rng;
    let dest;
    const others = this.list.filter((o) => o !== t && o.durability > 0);
    if (others.length && rng.chance(0.3)) { const o = rng.pick(others); dest = { x: o.x + 0.5, y: o.y + 0.5 }; }
    else {
      const e = g.dungeon.d.entrance;
      for (let i = 0; i < 20 && !dest; i++) {
        const x = e.x + rng.int(0, 3), y = e.y + rng.int(-2, 2);
        if (g.dungeon.walkable(x, y)) dest = { x: x + 0.5, y: y + 0.5 };
      }
    }
    if (!dest) return null;
    g.combat.burst(h, 0.8, 'arcane');
    h.x = dest.x; h.y = dest.y; h.path = null; h.target = null;
    g.combat.burst(h, 0.8, 'arcane');
    g.combat.text(h, 'WARP!', '#d88aff');
    return dest;
  }

  heroesNear(p, r) {
    return this.game.state.heroes.filter((h) => h.inside && !h.dead && !h.downed && !h.summon && dist(h, p) <= r);
  }

  // ---------- Main update ----------
  update(dt) {
    const g = this.game;
    for (const t of this.list) {
      if (t.cd > 0) t.cd -= dt;
      if (t.fired > 0) t.fired -= dt;
      if (t.cd > 0 || t.durability <= 0) continue;
      const d = this.def(t); if (!d) continue;
      const c = this.center(t);
      const r = d.pattern === 'room' ? this.range(t) : this.range(t);
      let cands = this.heroesNear(c, d.range <= 1 ? 0.75 : r);
      if (d.range > 1.5) cands = cands.filter((h) => g.dungeon.los(c, h));
      if (!cands.length) continue;
      cands.sort((a, b) => dist(a, c) - dist(b, c));
      const first = cands[0];
      // ผู้กล้าที่ปลดกับดักได้ / รู้ตำแหน่งกับดัก
      const party = g.heroes.party(first.partyId);
      const known = party?.knownTraps?.includes(t.id);
      if ((first.ai?.disarm || known) && dist(first, c) < 1.2 && g.rng.chance(known ? 0.6 : TB.rogueDisarmChance)) {
        t.durability = Math.max(0, t.durability - 5); t.cd = this.cooldown(t);
        g.combat.text(first, 'DISARM', '#cccccc');
        continue;
      }
      this.fire(t, cands);
    }
    // Field (ดาเมจต่อวินาที)
    for (const f of this.fields) {
      f.t -= dt; f.tick -= dt;
      const t = this.list.find((x) => x.id === f.trapId);
      if (f.pull) for (const h of this.heroesNear(f, f.r)) if (!h.isBoss) this.pullTo(h, f, 1.5 * dt);
      if (f.tick <= 0 && t) {
        f.tick = 0.5;
        for (const h of this.heroesNear(f, f.r)) {
          if (f.line && Math.abs(h.y - f.y) > 0.8 && Math.abs(h.x - f.x) > 0.8) continue;
          const dmg = this.hit(t, h, f.dps * 0.5, f.syn);
          if (f.drain) this.drainHeal(f, dmg * f.drain * (this.game.combat.hasStatus(h, 'poison') ? 1.5 : 1));
        }
      }
    }
    this.fields = this.fields.filter((f) => f.t > 0);
    // Doom Mark
    for (const mk of this.marks) {
      mk.t -= dt;
      if (mk.t <= 0) {
        const h = g.state.heroes.find((x) => x.id === mk.heroId);
        if (h && !h.dead && !h.downed) {
          g.combat.burst(h, 1.2, 'dark');
          g.combat.applyDamage(null, h, Math.max(1, Math.round(mk.dmg * 100 / (100 + h.stats.mdef))), { color: '#a36bff', crit: true });
        }
      }
    }
    this.marks = this.marks.filter((m) => m.t > 0);
  }

  drainHeal(f, amount) {
    const g = this.game;
    for (const m of g.state.monsters) {
      if (m.ko || dist(m, f) > 5) continue;
      const cap = g.monsters.stats(m).hp * 0.1 * 0.5;
      g.combat.heal(null, m, Math.max(1, Math.round(Math.min(cap, amount))));
    }
  }

  fire(t, cands) {
    const g = this.game, d = this.def(t), cb = g.combat;
    const c = this.center(t);
    const syn = this.monsterSynergy(t);
    const base = this.baseDamage(t);
    const first = cands[0];
    t.cd = this.cooldown(t);
    t.fired = 0.35;
    t.durability -= TB.durabilityPerTrigger;
    t.triggers = (t.triggers || 0) + 1;
    const L5 = (t.level || 1) >= 5;
    switch (d.pattern) {
      case 'hit': {
        if (d.pull) { this.pullTo(first, c, first.isBoss ? 1 : 99); }
        if (d.teleport) {
          const dest = this.teleport(t, first);
          const dm = this.hit(t, first, base, syn);
          if (d.splash && dest) for (const h of this.heroesNear(dest, d.splash)) if (h !== first) this.hit(t, h, base * 0.5, syn);
          if (!dm) break;
        } else if (d.dot) {
          this.hit(t, first, base * d.dot * 0.6, syn);
        } else this.hit(t, first, base, syn);
        cb.burst(first, 0.6, TYPE_ELEMENT[d.type]);
        break;
      }
      case 'proj': {
        const shots = d.shots || 1;
        for (let i = 0; i < shots; i++) {
          const targets = cands.slice(0, d.pierce || 1);
          for (const h of targets) { cb.projectile(c, h, d.type === 'physical' ? 'arrow' : TYPE_ELEMENT[d.type], !!d.splash); this.hit(t, h, base, syn); }
        }
        if (d.splash) { cb.burst(first, d.splash, 'fire'); for (const h of this.heroesNear(first, d.splash)) if (h !== first) this.hit(t, h, base * 0.6, syn); }
        break;
      }
      case 'line': {
        const targets = cands.slice(0, d.pierce || 1);
        for (const h of targets) { this.hit(t, h, base, syn); if (d.knock) this.push(h, c, d.knock); }
        cb.burst(first, 0.8, 'trap');
        break;
      }
      case 'aoe': {
        const rad = d.radius || 1.5;
        const ctr = dist(first, c) > rad ? { x: first.x, y: first.y } : c;
        const hits = this.heroesNear(ctr, rad);
        cb.burst(ctr, rad, TYPE_ELEMENT[d.type] === 'physical' ? 'trap' : TYPE_ELEMENT[d.type]);
        for (const h of hits) {
          if (d.pull) this.pullTo(h, ctr, h.isBoss ? 1 : 2);
          this.hit(t, h, base, syn);
          if (d.knock && !h.dead) this.push(h, ctr, d.knock);
          if (d.doom) this.marks.push({ heroId: h.id, t: d.doom[0], dmg: d.doom[1] * this.lv(t).dmg * (1 + (g.state.dungeonLevel - 1) * TB.levelScale) * TB.damageScale * (h.isBoss ? 0.5 : 1) });
        }
        if (d.shards) for (const h of cands.filter((x) => !hits.includes(x)).slice(0, d.shards[0])) { cb.projectile(ctr, h, 'arcane'); this.hit(t, h, d.shards[1] * this.lv(t).dmg * TB.damageScale, syn, { noStatus: true }); }
        break;
      }
      case 'field': {
        const rad = d.radius || 1.5;
        const ctr = dist(first, c) > rad ? { x: first.x, y: first.y } : c;
        this.fields.push({ trapId: t.id, x: ctr.x, y: ctr.y, r: rad, dps: base, t: (d.dur || 3) + (L5 && d.index === 4 ? 2 : 0), tick: 0, pull: d.pull, line: d.line, drain: d.drain ? d.drain * (L5 ? 1.5 : 1) : 0, syn, color: TYPE_COLOR[d.type] });
        break;
      }
      case 'chain': {
        let n = (d.chain || 3) + (syn.lightning ? 1 : 0) + (L5 && d.index === 11 ? 2 : 0);
        const hitSet = new Set(); let prev = c, cur = first;
        while (cur && n-- > 0) {
          cb.projectile(prev, cur, TYPE_ELEMENT[d.type], true);
          this.hit(t, cur, base, syn); hitSet.add(cur);
          prev = cur;
          cur = this.game.state.heroes.filter((h) => h.inside && !h.dead && !h.downed && !hitSet.has(h) && dist(h, prev) < 3.2).sort((a, b) => dist(a, prev) - dist(b, prev))[0];
        }
        break;
      }
      case 'room': {
        const rid = g.dungeon.roomIdAt(t.x, t.y);
        const hits = g.state.heroes.filter((h) => h.inside && !h.dead && !h.downed && (rid ? g.dungeon.roomIdAt(Math.floor(h.x), Math.floor(h.y)) === rid : dist(h, c) < 6));
        cb.burst(c, 4, 'dark');
        for (const h of hits) this.hit(t, h, base, syn);
        break;
      }
      default: break;
    }
    g.audio?.play('trap');
    if (t.durability <= 0) g.notify(`${d.th} พังแล้ว — ซ่อมได้ที่เมนูก่อสร้าง → กับดัก`, 'warn');
  }
}
