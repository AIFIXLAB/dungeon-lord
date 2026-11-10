// ระบบธาตุ 12 ธาตุ (Monster Bible §7) — ปรับได้ที่ ADVANTAGE / DISADVANTAGE
export const ELEMENTS = ['fire', 'water', 'ice', 'wind', 'earth', 'lightning', 'light', 'dark', 'poison', 'nature', 'arcane', 'physical'];

export const ELEMENT_INFO = {
  fire: { name: 'ไฟ', color: '#ff6a2a' },
  water: { name: 'น้ำ', color: '#3fa7ff' },
  ice: { name: 'น้ำแข็ง', color: '#a8ecff' },
  wind: { name: 'ลม', color: '#7fe0a0' },
  earth: { name: 'ดิน', color: '#c09050' },
  lightning: { name: 'สายฟ้า', color: '#ffe14a' },
  light: { name: 'แสง', color: '#fff6c0' },
  dark: { name: 'มืด', color: '#a36bff' },
  poison: { name: 'พิษ', color: '#8aff4a' },
  nature: { name: 'ธรรมชาติ', color: '#4ac85a' },
  arcane: { name: 'อาคม', color: '#d88aff' },
  physical: { name: 'กายภาพ', color: '#d8d8d8' },
};
// alias สำหรับข้อมูลเก่า
ELEMENT_INFO.none = ELEMENT_INFO.physical;

// ธาตุโจมตี → ธาตุเป้าหมายที่ได้เปรียบ (x1.5)
export const ADVANTAGE = {
  fire: ['ice', 'nature'], water: ['fire', 'earth'], ice: ['wind', 'nature'], wind: ['earth', 'poison'],
  earth: ['lightning', 'fire'], lightning: ['water', 'wind'], light: ['dark'], dark: ['light'],
  poison: ['nature'], nature: ['earth', 'water'], arcane: ['physical', 'earth'], physical: [],
};
// ธาตุโจมตี → ธาตุเป้าหมายที่เสียเปรียบ (x0.6)
export const DISADVANTAGE = {
  fire: ['water'], water: ['lightning'], ice: ['fire'], wind: ['ice', 'lightning'], earth: ['water', 'nature'],
  lightning: ['earth'], light: ['arcane'], dark: [], poison: ['dark'], nature: ['fire', 'poison'], arcane: [], physical: [],
};

export function normElement(e) { return !e || e === 'none' ? 'physical' : e; }
