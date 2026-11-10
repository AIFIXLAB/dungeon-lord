// FusionManager — ผสมมอนสเตอร์ 2 ตัวเป็นสายพันธุ์ใหม่ (GDD §9, Monster Bible §12)
// สูตรแน่นอน → สูตรธาตุ → สุ่มตาม Rarity Table, แสดงผลลัพธ์ที่เป็นไปได้ + อัตราก่อนเริ่ม, ล็อกมอนสเตอร์, ยืนยันก่อนใช้วัตถุดิบ
import { BALANCE } from '../config/balance.js';
import { MONSTERS, MUTATIONS, RARITY_ORDER } from '../data/monsters.js';
import { speciesInfo } from './MonsterManager.js';
import { uid } from '../core/util.js';

const FB = BALANCE.fusion;
// สูตรแน่นอน (GDD §9 ปรับให้เข้ากับสายพันธุ์ในเกม)
export const RECIPES = [
  { a: 'slime', b: 'fire_slime', result: 'lava_beast', note: 'Slime + Fire Slime' },
  { a: 'goblin', b: 'skeleton', result: 'ghoul', note: 'Goblin + Skeleton' },
  { a: 'wolf', b: 'dire_wolf', result: 'fenrir', note: 'Wolf + Dark Wolf → Shadow Wolf' },
  { a: 'fire_drake', b: 'slime', result: 'salamander', note: 'Dragon + Slime' },
  { a: 'skeleton_knight', b: 'dark_elf', result: 'dark_knight', note: 'Skeleton Knight + Dark Mage → Death Knight' },
  { a: 'red_dragon', b: 'ice_dragon', result: 'black_dragon', note: 'Fire Dragon + Ice Dragon → Chaos Dragon' },
  { a: 'mushroom', b: 'goblin_shaman', result: 'spore_mage' },
  { a: 'bat', b: 'ghost', result: 'banshee' },
  { a: 'golem', b: 'mimic', result: 'trap_golem' },
];
// สูตรธาตุ (Monster Bible §12.3)
export const ELEMENT_FUSION = {
  'fire+wind': ['salamander', 'thunder_bird'], 'earth+fire': ['lava_beast', 'ifrit'], 'ice+water': ['ice_slime', 'leviathan', 'ice_dragon'],
  'dark+poison': ['toxic_spider', 'nightmare'], 'light+wind': ['harpy', 'angel', 'griffin'], 'earth+nature': ['plant_monster', 'treant'],
  'lightning+water': ['jelly', 'raiju', 'thunder_dragon'], 'dark+fire': ['flame_imp', 'fire_hound', 'demon'],
};

export class FusionManager {
  constructor(game) { this.game = game; }
  get jobs() { return (this.game.state.fusions ||= []); }
  chamber() { return this.game.dungeon.roomsOfType('fusion_chamber')[0] || null; }
  slots() { const c = this.chamber(); return c ? this.game.dungeon.roomCapacity(c) : 0; }

  canUse(m) {
    if (!m) return 'ไม่พบมอนสเตอร์';
    if (m.locked) return 'ถูกล็อกไว้';
    if (m.ko) return 'หมดสติอยู่';
    if (m.isBoss) return 'บอสนำไปผสมไม่ได้';
    if (m.ai === 'fight') return 'กำลังต่อสู้';
    if (m.training) return 'กำลังฝึก';
    return null;
  }

  recipeFor(a, b) {
    return RECIPES.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)) || null;
  }

  // คืนรายการผลลัพธ์ที่เป็นไปได้ [{species, chance}] ผลรวม = 1
  preview(ma, mb, useCrystal = false) {
    const A = speciesInfo(ma.species), Bs = speciesInfo(mb.species);
    const rec = this.recipeFor(ma.species, mb.species);
    if (rec && MONSTERS[rec.result]) return { kind: 'recipe', note: rec.note, results: [{ species: rec.result, chance: 1 }] };
    const hi = RARITY_ORDER[Math.max(RARITY_ORDER.indexOf(A.rarity), RARITY_ORDER.indexOf(Bs.rarity))];
    let table = { ...FB.rarityTable[hi] };
    if (useCrystal) {
      const keys = Object.keys(table);
      if (keys.length > 1) { const first = keys[0], last = keys[keys.length - 1]; const shift = Math.min(table[first], 100 * FB.fusionCrystalBonus); table[first] -= shift; table[last] += shift; }
    }
    const room = this.chamber();
    const bonus = room ? this.game.dungeon.roomEffect(room, 'fusionBonus') : 0;
    if (bonus) { const keys = Object.keys(table); const last = keys[keys.length - 1]; const first = keys[0]; const s = Math.min(table[first], bonus * 100); table[first] -= s; table[last] += s; }
    const ek = [A.element, Bs.element].sort().join('+');
    let pool = ELEMENT_FUSION[ek];
    const kind = pool ? 'element' : 'random';
    if (!pool) {
      pool = Object.keys(MONSTERS).filter((id) => id !== ma.species && id !== mb.species && (MONSTERS[id].element === A.element || MONSTERS[id].element === Bs.element || MONSTERS[id].family === A.family || MONSTERS[id].family === Bs.family));
    }
    pool = pool.filter((id) => MONSTERS[id] && MONSTERS[id].unlock <= Math.max(this.game.state.dungeonLevel + 1, 1) || MONSTERS[id]?.unlock === 0);
    const results = [];
    const total = Object.values(table).reduce((s, v) => s + v, 0);
    for (const [rar, w] of Object.entries(table)) {
      if (w <= 0) continue;
      let cands = pool.filter((id) => MONSTERS[id].rarity === rar);
      if (!cands.length) {
        // ใช้สายพันธุ์ที่ rarity ใกล้เคียงที่สุด
        const ri = RARITY_ORDER.indexOf(rar);
        for (let d = 1; d < 6 && !cands.length; d++) cands = pool.filter((id) => Math.abs(RARITY_ORDER.indexOf(MONSTERS[id].rarity) - ri) === d);
      }
      if (!cands.length) continue;
      for (const id of cands) {
        const ex = results.find((r) => r.species === id);
        const c = (w / total) / cands.length;
        if (ex) ex.chance += c; else results.push({ species: id, chance: c });
      }
    }
    const sum = results.reduce((s, r) => s + r.chance, 0) || 1;
    for (const r of results) r.chance /= sum;
    results.sort((x, y) => y.chance - x.chance);
    return { kind, results };
  }

  cost(ma, mb) {
    const A = speciesInfo(ma.species), B = speciesInfo(mb.species);
    const hi = RARITY_ORDER[Math.max(RARITY_ORDER.indexOf(A.rarity), RARITY_ORDER.indexOf(B.rarity))];
    return FB.cost[hi];
  }

  check(aId, bId, useCrystal) {
    const g = this.game;
    if (!this.chamber()) return { ok: false, reason: 'ต้องสร้าง Fusion Chamber ก่อน' };
    if (this.jobs.length >= this.slots()) return { ok: false, reason: 'Fusion Chamber เต็ม (อัปเกรดเพื่อเพิ่มช่อง)' };
    if (aId === bId) return { ok: false, reason: 'เลือกมอนสเตอร์ 2 ตัวที่ต่างกัน' };
    const ma = g.monsters.get(aId), mb = g.monsters.get(bId);
    const ra = this.canUse(ma), rb = this.canUse(mb);
    if (ra) return { ok: false, reason: `${ma?.name || 'A'}: ${ra}` };
    if (rb) return { ok: false, reason: `${mb?.name || 'B'}: ${rb}` };
    if (g.state.gold < this.cost(ma, mb)) return { ok: false, reason: 'Gold ไม่พอ' };
    if (useCrystal && g.inventory.count('fusion_crystal') < 1) return { ok: false, reason: 'ไม่มี Fusion Crystal' };
    const pv = this.preview(ma, mb, useCrystal);
    if (!pv.results.length) return { ok: false, reason: 'ไม่มีผลลัพธ์ที่เป็นไปได้' };
    return { ok: true, preview: pv, cost: this.cost(ma, mb), ma, mb };
  }

  start(aId, bId, useCrystal = false) {
    const g = this.game, rng = g.rng;
    const chk = this.check(aId, bId, useCrystal); if (!chk.ok) return chk;
    const { ma, mb, preview } = chk;
    g.economy.spend('fusion', chk.cost);
    if (useCrystal) g.inventory.removeById('fusion_crystal', 1);
    let r = rng.next(), species = preview.results[0].species;
    for (const x of preview.results) { r -= x.chance; if (r <= 0) { species = x.species; break; } }
    const mutation = rng.chance(FB.mutationChance + (useCrystal ? 0.08 : 0)) ? rng.pick(Object.keys(MUTATIONS)) : null;
    // คืนอุปกรณ์เข้าคลังก่อนใช้เป็นวัตถุดิบ
    for (const m of [ma, mb]) for (const slot of ['weapon', 'armor', 'accessory']) if (m.equipment[slot]) g.inventory.unequip(m, slot, true);
    const parents = [ma, mb].map((m) => ({ id: m.id, name: m.name, species: m.species, level: m.level, trait: m.trait, trained: m.trained, skills: g.monsters.activeSkills(m).map((s) => s.key), mutations: m.mutations || [] }));
    g.state.monsters = g.state.monsters.filter((m) => m.id !== ma.id && m.id !== mb.id);
    const room = this.chamber();
    const hours = FB.hours * g.dungeon.roomEffect(room, 'timeMult') || FB.hours;
    const job = { id: uid(g, 'fu'), species, mutation, parents, start: g.state.time, end: g.state.time + hours * 60 };
    this.jobs.push(job);
    g.notify(`เริ่มผสม ${ma.name} + ${mb.name} (ใช้เวลา ${hours.toFixed(1)} ชม.)`, 'info');
    g.audio?.play('evolve');
    return { ok: true, job };
  }

  update() {
    const g = this.game;
    const done = this.jobs.filter((j) => g.state.time >= j.end);
    for (const j of done) this.complete(j);
    if (done.length) g.state.fusions = this.jobs.filter((j) => !done.includes(j));
  }

  complete(j) {
    const g = this.game, rng = g.rng;
    const [pa, pb] = j.parents;
    const level = Math.max(1, Math.floor((pa.level + pb.level) / 2 * FB.levelKeep));
    const m = g.monsters.create(j.species, null, level);
    m.trait = rng.chance(0.5) ? pa.trait : pb.trait;
    const sk = [...pa.skills, ...pb.skills].filter((k) => !k.startsWith('b'));
    if (sk.length) m.inheritedSkill = rng.pick(sk);
    for (const k of Object.keys(m.trained)) m.trained[k] = +(((pa.trained?.[k] || 0) + (pb.trained?.[k] || 0)) * 0.3).toFixed(2);
    const inheritMut = [...pa.mutations, ...pb.mutations].filter((x) => rng.chance(0.5));
    m.mutations = [...new Set([...(j.mutation ? [j.mutation] : []), ...inheritMut])].slice(0, 2);
    m.hp = g.monsters.stats(m).hp;
    const c = this.chamber() || g.dungeon.coreRoom();
    const p = g.dungeon.roomCenter(c); m.x = p.x; m.y = p.y;
    g.state.monsters.push(m);
    g.monsters.discover(j.species, 'fused'); g.monsters.discover(j.species, 'owned');
    g.state.stats.fusions = (g.state.stats.fusions || 0) + 1;
    g.combat.burst(m, 1.8, 'evolve');
    g.notify(`Fusion สำเร็จ! ได้ ${MONSTERS[j.species].name} Lv.${level}${m.mutations.length ? ` [${m.mutations.map((k) => MUTATIONS[k].name).join(', ')}]` : ''}`, 'good');
    g.audio?.play('rankup');
    return m;
  }
}
