// ระบบสกิลแบบ Data-driven ใช้ร่วมกันทั้งมอนสเตอร์ ผู้กล้า และบอส
// type: dmg | aoe | heal | mheal | buff | debuff | summon | revive | taunt | protect | cleanse | stealth
// kind: phys (ATK vs DEF) | mag (MATK vs MDEF) | power = ตัวคูณ | cd วินาที | mp = ค่ามานา
// status: { id, dur(วินาที), chance } | stat/pct สำหรับ buff/debuff | target: self | party | ally_low
import { ELEMENTS } from './elements.js';

// ---------- Status effects (Hero/Monster Bible) ----------
// 1 "เทิร์น" ในเอกสาร = 1.5 วินาทีในเกม Real-time
export const STATUS_INFO = {
  poison: { name: 'Poison', th: 'พิษ', color: '#8aff4a', dot: 0.03 },
  burn: { name: 'Burn', th: 'ไหม้', color: '#ff7a2a', dot: 0.04 },
  bleed: { name: 'Bleed', th: 'เลือดไหล', color: '#e02a3a', dot: 0.03 },
  freeze: { name: 'Freeze', th: 'แช่แข็ง', color: '#a8ecff', noMove: true },
  root: { name: 'Root', th: 'รากพัน', color: '#6ac84a', noMove: true },
  stun: { name: 'Stun', th: 'มึน', color: '#ffe14a', noAct: true },
  sleep: { name: 'Sleep', th: 'หลับ', color: '#c8d8ff', noAct: true, breakOnHit: true },
  silence: { name: 'Silence', th: 'ใบ้', color: '#b0b0c8', noMagic: true },
  blind: { name: 'Blind', th: 'ตาบอด', color: '#555566', acc: -0.4 },
  slow: { name: 'Slow', th: 'ช้า', color: '#7ac8ff', spd: -0.3 },
  curse: { name: 'Curse', th: 'คำสาป', color: '#a86aff', atk: -0.2, matk: -0.2 },
  fear: { name: 'Fear', th: 'หวาดกลัว', color: '#c86aa8', flee: 0.3 },
  armor_break: { name: 'Armor Break', th: 'เกราะแตก', color: '#c8a86a', def: -0.3 },
  sick: { name: 'Sick', th: 'ป่วย', color: '#9acd32', all: -0.2 },
  antiheal: { name: 'Anti-Heal', th: 'ลดการฟื้นฟู', color: '#7a9a4a' },
  // buffs
  atk_up: { name: 'ATK↑', th: 'ATK↑', color: '#ff8a5a', buff: true },
  matk_up: { name: 'MATK↑', th: 'MATK↑', color: '#d88aff', buff: true },
  def_up: { name: 'DEF↑', th: 'DEF↑', color: '#8ab4ff', buff: true },
  mdef_up: { name: 'MDEF↑', th: 'MDEF↑', color: '#8ad8ff', buff: true },
  spd_up: { name: 'SPD↑', th: 'SPD↑', color: '#8affc8', buff: true },
  crit_up: { name: 'CRIT↑', th: 'CRIT↑', color: '#ffe48a', buff: true },
  eva_up: { name: 'EVA↑', th: 'EVA↑', color: '#e8e8ff', buff: true },
  dr_up: { name: 'Guard', th: 'ลดดาเมจ', color: '#c8c8ff', buff: true },
  stealth: { name: 'Stealth', th: 'ล่องหน', color: '#6a6a8a', buff: true },
  regen: { name: 'Regen', th: 'ฟื้นฟู', color: '#6aff8a', buff: true },
  atk_down: { name: 'ATK↓', th: 'ATK↓', color: '#b48aff' },
  def_down: { name: 'DEF↓', th: 'DEF↓', color: '#c8a86a' },
  spd_down: { name: 'SPD↓', th: 'SPD↓', color: '#7a9aff' },
};

const T = 1.5; // วินาทีต่อเทิร์น
const st = (id, turns, chance = 1) => ({ id, dur: turns * T, chance });

// ---------- Monster skill library ----------
export const SKILLS = {
  body_slam: { name: 'Body Slam', type: 'dmg', kind: 'phys', power: 1.3, cd: 6 },
  quick_slash: { name: 'Quick Slash', type: 'dmg', kind: 'phys', power: 1.5, cd: 5, hits: 1 },
  goblin_trick: { name: 'Goblin Trick', type: 'debuff', stat: 'acc', pct: 0.3, cd: 10, status: st('blind', 2) },
  bite: { name: 'Bite', type: 'dmg', kind: 'phys', power: 1.4, cd: 5, status: st('bleed', 3, 0.3) },
  pack_hunt: { name: 'Pack Hunt', type: 'buff', target: 'party', radius: 4, status: { id: 'atk_up', dur: 6, pct: 0.2 }, cd: 14 },
  bone_slash: { name: 'Bone Slash', type: 'dmg', kind: 'phys', power: 1.5, cd: 6 },
  bone_shield: { name: 'Bone Shield', type: 'buff', target: 'self', status: { id: 'def_up', dur: 6, pct: 0.5 }, cd: 12 },
  shield_bash: { name: 'Shield Bash', type: 'dmg', kind: 'phys', power: 1.1, cd: 9, status: st('stun', 1, 0.5) },
  web_shot: { name: 'Web Shot', type: 'dmg', kind: 'phys', power: 0.9, cd: 7, range: 4, status: st('slow', 3) },
  venom_bite: { name: 'Venom Bite', type: 'dmg', kind: 'phys', power: 1.1, cd: 8, element: 'poison', status: st('poison', 3) },
  drain_bite: { name: 'Drain Bite', type: 'dmg', kind: 'phys', power: 1.3, cd: 8, lifesteal: 0.5 },
  sonic_wave: { name: 'Sonic Wave', type: 'aoe', kind: 'mag', power: 0.7, cd: 10, range: 2.5, radius: 1.8, status: st('fear', 2, 0.3) },
  spore_heal: { name: 'Mushroom Heal', type: 'heal', target: 'ally_low', power: 0.25, cd: 7, range: 4, mp: 10 },
  spore_cloud: { name: 'Spore Cloud', type: 'aoe', kind: 'mag', power: 0.4, cd: 12, range: 3, radius: 1.6, status: st('sleep', 2, 0.5), element: 'nature' },
  stone_skin: { name: 'Stone Skin', type: 'buff', target: 'self', status: { id: 'dr_up', dur: 7, pct: 0.4 }, cd: 14 },
  rock_slam: { name: 'Rock Slam', type: 'aoe', kind: 'phys', power: 1.2, cd: 9, range: 1.4, radius: 1.5, status: st('stun', 1, 0.4) },
  root_slam: { name: 'Root Slam', type: 'aoe', kind: 'phys', power: 1.1, cd: 10, range: 2.2, radius: 1.6, element: 'nature', status: st('root', 2) },
  mimic_ambush: { name: 'Mimic Ambush', type: 'dmg', kind: 'phys', power: 2.6, cd: 14, crit: 0.4 },
  tail_sting: { name: 'Tail Stinger', type: 'dmg', kind: 'phys', power: 1.4, cd: 7, element: 'poison', status: st('poison', 3) },
  howl: { name: 'Howl', type: 'buff', target: 'party', radius: 4, status: { id: 'atk_up', dur: 6, pct: 0.25 }, cd: 15 },
  curse: { name: 'Curse', type: 'debuff', range: 4, status: st('curse', 3), cd: 10, mp: 10 },
  drain_soul: { name: 'Soul Drain', type: 'dmg', kind: 'mag', power: 1.4, cd: 8, element: 'dark', lifesteal: 0.4, mp: 10 },
  dragon_breath: { name: 'Dragon Breath', type: 'aoe', kind: 'mag', power: 1.7, cd: 9, range: 3.5, radius: 2, mp: 15 },
  royal_command: { name: 'Royal Command', type: 'buff', target: 'party', radius: 5, status: { id: 'atk_up', dur: 8, pct: 0.3 }, cd: 15 },
  regenerate: { name: 'Regeneration', type: 'buff', target: 'self', status: { id: 'regen', dur: 8, pct: 0.03 }, cd: 16 },
  shadow_step: { name: 'Shadow Step', type: 'dmg', kind: 'phys', power: 2.4, cd: 11, crit: 0.3, element: 'dark' },
  holy_smite: { name: 'Holy Smite', type: 'dmg', kind: 'mag', power: 1.8, cd: 7, element: 'light', mp: 10 },
  heal_light: { name: 'Light Heal', type: 'heal', target: 'ally_low', power: 0.3, cd: 7, range: 4, mp: 12 },
  freeze_touch: { name: 'Frozen Ground', type: 'aoe', kind: 'mag', power: 0.8, cd: 11, range: 3, radius: 1.6, element: 'ice', status: st('freeze', 1, 0.6) },
  burn_field: { name: 'Burn Field', type: 'aoe', kind: 'mag', power: 0.8, cd: 11, range: 3, radius: 1.6, element: 'fire', status: st('burn', 2) },
  thunder_strike: { name: 'Thunder Strike', type: 'dmg', kind: 'mag', power: 1.8, cd: 7, element: 'lightning', status: st('stun', 1, 0.3), mp: 10 },
  gust: { name: 'Gust', type: 'aoe', kind: 'mag', power: 0.9, cd: 9, range: 3, radius: 1.8, element: 'wind', status: st('slow', 2) },
  toxic_spray: { name: 'Toxic Spray', type: 'aoe', kind: 'mag', power: 0.6, cd: 10, range: 2.5, radius: 1.6, element: 'poison', status: st('poison', 3) },
  arcane_burst: { name: 'Arcane Burst', type: 'aoe', kind: 'mag', power: 1.3, cd: 10, range: 3.5, radius: 1.6, element: 'arcane', mp: 15 },
  taunt_roar: { name: 'War Roar', type: 'taunt', radius: 3, cd: 12 },
  summon_minion: { name: 'Summon Minion', type: 'summon', cd: 22, mp: 20 },
};

// สกิลธาตุพื้นฐาน (สร้างอัตโนมัติ): bolt_<ธาตุ> และ nova_<ธาตุ>
for (const e of ELEMENTS) {
  SKILLS[`bolt_${e}`] ||= { name: `${e[0].toUpperCase()}${e.slice(1)} Bolt`, type: 'dmg', kind: e === 'physical' ? 'phys' : 'mag', power: 1.6, cd: 5, range: 4, element: e, mp: 8 };
  SKILLS[`nova_${e}`] ||= { name: `${e[0].toUpperCase()}${e.slice(1)} Nova`, type: 'aoe', kind: e === 'physical' ? 'phys' : 'mag', power: 1.2, cd: 10, range: 3.5, radius: 1.8, element: e, mp: 15 };
}
const ELEMENT_STATUS = { fire: 'burn', ice: 'freeze', poison: 'poison', lightning: 'stun', dark: 'curse', nature: 'root', wind: 'slow', water: 'slow', earth: 'armor_break', light: 'blind', arcane: 'silence' };
for (const [e, sid] of Object.entries(ELEMENT_STATUS)) SKILLS[`nova_${e}`].status = st(sid, sid === 'stun' || sid === 'freeze' ? 1 : 2, 0.35);

// Passive ตาม Role (ปลดล็อก Level 6)
export const ROLE_PASSIVES = {
  tank: { name: 'Thick Hide', desc: 'รับดาเมจ -12%', dmgTaken: 0.88 },
  bruiser: { name: 'Brawler', desc: 'ATK +6% รับดาเมจ -6%', atkMult: 1.06, dmgTaken: 0.94 },
  dps: { name: 'Fury', desc: 'ATK +10%', atkMult: 1.1 },
  ranged: { name: 'Keen Eye', desc: 'CRIT +8%', crit: 0.08 },
  mage: { name: 'Arcane Flow', desc: 'คูลดาวน์สกิล -15%', cdMult: 0.85 },
  support: { name: 'Inspire', desc: 'ฮีล/บัฟ +20%', healMult: 1.2 },
  healer: { name: 'Mending', desc: 'ฮีล +25%', healMult: 1.25 },
  assassin: { name: 'Evasion', desc: 'EVA +10', eva: 10 },
  controller: { name: 'Lingering', desc: 'สถานะผิดปกตินานขึ้น 30%', statusMult: 1.3 },
  summoner: { name: 'Bond', desc: 'ATK +5% DEF +5%', atkMult: 1.05, dmgTaken: 0.95 },
  worker: { name: 'Diligent', desc: 'ทำงานเร็วขึ้น 30%', workMult: 1.3 },
  boss: { name: 'Overlord', desc: 'ต้านสถานะ 50%', res: 0.5 },
};
