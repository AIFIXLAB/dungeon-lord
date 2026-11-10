// ============================================================
// BALANCE CONFIGURATION — ค่าสมดุลทั้งหมดของเกมอยู่ที่ไฟล์นี้ไฟล์เดียว (GDD §33)
// ค่าจาก Hero/Monster Design Bible ถูกนำมาเป็นค่าเริ่มต้น และปรับบางค่าจากการทดสอบจำลอง (ระบุไว้ในคอมเมนต์)
// ============================================================
export const BALANCE = {
  saveVersion: 3,

  start: { gold: 500, food: 30, reputation: 0, dungeonLevel: 1, coreHp: 600 },

  world: { width: 64, height: 48 },
  startArea: { x: 0, y: 14, w: 22, h: 20 },
  entrance: { x: 0, y: 24 },
  expansion: { step: 6, baseCost: 400, costGrowth: 1.7 },

  time: {
    gameMinutesPerSecond: 10,      // 1 วินาทีจริง = 10 นาทีในเกม (1 วัน ≈ 2.4 นาที ที่ x1)
    dayStartHour: 6, nightStartHour: 20,
    speeds: [0, 1, 2, 4],
  },

  // ---------- Combat (Bible: Damage = ATK × Skill × 100/(100+DEF)) ----------
  combat: {
    turnSeconds: 1.5,              // 1 "เทิร์น" ในเอกสาร = 1.5 วินาที real-time
    baseAttackInterval: 1.5,
    meleeRange: 1.15,
    critMultiplier: 1.5,
    hitMin: 0.05, hitMax: 0.98,
    variance: 0.1,
    elementAdvantage: 1.5,
    elementDisadvantage: 0.6,      // Bible: Resistance x0.5 — ปรับเป็น 0.6 ให้ไม่แข็งเกินไป
    weaknessMult: 1.5,             // จุดอ่อนเฉพาะตัว (เช่น Slime แพ้ Lightning)
    tagWeakness: 1.3,              // จุดอ่อนแบบ tag: aoe / magic / trap / assassin
    backRowDamageTaken: 0.85,
    frontRowAggroBonus: 3,
    lowFatiguePenalty: 0.75, hungryPenalty: 0.85, lowLoyaltyPenalty: 0.85,
    mpRegenPerSec: 2,
    dotTick: 1.5,
  },

  heroes: {
    baseDailyCount: 5,             // GDD: 5 คน/วัน
    perLevelDaily: 2,
    perReputation: 0.01, maxRepBonus: 12, maxDailyCount: 48,
    perDay: 0.12, maxDayBonus: 10,  // ยิ่งอยู่รอดนาน ผู้กล้ายิ่งมาก
    partyCap: 8,
    // ประเภทวัน (สุ่มทุกวัน) — mult = ตัวคูณจำนวนผู้กล้าทั้งวัน, partyBonus = ขนาดปาร์ตี้สูงสุดเพิ่ม
    dayTypes: [
      { id: 'quiet', th: 'วันเงียบ', w: 0.15, mult: [0.5, 0.8], partyBonus: 0, waveChance: 0, msg: 'วันนี้ผู้กล้าน้อยกว่าปกติ' },
      { id: 'normal', th: 'วันปกติ', w: 0.45, mult: [0.9, 1.3], partyBonus: 0, waveChance: 0.15 },
      { id: 'busy', th: 'วันคึกคัก', w: 0.27, minDay: 3, mult: [1.4, 1.9], partyBonus: 1, waveChance: 0.35, bigBias: true, msg: '⚔ ข่าวลือเรื่องสมบัติแพร่ไป — ผู้กล้าแห่มามากกว่าปกติ!' },
      { id: 'siege', th: 'วันบุกหนัก', w: 0.13, minDay: 7, mult: [2.2, 3.0], partyBonus: 2, waveChance: 0.6, bigBias: true, msg: '🔥 กองทัพผู้กล้ารวมพลบุกดันเจี้ยน!' },
    ],
    spawnStartHour: 7, spawnEndHour: 22, nightSpawnChance: 0.25,
    // Hero Bible §2 (F x1.0 … SSS x3.0)
    rankMultiplier: { F: 1.0, E: 1.1, D: 1.2, C: 1.35, B: 1.5, A: 1.75, S: 2.0, SS: 2.5, SSS: 3.0 },
    rankLevel: { F: [1, 3], E: [3, 8], D: [8, 14], C: [14, 20], B: [20, 27], A: [27, 34], S: [34, 41], SS: [41, 46], SSS: [46, 50] },
    levelGrowth: 0.065,
    rankBounty: { F: 40, E: 70, D: 120, C: 200, B: 320, A: 500, S: 800, SS: 1250, SSS: 2000 },
    rankRep: { F: 2, E: 3, D: 4, C: 6, B: 8, A: 11, S: 15, SS: 20, SSS: 28 },
    escapeRepLoss: 4,
    detectRange: 3.6,
    fScale: 0.8,                   // ลดค่าพลัง Rank F ช่วงเริ่มเกม (จากการทดสอบ: ผู้เล่นใหม่แพ้เร็วเกินไป)
  },

  monsters: {
    levelCap: 50,
    expBase: 20, expGrowth: 1.17,
    // Monster Bible §4: T1 x1.0 … T5 x3.0 — ปรับให้ชันน้อยลงเพื่อไม่ให้มอนสเตอร์ทิ้งห่างผู้กล้า
    tiers: [{ from: 1, mult: 1.0, name: 'T1 Normal' }, { from: 11, mult: 1.15, name: 'T2 Elite' }, { from: 21, mult: 1.35, name: 'T3 Rare Elite' }, { from: 31, mult: 1.6, name: 'T4 Master' }, { from: 41, mult: 2.0, name: 'T5 Legendary' }],
    aggroRange: 4.2, leashRange: 7,
    passiveUnlockLevel: 6,
    knockoutRecoveryHours: 3, hospitalRecoveryMult: 2.5,
    fatigueFromCombatPerHit: 0.5, restFatiguePerHour: 6, restHealPerHour: 0.1,
    fatigueHighThreshold: 70,
    hungerPerDay: 35, hungerHighThreshold: 60,
    loyaltyStart: 70,
    injuryChanceHighFatigue: 0.15,
    expShareRadius: 6,
    upkeepPerLevel: 0.04,          // ค่าบำรุงเพิ่มตามเลเวล (แก้ปัญหาทองล้นหลัง Lv4)
  },

  boss: {
    statScale: 0.45,               // ค่าจาก Boss Roster x0.45 (เอกสารระบุว่าเป็นค่าทดสอบ)
    levelGrowth: 0.05,
    phase2: 0.6, phase3: 0.25,
    phase2Atk: 0.25, phase3Atk: 0.5, phase2Spd: 0.15,
    enrageSeconds: 90, enrageAtk: 0.5,
    minionCount: 2, minionDespawnSec: 40,
    knockoutHours: 8,
    soulDropOnDefend: 0.02,
  },

  core: {
    hpPerLevel: 400, defPerLevel: 15, auraDamagePerLevel: 8, auraInterval: 2.0, regenPerHour: 12,
    upgradeCost: [0, 800, 2500, 7000, 20000],
  },

  economy: { buyMult: 2.5, sellMultiplier: 0.5, foodPrice: 4, roomRefund: 0.5, corridorCost: 5, historyDays: 14, roomUpkeepGrowth: 1.35 },

  training: {
    sessionHours: 4, baseCost: 20, costPerLevel: 6,
    fatiguePerSession: 14, expPerSession: 18,
    // Monster Bible §10: Fatigue 21–40 -10%, 41–60 -25%, 61–80 เสี่ยงบาดเจ็บ, 81+ ฝึกไม่ได้
    fatigueBands: [[20, 1], [40, 0.9], [60, 0.75], [80, 0.6], [101, 0]],
    statGain: { hp: 10, atk: 2, matk: 2, def: 1.6, mdef: 1.6, spd: 2, acc: 2, res: 0.02 },
    loyaltyGain: 8,
    skillMasteryMax: 5,
  },

  cleaning: {
    baseSpeed: 1.0, carryCapacity: 3,
    workTime: { corpse: 2.2, blood: 1.0, loot: 0.6, debris: 1.4 },
    priority: { loot: 3, corpse: 2, debris: 1.5, blood: 1 },
    dirtyThreshold: 3, dirtyRepLossPerDay: 1, dirtyLoyaltyLossPerHour: 0.4,
    diseaseChancePerDay: 0.25, corpseBoneChance: 0.6,
  },

  traps: { rogueDisarmChance: 0.3, durabilityPerTrigger: 1, upgradeCostMult: 0.8, levelScale: 0.35, damageScale: 1.0 },
  rooms: { upgradeCostGrowth: 1.7, maxLevel: 5 },
  evolution: { stageLevels: [21, 31, 41] },

  fusion: {
    hours: 6, cost: { common: 150, uncommon: 400, rare: 1200, epic: 4000, legendary: 15000, mythic: 50000 },
    mutationChance: 0.12, fusionCrystalBonus: 0.1,
    // Monster Bible §12.4
    rarityTable: {
      common: { common: 70, uncommon: 25, rare: 5 },
      uncommon: { uncommon: 50, rare: 35, epic: 15 },
      rare: { rare: 45, epic: 40, legendary: 15 },
      epic: { epic: 50, legendary: 35, mythic: 15 },
      legendary: { legendary: 70, mythic: 30 },
      mythic: { mythic: 100 },
    },
    levelKeep: 0.5,
  },

  inventory: { stackLimit: 99 },
  // Hero Loot spec: Normal 2 rolls, Elite 4, Boss 6 (+ ชิ้นส่วนผู้กล้าการันตี)
  drops: {
    rarityWeights: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 0.9, mythic: 0.1 },
    tiers: { F: 'normal', E: 'normal', D: 'normal', C: 'normal', B: 'elite', A: 'elite', S: 'elite', SS: 'boss', SSS: 'boss' },
    rolls: { normal: 2, elite: 4, boss: 6 }, rarityBonus: { normal: 0, elite: 5, boss: 15 },
    remainsQty: [1, 2],
  },
  loot: {
    equipmentDropChance: 0.3, materialDropChance: 0.7, potionDropChance: 0.12,
    crystalDropChance: { F: 0.01, E: 0.025, D: 0.04, C: 0.06, B: 0.08, A: 0.1, S: 0.12, SS: 0.15, SSS: 0.18 },
    coreDropChance: { F: 0, E: 0.005, D: 0.01, C: 0.02, B: 0.04, A: 0.06, S: 0.08, SS: 0.1, SSS: 0.12 },
    pouchGold: [6, 18],
    rarityWeights: { common: 70, uncommon: 22, rare: 6, epic: 1.6, legendary: 0.35, mythic: 0.05 },
    rarityStatMult: { common: 1, uncommon: 1.25, rare: 1.6, epic: 2.1, legendary: 2.8, mythic: 3.8 },
    rarityPriceMult: { common: 1, uncommon: 1.8, rare: 3.5, epic: 7, legendary: 15, mythic: 40 },
    itemUpgradeMax: 5, itemUpgradeCostMult: 0.6,
  },

  reputation: { defenseBonus: 1, maxRep: 9999 },
  events: { dailyChance: 0.35 },
};
