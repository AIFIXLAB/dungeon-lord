// CombatManager — สูตรดาเมจตาม Design Bible, ACC/EVA, คริติคอล, ธาตุ 12 ธาตุ, จุดอ่อน, สถานะผิดปกติ, MP, สกิล, Summon
import { BALANCE } from '../config/balance.js';
import { STATUS_INFO } from '../data/skills.js';
import { ADVANTAGE, DISADVANTAGE, normElement } from '../data/elements.js';
import { dist, clamp } from '../core/util.js';

const C = BALANCE.combat;
const NEG = new Set(Object.keys(STATUS_INFO).filter((k) => !STATUS_INFO[k].buff));

export class CombatManager {
  constructor(game) { this.game = game; this.fx = []; }

  // ---------- Stats ----------
  rawStats(u) {
    if (u.side === 'monster') return this.game.monsters.combatStats(u);
    return this.game.heroes.combatStats(u);
  }
  stats(u) {
    const s = { ...this.rawStats(u) };
    for (const e of u.status || []) {
      const info = STATUS_INFO[e.id]; if (!info) continue;
      const p = e.pct ?? 0;
      switch (e.id) {
        case 'atk_up': s.atk *= 1 + p; break;
        case 'matk_up': s.matk *= 1 + p; break;
        case 'def_up': s.def *= 1 + p; break;
        case 'mdef_up': s.mdef *= 1 + p; break;
        case 'spd_up': s.spd *= 1 + p; break;
        case 'crit_up': s.crit += p; break;
        case 'eva_up': s.eva += p; break;
        case 'dr_up': s.dmgTaken *= 1 - Math.min(0.7, p); break;
        case 'atk_down': s.atk *= 1 - (p || 0.25); s.matk *= 1 - (p || 0.25); break;
        case 'def_down': s.def *= 1 - (p || 0.25); break;
        case 'spd_down': s.spd *= 1 - (p || 0.3); break;
        default:
          if (info.atk) { s.atk *= 1 + info.atk; s.matk *= 1 + (info.matk || 0); }
          if (info.def) s.def *= 1 + info.def;
          if (info.spd) s.spd *= 1 + info.spd;
          if (info.acc) s.acc *= 1 + info.acc;
          if (info.all) { s.atk *= 1 + info.all; s.matk *= 1 + info.all; s.def *= 1 + info.all; s.mdef *= 1 + info.all; }
      }
    }
    return s;
  }
  maxHp(u) { return this.rawStats(u).hp; }

  statusOf(u, id) { return (u.status || []).find((s) => s.id === id); }
  hasStatus(u, id) { return (u.status || []).some((s) => s.id === id); }
  canAct(u) { return !(u.status || []).some((s) => STATUS_INFO[s.id]?.noAct); }
  canMove(u) { return !(u.status || []).some((s) => STATUS_INFO[s.id]?.noAct || STATUS_INFO[s.id]?.noMove); }
  silenced(u) { return this.hasStatus(u, 'silence'); }

  addStatus(u, st, source = null) {
    if (!st || u.hp <= 0) return false;
    const info = STATUS_INFO[st.id]; if (!info) return false;
    if (!info.buff) {
      if (st.chance != null && !this.game.rng.chance(st.chance)) return false;
      const res = this.rawStats(u).res || 0;
      if (res > 0 && this.game.rng.chance(res)) { this.text(u, 'RESIST', '#c8c8c8'); return false; }
      if (u.side === 'monster' && st.id === 'fear' && u.trait === 'brave') return false;
    }
    let dur = st.dur ?? 3;
    if (source && !info.buff) dur *= this.rawStats(source).statusMult || 1;
    const weak = this.rawStats(u).weak || [];
    if (!info.buff && weak.includes(st.id)) dur *= 1.5;
    u.status ||= [];
    const ex = u.status.find((s) => s.id === st.id);
    if (ex) { ex.t = Math.max(ex.t, dur); ex.pct = Math.max(ex.pct ?? 0, st.pct ?? 0); }
    else u.status.push({ id: st.id, t: dur, pct: st.pct ?? 0, tick: C.dotTick, src: source?.id });
    if (!info.buff) this.text(u, info.th, info.color, false, -0.3);
    return true;
  }

  cleanse(u) {
    const before = u.status?.length || 0;
    u.status = (u.status || []).filter((s) => STATUS_INFO[s.id]?.buff || s.id === 'sick');
    return before !== u.status.length;
  }

  tickStatus(u, dt) {
    if (!u.status?.length) return;
    const max = this.maxHp(u);
    for (const s of u.status) {
      s.t -= dt;
      const info = STATUS_INFO[s.id];
      if (info?.dot || s.id === 'regen') {
        s.tick -= dt;
        if (s.tick <= 0) {
          s.tick = C.dotTick;
          if (s.id === 'regen') this.heal(null, u, Math.max(1, Math.round(max * (s.pct || 0.03))));
          else {
            const bossCap = u.isBoss ? 0.4 : 1;
            this.applyDamage(null, u, Math.max(1, Math.round(max * info.dot * bossCap)), { color: info.color, noAggro: true, dot: true });
          }
        }
      }
    }
    u.status = u.status.filter((s) => s.t > 0);
  }

  // ---------- Movement / timing ----------
  moveSpeed(u) {
    if (!this.canMove(u)) return 0;
    const s = this.stats(u);
    return clamp(1.5 * s.spd / 100, 0.5, 3.4);
  }
  attackCooldown(u) {
    const s = this.stats(u);
    return C.baseAttackInterval / (s.aspd || 1) / (0.5 + s.spd / 200);
  }
  attackRange(u) { return u.attackKind === 'melee' ? Math.max(C.meleeRange, this.rawStats(u).range || 1) : (this.rawStats(u).range || 4); }

  // ---------- Element & weakness ----------
  elementMult(atkEl, target, ts) {
    atkEl = normElement(atkEl);
    const defEl = normElement(ts.element);
    let m = 1;
    if (atkEl !== 'physical' || defEl !== 'physical') {
      if (ADVANTAGE[atkEl]?.includes(defEl)) m *= C.elementAdvantage;
      else if (DISADVANTAGE[atkEl]?.includes(defEl)) m *= C.elementDisadvantage;
    }
    if (ts.resist && ts.resist[atkEl] != null) m *= ts.resist[atkEl];
    if (ts.weak?.includes(atkEl)) m *= C.weaknessMult;
    return m;
  }

  // ---------- Damage (Bible: ATK × Skill × 100/(100+DEF)) ----------
  computeDamage(att, target, o = {}) {
    const rng = this.game.rng;
    const a = this.stats(att), d = this.stats(target);
    const kind = o.kind || (att.attackKind === 'magic' ? 'mag' : 'phys');
    const atkStat = kind === 'mag' ? a.matk : a.atk;
    let defStat = kind === 'mag' ? d.mdef : d.def;
    if (o.pierce) defStat *= 1 - o.pierce;
    let dmg = atkStat * (o.power || 1) * (100 / (100 + Math.max(0, defStat)));
    dmg *= 1 + rng.range(-C.variance, C.variance);
    const crit = rng.chance(Math.min(0.9, (a.crit || 0) + (o.crit || 0)));
    if (crit) dmg *= a.critDmg || C.critMultiplier;
    const el = o.element || (kind === 'mag' ? a.element : a.weaponElement || 'physical');
    dmg *= this.elementMult(el, target, d);
    const weak = d.weak || [];
    if (o.aoe && weak.includes('aoe')) dmg *= C.tagWeakness;
    if (kind === 'mag' && weak.includes('magic')) dmg *= C.tagWeakness;
    if (o.trap && weak.includes('trap')) dmg *= C.tagWeakness;
    if (a.roleTag === 'assassin' && weak.includes('assassin')) dmg *= C.tagWeakness;
    if (att.attackKind === 'ranged' && weak.includes('ranged')) dmg *= C.tagWeakness;
    if (o.vsFamily && (d.family === o.vsFamily || (o.vsFamily === 'dragon' && target.isBoss))) dmg *= 1.8;
    if (o.execute && target.hp / d.hp < o.execute) dmg *= 1.8;
    if (target.row === 'back') dmg *= C.backRowDamageTaken;
    dmg *= d.dmgTaken || 1;
    if (a.berserk && att.hp / a.hp < 0.3) dmg *= 1 + a.berserk;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }

  hitRoll(att, target, accBonus = 0) {
    const a = this.stats(att), d = this.stats(target);
    if (this.hasStatus(target, 'sleep') || !this.canAct(target)) return true;
    const p = clamp((a.acc + accBonus) / (a.acc + accBonus + d.eva), C.hitMin, C.hitMax);
    return this.game.rng.chance(p);
  }

  applyDamage(att, target, amount, opts = {}) {
    if (target.hp <= 0 || target.downed || (target.side === 'monster' && target.ko)) return false;
    // Protect: อัศวินรับดาเมจแทน 50%
    if (target.protectedBy && target.protectT > 0 && !opts.redirected) {
      const pr = this.findUnit(target.protectedBy);
      if (pr && pr.hp > 0 && dist(pr, target) < 3) {
        const share = Math.round(amount * 0.5);
        amount -= share;
        this.applyDamage(att, pr, share, { ...opts, redirected: true });
      }
    }
    target.hp = Math.max(0, target.hp - amount);
    target.hitFlash = 0.15;
    if (this.hasStatus(target, 'sleep')) target.status = target.status.filter((s) => s.id !== 'sleep');
    if (target.status?.length && !opts.dot) target.status = target.status.filter((s) => s.id !== 'stealth');
    this.text(target, opts.crit ? `${amount}!` : `${amount}`, opts.color || (opts.crit ? '#ffe14a' : target.side === 'hero' ? '#ffffff' : '#ff6a6a'), opts.crit);
    if (att && !opts.noAggro) {
      if (target.side === 'hero') {
        target.dmgBy ||= {};
        if (att.side === 'monster') target.dmgBy[att.id] = (target.dmgBy[att.id] || 0) + amount;
        target.threat = att.id;
      } else {
        target.lastAttacker = att.id;
        if (!target.temp) this.game.monsters.onHit(target);
      }
      // Counter (Monk / Gladiator)
      const cs = this.statusOf(target, 'dr_up');
      if (cs?.counter && dist(att, target) < 1.6 && !opts.counter && target.hp > 0) {
        this.applyDamage(target, att, Math.max(1, Math.round(amount * cs.counter)), { counter: true, color: '#ffcc8a' });
      }
    }
    if (target.hp <= 0) {
      if (target.side === 'hero') this.game.heroes.onHeroDeath(target, att);
      else this.game.monsters.knockout(target, att);
      return true;
    }
    return false;
  }

  heal(src, target, amount) {
    if (target.hp <= 0 || target.downed || (target.side === 'monster' && target.ko)) return 0;
    const max = this.maxHp(target);
    const before = target.hp;
    target.hp = Math.min(max, target.hp + amount);
    const h = Math.round(target.hp - before);
    if (h > 0) this.text(target, `+${h}`, '#6aff8a');
    return h;
  }

  findUnit(id) {
    const s = this.game.state;
    return s.heroes.find((h) => h.id === id) || s.monsters.find((m) => m.id === id) || (s.summons || []).find((m) => m.id === id) || null;
  }

  // ---------- Basic attack ----------
  basicAttack(att, target) {
    const kind = att.attackKind;
    att.lunge = 0.18; att.facing = target.x < att.x ? -1 : 1;
    att.lastDir = dirOf(att, target);
    if (kind !== 'melee') this.projectile(att, target, kind === 'magic' ? this.stats(att).element : 'arrow');
    else this.slash(att, target);
    if (!this.hitRoll(att, target)) { this.text(target, 'MISS', '#cccccc'); return; }
    const r = this.computeDamage(att, target, { kind: kind === 'magic' ? 'mag' : 'phys' });
    this.applyDamage(att, target, r.dmg, { crit: r.crit });
    this.game.audio?.play(kind === 'melee' ? 'hit' : 'shoot');
  }

  // ---------- Skills ----------
  tickCooldowns(u, dt) {
    if (u.atkTimer > 0) u.atkTimer -= dt;
    if (u.skillCd) for (const k in u.skillCd) if (u.skillCd[k] > 0) u.skillCd[k] -= dt;
    if (u.hitFlash > 0) u.hitFlash -= dt;
    if (u.lunge > 0) u.lunge -= dt;
    if (u.casting > 0) u.casting -= dt;
    if (u.protectT > 0) u.protectT -= dt;
    if (u.tauntT > 0) u.tauntT -= dt;
    const maxMp = this.rawStats(u).mp || 50;
    if (u.mp == null) u.mp = maxMp;
    if (u.mp < maxMp) u.mp = Math.min(maxMp, u.mp + C.mpRegenPerSec * dt);
  }

  // skills: [{ key, spec }]
  trySkill(u, skills, enemies, allies) {
    if (!this.canAct(u) || !skills?.length) return false;
    u.skillCd ||= {};
    const cdMult = this.rawStats(u).cdMult || 1;
    for (const { key, spec } of skills) {
      if ((u.skillCd[key] || 0) > 0) continue;
      if ((spec.mp || 0) > (u.mp ?? 0)) continue;
      if (this.silenced(u) && (spec.kind === 'mag' || ['heal', 'mheal', 'revive', 'summon'].includes(spec.type))) continue;
      if (this.castSkill(u, spec, enemies, allies)) {
        u.skillCd[key] = (spec.cd || 8) * cdMult;
        u.mp -= spec.mp || 0;
        u.casting = 0.35;
        this.text(u, spec.name, '#c8a8ff', false, -0.7);
        this.game.audio?.play('skill');
        return true;
      }
    }
    return false;
  }

  inRange(u, t, r) { return dist(u, t) <= r && this.game.dungeon.los(u, t); }

  castSkill(u, sk, enemies, allies) {
    const mastery = u.side === 'monster' ? 1 + 0.06 * Math.floor(u.skillMastery || 0) : 1;
    const us = this.rawStats(u);
    const healMult = us.healMult || 1;
    const range = sk.range ?? (sk.kind === 'mag' ? 3.6 : u.attackKind === 'melee' ? 1.3 : this.attackRange(u));
    const visible = enemies.filter((e) => this.inRange(u, e, range));
    switch (sk.type) {
      case 'dmg': {
        const t = this.pickTarget(u, visible); if (!t) return false;
        if (sk.vsFamily && !(this.rawStats(t).family === sk.vsFamily || t.isBoss) && sk.mp >= 20) return false;
        if (sk.dash) { const dx = t.x - u.x, dy = t.y - u.y, d = Math.hypot(dx, dy); if (d > 1.2) { u.x = t.x - dx / d * 0.9; u.y = t.y - dy / d * 0.9; u.path = null; } }
        if (sk.kind === 'mag' || range > 2) this.projectile(u, t, sk.element || us.element, true); else this.slash(u, t, true);
        u.lunge = 0.2;
        const hits = sk.hits || 1;
        let killed = false;
        for (let i = 0; i < hits && !killed; i++) {
          if (!this.hitRoll(u, t, sk.acc || 0)) { this.text(t, 'MISS', '#ccc'); continue; }
          const el = sk.adaptElement ? this.bestElement(t) : sk.element;
          const r = this.computeDamage(u, t, { ...sk, element: el, power: sk.power * mastery });
          killed = this.applyDamage(u, t, r.dmg, { crit: r.crit });
          if (sk.lifesteal) this.heal(u, u, Math.round(r.dmg * sk.lifesteal));
        }
        if (!killed && sk.status) this.addStatus(t, sk.status, u);
        if (sk.greedy && u.side === 'hero') { const s = Math.min(this.game.state.gold, 15); this.game.state.gold -= s; u.gold = (u.gold || 0) + s; }
        return true;
      }
      case 'aoe': {
        const center = this.pickTarget(u, visible); if (!center) return false;
        const rad = sk.radius || 1.6;
        const hits = enemies.filter((e) => dist(e, center) <= rad);
        if (sk.minTargets && hits.length < sk.minTargets) return false;
        this.burst(center, rad, sk.element || us.element);
        for (const t of hits) {
          const el = sk.adaptElement ? this.bestElement(t) : sk.element;
          const r = this.computeDamage(u, t, { ...sk, element: el, power: sk.power * mastery, aoe: true });
          const killed = this.applyDamage(u, t, r.dmg, { crit: r.crit });
          if (!killed && sk.status) this.addStatus(t, sk.status, u);
        }
        return true;
      }
      case 'heal': {
        const cands = allies.filter((a) => a.hp > 0 && this.inRange(u, a, sk.range || 4) && a.hp / this.maxHp(a) < 0.6);
        if (!cands.length) return false;
        cands.sort((a, b) => a.hp / this.maxHp(a) - b.hp / this.maxHp(b));
        const t = cands[0];
        this.heal(u, t, Math.round(this.maxHp(t) * sk.power * healMult * mastery + us.matk * 0.3));
        this.burst(t, 0.6, 'heal');
        return true;
      }
      case 'mheal': {
        const near = allies.filter((a) => a.hp > 0 && dist(a, u) <= (sk.radius || 4));
        if (!near.some((a) => a.hp / this.maxHp(a) < 0.7)) return false;
        for (const a of near) this.heal(u, a, Math.round(this.maxHp(a) * sk.power * healMult + us.matk * 0.2));
        if (sk.resetCd) for (const a of near) if (a.skillCd) for (const k in a.skillCd) a.skillCd[k] = 0;
        this.burst(u, sk.radius || 4, 'heal');
        return true;
      }
      case 'buff': {
        if (!enemies.length && !sk.precombat) return false;
        if (sk.precombat && !enemies.length && !enemies.near) { /* ใช้ก่อนต่อสู้เมื่อเห็นศัตรูในระยะไกล */ }
        if (sk.whenHpBelow && u.hp / this.maxHp(u) > sk.whenHpBelow) return false;
        if (sk.minAllies && allies.length < sk.minAllies) return false;
        const status = { ...sk.status, pct: (sk.status.pct || 0) * (STATUS_INFO[sk.status.id]?.buff ? healMult : 1), counter: sk.counter };
        if (sk.target === 'self') {
          if (this.hasStatus(u, status.id)) return false;
          this.addStatus(u, status);
          if (status.counter) this.statusOf(u, status.id).counter = status.counter;
        } else {
          const targets = allies.filter((a) => dist(a, u) <= (sk.radius || 4));
          if (targets.every((a) => this.hasStatus(a, status.id))) return false;
          for (const a of targets) this.addStatus(a, status);
        }
        this.burst(u, sk.target === 'self' ? 0.6 : 1.4, 'buff');
        return true;
      }
      case 'debuff': {
        const cands = visible.filter((e) => !this.hasStatus(e, sk.status.id));
        const t = this.pickTarget(u, cands); if (!t) return false;
        this.projectile(u, t, 'dark', true);
        this.addStatus(t, sk.status, u);
        return true;
      }
      case 'taunt': {
        const near = enemies.filter((e) => dist(e, u) <= (sk.radius || 3));
        if (!near.length) return false;
        for (const e of near) { e.tauntedBy = u.id; e.tauntT = 4; }
        this.addStatus(u, { id: 'dr_up', dur: 4, pct: 0.25 });
        this.burst(u, sk.radius || 3, 'buff');
        return true;
      }
      case 'protect': {
        const weak = allies.filter((a) => a !== u && a.hp > 0 && dist(a, u) < 3 && a.hp / this.maxHp(a) < 0.5);
        if (!weak.length || !enemies.length) return false;
        weak.sort((a, b) => a.hp / this.maxHp(a) - b.hp / this.maxHp(b));
        weak[0].protectedBy = u.id; weak[0].protectT = 6;
        this.text(weak[0], 'PROTECT', '#8ab4ff');
        return true;
      }
      case 'cleanse': {
        const t = allies.find((a) => this.inRange(u, a, sk.range || 4) && (a.status || []).some((s) => NEG.has(s.id) && s.id !== 'sick'));
        if (!t) return false;
        this.cleanse(t); this.burst(t, 0.6, 'heal'); this.text(t, 'CLEANSE', '#c8ffe8');
        return true;
      }
      case 'revive': {
        if (u.side !== 'hero') return false;
        return this.game.heroes.reviveNearby(u, sk.power || 0.4);
      }
      case 'summon': {
        if (u.side === 'hero') return this.game.heroes.summon(u, sk.kind, enemies.length > 0);
        if (!enemies.length) return false;
        return this.game.monsters.summonMinions(u);
      }
      case 'detect': {
        if (u.side !== 'hero') return false;
        return this.game.heroes.detectTraps(u);
      }
      default: return false;
    }
  }

  bestElement(t) {
    const ts = this.rawStats(t);
    let best = 'arcane', bm = 0;
    for (const e of ['fire', 'water', 'ice', 'wind', 'earth', 'lightning', 'light', 'dark', 'poison', 'nature', 'arcane']) {
      const m = this.elementMult(e, t, ts); if (m > bm) { bm = m; best = e; }
    }
    return best;
  }

  // AI Target Priority (Monster Bible §16.2 / Hero Bible §6)
  pickTarget(u, list) {
    list = list.filter((e) => !this.hasStatus(e, 'stealth') || dist(u, e) < 1.3);
    if (!list.length) return null;
    if (u.tauntedBy && u.tauntT > 0) { const t = list.find((e) => e.id === u.tauntedBy); if (t) return t; }
    const pref = u.side === 'hero' ? (u.ai?.target || 'nearest') : u.isBoss ? 'nearest' : u.row === 'back' ? 'priority' : 'nearest';
    const hpR = (e) => e.hp / this.maxHp(e);
    const role = (e) => (e.side === 'hero' ? e.roleTag : this.rawStats(e).roleTag) || '';
    const isCaster = (e) => e.casting > 0 || ['mage', 'healer', 'support', 'summoner'].includes(role(e)) || e.attackKind === 'magic';
    const score = {
      nearest: (e) => dist(u, e) - (e.row === 'front' ? 1 : 0) - (u.threat === e.id ? 1.5 : 0),
      lowest_hp: (e) => hpR(e) * 6 + dist(u, e) * 0.3,
      backline: (e) => (e.row === 'back' ? 0 : 5) + dist(u, e) * 0.4,
      caster: (e) => (isCaster(e) ? 0 : 5) + hpR(e) * 2 + dist(u, e) * 0.3,
      strongest: (e) => -this.stats(e).atk / 10 + dist(u, e) * 0.3,
      boss: (e) => (e.isBoss ? -10 : 0) + (this.rawStats(e).rarityRank || 0) * -0.5 + dist(u, e) * 0.3,
      // Monster priority: กำลังร่าย > Healer > Ranged > Assassin > HP ต่ำ > ใกล้ > คนที่โจมตีเรา
      priority: (e) => (e.casting > 0 ? 0 : 1) * 3 + (role(e).includes('Healer') ? 0 : 2) + (e.attackKind === 'ranged' ? 0 : 1) + hpR(e) * 2 + dist(u, e) * 0.4 - (u.lastAttacker === e.id ? 1 : 0),
    }[pref] || ((e) => dist(u, e));
    let best = null, bs = Infinity;
    for (const e of list) { const s = score(e); if (s < bs) { bs = s; best = e; } }
    return best;
  }

  // ---------- FX ----------
  text(u, txt, color, big = false, dy = 0) { this.fx.push({ type: 'text', x: u.x, y: u.y - 0.8 + dy, txt, color, t: 0.9, max: 0.9, big }); }
  projectile(a, b, kind, big = false) { this.fx.push({ type: 'proj', x: a.x, y: a.y, tx: b.x, ty: b.y, kind, t: 0.25, max: 0.25, big }); }
  slash(a, b, big = false) { this.fx.push({ type: 'slash', x: b.x, y: b.y, t: 0.2, max: 0.2, big, dir: b.x < a.x ? -1 : 1 }); }
  burst(p, r, kind) { this.fx.push({ type: 'burst', x: p.x, y: p.y, r, kind, t: 0.45, max: 0.45 }); }
  tickFx(dt) {
    for (const f of this.fx) f.t -= dt;
    this.fx = this.fx.filter((f) => f.t > 0);
    if (this.fx.length > 300) this.fx.splice(0, this.fx.length - 300);
  }
}

export function dirOf(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}
