// ============================================================================
// CLAWDCITY MMORPG - World Data Definition
// All locations, NPCs, items, quests, skills, and game constants
// ============================================================================

const GAME_CONFIG = {
  BASE_XP_PER_LEVEL: 100,
  XP_SCALING: 1.5,
  STARTING_GOLD: 50,
  STARTING_HP: 100,
  STARTING_MP: 30,
  STARTING_ENERGY: 100,
  ENERGY_REGEN_RATE: 1,        // per 10 seconds
  HP_REGEN_RATE: 2,            // per 10 seconds
  MP_REGEN_RATE: 1,            // per 10 seconds
  COMBAT_TICK_MS: 3000,
  MAX_INVENTORY_SLOTS: 30,
  WORLD_EVENT_INTERVAL_MS: 300000, // 5 minutes
  ACTION_DURATION_MS: 5000,     // base action time
};

// ============================================================================
// SKILLS
// ============================================================================
const SKILLS = {
  combat: { name: 'Combat', description: 'Fighting ability with weapons', icon: '⚔️' },
  mining: { name: 'Mining', description: 'Extract ores and gems from rocks', icon: '⛏️' },
  fishing: { name: 'Fishing', description: 'Catch fish from bodies of water', icon: '🎣' },
  cooking: { name: 'Cooking', description: 'Prepare food that restores HP/MP', icon: '🍳' },
  crafting: { name: 'Crafting', description: 'Create weapons, armor, and tools', icon: '🔨' },
  woodcutting: { name: 'Woodcutting', description: 'Chop trees for lumber', icon: '🪓' },
  herbalism: { name: 'Herbalism', description: 'Gather herbs for potions', icon: '🌿' },
  alchemy: { name: 'Alchemy', description: 'Brew potions and elixirs', icon: '⚗️' },
  enchanting: { name: 'Enchanting', description: 'Imbue items with magic', icon: '✨' },
  trading: { name: 'Trading', description: 'Better prices at shops', icon: '💰' },
  farming: { name: 'Farming', description: 'Grow crops at your home', icon: '🌾' },
  exploration: { name: 'Exploration', description: 'Discover hidden areas and secrets', icon: '🧭' },
};

// ============================================================================
// ITEMS DATABASE
// ============================================================================
const ITEMS = {
  // === Weapons ===
  wooden_sword: { name: 'Wooden Sword', type: 'weapon', slot: 'weapon', stats: { attack: 3 }, value: 10, level: 1, description: 'A basic training sword' },
  iron_sword: { name: 'Iron Sword', type: 'weapon', slot: 'weapon', stats: { attack: 8 }, value: 50, level: 3, description: 'A sturdy iron blade' },
  steel_sword: { name: 'Steel Sword', type: 'weapon', slot: 'weapon', stats: { attack: 15 }, value: 150, level: 7, description: 'A finely forged steel sword' },
  shadow_blade: { name: 'Shadow Blade', type: 'weapon', slot: 'weapon', stats: { attack: 25, speed: 5 }, value: 500, level: 12, description: 'A blade forged in darkness' },
  crystal_staff: { name: 'Crystal Staff', type: 'weapon', slot: 'weapon', stats: { attack: 10, magic: 20 }, value: 400, level: 10, description: 'A staff humming with arcane energy' },
  fire_bow: { name: 'Fire Bow', type: 'weapon', slot: 'weapon', stats: { attack: 18, magic: 8 }, value: 350, level: 9, description: 'A bow that ignites its arrows' },
  legendary_excalibur: { name: 'Excalibur', type: 'weapon', slot: 'weapon', stats: { attack: 50, defense: 10, magic: 15 }, value: 5000, level: 20, description: 'The legendary blade of kings' },

  // === Armor ===
  cloth_shirt: { name: 'Cloth Shirt', type: 'armor', slot: 'chest', stats: { defense: 1 }, value: 5, level: 1, description: 'Basic cloth protection' },
  leather_armor: { name: 'Leather Armor', type: 'armor', slot: 'chest', stats: { defense: 5 }, value: 40, level: 3, description: 'Tough leather chest piece' },
  iron_chainmail: { name: 'Iron Chainmail', type: 'armor', slot: 'chest', stats: { defense: 12 }, value: 120, level: 6, description: 'Interlocking iron rings' },
  steel_plate: { name: 'Steel Plate Armor', type: 'armor', slot: 'chest', stats: { defense: 22 }, value: 350, level: 10, description: 'Heavy steel plate protection' },
  dragon_armor: { name: 'Dragon Scale Armor', type: 'armor', slot: 'chest', stats: { defense: 35, magic: 10 }, value: 2000, level: 16, description: 'Armor forged from dragon scales' },

  // === Helmets ===
  leather_cap: { name: 'Leather Cap', type: 'armor', slot: 'head', stats: { defense: 2 }, value: 15, level: 1, description: 'Simple leather headgear' },
  iron_helm: { name: 'Iron Helm', type: 'armor', slot: 'head', stats: { defense: 6 }, value: 60, level: 5, description: 'Solid iron helmet' },
  mage_hood: { name: 'Mage Hood', type: 'armor', slot: 'head', stats: { defense: 3, magic: 8 }, value: 80, level: 6, description: 'Enchanted hood for spellcasters' },

  // === Shields ===
  wooden_shield: { name: 'Wooden Shield', type: 'armor', slot: 'shield', stats: { defense: 4 }, value: 20, level: 1, description: 'A simple wooden shield' },
  iron_shield: { name: 'Iron Shield', type: 'armor', slot: 'shield', stats: { defense: 10 }, value: 80, level: 5, description: 'A reliable iron shield' },
  tower_shield: { name: 'Tower Shield', type: 'armor', slot: 'shield', stats: { defense: 18 }, value: 250, level: 10, description: 'A massive tower shield' },

  // === Tools ===
  pickaxe: { name: 'Pickaxe', type: 'tool', toolType: 'mining', efficiency: 1, value: 25, level: 1, description: 'Used for mining ores' },
  steel_pickaxe: { name: 'Steel Pickaxe', type: 'tool', toolType: 'mining', efficiency: 2, value: 100, level: 5, description: 'Mines faster and accesses better ores' },
  fishing_rod: { name: 'Fishing Rod', type: 'tool', toolType: 'fishing', efficiency: 1, value: 20, level: 1, description: 'Used for fishing' },
  golden_fishing_rod: { name: 'Golden Fishing Rod', type: 'tool', toolType: 'fishing', efficiency: 2, value: 150, level: 8, description: 'Catches rarer fish' },
  axe: { name: 'Woodcutting Axe', type: 'tool', toolType: 'woodcutting', efficiency: 1, value: 20, level: 1, description: 'Used for chopping trees' },
  steel_axe: { name: 'Steel Axe', type: 'tool', toolType: 'woodcutting', efficiency: 2, value: 100, level: 5, description: 'Chops trees faster' },
  herb_sickle: { name: 'Herb Sickle', type: 'tool', toolType: 'herbalism', efficiency: 1, value: 15, level: 1, description: 'Used for gathering herbs' },

  // === Resources ===
  copper_ore: { name: 'Copper Ore', type: 'resource', subtype: 'ore', value: 5, level: 1, description: 'Raw copper ore', stackable: true },
  iron_ore: { name: 'Iron Ore', type: 'resource', subtype: 'ore', value: 12, level: 3, description: 'Raw iron ore', stackable: true },
  gold_ore: { name: 'Gold Ore', type: 'resource', subtype: 'ore', value: 30, level: 7, description: 'Precious gold ore', stackable: true },
  mithril_ore: { name: 'Mithril Ore', type: 'resource', subtype: 'ore', value: 75, level: 12, description: 'Rare mithril ore', stackable: true },
  oak_log: { name: 'Oak Log', type: 'resource', subtype: 'wood', value: 4, level: 1, description: 'A sturdy oak log', stackable: true },
  maple_log: { name: 'Maple Log', type: 'resource', subtype: 'wood', value: 10, level: 4, description: 'A maple log', stackable: true },
  yew_log: { name: 'Yew Log', type: 'resource', subtype: 'wood', value: 25, level: 8, description: 'A rare yew log', stackable: true },
  herb_chamomile: { name: 'Chamomile', type: 'resource', subtype: 'herb', value: 3, level: 1, description: 'A calming herb', stackable: true },
  herb_ginseng: { name: 'Ginseng', type: 'resource', subtype: 'herb', value: 8, level: 3, description: 'An energizing root', stackable: true },
  herb_nightshade: { name: 'Nightshade', type: 'resource', subtype: 'herb', value: 20, level: 7, description: 'A dangerous but powerful herb', stackable: true },
  herb_dragonroot: { name: 'Dragon Root', type: 'resource', subtype: 'herb', value: 50, level: 12, description: 'Extremely rare magical herb', stackable: true },

  // === Fish ===
  small_fish: { name: 'Small Fish', type: 'resource', subtype: 'fish', value: 3, level: 1, description: 'A common small fish', stackable: true },
  trout: { name: 'Trout', type: 'resource', subtype: 'fish', value: 8, level: 3, description: 'A nice trout', stackable: true },
  salmon: { name: 'Salmon', type: 'resource', subtype: 'fish', value: 15, level: 6, description: 'A large salmon', stackable: true },
  golden_fish: { name: 'Golden Fish', type: 'resource', subtype: 'fish', value: 100, level: 10, description: 'An extremely rare golden fish', stackable: true },

  // === Food / Consumables ===
  bread: { name: 'Bread', type: 'consumable', effect: { hp: 10 }, value: 5, level: 1, description: 'Restores 10 HP', stackable: true },
  cooked_fish: { name: 'Cooked Fish', type: 'consumable', effect: { hp: 25 }, value: 12, level: 2, description: 'Restores 25 HP', stackable: true },
  meat_stew: { name: 'Meat Stew', type: 'consumable', effect: { hp: 50, energy: 20 }, value: 30, level: 5, description: 'Restores 50 HP and 20 energy', stackable: true },
  feast_plate: { name: 'Grand Feast', type: 'consumable', effect: { hp: 100, mp: 30, energy: 50 }, value: 80, level: 10, description: 'A magnificent feast', stackable: true },

  // === Potions ===
  health_potion: { name: 'Health Potion', type: 'consumable', effect: { hp: 30 }, value: 15, level: 1, description: 'Restores 30 HP', stackable: true },
  mana_potion: { name: 'Mana Potion', type: 'consumable', effect: { mp: 20 }, value: 15, level: 1, description: 'Restores 20 MP', stackable: true },
  energy_drink: { name: 'Energy Tonic', type: 'consumable', effect: { energy: 40 }, value: 20, level: 1, description: 'Restores 40 energy', stackable: true },
  greater_health_potion: { name: 'Greater Health Potion', type: 'consumable', effect: { hp: 80 }, value: 50, level: 5, description: 'Restores 80 HP', stackable: true },
  elixir_of_power: { name: 'Elixir of Power', type: 'consumable', effect: { hp: 50, mp: 50, tempAttack: 5 }, value: 100, level: 8, description: 'Restores HP/MP and boosts attack', stackable: true },

  // === Quest / Special Items ===
  old_map: { name: 'Old Map', type: 'quest', value: 0, level: 1, description: 'A worn map showing a hidden path', stackable: false },
  crystal_shard: { name: 'Crystal Shard', type: 'quest', value: 25, level: 1, description: 'A glowing crystal fragment', stackable: true },
  dark_essence: { name: 'Dark Essence', type: 'quest', value: 50, level: 5, description: 'A swirling orb of dark energy', stackable: true },
  dragon_scale: { name: 'Dragon Scale', type: 'resource', subtype: 'rare', value: 200, level: 15, description: 'A scale from a mighty dragon', stackable: true },
  enchanted_gem: { name: 'Enchanted Gem', type: 'resource', subtype: 'gem', value: 150, level: 10, description: 'A gem pulsing with magic', stackable: true },

  // === Home Furniture ===
  basic_bed: { name: 'Basic Bed', type: 'furniture', subtype: 'bed', effect: { restRate: 1.5 }, value: 50, level: 1, description: 'A simple bed for resting' },
  fancy_bed: { name: 'Fancy Bed', type: 'furniture', subtype: 'bed', effect: { restRate: 2.5 }, value: 200, level: 5, description: 'A comfortable bed that restores faster' },
  workbench: { name: 'Workbench', type: 'furniture', subtype: 'station', craftType: 'crafting', value: 100, level: 1, description: 'Allows crafting at home' },
  alchemy_table: { name: 'Alchemy Table', type: 'furniture', subtype: 'station', craftType: 'alchemy', value: 150, level: 3, description: 'Allows brewing potions at home' },
  cooking_stove: { name: 'Cooking Stove', type: 'furniture', subtype: 'station', craftType: 'cooking', value: 80, level: 1, description: 'Cook food at home' },
  enchanting_altar: { name: 'Enchanting Altar', type: 'furniture', subtype: 'station', craftType: 'enchanting', value: 300, level: 8, description: 'Enchant items at home' },
  storage_chest: { name: 'Storage Chest', type: 'furniture', subtype: 'storage', slots: 20, value: 75, level: 1, description: 'Extra storage for your home' },
  trophy_case: { name: 'Trophy Case', type: 'furniture', subtype: 'decoration', value: 100, level: 1, description: 'Display your achievements' },
  garden_plot: { name: 'Garden Plot', type: 'furniture', subtype: 'station', craftType: 'farming', value: 60, level: 1, description: 'Grow herbs and crops at home' },
  computer_desk: { name: 'Computer Desk', type: 'furniture', subtype: 'station', craftType: 'computer', value: 120, level: 1, description: 'Work on your computer for gold' },
};

// ============================================================================
// CRAFTING RECIPES
// ============================================================================
const RECIPES = {
  // Crafting recipes
  iron_sword: { skill: 'crafting', level: 3, ingredients: { iron_ore: 3, oak_log: 1 }, result: 'iron_sword', xp: 30 },
  steel_sword: { skill: 'crafting', level: 7, ingredients: { iron_ore: 5, copper_ore: 2, maple_log: 2 }, result: 'steel_sword', xp: 60 },
  iron_shield: { skill: 'crafting', level: 5, ingredients: { iron_ore: 4, oak_log: 2 }, result: 'iron_shield', xp: 40 },
  iron_chainmail: { skill: 'crafting', level: 6, ingredients: { iron_ore: 6 }, result: 'iron_chainmail', xp: 50 },
  pickaxe: { skill: 'crafting', level: 1, ingredients: { copper_ore: 2, oak_log: 1 }, result: 'pickaxe', xp: 10 },
  steel_pickaxe: { skill: 'crafting', level: 5, ingredients: { iron_ore: 4, maple_log: 2 }, result: 'steel_pickaxe', xp: 35 },

  // Cooking recipes
  cooked_fish: { skill: 'cooking', level: 1, ingredients: { small_fish: 1 }, result: 'cooked_fish', xp: 10 },
  meat_stew: { skill: 'cooking', level: 5, ingredients: { trout: 2, herb_chamomile: 1 }, result: 'meat_stew', xp: 30 },
  feast_plate: { skill: 'cooking', level: 10, ingredients: { salmon: 2, herb_ginseng: 2, trout: 1 }, result: 'feast_plate', xp: 70 },

  // Alchemy recipes
  health_potion: { skill: 'alchemy', level: 1, ingredients: { herb_chamomile: 2 }, result: 'health_potion', xp: 10 },
  mana_potion: { skill: 'alchemy', level: 1, ingredients: { herb_ginseng: 1, herb_chamomile: 1 }, result: 'mana_potion', xp: 12 },
  energy_drink: { skill: 'alchemy', level: 2, ingredients: { herb_ginseng: 2 }, result: 'energy_drink', xp: 15 },
  greater_health_potion: { skill: 'alchemy', level: 5, ingredients: { herb_nightshade: 1, herb_chamomile: 3 }, result: 'greater_health_potion', xp: 35 },
  elixir_of_power: { skill: 'alchemy', level: 8, ingredients: { herb_dragonroot: 1, herb_nightshade: 2, enchanted_gem: 1 }, result: 'elixir_of_power', xp: 60 },
};

// ============================================================================
// MONSTERS
// ============================================================================
const MONSTERS = {
  slime: { name: 'Green Slime', level: 1, hp: 20, attack: 3, defense: 1, xp: 10, gold: 3, drops: [{ item: 'herb_chamomile', chance: 0.3 }] },
  rat: { name: 'Giant Rat', level: 1, hp: 15, attack: 4, defense: 1, xp: 8, gold: 2, drops: [] },
  goblin: { name: 'Goblin', level: 3, hp: 40, attack: 8, defense: 3, xp: 25, gold: 10, drops: [{ item: 'copper_ore', chance: 0.2 }] },
  skeleton: { name: 'Skeleton Warrior', level: 5, hp: 60, attack: 12, defense: 6, xp: 40, gold: 18, drops: [{ item: 'iron_ore', chance: 0.2 }, { item: 'wooden_sword', chance: 0.05 }] },
  wolf: { name: 'Shadow Wolf', level: 4, hp: 45, attack: 14, defense: 4, xp: 35, gold: 12, drops: [{ item: 'dark_essence', chance: 0.1 }] },
  bandit: { name: 'Bandit', level: 6, hp: 70, attack: 15, defense: 8, xp: 50, gold: 25, drops: [{ item: 'iron_sword', chance: 0.05 }, { item: 'health_potion', chance: 0.2 }] },
  ogre: { name: 'Ogre', level: 8, hp: 120, attack: 20, defense: 12, xp: 80, gold: 40, drops: [{ item: 'gold_ore', chance: 0.15 }] },
  dark_mage: { name: 'Dark Mage', level: 10, hp: 80, attack: 25, defense: 8, xp: 100, gold: 55, drops: [{ item: 'mana_potion', chance: 0.3 }, { item: 'enchanted_gem', chance: 0.1 }] },
  troll: { name: 'Cave Troll', level: 12, hp: 180, attack: 28, defense: 18, xp: 130, gold: 70, drops: [{ item: 'mithril_ore', chance: 0.15 }] },
  wyvern: { name: 'Wyvern', level: 15, hp: 250, attack: 35, defense: 22, xp: 200, gold: 100, drops: [{ item: 'dragon_scale', chance: 0.1 }, { item: 'enchanted_gem', chance: 0.2 }] },
  dragon: { name: 'Elder Dragon', level: 20, hp: 500, attack: 50, defense: 35, xp: 500, gold: 300, drops: [{ item: 'dragon_scale', chance: 0.5 }, { item: 'legendary_excalibur', chance: 0.02 }] },
  demon_lord: { name: 'Demon Lord', level: 25, hp: 800, attack: 65, defense: 40, xp: 1000, gold: 500, drops: [{ item: 'legendary_excalibur', chance: 0.05 }, { item: 'dragon_armor', chance: 0.03 }] },
};

// ============================================================================
// LOCATIONS
// ============================================================================
const LOCATIONS = {
  // === TOWN (Central Hub) ===
  town_square: {
    name: 'Town Square',
    area: 'town',
    type: 'communal',
    description: 'The bustling heart of ClawdCity. A grand fountain sits in the center, surrounded by cobblestone paths leading to various districts. Players gather here to socialize and trade.',
    connections: ['market_district', 'guild_hall', 'tavern', 'residential_gate', 'training_grounds', 'temple', 'city_gate'],
    npcs: ['town_crier', 'mayor'],
    activities: ['chat', 'trade', 'rest'],
    ambience: ['Players mill about the square.', 'The fountain splashes peacefully.', 'A street musician plays a lute nearby.', 'Merchants call out their wares in the distance.']
  },
  market_district: {
    name: 'Market District',
    area: 'town',
    type: 'communal',
    description: 'Rows of shops and stalls line the streets. The air is filled with the sounds of haggling and the smell of exotic spices. Every kind of good can be found here.',
    connections: ['town_square', 'general_store', 'weapon_shop', 'armor_shop', 'potion_shop', 'auction_house'],
    npcs: ['merchant_rose'],
    activities: ['shop', 'trade', 'browse'],
    ambience: ['Merchants hawk their wares.', 'A cart loaded with goods rumbles past.', 'The aroma of fresh bread drifts from a bakery.']
  },
  general_store: {
    name: 'General Store',
    area: 'town',
    type: 'communal',
    description: 'A well-stocked shop with all manner of basic supplies, tools, and everyday items. Old Gregor runs this place with a keen eye.',
    connections: ['market_district'],
    npcs: ['shopkeeper_gregor'],
    activities: ['buy', 'sell'],
    shop: {
      items: ['bread', 'pickaxe', 'fishing_rod', 'axe', 'herb_sickle', 'health_potion', 'mana_potion', 'energy_drink', 'storage_chest', 'garden_plot', 'computer_desk'],
      buyMultiplier: 1.0,
      sellMultiplier: 0.5
    },
    ambience: ['Shelves creak under the weight of goods.', 'Gregor polishes the counter absentmindedly.']
  },
  weapon_shop: {
    name: 'Steel & Fury Weapon Shop',
    area: 'town',
    type: 'communal',
    description: 'The forge burns hot in the back of this shop. Weapons of all kinds line the walls - swords, bows, staves, and more.',
    connections: ['market_district'],
    npcs: ['blacksmith_hank'],
    activities: ['buy', 'sell'],
    shop: {
      items: ['wooden_sword', 'iron_sword', 'steel_sword', 'crystal_staff', 'fire_bow', 'steel_pickaxe', 'steel_axe'],
      buyMultiplier: 1.0,
      sellMultiplier: 0.5
    },
    ambience: ['The ring of hammer on steel echoes from the forge.', 'Weapons gleam in the firelight.']
  },
  armor_shop: {
    name: 'Iron Wall Armory',
    area: 'town',
    type: 'communal',
    description: 'Heavy armor stands on display racks, from simple leather gear to gleaming plate mail. The shop smells of oil and worked leather.',
    connections: ['market_district'],
    npcs: ['armorer_silva'],
    activities: ['buy', 'sell'],
    shop: {
      items: ['cloth_shirt', 'leather_armor', 'iron_chainmail', 'steel_plate', 'leather_cap', 'iron_helm', 'wooden_shield', 'iron_shield', 'tower_shield'],
      buyMultiplier: 1.0,
      sellMultiplier: 0.5
    },
    ambience: ['Armor clinks gently as you browse.', 'Silva tests the straps on a new breastplate.']
  },
  potion_shop: {
    name: 'Mystic Brews Potion Shop',
    area: 'town',
    type: 'communal',
    description: 'Colorful liquids bubble in glass bottles lining every surface. The witch Elara brews her concoctions in a massive cauldron.',
    connections: ['market_district'],
    npcs: ['witch_elara'],
    activities: ['buy', 'sell'],
    shop: {
      items: ['health_potion', 'mana_potion', 'energy_drink', 'greater_health_potion', 'elixir_of_power', 'alchemy_table', 'enchanting_altar'],
      buyMultiplier: 1.0,
      sellMultiplier: 0.6
    },
    ambience: ['Potions bubble and fizz on the shelves.', 'A mysterious haze fills the air.']
  },
  auction_house: {
    name: 'Auction House',
    area: 'town',
    type: 'communal',
    description: 'A grand hall where players can list items for sale and bid on rare goods from others. The auctioneer keeps things orderly.',
    connections: ['market_district'],
    npcs: ['auctioneer_felix'],
    activities: ['auction', 'trade'],
    ambience: ['The auctioneer calls out bids.', 'Players examine items on display.']
  },
  guild_hall: {
    name: 'Guild Hall',
    area: 'town',
    type: 'communal',
    description: 'A massive stone building with banners from every guild hanging from the rafters. Quest boards line the walls, and guild leaders gather here.',
    connections: ['town_square'],
    npcs: ['guild_master_aria', 'quest_board'],
    activities: ['quest', 'guild', 'socialize'],
    ambience: ['Adventurers boast of their exploits.', 'Guild banners flutter in the draft.']
  },
  tavern: {
    name: 'The Golden Tankard Tavern',
    area: 'town',
    type: 'communal',
    description: 'A warm, rowdy establishment where adventurers come to drink, eat, and share stories. A bard plays in the corner. Rooms are available upstairs.',
    connections: ['town_square'],
    npcs: ['bartender_joe', 'bard_melody'],
    activities: ['drink', 'eat', 'socialize', 'rest', 'gamble'],
    shop: {
      items: ['bread', 'cooked_fish', 'meat_stew', 'feast_plate', 'energy_drink'],
      buyMultiplier: 1.2,
      sellMultiplier: 0.3
    },
    ambience: ['Laughter and music fill the air.', 'The smell of ale and roasted meat is overwhelming.', 'A drunk adventurer tells tall tales.']
  },
  temple: {
    name: 'Temple of Light',
    area: 'town',
    type: 'communal',
    description: 'A serene marble temple where the faithful come to pray and heal. The priestess offers blessings to weary adventurers.',
    connections: ['town_square'],
    npcs: ['priestess_luna'],
    activities: ['heal', 'pray', 'rest'],
    ambience: ['Soft chanting echoes through the halls.', 'Candlelight flickers peacefully.']
  },
  training_grounds: {
    name: 'Training Grounds',
    area: 'town',
    type: 'communal',
    description: 'An open yard with training dummies, sparring rings, and an obstacle course. Warriors hone their skills here daily.',
    connections: ['town_square', 'arena'],
    npcs: ['trainer_rex'],
    activities: ['train', 'spar', 'practice'],
    monsters: ['slime', 'rat'],
    ambience: ['The clang of practice swords fills the air.', 'A trainer barks orders at recruits.']
  },
  arena: {
    name: 'The Grand Arena',
    area: 'town',
    type: 'communal',
    description: 'A massive colosseum where players can fight monsters in waves or duel other players. The crowd roars with each victory.',
    connections: ['training_grounds'],
    npcs: ['arena_master_brutus'],
    activities: ['fight', 'duel', 'spectate'],
    monsters: ['goblin', 'skeleton', 'ogre'],
    ambience: ['The crowd chants for blood.', 'Weapons clash in the arena below.']
  },
  residential_gate: {
    name: 'Residential Gate',
    area: 'town',
    type: 'communal',
    description: 'A guarded gate leading to the residential district where player homes are located. Show your deed to pass.',
    connections: ['town_square'],
    npcs: ['gate_guard'],
    activities: ['go_home'],
    ambience: ['Guards stand watch at the gate.', 'Residents come and go through the archway.']
  },

  // === WILDERNESS ===
  city_gate: {
    name: 'City Gate',
    area: 'town',
    type: 'communal',
    description: 'The grand entrance to ClawdCity. Beyond lies the wilderness, filled with both danger and opportunity.',
    connections: ['town_square', 'forest_path', 'river_bank', 'mountain_trail'],
    npcs: ['gate_captain'],
    activities: ['explore'],
    ambience: ['Guards patrol the walls above.', 'The wilderness stretches out before you.']
  },
  forest_path: {
    name: 'Whispering Forest',
    area: 'wilderness',
    type: 'communal',
    description: 'A dense forest with towering oak and maple trees. Sunlight filters through the canopy. Strange sounds echo between the trunks.',
    connections: ['city_gate', 'deep_forest', 'forest_clearing'],
    npcs: [],
    activities: ['explore', 'woodcutting', 'herbalism', 'hunt'],
    monsters: ['slime', 'rat', 'wolf'],
    resources: { woodcutting: ['oak_log'], herbalism: ['herb_chamomile', 'herb_ginseng'] },
    ambience: ['Leaves rustle in the wind.', 'A bird calls from high above.', 'Something moves in the underbrush.']
  },
  deep_forest: {
    name: 'Deep Forest',
    area: 'wilderness',
    type: 'communal',
    description: 'The trees here grow impossibly thick and old. Darkness pervades even at midday. Dangerous creatures lurk in every shadow.',
    connections: ['forest_path', 'ancient_ruins'],
    npcs: ['hermit_sage'],
    activities: ['explore', 'woodcutting', 'herbalism', 'hunt'],
    monsters: ['wolf', 'goblin', 'bandit'],
    resources: { woodcutting: ['maple_log', 'yew_log'], herbalism: ['herb_ginseng', 'herb_nightshade'] },
    ambience: ['The forest groans and creaks.', 'Eyes seem to watch you from the darkness.', 'A distant howl sends chills down your spine.']
  },
  forest_clearing: {
    name: 'Forest Clearing',
    area: 'wilderness',
    type: 'communal',
    description: 'A peaceful clearing in the forest where a small pond reflects the sky. Herbs grow abundantly along the edges.',
    connections: ['forest_path'],
    npcs: ['traveling_merchant'],
    activities: ['rest', 'herbalism', 'fishing'],
    resources: { herbalism: ['herb_chamomile', 'herb_ginseng'], fishing: ['small_fish', 'trout'] },
    ambience: ['Butterflies dance over the pond.', 'The clearing is warm and peaceful.']
  },
  river_bank: {
    name: 'Crystal River',
    area: 'wilderness',
    type: 'communal',
    description: 'A wide river with crystal-clear water flowing from the mountains. Fish can be seen darting beneath the surface.',
    connections: ['city_gate', 'waterfall'],
    npcs: ['old_fisherman'],
    activities: ['fishing', 'rest', 'explore'],
    resources: { fishing: ['small_fish', 'trout', 'salmon'] },
    ambience: ['The river babbles over smooth stones.', 'A fish jumps out of the water.']
  },
  waterfall: {
    name: 'Hidden Waterfall',
    area: 'wilderness',
    type: 'communal',
    description: 'A majestic waterfall cascades into a deep pool. Behind the curtain of water, there appears to be a cave entrance.',
    connections: ['river_bank', 'hidden_cave'],
    npcs: [],
    activities: ['explore', 'fishing', 'swim'],
    resources: { fishing: ['salmon', 'golden_fish'] },
    ambience: ['The waterfall roars powerfully.', 'Mist hangs in the air like diamonds.']
  },
  hidden_cave: {
    name: 'Hidden Cave',
    area: 'dungeon',
    type: 'communal',
    description: 'A dark cave behind the waterfall. Crystals embedded in the walls glow faintly, and the air is thick with magical energy.',
    connections: ['waterfall'],
    npcs: [],
    activities: ['explore', 'mining'],
    monsters: ['skeleton', 'dark_mage'],
    resources: { mining: ['iron_ore', 'gold_ore', 'enchanted_gem'] },
    ambience: ['Crystals pulse with an eerie light.', 'Water drips from stalactites above.']
  },
  mountain_trail: {
    name: 'Mountain Trail',
    area: 'wilderness',
    type: 'communal',
    description: 'A winding path leading up into the misty mountains. The air grows thinner and colder as you ascend.',
    connections: ['city_gate', 'mountain_mine', 'dragon_peak'],
    npcs: [],
    activities: ['explore', 'mining', 'herbalism'],
    monsters: ['goblin', 'ogre'],
    resources: { mining: ['copper_ore', 'iron_ore'], herbalism: ['herb_nightshade'] },
    ambience: ['Wind howls through the mountain pass.', 'Loose rocks tumble down the slope.']
  },
  mountain_mine: {
    name: 'Dwarven Mines',
    area: 'dungeon',
    type: 'communal',
    description: 'Ancient mines carved deep into the mountain by dwarves long ago. Rich veins of ore glint in the torchlight.',
    connections: ['mountain_trail'],
    npcs: ['dwarf_miner'],
    activities: ['mining'],
    monsters: ['skeleton', 'troll'],
    resources: { mining: ['iron_ore', 'gold_ore', 'mithril_ore'] },
    ambience: ['Picks ring against stone in the distance.', 'Cart tracks lead deeper into the darkness.']
  },
  dragon_peak: {
    name: "Dragon's Peak",
    area: 'dungeon',
    type: 'communal',
    description: "The summit of the highest mountain, scorched by dragon fire. Only the bravest adventurers dare climb this far. The dragon's lair awaits.",
    connections: ['mountain_trail'],
    npcs: [],
    activities: ['fight', 'explore'],
    monsters: ['wyvern', 'dragon'],
    resources: { herbalism: ['herb_dragonroot'], mining: ['mithril_ore'] },
    ambience: ['The ground trembles beneath your feet.', 'A massive shadow passes overhead.', 'Charred bones litter the ground.']
  },
  ancient_ruins: {
    name: 'Ancient Ruins',
    area: 'dungeon',
    type: 'communal',
    description: 'Crumbling stone structures from a forgotten civilization. Dark magic still lingers here, and powerful enemies guard ancient treasures.',
    connections: ['deep_forest', 'demon_gate'],
    npcs: [],
    activities: ['explore', 'fight'],
    monsters: ['skeleton', 'dark_mage', 'troll'],
    resources: { mining: ['gold_ore', 'enchanted_gem'] },
    ambience: ['Ancient runes glow on the walls.', 'The air crackles with residual magic.']
  },
  demon_gate: {
    name: 'Demon Gate',
    area: 'dungeon',
    type: 'communal',
    description: 'A swirling portal of dark energy at the heart of the ruins. The Demon Lord waits beyond for those foolish enough to enter.',
    connections: ['ancient_ruins'],
    npcs: [],
    activities: ['fight'],
    monsters: ['demon_lord'],
    ambience: ['Reality warps and bends around the gate.', 'Screams echo from beyond the portal.']
  },

  // === PLAYER HOME (template) ===
  player_home: {
    name: 'Your Home',
    area: 'residential',
    type: 'private',
    description: 'Your personal space in ClawdCity. A cozy dwelling where you can rest, craft, store items, and plan your adventures.',
    connections: ['residential_gate'],
    npcs: [],
    activities: ['rest', 'craft', 'store', 'decorate', 'farm', 'cook', 'work'],
    ambience: ['Your home is quiet and peaceful.', 'A fire crackles in the hearth.']
  }
};

// ============================================================================
// NPCs
// ============================================================================
const NPCS = {
  town_crier: {
    name: 'Town Crier Barnaby',
    greeting: 'Hear ye, hear ye! Welcome to ClawdCity, adventurer!',
    role: 'information',
    dialogue: {
      default: "What would you like to know? I can tell you about the town, quests, or recent events!",
      town: "ClawdCity has everything an adventurer needs - shops in the Market District, the Guild Hall for quests, the Tavern for rest, and the Training Grounds to hone your skills!",
      quests: "Check the Quest Board in the Guild Hall for available quests! Guild Master Aria can help you get started.",
      events: "There are rumors of a dragon stirring on the mountain peak... and bandits have been raiding the forest roads!"
    }
  },
  mayor: {
    name: 'Mayor Aldric',
    greeting: 'Welcome, citizen. ClawdCity prospers with adventurers like you.',
    role: 'quest_giver',
    dialogue: { default: "The city needs brave souls. Visit the Guild Hall if you're looking for work." }
  },
  shopkeeper_gregor: {
    name: 'Old Gregor',
    greeting: 'Welcome to my shop! I have all the basics you need.',
    role: 'shopkeeper',
    dialogue: { default: "Looking to buy or sell? I've got fair prices on tools, potions, and supplies." }
  },
  blacksmith_hank: {
    name: 'Hank the Blacksmith',
    greeting: "Finest weapons in ClawdCity, forged with my own hands!",
    role: 'shopkeeper',
    dialogue: { default: "Need a weapon? I've got blades, bows, and more. I can also upgrade your gear if you bring the materials." }
  },
  armorer_silva: {
    name: 'Silva the Armorer',
    greeting: 'Protection is paramount, adventurer. Browse my wares.',
    role: 'shopkeeper',
    dialogue: { default: "From leather to plate, I have armor for every budget and style." }
  },
  witch_elara: {
    name: 'Witch Elara',
    greeting: 'Ahh, another soul seeking my brews? Come in, come in...',
    role: 'shopkeeper',
    dialogue: { default: "Potions, elixirs, enchanting supplies... I have it all. But handle the nightshade carefully, dear." }
  },
  guild_master_aria: {
    name: 'Guild Master Aria',
    greeting: 'Looking for adventure? You have come to the right place.',
    role: 'quest_giver',
    quests: ['goblin_hunt', 'crystal_collection', 'bandit_camp', 'dragon_slayer', 'demon_gate_quest'],
    dialogue: { default: "Check the quest board or speak with me directly. Every quest completed earns gold, XP, and guild reputation." }
  },
  bartender_joe: {
    name: 'Bartender Joe',
    greeting: 'What\'ll it be? Pull up a stool and rest your feet.',
    role: 'shopkeeper',
    dialogue: { default: "Food and drink to restore your strength. I also hear plenty of rumors if you're interested..." }
  },
  bard_melody: {
    name: 'Bard Melody',
    greeting: '♪ A hero walks in, tale yet untold... ♪',
    role: 'information',
    dialogue: { default: "I sing of heroes and their deeds! Complete great quests and I might compose a ballad in your honor." }
  },
  priestess_luna: {
    name: 'Priestess Luna',
    greeting: 'The light welcomes you, weary traveler.',
    role: 'healer',
    dialogue: { default: "I can heal your wounds and cure ailments. A small donation to the temple is appreciated but not required." }
  },
  trainer_rex: {
    name: 'Trainer Rex',
    greeting: "Think you're tough? Prove it on the training grounds!",
    role: 'trainer',
    dialogue: { default: "I can help you improve your combat skills. Practice on the dummies or spar with me! You can also fight monsters in the arena." }
  },
  arena_master_brutus: {
    name: 'Arena Master Brutus',
    greeting: 'WELCOME TO THE ARENA! Fight or watch - either way, you will be entertained!',
    role: 'arena',
    dialogue: { default: "Step into the ring and face increasingly powerful foes. Great rewards await those who survive!" }
  },
  auctioneer_felix: {
    name: 'Auctioneer Felix',
    greeting: 'Welcome to the Auction House! Buy rare items from fellow adventurers!',
    role: 'auction',
    dialogue: { default: "List your items for sale or bid on others. I take a small 5% commission on all sales." }
  },
  gate_guard: {
    name: 'Gate Guard',
    greeting: 'Halt! Only homeowners may pass. Do you wish to enter your residence?',
    role: 'gate',
    dialogue: { default: "Say 'go home' and I'll let you through to your residence." }
  },
  gate_captain: {
    name: 'Captain of the Guard',
    greeting: 'Be careful out there, adventurer. The wilderness is dangerous.',
    role: 'information',
    dialogue: { default: "Beyond these walls lie forests, rivers, mountains, and ancient ruins. Each holds both treasure and peril." }
  },
  merchant_rose: {
    name: 'Merchant Rose',
    greeting: 'Looking for something special? I know where to find the best deals.',
    role: 'information',
    dialogue: { default: "The General Store has basics, Steel & Fury for weapons, Iron Wall for armor, and Mystic Brews for potions." }
  },
  old_fisherman: {
    name: 'Old Fisherman Pete',
    greeting: "The fish are biting today! Got a rod?",
    role: 'trainer',
    dialogue: { default: "To fish, you'll need a Fishing Rod from the General Store. Cast your line and see what you catch!" }
  },
  hermit_sage: {
    name: 'Hermit Sage Orin',
    greeting: 'Few venture this deep into the forest... You seek knowledge?',
    role: 'quest_giver',
    dialogue: { default: "I study the ancient magics that permeate these woods. Bring me rare herbs and I can teach you secrets of alchemy." }
  },
  dwarf_miner: {
    name: 'Dwarf Miner Thorin',
    greeting: 'Watch yer head! These tunnels were built for dwarven folk!',
    role: 'information',
    dialogue: { default: "The deeper you go, the better the ore. But beware - trolls have taken over the lower levels." }
  },
  traveling_merchant: {
    name: 'Traveling Merchant Zara',
    greeting: 'Rare goods from distant lands! Take a look!',
    role: 'shopkeeper',
    dialogue: { default: "I travel between towns selling exotic wares. Catch me while you can!" },
  },
  quest_board: {
    name: 'Quest Board',
    greeting: 'A wooden board covered in quest notices.',
    role: 'quest_board',
    dialogue: { default: "Various quests are pinned to the board. Type 'view quests' to see available quests." }
  }
};

// ============================================================================
// QUESTS
// ============================================================================
const QUESTS = {
  tutorial_start: {
    name: 'Welcome to ClawdCity',
    description: 'Get acquainted with the city. Visit the Market District, Guild Hall, and Training Grounds.',
    type: 'main',
    level: 1,
    steps: [
      { action: 'visit', target: 'market_district', description: 'Visit the Market District' },
      { action: 'visit', target: 'guild_hall', description: 'Visit the Guild Hall' },
      { action: 'visit', target: 'training_grounds', description: 'Visit the Training Grounds' },
    ],
    rewards: { xp: 50, gold: 25, items: ['wooden_sword', 'cloth_shirt'] }
  },
  goblin_hunt: {
    name: 'Goblin Menace',
    description: 'Goblins have been raiding travelers on the forest path. Defeat 3 goblins to restore peace.',
    type: 'combat',
    level: 3,
    steps: [
      { action: 'kill', target: 'goblin', count: 3, description: 'Defeat 3 Goblins' }
    ],
    rewards: { xp: 100, gold: 50, items: ['iron_sword'] }
  },
  crystal_collection: {
    name: 'Crystal Collector',
    description: 'The witch Elara needs Crystal Shards for her research. Find 5 in the Hidden Cave.',
    type: 'gathering',
    level: 5,
    steps: [
      { action: 'collect', target: 'crystal_shard', count: 5, description: 'Collect 5 Crystal Shards' }
    ],
    rewards: { xp: 150, gold: 80, items: ['greater_health_potion', 'greater_health_potion'] }
  },
  bandit_camp: {
    name: 'Clear the Bandit Camp',
    description: 'Bandits have set up camp in the Deep Forest. Eliminate their leader and 5 bandits.',
    type: 'combat',
    level: 7,
    steps: [
      { action: 'kill', target: 'bandit', count: 5, description: 'Defeat 5 Bandits' }
    ],
    rewards: { xp: 300, gold: 150, items: ['steel_sword'] }
  },
  dragon_slayer: {
    name: 'Dragon Slayer',
    description: "An Elder Dragon terrorizes the mountain. Only the strongest can hope to defeat it.",
    type: 'boss',
    level: 15,
    steps: [
      { action: 'kill', target: 'dragon', count: 1, description: 'Defeat the Elder Dragon' }
    ],
    rewards: { xp: 1000, gold: 500, items: ['dragon_armor'] }
  },
  demon_gate_quest: {
    name: 'Close the Demon Gate',
    description: 'A portal to the demon realm has opened in the ancient ruins. Defeat the Demon Lord to seal it.',
    type: 'boss',
    level: 20,
    steps: [
      { action: 'kill', target: 'demon_lord', count: 1, description: 'Defeat the Demon Lord' }
    ],
    rewards: { xp: 2000, gold: 1000, items: ['legendary_excalibur'] }
  },
  first_catch: {
    name: 'First Catch',
    description: 'Catch your first fish! Visit the Crystal River with a Fishing Rod.',
    type: 'gathering',
    level: 1,
    steps: [
      { action: 'collect', target: 'small_fish', count: 1, description: 'Catch 1 fish' }
    ],
    rewards: { xp: 20, gold: 10, items: [] }
  },
  miner_apprentice: {
    name: "Miner's Apprentice",
    description: 'Mine 10 Copper Ore to prove yourself as a miner.',
    type: 'gathering',
    level: 1,
    steps: [
      { action: 'collect', target: 'copper_ore', count: 10, description: 'Mine 10 Copper Ore' }
    ],
    rewards: { xp: 40, gold: 20, items: ['steel_pickaxe'] }
  },
  home_improvement: {
    name: 'Home Sweet Home',
    description: 'Furnish your home with a Workbench, Cooking Stove, and Basic Bed.',
    type: 'crafting',
    level: 1,
    steps: [
      { action: 'furnish', target: 'workbench', description: 'Place a Workbench in your home' },
      { action: 'furnish', target: 'cooking_stove', description: 'Place a Cooking Stove in your home' },
      { action: 'furnish', target: 'basic_bed', description: 'Place a Basic Bed in your home' },
    ],
    rewards: { xp: 60, gold: 30, items: [] }
  }
};

// ============================================================================
// WORLD EVENTS
// ============================================================================
const WORLD_EVENTS = [
  { name: 'Goblin Invasion', description: 'A horde of goblins attacks the city gate! Defend the town!', location: 'city_gate', monster: 'goblin', count: 5, bonusXp: 2.0, bonusGold: 2.0 },
  { name: 'Dragon Sighting', description: 'A dragon has been spotted near the mountains! Brave souls are needed!', location: 'dragon_peak', monster: 'dragon', count: 1, bonusXp: 1.5, bonusGold: 1.5 },
  { name: 'Merchant Festival', description: 'A traveling merchant caravan has arrived! All shop prices reduced by 20%!', location: 'market_district', type: 'economic', discount: 0.8, duration: 120000 },
  { name: 'Double XP Hour', description: 'The stars align! All XP gains are doubled!', type: 'buff', xpMultiplier: 2.0, duration: 120000 },
  { name: 'Treasure Rain', description: 'Golden chests have appeared throughout the wilderness! Find them for bonus loot!', type: 'exploration', bonusGold: 3.0, duration: 120000 },
  { name: 'Full Moon', description: 'The full moon rises, strengthening dark creatures but increasing their rewards!', type: 'combat', monsterBuff: 1.3, bonusXp: 1.5, bonusGold: 1.5, duration: 180000 },
];

module.exports = { GAME_CONFIG, SKILLS, ITEMS, RECIPES, MONSTERS, LOCATIONS, NPCS, QUESTS, WORLD_EVENTS };
