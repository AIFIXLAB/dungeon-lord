// กับดัก (GDD §15) — ต้องมี Trap Workshop (Dungeon Level 2)
export const TRAPS = {
  spike: { name: 'Spike Trap', cost: 60, damage: 10, cooldown: 3, range: 0.6, element: 'none', durability: 30, upkeep: 1, unlock: 2, color: '#c8c8c8' },
  arrow: { name: 'Arrow Trap', cost: 90, damage: 7, cooldown: 2, range: 2.6, element: 'wind', durability: 40, upkeep: 2, unlock: 2, color: '#a87a4a' },
  poison: { name: 'Poison Trap', cost: 110, damage: 4, cooldown: 5, range: 0.8, element: 'earth', durability: 25, upkeep: 2, unlock: 2, status: { id: 'poison', dur: 6, power: 3 }, color: '#7cff4a' },
  fire: { name: 'Fire Trap', cost: 220, damage: 18, cooldown: 4, range: 0.8, element: 'fire', durability: 30, upkeep: 4, unlock: 3, color: '#ff6a2a' },
  ice: { name: 'Ice Trap', cost: 240, damage: 12, cooldown: 4, range: 1.2, element: 'ice', durability: 30, upkeep: 4, unlock: 4, status: { id: 'slow', dur: 3, power: 0.5 }, color: '#a8ecff' },
  explosive: { name: 'Explosive Trap', cost: 500, damage: 40, cooldown: 8, range: 1.5, element: 'fire', durability: 15, upkeep: 6, unlock: 5, aoe: 1.8, color: '#ffaa2a' },
};
