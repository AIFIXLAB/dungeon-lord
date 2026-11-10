// HERO CLASS DESIGN BIBLE — 60 คลาส (ตัวคูณค่าสถานะเทียบกับผู้กล้ามาตรฐาน)
// ค่ามาตรฐาน Lv.1: HP100 ATK20 MATK20 DEF10 MDEF10 SPD100 ACC90 EVA5 CRIT5% MP50
export const HERO_BASE = { hp: 100, atk: 20, matk: 20, def: 10, mdef: 10, spd: 100, acc: 90, eva: 5, crit: 0.05, res: 0, mp: 50 };
export const HERO_RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

const T = 1.5; // วินาทีต่อ "เทิร์น"
// ---- Skill DSL ----
const dmg = (name, power, o = {}) => ({ name, type: 'dmg', power, cd: 6, mp: 8, ...o });
const aoe = (name, power, o = {}) => ({ name, type: 'aoe', power, cd: 10, mp: 15, radius: 1.7, ...o });
const heal = (name, pct, o = {}) => ({ name, type: 'heal', power: pct, target: 'ally_low', cd: 6, mp: 12, range: 4, ...o });
const mheal = (name, pct, o = {}) => ({ name, type: 'mheal', power: pct, cd: 14, mp: 25, radius: 4, ...o });
const buff = (name, id, pct, o = {}) => ({ name, type: 'buff', target: o.target || 'self', status: { id, dur: (o.turns || 3) * T, pct }, cd: 12, mp: 10, radius: 4, ...o });
const debuff = (name, id, o = {}) => ({ name, type: 'debuff', status: { id, dur: (o.turns || 2) * T, chance: o.chance ?? 1, pct: o.pct }, cd: 9, mp: 10, range: o.range || 3.5, ...o });
const summon = (name, kind, o = {}) => ({ name, type: 'summon', kind, cd: 20, mp: 25, ...o });
const S = (id, turns, chance = 1) => ({ id, dur: turns * T, chance });

// [ชื่อ, ชื่อไทย, role, แถว, การโจมตี, ระยะ, ธาตุ, [HP, ATK, MATK, DEF, MDEF, SPD], จุดอ่อน, สกิล, AI, Rank ต่ำสุด]
// จุดอ่อน: ธาตุ = รับดาเมจ x1.5 | trap = กับดักแรงขึ้น | aoe = รับ AoE แรงขึ้น | magic = รับเวทแรงขึ้น | <status> = ติดง่าย
const C = {
  warrior: ['Warrior', 'นักรบ', 'Frontline / Physical DPS', 'front', 'melee', 1, 'physical', [1.3, 1.3, 0.6, 1.1, 0.8, 0.9], ['magic', 'poison'],
    [dmg('Heavy Slash', 1.8), buff('War Cry', 'atk_up', 0.15, { target: 'party', minAllies: 3 }), debuff('Guard Break', 'armor_break', { range: 1.3 })], { target: 'lowest_hp' }, 'F'],
  knight: ['Knight', 'อัศวิน', 'Tank / Protector', 'front', 'melee', 1, 'physical', [1.6, 0.9, 0.5, 1.6, 1.2, 0.7], ['lightning', 'slow'],
    [buff('Shield Wall', 'dr_up', 0.4), { name: 'Protect', type: 'protect', cd: 12, mp: 8 }, dmg('Shield Bash', 1.0, { status: S('stun', 1, 0.4) })], { target: 'nearest', protector: true }, 'F'],
  mage: ['Mage', 'นักเวท', 'Magic DPS / AoE', 'back', 'magic', 3.6, 'fire', [0.7, 0.5, 1.7, 0.6, 1.2, 0.9], ['assassin', 'silence'],
    [dmg('Fireball', 1.6, { kind: 'mag', element: 'fire', range: 4 }), aoe('Frost Nova', 1.0, { kind: 'mag', element: 'ice', range: 2.4, status: S('slow', 2) }), aoe('Arcane Burst', 1.2, { kind: 'mag', element: 'arcane', range: 3.6, minTargets: 3 })], { target: 'lowest_hp', kite: true }, 'F'],
  rogue: ['Rogue', 'โจร', 'Assassin / Evasion DPS', 'front', 'melee', 1, 'physical', [0.8, 1.4, 0.5, 0.7, 0.7, 1.5], ['trap', 'aoe', 'blind'],
    [dmg('Backstab', 2.5, { crit: 0.3 }), buff('Smoke Bomb', 'eva_up', 50), dmg('Poison Blade', 1.1, { element: 'poison', status: S('poison', 3) })], { target: 'caster', disarm: true, greedy: true, retreatAt: 0.25 }, 'F'],
  cleric: ['Cleric', 'นักบวช', 'Healer / Support', 'back', 'magic', 3.4, 'light', [0.9, 0.6, 1.2, 0.8, 1.4, 0.9], ['silence', 'curse', 'assassin'],
    [heal('Heal', 0.25), { name: 'Purify', type: 'cleanse', cd: 8, mp: 10, range: 4 }, dmg('Holy Light', 1.5, { kind: 'mag', element: 'light', range: 4 })], { target: 'nearest', healer: true }, 'F'],
  archer: ['Archer', 'นักธนู', 'Ranged DPS', 'back', 'ranged', 4.5, 'physical', [0.8, 1.3, 0.5, 0.7, 0.8, 1.1], ['assassin', 'blind'],
    [dmg('Aimed Shot', 1.8, { range: 5 }), aoe('Volley', 0.9, { range: 4.5 }), debuff('Pinning Arrow', 'slow', { range: 4.5 })], { target: 'lowest_hp', kite: true }, 'F'],
  berserker: ['Berserker', 'เบอร์เซิร์กเกอร์', 'High-risk DPS', 'front', 'melee', 1, 'fire', [1.4, 1.8, 0.4, 0.8, 0.6, 1.0], ['stun', 'freeze', 'magic'],
    [buff('Rage', 'atk_up', 0.4), aoe('Cleave', 1.5, { kind: 'phys', range: 1.4, radius: 1.4 }), buff('Last Stand', 'atk_up', 0.6, { whenHpBelow: 0.3, turns: 4 })], { target: 'strongest', retreatAt: 0 }, 'D'],
  paladin: ['Paladin', 'พาลาดิน', 'Tank / Support', 'front', 'melee', 1, 'light', [1.5, 1.0, 1.1, 1.4, 1.5, 0.7], ['poison', 'curse'],
    [buff('Divine Shield', 'dr_up', 0.5), dmg('Smite', 1.8, { kind: 'mag', element: 'light', range: 1.3 }), buff('Blessing', 'def_up', 0.15, { target: 'party' })], { target: 'nearest', healer: true, resist: { dark: 0.5 } }, 'D'],
  necromancer: ['Necromancer', 'นักเวทมรณะ', 'Summoner / Debuff', 'back', 'magic', 3.6, 'dark', [0.8, 0.5, 1.6, 0.7, 1.3, 0.8], ['light', 'silence'],
    [summon('Raise Skeleton', 'skeleton'), dmg('Dark Bolt', 1.5, { kind: 'mag', element: 'dark', range: 4 }), dmg('Soul Drain', 1.2, { kind: 'mag', element: 'dark', lifesteal: 0.2, range: 4 })], { target: 'lowest_hp', kite: true }, 'C'],
  dragon_slayer: ['Dragon Slayer', 'นักล่ามังกร', 'Boss Killer', 'front', 'melee', 1, 'physical', [1.2, 1.7, 0.7, 1.1, 1.0, 0.9], ['poison', 'slow', 'aoe'],
    [dmg('Dragon Bane', 2.5, { vsFamily: 'dragon', mp: 20 }), dmg('Piercing Strike', 1.5, { pierce: 0.4 }), buff("Slayer's Instinct", 'crit_up', 0.2)], { target: 'boss' }, 'A'],
  monk: ['Monk', 'นักพรต', 'Melee DPS / Counter', 'front', 'melee', 1, 'physical', [1.1, 1.3, 0.7, 1.0, 0.9, 1.2], ['freeze', 'ranged'],
    [dmg('Palm Strike', 1.4), buff('Counter Stance', 'dr_up', 0.3, { counter: 0.5 }), buff('Inner Focus', 'crit_up', 0.15)], { target: 'nearest' }, 'F'],
  samurai: ['Samurai', 'ซามูไร', 'Duelist', 'front', 'melee', 1, 'physical', [1.0, 1.6, 0.6, 0.9, 0.8, 1.1], ['aoe', 'stun', 'poison'],
    [dmg('Iaido', 2.2, { crit: 0.2 }), buff('Focus', 'crit_up', 0.25), dmg('Blade Dance', 0.8, { hits: 3 })], { target: 'strongest' }, 'D'],
  ninja: ['Ninja', 'นินจา', 'Stealth / Assassin', 'front', 'melee', 1, 'dark', [0.7, 1.3, 0.8, 0.6, 0.7, 1.7], ['aoe', 'trap'],
    [buff('Shadow Step', 'stealth', 1, { turns: 2 }), dmg('Kunai Throw', 1.2, { range: 4 }), dmg('Assassinate', 2.5, { execute: 0.3 })], { target: 'caster', disarm: true }, 'D'],
  ranger: ['Ranger', 'เรนเจอร์', 'Ranged / Survival', 'back', 'ranged', 4.5, 'nature', [0.9, 1.2, 0.6, 0.8, 0.9, 1.2], ['aoe', 'magic'],
    [dmg('Trap Shot', 1.2, { status: S('root', 1), range: 4.5 }), debuff('Mark Target', 'def_down', { pct: 0.2, range: 4.5 }), aoe('Multi Shot', 1.0, { range: 4.5 })], { target: 'nearest', kite: true, disarm: true }, 'E'],
  druid: ['Druid', 'ดรูอิด', 'Healer / Nature Magic', 'back', 'magic', 3.4, 'nature', [1.0, 0.6, 1.3, 0.9, 1.2, 0.9], ['fire', 'poison'],
    [debuff('Entangle', 'root', { turns: 2, range: 4 }), heal('Nature Heal', 0.22), aoe('Thorn Burst', 1.1, { kind: 'mag', element: 'nature', range: 3.4 })], { target: 'nearest', healer: true }, 'E'],
  witch: ['Witch', 'แม่มด', 'Debuff / Magic DPS', 'back', 'magic', 3.6, 'dark', [0.7, 0.5, 1.5, 0.6, 1.1, 1.0], ['assassin', 'silence'],
    [debuff('Hex', 'curse', { turns: 3 }), aoe('Poison Cloud', 0.6, { kind: 'mag', element: 'poison', status: S('poison', 3), range: 3.6 }), summon('Dark Familiar', 'familiar')], { target: 'lowest_hp', kite: true }, 'E'],
  bard: ['Bard', 'นักกวี', 'Support / Buffer', 'back', 'magic', 3.4, 'wind', [0.9, 0.6, 1.0, 0.8, 1.0, 1.1], ['silence', 'assassin'],
    [buff('Battle Song', 'atk_up', 0.2, { target: 'party', precombat: true }), mheal('Healing Melody', 0.12), debuff('Discord', 'slow', { range: 3.5 })], { target: 'nearest', healer: true, kite: true }, 'E'],
  alchemist: ['Alchemist', 'นักเล่นแร่แปรธาตุ', 'Item Support / AoE', 'back', 'ranged', 3.4, 'poison', [0.9, 0.7, 1.2, 0.8, 1.1, 0.9], ['silence', 'aoe'],
    [dmg('Acid Flask', 1.2, { kind: 'mag', element: 'poison', status: S('armor_break', 2), range: 4 }), heal('Healing Potion', 0.25, { mp: 0 }), aoe('Bomb Toss', 1.3, { kind: 'mag', element: 'fire', range: 4 })], { target: 'nearest', healer: true }, 'E'],
  engineer: ['Engineer', 'วิศวกร', 'Trap / Turret Support', 'back', 'ranged', 4, 'lightning', [1.0, 1.0, 0.8, 1.1, 0.9, 0.8], ['lightning', 'assassin'],
    [summon('Deploy Turret', 'turret'), { name: 'Repair', type: 'heal', power: 0.15, target: 'ally_low', cd: 9, mp: 10, range: 4 }, { name: 'Mine', type: 'aoe', power: 1.3, cd: 12, mp: 12, range: 2, radius: 1.4 }], { target: 'nearest', disarm: true }, 'D'],
  gunner: ['Gunner', 'มือปืน', 'Ranged DPS', 'back', 'ranged', 4.8, 'physical', [0.8, 1.5, 0.5, 0.7, 0.8, 0.9], ['assassin', 'rush'],
    [dmg('Quick Shot', 1.2, { cd: 4, range: 5 }), dmg('Piercing Bullet', 1.6, { pierce: 0.5, range: 5 }), buff('Reload', 'atk_up', 0.15)], { target: 'lowest_hp', kite: true }, 'E'],
  tamer: ['Tamer', 'ผู้ฝึกสัตว์', 'Pet Support', 'back', 'melee', 2.4, 'physical', [0.9, 0.9, 1.0, 0.8, 0.9, 1.0], ['aoe'],
    [summon('Call Pet', 'wolf'), heal('Pet Heal', 0.2), buff('Command Attack', 'atk_up', 0.2, { target: 'party' })], { target: 'nearest' }, 'E'],
  beastmaster: ['Beastmaster', 'เจ้าแห่งสัตว์', 'Pet DPS / Tank', 'front', 'melee', 1.6, 'physical', [1.2, 1.2, 0.7, 1.0, 0.8, 1.0], ['aoe', 'fear'],
    [dmg('Beast Charge', 1.6), summon('Pack Tactics', 'wolf'), buff('Wild Roar', 'atk_up', 0.2, { target: 'party' })], { target: 'nearest' }, 'D'],
  swordmaster: ['Swordmaster', 'จ้าวดาบ', 'Melee DPS', 'front', 'melee', 1, 'physical', [1.0, 1.7, 0.5, 0.9, 0.8, 1.1], ['magic', 'freeze'],
    [dmg('Sword Combo', 0.7, { hits: 3 }), aoe('Blade Storm', 1.3, { range: 1.4, radius: 1.5 }), dmg('Finisher', 2.4, { execute: 0.3 })], { target: 'lowest_hp' }, 'D'],
  spellblade: ['Spellblade', 'นักดาบเวท', 'Hybrid DPS', 'front', 'melee', 1, 'arcane', [1.0, 1.2, 1.3, 0.9, 1.0, 1.0], ['silence'],
    [dmg('Flame Blade', 1.4, { kind: 'mag', element: 'fire', range: 1.3 }), dmg('Frost Blade', 1.4, { kind: 'mag', element: 'ice', status: S('slow', 2), range: 1.3 }), dmg('Arcane Slash', 1.6, { kind: 'mag', element: 'arcane', range: 1.3 })], { target: 'nearest', adaptElement: true }, 'C'],
  summoner: ['Summoner', 'นักอัญเชิญ', 'Summon DPS', 'back', 'magic', 3.6, 'arcane', [0.8, 0.5, 1.5, 0.7, 1.2, 0.8], ['silence', 'aoe'],
    [summon('Summon Elemental', 'elemental'), summon('Summon Familiar', 'familiar', { cd: 16 }), aoe('Summon Burst', 1.2, { kind: 'mag', element: 'arcane', range: 3.6 })], { target: 'lowest_hp', kite: true }, 'C'],
  lancer: ['Lancer', 'ทหารหอก', 'Reach DPS', 'front', 'melee', 1.8, 'physical', [1.1, 1.4, 0.5, 1.0, 0.8, 1.0], ['trap', 'assassin'],
    [dmg('Piercing Thrust', 1.6, { pierce: 0.3, range: 1.9 }), buff('Spear Wall', 'def_up', 0.3), dmg('Charge', 1.8, { range: 3, dash: true })], { target: 'nearest' }, 'D'],
  gladiator: ['Gladiator', 'กลาดิเอเตอร์', 'Arena DPS / Tank', 'front', 'melee', 1, 'physical', [1.3, 1.4, 0.4, 1.2, 0.7, 0.9], ['magic', 'ranged'],
    [{ name: 'Arena Taunt', type: 'taunt', radius: 3, cd: 10, mp: 5 }, buff('Shield Counter', 'dr_up', 0.3, { counter: 0.4 }), dmg('Execution', 2.2, { execute: 0.35 })], { target: 'strongest' }, 'D'],
  valkyrie: ['Valkyrie', 'วาลคิรี', 'Flying / Support DPS', 'front', 'melee', 1.6, 'light', [1.1, 1.3, 1.0, 1.0, 1.1, 1.3], ['lightning'],
    [dmg('Sky Lance', 1.6, { kind: 'mag', element: 'light', range: 2 }), dmg('Valkyrie Dive', 2.0, { range: 3, dash: true }), buff('Wing Guard', 'def_up', 0.25, { target: 'party' })], { target: 'backline', flying: true }, 'B'],
  dark_knight: ['Dark Knight', 'อัศวินดำ', 'Dark DPS / Drain Tank', 'front', 'melee', 1, 'dark', [1.3, 1.5, 0.8, 1.1, 0.9, 0.9], ['light'],
    [dmg('Dark Slash', 1.6, { element: 'dark' }), dmg('Life Drain', 1.2, { lifesteal: 0.4, element: 'dark' }), buff('Abyssal Guard', 'dr_up', 0.35)], { target: 'nearest' }, 'B'],
  holy_warrior: ['Holy Warrior', 'นักรบศักดิ์สิทธิ์', 'Support / Frontline', 'front', 'melee', 1, 'light', [1.2, 1.2, 1.0, 1.2, 1.3, 0.9], ['curse', 'poison'],
    [dmg('Holy Strike', 1.6, { element: 'light' }), mheal('Sanctuary', 0.12), buff('Bless', 'atk_up', 0.15, { target: 'party' })], { target: 'nearest', healer: true, resist: { dark: 0.5 } }, 'C'],
  assassin: ['Assassin', 'นักฆ่า', 'Burst DPS', 'front', 'melee', 1, 'dark', [0.7, 1.7, 0.5, 0.6, 0.6, 1.6], ['aoe'],
    [dmg('Execute', 2.4, { execute: 0.35 }), debuff('Shadow Mark', 'def_down', { pct: 0.25, range: 2 }), buff('Vanish', 'stealth', 1, { turns: 2 })], { target: 'lowest_hp', retreatAt: 0.3 }, 'C'],
  inquisitor: ['Inquisitor', 'ผู้ไต่สวน', 'Anti-Magic / Support', 'front', 'melee', 1, 'light', [1.1, 1.2, 1.1, 1.1, 1.4, 0.8], ['physical', 'slow'],
    [dmg('Judgment', 1.8, { kind: 'mag', element: 'light', vsFamily: 'undead', range: 1.4 }), debuff('Silence Seal', 'silence', { range: 3 }), { name: 'Purge', type: 'cleanse', cd: 10, mp: 10, range: 4 }], { target: 'caster' }, 'C'],
  crusader: ['Crusader', 'ครูเสด', 'Tank / Holy DPS', 'front', 'melee', 1, 'light', [1.5, 1.2, 0.8, 1.5, 1.2, 0.7], ['poison'],
    [buff('Crusader Shield', 'dr_up', 0.4), dmg('Holy Charge', 1.7, { element: 'light', range: 3, dash: true }), dmg('Judgment Strike', 1.9, { element: 'light' })], { target: 'nearest' }, 'C'],
  black_mage: ['Black Mage', 'จอมเวทดำ', 'Elemental AoE', 'back', 'magic', 3.8, 'dark', [0.7, 0.4, 1.8, 0.6, 1.2, 0.9], ['silence', 'assassin'],
    [aoe('Meteor', 1.7, { kind: 'mag', element: 'fire', range: 4, cd: 14, mp: 30 }), dmg('Dark Flare', 1.8, { kind: 'mag', element: 'dark', range: 4 }), aoe('Elemental Storm', 1.2, { kind: 'mag', element: 'lightning', range: 3.8, minTargets: 2 })], { target: 'lowest_hp', kite: true }, 'B'],
  white_mage: ['White Mage', 'จอมเวทขาว', 'Pure Healer', 'back', 'magic', 3.4, 'light', [0.9, 0.4, 1.4, 0.7, 1.5, 0.8], ['silence', 'curse'],
    [heal('Greater Heal', 0.4), { name: 'Revive', type: 'revive', cd: 30, mp: 40, power: 0.4 }, { name: 'Cleanse', type: 'cleanse', cd: 8, mp: 10, range: 4 }], { target: 'nearest', healer: true, reviver: true }, 'B'],
  scholar: ['Scholar', 'นักปราชญ์', 'Tactical Support', 'back', 'magic', 3.4, 'arcane', [0.8, 0.5, 1.3, 0.7, 1.3, 0.9], ['silence', 'rush'],
    [debuff('Analyze', 'def_down', { pct: 0.2 }), debuff('Weakness Scan', 'armor_break', { turns: 3 }), buff('Tactical Order', 'crit_up', 0.15, { target: 'party' })], { target: 'strongest', kite: true }, 'C'],
  sage: ['Sage', 'ปราชญ์เวท', 'Hybrid Magic / Support', 'back', 'magic', 3.6, 'arcane', [0.9, 0.6, 1.5, 0.8, 1.4, 0.9], ['silence'],
    [heal('Arcane Heal', 0.3), dmg('Elemental Mastery', 1.7, { kind: 'mag', element: 'arcane', range: 4, adaptElement: true }), buff('Mana Restore', 'matk_up', 0.2, { target: 'party' })], { target: 'nearest', healer: true, adaptElement: true }, 'B'],
  warlock: ['Warlock', 'นักเวทปีศาจ', 'Dark Magic / Debuff', 'back', 'magic', 3.6, 'dark', [0.8, 0.5, 1.6, 0.7, 1.2, 0.8], ['light', 'silence'],
    [debuff('Soul Curse', 'curse', { turns: 3 }), buff('Demon Pact', 'matk_up', 0.35), aoe('Dark Explosion', 1.5, { kind: 'mag', element: 'dark', range: 3.6 })], { target: 'lowest_hp', kite: true }, 'C'],
  shaman: ['Shaman', 'ชามาน', 'Elemental Support', 'back', 'magic', 3.4, 'nature', [1.0, 0.7, 1.3, 0.9, 1.2, 0.9], ['rush'],
    [summon('Fire Totem', 'totem'), mheal('Healing Totem', 0.1), debuff('Spirit Bind', 'root', { turns: 2 })], { target: 'nearest', healer: true }, 'C'],
  warlord: ['Warlord', 'จอมทัพ', 'Commander / Frontline', 'front', 'melee', 1.3, 'physical', [1.4, 1.4, 0.5, 1.2, 0.9, 0.8], ['silence', 'slow'],
    [buff('Commanding Shout', 'atk_up', 0.25, { target: 'party' }), buff('Formation', 'def_up', 0.2, { target: 'party' }), dmg('Warlord Strike', 2.0)], { target: 'nearest' }, 'B'],
  marshal: ['Marshal', 'จอมพล', 'Tactical Commander', 'front', 'melee', 1, 'physical', [1.2, 1.0, 0.8, 1.1, 1.1, 0.9], ['assassin', 'silence'],
    [buff('Rally', 'atk_up', 0.2, { target: 'party' }), buff('Tactical Retreat', 'spd_up', 0.3, { target: 'party' }), debuff('Formation Break', 'def_down', { pct: 0.25, range: 2 })], { target: 'nearest', retreatAt: 0.2 }, 'B'],
  captain: ['Captain', 'กัปตัน', 'Leader / Balanced', 'front', 'melee', 1, 'physical', [1.1, 1.2, 0.7, 1.0, 0.9, 1.0], ['curse'],
    [buff("Captain's Order", 'crit_up', 0.15, { target: 'party' }), dmg('Coordinated Shot', 1.5, { range: 4 }), buff('Rally', 'atk_up', 0.15, { target: 'party' })], { target: 'nearest' }, 'D'],
  pirate: ['Pirate', 'โจรสลัด', 'Melee / Ranged Hybrid', 'front', 'melee', 1, 'water', [1.0, 1.3, 0.5, 0.9, 0.8, 1.1], ['magic'],
    [dmg('Cutlass Slash', 1.5), dmg('Pistol Shot', 1.3, { range: 4 }), { name: 'Plunder', type: 'dmg', power: 1.0, cd: 12, mp: 0, greedy: true }], { target: 'nearest', greedy: true }, 'F'],
  corsair: ['Corsair', 'คอร์แซร์', 'Agile Pirate DPS', 'front', 'melee', 1, 'water', [0.9, 1.4, 0.5, 0.8, 0.7, 1.3], ['aoe', 'trap'],
    [dmg('Twin Cut', 0.85, { hits: 2 }), buff('Evasive Roll', 'eva_up', 40), dmg('Pirate Rush', 1.8, { range: 3, dash: true })], { target: 'lowest_hp' }, 'E'],
  hunter: ['Hunter', 'นักล่า', 'Ranged / Anti-Beast', 'back', 'ranged', 4.5, 'physical', [0.9, 1.4, 0.5, 0.8, 0.9, 1.1], ['assassin', 'rush'],
    [debuff('Beast Mark', 'def_down', { pct: 0.2, range: 4.5 }), dmg("Hunter's Shot", 1.7, { vsFamily: 'beast', range: 4.5 }), debuff('Snare', 'root', { range: 4 })], { target: 'nearest', kite: true }, 'F'],
  tracker: ['Tracker', 'นักตามรอย', 'Scout / Debuff', 'back', 'ranged', 4.2, 'physical', [0.9, 1.1, 0.5, 0.8, 0.9, 1.2], ['blind'],
    [{ name: 'Detect Trap', type: 'detect', cd: 20, mp: 5 }, debuff('Mark Trail', 'def_down', { pct: 0.2, range: 4 }), dmg('Tracking Shot', 1.4, { range: 4.5, acc: 30 })], { target: 'nearest', disarm: true, detectTraps: true }, 'E'],
  scout: ['Scout', 'หน่วยสอดแนม', 'Recon / Evasion', 'front', 'melee', 1, 'wind', [0.8, 1.0, 0.5, 0.7, 0.8, 1.5], ['trap', 'aoe'],
    [{ name: 'Scout Ahead', type: 'detect', cd: 20, mp: 5 }, buff('Evasion', 'eva_up', 40), buff('Quick Retreat', 'spd_up', 0.5)], { target: 'nearest', retreatAt: 0.4, disarm: true, detectTraps: true }, 'F'],
  mountaineer: ['Mountaineer', 'นักปีนเขา', 'Survival / Tank', 'front', 'melee', 1, 'earth', [1.3, 1.1, 0.4, 1.2, 0.9, 0.8], ['fire', 'poison'],
    [buff('Climb', 'spd_up', 0.3), buff('Mountain Guard', 'def_up', 0.35), dmg('Rock Break', 1.6, { element: 'earth', status: S('armor_break', 2) })], { target: 'nearest', resistStatus: ['slow'] }, 'E'],
  knight_captain: ['Knight Captain', 'หัวหน้าอัศวิน', 'Tank Commander', 'front', 'melee', 1, 'physical', [1.5, 1.1, 0.5, 1.5, 1.2, 0.7], ['magic'],
    [buff('Shield Formation', 'def_up', 0.25, { target: 'party' }), { name: "Captain's Guard", type: 'protect', cd: 10, mp: 8 }, buff('Rally Knights', 'atk_up', 0.2, { target: 'party' })], { target: 'nearest', protector: true }, 'B'],
  royal_guard: ['Royal Guard', 'ราชองครักษ์', 'Elite Tank', 'front', 'melee', 1, 'physical', [1.7, 0.9, 0.4, 1.8, 1.3, 0.6], ['poison'],
    [buff('Royal Bulwark', 'dr_up', 0.5), { name: 'Intercept', type: 'protect', cd: 8, mp: 8 }, { name: 'Fortress Stance', type: 'taunt', radius: 3.5, cd: 12, mp: 8 }], { target: 'nearest', protector: true }, 'A'],
  imperial_knight: ['Imperial Knight', 'อัศวินจักรวรรดิ', 'Elite Frontline DPS', 'front', 'melee', 1, 'physical', [1.4, 1.5, 0.6, 1.4, 1.1, 0.8], ['slow', 'magic'],
    [dmg('Imperial Slash', 1.9, { cd: 8 }), buff('Heavy Guard', 'dr_up', 0.35), dmg('Royal Charge', 2.0, { range: 3, dash: true })], { target: 'nearest' }, 'A'],
  rune_knight: ['Rune Knight', 'อัศวินรูน', 'Magic Tank', 'front', 'melee', 1, 'arcane', [1.3, 1.1, 1.3, 1.2, 1.5, 0.8], ['physical'],
    [buff('Rune Shield', 'mdef_up', 0.5), dmg('Rune Strike', 1.6, { kind: 'mag', element: 'arcane', range: 1.3 }), buff('Magic Ward', 'mdef_up', 0.25, { target: 'party' })], { target: 'nearest' }, 'B'],
  arcane_knight: ['Arcane Knight', 'อัศวินอาคม', 'Hybrid Frontline', 'front', 'melee', 1, 'arcane', [1.2, 1.2, 1.4, 1.1, 1.3, 0.9], ['silence'],
    [dmg('Arcane Blade', 1.7, { kind: 'mag', element: 'arcane', range: 1.3 }), buff('Magic Shield', 'dr_up', 0.35, { precombat: true }), aoe('Spell Burst', 1.3, { kind: 'mag', element: 'arcane', range: 2 })], { target: 'nearest' }, 'A'],
  shadowblade: ['Shadowblade', 'ดาบเงา', 'Stealth DPS', 'front', 'melee', 1, 'dark', [0.8, 1.6, 0.8, 0.7, 0.8, 1.5], ['light', 'aoe'],
    [dmg('Shadow Slash', 1.8, { element: 'dark' }), buff('Vanish', 'stealth', 1, { turns: 2 }), dmg('Night Execution', 2.6, { execute: 0.35, crit: 0.3 })], { target: 'backline' }, 'A'],
  spirit_caller: ['Spirit Caller', 'ผู้เรียกวิญญาณ', 'Spirit Support / Summon', 'back', 'magic', 3.4, 'light', [0.9, 0.5, 1.4, 0.8, 1.3, 0.9], ['silence'],
    [summon('Spirit Guard', 'spirit'), heal('Spirit Heal', 0.25), dmg('Spirit Strike', 1.5, { kind: 'mag', element: 'light', range: 4 })], { target: 'nearest', healer: true }, 'B'],
  elementalist: ['Elementalist', 'จอมธาตุ', 'Elemental DPS', 'back', 'magic', 3.8, 'arcane', [0.7, 0.4, 1.8, 0.6, 1.2, 0.9], ['silence', 'assassin'],
    [dmg('Elemental Burst', 1.8, { kind: 'mag', range: 4, adaptElement: true }), buff('Element Shift', 'matk_up', 0.2), aoe('Elemental Nova', 1.4, { kind: 'mag', range: 3.8, adaptElement: true })], { target: 'lowest_hp', kite: true, adaptElement: true }, 'A'],
  chronomancer: ['Chronomancer', 'จอมเวทกาลเวลา', 'Time Control / Support', 'back', 'magic', 3.6, 'arcane', [0.8, 0.4, 1.4, 0.7, 1.3, 1.0], ['silence'],
    [buff('Haste', 'spd_up', 0.4, { target: 'party' }), debuff('Slow Time', 'slow', { turns: 3, range: 4 }), { name: 'Temporal Reset', type: 'mheal', power: 0.2, cd: 25, mp: 40, radius: 4, resetCd: true }], { target: 'strongest', healer: true, kite: true }, 'S'],
  astrologer: ['Astrologer', 'โหราจารย์', 'Prediction / Support', 'back', 'magic', 3.6, 'light', [0.8, 0.4, 1.3, 0.7, 1.3, 0.9], ['blind'],
    [buff('Star Mark', 'crit_up', 0.25, { target: 'party' }), buff('Fate Shift', 'eva_up', 25, { target: 'party' }), aoe('Meteor Sign', 1.5, { kind: 'mag', element: 'light', range: 4 })], { target: 'boss', kite: true }, 'S'],
  dragon_knight: ['Dragon Knight', 'อัศวินมังกร', 'Dragon Hybrid / Frontline', 'front', 'melee', 1.6, 'fire', [1.4, 1.5, 1.0, 1.3, 1.1, 1.0], ['ice'],
    [dmg('Dragon Jump', 2.2, { range: 3.5, dash: true }), dmg('Dragon Spear', 1.8, { vsFamily: 'dragon', element: 'fire', range: 1.9 }), buff('Dragon Guard', 'dr_up', 0.35)], { target: 'backline', flying: true }, 'S'],
  saint: ['Saint', 'นักบุญ', 'Ultimate Healer / Holy Support', 'back', 'magic', 3.4, 'light', [1.0, 0.5, 1.6, 0.9, 1.6, 0.8], ['silence', 'curse'],
    [{ name: 'Divine Resurrection', type: 'revive', cd: 25, mp: 40, power: 0.6 }, mheal('Mass Heal', 0.25), buff('Sacred Barrier', 'dr_up', 0.3, { target: 'party' })], { target: 'nearest', healer: true, reviver: true, resist: { dark: 0.5 } }, 'S'],
};

export const HERO_CLASSES = {};
for (const [id, r] of Object.entries(C)) {
  const [name, th, role, row, attack, range, element, m, weak, skills, ai, minRank] = r;
  HERO_CLASSES[id] = {
    id, name, th, role, row, attack, range, element, weak, skills, minRank,
    mult: { hp: m[0], atk: m[1], matk: m[2], def: m[3], mdef: m[4], spd: m[5] },
    ai: { target: 'nearest', retreatAt: row === 'back' ? 0.3 : 0.15, ...ai },
    sprite: `hero_${id}`,
  };
}

export const HERO_NAMES = [
  'Arin', 'Bram', 'Cedric', 'Dara', 'Elric', 'Fenn', 'Gwen', 'Hale', 'Ivo', 'Jora', 'Kael', 'Lysa', 'Marn', 'Nia', 'Orin', 'Pell',
  'Quin', 'Rhea', 'Soren', 'Tess', 'Ulric', 'Vera', 'Wren', 'Xan', 'Yara', 'Zed', 'Alden', 'Brisa', 'Corin', 'Delia', 'Edda', 'Faro',
  'Garr', 'Hilde', 'Isla', 'Jory', 'Kira', 'Lio', 'Mira', 'Nox', 'Oska', 'Pim', 'Riven', 'Sela', 'Toma', 'Una', 'Vex', 'Wyll',
];
export const HERO_TITLES = ['the Bold', 'the Young', 'of Riverdale', 'the Swift', 'Ironhand', 'the Lucky', 'Brightblade', 'the Greedy', 'of the North', 'Stormborn', 'the Wise', 'Oathkeeper'];

// Loot ที่ผู้กล้าแต่ละ role ทำตก (แยกจากข้อมูลคลาสตาม Bible §7)
export function heroLootFor(cls) {
  const c = HERO_CLASSES[cls];
  if (c.attack === 'magic') return ['apprentice_staff', 'mana_ring', 'cloth_robe', 'holy_amulet', 'bone_staff', 'dark_robe'];
  if (c.attack === 'ranged') return ['short_bow', 'hunter_ring', 'leather_armor', 'thief_ring'];
  if (c.row === 'front' && c.mult.def >= 1.3) return ['wooden_shield', 'chain_mail', 'iron_helm', 'plate_armor', 'iron_sword'];
  return ['rusty_sword', 'dagger', 'iron_sword', 'leather_armor', 'battle_axe', 'chain_mail', 'holy_sword'];
}
