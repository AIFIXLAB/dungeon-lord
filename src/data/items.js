// ITEM CATALOG — Hero Loot & Monster Cuisine CopyPack (loot_catalog.json, additional_drops.json, recipes.json)
// code = Item ID ตามเอกสาร | price = base_sell_price | icon = key ใน assets/items/atlas.json
// cat: loot | equipment | material | gem | food | special  (แท็บคลังตาม system_rules.json)
// proc: { st: สถานี, out: { itemId: qty } } — ระบบแปรรูป
const I = (code, name, th, rarity, type, cat, price, icon, extra = {}) => ({ code, name, th, rarity, type, cat, price, icon, ...extra });
const P = (st, out, gold = 0) => ({ st, out, gold });

export const ITEMS = {
  // ---------- Hero Loot: Common ----------
  rusty_sword: I('HL-C001', 'Rusty Sword', 'ดาบขึ้นสนิม', 'common', 'Weapon', 'equipment', 10, '01_00', { slot: 'weapon', stats: { atk: 5 }, proc: P('furnace', { scrap_metal: 2 }) }),
  wooden_shield: I('HL-C002', 'Wooden Shield', 'โล่ไม้', 'common', 'Shield', 'equipment', 8, '01_02', { slot: 'accessory', stats: { def: 6 }, proc: P('workbench', { wood: 2 }) }),
  damaged_armor: I('HL-C003', 'Damaged Armor', 'เกราะชำรุด', 'common', 'Armor', 'equipment', 15, '01_03', { slot: 'armor', stats: { def: 5, hp: 20 }, proc: P('furnace', { scrap_metal: 2 }) }),
  leather_boots: I('HL-C004', 'Leather Boots', 'รองเท้าหนัง', 'common', 'Equipment', 'equipment', 12, '01_04', { slot: 'accessory', stats: { spd: 6, eva: 2 }, proc: P('workbench', { monster_leather: 1 }) }),
  torn_cloak: I('HL-C005', 'Torn Cloak', 'ผ้าคลุมขาด', 'common', 'Cloth', 'loot', 8, '01_05', { proc: P('workbench', { cloth: 1 }) }),
  old_bread: I('HL-C006', 'Old Bread', 'ขนมปังเก่า', 'common', 'Food', 'food', 5, '01_06', { proc: P('kitchen', { bread: 1 }) }),
  empty_bottle: I('HL-C007', 'Empty Potion Bottle', 'ขวดยาเปล่า', 'common', 'Container', 'loot', 5, '01_07', { proc: P('alchemy', { red_potion: 1 }, 10) }),
  small_mana_crystal: I('HL-C008', 'Small Mana Crystal', 'คริสตัลมานาเล็ก', 'common', 'Gem', 'gem', 20, '01_08', { proc: P('alchemy', { magic_dust: 1 }) }),
  coin_pouch: I('HL-C009', 'Hero Coin Pouch', 'ถุงเงินผู้กล้า', 'common', 'Currency', 'loot', 25, '01_09', { use: { gold: [25, 70] } }),
  old_spellbook: I('HL-C010', 'Old Spellbook', 'ตำราเวทเก่า', 'common', 'Book', 'loot', 30, '01_10', { proc: P('extractor', { magic_dust: 1 }) }),
  // ---------- Hero Loot: Rare ----------
  steel_sword: I('HL-R001', 'Steel Sword', 'ดาบเหล็กกล้า', 'rare', 'Weapon', 'equipment', 120, '02_01', { slot: 'weapon', stats: { atk: 15 }, proc: P('furnace', { steel_ingot: 2 }) }),
  knight_armor: I('HL-R002', 'Knight Armor', 'เกราะอัศวิน', 'rare', 'Armor', 'equipment', 180, '02_02', { slot: 'armor', stats: { def: 15, hp: 70 }, proc: P('furnace', { steel_ingot: 3 }) }),
  enchanted_shield: I('HL-R003', 'Enchanted Shield', 'โล่เวท', 'rare', 'Shield', 'equipment', 160, '02_03', { slot: 'accessory', stats: { def: 10, mdef: 12 }, proc: P('alchemy', { magic_dust: 2 }) }),
  hunter_bow: I('HL-R004', 'Hunter Bow', 'ธนูนักล่า', 'rare', 'Weapon', 'equipment', 110, '02_06', { slot: 'weapon', stats: { atk: 12, acc: 10 }, proc: P('workbench', { wood: 1, monster_leather: 1 }) }),
  magic_ring: I('HL-R005', 'Magic Ring', 'แหวนเวท', 'rare', 'Accessory', 'equipment', 250, '02_10', { slot: 'accessory', stats: { matk: 14, mp: 20 }, proc: P('alchemy', { magic_dust: 3 }) }),
  blue_mana_crystal: I('HL-R006', 'Blue Mana Crystal', 'คริสตัลมานาสีน้ำเงิน', 'rare', 'Gem', 'gem', 200, '02_05', { proc: P('workbench', { monster_core: 1 }, 150) }),
  healing_potion: I('HL-R007', 'Healing Potion', 'ยาฟื้นฟู', 'rare', 'Potion', 'food', 80, '08_02', { use: { heal: 0.6 } }),
  hero_medal: I('HL-R008', 'Hero Medal', 'เหรียญผู้กล้า', 'rare', 'Trophy', 'loot', 300, '02_04', { proc: P('trophy', { hero_trophy: 1 }), procIn: 3 }),
  hunter_cape: I('HL-R009', 'Monster Hunter Cape', 'ผ้าคลุมนักล่าอสูร', 'rare', 'Cloth', 'equipment', 150, '01_05', { slot: 'accessory', stats: { mdef: 8, hp: 40 }, proc: P('workbench', { cloth: 3 }) }),
  enchanted_scroll: I('HL-R010', 'Enchanted Scroll', 'คัมภีร์เวท', 'rare', 'Scroll', 'loot', 350, '03_04a', { proc: P('extractor', { arcane_essence: 1 }) }),
  // ---------- Hero Loot: Epic ----------
  dragon_slayer_sword: I('HL-E001', 'Dragon Slayer Sword', 'ดาบสังหารมังกร', 'epic', 'Weapon', 'equipment', 1000, '03_01', { slot: 'weapon', stats: { atk: 45, crit: 0.05 } }),
  abyssal_armor: I('HL-E002', 'Abyssal Armor', 'เกราะห้วงลึก', 'epic', 'Armor', 'equipment', 1200, '03_02', { slot: 'armor', stats: { def: 40, mdef: 25, hp: 220 } }),
  arcane_crystal: I('HL-E003', 'Arcane Crystal', 'คริสตัลอาคม', 'epic', 'Gem', 'gem', 900, '03_03', { proc: P('workbench', { monster_core: 2 }, 300) }),
  ancient_spellbook: I('HL-E004', 'Ancient Spellbook', 'ตำราโบราณ', 'epic', 'Book', 'loot', 1100, '03_04b', { proc: P('extractor', { arcane_essence: 3 }) }),
  hero_soul_fragment: I('HL-E005', 'Hero Soul Fragment', 'เศษวิญญาณผู้กล้า', 'epic', 'Soul', 'material', 150, '06_04', { proc: P('extractor', { soul_energy: 1 }) }),
  // ---------- Hero Loot: Legendary ----------
  excalibur_fragment: I('HL-L001', 'Excalibur Fragment', 'เศษเอ็กซ์คาลิเบอร์', 'legendary', 'Weapon Material', 'special', 3000, '04_00', { proc: P('workbench', { dragon_slayer_sword: 1 }, 1500) }),
  dragon_king_crown: I('HL-L002', 'Dragon King Crown', 'มงกุฎราชามังกร', 'legendary', 'Accessory', 'equipment', 4000, '04_05', { slot: 'accessory', stats: { atk: 25, matk: 25, def: 20, hp: 150 } }),
  phoenix_soul: I('HL-L003', 'Phoenix Soul', 'วิญญาณฟีนิกซ์', 'legendary', 'Soul', 'special', 5000, '04_04'),
  ancient_dragon_heart: I('HL-L004', 'Ancient Dragon Heart', 'หัวใจมังกรโบราณ', 'legendary', 'Heart', 'special', 6000, '04_03'),
  hero_kings_emblem: I('HL-L005', "Hero King's Emblem", 'ตราราชาผู้กล้า', 'legendary', 'Emblem', 'special', 5000, '04_02'),
  // ---------- Hero Remains ----------
  hero_meat: I('HR-001', 'Hero Meat', 'เนื้อผู้กล้า', 'uncommon', 'Cuisine Material', 'food', 20, '05_00'),
  hero_bone: I('HR-002', 'Hero Bone', 'กระดูกผู้กล้า', 'common', 'Cuisine Material', 'material', 10, '05_05', { proc: P('workbench', { bone_meal: 1 }) }),
  hero_blood: I('HR-003', 'Hero Blood Vial', 'เลือดผู้กล้า', 'rare', 'Cuisine Material', 'food', 35, '05_02'),
  hero_hair: I('HR-004', 'Hero Hair', 'เส้นผมผู้กล้า', 'common', 'Material', 'material', 5, '05_06'),
  hero_heart: I('HR-005', 'Hero Heart', 'หัวใจผู้กล้า', 'epic', 'Cuisine Material', 'food', 150, '05_04'),
  // ---------- Processing Materials ----------
  scrap_metal: I('PM-001', 'Scrap Metal', 'เศษเหล็ก', 'common', 'Material', 'material', 15, '06_06', { proc: P('furnace', { steel_ingot: 1 }), procIn: 3 }),
  steel_ingot: I('PM-002', 'Steel Ingot', 'แท่งเหล็กกล้า', 'uncommon', 'Material', 'material', 60, '06_01'),
  monster_leather: I('PM-003', 'Monster Leather', 'หนังมอนสเตอร์', 'uncommon', 'Material', 'material', 40, '06_02'),
  magic_dust: I('PM-004', 'Magic Dust', 'ผงเวท', 'rare', 'Material', 'material', 75, '12_09'),
  soul_energy: I('PM-005', 'Soul Energy', 'พลังวิญญาณ', 'rare', 'Material', 'material', 100, '09_09'),
  arcane_essence: I('PM-006', 'Arcane Essence', 'แก่นอาคม', 'epic', 'Material', 'material', 150, '06_05'),
  cloth: I('PM-X01', 'Cloth', 'ผ้า', 'common', 'Material', 'material', 6, '06_03'),
  wood: I('PM-X02', 'Wood', 'ไม้', 'common', 'Material', 'material', 4, '12_05'),
  bone_meal: I('PM-X03', 'Bone Meal', 'ผงกระดูก', 'common', 'Material', 'material', 8, '12_02', { proc: P('kitchen', { bread: 1 }) }),
  // ---------- Elemental Gems ----------
  fire_crystal: I('GEM-001', 'Fire Crystal', 'คริสตัลไฟ', 'rare', 'Elemental Gem', 'gem', 100, '07_00'),
  ice_crystal: I('GEM-002', 'Ice Crystal', 'คริสตัลน้ำแข็ง', 'rare', 'Elemental Gem', 'gem', 100, '07_02'),
  lightning_crystal: I('GEM-003', 'Lightning Crystal', 'คริสตัลสายฟ้า', 'rare', 'Elemental Gem', 'gem', 120, '07_03'),
  earth_crystal: I('GEM-004', 'Earth Crystal', 'คริสตัลดิน', 'rare', 'Elemental Gem', 'gem', 100, '07_06'),
  poison_crystal: I('GEM-005', 'Poison Crystal', 'คริสตัลพิษ', 'epic', 'Elemental Gem', 'gem', 150, '07_04'),
  void_crystal: I('GEM-006', 'Void Crystal', 'คริสตัลห้วงมิติ', 'epic', 'Elemental Gem', 'gem', 300, '07_05'),
  // ---------- Hero Supplies ----------
  bread: I('HS-001', 'Bread', 'ขนมปัง', 'common', 'Supply', 'food', 5, '08_00'),
  red_potion: I('HS-002', 'Red Potion', 'ยาแดง', 'common', 'Potion', 'food', 25, '08_02', { use: { heal: 0.4 } }),
  blue_potion: I('HS-003', 'Blue Potion', 'ยาน้ำเงิน', 'common', 'Potion', 'food', 25, '08_03', { use: { mp: 1, fatigue: -15 } }),
  green_potion: I('HS-004', 'Green Potion', 'ยาเขียว', 'uncommon', 'Potion', 'food', 30, '08_04', { use: { fatigue: -40, cure: true } }),
  hero_ration: I('HS-005', 'Hero Ration', 'เสบียงผู้กล้า', 'uncommon', 'Supply', 'food', 40, '08_06', { use: { hunger: -50, loyalty: 10, fatigue: -10 } }),
  healing_scroll: I('HS-006', 'Healing Scroll', 'คัมภีร์รักษา', 'rare', 'Scroll', 'food', 100, '08_05', { use: { heal: 1, cure: true } }),
  // ---------- Additional Drops ----------
  monster_claw: I('AD-001', 'Monster Claw', 'กรงเล็บมอนสเตอร์', 'common', 'Material', 'material', 15, '09_05'),
  monster_fang: I('AD-002', 'Monster Fang', 'เขี้ยวมอนสเตอร์', 'common', 'Material', 'material', 20, '09_07'),
  monster_hide: I('AD-003', 'Monster Hide', 'หนังดิบ', 'uncommon', 'Material', 'material', 30, '12_06', { proc: P('workbench', { monster_leather: 1 }) }),
  magic_flower: I('AD-004', 'Magic Flower', 'ดอกไม้เวท', 'uncommon', 'Material', 'food', 50, '09_02'),
  poison_mushroom: I('AD-005', 'Poison Mushroom', 'เห็ดพิษ', 'uncommon', 'Material', 'food', 35, '09_03'),
  rare_mushroom: I('AD-006', 'Rare Mushroom', 'เห็ดหายาก', 'rare', 'Material', 'food', 100, '09_04'),
  spider_silk: I('AD-007', 'Spider Silk', 'ใยแมงมุม', 'uncommon', 'Material', 'material', 40, '09_06', { proc: P('workbench', { cloth: 2 }) }),
  monster_eye: I('AD-008', 'Monster Eye', 'ดวงตามอนสเตอร์', 'rare', 'Material', 'material', 60, '09_08'),
  fire_essence: I('AD-009', 'Fire Essence', 'แก่นไฟ', 'rare', 'Material', 'material', 100, '02_07'),
  shadow_essence: I('AD-010', 'Shadow Essence', 'แก่นเงา', 'epic', 'Material', 'material', 150, '03_03'),
  // ---------- Special (ระบบเกม) ----------
  hero_trophy: I('SP-001', 'Hero Trophy', 'ถ้วยรางวัลผู้กล้า', 'epic', 'Trophy', 'special', 1300, '13_10'),
  evolution_crystal: I('SP-002', 'Evolution Crystal', 'คริสตัลวิวัฒนาการ', 'rare', 'Crystal', 'special', 250, '02_09'),
  fusion_crystal: I('SP-003', 'Fusion Crystal', 'คริสตัลผสม', 'rare', 'Crystal', 'special', 300, '02_08'),
  monster_core: I('SP-004', 'Monster Core', 'แกนมอนสเตอร์', 'epic', 'Crystal', 'special', 600, '12_03'),
  boss_soul: I('SP-005', 'Boss Soul', 'วิญญาณบอส', 'legendary', 'Soul', 'special', 3000, '04_04'),
};

// ---------- Monster Cuisine (recipes.json) ----------
// buff: hp/atk/def/matk/mp/aspd/lifesteal/exp = % | dmg_<ธาตุ> = เพิ่มดาเมจธาตุ | res_<ธาตุ> = ต้านธาตุ
// hours = เวลาบัฟในเกม (เอกสารระบุเป็นนาที → แปลง 30 นาที = 12 ชม.เกม)
const F = (code, name, th, icon, rarity, ingredients, buff, minutes, desc) => ({ code, name, th, icon, rarity, ingredients, buff, hours: minutes * 0.4, cookHours: Math.max(1, minutes / 30), desc });
export const RECIPES = {
  food_001: F('FOOD-001', 'Hero Meat Stew', 'สตูว์เนื้อผู้กล้า', '10_00', 'common', { hero_meat: 2, bread: 1 }, { hp: 0.10 }, 30, 'HP +10%'),
  food_002: F('FOOD-002', 'Roasted Hero Skewer', 'เนื้อเสียบไม้ย่าง', '10_02', 'common', { hero_meat: 1, monster_claw: 1 }, { atk: 0.05 }, 30, 'ATK +5%'),
  food_003: F('FOOD-003', 'Mana Mushroom Soup', 'ซุปเห็ดมานา', '10_03', 'uncommon', { magic_flower: 1, rare_mushroom: 1 }, { mp: 0.10, matk: 0.03 }, 30, 'Mana +10%'),
  food_004: F('FOOD-004', 'Crystal Jelly', 'เจลลี่คริสตัล', '10_04', 'uncommon', { blue_mana_crystal: 1 }, { matk: 0.08 }, 45, 'Magic ATK +8%'),
  food_005: F('FOOD-005', 'Fire Dragon Curry', 'แกงมังกรไฟ', '10_10', 'rare', { fire_crystal: 1, hero_meat: 2 }, { dmg_fire: 0.10 }, 60, 'Fire ATK +10%'),
  food_006: F('FOOD-006', 'Ice Crystal Soup', 'ซุปคริสตัลน้ำแข็ง', '10_11', 'rare', { ice_crystal: 1, hero_meat: 1 }, { res_ice: 0.10 }, 60, 'Ice Resistance +10%'),
  food_007: F('FOOD-007', 'Thunder Beast Steak', 'สเต๊กอสูรสายฟ้า', '10_12', 'rare', { lightning_crystal: 1, hero_meat: 2 }, { aspd: 0.08 }, 60, 'ATK Speed +8%'),
  food_008: F('FOOD-008', 'Earth Golem Bread', 'ขนมปังโกเลมดิน', '10_17', 'rare', { earth_crystal: 1, bread: 2 }, { def: 0.10 }, 60, 'DEF +10%'),
  food_009: F('FOOD-009', 'Poison Mushroom Roast', 'เห็ดพิษย่าง', '10_05', 'uncommon', { poison_mushroom: 2, hero_meat: 1 }, { dmg_poison: 0.10 }, 60, 'Poison ATK +10%'),
  food_010: F('FOOD-010', 'Shadow Soul Pudding', 'พุดดิ้งวิญญาณเงา', '10_15', 'epic', { shadow_essence: 1, hero_soul_fragment: 1 }, { dmg_dark: 0.12 }, 90, 'Dark ATK +12%'),
  food_011: F('FOOD-011', 'Monster Feast', 'งานเลี้ยงมอนสเตอร์', '10_09', 'uncommon', { hero_meat: 3, bread: 2 }, { hp: 0.15 }, 60, 'HP +15%'),
  food_012: F('FOOD-012', 'Blood Sausage', 'ไส้กรอกเลือด', '10_06', 'rare', { hero_blood: 1, hero_meat: 1 }, { lifesteal: 0.03 }, 60, 'Lifesteal +3%'),
  food_013: F('FOOD-013', 'Bone Marrow Soup', 'ซุปไขกระดูก', '10_07', 'common', { hero_bone: 2, hero_meat: 1 }, { def: 0.08 }, 60, 'DEF +8%'),
  food_014: F('FOOD-014', 'Arcane Cake', 'เค้กอาคม', '10_13', 'epic', { arcane_essence: 1, bread: 1 }, { matk: 0.12 }, 90, 'Magic ATK +12%'),
  food_015: F('FOOD-015', 'Phoenix Roast', 'ฟีนิกซ์ย่าง', '10_16', 'legendary', { phoenix_soul: 1, hero_meat: 2 }, { hp: 0.25, healFull: 1 }, 120, 'ฟื้น HP เต็ม + Max HP +25%'),
  food_016: F('FOOD-016', 'Dragon Heart Steak', 'สเต๊กหัวใจมังกร', '10_14', 'legendary', { ancient_dragon_heart: 1 }, { atk: 0.20 }, 120, 'ATK +20%'),
  food_017: F('FOOD-017', "Hero King's Banquet", 'งานเลี้ยงราชาผู้กล้า', '10_18', 'legendary', { hero_kings_emblem: 1, hero_meat: 3 }, { atk: 0.15, def: 0.15 }, 120, 'ATK/DEF +15%'),
  food_018: F('FOOD-018', 'Void Crystal Pudding', 'พุดดิ้งคริสตัลห้วงมิติ', '10_08', 'epic', { void_crystal: 1, magic_flower: 1 }, { res_dark: 0.15 }, 120, 'Dark Resistance +15%'),
  food_019: F('FOOD-019', 'Monster Growth Meal', 'อาหารเร่งโต', '10_19', 'rare', { hero_meat: 2, rare_mushroom: 2 }, { exp: 0.20 }, 120, 'EXP Gain +20%'),
  food_020: F('FOOD-020', 'Legendary Monster Feast', 'งานเลี้ยงมอนสเตอร์ตำนาน', '10_20', 'legendary', { excalibur_fragment: 1, hero_meat: 3 }, { atk: 0.15, def: 0.15, hp: 0.15 }, 180, 'ATK/DEF/HP +15%'),
};
// อาหารที่ปรุงแล้วเป็นไอเทม (ป้อนให้มอนสเตอร์)
for (const [id, r] of Object.entries(RECIPES)) {
  ITEMS[id] = I(r.code, r.name, r.th, r.rarity, 'Monster Cuisine', 'food', Math.round(Object.keys(r.ingredients).reduce((s, k) => s + (ITEMS[k]?.price || 10) * r.ingredients[k], 0) * 1.1), r.icon, { feed: id });
}

// ---------- Processing Stations (processing_stations.json + Processing ทั่วไป) ----------
export const STATIONS = {
  furnace: { code: 'ST-001', name: 'Scrap Furnace', th: 'เตาหลอม', icon: '11_00', cost: 300, unlock: 1, desc: 'หลอมอุปกรณ์เป็นเศษเหล็ก/แท่งเหล็ก' },
  workbench: { code: 'ST-000', name: 'Processing Bench', th: 'โต๊ะแปรรูป', icon: '13_06', cost: 250, unlock: 1, desc: 'แปรรูปหนัง ผ้า ไม้ และคราฟต์ของหายาก' },
  kitchen: { code: 'ST-003', name: 'Monster Kitchen', th: 'ครัวมอนสเตอร์', icon: '11_04', cost: 500, unlock: 1, desc: 'ปรุงอาหารมอนสเตอร์เพื่อบัฟชั่วคราว' },
  alchemy: { code: 'ST-004', name: 'Alchemy Lab', th: 'ห้องปรุงยา', icon: '11_03', cost: 900, unlock: 2, desc: 'สกัดผงเวทและปรุงยา' },
  extractor: { code: 'ST-002', name: 'Soul Extractor', th: 'เครื่องสกัดวิญญาณ', icon: '11_02', cost: 1500, unlock: 3, desc: 'สกัดพลังวิญญาณและแก่นอาคม' },
  trophy: { code: 'ST-005', name: 'Trophy Workshop', th: 'โรงสร้างถ้วยรางวัล', icon: '12_00', cost: 2500, unlock: 3, desc: 'เหรียญผู้กล้า x3 → ถ้วยรางวัล (ขายได้แพงกว่า)' },
};

// ---------- Drop tables (system_rules.json) ----------
export const DROP_POOL_CATS = ['HL', 'HS', 'GEM', 'AD']; // ประเภทที่สุ่มได้จากการทอยลูท
export const REMAINS = ['hero_meat', 'hero_bone', 'hero_blood', 'hero_hair', 'hero_heart', 'hero_soul_fragment'];
export const SUPPLIES = ['bread', 'red_potion', 'blue_potion', 'green_potion', 'hero_ration', 'healing_scroll'];

// ร้านค้า Merchant (ราคาซื้อ = ราคาขาย x buyMult)
export const SHOP = [
  { item: 'bread', unlock: 1 }, { item: 'red_potion', unlock: 1 }, { item: 'blue_potion', unlock: 1 }, { item: 'green_potion', unlock: 1 },
  { item: 'hero_ration', unlock: 1 }, { item: 'rusty_sword', unlock: 1 }, { item: 'damaged_armor', unlock: 1 }, { item: 'wooden_shield', unlock: 1 },
  { item: 'evolution_crystal', unlock: 2 }, { item: 'fusion_crystal', unlock: 2 }, { item: 'steel_sword', unlock: 3 }, { item: 'knight_armor', unlock: 3 },
  { item: 'monster_core', unlock: 4 }, { item: 'magic_ring', unlock: 4 },
];

// แปลงไอเทมจากเซฟเก่า
export const LEGACY_ITEMS = {
  dagger: 'rusty_sword', iron_sword: 'steel_sword', apprentice_staff: 'magic_ring', short_bow: 'hunter_bow', battle_axe: 'steel_sword',
  holy_sword: 'dragon_slayer_sword', bone_staff: 'magic_ring', dragon_blade: 'dragon_slayer_sword', iron_blade: 'steel_sword',
  leather_armor: 'damaged_armor', cloth_robe: 'hunter_cape', chain_mail: 'knight_armor', plate_armor: 'knight_armor', dark_robe: 'abyssal_armor',
  hide_vest: 'damaged_armor', iron_helm: 'wooden_shield', mana_ring: 'magic_ring', thief_ring: 'leather_boots', hunter_ring: 'magic_ring',
  holy_amulet: 'enchanted_shield', bone_charm: 'wooden_shield', dragon_scale_ring: 'dragon_king_crown', health_potion: 'red_potion',
  stamina_tonic: 'green_potion', loyalty_treat: 'hero_ration', bone: 'hero_bone', hide: 'monster_leather', mana_gel: 'magic_dust', iron_scrap: 'scrap_metal',
};

export const INV_TABS = [['all', 'ทั้งหมด'], ['loot', 'ของดรอป'], ['equipment', 'อุปกรณ์'], ['material', 'วัตถุดิบ'], ['gem', 'อัญมณี'], ['food', 'อาหาร/ยา'], ['special', 'พิเศษ']];
