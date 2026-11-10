// การทดสอบแบบ Headless: จำลองเกมจริงตั้งแต่เริ่มจนถึง Dungeon Level 2 ด้วยบอทผู้เล่นง่าย ๆ
// รัน: node tests/sim.test.mjs
import { Game } from '../src/managers/GameManager.js';
import { SaveManager } from '../src/managers/SaveManager.js';
import { MONSTERS } from '../src/data/monsters.js';

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}
const memStore = () => { const m = new Map(); return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, v), del: (k) => m.delete(k), m }; };

// ---------------------------------------------------------------
console.log('\n[1] New game');
const store = memStore();
let g = new Game(null, { headless: true, seed: 12345, store, fetch: null });
check('gold 500', g.state.gold === 500);
check('3 rooms', g.state.dungeon.rooms.length === 3);
check('3 monsters', g.state.monsters.length === 3);
check('core reachable', g.dungeon.coreReachable());
check('all rooms active', g.state.dungeon.rooms.every((r) => r.status === 'active'));
check('unique monster ids', new Set(g.state.monsters.map((m) => m.id)).size === 3);

console.log('\n[2] Pathfinding');
const e = g.dungeon.entrancePos(), c = g.dungeon.corePos();
const path = g.dungeon.findPath(e.x, e.y, c.x, c.y);
check('path entrance→core exists', !!path && path.length > 5, path?.length);
check('path avoids rock', path.every((p) => g.dungeon.walkable(Math.floor(p.x), Math.floor(p.y))));
check('no path into rock', g.dungeon.findPath(e.x, e.y, 11.5, 9.5) === null);

console.log('\n[3] Room placement rules');
check('overlap rejected', !g.dungeon.canPlaceRoom('barracks', 4, 14).ok);
check('outside area rejected', !g.dungeon.canPlaceRoom('barracks', 14, 14).ok);
const free = g.dungeon.canPlaceRoom('storage_room', 7, 17);
check('valid spot accepted', free.ok, JSON.stringify(free));
check('cannot remove critical corridor', !g.dungeon.removeCorridor(8, 15).ok);

console.log('\n[4] Recruit + economy');
const r1 = g.monsters.recruit('rat', 'Pip');
check('recruit rat', r1.ok && g.state.gold === 455);
check('custom name', r1.monster.name === 'Pip');
check('rat default cleaner', r1.monster.assignment.type === 'clean');
check('ledger recorded', g.state.economy.today.expense.monster_recruitment === 45);

// ---------------------------------------------------------------
console.log('\n[5] Simulated play (bot) to Dungeon Level 2');
function bot(game) {
  const s = game.state, d = game.dungeon;
  const has = (t) => d.roomsOfType(t, false).length;
  const tryBuild = (type) => {
    const [w, h] = d.roomDims(type, 0);
    const a = s.dungeon.area;
    for (let y = a.y; y <= a.y + a.h - h; y++) for (let x = a.x + 1; x <= a.x + a.w - w; x++) {
      const chk = d.canPlaceRoom(type, x, y, 0);
      if (chk.ok && chk.connected) return d.buildRoom(type, x, y, 0).ok;
    }
    return false;
  };
  if (!s.heroes.length) {
    if (!has('storage_room') && s.gold > 180) tryBuild('storage_room');
    if (!has('cleaning_room') && s.gold > 200) tryBuild('cleaning_room');
    if (!has('training_room') && s.gold > 350) tryBuild('training_room');
    if (d.roomsOfType('barracks', false).length < 2 && s.monsters.length >= d.barracksCapacity() - 1 && s.gold > 250) tryBuild('barracks');
    if (s.gold > 600 && d.canExpand('right').ok && d.d.area.w < 16) d.expand('right');
  }
  if (s.monsters.length < 10 && s.gold > 260) {
    const pick = ['skeleton', 'goblin', 'wolf', 'mushroom', 'boar'][s.monsters.length % 5];
    game.monsters.recruit(pick);
  }
  for (const it of [...s.inventory]) {
    if (['weapon', 'armor', 'helmet', 'shield', 'ring', 'necklace'].includes(game.inventory.def(it).type)) {
      const m = s.monsters.find((mm) => !mm.equipment[game.inventory.def(it).slot] && mm.assignment.type === 'guard');
      if (m) game.inventory.equip(m, it.uid); else game.inventory.sell(it.uid);
    } else if (game.inventory.def(it).type === 'material' && it.qty > 8) game.inventory.sell(it.uid, it.qty - 8);
  }
  if (game.progression.canRankUp().ok) game.progression.rankUp();
}

let maxDays = 70, lastDay = 0;
const t0 = Date.now();
let errors = 0;
while (g.time.day <= maxDays && g.state.dungeonLevel < 2) {
  try {
    for (let i = 0; i < 20 * 10; i++) g.step(0.05); // 10 วินาทีเกม
    bot(g);
  } catch (err) { errors++; console.error(err); if (errors > 3) break; }
  if (g.state.defeated) { console.log('   defeated on day', g.time.day, '— recovering'); g.recoverFromDefeat(); }
  if (g.time.day !== lastDay && g.time.day % 5 === 0) {
    lastDay = g.time.day;
    const p = g.progression.values();
    console.log(`   day ${g.time.day}: gold=${g.state.gold} kills=${p.kills} defenses=${p.defenses} income=${p.totalIncome} monsters=${p.monsters} rooms=${p.rooms} rep=${g.state.reputation.toFixed(0)} esc=${g.state.stats.escapes} inv=${g.state.inventory.length} floor=${g.state.floor.length}`);
  }
}
console.log(`   simulated ${g.time.day} days in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
check('no runtime errors', errors === 0);
check('reached Dungeon Level 2', g.state.dungeonLevel >= 2, `level=${g.state.dungeonLevel} reqs=${JSON.stringify(g.progression.requirements?.() ?? [])}`);
check('monsters gained levels', g.state.monsters.some((m) => m.level > 3), g.state.monsters.map((m) => m.level).join(','));
check('cleaners cleaned', g.state.stats.cleaned > 50, g.state.stats.cleaned);
check('loot reached inventory', g.state.stats.cleaned > 0 && g.state.economy.history.some((h) => h.detail.income.loot_gold > 0));
check('daily maintenance charged', g.state.economy.history.some((h) => h.detail.expense.maintenance > 0));

console.log('\n[6] Training changes real stats');
const trainee = g.state.monsters.find((m) => !m.ko);
const atkBefore = g.monsters.stats(trainee).atk;
const tBefore = trainee.trained.atk;
g.state.gold += 500;
trainee.fatigue = 0;
const tr = g.training.start(trainee, 'atk', false);
check('training started', tr.ok, tr.reason);
for (let i = 0; i < 20 * 120 && trainee.assignment.type === 'train'; i++) g.step(0.05);
check('trained ATK increased', trainee.trained.atk > tBefore, `${tBefore}→${trainee.trained.atk}`);
check('stats reflect training', g.monsters.stats(trainee).atk >= atkBefore);

console.log('\n[7] Evolution');
const gob = g.monsters.create('goblin', 'EvoTest');
g.state.monsters.push(gob);
gob.level = 21;
g.inventory.add('evolution_crystal', 1); g.inventory.add('hide', 3);
const crystalsBefore = g.inventory.count('evolution_crystal');
g.state.gold += 1000;
const ec = g.monsters.evolutionCheck(gob, 'goblin_warrior');
check('evolution requirements met', ec.ok, JSON.stringify(ec.reqs));
const hpBefore = g.monsters.stats(gob).hp;
const ev = g.monsters.evolve(gob, 'goblin_warrior');
check('evolved', ev.ok && gob.species === 'goblin_warrior' && gob.stage === 1);
check('evolved stats higher', g.monsters.stats(gob).hp > hpBefore);
check('crystal consumed', g.inventory.count('evolution_crystal') === crystalsBefore - 1);

console.log('\n[8] Save / Load / Validation');
const sv = g.save.saveSlot(1);
check('save slot 1', sv.ok, sv.reason);
const ld = g.save.loadSlot(1);
check('load slot 1', ld.ok, ld.reason);
const g2 = new Game(ld.data, { headless: true, store, fetch: null });
check('loaded gold equal', g2.state.gold === g.state.gold);
check('loaded monsters equal', g2.state.monsters.length === g.state.monsters.length);
check('loaded level equal', g2.state.dungeonLevel === g.state.dungeonLevel);
for (let i = 0; i < 400; i++) g2.step(0.05);
check('loaded game keeps running', g2.state.time > g.state.time);
// corrupt
store.set('dlme_slot_2', '{"format":"DLME","version":1,"checksum":"x","data":{"gold":5}}');
check('corrupt save detected', !g.save.loadSlot(2).ok);
check('corrupt slot not overwritten automatically', !g.save.saveSlot(2).ok && store.get('dlme_slot_2').includes('"checksum":"x"'));
check('forced overwrite works', g.save.saveSlot(2, { force: true }).ok);
const tampered = JSON.parse(store.get('dlme_slot_1')); tampered.data.gold = 999999;
store.set('dlme_slot_3', JSON.stringify(tampered));
check('tampered save rejected', !g.save.loadSlot(3).ok);

console.log('\n[9] Code save (offline fallback)');
const nc = await g.save.newCode();
check('new 4-char code', nc.ok && /^[A-Z2-9]{4}$/.test(nc.code), JSON.stringify(nc));
const sc = await g.save.saveToCode(nc.code);
check('save to code', sc.ok, sc.reason);
const lc = await g.save.loadFromCode(nc.code.toLowerCase());
check('load from code (case-insensitive)', lc.ok && lc.data.gold === g.state.gold, lc.reason);
check('bad code rejected', !(await g.save.loadFromCode('AB')).ok);

console.log('\n[10] Data-driven: every monster definition resolves');
const { speciesInfo } = await import('../src/managers/MonsterManager.js');
let okDefs = true;
for (const id of Object.keys(MONSTERS)) {
  try {
    const m = g.monsters.create(id); const s = g.monsters.stats(m);
    if (!(s.hp > 0 && s.atk >= 0)) okDefs = false;
    if (!speciesInfo(id).sprite) okDefs = false;
  } catch (err) { okDefs = false; console.log('   bad def', id, err.message); }
}
check('all species valid', okDefs);

console.log('\n[11] v1 save migration');
{
  const { fnv1a } = await import('../src/managers/SaveManager.js');
  const v2 = g.save.serialize();
  const d = JSON.parse(JSON.stringify(v2.data));
  d.monsters[0].species = 'kobold'; d.monsters[0].trained = { hp: 4, atk: 2, def: 1, spd: 0, mag: 3 };
  const v1 = { ...v2, version: 1, data: d, checksum: fnv1a(JSON.stringify(d)) };
  const r = g.save.parse(JSON.stringify(v1));
  check('v1 save migrates', r.ok && r.save.data.monsters[0].species === 'rat' && r.save.data.monsters[0].trained.matk > 0, JSON.stringify(r.errors));
  const t0m = r.save.data.time;
  const g3 = new Game(r.save.data, { headless: true, store, fetch: null });
  for (let i = 0; i < 200; i++) g3.step(0.05);
  check('migrated save playable', g3.state.time > t0m);
}

console.log('\n[12] Boss + Fusion');
{
  const gb = new Game(null, { headless: true, seed: 99, store: memStore(), fetch: null });
  gb.state.gold = 1e6; gb.state.dungeonLevel = 2;
  gb.dungeon.expand('right'); gb.dungeon.buildCorridor(12, 15); gb.dungeon.buildCorridor(13, 15);
  const br = gb.dungeon.buildRoom('boss_room', 12, 11, 0);
  check('boss room built', br.ok, br.reason);
  const sb = gb.monsters.summonBoss('boss_slime_king');
  check('boss summoned', sb.ok && gb.monsters.currentBoss()?.isBoss, sb.reason);
  const boss = gb.monsters.currentBoss();
  boss.hp = Math.round(gb.monsters.stats(boss).hp * 0.2);
  gb.state.heroes.push(gb.heroes.createHero('warrior', 'E', 'x')); const hh = gb.state.heroes[0]; hh.inside = true; hh.x = boss.x + 0.5; hh.y = boss.y;
  for (let i = 0; i < 40; i++) gb.step(0.05);
  check('boss phase 3 at 20% HP', boss.phase === 3, boss.phase);
  gb.state.heroes = [];
  gb.dungeon.buildCorridor(11, 17); gb.dungeon.buildCorridor(11, 18);
  const fc = gb.dungeon.buildRoom('fusion_chamber', 6, 17, 0);
  check('fusion chamber built', fc.ok, fc.reason);
  const a = gb.monsters.recruit('goblin').monster, b2 = gb.monsters.recruit('skeleton').monster;
  a.level = 10; b2.level = 10;
  const pv = gb.fusion.preview(a, b2);
  check('fusion recipe goblin+skeleton=ghoul', pv.kind === 'recipe' && pv.results[0].species === 'ghoul');
  a.locked = true;
  check('locked monster cannot fuse', !gb.fusion.check(a.id, b2.id).ok);
  a.locked = false;
  const before = gb.state.monsters.length;
  const fs = gb.fusion.start(a.id, b2.id);
  check('fusion started (parents consumed)', fs.ok && gb.state.monsters.length === before - 2, fs.reason);
  for (let i = 0; i < 20 * 60 && gb.state.fusions.length; i++) gb.step(0.05);
  const res = gb.state.monsters.find((m) => m.species === 'ghoul');
  check('fusion result created', !!res && res.level === 5, res?.level);
}

console.log('\n[13] 60 hero classes');
{
  const { HERO_CLASSES } = await import('../src/data/heroes.js');
  const ids = Object.keys(HERO_CLASSES);
  check('60 classes', ids.length === 60, ids.length);
  let ok = true;
  for (const id of ids) { const h = g.heroes.createHero(id, 'S', 'p'); if (!(h.stats.hp > 0 && h.stats.atk > 0 && HERO_CLASSES[id].skills.length === 3)) ok = false; }
  check('all classes build with 3 skills', ok);
  const kn = g.heroes.computeStats('knight', 'F', 1), mg = g.heroes.computeStats('mage', 'F', 1);
  check('knight tankier than mage, mage more MATK', kn.hp > mg.hp && kn.def > mg.def && mg.matk > kn.matk);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
