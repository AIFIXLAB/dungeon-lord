// Random Events (GDD §24) — choices[].effect ถูกตีความโดย EventManager
export const EVENTS = {
  treasure_discovery: {
    name: 'Treasure Discovery', th: 'พบสมบัติ', minLevel: 1, weight: 3,
    text: 'คนงานขุดพบหีบสมบัติเก่าในผนังถ้ำ!',
    choices: [
      { label: 'เปิดหีบ (+ทอง)', effect: { gold: [80, 220] } },
      { label: 'ขายแผนที่ให้พ่อค้า (+ทองน้อย, +ชื่อเสียง)', effect: { gold: [40, 80], reputation: 3 } },
    ],
  },
  merchant_visit: {
    name: 'Merchant Visit', th: 'พ่อค้าเร่มาเยือน', minLevel: 1, weight: 3,
    text: 'พ่อค้าเร่แวะมาพร้อมของลดราคา (ราคาร้านค้า -25% วันนี้)',
    choices: [
      { label: 'ต้อนรับ', effect: { shopDiscountDays: 1, reputation: 1 } },
      { label: 'ปล้นพ่อค้า (+ทอง, -ชื่อเสียง)', effect: { gold: [100, 180], reputation: -6 } },
    ],
  },
  monster_disease: {
    name: 'Monster Disease', th: 'โรคระบาด', minLevel: 1, weight: 2,
    text: 'มอนสเตอร์บางตัวเริ่มป่วย!',
    choices: [
      { label: 'จ่ายค่ายา 60 Gold', effect: { gold: -60 } },
      { label: 'ปล่อยไว้ (มอนสเตอร์ 1–2 ตัวป่วย)', effect: { sickMonsters: 2 } },
    ],
  },
  monster_migration: {
    name: 'Monster Migration', th: 'มอนสเตอร์อพยพ', minLevel: 1, weight: 2,
    text: 'มอนสเตอร์เร่ร่อนตัวหนึ่งขอเข้าร่วมดันเจี้ยนของคุณ',
    choices: [
      { label: 'รับเข้าทีม (ฟรี)', effect: { freeMonster: true } },
      { label: 'ปฏิเสธ', effect: {} },
    ],
  },
  hero_raid: {
    name: 'Hero Raid', th: 'ผู้กล้าบุกโจมตี', minLevel: 2, weight: 2,
    text: 'กิลด์ผู้กล้าส่งปาร์ตี้ใหญ่มาบุกดันเจี้ยน!',
    choices: [
      { label: 'รับมือ (ปาร์ตี้ใหญ่ทันที, รางวัล x1.5)', effect: { raid: true } },
      { label: 'ติดสินบนกิลด์ 150 Gold', effect: { gold: -150 } },
    ],
  },
  dungeon_earthquake: {
    name: 'Dungeon Earthquake', th: 'แผ่นดินไหว', minLevel: 2, weight: 1,
    text: 'แผ่นดินไหว! กับดักเสียหายและเกิดเศษหินในห้อง',
    choices: [
      { label: 'รับมือ', effect: { trapDamage: 0.3, debris: 4 } },
    ],
  },
  monster_rebellion: {
    name: 'Monster Rebellion', th: 'มอนสเตอร์ไม่พอใจ', minLevel: 1, weight: 0, // เกิดเมื่อ Loyalty ต่ำ (ดู EventManager)
    text: 'มอนสเตอร์ที่ Loyalty ต่ำเริ่มก่อความวุ่นวาย!',
    choices: [
      { label: 'จัดเลี้ยง (−ทอง, +Loyalty ทุกตัว)', effect: { goldPerMonster: -10, loyaltyAll: 15 } },
      { label: 'ลงโทษ (−Loyalty, −ชื่อเสียง)', effect: { loyaltyAll: -5, reputation: -4 } },
    ],
  },
};
