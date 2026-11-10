// ข้อมูลไอเทม (GDD §17) — type: weapon | armor | helmet | shield | ring | necklace | potion | material | crystal
// slot: ช่องสวมใส่ของมอนสเตอร์ (weapon / armor / accessory)
export const ITEMS = {
  // ----- Equipment -----
  rusty_sword: { name: 'Rusty Sword', type: 'weapon', slot: 'weapon', stats: { atk: 5 }, price: 30, tier: 1 },
  dagger: { name: 'Dagger', type: 'weapon', slot: 'weapon', stats: { atk: 5, crit: 0.03 }, price: 35, tier: 1 },
  iron_sword: { name: 'Iron Sword', type: 'weapon', slot: 'weapon', stats: { atk: 10 }, price: 70, tier: 2 },
  apprentice_staff: { name: 'Apprentice Staff', type: 'weapon', slot: 'weapon', stats: { matk: 7 }, price: 40, tier: 1 },
  short_bow: { name: 'Short Bow', type: 'weapon', slot: 'weapon', stats: { atk: 7, spd: 4 }, price: 45, tier: 1 },
  battle_axe: { name: 'Battle Axe', type: 'weapon', slot: 'weapon', stats: { atk: 22 }, price: 220, tier: 3 },
  holy_sword: { name: 'Holy Sword', type: 'weapon', slot: 'weapon', stats: { atk: 24, matk: 10 }, price: 300, tier: 3 },
  bone_staff: { name: 'Bone Staff', type: 'weapon', slot: 'weapon', stats: { matk: 30 }, price: 380, tier: 4 },
  dragon_blade: { name: 'Dragon Blade', type: 'weapon', slot: 'weapon', stats: { atk: 75, crit: 0.05 }, price: 1500, tier: 6 },
  iron_blade: { name: 'Iron Blade', type: 'weapon', slot: 'weapon', stats: { atk: 12 }, price: 90, tier: 2, craft: true },
  leather_armor: { name: 'Leather Armor', type: 'armor', slot: 'armor', stats: { def: 4, hp: 15 }, price: 35, tier: 1 },
  cloth_robe: { name: 'Cloth Robe', type: 'armor', slot: 'armor', stats: { mdef: 5, matk: 5 }, price: 30, tier: 1 },
  chain_mail: { name: 'Chain Mail', type: 'armor', slot: 'armor', stats: { def: 9, hp: 30 }, price: 80, tier: 2 },
  plate_armor: { name: 'Plate Armor', type: 'armor', slot: 'armor', stats: { def: 24, hp: 90 }, price: 320, tier: 3 },
  dark_robe: { name: 'Dark Robe', type: 'armor', slot: 'armor', stats: { mdef: 18, matk: 20 }, price: 360, tier: 4 },
  hide_vest: { name: 'Hide Vest', type: 'armor', slot: 'armor', stats: { def: 7, hp: 35 }, price: 75, tier: 2, craft: true },
  iron_helm: { name: 'Iron Helm', type: 'helmet', slot: 'accessory', stats: { def: 5, hp: 25 }, price: 60, tier: 2 },
  wooden_shield: { name: 'Wooden Shield', type: 'shield', slot: 'accessory', stats: { def: 7, mdef: 3 }, price: 40, tier: 1 },
  mana_ring: { name: 'Mana Ring', type: 'ring', slot: 'accessory', stats: { matk: 8, mdef: 4 }, price: 60, tier: 2 },
  thief_ring: { name: 'Thief Ring', type: 'ring', slot: 'accessory', stats: { spd: 6, crit: 0.04 }, price: 65, tier: 2 },
  hunter_ring: { name: 'Hunter Ring', type: 'ring', slot: 'accessory', stats: { atk: 5, crit: 0.03 }, price: 60, tier: 2 },
  holy_amulet: { name: 'Holy Amulet', type: 'necklace', slot: 'accessory', stats: { hp: 40, mdef: 8 }, price: 90, tier: 2 },
  bone_charm: { name: 'Bone Charm', type: 'necklace', slot: 'accessory', stats: { def: 5, hp: 30 }, price: 55, tier: 1, craft: true },
  dragon_scale_ring: { name: 'Dragon Scale Ring', type: 'ring', slot: 'accessory', stats: { def: 30, mdef: 20, hp: 180 }, price: 1400, tier: 6 },

  // ----- Consumables -----
  health_potion: { name: 'Health Potion', type: 'potion', use: { heal: 0.5 }, price: 30, stack: true },
  stamina_tonic: { name: 'Stamina Tonic', type: 'potion', use: { fatigue: -40 }, price: 40, stack: true, craft: true },
  loyalty_treat: { name: 'Loyalty Treat', type: 'potion', use: { loyalty: 20, hunger: -30 }, price: 35, stack: true },

  // ----- Materials -----
  bone: { name: 'Bone', type: 'material', price: 6, stack: true },
  hide: { name: 'Hide', type: 'material', price: 8, stack: true },
  mana_gel: { name: 'Mana Gel', type: 'material', price: 8, stack: true },
  iron_scrap: { name: 'Iron Scrap', type: 'material', price: 10, stack: true },
  evolution_crystal: { name: 'Evolution Crystal', type: 'crystal', price: 250, stack: true },
  fusion_crystal: { name: 'Fusion Crystal', type: 'crystal', price: 300, stack: true },
  monster_core: { name: 'Monster Core', type: 'crystal', price: 600, stack: true },
  boss_soul: { name: 'Boss Soul', type: 'crystal', price: 3000, stack: true },
};

// สูตรคราฟต์ (GDD §17: นำไป Craft)
export const RECIPES = [
  { id: 'r_bone_charm', result: 'bone_charm', gold: 20, materials: { bone: 5 } },
  { id: 'r_hide_vest', result: 'hide_vest', gold: 30, materials: { hide: 4 } },
  { id: 'r_iron_blade', result: 'iron_blade', gold: 40, materials: { iron_scrap: 6 } },
  { id: 'r_stamina_tonic', result: 'stamina_tonic', gold: 10, materials: { mana_gel: 3 } },
  { id: 'r_health_potion', result: 'health_potion', gold: 10, materials: { mana_gel: 2, hide: 1 } },
];

// ร้านค้า Merchant (สินค้าที่ปลดล็อกตาม Dungeon Level)
export const SHOP = [
  { item: 'health_potion', unlock: 1 },
  { item: 'stamina_tonic', unlock: 1 },
  { item: 'loyalty_treat', unlock: 1 },
  { item: 'leather_armor', unlock: 1 },
  { item: 'rusty_sword', unlock: 1 },
  { item: 'evolution_crystal', unlock: 2, priceMult: 1.6 },
  { item: 'fusion_crystal', unlock: 2, priceMult: 1.6 },
  { item: 'monster_core', unlock: 4, priceMult: 2 },
  { item: 'iron_sword', unlock: 2 },
  { item: 'chain_mail', unlock: 2 },
  { item: 'plate_armor', unlock: 4 },
  { item: 'holy_sword', unlock: 4 },
];

// ประเภทวัตถุดิบที่ได้จากผู้กล้าแต่ละ Class
export const CLASS_MATERIALS = {
  melee: ['hide', 'iron_scrap'], ranged: ['hide'], magic: ['mana_gel'],
};
