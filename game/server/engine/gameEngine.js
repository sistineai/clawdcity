// ============================================================================
// CLAWDCITY MMORPG - Game Engine
// Core game logic: actions, combat, gathering, crafting, quests, etc.
// ============================================================================

const { GAME_CONFIG, ITEMS, MONSTERS, LOCATIONS, NPCS, QUESTS, RECIPES, SKILLS, WORLD_EVENTS } = require('../data/world');
const {
  addXp, addSkillXp, getCombatStats, hasItem, addItem, removeItem,
  addGold, removeGold, equipItem, unequipItem, getPlayerSummary
} = require('./player');

class GameEngine {
  constructor() {
    this.players = {};        // username -> playerData
    this.onlinePlayers = {};  // username -> websocket
    this.worldState = {
      activeEvent: null,
      eventTimer: null,
      xpMultiplier: 1,
      goldMultiplier: 1,
      shopDiscount: 1,
    };
    this.chatLog = [];
    this.auctionHouse = [];
    this.startWorldEvents();
    this.startRegenTick();
  }

  // =========================================================================
  // WORLD SYSTEMS
  // =========================================================================
  startWorldEvents() {
    setInterval(() => {
      const event = WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)];
      this.worldState.activeEvent = { ...event, startedAt: Date.now() };

      if (event.xpMultiplier) this.worldState.xpMultiplier = event.xpMultiplier;
      if (event.discount) this.worldState.shopDiscount = event.discount;

      this.broadcast('world_event', {
        name: event.name,
        description: event.description,
        location: event.location || 'everywhere',
      });

      // Clear event after duration
      const duration = event.duration || 120000;
      setTimeout(() => {
        this.worldState.activeEvent = null;
        this.worldState.xpMultiplier = 1;
        this.worldState.goldMultiplier = 1;
        this.worldState.shopDiscount = 1;
        this.broadcast('world_event_end', { name: event.name });
      }, duration);
    }, GAME_CONFIG.WORLD_EVENT_INTERVAL_MS);
  }

  startRegenTick() {
    setInterval(() => {
      for (const [username, player] of Object.entries(this.players)) {
        if (!this.onlinePlayers[username]) continue;
        let changed = false;

        if (player.hp < player.maxHp) {
          const rate = player.state === 'resting' ? GAME_CONFIG.HP_REGEN_RATE * 3 : GAME_CONFIG.HP_REGEN_RATE;
          player.hp = Math.min(player.maxHp, player.hp + rate);
          changed = true;
        }
        if (player.mp < player.maxMp) {
          const rate = player.state === 'resting' ? GAME_CONFIG.MP_REGEN_RATE * 3 : GAME_CONFIG.MP_REGEN_RATE;
          player.mp = Math.min(player.maxMp, player.mp + rate);
          changed = true;
        }
        if (player.energy < player.maxEnergy) {
          const rate = player.state === 'resting' ? GAME_CONFIG.ENERGY_REGEN_RATE * 3 : GAME_CONFIG.ENERGY_REGEN_RATE;
          player.energy = Math.min(player.maxEnergy, player.energy + rate);
          changed = true;
        }

        if (changed) {
          this.sendToPlayer(username, 'stats_update', getPlayerSummary(player));
        }
      }
    }, 10000);
  }

  broadcast(type, data) {
    for (const [username, ws] of Object.entries(this.onlinePlayers)) {
      try {
        ws.send(JSON.stringify({ type, data }));
      } catch (e) { /* ignore closed connections */ }
    }
  }

  broadcastToLocation(location, type, data, excludeUser = null) {
    for (const [username, player] of Object.entries(this.players)) {
      if (player.location === location && username !== excludeUser && this.onlinePlayers[username]) {
        this.sendToPlayer(username, type, data);
      }
    }
  }

  sendToPlayer(username, type, data) {
    const ws = this.onlinePlayers[username];
    if (ws) {
      try {
        ws.send(JSON.stringify({ type, data }));
      } catch (e) { /* ignore */ }
    }
  }

  getPlayersAtLocation(location, excludeUser = null) {
    const players = [];
    for (const [username, player] of Object.entries(this.players)) {
      if (player.location === location && username !== excludeUser && this.onlinePlayers[username]) {
        players.push(username);
      }
    }
    return players;
  }

  // =========================================================================
  // ACTION DISPATCHER
  // =========================================================================
  handleAction(username, command) {
    const player = this.players[username];
    if (!player) return [{ type: 'error', message: 'Player not found.' }];

    // Check if busy
    if (player.state === 'fighting' && command.action !== 'stats' && command.action !== 'inventory' && command.action !== 'help' && command.action !== 'use_item') {
      return [{ type: 'error', message: "You're in combat! Focus on the fight or use an item!" }];
    }
    if (player.state === 'traveling' && command.action !== 'stats') {
      return [{ type: 'error', message: "You're traveling. Please wait until you arrive." }];
    }

    switch (command.action) {
      case 'move': return this.handleMove(player, command);
      case 'go_home': return this.handleGoHome(player);
      case 'look': return this.handleLook(player);
      case 'examine': return this.handleExamine(player, command);
      case 'stats': return this.handleStats(player);
      case 'skills': return this.handleSkills(player);
      case 'inventory': return this.handleInventory(player);
      case 'equipment': return this.handleEquipment(player);
      case 'equip': return this.handleEquip(player, command);
      case 'unequip': return this.handleUnequip(player, command);
      case 'use_item': return this.handleUseItem(player, command);
      case 'drop': return this.handleDrop(player, command);
      case 'fight': return this.handleFight(player, command);
      case 'buy': return this.handleBuy(player, command);
      case 'sell': return this.handleSell(player, command);
      case 'browse_shop': return this.handleBrowseShop(player);
      case 'talk': return this.handleTalk(player, command);
      case 'gather': return this.handleGather(player, command);
      case 'craft': return this.handleCraft(player, command);
      case 'view_recipes': return this.handleViewRecipes(player);
      case 'rest': return this.handleRest(player);
      case 'heal': return this.handleHeal(player);
      case 'pray': return this.handlePray(player);
      case 'train': return this.handleTrain(player, command);
      case 'arena_fight': return this.handleArenaFight(player);
      case 'quests': return this.handleViewQuests(player);
      case 'accept_quest': return this.handleAcceptQuest(player, command);
      case 'map': return this.handleMap(player);
      case 'who': return this.handleWho(player);
      case 'leaderboard': return this.handleLeaderboard();
      case 'help': return this.handleHelp();
      case 'chat': return this.handleChat(username, command);
      case 'shout': return this.handleShout(username, command);
      case 'whisper': return this.handleWhisper(username, command);
      case 'emote': return this.handleEmote(username, command);
      case 'gamble': return this.handleGamble(player, command);
      case 'explore': return this.handleExplore(player);
      case 'swim': return this.handleSwim(player);
      case 'work_computer': return this.handleWorkComputer(player);
      case 'place_furniture': return this.handlePlaceFurniture(player, command);
      case 'view_storage': return this.handleViewStorage(player);
      case 'store_item': return this.handleStoreItem(player, command);
      case 'withdraw_item': return this.handleWithdrawItem(player, command);
      case 'duel': return this.handleDuel(player, command, username);
      default:
        return [{ type: 'narrative', message: `You ponder "${command.raw}" but nothing comes of it. Type "help" for a list of commands.` }];
    }
  }

  // =========================================================================
  // MOVEMENT
  // =========================================================================
  handleMove(player, command) {
    const targetId = command.resolvedLocation;
    if (!targetId) {
      return [{ type: 'error', message: `You don't know how to get to "${command.target}". Type "map" to see available locations.` }];
    }

    const currentLoc = LOCATIONS[player.location];
    const targetLoc = LOCATIONS[targetId];

    if (player.location === targetId) {
      return [{ type: 'narrative', message: `You're already at ${targetLoc.name}.` }];
    }

    // Check if target is a private home of another player
    if (targetLoc.type === 'private' && targetId !== 'player_home') {
      return [{ type: 'error', message: "That's someone else's private home. You cannot enter." }];
    }

    // Check connections
    if (!currentLoc.connections.includes(targetId)) {
      // Check if there's a path (within 2 hops)
      let foundPath = false;
      for (const mid of currentLoc.connections) {
        if (LOCATIONS[mid] && LOCATIONS[mid].connections.includes(targetId)) {
          foundPath = true;
          break;
        }
      }
      if (!foundPath) {
        return [{ type: 'error', message: `You can't reach ${targetLoc.name} directly from here. Nearby locations: ${currentLoc.connections.map(c => LOCATIONS[c]?.name).filter(Boolean).join(', ')}` }];
      }
    }

    // Energy cost for travel
    const energyCost = targetLoc.area === 'dungeon' ? 5 : 2;
    if (player.energy < energyCost) {
      return [{ type: 'error', message: "You're too tired to travel. Rest to regain energy." }];
    }
    player.energy -= energyCost;

    const oldLocation = player.location;
    player.previousLocation = oldLocation;
    player.location = targetId;
    player.state = 'idle';
    player.stateData = null;
    player.statistics.distanceTraveled++;

    // Notify other players
    this.broadcastToLocation(oldLocation, 'player_left', { username: player.username, destination: targetLoc.name }, player.username);
    this.broadcastToLocation(targetId, 'player_arrived', { username: player.username }, player.username);

    // Check quest progress for visit quests
    this.checkQuestProgress(player, 'visit', targetId);

    // Build location description
    const messages = this.buildLocationDescription(player, targetId);
    return messages;
  }

  handleGoHome(player) {
    const energyCost = 3;
    if (player.energy < energyCost) {
      return [{ type: 'error', message: "You're too tired to travel home. Rest first." }];
    }
    player.energy -= energyCost;

    const oldLocation = player.location;
    player.previousLocation = oldLocation;
    player.location = 'player_home';
    player.state = 'idle';
    player.stateData = null;

    this.broadcastToLocation(oldLocation, 'player_left', { username: player.username, destination: 'their home' }, player.username);

    const messages = [
      { type: 'narrative', message: `🏠 You return to your home in the residential district.` },
      { type: 'location', data: this.getHomeDescription(player) }
    ];
    return messages;
  }

  buildLocationDescription(player, locationId) {
    const loc = LOCATIONS[locationId];
    const messages = [];

    // Location header
    const areaTag = loc.area === 'dungeon' ? '⚠️ DUNGEON' : loc.area === 'wilderness' ? '🌲 WILDERNESS' : '🏘️ TOWN';
    messages.push({
      type: 'location',
      data: {
        id: locationId,
        name: loc.name,
        areaTag,
        description: loc.description,
        connections: loc.connections.map(c => ({ id: c, name: LOCATIONS[c]?.name || c })),
        npcs: (loc.npcs || []).map(n => NPCS[n] ? { id: n, name: NPCS[n].name } : null).filter(Boolean),
        monsters: (loc.monsters || []).map(m => MONSTERS[m] ? { id: m, name: MONSTERS[m].name, level: MONSTERS[m].level } : null).filter(Boolean),
        activities: loc.activities || [],
        playersHere: this.getPlayersAtLocation(locationId, player.username),
      }
    });

    // Ambience
    if (loc.ambience && loc.ambience.length > 0) {
      const amb = loc.ambience[Math.floor(Math.random() * loc.ambience.length)];
      messages.push({ type: 'ambience', message: amb });
    }

    return messages;
  }

  getHomeDescription(player) {
    const furniture = player.home.furniture.map(f => ITEMS[f] ? ITEMS[f].name : f);
    const storageCount = player.home.storage.length;
    return {
      id: 'player_home',
      name: `${player.username}'s Home`,
      areaTag: '🏠 HOME',
      description: LOCATIONS.player_home.description,
      connections: [{ id: 'residential_gate', name: 'Residential Gate (to Town)' }],
      furniture: furniture.length > 0 ? furniture : ['Empty - buy furniture from shops to customize!'],
      storageUsed: storageCount,
      activities: ['rest', 'craft (if workbench)', 'cook (if stove)', 'brew potions (if alchemy table)', 'farm (if garden)', 'work on computer (if desk)', 'store items', 'withdraw items'],
      npcs: [],
      monsters: [],
      playersHere: [],
    };
  }

  // =========================================================================
  // LOOKING / EXAMINING
  // =========================================================================
  handleLook(player) {
    if (player.location === 'player_home') {
      return [{ type: 'location', data: this.getHomeDescription(player) }];
    }
    return this.buildLocationDescription(player, player.location);
  }

  handleExamine(player, command) {
    // Try to examine an item
    if (command.resolvedItem) {
      const item = ITEMS[command.resolvedItem];
      const owned = hasItem(player, command.resolvedItem);
      const info = {
        name: item.name,
        type: item.type,
        description: item.description,
        value: `${item.value} gold`,
        level: item.level ? `Level ${item.level}` : 'N/A',
        owned: owned ? 'Yes' : 'No',
      };
      if (item.stats) info.stats = Object.entries(item.stats).map(([k, v]) => `${k}: +${v}`).join(', ');
      if (item.effect) info.effects = Object.entries(item.effect).map(([k, v]) => `${k}: +${v}`).join(', ');
      return [{ type: 'examine', data: info }];
    }

    // Try to examine an NPC
    if (command.resolvedNpc) {
      const npc = NPCS[command.resolvedNpc];
      return [{ type: 'narrative', message: `📋 ${npc.name} - ${npc.greeting}` }];
    }

    // Try to examine a monster
    if (command.resolvedMonster) {
      const m = MONSTERS[command.resolvedMonster];
      return [{ type: 'examine', data: { name: m.name, level: m.level, hp: m.hp, attack: m.attack, defense: m.defense, description: `A level ${m.level} monster. ${m.xp} XP reward.` } }];
    }

    return [{ type: 'narrative', message: `You look closely at "${command.target}" but don't find anything noteworthy.` }];
  }

  // =========================================================================
  // STATS / INFO
  // =========================================================================
  handleStats(player) {
    return [{ type: 'stats', data: getPlayerSummary(player) }];
  }

  handleSkills(player) {
    const skillList = {};
    for (const [id, skill] of Object.entries(player.skills)) {
      const def = SKILLS[id];
      skillList[id] = {
        name: def.name,
        icon: def.icon,
        level: skill.level,
        xp: skill.xp,
        xpToNext: Math.floor(GAME_CONFIG.BASE_XP_PER_LEVEL * Math.pow(GAME_CONFIG.XP_SCALING, skill.level - 1)),
      };
    }
    return [{ type: 'skills', data: skillList }];
  }

  handleInventory(player) {
    const items = player.inventory.map(slot => {
      const item = ITEMS[slot.itemId];
      return {
        id: slot.itemId,
        name: item ? item.name : slot.itemId,
        quantity: slot.quantity,
        type: item ? item.type : 'unknown',
        value: item ? item.value : 0,
      };
    });
    return [{ type: 'inventory', data: { items, gold: player.gold, slots: `${player.inventory.length}/${GAME_CONFIG.MAX_INVENTORY_SLOTS}` } }];
  }

  handleEquipment(player) {
    const gear = {};
    for (const [slot, itemId] of Object.entries(player.equipment)) {
      gear[slot] = itemId ? { id: itemId, name: ITEMS[itemId]?.name, stats: ITEMS[itemId]?.stats } : null;
    }
    return [{ type: 'equipment', data: gear }];
  }

  handleEquip(player, command) {
    const itemId = command.resolvedItem;
    if (!itemId) return [{ type: 'error', message: `Don't know what "${command.target}" is. Check your inventory.` }];
    const result = equipItem(player, itemId);
    const msgType = result.success ? 'success' : 'error';
    const messages = [{ type: msgType, message: result.message }];
    if (result.success) messages.push({ type: 'stats_update', data: getPlayerSummary(player) });
    return messages;
  }

  handleUnequip(player, command) {
    // Try to resolve to a slot name
    const target = (command.target || '').toLowerCase();
    let slot = null;
    if (['weapon', 'sword', 'staff', 'bow'].some(w => target.includes(w))) slot = 'weapon';
    else if (['head', 'helm', 'hat', 'hood', 'cap'].some(w => target.includes(w))) slot = 'head';
    else if (['chest', 'armor', 'shirt', 'plate', 'chainmail'].some(w => target.includes(w))) slot = 'chest';
    else if (['shield'].some(w => target.includes(w))) slot = 'shield';
    else {
      // Try by item name
      for (const [s, itemId] of Object.entries(player.equipment)) {
        if (itemId && ITEMS[itemId]?.name.toLowerCase().includes(target)) { slot = s; break; }
      }
    }
    if (!slot) return [{ type: 'error', message: `Don't know what to unequip. Try: unequip weapon/head/chest/shield` }];
    const result = unequipItem(player, slot);
    return [{ type: result.success ? 'success' : 'error', message: result.message }];
  }

  handleUseItem(player, command) {
    const itemId = command.resolvedItem;
    if (!itemId) return [{ type: 'error', message: `Don't know what "${command.target}" is.` }];
    if (!hasItem(player, itemId)) return [{ type: 'error', message: `You don't have that item.` }];

    const item = ITEMS[itemId];
    if (item.type !== 'consumable') return [{ type: 'error', message: `${item.name} cannot be consumed. Try equipping it instead.` }];

    removeItem(player, itemId);
    const effects = [];
    if (item.effect.hp) { player.hp = Math.min(player.maxHp, player.hp + item.effect.hp); effects.push(`+${item.effect.hp} HP`); }
    if (item.effect.mp) { player.mp = Math.min(player.maxMp, player.mp + item.effect.mp); effects.push(`+${item.effect.mp} MP`); }
    if (item.effect.energy) { player.energy = Math.min(player.maxEnergy, player.energy + item.effect.energy); effects.push(`+${item.effect.energy} Energy`); }

    return [
      { type: 'success', message: `Used ${item.name}. ${effects.join(', ')}` },
      { type: 'stats_update', data: getPlayerSummary(player) }
    ];
  }

  handleDrop(player, command) {
    const itemId = command.resolvedItem;
    if (!itemId) return [{ type: 'error', message: `Don't know what "${command.target}" is.` }];
    const qty = command.quantity || 1;
    if (!removeItem(player, itemId, qty)) return [{ type: 'error', message: `You don't have enough of that item.` }];
    return [{ type: 'success', message: `Dropped ${qty}x ${ITEMS[itemId]?.name || itemId}.` }];
  }

  // =========================================================================
  // COMBAT
  // =========================================================================
  handleFight(player, command) {
    const monsterId = command.resolvedMonster;
    const loc = LOCATIONS[player.location];

    if (!monsterId && loc.monsters && loc.monsters.length > 0) {
      // Fight a random monster at this location
      return this.startCombat(player, loc.monsters[Math.floor(Math.random() * loc.monsters.length)]);
    }

    if (!monsterId) {
      return [{ type: 'error', message: `There's nothing to fight here. Look for monsters in the wilderness or dungeons.` }];
    }

    // Check if this monster exists at current location
    if (!loc.monsters || !loc.monsters.includes(monsterId)) {
      // Check if they can fight it anyway (monster exists somewhere)
      if (MONSTERS[monsterId]) {
        return [{ type: 'error', message: `There are no ${MONSTERS[monsterId].name}s here. Try looking in the wilderness or dungeons.` }];
      }
      return [{ type: 'error', message: `Unknown creature "${command.target}".` }];
    }

    return this.startCombat(player, monsterId);
  }

  startCombat(player, monsterId) {
    const template = MONSTERS[monsterId];
    if (!template) return [{ type: 'error', message: 'Monster not found.' }];

    // Create monster instance
    const monster = {
      ...template,
      id: monsterId,
      currentHp: template.hp,
    };

    player.state = 'fighting';
    player.stateData = { monster, turn: 0 };

    const messages = [
      { type: 'combat_start', data: { monster: { name: monster.name, level: monster.level, hp: monster.hp, attack: monster.attack, defense: monster.defense } } },
    ];

    // Auto-combat loop
    messages.push(...this.doCombatRound(player));
    return messages;
  }

  doCombatRound(player) {
    if (player.state !== 'fighting' || !player.stateData) return [];

    const monster = player.stateData.monster;
    const stats = getCombatStats(player);
    const messages = [];

    // Player attacks
    const playerDamage = Math.max(1, stats.attack - Math.floor(monster.defense / 2) + Math.floor(Math.random() * 4));
    monster.currentHp -= playerDamage;
    messages.push({ type: 'combat_action', data: { attacker: player.username, target: monster.name, damage: playerDamage, targetHp: Math.max(0, monster.currentHp), targetMaxHp: monster.hp } });

    // Check if monster is dead
    if (monster.currentHp <= 0) {
      return [...messages, ...this.handleCombatVictory(player, monster)];
    }

    // Monster attacks
    const monsterDamage = Math.max(1, monster.attack - Math.floor(stats.defense / 2) + Math.floor(Math.random() * 3));
    player.hp -= monsterDamage;
    messages.push({ type: 'combat_action', data: { attacker: monster.name, target: player.username, damage: monsterDamage, targetHp: Math.max(0, player.hp), targetMaxHp: player.maxHp } });

    // Check if player is dead
    if (player.hp <= 0) {
      return [...messages, ...this.handlePlayerDeath(player)];
    }

    player.stateData.turn++;

    // Continue combat automatically
    setTimeout(() => {
      if (player.state === 'fighting') {
        const nextMessages = this.doCombatRound(player);
        for (const msg of nextMessages) {
          this.sendToPlayer(player.username, msg.type, msg.type === 'stats_update' ? msg.data : { message: msg.message, ...msg.data });
        }
      }
    }, GAME_CONFIG.COMBAT_TICK_MS);

    return messages;
  }

  handleCombatVictory(player, monster) {
    player.state = 'idle';
    player.stateData = null;
    player.statistics.monstersKilled++;

    const goldReward = Math.floor(monster.gold * (1 + Math.random() * 0.5) * this.worldState.goldMultiplier);
    addGold(player, goldReward);

    const xpResult = addXp(player, monster.xp, this.worldState.xpMultiplier);
    const skillXpResult = addSkillXp(player, 'combat', Math.floor(monster.xp * 0.5));

    const messages = [
      { type: 'combat_victory', data: { monster: monster.name, gold: goldReward, xp: xpResult.xpGained } }
    ];

    // Drop loot
    if (monster.drops) {
      for (const drop of monster.drops) {
        if (Math.random() < drop.chance) {
          if (addItem(player, drop.item)) {
            messages.push({ type: 'loot', message: `🎁 Dropped: ${ITEMS[drop.item]?.name || drop.item}!` });
          }
        }
      }
    }

    // Level up messages
    for (const msg of [...xpResult.messages, ...skillXpResult.messages]) {
      messages.push({ type: 'level_up', message: msg });
    }

    // Check quest progress
    this.checkQuestProgress(player, 'kill', monster.id);

    messages.push({ type: 'stats_update', data: getPlayerSummary(player) });
    return messages;
  }

  handlePlayerDeath(player) {
    player.state = 'idle';
    player.stateData = null;
    player.statistics.deaths++;

    // Lose 10% gold on death
    const goldLost = Math.floor(player.gold * 0.1);
    player.gold -= goldLost;
    player.hp = Math.floor(player.maxHp * 0.25);
    player.mp = Math.floor(player.maxMp * 0.25);

    // Respawn at temple
    const oldLocation = player.location;
    player.location = 'temple';

    this.broadcastToLocation(oldLocation, 'player_death', { username: player.username }, player.username);

    return [
      { type: 'death', message: `💀 You have been defeated! You lost ${goldLost} gold. You respawn at the Temple of Light.` },
      { type: 'stats_update', data: getPlayerSummary(player) },
      ...this.buildLocationDescription(player, 'temple'),
    ];
  }

  handleArenaFight(player) {
    if (player.location !== 'arena' && player.location !== 'training_grounds') {
      return [{ type: 'error', message: 'You need to be at the Arena or Training Grounds to fight.' }];
    }
    const loc = LOCATIONS[player.location];
    if (!loc.monsters || loc.monsters.length === 0) {
      return [{ type: 'error', message: 'No opponents available here.' }];
    }
    const monsterId = loc.monsters[Math.floor(Math.random() * loc.monsters.length)];
    return this.startCombat(player, monsterId);
  }

  handleDuel(player, command, username) {
    const targetName = command.target;
    const targetPlayer = this.players[targetName];
    if (!targetPlayer || !this.onlinePlayers[targetName]) {
      return [{ type: 'error', message: `Player "${targetName}" is not online.` }];
    }
    if (targetPlayer.location !== player.location) {
      return [{ type: 'error', message: `${targetName} is not at your location.` }];
    }
    // Simple duel simulation
    const myStats = getCombatStats(player);
    const theirStats = getCombatStats(targetPlayer);
    const myPower = myStats.attack + myStats.defense + player.level * 2 + Math.random() * 10;
    const theirPower = theirStats.attack + theirStats.defense + targetPlayer.level * 2 + Math.random() * 10;

    if (myPower > theirPower) {
      player.statistics.pvpWins++;
      targetPlayer.statistics.pvpLosses++;
      const prize = Math.floor(10 * player.level);
      addGold(player, prize);
      addXp(player, 20 * player.level, this.worldState.xpMultiplier);
      this.sendToPlayer(targetName, 'narrative', { message: `⚔️ ${username} defeated you in a duel!` });
      return [{ type: 'success', message: `⚔️ You defeated ${targetName} in a duel! Won ${prize} gold and ${20 * player.level} XP.` }];
    } else {
      player.statistics.pvpLosses++;
      targetPlayer.statistics.pvpWins++;
      this.sendToPlayer(targetName, 'narrative', { message: `⚔️ You defeated ${username} in a duel!` });
      return [{ type: 'narrative', message: `⚔️ ${targetName} defeated you in the duel. Better luck next time!` }];
    }
  }

  // =========================================================================
  // SHOPPING
  // =========================================================================
  handleBuy(player, command) {
    const loc = LOCATIONS[player.location];
    if (!loc.shop) return [{ type: 'error', message: "There's no shop here." }];

    const itemId = command.resolvedItem;
    if (!itemId) return [{ type: 'error', message: `Don't know what "${command.target}" is. Type "browse" to see available items.` }];

    if (!loc.shop.items.includes(itemId)) {
      return [{ type: 'error', message: `${ITEMS[itemId]?.name} is not sold here. Type "browse" to see what's available.` }];
    }

    const item = ITEMS[itemId];
    const qty = command.quantity || 1;
    const price = Math.floor(item.value * loc.shop.buyMultiplier * this.worldState.shopDiscount) * qty;

    if (player.gold < price) {
      return [{ type: 'error', message: `Not enough gold. ${item.name} costs ${price}g, you have ${player.gold}g.` }];
    }
    if (item.level && item.level > player.level) {
      return [{ type: 'error', message: `You need to be level ${item.level} to buy this.` }];
    }
    if (!addItem(player, itemId, qty)) {
      return [{ type: 'error', message: 'Your inventory is full!' }];
    }

    removeGold(player, price);
    const skillXp = addSkillXp(player, 'trading', Math.floor(price / 10));

    return [
      { type: 'success', message: `Bought ${qty}x ${item.name} for ${price} gold. (${player.gold}g remaining)` },
      ...skillXp.messages.map(m => ({ type: 'level_up', message: m })),
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];
  }

  handleSell(player, command) {
    const loc = LOCATIONS[player.location];
    if (!loc.shop) return [{ type: 'error', message: "There's no shop here to sell to." }];

    const itemId = command.resolvedItem;
    if (!itemId) return [{ type: 'error', message: `Don't know what "${command.target}" is. Check your inventory.` }];
    if (!hasItem(player, itemId)) return [{ type: 'error', message: `You don't have that item.` }];

    const item = ITEMS[itemId];
    const qty = command.quantity || 1;
    const price = Math.floor(item.value * loc.shop.sellMultiplier) * qty;

    if (!removeItem(player, itemId, qty)) {
      return [{ type: 'error', message: `You don't have ${qty}x ${item.name}.` }];
    }

    addGold(player, price);
    return [
      { type: 'success', message: `Sold ${qty}x ${item.name} for ${price} gold. (${player.gold}g now)` },
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];
  }

  handleBrowseShop(player) {
    const loc = LOCATIONS[player.location];
    if (!loc.shop) return [{ type: 'error', message: "There's no shop here." }];

    const items = loc.shop.items.map(id => {
      const item = ITEMS[id];
      if (!item) return null;
      return {
        id,
        name: item.name,
        price: Math.floor(item.value * loc.shop.buyMultiplier * this.worldState.shopDiscount),
        sellPrice: Math.floor(item.value * loc.shop.sellMultiplier),
        type: item.type,
        level: item.level || 1,
        description: item.description,
      };
    }).filter(Boolean);

    return [{ type: 'shop', data: { name: loc.name, items, playerGold: player.gold } }];
  }

  // =========================================================================
  // GATHERING
  // =========================================================================
  handleGather(player, command) {
    const skill = command.skill;
    const loc = LOCATIONS[player.location];

    // Check if at home with appropriate furniture
    if (player.location === 'player_home') {
      if (skill === 'farming' && player.home.furniture.includes('garden_plot')) {
        return this.doGathering(player, 'farming', ['herb_chamomile', 'herb_ginseng']);
      }
      return [{ type: 'error', message: "You can't do that at home (or you don't have the right furniture)." }];
    }

    if (!loc.resources || !loc.resources[skill]) {
      return [{ type: 'error', message: `You can't do ${SKILLS[skill]?.name || skill} here. Try a different location.` }];
    }

    // Check for required tools
    const toolNeeded = this.getRequiredTool(skill);
    if (toolNeeded && !this.hasTool(player, skill)) {
      return [{ type: 'error', message: `You need a ${toolNeeded} to do ${SKILLS[skill].name}. Buy one from the General Store.` }];
    }

    // Energy cost
    if (player.energy < 5) {
      return [{ type: 'error', message: "You're too tired. Rest to regain energy." }];
    }

    return this.doGathering(player, skill, loc.resources[skill]);
  }

  doGathering(player, skill, possibleResources) {
    player.energy -= 5;
    player.state = 'gathering';

    const skillLevel = player.skills[skill]?.level || 1;
    const toolBonus = this.getToolEfficiency(player, skill);

    // Determine what we gather based on skill level
    const available = possibleResources.filter(id => {
      const item = ITEMS[id];
      return item && (!item.level || item.level <= skillLevel + 2);
    });

    if (available.length === 0) {
      player.state = 'idle';
      return [{ type: 'error', message: `Your ${SKILLS[skill]?.name} skill is too low to gather anything here.` }];
    }

    // Pick a resource (weighted toward level-appropriate items)
    const resourceId = available[Math.floor(Math.random() * available.length)];
    const quantity = 1 + Math.floor(Math.random() * toolBonus);

    if (!addItem(player, resourceId, quantity)) {
      player.state = 'idle';
      return [{ type: 'error', message: 'Your inventory is full!' }];
    }

    const xpGain = Math.floor((ITEMS[resourceId]?.value || 5) * 2);
    const skillXpResult = addSkillXp(player, skill, xpGain);
    const xpResult = addXp(player, Math.floor(xpGain / 2), this.worldState.xpMultiplier);
    player.statistics.resourcesGathered += quantity;

    // Check quest progress
    this.checkQuestProgress(player, 'collect', resourceId, quantity);

    player.state = 'idle';

    const messages = [
      { type: 'gather', message: `${SKILLS[skill]?.icon || '📦'} Gathered ${quantity}x ${ITEMS[resourceId]?.name}! (+${xpGain} ${SKILLS[skill]?.name} XP, +${Math.floor(xpGain / 2)} XP)` },
      ...skillXpResult.messages.map(m => ({ type: 'level_up', message: m })),
      ...xpResult.messages.map(m => ({ type: 'level_up', message: m })),
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];
    return messages;
  }

  getRequiredTool(skill) {
    const tools = { mining: 'Pickaxe', fishing: 'Fishing Rod', woodcutting: 'Woodcutting Axe', herbalism: null };
    return tools[skill] || null;
  }

  hasTool(player, skill) {
    for (const slot of player.inventory) {
      const item = ITEMS[slot.itemId];
      if (item && item.type === 'tool' && item.toolType === skill) return true;
    }
    return false;
  }

  getToolEfficiency(player, skill) {
    let best = 1;
    for (const slot of player.inventory) {
      const item = ITEMS[slot.itemId];
      if (item && item.type === 'tool' && item.toolType === skill && item.efficiency > best) {
        best = item.efficiency;
      }
    }
    return best;
  }

  // =========================================================================
  // CRAFTING
  // =========================================================================
  handleCraft(player, command) {
    const recipeId = command.resolvedRecipe || command.resolvedItem;
    if (!recipeId) return [{ type: 'error', message: `Don't know how to craft "${command.target}". Type "recipes" to see available recipes.` }];

    const recipe = RECIPES[recipeId];
    if (!recipe) return [{ type: 'error', message: `No recipe found for "${command.target}". Type "recipes" to see available recipes.` }];

    // Check if at appropriate crafting station
    if (player.location === 'player_home') {
      if (recipe.skill === 'crafting' && !player.home.furniture.includes('workbench')) {
        return [{ type: 'error', message: 'You need a Workbench at home to craft. Buy one from a shop.' }];
      }
      if (recipe.skill === 'cooking' && !player.home.furniture.includes('cooking_stove')) {
        return [{ type: 'error', message: 'You need a Cooking Stove at home to cook. Buy one from a shop.' }];
      }
      if (recipe.skill === 'alchemy' && !player.home.furniture.includes('alchemy_table')) {
        return [{ type: 'error', message: 'You need an Alchemy Table at home to brew. Buy one from a shop.' }];
      }
    }

    // Check skill level
    const skillLevel = player.skills[recipe.skill]?.level || 1;
    if (skillLevel < recipe.level) {
      return [{ type: 'error', message: `Your ${SKILLS[recipe.skill].name} skill needs to be level ${recipe.level}. (Currently level ${skillLevel})` }];
    }

    // Check ingredients
    for (const [ingredientId, qty] of Object.entries(recipe.ingredients)) {
      if (!hasItem(player, ingredientId, qty)) {
        const name = ITEMS[ingredientId]?.name || ingredientId;
        return [{ type: 'error', message: `Missing ingredient: ${qty}x ${name}` }];
      }
    }

    // Consume ingredients
    for (const [ingredientId, qty] of Object.entries(recipe.ingredients)) {
      removeItem(player, ingredientId, qty);
    }

    // Create item
    if (!addItem(player, recipe.result)) {
      return [{ type: 'error', message: 'Inventory full! Make room first.' }];
    }

    const skillXpResult = addSkillXp(player, recipe.skill, recipe.xp);
    const xpResult = addXp(player, Math.floor(recipe.xp / 2), this.worldState.xpMultiplier);
    player.statistics.itemsCrafted++;

    return [
      { type: 'success', message: `🔨 Crafted ${ITEMS[recipe.result]?.name}! (+${recipe.xp} ${SKILLS[recipe.skill].name} XP)` },
      ...skillXpResult.messages.map(m => ({ type: 'level_up', message: m })),
      ...xpResult.messages.map(m => ({ type: 'level_up', message: m })),
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];
  }

  handleViewRecipes(player) {
    const available = [];
    for (const [id, recipe] of Object.entries(RECIPES)) {
      const resultItem = ITEMS[recipe.result];
      const skillLevel = player.skills[recipe.skill]?.level || 1;
      const canCraft = skillLevel >= recipe.level;
      const ingredients = Object.entries(recipe.ingredients).map(([iid, qty]) => `${qty}x ${ITEMS[iid]?.name || iid}`);
      available.push({
        id,
        name: resultItem?.name || id,
        skill: SKILLS[recipe.skill]?.name,
        level: recipe.level,
        canCraft,
        ingredients: ingredients.join(', '),
        xp: recipe.xp,
      });
    }
    return [{ type: 'recipes', data: available }];
  }

  // =========================================================================
  // NPC INTERACTION
  // =========================================================================
  handleTalk(player, command) {
    const npcId = command.resolvedNpc;
    const loc = LOCATIONS[player.location];

    if (!npcId) {
      // If there are NPCs at this location, talk to the first one
      if (loc.npcs && loc.npcs.length > 0) {
        const firstNpc = NPCS[loc.npcs[0]];
        if (firstNpc) {
          return [{ type: 'npc_dialogue', data: { name: firstNpc.name, message: firstNpc.greeting + '\n\n' + firstNpc.dialogue.default } }];
        }
      }
      return [{ type: 'narrative', message: `There's no one named "${command.target}" here.` }];
    }

    const npc = NPCS[npcId];
    if (!npc) return [{ type: 'error', message: 'NPC not found.' }];

    // Check if NPC is at this location
    if (loc.npcs && !loc.npcs.includes(npcId)) {
      return [{ type: 'error', message: `${npc.name} isn't here.` }];
    }

    // Quest giver NPCs
    if (npc.role === 'quest_giver' && npc.quests) {
      const availableQuests = npc.quests.filter(qId => !player.completedQuests.includes(qId) && !player.activeQuests.includes(qId));
      if (availableQuests.length > 0) {
        const questList = availableQuests.map(qId => QUESTS[qId] ? `  - ${QUESTS[qId].name} (Lv ${QUESTS[qId].level}): ${QUESTS[qId].description}` : null).filter(Boolean).join('\n');
        return [{ type: 'npc_dialogue', data: { name: npc.name, message: `${npc.greeting}\n\n${npc.dialogue.default}\n\n📜 Available Quests:\n${questList}\n\nType "accept [quest name]" to take a quest.` } }];
      }
    }

    // Healer NPC
    if (npc.role === 'healer') {
      return this.handleHeal(player);
    }

    return [{ type: 'npc_dialogue', data: { name: npc.name, message: npc.greeting + '\n\n' + npc.dialogue.default } }];
  }

  // =========================================================================
  // REST / HEAL
  // =========================================================================
  handleRest(player) {
    if (player.state === 'fighting') return [{ type: 'error', message: "You can't rest during combat!" }];

    player.state = 'resting';
    const messages = [{ type: 'narrative', message: '💤 You begin resting. Your HP, MP, and Energy will regenerate faster. (Any action will stop resting)' }];

    if (player.location === 'player_home') {
      const hasBed = player.home.furniture.some(f => f.includes('bed'));
      if (hasBed) {
        messages[0].message = '🛏️ You rest in your bed. Regeneration is greatly boosted!';
      }
    }

    return messages;
  }

  handleHeal(player) {
    if (player.location !== 'temple') {
      if (player.hp < player.maxHp) {
        return [{ type: 'narrative', message: 'Visit the Temple of Light to be healed, or use a Health Potion.' }];
      }
      return [{ type: 'narrative', message: "You're already at full health." }];
    }

    const cost = Math.max(0, Math.floor((player.maxHp - player.hp) * 0.5));
    if (cost > 0 && player.gold >= cost) {
      removeGold(player, cost);
    }

    player.hp = player.maxHp;
    player.mp = player.maxMp;

    return [
      { type: 'success', message: `✨ Priestess Luna heals your wounds. HP and MP fully restored.${cost > 0 ? ` (${cost} gold donated)` : ''}` },
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];
  }

  handlePray(player) {
    if (player.location !== 'temple') {
      return [{ type: 'narrative', message: 'You offer a silent prayer. Visit the Temple for a proper blessing.' }];
    }
    // Random small buff
    const blessings = [
      { stat: 'hp', amount: 10, msg: 'You feel a warm glow. +10 Max HP for this session!' },
      { stat: 'mp', amount: 5, msg: 'Arcane energy fills you. +5 Max MP for this session!' },
      { stat: 'energy', amount: 10, msg: 'Divine vigor! +10 Max Energy for this session!' },
    ];
    const blessing = blessings[Math.floor(Math.random() * blessings.length)];
    if (blessing.stat === 'hp') { player.maxHp += blessing.amount; player.hp += blessing.amount; }
    else if (blessing.stat === 'mp') { player.maxMp += blessing.amount; player.mp += blessing.amount; }
    else { player.maxEnergy += blessing.amount; player.energy += blessing.amount; }

    return [
      { type: 'success', message: `🙏 ${blessing.msg}` },
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];
  }

  // =========================================================================
  // TRAINING
  // =========================================================================
  handleTrain(player, command) {
    if (player.location !== 'training_grounds' && player.location !== 'arena') {
      return [{ type: 'error', message: 'Visit the Training Grounds to train your skills.' }];
    }
    if (player.energy < 10) {
      return [{ type: 'error', message: "You're too tired to train. Rest first." }];
    }

    player.energy -= 10;
    const xpGain = 15 + player.level * 2;
    const combatXp = addSkillXp(player, 'combat', xpGain);
    const mainXp = addXp(player, Math.floor(xpGain / 3), this.worldState.xpMultiplier);

    return [
      { type: 'success', message: `💪 You train vigorously! +${xpGain} Combat XP, +${Math.floor(xpGain / 3)} XP` },
      ...combatXp.messages.map(m => ({ type: 'level_up', message: m })),
      ...mainXp.messages.map(m => ({ type: 'level_up', message: m })),
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];
  }

  // =========================================================================
  // QUESTS
  // =========================================================================
  handleViewQuests(player) {
    const active = player.activeQuests.map(qId => {
      const quest = QUESTS[qId];
      if (!quest) return null;
      const progress = player.questProgress[qId] || {};
      const steps = quest.steps.map((step, i) => {
        const current = progress[i] || 0;
        const target = step.count || 1;
        return { description: step.description, current, target, complete: current >= target };
      });
      return { id: qId, name: quest.name, description: quest.description, level: quest.level, steps, rewards: quest.rewards };
    }).filter(Boolean);

    const completed = player.completedQuests.map(qId => QUESTS[qId]?.name).filter(Boolean);

    return [{ type: 'quests', data: { active, completed } }];
  }

  handleAcceptQuest(player, command) {
    const target = (command.target || '').toLowerCase();
    let questId = null;

    for (const [id, quest] of Object.entries(QUESTS)) {
      if (quest.name.toLowerCase().includes(target) || id.includes(target.replace(/\s+/g, '_'))) {
        questId = id;
        break;
      }
    }

    if (!questId) return [{ type: 'error', message: `Quest "${command.target}" not found.` }];
    if (player.activeQuests.includes(questId)) return [{ type: 'error', message: "You're already on this quest." }];
    if (player.completedQuests.includes(questId)) return [{ type: 'error', message: "You've already completed this quest." }];

    const quest = QUESTS[questId];
    if (quest.level > player.level) return [{ type: 'error', message: `You need to be level ${quest.level} for this quest.` }];
    if (player.activeQuests.length >= 5) return [{ type: 'error', message: 'You can only have 5 active quests. Complete or abandon one first.' }];

    player.activeQuests.push(questId);
    player.questProgress[questId] = {};
    quest.steps.forEach((_, i) => { player.questProgress[questId][i] = 0; });

    return [{ type: 'success', message: `📜 Quest accepted: ${quest.name}\n${quest.description}\nRewards: ${quest.rewards.xp} XP, ${quest.rewards.gold} gold${quest.rewards.items.length > 0 ? ', ' + quest.rewards.items.map(id => ITEMS[id]?.name).join(', ') : ''}` }];
  }

  checkQuestProgress(player, action, target, count = 1) {
    for (const questId of [...player.activeQuests]) {
      const quest = QUESTS[questId];
      if (!quest) continue;
      const progress = player.questProgress[questId];
      if (!progress) continue;

      let allComplete = true;
      for (let i = 0; i < quest.steps.length; i++) {
        const step = quest.steps[i];
        if (step.action === action && step.target === target) {
          progress[i] = (progress[i] || 0) + count;
          if (progress[i] >= (step.count || 1)) {
            this.sendToPlayer(player.username, 'quest_step_complete', { quest: quest.name, step: step.description });
          }
        }
        if ((progress[i] || 0) < (step.count || 1)) {
          allComplete = false;
        }
      }

      if (allComplete) {
        this.completeQuest(player, questId);
      }
    }
  }

  completeQuest(player, questId) {
    const quest = QUESTS[questId];
    if (!quest) return;

    player.activeQuests = player.activeQuests.filter(id => id !== questId);
    player.completedQuests.push(questId);
    delete player.questProgress[questId];
    player.statistics.questsCompleted++;

    // Grant rewards
    const xpResult = addXp(player, quest.rewards.xp, this.worldState.xpMultiplier);
    addGold(player, quest.rewards.gold);
    const itemNames = [];
    for (const itemId of quest.rewards.items) {
      addItem(player, itemId);
      itemNames.push(ITEMS[itemId]?.name || itemId);
    }

    const messages = [
      { type: 'quest_complete', message: `🏆 Quest Complete: ${quest.name}!\nRewards: +${quest.rewards.xp} XP, +${quest.rewards.gold} gold${itemNames.length > 0 ? ', ' + itemNames.join(', ') : ''}` },
      ...xpResult.messages.map(m => ({ type: 'level_up', message: m })),
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];

    for (const msg of messages) {
      this.sendToPlayer(player.username, msg.type, msg.type === 'stats_update' ? msg.data : { message: msg.message, ...msg.data });
    }
  }

  // =========================================================================
  // MAP / WHO / LEADERBOARD
  // =========================================================================
  handleMap(player) {
    const currentLoc = LOCATIONS[player.location];
    const nearby = currentLoc.connections.map(id => {
      const loc = LOCATIONS[id];
      if (!loc) return null;
      const playersHere = this.getPlayersAtLocation(id);
      return { id, name: loc.name, area: loc.area, playerCount: playersHere.length };
    }).filter(Boolean);

    const allAreas = {};
    for (const [id, loc] of Object.entries(LOCATIONS)) {
      if (loc.type === 'private') continue;
      if (!allAreas[loc.area]) allAreas[loc.area] = [];
      allAreas[loc.area].push({ id, name: loc.name });
    }

    return [{ type: 'map', data: { current: { id: player.location, name: currentLoc.name }, nearby, areas: allAreas } }];
  }

  handleWho(player) {
    const here = this.getPlayersAtLocation(player.location);
    const online = Object.keys(this.onlinePlayers);
    return [{ type: 'who', data: { here, online, total: online.length } }];
  }

  handleLeaderboard() {
    const players = Object.values(this.players)
      .map(p => ({ username: p.username, level: p.level, title: p.title, gold: p.gold, monstersKilled: p.statistics.monstersKilled, questsCompleted: p.statistics.questsCompleted }))
      .sort((a, b) => b.level - a.level || b.monstersKilled - a.monstersKilled)
      .slice(0, 20);
    return [{ type: 'leaderboard', data: players }];
  }

  // =========================================================================
  // SOCIAL
  // =========================================================================
  handleChat(username, command) {
    const message = command.message || command.raw;
    this.broadcastToLocation(this.players[username].location, 'chat', { username, message }, null);
    return [];
  }

  handleShout(username, command) {
    const message = command.target || command.raw;
    this.broadcast('shout', { username, message });
    return [];
  }

  handleWhisper(username, command) {
    const target = command.target;
    const message = command.message;
    if (!this.onlinePlayers[target]) return [{ type: 'error', message: `${target} is not online.` }];
    this.sendToPlayer(target, 'whisper', { from: username, message });
    return [{ type: 'whisper_sent', message: `Whispered to ${target}: ${message}` }];
  }

  handleEmote(username, command) {
    const action = command.target || command.raw;
    this.broadcastToLocation(this.players[username].location, 'emote', { username, action }, null);
    return [];
  }

  // =========================================================================
  // HOME ACTIONS
  // =========================================================================
  handleWorkComputer(player) {
    if (player.location !== 'player_home') {
      return [{ type: 'error', message: 'You need to be at home to use your computer.' }];
    }
    if (!player.home.furniture.includes('computer_desk')) {
      return [{ type: 'error', message: "You don't have a Computer Desk. Buy one from the General Store!" }];
    }
    if (player.energy < 10) {
      return [{ type: 'error', message: "You're too tired to work. Rest first." }];
    }

    player.energy -= 10;
    const earnings = 10 + player.level * 3 + Math.floor(Math.random() * player.level * 2);
    addGold(player, earnings);
    const xpResult = addXp(player, 5 + player.level, this.worldState.xpMultiplier);

    const tasks = ['debugging code', 'answering emails', 'freelance programming', 'trading stocks', 'data analysis', 'writing reports', 'designing graphics'];
    const task = tasks[Math.floor(Math.random() * tasks.length)];

    return [
      { type: 'success', message: `💻 You spend time ${task} on your computer. Earned ${earnings} gold and ${5 + player.level} XP!` },
      ...xpResult.messages.map(m => ({ type: 'level_up', message: m })),
      { type: 'stats_update', data: getPlayerSummary(player) },
    ];
  }

  handlePlaceFurniture(player, command) {
    if (player.location !== 'player_home') {
      return [{ type: 'error', message: 'You need to be at home to place furniture.' }];
    }

    const itemId = command.resolvedItem;
    if (!itemId) return [{ type: 'error', message: `Don't know what "${command.target}" is.` }];

    const item = ITEMS[itemId];
    if (!item || item.type !== 'furniture') {
      return [{ type: 'error', message: `${item?.name || command.target} is not furniture.` }];
    }
    if (!hasItem(player, itemId)) {
      return [{ type: 'error', message: `You don't have a ${item.name}. Buy one from a shop.` }];
    }

    removeItem(player, itemId);
    player.home.furniture.push(itemId);

    // Check quest progress
    this.checkQuestProgress(player, 'furnish', itemId);

    return [
      { type: 'success', message: `🏠 Placed ${item.name} in your home!` },
      { type: 'location', data: this.getHomeDescription(player) },
    ];
  }

  handleViewStorage(player) {
    if (player.location !== 'player_home') {
      return [{ type: 'error', message: 'You need to be at home to access storage.' }];
    }
    const hasChest = player.home.furniture.includes('storage_chest');
    const maxSlots = hasChest ? 20 : 5;

    const items = player.home.storage.map(slot => ({
      id: slot.itemId,
      name: ITEMS[slot.itemId]?.name || slot.itemId,
      quantity: slot.quantity,
    }));

    return [{ type: 'storage', data: { items, used: items.length, max: maxSlots } }];
  }

  handleStoreItem(player, command) {
    if (player.location !== 'player_home') {
      return [{ type: 'error', message: 'You need to be at home to store items.' }];
    }

    const itemId = command.resolvedItem;
    if (!itemId) return [{ type: 'error', message: `Don't know what "${command.target}" is.` }];
    const qty = command.quantity || 1;
    if (!hasItem(player, itemId, qty)) return [{ type: 'error', message: "You don't have enough of that item." }];

    const hasChest = player.home.furniture.includes('storage_chest');
    const maxSlots = hasChest ? 20 : 5;
    const existing = player.home.storage.find(s => s.itemId === itemId);

    if (!existing && player.home.storage.length >= maxSlots) {
      return [{ type: 'error', message: `Home storage is full (${maxSlots} slots). ${!hasChest ? 'Buy a Storage Chest for more space!' : ''}` }];
    }

    removeItem(player, itemId, qty);
    if (existing) { existing.quantity += qty; }
    else { player.home.storage.push({ itemId, quantity: qty }); }

    return [{ type: 'success', message: `Stored ${qty}x ${ITEMS[itemId]?.name} at home.` }];
  }

  handleWithdrawItem(player, command) {
    if (player.location !== 'player_home') {
      return [{ type: 'error', message: 'You need to be at home to withdraw items.' }];
    }

    const itemId = command.resolvedItem;
    if (!itemId) return [{ type: 'error', message: `Don't know what "${command.target}" is.` }];
    const qty = command.quantity || 1;

    const slot = player.home.storage.find(s => s.itemId === itemId);
    if (!slot || slot.quantity < qty) return [{ type: 'error', message: "Not enough of that item in storage." }];

    if (!addItem(player, itemId, qty)) return [{ type: 'error', message: 'Inventory full!' }];

    slot.quantity -= qty;
    if (slot.quantity <= 0) {
      player.home.storage = player.home.storage.filter(s => s.quantity > 0);
    }

    return [{ type: 'success', message: `Withdrew ${qty}x ${ITEMS[itemId]?.name} from storage.` }];
  }

  // =========================================================================
  // MISC ACTIONS
  // =========================================================================
  handleGamble(player, command) {
    if (player.location !== 'tavern') return [{ type: 'error', message: 'Visit the Tavern to gamble.' }];

    const bet = parseInt(command.target) || 10;
    if (bet < 1) return [{ type: 'error', message: 'Minimum bet is 1 gold.' }];
    if (bet > player.gold) return [{ type: 'error', message: `You only have ${player.gold} gold.` }];

    removeGold(player, bet);
    const roll = Math.random();

    if (roll < 0.4) {
      // Lose
      return [
        { type: 'narrative', message: `🎲 You bet ${bet} gold and... lost! Better luck next time.` },
        { type: 'stats_update', data: getPlayerSummary(player) },
      ];
    } else if (roll < 0.75) {
      // Small win
      const winnings = bet * 2;
      addGold(player, winnings);
      return [
        { type: 'success', message: `🎲 You bet ${bet} gold and won ${winnings} gold! Nice!` },
        { type: 'stats_update', data: getPlayerSummary(player) },
      ];
    } else if (roll < 0.95) {
      // Big win
      const winnings = bet * 3;
      addGold(player, winnings);
      return [
        { type: 'success', message: `🎲🎲 You bet ${bet} gold and hit it big! Won ${winnings} gold!` },
        { type: 'stats_update', data: getPlayerSummary(player) },
      ];
    } else {
      // Jackpot
      const winnings = bet * 5;
      addGold(player, winnings);
      this.broadcast('shout', { username: 'Tavern', message: `${player.username} just hit the JACKPOT at the tavern! Won ${winnings} gold!` });
      return [
        { type: 'success', message: `🎲🎲🎲 JACKPOT! You bet ${bet} gold and won ${winnings} gold!!! The tavern erupts in cheers!` },
        { type: 'stats_update', data: getPlayerSummary(player) },
      ];
    }
  }

  handleExplore(player) {
    const loc = LOCATIONS[player.location];
    if (player.energy < 5) return [{ type: 'error', message: "You're too tired to explore." }];
    player.energy -= 5;

    const explorationLevel = player.skills.exploration?.level || 1;
    const roll = Math.random();

    if (roll < 0.3) {
      // Find gold
      const gold = 5 + Math.floor(Math.random() * explorationLevel * 5);
      addGold(player, gold);
      const xpResult = addSkillXp(player, 'exploration', 10);
      return [
        { type: 'success', message: `🧭 You explore the area and find ${gold} gold hidden away!` },
        ...xpResult.messages.map(m => ({ type: 'level_up', message: m })),
        { type: 'stats_update', data: getPlayerSummary(player) },
      ];
    } else if (roll < 0.5) {
      // Find an item
      const possibleItems = ['health_potion', 'mana_potion', 'bread', 'herb_chamomile', 'copper_ore'];
      const itemId = possibleItems[Math.floor(Math.random() * possibleItems.length)];
      addItem(player, itemId);
      const xpResult = addSkillXp(player, 'exploration', 15);
      return [
        { type: 'success', message: `🧭 You explore and discover a hidden ${ITEMS[itemId]?.name}!` },
        ...xpResult.messages.map(m => ({ type: 'level_up', message: m })),
      ];
    } else if (roll < 0.7 && loc.monsters && loc.monsters.length > 0) {
      // Encounter a monster
      const monsterId = loc.monsters[Math.floor(Math.random() * loc.monsters.length)];
      return [
        { type: 'narrative', message: `🧭 While exploring, you encounter a ${MONSTERS[monsterId]?.name}!` },
        ...this.startCombat(player, monsterId),
      ];
    } else {
      const xpResult = addSkillXp(player, 'exploration', 5);
      const discoveries = [
        'You find some interesting rock formations but nothing of value.',
        'You discover ancient markings on a wall. Fascinating!',
        'You find tracks of some creature, but they lead nowhere.',
        'The area is beautiful but yields no treasures today.',
        'You find a nice spot to rest. The view is breathtaking.',
      ];
      return [
        { type: 'narrative', message: `🧭 ${discoveries[Math.floor(Math.random() * discoveries.length)]}` },
        ...xpResult.messages.map(m => ({ type: 'level_up', message: m })),
      ];
    }
  }

  handleSwim(player) {
    const swimLocations = ['river_bank', 'waterfall', 'forest_clearing'];
    if (!swimLocations.includes(player.location)) {
      return [{ type: 'error', message: "There's nowhere to swim here." }];
    }
    player.energy -= 3;
    return [{ type: 'narrative', message: '🏊 You take a refreshing swim! Energy -3, but you feel invigorated.' }];
  }

  // =========================================================================
  // HELP
  // =========================================================================
  handleHelp() {
    return [{ type: 'help', data: {
      movement: ['go [place]', 'go home', 'look', 'map', 'explore'],
      combat: ['fight [monster]', 'train', 'arena fight', 'duel [player]'],
      items: ['inventory', 'equip [item]', 'unequip [slot]', 'use [item]', 'drop [item]', 'equipment'],
      shopping: ['browse', 'buy [item]', 'sell [item]'],
      gathering: ['mine', 'fish', 'chop trees', 'gather herbs', 'farm'],
      crafting: ['craft [item]', 'cook [item]', 'brew [item]', 'recipes'],
      social: ['say [message]', 'shout [message]', 'whisper [player] [message]', 'who', 'emote [action]'],
      quests: ['quests', 'accept [quest]'],
      home: ['go home', 'rest', 'place [furniture]', 'work on computer', 'store [item]', 'withdraw [item]', 'view storage'],
      info: ['stats', 'skills', 'leaderboard', 'examine [thing]', 'help'],
      misc: ['gamble [amount]', 'swim', 'pray', 'heal'],
    }}];
  }
}

module.exports = GameEngine;
