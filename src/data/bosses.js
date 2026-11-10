// Boss Roster 50 ตัว 5 ระดับ (Monster Bible §17–18)
// ค่าในตารางคือค่าจากเอกสาร (ทดสอบ) — ในเกมคูณด้วย BALANCE.boss.statScale และระดับ Boss Rank
// [ชื่อ, tier, role, ธาตุ, จุดอ่อน, HP, ATK, MATK, DEF, MDEF, SPD, สกิล 4 ท่า]
const B = [
  ['Slime King', 1, 'tank', 'water', ['lightning'], 1200, 120, 80, 160, 120, 90, ['Royal Slam', 'Slime Spawn', 'Regeneration', 'King Flood']],
  ['Goblin Warlord', 1, 'bruiser', 'physical', ['fire'], 1500, 180, 40, 120, 80, 110, ['Warlord Strike', 'Goblin Rally', 'Reinforcement', 'Execute']],
  ['Giant Spider', 1, 'controller', 'poison', ['fire'], 1800, 160, 100, 130, 100, 100, ['Web Prison', 'Venom Bite', 'Spiderlings', 'Toxic Field']],
  ['Stone Golem', 1, 'tank', 'earth', ['water'], 2500, 180, 40, 300, 180, 40, ['Stone Fist', 'Earthquake', 'Stone Armor', 'Rockfall']],
  ['Ogre Chieftain', 1, 'bruiser', 'physical', ['arcane'], 2200, 250, 30, 150, 80, 70, ['Heavy Smash', 'War Roar', 'Cleave', 'Rage']],
  ['Treant Elder', 1, 'tank', 'nature', ['fire'], 3000, 150, 200, 250, 220, 30, ['Ancient Root', 'Forest Awakening', 'Seed Barrage', 'Elder Regeneration']],
  ['Manticore', 1, 'bruiser', 'poison', ['ice'], 2000, 220, 100, 150, 120, 120, ['Tail Sting', 'Pounce', 'Poison Cloud', 'Wing Gust']],
  ['Basilisk', 1, 'controller', 'earth', ['ice'], 1800, 180, 120, 160, 140, 60, ['Petrifying Gaze', 'Venom Bite', 'Stone Skin', 'Tail Sweep']],
  ['Ice Yeti', 1, 'bruiser', 'ice', ['fire'], 2500, 220, 100, 180, 200, 70, ['Ice Smash', 'Blizzard Roar', 'Snowball', 'Frozen Ground']],
  ['Lava Behemoth', 1, 'tank', 'fire', ['water'], 3500, 280, 180, 250, 180, 40, ['Lava Slam', 'Magma Burst', 'Burning Armor', 'Eruption']],
  ['Bone Dragon', 2, 'dps', 'dark', ['light'], 5000, 320, 250, 250, 300, 120, ['Bone Breath', 'Bone Rain', 'Wing Storm', 'Death Roar']],
  ['Vampire Lord', 2, 'bruiser', 'dark', ['light'], 4500, 300, 280, 220, 300, 130, ['Blood Drain', 'Bat Swarm', 'Blood Curse', 'Nightfall']],
  ['Sea Leviathan', 2, 'tank', 'water', ['lightning'], 6000, 350, 300, 350, 300, 60, ['Tidal Wave', 'Tail Crush', 'Whirlpool', 'Deep Sea Pressure']],
  ['Fire Elemental Lord', 2, 'mage', 'fire', ['water'], 4000, 250, 450, 200, 350, 100, ['Inferno', 'Flame Wall', 'Meteor Fire', 'Firestorm']],
  ['Frost Queen', 2, 'controller', 'ice', ['fire'], 4500, 220, 500, 220, 400, 90, ['Absolute Zero', 'Ice Lance', 'Frozen Palace', 'Blizzard']],
  ['Thunder Colossus', 2, 'tank', 'lightning', ['earth'], 6500, 400, 350, 400, 300, 70, ['Thunder Fist', 'Lightning Field', 'Storm Core', 'Thunder Crash']],
  ['Poison Monarch', 2, 'controller', 'poison', ['fire'], 5000, 250, 400, 300, 350, 80, ['Toxic Rain', 'Poison Crown', 'Plague Wave', 'Venom Explosion']],
  ['Dark Knight Lord', 2, 'bruiser', 'dark', ['light'], 5500, 450, 250, 400, 300, 100, ['Dark Cleave', 'Abyssal Shield', 'Soul Slash', 'Black Charge']],
  ['Serpent Hydra', 2, 'bruiser', 'poison', ['fire'], 6500, 350, 300, 350, 300, 90, ['Multi Head Bite', 'Regenerate Head', 'Poison Breath', 'Hydra Frenzy']],
  ['Centaur Warlord', 2, 'bruiser', 'physical', ['ice'], 5000, 420, 100, 300, 200, 150, ['Charge', 'Spear Volley', 'War Banner', 'Stampede']],
  ['Chimera Lord', 3, 'bruiser', 'fire', ['ice'], 10000, 600, 500, 500, 450, 120, ['Triple Breath', 'Lion Pounce', 'Serpent Venom', 'Chimera Rage']],
  ['Kraken', 3, 'controller', 'water', ['lightning'], 12000, 650, 500, 600, 500, 50, ['Tentacle Crush', 'Ink Cloud', 'Abyssal Pull', 'Tidal Cataclysm']],
  ['Phoenix Lord', 3, 'mage', 'fire', ['water'], 9000, 500, 700, 400, 600, 160, ['Rebirth', 'Solar Flame', 'Phoenix Dive', 'Eternal Fire']],
  ['Ancient Golem', 3, 'tank', 'earth', ['water'], 15000, 700, 300, 900, 600, 40, ['Ancient Fist', 'Earthquake', 'Stone Wall', 'Titan Crush']],
  ['Lich King', 3, 'summoner', 'dark', ['light'], 10000, 300, 900, 500, 800, 70, ['Undead Legion', 'Soul Reaper', 'Dark Nova', 'Death Sentence']],
  ['Demon General', 3, 'bruiser', 'dark', ['light'], 12000, 850, 500, 700, 600, 120, ['Demon Charge', 'Hellfire Blade', 'Infernal Army', 'Demon Roar']],
  ['Storm Dragon', 3, 'mage', 'lightning', ['earth'], 13000, 750, 800, 600, 700, 180, ['Storm Breath', 'Thunder Dive', 'Tornado', 'Sky Cataclysm']],
  ['Forest Guardian', 3, 'tank', 'nature', ['fire'], 14000, 600, 700, 800, 700, 60, ['Forest Shield', 'Nature Pulse', 'Root Prison', 'Ancient Bloom']],
  ['Abyssal Worm', 3, 'bruiser', 'earth', ['ice'], 15000, 800, 500, 700, 600, 80, ['Burrow', 'Abyss Bite', 'Ground Rupture', 'Devour']],
  ['Angelic Marshal', 3, 'support', 'light', ['dark'], 11000, 650, 800, 700, 900, 140, ['Divine Order', 'Holy Spear', 'Celestial Shield', 'Judgment']],
  ['Shadow Emperor', 4, 'assassin', 'dark', ['light'], 25000, 1200, 1000, 900, 1000, 180, ['Shadow Dominion', 'Night Execution', 'Dark Clone', "Emperor's Eclipse"]],
  ['Dragon Emperor', 4, 'mage', 'fire', ['ice'], 30000, 1500, 1200, 1200, 1000, 160, ['Imperial Dragon Breath', 'Dragon Claw', 'Flame Dominion', 'Dragon Cataclysm']],
  ['Leviathan King', 4, 'tank', 'water', ['lightning'], 35000, 1400, 1300, 1500, 1200, 80, ['Ocean Collapse', 'Leviathan Bite', 'Tsunami', 'Abyssal Storm']],
  ['Titan', 4, 'tank', 'earth', ['arcane'], 40000, 1600, 800, 2000, 1500, 50, ['Titan Fist', 'Mountain Break', 'Earthquake', 'World Crush']],
  ['Time Warden', 4, 'controller', 'arcane', ['dark'], 28000, 900, 1700, 1000, 1800, 150, ['Time Stop', 'Temporal Rewind', 'Haste Field', 'Time Collapse']],
  ['Void Behemoth', 4, 'tank', 'arcane', ['light'], 45000, 1700, 1500, 1800, 1600, 70, ['Void Slam', 'Gravity Well', 'Dark Matter', 'Void Collapse']],
  ['Holy Dragon', 4, 'mage', 'light', ['dark'], 32000, 1500, 1700, 1300, 1800, 160, ['Holy Breath', 'Celestial Wing', 'Divine Flame', 'Sacred Cataclysm']],
  ['Apocalypse Knight', 4, 'bruiser', 'dark', ['light'], 35000, 1900, 1200, 1600, 1400, 140, ['Apocalypse Slash', 'Doom Charge', 'Death Banner', 'End of Days']],
  ['Celestial Seraph', 4, 'healer', 'light', ['dark'], 30000, 1100, 2000, 1300, 2000, 170, ['Seraphic Heal', 'Holy Judgment', 'Celestial Wings', 'Divine Resurrection']],
  ['Chaos Hydra', 4, 'bruiser', 'dark', ['ice', 'light'], 42000, 1800, 1600, 1700, 1500, 100, ['Chaos Bite', 'Multi Breath', 'Head Regeneration', 'Chaos Cataclysm']],
  ['Demon Lord', 5, 'bruiser', 'dark', ['light'], 100000, 3000, 3000, 2500, 2500, 180, ['Hell Dominion', 'Demon Army', 'Soul Collapse', 'Final Inferno']],
  ['Goddess of Light', 5, 'healer', 'light', ['dark'], 90000, 2500, 3500, 2500, 3500, 200, ['Divine Judgment', 'Light Nova', 'Celestial Barrier', "Heaven's Wrath"]],
  ['God Dragon', 5, 'mage', 'arcane', ['ice'], 120000, 3500, 3500, 3000, 3000, 220, ['God Breath', 'Dragon God Roar', 'Cosmic Flame', 'World Devour']],
  ['Abyss Lord', 5, 'summoner', 'dark', ['light'], 110000, 3000, 4000, 2800, 3500, 180, ['Abyssal Collapse', 'Void Summon', 'Dark Singularity', 'Endless Abyss']],
  ['Nature Overlord', 5, 'tank', 'nature', ['fire', 'poison'], 100000, 2800, 3500, 3000, 3000, 100, ['World Root', 'Nature Cataclysm', 'Eternal Bloom', 'Forest Rebirth']],
  ['Elemental Sovereign', 5, 'mage', 'arcane', [], 100000, 3000, 4000, 3000, 3500, 180, ['Elemental Shift', 'Elemental Nova', 'Elemental Storm', 'Absolute Element']],
  ['Void King', 5, 'summoner', 'arcane', ['light'], 130000, 3500, 4000, 3500, 3500, 160, ['Void Crown', 'Void Army', 'Black Hole', "King's End"]],
  ['Ragnarok Beast', 5, 'bruiser', 'fire', ['ice', 'light'], 150000, 4500, 3000, 3500, 2500, 220, ['Ragnarok Charge', 'Apocalypse Flame', 'World Breaker', 'Final Destruction']],
  ['Primordial Entity', 5, 'mage', 'arcane', [], 180000, 4000, 5000, 4000, 4000, 180, ['Primordial Pulse', 'Reality Shift', 'Cosmic Collapse', 'Origin Erasure']],
  ['Eternal Dark God', 5, 'bruiser', 'dark', ['light'], 250000, 5000, 5000, 4500, 4500, 200, ['Eternal Darkness', 'God of Ruin', 'Abyssal Judgment', 'Eternal End']],
];

export const BOSS_TIERS = {
  1: { name: 'Mini Boss', th: 'บอสเล็ก', unlock: 2, cost: 2500, upkeep: 60, reward: ['common', 'rare'] },
  2: { name: 'Elite Boss', th: 'บอสหัวหน้า', unlock: 4, cost: 12000, upkeep: 180, reward: ['rare', 'epic'] },
  3: { name: 'Greater Boss', th: 'บอสจอมทัพ', unlock: 6, cost: 45000, upkeep: 450, reward: ['epic', 'legendary'] },
  4: { name: 'Master Boss', th: 'บอสราชัน', unlock: 8, cost: 160000, upkeep: 1100, reward: ['legendary', 'legendary'] },
  5: { name: 'Legendary Boss', th: 'บอสตำนาน', unlock: 10, cost: 600000, upkeep: 3000, reward: ['legendary', 'mythic'] },
};

// แปลงชื่อสกิลบอส → กลไกเกม ด้วย keyword (data-driven ปรับได้ที่นี่)
const KW = [
  [/spawn|summon|legion|army|reinforcement|spiderling|raise|clone|minion/i, 'summon'],
  [/regenerat|rebirth|resurrection|bloom|heal|regrow/i, 'heal'],
  [/armor|shield|skin|wall|barrier|guard|dominion|crown/i, 'buff'],
  [/rally|banner|order|roar|haste|command/i, 'rally'],
  [/gaze|prison|web|root|curse|pull|ink|time stop|gravity|nightfall|frozen|zero|petrif/i, 'control'],
  [/quake|earthquake|nova|storm|wave|rain|flood|field|cataclysm|collapse|burst|eruption|blizzard|inferno|firestorm|breath|tsunami|cloud|pulse|explosion|meteor|tornado|swarm|volley|stampede|frenzy|crush|world|end|judgment|singularity|black hole|erasure|darkness|ruin|destruction|devour|rupture|apocalypse|sweep|cleave/i, 'aoe'],
];
export function bossSkillType(name) { for (const [re, t] of KW) if (re.test(name)) return t; return 'dmg'; }

export const BOSSES = {};
B.forEach(([name, tier, role, element, weak, hp, atk, matk, def, mdef, spd, skills], i) => {
  const id = `boss_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_$/, '')}`;
  BOSSES[id] = {
    id, name, tier, role, element, weak, index: i + 1,
    base: { hp, atk, matk, def, mdef, spd, range: role === 'mage' || role === 'controller' || role === 'summoner' || role === 'healer' ? 3.6 : 1.4, aspd: 0.8, acc: 100, eva: 5, crit: 0.08, critDmg: 1.6, res: 0.4, mp: 200 },
    skills: skills.map((n) => ({ name: n, type: bossSkillType(n) })),
    sprite: id,
    scale: 1.7 + tier * 0.12,
  };
});
