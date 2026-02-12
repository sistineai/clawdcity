// ============================================================================
// CLAWDCITY MMORPG - Player Model
// Manages player state, stats, inventory, equipment, and progression
// ============================================================================

const { GAME_CONFIG, SKILLS, ITEMS } = require('../data/world');

function createNewPlayer(username) {
  const skills = {};
  for (const skillId of Object.keys(SKILLS)) {
    skills[skillId] = { level: 1, xp: 0 };
  }

  return {
    username,
    createdAt: Date.now(),
    lastLogin: Date.now(),

    // Core stats
    level: 1,
    xp: 0,
    xpToNext: GAME_CONFIG.BASE_XP_PER_LEVEL,
    gold: GAME_CONFIG.STARTING_GOLD,

    // Vitals
    hp: GAME_CONFIG.STARTING_HP,
    maxHp: GAME_CONFIG.STARTING_HP,
    mp: GAME_CONFIG.STARTING_MP,
    maxMp: GAME_CONFIG.STARTING_MP,
    energy: GAME_CONFIG.STARTING_ENERGY,
    maxEnergy: GAME_CONFIG.STARTING_ENERGY,

    // Computed combat stats (base + equipment)
    baseAttack: 2,
    baseDefense: 1,
    baseMagic: 1,
    baseSpeed: 5,

    // Location
    location: 'town_square',
    previousLocation: null,

    // Inventory & Equipment
    inventory: [
      { itemId: 'bread', quantity: 5 },
    ],
    equipment: {
      weapon: null,
      head: null,
      chest: null,
      shield: null,
    },

    // Skills
    skills,

    // Quests
    activeQuests: [],
    completedQuests: [],
    questProgress: {},

    // Home
    home: {
      furniture: [],
      storage: [],
      upgrades: { size: 1 },
    },

    // State
    state: 'idle', // idle, fighting, gathering, crafting, resting, working, traveling
    stateData: null,
    actionTimer: null,

    // Stats tracking
    statistics: {
      monstersKilled: 0,
      totalGoldEarned: 0,
      totalXpEarned: 0,
      itemsCrafted: 0,
      questsCompleted: 0,
      deaths: 0,
      distanceTraveled: 0,
      resourcesGathered: 0,
      pvpWins: 0,
      pvpLosses: 0,
    },

    // Social
    guild: null,
    friends: [],
    title: 'Newcomer',
  };
}

function getXpForLevel(level) {
  return Math.floor(GAME_CONFIG.BASE_XP_PER_LEVEL * Math.pow(GAME_CONFIG.XP_SCALING, level - 1));
}

function addXp(player, amount, worldXpMultiplier = 1) {
  const totalXp = Math.floor(amount * worldXpMultiplier);
  player.xp += totalXp;
  player.statistics.totalXpEarned += totalXp;
  const messages = [];

  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++;
    player.xpToNext = getXpForLevel(player.level);

    // Stat increases on level up
    player.maxHp += 10;
    player.hp = player.maxHp;
    player.maxMp += 5;
    player.mp = player.maxMp;
    player.maxEnergy += 5;
    player.energy = player.maxEnergy;
    player.baseAttack += 1;
    player.baseDefense += 1;

    // Title updates
    if (player.level >= 25) player.title = 'Legendary Champion';
    else if (player.level >= 20) player.title = 'Master';
    else if (player.level >= 15) player.title = 'Veteran';
    else if (player.level >= 10) player.title = 'Seasoned Adventurer';
    else if (player.level >= 5) player.title = 'Adventurer';
    else if (player.level >= 3) player.title = 'Apprentice';

    messages.push(`\n⬆️ LEVEL UP! You are now level ${player.level}! HP+10, MP+5, Energy+5, Attack+1, Defense+1`);
  }

  return { xpGained: totalXp, messages };
}

function addSkillXp(player, skillId, amount) {
  if (!player.skills[skillId]) return { messages: [] };
  const skill = player.skills[skillId];
  skill.xp += amount;
  const messages = [];
  const xpNeeded = getXpForLevel(skill.level);

  while (skill.xp >= xpNeeded) {
    skill.xp -= xpNeeded;
    skill.level++;
    messages.push(`\n🔧 ${SKILLS[skillId].name} leveled up to ${skill.level}!`);
  }

  return { messages };
}

function getCombatStats(player) {
  let attack = player.baseAttack;
  let defense = player.baseDefense;
  let magic = player.baseMagic;
  let speed = player.baseSpeed;

  for (const [slot, itemId] of Object.entries(player.equipment)) {
    if (!itemId) continue;
    const item = ITEMS[itemId];
    if (!item || !item.stats) continue;
    if (item.stats.attack) attack += item.stats.attack;
    if (item.stats.defense) defense += item.stats.defense;
    if (item.stats.magic) magic += item.stats.magic;
    if (item.stats.speed) speed += item.stats.speed;
  }

  // Combat skill bonus
  const combatLevel = player.skills.combat ? player.skills.combat.level : 1;
  attack += Math.floor(combatLevel / 2);
  defense += Math.floor(combatLevel / 3);

  return { attack, defense, magic, speed };
}

function hasItem(player, itemId, quantity = 1) {
  const slot = player.inventory.find(s => s.itemId === itemId);
  return slot && slot.quantity >= quantity;
}

function addItem(player, itemId, quantity = 1) {
  const existing = player.inventory.find(s => s.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    if (player.inventory.length >= GAME_CONFIG.MAX_INVENTORY_SLOTS) {
      return false; // Inventory full
    }
    player.inventory.push({ itemId, quantity });
  }
  return true;
}

function removeItem(player, itemId, quantity = 1) {
  const idx = player.inventory.findIndex(s => s.itemId === itemId);
  if (idx === -1) return false;
  if (player.inventory[idx].quantity < quantity) return false;
  player.inventory[idx].quantity -= quantity;
  if (player.inventory[idx].quantity <= 0) {
    player.inventory.splice(idx, 1);
  }
  return true;
}

function addGold(player, amount) {
  player.gold += amount;
  player.statistics.totalGoldEarned += amount;
}

function removeGold(player, amount) {
  if (player.gold < amount) return false;
  player.gold -= amount;
  return true;
}

function equipItem(player, itemId) {
  const item = ITEMS[itemId];
  if (!item) return { success: false, message: 'Item not found.' };
  if (item.type !== 'weapon' && item.type !== 'armor') return { success: false, message: 'This item cannot be equipped.' };
  if (item.level > player.level) return { success: false, message: `You need to be level ${item.level} to equip this.` };
  if (!hasItem(player, itemId)) return { success: false, message: "You don't have this item." };

  const slot = item.slot || (item.type === 'weapon' ? 'weapon' : 'chest');

  // Unequip current item in slot
  if (player.equipment[slot]) {
    addItem(player, player.equipment[slot]);
  }

  removeItem(player, itemId);
  player.equipment[slot] = itemId;

  return { success: true, message: `Equipped ${item.name} in ${slot} slot.` };
}

function unequipItem(player, slot) {
  if (!player.equipment[slot]) return { success: false, message: `Nothing equipped in ${slot} slot.` };

  const itemId = player.equipment[slot];
  const item = ITEMS[itemId];

  if (!addItem(player, itemId)) {
    return { success: false, message: 'Inventory is full!' };
  }

  player.equipment[slot] = null;
  return { success: true, message: `Unequipped ${item.name}.` };
}

function getPlayerSummary(player) {
  const stats = getCombatStats(player);
  return {
    username: player.username,
    level: player.level,
    title: player.title,
    xp: player.xp,
    xpToNext: player.xpToNext,
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    energy: player.energy,
    maxEnergy: player.maxEnergy,
    gold: player.gold,
    attack: stats.attack,
    defense: stats.defense,
    magic: stats.magic,
    speed: stats.speed,
    location: player.location,
    state: player.state,
  };
}

module.exports = {
  createNewPlayer, getXpForLevel, addXp, addSkillXp, getCombatStats,
  hasItem, addItem, removeItem, addGold, removeGold,
  equipItem, unequipItem, getPlayerSummary
};
