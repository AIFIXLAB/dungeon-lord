// DUNGEON TRAP DATABASE — 50 TRAPS (ตามเอกสาร) + ภาพจาก Dungeon_Trap_Assets_50_Transparent
// [ชื่อ, ชื่อไทย, rarity, ราคา, damage, damageType, pattern, triggerRange, cooldown, options]
// damageType: physical | magic | fire | ice | poison | lightning | shadow | holy | true
// pattern: hit (เป้าเดียว) | proj (ยิง) | line (แนวตรง) | aoe (รอบตัว) | field (DOT ต่อวินาที) | chain | room (ทั้งห้อง)
// options: dps (ดาเมจต่อวินาที), dur (วินาทีของ field), shots, pierce, chain, radius, status:[[id, sec, chance, pct]],
//          knock, pull, teleport, execute, place (floor|wall), bonus, special
const T = (name, th, rarity, price, dmg, type, pattern, range, cd, o = {}) => ({ name, th, rarity, price, dmg, type, pattern, range, cd, place: 'floor', ...o });

const LIST = [
  T('Spike Floor', 'กับดักพื้นหนาม', 'common', 100, 40, 'physical', 'hit', 1, 5, { status: [['bleed', 3, 0.2]], lv5: 'หนามพิษ: เพิ่ม Poison' }),
  T('Wall Arrow', 'กับดักยิงธนูจากผนัง', 'common', 150, 30, 'physical', 'proj', 4, 4, { shots: 3, place: 'wall', tags: ['arrow'] }),
  T('Swinging Mace', 'กับดักลูกตุ้มหนาม', 'common', 200, 55, 'physical', 'aoe', 3, 7, { radius: 1.4, knock: 1 }),
  T('Fire Vent', 'ช่องพ่นไฟ', 'common', 250, 25, 'fire', 'field', 4, 6, { dps: true, dur: 3, radius: 1.3, status: [['burn', 4, 1]], lv5: 'ไฟลุกต่อเนื่อง (field นานขึ้น)' }),
  T('Wall Spikes', 'กับดักหนามผนัง', 'common', 250, 45, 'physical', 'line', 3, 6, { pierce: 2, place: 'wall' }),
  T('Poison Arrow', 'กับดักลูกดอกพิษ', 'common', 250, 20, 'physical', 'proj', 4, 5, { status: [['poison', 5, 1], ['antiheal', 5, 1, 0.2]], tags: ['arrow'] }),
  T('Pit Trap', 'หลุมพราง', 'common', 300, 60, 'physical', 'hit', 1, 8, { status: [['root', 2, 1]], tags: ['pit'] }),
  T('Crushing Boulder', 'กับดักหินถล่ม', 'common', 300, 80, 'physical', 'line', 5, 10, { pierce: 4, knock: 1 }),
  T('Flame Thrower', 'เครื่องพ่นไฟ', 'common', 350, 35, 'fire', 'field', 4, 8, { dps: true, dur: 3, radius: 1.8, status: [['burn', 4, 1]], place: 'wall' }),
  T('Ice Crystal', 'คริสตัลน้ำแข็ง', 'common', 400, 35, 'ice', 'aoe', 3, 8, { radius: 3, status: [['slow', 4, 1, 0.4]], tags: ['frost'], lv5: 'มีโอกาสแช่แข็ง' }),
  T('Lightning Totem', 'เสาสายฟ้า', 'rare', 500, 60, 'lightning', 'chain', 5, 7, { chain: 3, status: [['stun', 1, 0.2]], tags: ['lightning'], lv5: 'กระโดดเพิ่ม 2 เป้าหมาย' }),
  T('Rune Circle', 'วงเวทรูน', 'rare', 600, 70, 'magic', 'aoe', 2, 8, { radius: 2, bonus: 'lowMana' }),
  T('Curse Totem', 'เสาต้องสาป', 'rare', 700, 20, 'shadow', 'field', 4, 3, { dps: true, dur: 3, radius: 4, status: [['curse', 6, 1], ['armor_break', 6, 1, 0.15]], tags: ['curse'] }),
  T('Magic Rune Plate', 'แผ่นรูนเวทมนตร์', 'rare', 750, 80, 'magic', 'aoe', 1, 8, { radius: 1.6, knock: 2 }),
  T('Laser Beam', 'กับดักเลเซอร์', 'rare', 800, 45, 'true', 'field', 5, 8, { dps: true, dur: 2, radius: 1, line: true, place: 'wall' }),
  T('Rolling Spikes', 'ลูกกลิ้งหนาม', 'rare', 850, 60, 'physical', 'line', 5, 9, { pierce: 4, status: [['bleed', 3, 1]] }),
  T('Saw Trap', 'กับดักเลื่อยหมุน', 'rare', 900, 35, 'physical', 'field', 2, 7, { dps: true, dur: 3, radius: 1.6, bonus: 'vsBleed' }),
  T('Guillotine', 'กับดักกิโยติน', 'rare', 1000, 150, 'physical', 'hit', 2, 12, { execute: 0.2 }),
  T('Battle Axe Trap', 'กับดักขวานเหวี่ยง', 'rare', 1000, 75, 'physical', 'aoe', 3, 7, { radius: 2, status: [['stun', 1, 0.25]] }),
  T('Spiked Roller', 'ลูกกลิ้งหนามเหล็ก', 'rare', 1100, 90, 'physical', 'line', 5, 10, { pierce: 4, knock: 2 }),
  T('Wall Spike Crusher', 'กำแพงหนามบดขยี้', 'epic', 1500, 120, 'physical', 'line', 4, 12, { pierce: 4, bonus: 'trapped', place: 'wall' }),
  T('Poison Fountain', 'น้ำพุพิษ', 'epic', 1600, 30, 'poison', 'field', 4, 5, { dps: true, dur: 5, radius: 3, status: [['poison', 5, 1], ['antiheal', 5, 1, 0.4]], tags: ['poison'] }),
  T('Ice Spikes', 'หนามน้ำแข็ง', 'epic', 1700, 100, 'ice', 'aoe', 3, 10, { radius: 2.2, status: [['freeze', 2, 0.3]], tags: ['frost'] }),
  T('Lava Pit', 'หลุมลาวา', 'epic', 1800, 50, 'fire', 'field', 1, 5, { dps: true, dur: 5, radius: 1, status: [['burn', 5, 1]] }),
  T('Sand Sinkhole', 'หลุมทรายดูด', 'epic', 1900, 30, 'physical', 'aoe', 3, 12, { radius: 3, pull: true, status: [['slow', 5, 1, 0.7]] }),
  T('Jaw Trap', 'กับดักขากรรไกรเหล็ก', 'epic', 2000, 140, 'physical', 'hit', 1, 10, { status: [['root', 3, 1], ['bleed', 4, 1]] }),
  T('Net Trap', 'กับดักตาข่าย', 'epic', 2100, 20, 'physical', 'aoe', 3, 12, { radius: 2, status: [['root', 4, 1]] }),
  T('Spider Web', 'ใยแมงมุมเวทมนตร์', 'epic', 2200, 15, 'poison', 'field', 4, 5, { dps: true, dur: 5, radius: 2.5, status: [['slow', 5, 1, 0.6]], tags: ['frost'] }),
  T('Crystal Spikes', 'หนามคริสตัล', 'epic', 2400, 130, 'magic', 'aoe', 3, 10, { radius: 1.8, shards: [2, 40] }),
  T('Portal Trap', 'กับดักประตูมิติ', 'epic', 2500, 50, 'magic', 'hit', 2, 15, { teleport: true }),
  T('Shadow Tentacles', 'หนวดเงา', 'legendary', 5000, 80, 'shadow', 'aoe', 4, 10, { radius: 2.5, status: [['root', 3, 1], ['armor_break', 3, 1, 0.2]], tags: ['cage'] }),
  T('Gravity Vortex', 'หลุมแรงโน้มถ่วง', 'legendary', 5500, 60, 'magic', 'field', 5, 15, { dps: true, dur: 4, radius: 3.5, pull: true, status: [['slow', 4, 1, 0.7]], tags: ['gravity'] }),
  T('Frost Field', 'สนามน้ำแข็ง', 'legendary', 6000, 50, 'ice', 'field', 5, 12, { dps: true, dur: 4, radius: 3.5, status: [['slow', 3, 1, 0.6], ['freeze', 2, 0.2]], tags: ['frost'] }),
  T('Arcane Crystal', 'คริสตัลอาคม', 'legendary', 6500, 150, 'magic', 'chain', 5, 10, { chain: 4, bonus: 'lowMana' }),
  T('Lightning Field', 'สนามสายฟ้า', 'legendary', 7000, 70, 'lightning', 'field', 4, 12, { dps: true, dur: 4, radius: 3, status: [['stun', 1, 0.25]], tags: ['lightning'] }),
  T('Wind Tornado', 'พายุทอร์นาโด', 'legendary', 7500, 80, 'magic', 'aoe', 5, 15, { radius: 3, pull: true, knock: 3 }),
  T('Fire Rock Spikes', 'หนามหินเพลิง', 'legendary', 8000, 180, 'fire', 'aoe', 3, 12, { radius: 2.2, status: [['burn', 5, 1]] }),
  T('Holy Rune', 'รูนศักดิ์สิทธิ์', 'legendary', 8500, 150, 'holy', 'aoe', 4, 12, { radius: 3, bonus: 'vsDark' }),
  T('Doom Rune', 'รูนมรณะ', 'legendary', 9000, 100, 'shadow', 'aoe', 4, 15, { radius: 3, doom: [5, 200] }),
  T('Mimic Chest', 'หีบสมบัติลวง', 'legendary', 9500, 120, 'physical', 'hit', 2, 10, { status: [['stun', 2, 0.3]], lure: true }),
  T('Dragon Breath', 'กับดักลมหายใจมังกร', 'legendary', 10000, 100, 'fire', 'field', 6, 15, { dps: true, dur: 4, radius: 3, status: [['burn', 5, 1]], place: 'wall', tags: ['dragon'] }),
  T('Cannon Trap', 'ปืนใหญ่ดันเจี้ยน', 'legendary', 10500, 250, 'physical', 'proj', 8, 12, { splash: 3 }),
  T('Crossbow Trap', 'หน้าไม้กลไก', 'legendary', 11000, 100, 'physical', 'proj', 8, 10, { shots: 3, pierce: 2, tags: ['arrow'] }),
  T('Soul Siphon', 'เครื่องดูดวิญญาณ', 'legendary', 11500, 80, 'shadow', 'field', 5, 5, { dps: true, dur: 3, radius: 3, drain: 0.2 }),
  T('Curse Pillar', 'เสาต้องสาประดับสูง', 'legendary', 12000, 60, 'shadow', 'field', 6, 4, { dps: true, dur: 3, radius: 4, status: [['curse', 4, 1], ['armor_break', 4, 1, 0.25]], tags: ['curse'] }),
  T('Doom Bell', 'ระฆังมรณะ', 'legendary', 12500, 180, 'magic', 'room', 6, 25, { status: [['fear', 3, 1]] }),
  T('Soul Cage', 'คุกวิญญาณ', 'legendary', 13000, 50, 'shadow', 'hit', 3, 20, { dot: 5, status: [['root', 5, 1], ['def_down', 5, 1, 0.3]], tags: ['cage'] }),
  T('Magic Prison', 'คุกเวทมนตร์', 'legendary', 13500, 70, 'magic', 'hit', 3, 20, { dot: 4, status: [['root', 4, 1], ['silence', 4, 1]], tags: ['cage'] }),
  T('Demon Hand', 'มือปีศาจ', 'legendary', 14000, 200, 'shadow', 'hit', 5, 15, { pull: true, status: [['stun', 2, 1]], tags: ['hand'] }),
  T('Void Gate', 'ประตูห้วงมิติ', 'legendary', 15000, 250, 'magic', 'hit', 3, 25, { teleport: true, splash: 2 }),
];

export const TRAP_RARITY_UNLOCK = { common: 2, rare: 3, epic: 5, legendary: 7 };
export const TRAP_DURABILITY = { common: 40, rare: 50, epic: 60, legendary: 80 };
// Trap Level System: Lv1 1.0x · Lv2 1.2x · Lv3 1.4x (CD -5%) · Lv4 1.6x (Range +10%) · Lv5 2.0x (Skill พิเศษ)
export const TRAP_LEVELS = [{ dmg: 1 }, { dmg: 1.2 }, { dmg: 1.4, cd: 0.95 }, { dmg: 1.6, cd: 0.95, range: 1.1 }, { dmg: 2.0, cd: 0.95, range: 1.1, special: true }];
export const TYPE_ELEMENT = { physical: 'physical', magic: 'arcane', fire: 'fire', ice: 'ice', poison: 'poison', lightning: 'lightning', shadow: 'dark', holy: 'light', true: 'physical' };
export const TYPE_COLOR = { physical: '#d8d8d8', magic: '#c88aff', fire: '#ff7a2a', ice: '#9ae8ff', poison: '#8aff4a', lightning: '#ffe14a', shadow: '#a36bff', holy: '#fff2a0', true: '#ff4a6a' };

export const TRAPS = {};
LIST.forEach((t, i) => {
  const id = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  TRAPS[id] = { id, index: i + 1, code: `TRAP-${String(i + 1).padStart(2, '0')}`, icon: `trap_${String(i + 1).padStart(2, '0')}`, unlock: TRAP_RARITY_UNLOCK[t.rarity], durability: TRAP_DURABILITY[t.rarity], upkeep: Math.max(1, Math.round(t.price / 120)), ...t };
});

// แปลงกับดักจากเซฟเก่า
export const LEGACY_TRAPS = { spike: 'spike_floor', arrow: 'wall_arrow', poison: 'poison_arrow', fire: 'fire_vent', ice: 'ice_crystal', explosive: 'crushing_boulder' };

// Trap Synergy (คอมโบ) — แสดงในเกมและใช้คำนวณจริงใน TrapManager
export const COMBOS = [
  { name: 'Frost + Arrow', th: 'น้ำแข็ง + ธนู', desc: 'เป้าหมายติด Slow รับดาเมจจากกับดักธนูเพิ่ม 20%' },
  { name: 'Pit + Fire', th: 'หลุมพราง + ไฟ', desc: 'เป้าหมายที่ติด Root (ตกหลุม) รับดาเมจไฟเพิ่ม 25%' },
  { name: 'Gravity + Lightning', th: 'แรงโน้มถ่วง + สายฟ้า', desc: 'Gravity ดึงศัตรูรวมกลุ่ม สายฟ้าโดนหลายตัวและแรงขึ้น 20% กับเป้าที่ติด Slow' },
  { name: 'Cage + Demon Hand', th: 'กรง + มือปีศาจ', desc: 'เป้าหมายที่ถูกขัง (Root) รับดาเมจจาก Demon Hand เพิ่ม 30%' },
  { name: 'Curse + Spike', th: 'คำสาป + หนาม', desc: 'เป้าหมายที่ติด Curse/Armor Break รับดาเมจกายภาพเพิ่ม 30%' },
  { name: 'Poison + Soul Siphon', th: 'พิษ + ดูดวิญญาณ', desc: 'Soul Siphon ดูด HP จากเป้าหมายที่ติดพิษเพิ่ม 50%' },
  { name: 'Dragon Breath + Frost', th: 'ลมหายใจมังกร + น้ำแข็ง', desc: 'ไฟสร้างดาเมจเต็มที่กับเป้าที่ถูกทำให้ช้า (+20%)' },
];
export const MONSTER_SYNERGY = {
  fire: 'กับดักไฟ +15%', ice: 'Slow/Freeze นานขึ้น 20%', poison: 'Poison DOT +20%', dark: 'กับดัก Shadow +15%', demon: 'กับดัก Legendary +10%', lightning: 'Chain +1 เป้าหมาย',
};
