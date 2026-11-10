// ข้อมูลห้อง (GDD §5) — ทุกห้องอัปเกรดได้ 5 ระดับ
// size: [w, h] | capacity: ความจุต่อระดับ | effect: ค่าผลต่อระดับ (index = level-1)
export const ROOMS = {
  core_room: {
    art: ['19_crystal_portal_room', '01_arcane_portal_chamber', '08_cosmic_portal_room', '11_rune_portal_hall'],
    name: 'Dungeon Core Room', th: 'ห้องแกนดันเจี้ยน', size: [3, 3], cost: 0, upkeep: 0, unlock: 1,
    unique: true, buildable: false, color: '#4a2a5a',
    desc: 'หัวใจของดันเจี้ยน หาก Core ถูกทำลายคือพ่ายแพ้',
  },
  guard_room: {
    art: ['06_guard_checkpoint_blue', '07_guard_checkpoint_red', '12_red_guard_station', '20_purple_guard_checkpoint', '21_purple_fortress_checkpoint', '16_blue_fortress_gate', '05_fortress_entrance_hall', '13_dragon_crest_gate', '10_cyan_magic_entrance'],
    name: 'Guard Room', th: 'ห้องป้องกัน', size: [4, 4], cost: 120, upkeep: 4, unlock: 1, color: '#5a3a2a',
    capacity: [4, 5, 6, 7, 8], effect: { defBonus: [0, 0.05, 0.1, 0.15, 0.2] },
    desc: 'ห้องสำหรับวางมอนสเตอร์ป้องกัน ระดับสูงขึ้นรองรับมากขึ้นและเพิ่ม DEF',
  },
  barracks: {
    art: ['03_hero_barracks'],
    name: 'Monster Barracks', th: 'ค่ายพักมอนสเตอร์', size: [3, 3], cost: 150, upkeep: 5, unlock: 1, color: '#3a4a2a',
    capacity: [4, 6, 8, 11, 14], effect: { restMult: [1, 1.2, 1.4, 1.7, 2], loyaltyPerDay: [1, 2, 3, 4, 5] },
    desc: 'ที่พักมอนสเตอร์ เพิ่มจำนวนที่รองรับ ฟื้น Fatigue และ Loyalty',
  },
  training_room: {
    art: ['02_hero_trial_arena', '17_red_sword_trial_room'],
    name: 'Training Room', th: 'ห้องฝึก', size: [3, 3], cost: 200, upkeep: 6, unlock: 1, color: '#5a4a1a',
    capacity: [2, 3, 4, 5, 6], effect: { trainMult: [1, 1.2, 1.45, 1.7, 2] },
    desc: 'ฝึก ATK DEF HP SPD MAG และ Skill Mastery',
  },
  storage_room: {
    art: ['04_hero_armory'],
    name: 'Storage Room', th: 'ห้องเก็บของ', size: [3, 2], cost: 100, upkeep: 2, unlock: 1, color: '#4a3a2a',
    capacity: [20, 30, 45, 60, 80],
    desc: 'เพิ่มช่องเก็บไอเทม ทีมทำความสะอาดนำ Loot มาเก็บที่นี่',
  },
  cleaning_room: {
    name: 'Cleaning Room', th: 'ห้องกำจัดซาก', size: [2, 2], cost: 120, upkeep: 3, unlock: 1, color: '#2a4a4a',
    capacity: [2, 3, 4, 5, 6], effect: { workMult: [1, 1.15, 1.3, 1.5, 1.75], boneMult: [1, 1.2, 1.4, 1.6, 2] },
    desc: 'จุดทิ้งศพและเศษซาก ได้วัตถุดิบกลับมา เพิ่มความเร็วทีมทำความสะอาด',
  },
  treasure_room: {
    art: ['18_gold_treasure_vault'],
    name: 'Treasure Room', th: 'ห้องสมบัติ', size: [3, 3], cost: 300, upkeep: 6, unlock: 1, color: '#6a5a1a',
    capacity: [10, 15, 20, 30, 40], effect: { goldBonus: [0.08, 0.12, 0.17, 0.23, 0.3], rareBonus: [0.05, 0.08, 0.12, 0.16, 0.2] },
    desc: 'เพิ่มทองจากผู้กล้าและโอกาสได้ไอเทมหายาก (ล่อผู้กล้าที่โลภ)',
  },
  hospital: {
    name: 'Monster Hospital', th: 'โรงพยาบาลมอนสเตอร์', size: [3, 2], cost: 250, upkeep: 6, unlock: 1, color: '#5a2a3a',
    capacity: [2, 3, 4, 5, 6], effect: { healMult: [1, 1.25, 1.5, 1.8, 2.2] },
    desc: 'มอนสเตอร์ที่หมดสติฟื้นเร็วขึ้นและรักษาอาการป่วย',
  },
  food_farm: {
    name: 'Fungus Farm', th: 'ฟาร์มอาหาร', size: [3, 2], cost: 220, upkeep: 4, unlock: 1, color: '#3a5a3a',
    effect: { foodPerDay: [6, 10, 15, 21, 28] },
    desc: 'ผลิตอาหารมอนสเตอร์ทุกวัน',
  },
  boss_room: {
    name: 'Boss Room', th: 'ห้องบอส', size: [4, 4], cost: 1500, upkeep: 20, unlock: 2, color: '#5a1a2a', unique: true,
    art: ['09_demonic_boss_arena', '15_demonic_ritual_arena'],
    capacity: [1, 1, 1, 1, 1], effect: { bossBonus: [0, 0.05, 0.1, 0.15, 0.2] },
    desc: 'ที่อยู่ของบอส อัญเชิญบอสได้ที่เมนูมอนสเตอร์ → บอส ระดับห้องเพิ่มพลังบอส',
  },
  fusion_chamber: {
    name: 'Fusion Chamber', th: 'ห้องผสมมอนสเตอร์', size: [3, 3], cost: 900, upkeep: 12, unlock: 2, color: '#3a1a5a', unique: true,
    art: ['11_rune_portal_hall', '08_cosmic_portal_room'],
    capacity: [1, 1, 2, 2, 3], effect: { fusionBonus: [0, 0.05, 0.1, 0.15, 0.2], timeMult: [1, 0.85, 0.7, 0.55, 0.4] },
    desc: 'ผสมมอนสเตอร์ 2 ตัวเป็นสายพันธุ์ใหม่ ระดับห้องเพิ่มโอกาสสำเร็จและลดเวลา',
  },
  trap_workshop: {
    art: ['14_hero_trial_trap_room'],
    name: 'Trap Workshop', th: 'โรงงานกับดัก', size: [3, 3], cost: 400, upkeep: 8, unlock: 2, color: '#4a4a5a',
    unique: true, effect: { maxTraps: [6, 10, 14, 18, 24] },
    desc: 'ปลดล็อกการสร้างกับดัก ระดับห้อง = ระดับกับดักสูงสุดที่อัปเกรดได้',
  },
};

export const STARTING_LAYOUT = {
  rooms: [
    { type: 'guard_room', x: 3, y: 13, rot: 0 },
    { type: 'barracks', x: 3, y: 18, rot: 0 },
    { type: 'core_room', x: 9, y: 14, rot: 0 },
  ],
  corridors: [
    [0, 15], [1, 15], [2, 15],
    [7, 15], [8, 15],
    [4, 17],
  ],
};
