// ฐานข้อมูลมอนสเตอร์ 100+ ชนิด (Monster System Design Bible)
// ค่าสถานะสร้างจาก Role Template × Rarity Power แล้ว override ด้วยค่าจากเอกสารเมื่อมีระบุ
// เพิ่มมอนสเตอร์ใหม่ = เพิ่มหนึ่งบรรทัดใน TABLE (และ sprite ใน assets/sprites/atlas.json)

// Role template (Common, Lv.1) — HP ATK MATK DEF MDEF SPD RANGE
export const ROLE_TEMPLATES = {
  tank:       { hp: 210, atk: 18, matk: 8, def: 22, mdef: 16, spd: 75, range: 1, aspd: 0.9 },
  bruiser:    { hp: 160, atk: 24, matk: 8, def: 13, mdef: 10, spd: 105, range: 1, aspd: 1.0 },
  dps:        { hp: 125, atk: 27, matk: 8, def: 10, mdef: 9, spd: 110, range: 1, aspd: 1.1 },
  ranged:     { hp: 115, atk: 26, matk: 10, def: 9, mdef: 10, spd: 105, range: 4, aspd: 1.0 },
  mage:       { hp: 105, atk: 8, matk: 32, def: 8, mdef: 22, spd: 90, range: 3.6, aspd: 0.9 },
  assassin:   { hp: 100, atk: 30, matk: 8, def: 8, mdef: 8, spd: 145, range: 1, aspd: 1.2 },
  support:    { hp: 140, atk: 10, matk: 22, def: 12, mdef: 20, spd: 85, range: 3, aspd: 0.9 },
  healer:     { hp: 130, atk: 8, matk: 24, def: 10, mdef: 22, spd: 85, range: 3, aspd: 0.9 },
  controller: { hp: 150, atk: 14, matk: 24, def: 14, mdef: 18, spd: 85, range: 2.6, aspd: 0.9 },
  summoner:   { hp: 120, atk: 8, matk: 26, def: 10, mdef: 20, spd: 85, range: 3.4, aspd: 0.9 },
  worker:     { hp: 110, atk: 12, matk: 5, def: 10, mdef: 8, spd: 120, range: 1, aspd: 1.0 },
};
export const ROLE_TH = {
  tank: 'Tank', bruiser: 'Bruiser', dps: 'DPS', ranged: 'Ranged', mage: 'Mage', assassin: 'Assassin', support: 'Support',
  healer: 'Healer', controller: 'Controller', summoner: 'Summoner', worker: 'Utility / Worker', boss: 'Boss',
};
// การเติบโตต่อเลเวล (สูตร: Base × [1 + (Lv-1) × Growth] × Tier)
export const ROLE_GROWTH = {
  tank: { hp: 0.09, atk: 0.06, matk: 0.05, def: 0.08, mdef: 0.07 },
  bruiser: { hp: 0.085, atk: 0.075, matk: 0.05, def: 0.065, mdef: 0.055 },
  dps: { hp: 0.075, atk: 0.085, matk: 0.05, def: 0.055, mdef: 0.05 },
  ranged: { hp: 0.07, atk: 0.085, matk: 0.05, def: 0.05, mdef: 0.055 },
  mage: { hp: 0.07, atk: 0.04, matk: 0.09, def: 0.05, mdef: 0.075 },
  assassin: { hp: 0.07, atk: 0.09, matk: 0.05, def: 0.05, mdef: 0.05 },
  support: { hp: 0.08, atk: 0.05, matk: 0.08, def: 0.06, mdef: 0.075 },
  healer: { hp: 0.08, atk: 0.04, matk: 0.085, def: 0.055, mdef: 0.08 },
  controller: { hp: 0.08, atk: 0.06, matk: 0.08, def: 0.065, mdef: 0.07 },
  summoner: { hp: 0.075, atk: 0.04, matk: 0.085, def: 0.055, mdef: 0.075 },
  worker: { hp: 0.07, atk: 0.06, matk: 0.04, def: 0.06, mdef: 0.05 },
};
export const RARITY_POWER = { common: 1, uncommon: 1.35, rare: 1.9, epic: 2.7, legendary: 3.8, mythic: 5.4 };
export const RARITY_COST = { common: 70, uncommon: 220, rare: 700, epic: 2400, legendary: 9000, mythic: 32000 };
export const RARITY_UPKEEP = { common: 5, uncommon: 9, rare: 20, epic: 45, legendary: 100, mythic: 300 };
export const RARITY_FOOD = { common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8, mythic: 15 };
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const ROLE_SKILLS = {
  tank: ['stone_skin', 'taunt_roar'], bruiser: ['body_slam', 'rock_slam'], dps: ['quick_slash', 'bite'],
  ranged: ['bolt_physical', 'web_shot'], assassin: ['shadow_step', 'drain_bite'], support: ['pack_hunt', 'spore_heal'],
  healer: ['spore_heal', 'heal_light'], controller: ['curse', 'freeze_touch'], summoner: ['summon_minion', 'drain_soul'],
  worker: ['body_slam', 'stone_skin'], mage: ['bolt_physical', 'arcane_burst'],
};
const FOOD = { slime: 'Mana Gel', beast: 'Meat', goblin: 'Meat', undead: 'Bone Dust', construct: 'Ore', plant: 'Water', insect: 'Raw Meat', demon: 'Dark Crystal', dragon: 'Dragon Feed', spirit: 'Mana Gel', aquatic: 'Fish', holy: 'Holy Water', elemental: 'Mana Gel' };

// id: [ชื่อ, role, ธาตุ, rarity, Dungeon Level ที่จ้างได้ (0 = ได้จากวิวัฒนาการ/Fusion เท่านั้น), family, skills?, options?]
const TABLE = {
  // ----- Dungeon Lv.1 — Abandoned Cave -----
  slime: ['Slime', 'bruiser', 'water', 'common', 1, 'slime', ['body_slam', 'regenerate'], { base: { hp: 100, atk: 12, matk: 8, def: 8, mdef: 10, spd: 80 }, cost: 50, clean: 1.3, weak: ['lightning'] }],
  goblin: ['Goblin', 'bruiser', 'physical', 'common', 1, 'goblin', ['quick_slash', 'goblin_trick'], { base: { hp: 160, atk: 25, matk: 8, def: 12, mdef: 8, spd: 120 }, cost: 80, weak: ['fire'] }],
  skeleton: ['Skeleton', 'dps', 'dark', 'common', 1, 'undead', ['bone_slash', 'bone_shield'], { base: { hp: 120, atk: 22, matk: 5, def: 10, mdef: 8, spd: 100 }, cost: 100, resist: { poison: 0.5 }, weak: ['light'] }],
  bat: ['Bat', 'assassin', 'wind', 'common', 1, 'beast', ['drain_bite', 'sonic_wave'], { cost: 60, weak: ['lightning'] }],
  rat: ['Dungeon Rat', 'worker', 'physical', 'common', 1, 'beast', ['bite', 'body_slam'], { cost: 45, clean: 1.7 }],
  wolf: ['Wolf', 'bruiser', 'physical', 'common', 1, 'beast', ['bite', 'pack_hunt'], { base: { hp: 180, atk: 30, matk: 5, def: 15, mdef: 8, spd: 150 }, cost: 130, weak: ['fire'] }],
  mushroom: ['Mushroom', 'support', 'nature', 'common', 1, 'plant', ['spore_heal', 'spore_cloud'], { base: { hp: 150, atk: 10, matk: 20, def: 10, mdef: 20, spd: 50 }, cost: 110, weak: ['fire'] }],
  boar: ['Boar', 'tank', 'physical', 'common', 1, 'beast', ['body_slam', 'taunt_roar'], { cost: 120 }],
  ghost: ['Ghost', 'mage', 'dark', 'uncommon', 1, 'spirit', ['bolt_dark', 'curse'], { cost: 180, clean: 1.4, resist: { physical: 0.6 }, weak: ['light'] }],
  pink_slime: ['Pink Slime', 'healer', 'light', 'uncommon', 1, 'slime', ['heal_light', 'regenerate'], { cost: 170, clean: 1.2 }],
  // ----- Dungeon Lv.2 — Goblin Hideout -----
  goblin_archer: ['Goblin Archer', 'ranged', 'physical', 'uncommon', 2, 'goblin', ['bolt_physical', 'venom_bite'], { base: { hp: 140, atk: 28, matk: 10, def: 10, mdef: 10, spd: 120, range: 4 } }],
  goblin_shaman: ['Goblin Shaman', 'support', 'nature', 'rare', 2, 'goblin', ['spore_heal', 'curse'], { base: { hp: 180, atk: 15, matk: 40, def: 15, mdef: 25, spd: 90, range: 3 } }],
  cave_spider: ['Cave Spider', 'controller', 'poison', 'uncommon', 2, 'insect', ['web_shot', 'venom_bite'], { weak: ['fire'] }],
  mimic: ['Mimic', 'assassin', 'dark', 'rare', 2, 'construct', ['mimic_ambush', 'curse'], { clean: 1.3, weak: ['fire'] }],
  imp: ['Imp', 'mage', 'fire', 'uncommon', 2, 'demon', ['bolt_fire', 'burn_field'], { weak: ['water'] }],
  zombie: ['Zombie', 'tank', 'dark', 'common', 2, 'undead', ['bite', 'taunt_roar'], { resist: { poison: 0.3 }, weak: ['fire', 'light'] }],
  lizardman: ['Lizardman', 'bruiser', 'water', 'uncommon', 2, 'aquatic', ['quick_slash', 'bolt_water'], {}],
  eyeball: ['Floating Eye', 'controller', 'arcane', 'uncommon', 2, 'spirit', ['curse', 'nova_arcane'], {}],
  // ----- Dungeon Lv.3 — Skeleton Crypt -----
  skeleton_archer: ['Skeleton Archer', 'ranged', 'dark', 'uncommon', 3, 'undead', ['bolt_physical', 'bone_shield'], { resist: { poison: 0.5 }, weak: ['light'] }],
  ghoul: ['Ghoul', 'dps', 'dark', 'uncommon', 3, 'undead', ['bite', 'drain_bite'], { weak: ['light', 'fire'] }],
  mummy: ['Mummy', 'tank', 'dark', 'uncommon', 3, 'undead', ['curse', 'taunt_roar'], { weak: ['fire'] }],
  banshee: ['Banshee', 'controller', 'dark', 'rare', 3, 'spirit', ['sonic_wave', 'curse'], { resist: { physical: 0.6 }, weak: ['light'] }],
  reaper: ['Reaper', 'assassin', 'dark', 'rare', 3, 'undead', ['shadow_step', 'drain_soul'], { weak: ['light'] }],
  golem: ['Golem', 'tank', 'earth', 'uncommon', 3, 'construct', ['rock_slam', 'stone_skin'], { clean: 1.2, weak: ['water'] }],
  dark_knight: ['Dark Knight', 'bruiser', 'dark', 'rare', 3, 'undead', ['shield_bash', 'drain_soul'], { weak: ['light'] }],
  scorpion: ['Scorpion', 'bruiser', 'poison', 'rare', 3, 'insect', ['tail_sting', 'stone_skin'], { weak: ['ice'] }],
  // ----- Dungeon Lv.4 — Crystal Dungeon -----
  water_slime: ['Water Slime', 'controller', 'water', 'uncommon', 4, 'slime', ['bolt_water', 'nova_water'], { weak: ['lightning'] }],
  nixie: ['Nixie', 'healer', 'water', 'rare', 4, 'aquatic', ['heal_light', 'bolt_water'], {}],
  aqua_beast: ['Aqua Beast', 'bruiser', 'water', 'rare', 4, 'aquatic', ['bite', 'nova_water'], {}],
  merfolk: ['Merfolk', 'ranged', 'water', 'rare', 4, 'aquatic', ['bolt_water', 'web_shot'], {}],
  wind_sprite: ['Wind Sprite', 'support', 'wind', 'uncommon', 4, 'spirit', ['pack_hunt', 'gust'], {}],
  sylph: ['Sylph', 'mage', 'wind', 'rare', 4, 'spirit', ['bolt_wind', 'gust'], {}],
  harpy: ['Harpy', 'assassin', 'wind', 'uncommon', 4, 'beast', ['shadow_step', 'gust'], { weak: ['lightning'] }],
  spark_slime: ['Spark Slime', 'dps', 'lightning', 'uncommon', 4, 'slime', ['thunder_strike', 'body_slam'], { weak: ['earth'] }],
  thunder_imp: ['Thunder Imp', 'mage', 'lightning', 'rare', 4, 'demon', ['thunder_strike', 'nova_lightning'], {}],
  clockwork: ['Clockwork', 'ranged', 'arcane', 'rare', 4, 'construct', ['bolt_physical', 'arcane_burst'], { resist: { poison: 0 } }],
  trap_golem: ['Trap Golem', 'controller', 'earth', 'rare', 4, 'construct', ['rock_slam', 'web_shot'], { resist: { poison: 0 } }],
  wisp: ['Wisp', 'mage', 'arcane', 'uncommon', 4, 'spirit', ['bolt_arcane', 'arcane_burst'], {}],
  jelly: ['Jelly', 'controller', 'water', 'uncommon', 4, 'aquatic', ['thunder_strike', 'toxic_spray'], {}],
  // ----- Dungeon Lv.5 — Lava Dungeon -----
  fire_slime: ['Fire Slime', 'mage', 'fire', 'uncommon', 5, 'slime', ['bolt_fire', 'burn_field'], { base: { hp: 130, atk: 12, matk: 25, def: 10, mdef: 15, spd: 90, range: 2 }, weak: ['water', 'ice'] }],
  flame_imp: ['Flame Imp', 'mage', 'fire', 'rare', 5, 'demon', ['bolt_fire', 'nova_fire'], { weak: ['water'] }],
  fire_hound: ['Hellhound', 'dps', 'fire', 'epic', 5, 'beast', ['bite', 'burn_field'], { resist: { fire: 0.5 }, weak: ['water', 'ice'] }],
  salamander: ['Salamander', 'ranged', 'fire', 'rare', 5, 'beast', ['bolt_fire', 'regenerate'], { weak: ['water'] }],
  lava_beast: ['Lava Beast', 'tank', 'fire', 'rare', 5, 'elemental', ['rock_slam', 'burn_field'], { resist: { fire: 0.3 }, weak: ['water'] }],
  fire_drake: ['Fire Drake', 'mage', 'fire', 'rare', 5, 'dragon', ['bolt_fire', 'dragon_breath'], { weak: ['ice'] }],
  ifrit: ['Ifrit', 'mage', 'fire', 'epic', 5, 'elemental', ['nova_fire', 'bolt_fire'], { resist: { fire: 0 }, weak: ['water'] }],
  rock_slime: ['Rock Slime', 'tank', 'earth', 'uncommon', 5, 'slime', ['stone_skin', 'body_slam'], { weak: ['water'] }],
  earth_worm: ['Earth Worm', 'bruiser', 'earth', 'uncommon', 5, 'insect', ['bite', 'rock_slam'], {}],
  ogre: ['Ogre', 'bruiser', 'physical', 'rare', 5, 'goblin', ['body_slam', 'taunt_roar'], { weak: ['arcane'] }],
  troll: ['Troll', 'tank', 'earth', 'rare', 5, 'goblin', ['regenerate', 'rock_slam'], { weak: ['fire'] }],
  // ----- Dungeon Lv.6 — Frozen Dungeon -----
  ice_slime: ['Ice Slime', 'controller', 'ice', 'uncommon', 6, 'slime', ['bolt_ice', 'freeze_touch'], { base: { hp: 140, atk: 15, matk: 20, def: 12, mdef: 18, spd: 70, range: 2 }, weak: ['fire'] }],
  frost_wolf: ['Frost Wolf', 'dps', 'ice', 'rare', 6, 'beast', ['bite', 'freeze_touch'], { weak: ['fire'] }],
  ice_golem: ['Ice Golem', 'tank', 'ice', 'rare', 6, 'construct', ['stone_skin', 'freeze_touch'], { weak: ['fire'] }],
  snowman: ['Snowman', 'ranged', 'ice', 'uncommon', 6, 'elemental', ['bolt_ice', 'freeze_touch'], { weak: ['fire'] }],
  frost_witch: ['Frost Witch', 'mage', 'ice', 'epic', 6, 'demon', ['bolt_ice', 'nova_ice'], { weak: ['fire'] }],
  poison_slime: ['Poison Slime', 'controller', 'poison', 'rare', 6, 'slime', ['toxic_spray', 'regenerate'], { base: { hp: 180, atk: 20, matk: 25, def: 15, mdef: 20, spd: 60, range: 2 }, weak: ['fire'] }],
  plant_monster: ['Plant Monster', 'tank', 'nature', 'uncommon', 6, 'plant', ['root_slam', 'regenerate'], { weak: ['fire'] }],
  venus_trap: ['Venus Trap', 'dps', 'nature', 'rare', 6, 'plant', ['bite', 'toxic_spray'], { weak: ['fire'] }],
  spore_mage: ['Spore Mage', 'mage', 'poison', 'rare', 6, 'plant', ['toxic_spray', 'spore_cloud'], { weak: ['fire'] }],
  mandrake: ['Mandrake', 'controller', 'nature', 'rare', 6, 'plant', ['sonic_wave', 'root_slam'], { weak: ['fire'] }],
  toxic_spider: ['Toxic Spider', 'controller', 'poison', 'rare', 6, 'insect', ['venom_bite', 'toxic_spray'], { weak: ['fire'] }],
  // ----- Dungeon Lv.7 — Ancient Ruins -----
  earth_golem: ['Earth Golem', 'tank', 'earth', 'epic', 7, 'construct', ['rock_slam', 'stone_skin'], { weak: ['water'] }],
  light_slime: ['Light Slime', 'healer', 'light', 'rare', 7, 'slime', ['heal_light', 'holy_smite'], { weak: ['dark'] }],
  angel: ['Angel', 'healer', 'light', 'epic', 7, 'holy', ['heal_light', 'holy_smite'], { weak: ['dark'] }],
  holy_knight: ['Holy Knight', 'tank', 'light', 'epic', 7, 'holy', ['shield_bash', 'holy_smite'], { weak: ['dark'] }],
  unicorn: ['Unicorn', 'support', 'light', 'epic', 7, 'holy', ['heal_light', 'pack_hunt'], { weak: ['dark'] }],
  thunder_bird: ['Thunder Bird', 'ranged', 'lightning', 'rare', 7, 'beast', ['thunder_strike', 'gust'], { weak: ['earth'] }],
  storm_eagle: ['Storm Eagle', 'assassin', 'wind', 'epic', 7, 'beast', ['shadow_step', 'nova_lightning'], { weak: ['lightning'] }],
  raiju: ['Raiju', 'dps', 'lightning', 'epic', 7, 'beast', ['thunder_strike', 'bite'], { weak: ['earth'] }],
  volt_golem: ['Volt Golem', 'tank', 'lightning', 'epic', 7, 'construct', ['stone_skin', 'nova_lightning'], { weak: ['earth'] }],
  thunder_beast: ['Thunder Beast', 'bruiser', 'lightning', 'epic', 7, 'beast', ['thunder_strike', 'howl'], { weak: ['earth'] }],
  bear: ['Bear', 'tank', 'physical', 'rare', 7, 'beast', ['body_slam', 'howl'], { weak: ['fire'] }],
  tiger: ['Tiger', 'dps', 'physical', 'rare', 7, 'beast', ['bite', 'shadow_step'], {}],
  lion: ['Lion', 'bruiser', 'physical', 'epic', 7, 'beast', ['bite', 'howl'], {}],
  griffin: ['Griffin', 'assassin', 'wind', 'epic', 7, 'beast', ['shadow_step', 'gust'], { weak: ['lightning'] }],
  sand_worm: ['Sand Worm', 'bruiser', 'earth', 'epic', 7, 'insect', ['bite', 'rock_slam'], { weak: ['ice'] }],
  // ----- Dungeon Lv.8 — Dragon Nest -----
  wyvern: ['Wyvern', 'dps', 'wind', 'epic', 8, 'dragon', ['bite', 'dragon_breath'], { weak: ['ice'] }],
  wyrm: ['Wyrm', 'bruiser', 'dark', 'epic', 8, 'dragon', ['bite', 'dragon_breath'], { weak: ['light'] }],
  sea_serpent: ['Sea Serpent', 'bruiser', 'water', 'epic', 8, 'aquatic', ['bite', 'nova_water'], { weak: ['lightning'] }],
  red_dragon: ['Red Dragon', 'mage', 'fire', 'legendary', 8, 'dragon', ['dragon_breath', 'nova_fire'], { weak: ['ice'] }],
  blue_dragon: ['Blue Dragon', 'mage', 'water', 'legendary', 8, 'dragon', ['dragon_breath', 'nova_water'], { weak: ['lightning'] }],
  green_dragon: ['Green Dragon', 'controller', 'poison', 'legendary', 8, 'dragon', ['dragon_breath', 'toxic_spray'], { weak: ['fire'] }],
  ice_dragon: ['Ice Dragon', 'mage', 'ice', 'legendary', 8, 'dragon', ['dragon_breath', 'nova_ice'], { weak: ['fire'] }],
  thunder_dragon: ['Thunder Dragon', 'mage', 'lightning', 'legendary', 8, 'dragon', ['dragon_breath', 'nova_lightning'], { weak: ['earth'] }],
  chimera: ['Chimera', 'bruiser', 'fire', 'epic', 8, 'beast', ['bite', 'burn_field'], { weak: ['ice'] }],
  manticore: ['Manticore', 'dps', 'poison', 'epic', 8, 'beast', ['tail_sting', 'pack_hunt'], { weak: ['ice'] }],
  // ----- Dungeon Lv.9 — Abyssal Dungeon -----
  dark_slime: ['Dark Slime', 'controller', 'dark', 'rare', 9, 'slime', ['curse', 'nova_dark'], { weak: ['light'] }],
  shadow: ['Shadow', 'assassin', 'dark', 'epic', 9, 'spirit', ['shadow_step', 'curse'], { resist: { physical: 0.5 }, weak: ['light'] }],
  dark_elf: ['Dark Elf', 'ranged', 'dark', 'epic', 9, 'demon', ['bolt_dark', 'shadow_step'], { weak: ['light'] }],
  nightmare: ['Nightmare', 'controller', 'dark', 'epic', 9, 'demon', ['sonic_wave', 'drain_soul'], { weak: ['light'] }],
  demon: ['Demon', 'bruiser', 'dark', 'epic', 9, 'demon', ['shadow_step', 'burn_field'], { weak: ['light'] }],
  archdemon: ['Archdemon', 'mage', 'dark', 'legendary', 9, 'demon', ['nova_dark', 'drain_soul'], { weak: ['light'] }],
  black_dragon: ['Black Dragon', 'mage', 'dark', 'legendary', 9, 'dragon', ['dragon_breath', 'nova_dark'], { weak: ['light'] }],
  seraph: ['Seraph', 'healer', 'light', 'legendary', 9, 'holy', ['heal_light', 'nova_light'], { weak: ['dark'] }],
  holy_dragon: ['Holy Dragon', 'mage', 'light', 'legendary', 9, 'dragon', ['dragon_breath', 'nova_light'], { weak: ['dark'] }],
  leviathan: ['Leviathan', 'tank', 'water', 'legendary', 9, 'aquatic', ['nova_water', 'stone_skin'], { weak: ['lightning'] }],
  titan: ['Titan', 'tank', 'earth', 'legendary', 9, 'construct', ['rock_slam', 'stone_skin'], { weak: ['arcane'] }],
  kraken: ['Kraken', 'controller', 'water', 'legendary', 9, 'aquatic', ['nova_water', 'web_shot'], { weak: ['lightning'] }],
  behemoth: ['Behemoth', 'bruiser', 'physical', 'legendary', 9, 'beast', ['body_slam', 'howl'], {}],
  // ----- Dungeon Lv.10 — Demon Lord Empire -----
  ancient_dragon: ['Ancient Dragon', 'mage', 'fire', 'mythic', 10, 'dragon', ['dragon_breath', 'nova_fire'], { weak: ['ice'] }],
  phoenix: ['Phoenix', 'healer', 'fire', 'mythic', 10, 'holy', ['nova_fire', 'heal_light'], { weak: ['water'] }],
  bahamut: ['Bahamut', 'mage', 'arcane', 'mythic', 10, 'dragon', ['dragon_breath', 'arcane_burst'], {}],
  demon_lord: ['Demon Lord', 'bruiser', 'dark', 'mythic', 10, 'demon', ['nova_dark', 'royal_command'], { weak: ['light'] }],
  // ----- ร่างวิวัฒนาการ (dl = 0) -----
  slime_blue: ['Blue Slime', 'bruiser', 'water', 'uncommon', 0, 'slime', ['body_slam', 'regenerate'], { clean: 1.4, weak: ['lightning'] }],
  slime_king: ['Slime King', 'tank', 'water', 'rare', 0, 'slime', ['royal_command', 'regenerate'], { clean: 1.5, weak: ['lightning'], scale: 1.25 }],
  goblin_warrior: ['Goblin Warrior', 'bruiser', 'physical', 'uncommon', 0, 'goblin', ['quick_slash', 'shield_bash'], {}],
  goblin_champion: ['Goblin Champion', 'bruiser', 'physical', 'rare', 0, 'goblin', ['shield_bash', 'royal_command'], { scale: 1.15 }],
  skeleton_knight: ['Skeleton Knight', 'tank', 'dark', 'uncommon', 0, 'undead', ['shield_bash', 'bone_shield'], { weak: ['light'] }],
  lich: ['Lich', 'summoner', 'dark', 'epic', 0, 'undead', ['summon_minion', 'drain_soul'], { weak: ['light'], scale: 1.1 }],
  dire_wolf: ['Dire Wolf', 'bruiser', 'physical', 'uncommon', 0, 'beast', ['bite', 'howl'], { weak: ['fire'] }],
  fenrir: ['Fenrir', 'dps', 'ice', 'epic', 0, 'beast', ['bite', 'freeze_touch'], { weak: ['fire'], scale: 1.2 }],
  giant_bat: ['Giant Bat', 'assassin', 'dark', 'uncommon', 0, 'beast', ['drain_bite', 'sonic_wave'], {}],
  giant_mushroom: ['Giant Mushroom', 'healer', 'nature', 'uncommon', 0, 'plant', ['spore_heal', 'spore_cloud'], { weak: ['fire'] }],
  treant: ['Treant', 'tank', 'nature', 'rare', 0, 'plant', ['root_slam', 'regenerate'], { weak: ['fire'], scale: 1.2 }],
  wraith: ['Wraith', 'mage', 'dark', 'rare', 0, 'spirit', ['bolt_dark', 'curse'], { clean: 1.5, resist: { physical: 0.6 }, weak: ['light'] }],
  giant_spider: ['Giant Spider', 'controller', 'poison', 'rare', 0, 'insect', ['web_shot', 'venom_bite'], { weak: ['fire'], scale: 1.1 }],
  boar_warrior: ['Boar Warrior', 'tank', 'physical', 'uncommon', 0, 'beast', ['shield_bash', 'taunt_roar'], {}],
  mimic_chest: ['Mimic King', 'assassin', 'dark', 'epic', 0, 'construct', ['mimic_ambush', 'curse'], { clean: 1.4 }],
  stone_golem: ['Stone Golem', 'tank', 'earth', 'rare', 0, 'construct', ['rock_slam', 'stone_skin'], { clean: 1.2, weak: ['water'] }],
  iron_golem: ['Iron Golem', 'tank', 'physical', 'epic', 0, 'construct', ['rock_slam', 'stone_skin'], { clean: 1.2, weak: ['lightning'], scale: 1.1 }],
};

// ห่วงโซ่วิวัฒนาการ: [จาก, ไป, ขั้น (1=Lv21, 2=Lv31, 3=Lv41), Dungeon Level, Gold, วัตถุดิบ]
export const EVOLUTIONS = [
  ['slime', 'slime_blue', 1, 2, 300, { evolution_crystal: 1, mana_gel: 3 }],
  ['slime_blue', 'slime_king', 2, 4, 1500, { evolution_crystal: 2, mana_gel: 6 }],
  ['goblin', 'goblin_warrior', 1, 2, 350, { evolution_crystal: 1, hide: 3 }],
  ['goblin_warrior', 'goblin_champion', 2, 4, 1600, { evolution_crystal: 2, iron_scrap: 6 }],
  ['skeleton', 'skeleton_knight', 1, 3, 400, { evolution_crystal: 1, bone: 5 }],
  ['skeleton_knight', 'dark_knight', 2, 5, 2000, { evolution_crystal: 2, bone: 10 }],
  ['dark_knight', 'lich', 3, 7, 9000, { evolution_crystal: 4, monster_core: 2 }],
  ['wolf', 'dire_wolf', 1, 2, 400, { evolution_crystal: 1, hide: 4 }],
  ['dire_wolf', 'fenrir', 2, 6, 3000, { evolution_crystal: 2, hide: 8 }],
  ['bat', 'giant_bat', 1, 2, 300, { evolution_crystal: 1, hide: 2 }],
  ['mushroom', 'giant_mushroom', 1, 2, 300, { evolution_crystal: 1, mana_gel: 3 }],
  ['giant_mushroom', 'treant', 2, 4, 1500, { evolution_crystal: 2, mana_gel: 6 }],
  ['ghost', 'wraith', 1, 3, 600, { evolution_crystal: 1, bone: 4 }],
  ['cave_spider', 'giant_spider', 1, 3, 600, { evolution_crystal: 1, hide: 3 }],
  ['giant_spider', 'toxic_spider', 2, 6, 2500, { evolution_crystal: 2, hide: 6 }],
  ['boar', 'boar_warrior', 1, 2, 350, { evolution_crystal: 1, hide: 3 }],
  ['imp', 'flame_imp', 1, 3, 700, { evolution_crystal: 1, mana_gel: 4 }],
  ['flame_imp', 'demon', 2, 6, 3500, { evolution_crystal: 2, monster_core: 1 }],
  ['demon', 'archdemon', 3, 9, 20000, { evolution_crystal: 4, monster_core: 3 }],
  ['golem', 'stone_golem', 1, 3, 700, { evolution_crystal: 1, iron_scrap: 4 }],
  ['stone_golem', 'iron_golem', 2, 5, 3000, { evolution_crystal: 2, iron_scrap: 10 }],
  ['iron_golem', 'titan', 3, 8, 18000, { evolution_crystal: 4, monster_core: 3 }],
  ['mimic', 'mimic_chest', 2, 5, 3000, { evolution_crystal: 2, monster_core: 1 }],
  ['pink_slime', 'light_slime', 2, 5, 2000, { evolution_crystal: 2, mana_gel: 6 }],
  ['fire_slime', 'lava_beast', 2, 6, 2500, { evolution_crystal: 2, mana_gel: 6 }],
  ['fire_drake', 'red_dragon', 2, 8, 12000, { evolution_crystal: 3, monster_core: 2 }],
  ['red_dragon', 'ancient_dragon', 3, 10, 60000, { evolution_crystal: 5, monster_core: 5 }],
  ['zombie', 'ghoul', 1, 3, 500, { evolution_crystal: 1, bone: 4 }],
  ['goblin_archer', 'dark_elf', 2, 7, 6000, { evolution_crystal: 2, monster_core: 1 }],
];

// Mutation (Monster Bible §22) — ได้จาก Fusion
export const MUTATIONS = {
  giant: { name: 'Giant', th: 'ยักษ์', mods: { hp: 0.4 }, upkeep: 0.25, scale: 0.2 },
  tiny: { name: 'Tiny', th: 'จิ๋ว', mods: { spd: 0.2, hp: -0.15 }, scale: -0.15 },
  armored: { name: 'Armored', th: 'หุ้มเกราะ', mods: { def: 0.3, spd: -0.15 } },
  swift: { name: 'Swift', th: 'ว่องไว', mods: { spd: 0.25, def: -0.1 } },
  magical: { name: 'Magical', th: 'เวทเข้ม', mods: { matk: 0.3, atk: -0.1 } },
  toxic: { name: 'Toxic', th: 'พิษร้าย', mods: { atk: 0.1 }, elementBonus: 'poison' },
  radiant: { name: 'Radiant', th: 'เปล่งแสง', mods: { matk: 0.1, mdef: 0.1 }, elementBonus: 'light' },
  abyssal: { name: 'Abyssal', th: 'ห้วงลึก', mods: { atk: 0.1, matk: 0.1, mdef: -0.1 }, elementBonus: 'dark' },
  regenerative: { name: 'Regenerative', th: 'ฟื้นฟูเร็ว', mods: { def: -0.05 }, regen: 0.01 },
  berserk: { name: 'Berserk', th: 'คลั่ง', mods: { def: -0.1 }, berserk: 0.4 },
  ancient: { name: 'Ancient', th: 'โบราณ', mods: { hp: 0.1, atk: 0.1, matk: 0.1 }, levelCap: 10, upkeep: 0.3 },
};

// ---------- Build ----------
export const MONSTERS = {};
for (const [id, row] of Object.entries(TABLE)) {
  const [name, role, element, rarity, dl, family, skills, opt = {}] = row;
  const t = ROLE_TEMPLATES[role], p = RARITY_POWER[rarity];
  const b = opt.base ? { ...t, ...opt.base } : {
    hp: Math.round(t.hp * p), atk: Math.round(t.atk * p), matk: Math.round(t.matk * p),
    def: Math.round(t.def * p), mdef: Math.round(t.mdef * p), spd: Math.round(t.spd * (1 + (p - 1) * 0.08)), range: t.range,
  };
  const dlMult = 1 + Math.max(0, dl - 1) * 0.25;
  MONSTERS[id] = {
    id, name, role, element, rarity, family, unlock: dl,
    base: { hp: b.hp, atk: b.atk, matk: b.matk, def: b.def, mdef: b.mdef, spd: b.spd, range: b.range ?? t.range, aspd: t.aspd, acc: 90, eva: role === 'assassin' ? 12 : 5, crit: role === 'assassin' || role === 'dps' ? 0.08 : 0.05, critDmg: 1.5, res: 0, mp: 50 },
    growth: ROLE_GROWTH[role],
    attack: b.range > 1.5 ? (b.matk > b.atk ? 'magic' : 'ranged') : 'melee',
    cost: opt.cost ?? Math.round(RARITY_COST[rarity] * dlMult),
    upkeep: RARITY_UPKEEP[rarity], foodPerDay: RARITY_FOOD[rarity], food: FOOD[family] || 'Meat',
    skills: [{ id: skills[0], unlock: 1 }, { id: skills[1], unlock: 11 }],
    resist: opt.resist || {}, weak: opt.weak || [],
    clean: opt.clean ?? (role === 'worker' ? 1.6 : 0.8),
    scale: opt.scale || ({ legendary: 1.3, mythic: 1.5, epic: 1.15 }[rarity] || 1),
    sprite: `mon_${id}`,
    recruitable: dl > 0,
    evolutions: [],
  };
}
for (const [from, to, stage, dl, gold, materials] of EVOLUTIONS) {
  if (!MONSTERS[from] || !MONSTERS[to]) continue;
  MONSTERS[from].evolutions.push(to);
  MONSTERS[to].evo = { from, stage, dungeonLevel: dl, gold, materials };
  MONSTERS[to].stage = stage;
}
// sprite ที่ชื่อไม่ตรงกับ id
MONSTERS.fire_hound.sprite = 'mon_fire_hound';

export function isRecruitable(id) { const d = MONSTERS[id]; return !!d && d.recruitable; }

export const PERSONALITIES = {
  brave: { name: 'Brave', th: 'กล้าหาญ', desc: 'ATK +8% ไม่ถอยหนี ต้าน Fear', atkMult: 1.08, retreatAt: 0, resFear: true },
  coward: { name: 'Coward', th: 'ขี้ขลาด', desc: 'ถอยเมื่อ HP < 40%, รับดาเมจ -5%', retreatAt: 0.4, dmgTaken: 0.95 },
  greedy: { name: 'Greedy', th: 'โลภ', desc: 'ทอง +10% จากการฆ่า, Loyalty ลดเร็วถ้าเงินน้อย', goldMult: 1.1 },
  loyal: { name: 'Loyal', th: 'ซื่อสัตย์', desc: 'Loyalty ลดช้าลงครึ่งหนึ่ง', loyaltyDecay: 0.5 },
  lazy: { name: 'Lazy', th: 'ขี้เกียจ', desc: 'ฝึกได้ผล -30% แต่เหนื่อยช้า', trainMult: 0.7, fatigueMult: 0.7 },
  aggressive: { name: 'Aggressive', th: 'ดุดัน', desc: 'ไล่ล่าไกลขึ้น, ATK +5%', atkMult: 1.05, aggroBonus: 1.5 },
  intelligent: { name: 'Intelligent', th: 'ฉลาด', desc: 'EXP +15%, คูลดาวน์สกิล -10%', expMult: 1.15, cdMult: 0.9 },
};
