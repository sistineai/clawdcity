// ============================================================================
// CLAWDCITY MMORPG - Natural Language Command Parser
// Parses player text input into game actions
// ============================================================================

const { LOCATIONS, ITEMS, MONSTERS, NPCS, SKILLS, RECIPES } = require('../data/world');

// Command patterns mapped to game actions
const COMMAND_PATTERNS = [
  // === MOVEMENT ===
  { patterns: [/^go\s+(to\s+)?(?:the\s+)?(.+)/i, /^walk\s+(to\s+)?(?:the\s+)?(.+)/i, /^travel\s+(to\s+)?(?:the\s+)?(.+)/i,
    /^head\s+(to\s+)?(?:the\s+)?(.+)/i, /^move\s+(to\s+)?(?:the\s+)?(.+)/i, /^visit\s+(?:the\s+)?(.+)/i,
    /^enter\s+(?:the\s+)?(.+)/i, /^run\s+(to\s+)?(?:the\s+)?(.+)/i],
    action: 'move', extractTarget: true },

  // === HOME ===
  { patterns: [/^go\s+home/i, /^return\s+home/i, /^head\s+home/i, /^enter\s+(?:my\s+)?home/i, /^visit\s+(?:my\s+)?home/i],
    action: 'go_home' },

  // === COMBAT ===
  { patterns: [/^(?:fight|attack|kill|battle|slay|hit|strike)\s+(?:the\s+)?(?:a\s+)?(.+)/i],
    action: 'fight', extractTarget: true },

  // === SHOPPING ===
  { patterns: [/^buy\s+(\d+\s+)?(.+)/i, /^purchase\s+(\d+\s+)?(.+)/i],
    action: 'buy', extractTarget: true, extractQuantity: true },
  { patterns: [/^sell\s+(\d+\s+)?(.+)/i],
    action: 'sell', extractTarget: true, extractQuantity: true },
  { patterns: [/^(?:browse|shop|look at wares|see what.*(?:sell|have|offer))/i],
    action: 'browse_shop' },

  // === INVENTORY / EQUIPMENT ===
  { patterns: [/^(?:inventory|items|bag|backpack|check\s+(?:my\s+)?(?:inventory|items|bag))/i, /^(?:i|inv)$/i],
    action: 'inventory' },
  { patterns: [/^equip\s+(?:the\s+)?(?:my\s+)?(.+)/i, /^wear\s+(?:the\s+)?(?:my\s+)?(.+)/i, /^wield\s+(?:the\s+)?(?:my\s+)?(.+)/i],
    action: 'equip', extractTarget: true },
  { patterns: [/^unequip\s+(?:the\s+)?(?:my\s+)?(.+)/i, /^remove\s+(?:the\s+)?(?:my\s+)?(.+)/i],
    action: 'unequip', extractTarget: true },
  { patterns: [/^(?:use|consume|eat|drink)\s+(?:the\s+)?(?:a\s+)?(?:my\s+)?(.+)/i],
    action: 'use_item', extractTarget: true },
  { patterns: [/^drop\s+(\d+\s+)?(?:the\s+)?(.+)/i, /^discard\s+(\d+\s+)?(?:the\s+)?(.+)/i],
    action: 'drop', extractTarget: true, extractQuantity: true },

  // === SKILLS / GATHERING ===
  { patterns: [/^mine\s*(?:(?:some|the|a)\s+)?(?:rocks?|ore|stone)?/i, /^go\s+mining/i, /^start\s+mining/i],
    action: 'gather', skill: 'mining' },
  { patterns: [/^fish\s*(?:here)?/i, /^go\s+fishing/i, /^cast\s+(?:my\s+)?(?:line|rod)/i, /^start\s+fishing/i, /^catch\s+(?:some\s+)?fish/i],
    action: 'gather', skill: 'fishing' },
  { patterns: [/^chop\s+(?:(?:some|the|a)\s+)?(?:trees?|wood|logs?)/i, /^go\s+woodcutting/i, /^cut\s+(?:(?:some|the|a)\s+)?(?:trees?|wood)/i, /^start\s+woodcutting/i],
    action: 'gather', skill: 'woodcutting' },
  { patterns: [/^(?:gather|pick|collect)\s+(?:some\s+)?herbs?/i, /^go\s+(?:herb\s*gathering|herbalism)/i, /^start\s+herbalism/i, /^forage/i],
    action: 'gather', skill: 'herbalism' },
  { patterns: [/^farm/i, /^tend\s+(?:the\s+)?(?:garden|crops|farm)/i, /^go\s+farming/i, /^plant/i, /^harvest/i],
    action: 'gather', skill: 'farming' },

  // === CRAFTING ===
  { patterns: [/^craft\s+(?:the\s+)?(?:a\s+)?(.+)/i, /^make\s+(?:the\s+)?(?:a\s+)?(.+)/i, /^create\s+(?:the\s+)?(?:a\s+)?(.+)/i,
    /^forge\s+(?:the\s+)?(?:a\s+)?(.+)/i, /^build\s+(?:the\s+)?(?:a\s+)?(.+)/i],
    action: 'craft', extractTarget: true },
  { patterns: [/^(?:cook|prepare|bake)\s+(?:the\s+)?(?:a\s+)?(?:some\s+)?(.+)/i],
    action: 'craft', extractTarget: true, skill: 'cooking' },
  { patterns: [/^(?:brew|mix|concoct)\s+(?:the\s+)?(?:a\s+)?(?:some\s+)?(.+)/i],
    action: 'craft', extractTarget: true, skill: 'alchemy' },
  { patterns: [/^enchant\s+(?:the\s+)?(?:my\s+)?(.+)/i],
    action: 'craft', extractTarget: true, skill: 'enchanting' },
  { patterns: [/^(?:recipes?|what\s+can\s+I\s+(?:craft|make|cook|brew))/i],
    action: 'view_recipes' },

  // === SOCIAL / COMMUNICATION ===
  { patterns: [/^(?:say|talk|speak|chat)\s+(?:to\s+)?(?:the\s+)?(.+)/i, /^(?:greet|hello|hi|hey)\s+(.+)/i],
    action: 'talk', extractTarget: true },
  { patterns: [/^(?:shout|yell|announce)\s+(.+)/i],
    action: 'shout', extractTarget: true },
  { patterns: [/^(?:whisper|pm|message|dm|tell)\s+(\S+)\s+(.+)/i],
    action: 'whisper', extractTarget: true },
  { patterns: [/^(?:emote|me)\s+(.+)/i],
    action: 'emote', extractTarget: true },
  { patterns: [/^(?:trade\s+with|trade)\s+(.+)/i],
    action: 'trade_request', extractTarget: true },

  // === INFORMATION ===
  { patterns: [/^(?:look|look\s*around|examine\s+(?:the\s+)?room|where\s+am\s+I|surroundings|observe)/i, /^(?:l|la)$/i],
    action: 'look' },
  { patterns: [/^(?:examine|inspect|check|look\s+at)\s+(?:the\s+)?(.+)/i],
    action: 'examine', extractTarget: true },
  { patterns: [/^(?:stats|status|character|profile|check\s+(?:my\s+)?(?:stats|status|character))/i],
    action: 'stats' },
  { patterns: [/^(?:skills|abilities|check\s+(?:my\s+)?skills)/i],
    action: 'skills' },
  { patterns: [/^(?:map|where|locations|show\s+map)/i],
    action: 'map' },
  { patterns: [/^(?:who|players|online|who'?s?\s+(?:here|online|around))/i],
    action: 'who' },
  { patterns: [/^(?:leaderboard|rankings|top\s+players|hall\s+of\s+fame)/i],
    action: 'leaderboard' },
  { patterns: [/^(?:equipment|gear|loadout|check\s+(?:my\s+)?(?:equipment|gear))/i],
    action: 'equipment' },

  // === QUESTS ===
  { patterns: [/^(?:quests?|check\s+(?:my\s+)?quests?|quest\s*log|journal)/i, /^(?:view\s+)?quests?/i],
    action: 'quests' },
  { patterns: [/^accept\s+(?:the\s+)?(?:quest\s+)?(.+)/i, /^take\s+(?:the\s+)?quest\s+(.+)/i],
    action: 'accept_quest', extractTarget: true },
  { patterns: [/^abandon\s+(?:the\s+)?(?:quest\s+)?(.+)/i],
    action: 'abandon_quest', extractTarget: true },

  // === HOME ACTIONS ===
  { patterns: [/^(?:rest|sleep|nap|relax|lie\s+down)/i],
    action: 'rest' },
  { patterns: [/^(?:store|deposit|put\s+away)\s+(\d+\s+)?(.+)/i],
    action: 'store_item', extractTarget: true, extractQuantity: true },
  { patterns: [/^(?:withdraw|take\s+out|retrieve)\s+(\d+\s+)?(.+)/i],
    action: 'withdraw_item', extractTarget: true, extractQuantity: true },
  { patterns: [/^(?:place|install|set\s+up)\s+(?:the\s+)?(?:a\s+)?(.+)/i, /^(?:furnish|decorate)\s+(?:with\s+)?(?:the\s+)?(?:a\s+)?(.+)/i],
    action: 'place_furniture', extractTarget: true },
  { patterns: [/^(?:check|view|open)\s+(?:my\s+)?(?:home\s+)?storage/i],
    action: 'view_storage' },
  { patterns: [/^(?:work|use)\s+(?:on\s+)?(?:the\s+)?(?:my\s+)?computer/i, /^work\s+(?:on\s+)?(?:the\s+)?(?:my\s+)?(?:computer|desk|pc)/i,
    /^(?:go\s+)?work\s+(?:on\s+)?(?:your|my)\s+computer/i, /^(?:sit\s+at|use)\s+(?:the\s+)?(?:my\s+)?(?:computer|desk)/i],
    action: 'work_computer' },

  // === TRAINING / ARENA ===
  { patterns: [/^train\s*(?:(?:my\s+)?(.+))?/i, /^practice\s*(?:(?:my\s+)?(.+))?/i],
    action: 'train', extractTarget: true },
  { patterns: [/^(?:spar|duel)\s+(?:with\s+)?(.+)/i],
    action: 'duel', extractTarget: true },
  { patterns: [/^(?:enter|join)\s+(?:the\s+)?arena/i, /^(?:arena\s+)?fight/i],
    action: 'arena_fight' },

  // === HEALING ===
  { patterns: [/^(?:heal|cure|get\s+healed|pray\s+for\s+healing)/i],
    action: 'heal' },
  { patterns: [/^pray/i],
    action: 'pray' },

  // === MISC ===
  { patterns: [/^(?:help|commands|what\s+can\s+I\s+do|\?)/i],
    action: 'help' },
  { patterns: [/^(?:gamble|bet|play\s+(?:cards|dice))\s*(\d+)?/i],
    action: 'gamble', extractTarget: true },
  { patterns: [/^(?:swim|dive|jump\s+in)/i],
    action: 'swim' },
  { patterns: [/^(?:explore|search|investigate|scout)/i],
    action: 'explore' },
];

function parseCommand(input) {
  if (!input || typeof input !== 'string') return { action: 'unknown', raw: '' };

  const trimmed = input.trim();
  if (!trimmed) return { action: 'unknown', raw: '' };

  for (const cmdDef of COMMAND_PATTERNS) {
    for (const pattern of cmdDef.patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const result = { action: cmdDef.action, raw: trimmed };

        if (cmdDef.skill) result.skill = cmdDef.skill;

        if (cmdDef.extractTarget) {
          if (cmdDef.extractQuantity) {
            // Patterns with quantity: group 1 = quantity, group 2 = target
            const qty = match[1] ? parseInt(match[1].trim()) : 1;
            result.quantity = qty;
            result.target = (match[2] || match[1] || '').trim().toLowerCase();
          } else if (cmdDef.action === 'whisper') {
            result.target = match[1].trim().toLowerCase();
            result.message = match[2].trim();
          } else {
            // Last capturing group is the target
            const groups = match.filter((g, i) => i > 0 && g !== undefined);
            result.target = groups[groups.length - 1].trim().toLowerCase();
          }
        }

        // Resolve target to game entity
        if (result.target) {
          result.resolvedLocation = resolveLocation(result.target);
          result.resolvedItem = resolveItem(result.target);
          result.resolvedMonster = resolveMonster(result.target);
          result.resolvedNpc = resolveNpc(result.target);
          result.resolvedSkill = resolveSkill(result.target);
          result.resolvedRecipe = resolveRecipe(result.target);
        }

        return result;
      }
    }
  }

  // If no pattern matched, try to infer intent
  return inferIntent(trimmed);
}

function resolveLocation(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  let bestMatch = null;
  let bestScore = 0;

  for (const [id, loc] of Object.entries(LOCATIONS)) {
    const locName = loc.name.toLowerCase();
    const locId = id.replace(/_/g, ' ');

    if (locName === normalized || locId === normalized) return id;

    const score = fuzzyMatch(normalized, locName) || fuzzyMatch(normalized, locId);
    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = id;
    }
  }
  return bestMatch;
}

function resolveItem(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  let bestMatch = null;
  let bestScore = 0;

  for (const [id, item] of Object.entries(ITEMS)) {
    const itemName = item.name.toLowerCase();
    const itemId = id.replace(/_/g, ' ');

    if (itemName === normalized || itemId === normalized) return id;

    const score = Math.max(fuzzyMatch(normalized, itemName), fuzzyMatch(normalized, itemId));
    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = id;
    }
  }
  return bestMatch;
}

function resolveMonster(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  let bestMatch = null;
  let bestScore = 0;

  for (const [id, monster] of Object.entries(MONSTERS)) {
    const mName = monster.name.toLowerCase();
    const mId = id.replace(/_/g, ' ');

    if (mName === normalized || mId === normalized) return id;
    if (normalized.includes(mId) || mName.includes(normalized)) return id;

    const score = Math.max(fuzzyMatch(normalized, mName), fuzzyMatch(normalized, mId));
    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = id;
    }
  }
  return bestMatch;
}

function resolveNpc(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  for (const [id, npc] of Object.entries(NPCS)) {
    const npcName = npc.name.toLowerCase();
    if (npcName.includes(normalized) || normalized.includes(id.replace(/_/g, ' '))) return id;
  }
  return null;
}

function resolveSkill(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  for (const [id, skill] of Object.entries(SKILLS)) {
    if (id === normalized || skill.name.toLowerCase() === normalized) return id;
  }
  return null;
}

function resolveRecipe(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  let bestMatch = null;
  let bestScore = 0;
  for (const [id, recipe] of Object.entries(RECIPES)) {
    const resultItem = ITEMS[recipe.result];
    if (!resultItem) continue;
    const itemName = resultItem.name.toLowerCase();
    const itemId = id.replace(/_/g, ' ');
    if (itemName === normalized || itemId === normalized) return id;
    const score = Math.max(fuzzyMatch(normalized, itemName), fuzzyMatch(normalized, itemId));
    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = id;
    }
  }
  return bestMatch;
}

function fuzzyMatch(input, target) {
  if (input === target) return 1.0;
  if (target.includes(input)) return 0.8;
  if (input.includes(target)) return 0.7;

  const inputWords = input.split(/\s+/);
  const targetWords = target.split(/\s+/);
  let matchingWords = 0;
  for (const iw of inputWords) {
    for (const tw of targetWords) {
      if (tw.includes(iw) || iw.includes(tw)) matchingWords++;
    }
  }
  return matchingWords / Math.max(inputWords.length, targetWords.length);
}

function inferIntent(input) {
  const lower = input.toLowerCase();

  // Check if it looks like they want to go somewhere
  const locMatch = resolveLocation(lower);
  if (locMatch) return { action: 'move', target: lower, resolvedLocation: locMatch, raw: input };

  // Check if it's an item name (maybe they want to use it)
  const itemMatch = resolveItem(lower);
  if (itemMatch) return { action: 'examine', target: lower, resolvedItem: itemMatch, raw: input };

  // Check if it's a monster name
  const monsterMatch = resolveMonster(lower);
  if (monsterMatch) return { action: 'fight', target: lower, resolvedMonster: monsterMatch, raw: input };

  // NPC name
  const npcMatch = resolveNpc(lower);
  if (npcMatch) return { action: 'talk', target: lower, resolvedNpc: npcMatch, raw: input };

  // Default: treat as chat message
  return { action: 'chat', message: input, raw: input };
}

module.exports = { parseCommand };
