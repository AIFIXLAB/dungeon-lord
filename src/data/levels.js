// Dungeon Level 1–10 (GDD §21–22)
// req: เงื่อนไขเลื่อนไปเลเวลถัดไป | ranks: Rank ผู้กล้าที่ปรากฏ (ตัวท้ายคือ rank หลัก)
// maxArea: ขนาดพื้นที่สูงสุดที่ขยายได้ | party: ขนาดปาร์ตี้สูงสุด
export const LEVELS = [
  { level: 1, name: 'Abandoned Cave', th: 'ถ้ำร้าง', ranks: ['F'], party: 2, maxArea: { w: 16, h: 14 },
    unlocks: ['มอนสเตอร์พื้นฐาน', 'ห้องพื้นฐาน', 'การฝึกพื้นฐาน', 'ผู้กล้า Rank F'],
    req: { kills: 100, rooms: 5, monsters: 10, totalIncome: 10000, defenses: 10 } },
  { level: 2, name: 'Goblin Hideout', th: 'รังก็อบลิน', ranks: ['F', 'E'], party: 3, maxArea: { w: 22, h: 18 },
    unlocks: ['วิวัฒนาการ Goblin/Slime/Bat/Kobold', 'Trap Workshop + กับดัก', 'มอนสเตอร์ใหม่ 4 ชนิด', 'ผู้กล้า Rank E'],
    req: { kills: 250, rooms: 8, monsters: 14, totalIncome: 35000, defenses: 30 } },
  { level: 3, name: 'Skeleton Crypt', th: 'สุสานโครงกระดูก', ranks: ['E', 'D'], party: 4, maxArea: { w: 26, h: 20 },
    unlocks: ['Undead / Golem / Dark Mage', 'วิวัฒนาการ Skeleton', 'ผู้กล้า Rank D'],
    req: { kills: 500, rooms: 11, monsters: 18, totalIncome: 90000, defenses: 60 } },
  { level: 4, name: 'Crystal Dungeon', th: 'ดันเจี้ยนคริสตัล', ranks: ['D', 'C'], party: 4, maxArea: { w: 30, h: 22 },
    unlocks: ['Crystal Golem', 'ผู้กล้า Rank C (Berserker, Paladin)'],
    req: { kills: 900, rooms: 14, monsters: 22, totalIncome: 220000, defenses: 100 } },
  { level: 5, name: 'Lava Dungeon', th: 'ดันเจี้ยนลาวา', ranks: ['C', 'B'], party: 5, maxArea: { w: 34, h: 24 },
    unlocks: ['Fire Drake', 'ผู้กล้า Rank B (Necromancer)'],
    req: { kills: 1500, rooms: 17, monsters: 26, totalIncome: 500000, defenses: 160 } },
  { level: 6, name: 'Frozen Dungeon', th: 'ดันเจี้ยนน้ำแข็ง', ranks: ['B', 'A'], party: 5, maxArea: { w: 36, h: 26 },
    unlocks: ['Frost Wolf', 'วิวัฒนาการขั้นสุดท้ายบางสาย', 'ผู้กล้า Rank A'],
    req: { kills: 2300, rooms: 20, monsters: 30, totalIncome: 1100000, defenses: 240 } },
  { level: 7, name: 'Ancient Ruins', th: 'ซากปรักหักพังโบราณ', ranks: ['A', 'S'], party: 6, maxArea: { w: 38, h: 28 },
    unlocks: ['Gargoyle', 'ผู้กล้า Rank S (Dragon Slayer)'],
    req: { kills: 3300, rooms: 23, monsters: 34, totalIncome: 2400000, defenses: 340 } },
  { level: 8, name: 'Dragon Nest', th: 'รังมังกร', ranks: ['S', 'SS'], party: 6, maxArea: { w: 40, h: 30 },
    unlocks: ['Wyvern', 'ผู้กล้า Rank SS'],
    req: { kills: 4600, rooms: 26, monsters: 38, totalIncome: 5000000, defenses: 460 } },
  { level: 9, name: 'Abyssal Dungeon', th: 'ดันเจี้ยนห้วงลึก', ranks: ['SS', 'SSS'], party: 6, maxArea: { w: 40, h: 30 },
    unlocks: ['Abyss Demon (Legendary)', 'ผู้กล้า Rank SSS'],
    req: { kills: 6200, rooms: 28, monsters: 42, totalIncome: 10000000, defenses: 600 } },
  { level: 10, name: 'Demon Lord Empire', th: 'จักรวรรดิจอมมาร', ranks: ['SS', 'SSS'], party: 6, maxArea: { w: 40, h: 30 },
    unlocks: ['Chaos Dragon (Mythic)', 'Endgame: ผู้กล้าไม่สิ้นสุด'],
    req: null },
];

export const REQ_LABELS = {
  kills: 'กำจัดผู้กล้า', rooms: 'จำนวนห้อง', monsters: 'จำนวนมอนสเตอร์',
  totalIncome: 'รายได้รวม (Gold)', defenses: 'ป้องกัน Core สำเร็จ',
};
