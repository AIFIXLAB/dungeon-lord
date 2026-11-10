// ทดสอบเล่นยาว (บอท) ข้าม Dungeon Level 2 ขึ้นไป เพื่อตรวจว่าเกม "เล่นได้เรื่อยๆ" ไม่มี error
// รัน: node tests/long.test.mjs [จำนวนวัน]
import { Game } from '../src/managers/GameManager.js';
import { BOSSES } from '../src/data/bosses.js';
let fusions = 0;

const DAYS = +process.argv[2] || 90;
const g = new Game(null, { headless: true, seed: 777, fetch: null });
const d = g.dungeon, s = g.state;
let errs = 0;
function tryBuild(type) {
  const [w, h] = d.roomDims(type, 0); const a = s.dungeon.area;
  for (let y = a.y; y <= a.y + a.h - h; y++) for (let x = a.x + 1; x <= a.x + a.w - w; x++) {
    const c = d.canPlaceRoom(type, x, y, 0); if (c.ok && c.connected) return d.buildRoom(type, x, y, 0).ok;
  }
  return false;
}
const want = ['storage_room', 'cleaning_room', 'training_room', 'barracks', 'guard_room', 'hospital', 'food_farm', 'treasure_room', 'trap_workshop', 'boss_room', 'fusion_chamber', 'barracks', 'guard_room', 'barracks'];
let lastDay = 0;
const t0 = Date.now();
while (g.time.day < DAYS) {
  try {
    for (let i = 0; i < 200; i++) g.step(0.05);
    if (!s.heroes.length) {
      for (const t of want) {
        const have = s.dungeon.rooms.filter((r) => r.type === t).length, need = want.filter((x) => x === t).length;
        if (have < need && s.gold > 800) {
          if (!tryBuild(t)) for (const dir of ['right', 'down', 'up']) if (d.canExpand(dir).ok && s.gold > d.expansionCost()) { d.expand(dir); break; }
          break;
        }
      }
      for (const r of s.dungeon.rooms) if (s.gold > 3000) d.upgradeRoom(r.id);
      if (d.roomsOfType('trap_workshop').length && s.gold > 500) {
        const e = d.entrancePos(), c = d.corePos(); const p = d.findPath(e.x, e.y, c.x, c.y);
        for (const q of p.slice(2, -3)) if (d.canPlaceTrap('spike_floor', Math.floor(q.x), Math.floor(q.y)).ok) { d.placeTrap(g.rng.pick(['spike_floor', 'wall_arrow', 'poison_arrow', 'fire_vent']), Math.floor(q.x), Math.floor(q.y)); break; }
      }
      for (const t of s.dungeon.traps) if (t.durability <= 0) d.repairTrap(t.id);
    }
    const pool = g.monsters.recruitableSpecies();
    if (s.gold > 400 && s.monsters.length < d.barracksCapacity()) g.monsters.recruit(pool[g.rng.int(0, pool.length - 1)]);
    for (const m of s.monsters) for (const id of g.monsters.evolutionOptions(m)) if (g.monsters.evolutionCheck(m, id).ok) g.monsters.evolve(m, id);
    if (s.monsters.filter((m) => m.assignment.type === 'clean').length < 2) { const k = s.monsters.find((m) => m.assignment.type === 'guard'); if (k) g.monsters.assign(k, { type: 'clean' }); }
    const idle = s.monsters.find((m) => m.assignment.type === 'guard' && m.fatigue < 20 && g.training.freeRoom());
    if (idle && s.gold > 1000) g.training.start(idle, g.rng.pick(['atk', 'def', 'hp']), false);
    for (const it of [...s.inventory]) {
      const df = g.inventory.def(it);
      if (df.slot) { const m = s.monsters.find((mm) => !mm.equipment[df.slot]); if (m) g.inventory.equip(m, it.uid); else g.inventory.sell(it.uid); }
      else if (df.type === 'material' && it.qty > 20) g.inventory.sell(it.uid, it.qty - 20);
    }
    if (!g.monsters.currentBoss() && d.roomsOfType('boss_room').length) {
      const id = Object.keys(BOSSES).find((b) => g.monsters.canSummonBoss(b, true).ok);
      if (id) { const r = g.monsters.summonBoss(id, true); if (r.ok) console.log(`BOSS ${BOSSES[id].name} summoned (day ${g.time.day})`); }
    }
    if (g.fusion.chamber() && !g.state.fusions.length && s.gold > 600 && s.monsters.length > 8) {
      const c = s.monsters.filter((m) => !g.fusion.canUse(m) && m.ai !== 'fight').sort((a, b) => a.level - b.level);
      if (c.length >= 2) { const r = g.fusion.start(c[0].id, c[1].id); if (r.ok) fusions++; }
    }
    if (g.progression.canRankUp().ok) { g.progression.rankUp(); console.log(`RANK UP -> ${s.dungeonLevel} (day ${g.time.day})`); }
    if (s.defeated) { console.log(`defeat day ${g.time.day} lvl ${s.dungeonLevel}`); g.recoverFromDefeat(); }
  } catch (e) { errs++; console.error(e); if (errs > 3) break; }
  if (g.time.day % 15 === 0 && g.time.day !== lastDay) {
    lastDay = g.time.day; const v = g.progression.values();
    console.log(`d${lastDay} L${s.dungeonLevel} gold=${s.gold} kills=${v.kills} def=${v.defenses} inc=${v.totalIncome} mons=${v.monsters} maxLv=${Math.max(...s.monsters.map((m) => m.level))} rooms=${v.rooms} traps=${s.dungeon.traps.length} esc=${s.stats.escapes} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
}
const sv = g.save.serialize();
console.log(`fusions=${fusions} fusedDone=${s.stats.fusions || 0} boss=${g.monsters.currentBoss()?.name} bossKOs? codex=${Object.keys(s.codex).length} heroClassesSeen=${Object.keys(s.heroCodex).length}`);
console.log(`errors=${errs} saveSize=${JSON.stringify(sv).length} valid=${g.save.validate(sv).ok}`);
process.exit(errs ? 1 : 0);
