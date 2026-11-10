// GameManager — สร้างสถานะเกม เชื่อม Manager ทุกตัว และวนลูปการจำลอง (GDD §2 Core Loop, §31)
import { BALANCE } from '../config/balance.js';
import { STARTING_LAYOUT } from '../data/rooms.js';
import { RNG, EventBus } from '../core/util.js';
import { DungeonManager } from './DungeonManager.js';
import { CombatManager } from './CombatManager.js';
import { MonsterManager } from './MonsterManager.js';
import { HeroManager } from './HeroManager.js';
import { CleaningManager } from './CleaningManager.js';
import { TrainingManager } from './TrainingManager.js';
import { InventoryManager } from './InventoryManager.js';
import { EconomyManager } from './EconomyManager.js';
import { ProgressionManager, ReputationManager } from './ProgressionManager.js';
import { EventManager } from './EventManager.js';
import { TimeManager } from './TimeManager.js';
import { SaveManager } from './SaveManager.js';
import { AudioManager } from './AudioManager.js';
import { FusionManager } from './FusionManager.js';
import { TrapManager } from './TrapManager.js';

export function createInitialState(seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0) {
  const S = BALANCE.start;
  return {
    seed, rngState: seed, nextId: 1,
    gold: S.gold, food: S.food, reputation: S.reputation, dungeonLevel: S.dungeonLevel,
    time: 6 * 60, // วันที่ 1 เวลา 06:00
    core: { hp: S.coreHp, maxHp: S.coreHp },
    dungeon: {
      area: { ...BALANCE.startArea }, entrance: { ...BALANCE.entrance }, expansions: 0,
      rooms: [], corridors: [], traps: [],
    },
    monsters: [], heroes: [], parties: [], heroSchedule: [], summons: [], fusions: [], codex: {}, heroCodex: {},
    floor: [], inventory: [], equipped: {},
    economy: { today: { income: {}, expense: {} }, history: [] },
    stats: { kills: 0, escapes: 0, defenses: 0, totalIncome: 0, roomsBuilt: 0, monsterKOs: 0, cleaned: 0, trainings: 0 },
    settings: { speed: 1, sound: true, volume: 0.6, autoBuyFood: true, pauseOnModal: true, cloudAutoSave: true, autoSave: true },
    log: [], pendingEvent: null, shopDiscountDays: 0, defeated: false, saveCode: null, tutorialSeen: false,
    repLog: {},
  };
}

export class Game {
  constructor(state = null, opts = {}) {
    this.headless = !!opts.headless;
    this.bus = new EventBus();
    const fresh = !state;
    this.state = state || createInitialState(opts.seed);
    this.rng = new RNG(this.state.rngState);
    // ลำดับสำคัญ: dungeon ต้องมาก่อนเพราะคนอื่นอ้างอิงแผนที่
    if (fresh) this.buildStartingLayout();
    this.dungeon = new DungeonManager(this);
    this.combat = new CombatManager(this);
    this.monsters = new MonsterManager(this);
    this.heroes = new HeroManager(this);
    this.cleaning = new CleaningManager(this);
    this.training = new TrainingManager(this);
    this.inventory = new InventoryManager(this);
    this.economy = new EconomyManager(this);
    this.progression = new ProgressionManager(this);
    this.reputation = new ReputationManager(this);
    this.events = new EventManager(this);
    this.time = new TimeManager(this);
    this.save = new SaveManager(this, opts.store, opts.fetch);
    this.audio = this.headless ? null : new AudioManager(this);
    this.fusion = new FusionManager(this);
    this.traps = new TrapManager(this);
    this.accum = 0;

    if (fresh) this.startNewGame();
    else this.afterLoad();

    this.bus.on('hour', () => this.onHour());
    this.bus.on('day', () => this.onDay());
  }

  buildStartingLayout() {
    const d = this.state.dungeon;
    for (const [x, y] of STARTING_LAYOUT.corridors) d.corridors.push(`${x},${y}`);
    // ห้องเริ่มต้น 3 ห้อง
    let n = 1;
    for (const r of STARTING_LAYOUT.rooms) {
      d.rooms.push({ id: `r0${n++}`, type: r.type, x: r.x, y: r.y, w: 0, h: 0, rot: r.rot, level: 1, status: 'active' });
    }
  }

  startNewGame() {
    // กำหนดขนาดห้องจากข้อมูล
    for (const r of this.state.dungeon.rooms) { const [w, h] = this.dungeon.roomDims(r.type, r.rot); r.w = w; r.h = h; }
    this.dungeon.rebuild();
    this.state.core.maxHp = this.dungeon.coreMaxHp(); this.state.core.hp = this.state.core.maxHp;
    // มอนสเตอร์เริ่มต้น 3 ตัว (GDD §3)
    for (const sp of ['slime', 'goblin', 'skeleton']) { this.state.monsters.push(this.monsters.create(sp)); this.monsters.discover(sp, 'owned'); }
    this.inventory.add('red_potion', 3); this.inventory.add('bread', 2); this.inventory.add('hero_meat', 2);
    this.heroes.scheduleDay(0);
    this.state.heroSchedule = this.state.heroSchedule.filter((s) => s.time > this.state.time + 30);
    this.notify('คุณได้รับมรดกดันเจี้ยนเก่าจาก Demon Lord รุ่นก่อน... จงฟื้นฟูมันให้กลายเป็นอาณาจักรมอนสเตอร์!', 'story');
  }

  afterLoad() {
    for (const r of this.state.dungeon.rooms) { if (!r.w || !r.h) { const [w, h] = this.dungeon.roomDims(r.type, r.rot); r.w = w; r.h = h; } }
    this.dungeon.rebuild();
    for (const f of this.state.floor) f.claimedBy = null;
    for (const m of this.state.monsters) { m.job = null; m.path = null; if (m.carrying?.length) this.cleaning.dropCarried(m); }
    for (const h of this.state.heroes) h.path = null;
    this.state.summons ||= []; this.state.fusions ||= []; this.state.codex ||= {}; this.state.heroCodex ||= {};
    for (const m of this.state.monsters) { m.mutations ||= []; m.trained.matk ??= 0; m.trained.mdef ??= 0; m.trained.acc ??= 0; m.trained.res ??= 0; if (m.hp <= 1 && !m.ko) m.hp = this.monsters.stats(m).hp; }
    this.state.core.maxHp = this.dungeon.coreMaxHp();
  }

  notify(text, kind = 'info') {
    const entry = { text, kind, t: this.state.time, id: Math.random() };
    this.state.log.push(entry);
    if (this.state.log.length > 80) this.state.log.shift();
    this.bus.emit('notify', entry);
  }

  onHour() {
    this.cleaning.hourly();
    const s = this.state;
    if (!s.heroes.length && s.core.hp < s.core.maxHp) s.core.hp = Math.min(s.core.maxHp, s.core.hp + BALANCE.core.regenPerHour * this.dungeon.coreRoom().level);
  }

  onDay() {
    this.economy.endOfDay();
    this.cleaning.daily();
    this.heroes.scheduleDay(Math.floor(this.state.time / 1440) * 1440);
    this.events.daily();
    this.state.core.warned = 0;
    this.bus.emit('new_day', this.time.day);
  }

  // ---------- Main loop ----------
  update(realDt) {
    if (this.state.defeated) return;
    realDt = Math.min(realDt, 0.25);
    const speed = this.time.speed;
    if (speed <= 0) { this.combat.tickFx(realDt * 0.3); return; }
    this.accum += realDt * speed;
    const STEP = 0.05;
    let steps = 0;
    while (this.accum >= STEP && steps < 40) {
      this.step(STEP);
      this.accum -= STEP; steps++;
      if (this.state.defeated) break;
    }
    if (steps >= 40) this.accum = 0;
  }

  // หนึ่ง tick ของการจำลอง (dt = วินาทีเกม)
  step(dt) {
    const s = this.state;
    const before = s.time;
    s.time += dt * BALANCE.time.gameMinutesPerSecond;
    const hB = Math.floor(before / 60), hA = Math.floor(s.time / 60);
    for (let h = hB + 1; h <= hA; h++) {
      this.bus.emit('hour', h % 24);
      if (h % 24 === 0) this.bus.emit('day', h / 24 + 1);
    }
    if (s.core.hitFlash > 0) s.core.hitFlash -= dt;
    this.heroes.update(dt);
    this.traps.update(dt);
    this.monsters.update(dt);
    this.fusion.update();
    this.inventory.update();
    this.combat.tickFx(dt);
    this.state.rngState = this.rng.s;
  }

  // ---------- Defeat ----------
  defeat(hero) {
    const s = this.state;
    if (s.defeated) return;
    s.defeated = true;
    this.notify(`Dungeon Core ถูกทำลายโดย ${hero?.name || 'ผู้กล้า'}! — DEFEAT`, 'bad');
    this.bus.emit('defeat', { by: hero?.name });
  }

  // ฟื้นฟูหลังพ่ายแพ้ (เล่นต่อได้ แต่เสียทอง/ชื่อเสียง)
  recoverFromDefeat() {
    const s = this.state;
    s.gold = Math.floor(s.gold * 0.6);
    s.reputation = Math.floor(s.reputation * 0.7);
    s.heroes = []; s.parties = []; s.summons = [];
    s.core.hp = Math.round(s.core.maxHp * 0.5);
    for (const m of s.monsters) if (!m.ko) m.hp = Math.max(m.hp, 1);
    s.defeated = false;
    this.notify('ดันเจี้ยนฟื้นคืนจากความพ่ายแพ้... เสียทอง 40% และชื่อเสียง 30%', 'warn');
  }
}
