// ============================================================================
// CLAWDCITY MMORPG - Client-Side Game Logic
// Handles login, WebSocket, rendering, and user interaction
// ============================================================================

(function () {
  'use strict';

  // =========================================================================
  // STATE
  // =========================================================================
  let ws = null;
  let token = null;
  let username = null;
  let commandHistory = [];
  let historyIndex = -1;

  // DOM references
  const loginScreen = document.getElementById('login-screen');
  const gameScreen = document.getElementById('game-screen');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');
  const outputScroll = document.getElementById('output-scroll');
  const commandInput = document.getElementById('command-input');
  const sendBtn = document.getElementById('send-btn');

  // =========================================================================
  // LOGIN / REGISTER
  // =========================================================================
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab === 'login' ? 'login-form' : 'register-form').classList.add('active');
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    if (!user || !pass) { loginError.textContent = 'Fill in all fields.'; return; }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await res.json();
      if (!res.ok) { loginError.textContent = data.error; return; }
      token = data.token;
      username = data.username;
      enterGame();
    } catch (err) {
      loginError.textContent = 'Connection failed. Is the server running?';
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    const user = document.getElementById('reg-username').value.trim();
    const pass = document.getElementById('reg-password').value;
    const pass2 = document.getElementById('reg-password2').value;

    if (!user || !pass || !pass2) { registerError.textContent = 'Fill in all fields.'; return; }
    if (pass !== pass2) { registerError.textContent = 'Passwords do not match.'; return; }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await res.json();
      if (!res.ok) { registerError.textContent = data.error; return; }
      token = data.token;
      username = data.username;
      enterGame();
    } catch (err) {
      registerError.textContent = 'Connection failed. Is the server running?';
    }
  });

  // =========================================================================
  // ENTER GAME
  // =========================================================================
  function enterGame() {
    loginScreen.classList.remove('active');
    gameScreen.classList.add('active');
    document.getElementById('player-name').textContent = username;
    commandInput.focus();
    connectWebSocket();
  }

  // =========================================================================
  // WEBSOCKET
  // =========================================================================
  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
      addSystemMessage('Connecting to ClawdCity...');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.error('Failed to parse server message:', e);
      }
    };

    ws.onclose = () => {
      addSystemMessage('Disconnected from server. Refresh to reconnect.');
    };

    ws.onerror = () => {
      addSystemMessage('Connection error.');
    };
  }

  // =========================================================================
  // COMMAND INPUT
  // =========================================================================
  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        commandInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        commandInput.value = commandHistory[commandHistory.length - 1 - historyIndex];
      } else {
        historyIndex = -1;
        commandInput.value = '';
      }
    }
  });

  sendBtn.addEventListener('click', sendCommand);

  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      commandInput.value = btn.dataset.cmd;
      sendCommand();
    });
  });

  function sendCommand() {
    const text = commandInput.value.trim();
    if (!text) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addSystemMessage('Not connected to server.');
      return;
    }

    commandHistory.push(text);
    if (commandHistory.length > 100) commandHistory.shift();
    historyIndex = -1;

    addMessage('msg-command', text);
    ws.send(JSON.stringify({ type: 'command', text }));
    commandInput.value = '';
    commandInput.focus();
  }

  // =========================================================================
  // MESSAGE HANDLERS
  // =========================================================================
  function handleServerMessage(msg) {
    switch (msg.type) {
      case 'game_init': handleGameInit(msg.data); break;
      case 'auth_failed': addSystemMessage(msg.data.message); break;
      case 'kicked': addSystemMessage(msg.data.message); break;
      case 'location': renderLocation(msg.data); break;
      case 'narrative': addMessage('msg-narrative', msg.data.message); break;
      case 'error': addMessage('msg-error', msg.data.message); break;
      case 'success': addMessage('msg-success', msg.data.message); break;
      case 'ambience': addMessage('msg-ambience', msg.data.message); break;
      case 'stats': renderStats(msg.data); break;
      case 'stats_update': updateStats(msg.data); break;
      case 'skills': renderSkills(msg.data); break;
      case 'inventory': renderInventory(msg.data); break;
      case 'equipment': renderEquipment(msg.data); break;
      case 'shop': renderShop(msg.data); break;
      case 'combat_start': renderCombatStart(msg.data); break;
      case 'combat_action': renderCombatAction(msg.data); break;
      case 'combat_victory': renderCombatVictory(msg.data); break;
      case 'death': addMessage('msg-combat death', msg.data.message); break;
      case 'loot': addMessage('msg-loot', msg.data.message); break;
      case 'level_up': addMessage('msg-levelup', msg.data.message); break;
      case 'gather': addMessage('msg-success', msg.data.message); break;
      case 'quests': renderQuests(msg.data); break;
      case 'quest_complete': addMessage('msg-quest', msg.data.message); break;
      case 'quest_step_complete': addMessage('msg-quest', `Quest "${msg.data.quest}": ${msg.data.step} - Complete!`); break;
      case 'npc_dialogue': renderNpcDialogue(msg.data); break;
      case 'chat': renderChat(msg.data); break;
      case 'shout': renderShout(msg.data); break;
      case 'whisper': addMessage('msg-whisper', `[Whisper from ${msg.data.from}]: ${msg.data.message}`); break;
      case 'whisper_sent': addMessage('msg-whisper', msg.data.message); break;
      case 'emote': addMessage('msg-emote', `* ${msg.data.username} ${msg.data.action}`); break;
      case 'player_arrived': addActivity(`${msg.data.username} arrived.`); break;
      case 'player_left': addActivity(`${msg.data.username} left.`); break;
      case 'player_death': addActivity(`${msg.data.username} was defeated!`); break;
      case 'world_event': renderWorldEvent(msg.data); break;
      case 'world_event_end': hideWorldEvent(); break;
      case 'map': renderMap(msg.data); break;
      case 'who': renderWho(msg.data); break;
      case 'leaderboard': renderLeaderboard(msg.data); break;
      case 'help': renderHelp(msg.data); break;
      case 'recipes': renderRecipes(msg.data); break;
      case 'examine': renderExamine(msg.data); break;
      case 'storage': renderStorage(msg.data); break;
      default:
        if (msg.data && msg.data.message) {
          addMessage('msg-narrative', msg.data.message);
        }
    }
  }

  // =========================================================================
  // RENDER FUNCTIONS
  // =========================================================================
  function handleGameInit(data) {
    addSystemMessage(`Welcome to ClawdCity, ${data.player.username}!`);
    addSystemMessage('Type "help" to see available commands, or "look" to see your surroundings.');
    updateStats(data.player);
    if (data.location) {
      data.location.forEach(msg => {
        if (msg.type === 'location') renderLocation(msg.data);
        else if (msg.type === 'ambience') addMessage('msg-ambience', msg.message);
      });
    }
    if (data.worldEvent) {
      renderWorldEvent(data.worldEvent);
    }
    if (data.onlinePlayers) {
      document.getElementById('online-count').textContent = `${data.onlinePlayers.length} online`;
    }
    if (data.activeQuests && data.activeQuests.length > 0) {
      addSystemMessage(`Active quests: ${data.activeQuests.join(', ')}`);
    }
  }

  function updateStats(data) {
    if (!data) return;
    document.getElementById('stat-level').textContent = data.level;
    document.getElementById('stat-title').textContent = data.title;
    document.getElementById('stat-attack').textContent = data.attack;
    document.getElementById('stat-defense').textContent = data.defense;
    document.getElementById('stat-magic').textContent = data.magic;
    document.getElementById('stat-speed').textContent = data.speed;
    document.getElementById('stat-gold').textContent = data.gold?.toLocaleString();

    // XP bar
    const xpPct = data.xpToNext > 0 ? (data.xp / data.xpToNext * 100) : 0;
    document.getElementById('xp-bar').style.width = xpPct + '%';
    document.getElementById('xp-text').textContent = `${data.xp} / ${data.xpToNext} XP`;

    // HP bar
    const hpPct = data.maxHp > 0 ? (data.hp / data.maxHp * 100) : 0;
    document.getElementById('hp-bar').style.width = hpPct + '%';
    document.getElementById('hp-text').textContent = `${data.hp}/${data.maxHp}`;

    // MP bar
    const mpPct = data.maxMp > 0 ? (data.mp / data.maxMp * 100) : 0;
    document.getElementById('mp-bar').style.width = mpPct + '%';
    document.getElementById('mp-text').textContent = `${data.mp}/${data.maxMp}`;

    // Energy bar
    const energyPct = data.maxEnergy > 0 ? (data.energy / data.maxEnergy * 100) : 0;
    document.getElementById('energy-bar').style.width = energyPct + '%';
    document.getElementById('energy-text').textContent = `${data.energy}/${data.maxEnergy}`;

    // Location
    if (data.location) {
      document.getElementById('player-location').textContent = getLocationDisplayName(data.location);
    }
  }

  function getLocationDisplayName(id) {
    const names = {
      town_square: 'Town Square', market_district: 'Market District', general_store: 'General Store',
      weapon_shop: 'Weapon Shop', armor_shop: 'Armor Shop', potion_shop: 'Potion Shop',
      auction_house: 'Auction House', guild_hall: 'Guild Hall', tavern: 'Tavern',
      temple: 'Temple', training_grounds: 'Training Grounds', arena: 'Arena',
      residential_gate: 'Residential Gate', city_gate: 'City Gate',
      forest_path: 'Whispering Forest', deep_forest: 'Deep Forest', forest_clearing: 'Forest Clearing',
      river_bank: 'Crystal River', waterfall: 'Hidden Waterfall', hidden_cave: 'Hidden Cave',
      mountain_trail: 'Mountain Trail', mountain_mine: 'Dwarven Mines', dragon_peak: "Dragon's Peak",
      ancient_ruins: 'Ancient Ruins', demon_gate: 'Demon Gate', player_home: 'Your Home'
    };
    return names[id] || id;
  }

  function renderLocation(data) {
    const div = document.createElement('div');
    div.className = 'location-box';

    let areaClass = 'town';
    if (data.areaTag?.includes('WILDERNESS')) areaClass = 'wilderness';
    else if (data.areaTag?.includes('DUNGEON')) areaClass = 'dungeon';
    else if (data.areaTag?.includes('HOME')) areaClass = 'home';

    let html = `
      <div class="loc-header">
        <span class="loc-tag ${areaClass}">${escHtml(data.areaTag || '')}</span>
        <span class="loc-name">${escHtml(data.name)}</span>
      </div>
      <div class="loc-desc">${escHtml(data.description)}</div>
    `;

    // Connections
    if (data.connections && data.connections.length > 0) {
      html += `<div class="loc-section">
        <div class="loc-section-title">Exits</div>
        <div class="loc-items">${data.connections.map(c =>
          `<span class="loc-chip location" onclick="sendQuickCmd('go ${escAttr(c.name)}')">${escHtml(c.name)}</span>`
        ).join('')}</div>
      </div>`;
    }

    // NPCs
    if (data.npcs && data.npcs.length > 0) {
      html += `<div class="loc-section">
        <div class="loc-section-title">NPCs</div>
        <div class="loc-items">${data.npcs.map(n =>
          `<span class="loc-chip npc" onclick="sendQuickCmd('talk to ${escAttr(n.name)}')">${escHtml(n.name)}</span>`
        ).join('')}</div>
      </div>`;
    }

    // Monsters
    if (data.monsters && data.monsters.length > 0) {
      html += `<div class="loc-section">
        <div class="loc-section-title">Monsters</div>
        <div class="loc-items">${data.monsters.map(m =>
          `<span class="loc-chip monster" onclick="sendQuickCmd('fight ${escAttr(m.name)}')">${escHtml(m.name)} (Lv ${m.level})</span>`
        ).join('')}</div>
      </div>`;
    }

    // Players
    if (data.playersHere && data.playersHere.length > 0) {
      html += `<div class="loc-section">
        <div class="loc-section-title">Players Here</div>
        <div class="loc-items">${data.playersHere.map(p =>
          `<span class="loc-chip player">${escHtml(p)}</span>`
        ).join('')}</div>
      </div>`;
    }

    // Furniture (home)
    if (data.furniture) {
      html += `<div class="loc-section">
        <div class="loc-section-title">Furniture</div>
        <div class="loc-items">${data.furniture.map(f =>
          `<span class="loc-chip">${escHtml(f)}</span>`
        ).join('')}</div>
      </div>`;
    }

    div.innerHTML = html;
    outputScroll.appendChild(div);
    scrollToBottom();

    // Update sidebar
    updateSidebar(data);
  }

  function updateSidebar(locData) {
    // Location badge
    document.getElementById('player-location').textContent = locData.name;

    // Nearby
    const nearbyEl = document.getElementById('nearby-locations');
    if (locData.connections && locData.connections.length > 0) {
      nearbyEl.innerHTML = locData.connections.map(c =>
        `<div class="nearby-item" onclick="sendQuickCmd('go ${escAttr(c.name)}')">${escHtml(c.name)}</div>`
      ).join('');
    } else {
      nearbyEl.innerHTML = '<span class="empty-text">No exits</span>';
    }

    // NPCs
    const npcsEl = document.getElementById('npcs-here');
    if (locData.npcs && locData.npcs.length > 0) {
      npcsEl.innerHTML = locData.npcs.map(n =>
        `<div class="npc-item" onclick="sendQuickCmd('talk to ${escAttr(n.name)}')">${escHtml(n.name)}</div>`
      ).join('');
    } else {
      npcsEl.innerHTML = '<span class="empty-text">None</span>';
    }

    // Players
    const playersEl = document.getElementById('players-here');
    if (locData.playersHere && locData.playersHere.length > 0) {
      playersEl.innerHTML = locData.playersHere.map(p =>
        `<div class="player-item">${escHtml(p)}</div>`
      ).join('');
    } else {
      playersEl.innerHTML = '<span class="empty-text">None nearby</span>';
    }
  }

  function renderStats(data) {
    updateStats(data);
    const lines = [
      `<b>${data.username}</b> - ${data.title}`,
      `Level ${data.level} | ${data.xp}/${data.xpToNext} XP`,
      `HP: ${data.hp}/${data.maxHp} | MP: ${data.mp}/${data.maxMp} | Energy: ${data.energy}/${data.maxEnergy}`,
      `ATK: ${data.attack} | DEF: ${data.defense} | MAG: ${data.magic} | SPD: ${data.speed}`,
      `Gold: ${data.gold}`,
    ];
    addMessage('msg-narrative', lines.join('\n'));
  }

  function renderSkills(data) {
    let html = '<div class="data-table">';
    for (const [id, skill] of Object.entries(data)) {
      const pct = skill.xpToNext > 0 ? Math.floor(skill.xp / skill.xpToNext * 100) : 0;
      html += `<div class="data-row">
        <span>${skill.icon} ${skill.name}</span>
        <span>Lv ${skill.level} (${pct}%)</span>
      </div>`;
    }
    html += '</div>';
    addHtml(html);
  }

  function renderInventory(data) {
    if (data.items.length === 0) {
      addMessage('msg-narrative', `Inventory (${data.slots}): Empty\nGold: ${data.gold}`);
      return;
    }
    let html = `<div style="margin-bottom:0.3rem;color:var(--text-secondary);font-size:0.82rem">Inventory (${data.slots}) | Gold: <span style="color:var(--accent-gold)">${data.gold}</span></div>`;
    html += '<div class="data-table">';
    for (const item of data.items) {
      html += `<div class="data-row">
        <span style="color:var(--accent-cyan)">${escHtml(item.name)} x${item.quantity}</span>
        <span style="color:var(--text-muted)">${item.type} | ${item.value}g</span>
      </div>`;
    }
    html += '</div>';
    addHtml(html);
  }

  function renderEquipment(data) {
    let html = '<div class="data-table">';
    for (const [slot, item] of Object.entries(data)) {
      const display = item ? `<span style="color:var(--accent-cyan)">${escHtml(item.name)}</span> ${item.stats ? '(' + Object.entries(item.stats).map(([k, v]) => `+${v} ${k}`).join(', ') + ')' : ''}` : '<span style="color:var(--text-muted)">Empty</span>';
      html += `<div class="data-row"><span>${slot}</span>${display}</div>`;
    }
    html += '</div>';
    addHtml(html);

    // Update sidebar equipment
    for (const [slot, item] of Object.entries(data)) {
      const el = document.getElementById(`equip-${slot}`);
      if (el) {
        if (item) {
          el.textContent = item.name;
          el.classList.remove('empty');
        } else {
          el.textContent = 'None';
          el.classList.add('empty');
        }
      }
    }
  }

  function renderShop(data) {
    let html = `<div style="margin-bottom:0.4rem;font-weight:600;color:var(--accent-cyan)">${escHtml(data.name)}</div>`;
    html += `<div style="margin-bottom:0.3rem;font-size:0.8rem;color:var(--text-secondary)">Your gold: <span style="color:var(--accent-gold)">${data.playerGold}</span></div>`;
    html += '<table class="shop-table"><thead><tr><th>Item</th><th>Buy</th><th>Sell</th><th>Lv</th><th>Info</th></tr></thead><tbody>';
    for (const item of data.items) {
      html += `<tr>
        <td class="item-name">${escHtml(item.name)}</td>
        <td class="item-price">${item.price}g</td>
        <td class="item-price">${item.sellPrice}g</td>
        <td>${item.level}</td>
        <td class="item-type">${escHtml(item.description)}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    html += '<div style="margin-top:0.3rem;font-size:0.75rem;color:var(--text-muted)">Type "buy [item name]" to purchase or "sell [item name]" to sell.</div>';
    addHtml(html);
  }

  function renderCombatStart(data) {
    const m = data.monster;
    addMessage('msg-combat', `\n--- COMBAT START ---`);
    addMessage('msg-combat', `${m.name} (Lv ${m.level}) | HP: ${m.hp} | ATK: ${m.attack} | DEF: ${m.defense}`);
  }

  function renderCombatAction(data) {
    const hpBar = renderMiniHpBar(data.targetHp, data.targetMaxHp);
    addMessage('msg-combat', `${escHtml(data.attacker)} hits ${escHtml(data.target)} for ${data.damage} damage! ${hpBar}`);
  }

  function renderMiniHpBar(current, max) {
    const pct = Math.max(0, Math.floor(current / max * 100));
    const color = pct > 50 ? 'var(--accent-green)' : pct > 25 ? 'var(--accent-orange)' : 'var(--accent-red)';
    return `<span style="color:${color}">[${current}/${max} HP]</span>`;
  }

  function renderCombatVictory(data) {
    addMessage('msg-combat victory', `\nVICTORY! Defeated ${data.monster}!`);
    addMessage('msg-success', `Rewards: +${data.xp} XP, +${data.gold} gold`);
  }

  function renderQuests(data) {
    let html = '';
    if (data.active.length > 0) {
      html += '<div style="font-weight:600;color:var(--accent-gold);margin-bottom:0.3rem">Active Quests</div>';
      for (const quest of data.active) {
        html += `<div style="margin-bottom:0.5rem;padding:0.4rem;background:var(--bg-medium);border-radius:var(--radius);border-left:3px solid var(--accent-gold)">`;
        html += `<div style="font-weight:600;color:var(--accent-cyan)">${escHtml(quest.name)} (Lv ${quest.level})</div>`;
        html += `<div style="font-size:0.8rem;color:var(--text-secondary)">${escHtml(quest.description)}</div>`;
        for (const step of quest.steps) {
          const done = step.complete ? '✅' : '⬜';
          html += `<div style="font-size:0.8rem;padding-left:0.5rem">${done} ${escHtml(step.description)} (${step.current}/${step.target})</div>`;
        }
        html += `<div style="font-size:0.75rem;color:var(--accent-gold);margin-top:0.2rem">Rewards: ${quest.rewards.xp} XP, ${quest.rewards.gold} gold</div>`;
        html += '</div>';
      }
    } else {
      html += '<div style="color:var(--text-muted)">No active quests. Visit the Guild Hall to accept quests!</div>';
    }
    if (data.completed.length > 0) {
      html += `<div style="font-weight:600;color:var(--text-muted);margin-top:0.5rem">Completed (${data.completed.length}): ${data.completed.join(', ')}</div>`;
    }
    addHtml(html);
  }

  function renderNpcDialogue(data) {
    let html = `<div style="padding:0.5rem;background:var(--bg-medium);border-radius:var(--radius);border-left:3px solid var(--accent-cyan)">`;
    html += `<div style="font-weight:600;color:var(--accent-cyan);margin-bottom:0.3rem">${escHtml(data.name)}</div>`;
    html += `<div style="color:var(--text-primary);white-space:pre-wrap">${escHtml(data.message)}</div>`;
    html += '</div>';
    addHtml(html);
  }

  function renderChat(data) {
    addMessage('msg-chat', `<span class="chat-name">${escHtml(data.username)}</span>: ${escHtml(data.message)}`);
  }

  function renderShout(data) {
    addMessage('msg-shout', `[SHOUT] ${escHtml(data.username)}: ${escHtml(data.message)}`);
    addActivity(`${data.username} shouted something.`);
  }

  function renderWorldEvent(data) {
    const banner = document.getElementById('world-event-banner');
    banner.textContent = `${data.name}: ${data.description}`;
    banner.classList.remove('hidden');
    addMessage('msg-system', `\n--- WORLD EVENT: ${data.name} ---\n${data.description}`);
    addActivity(`World Event: ${data.name}`);
  }

  function hideWorldEvent() {
    document.getElementById('world-event-banner').classList.add('hidden');
    addActivity('World event ended.');
  }

  function renderMap(data) {
    let html = `<div style="font-weight:600;color:var(--accent-blue);margin-bottom:0.5rem">World Map (Current: ${escHtml(data.current.name)})</div>`;

    html += '<div style="margin-bottom:0.5rem"><div style="color:var(--accent-green);font-size:0.82rem;font-weight:600">Nearby:</div><div class="map-locations">';
    for (const loc of data.nearby) {
      const extra = loc.playerCount > 0 ? ` (${loc.playerCount} players)` : '';
      html += `<span class="map-loc" onclick="sendQuickCmd('go ${escAttr(loc.name)}')">${escHtml(loc.name)}${extra}</span>`;
    }
    html += '</div></div>';

    for (const [area, locations] of Object.entries(data.areas)) {
      html += `<div class="map-area"><div class="map-area-title">${area}</div><div class="map-locations">`;
      for (const loc of locations) {
        const isCurrent = loc.id === data.current.id;
        html += `<span class="map-loc ${isCurrent ? 'current' : ''}" onclick="sendQuickCmd('go ${escAttr(loc.name)}')">${escHtml(loc.name)}</span>`;
      }
      html += '</div></div>';
    }
    addHtml(html);
  }

  function renderWho(data) {
    let html = `<div style="color:var(--accent-blue);font-weight:600;margin-bottom:0.3rem">Players Online: ${data.total}</div>`;
    if (data.here.length > 0) {
      html += `<div style="color:var(--accent-green)">Here: ${data.here.map(p => escHtml(p)).join(', ')}</div>`;
    }
    html += `<div style="color:var(--text-secondary);font-size:0.82rem">All online: ${data.online.map(p => escHtml(p)).join(', ')}</div>`;
    addHtml(html);
  }

  function renderLeaderboard(data) {
    let html = '<div style="font-weight:600;color:var(--accent-gold);margin-bottom:0.3rem">Leaderboard</div>';
    html += '<table class="shop-table"><thead><tr><th>#</th><th>Player</th><th>Level</th><th>Title</th><th>Kills</th><th>Quests</th></tr></thead><tbody>';
    data.forEach((p, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td class="item-name">${escHtml(p.username)}</td>
        <td>${p.level}</td>
        <td>${escHtml(p.title)}</td>
        <td>${p.monstersKilled}</td>
        <td>${p.questsCompleted}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    addHtml(html);
  }

  function renderHelp(data) {
    let html = '<div style="font-weight:600;color:var(--accent-blue);font-size:1rem;margin-bottom:0.5rem">ClawdCity Commands</div>';
    for (const [category, commands] of Object.entries(data)) {
      html += `<div class="help-section">`;
      html += `<div class="help-section-title">${category.charAt(0).toUpperCase() + category.slice(1)}</div>`;
      html += commands.map(c => `<span class="help-cmd">${escHtml(c)}</span>`).join(' ');
      html += '</div>';
    }
    html += '<div style="margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted)">You can also use natural language! Try "go to the forest" or "I want to buy a sword".</div>';
    addHtml(html);
  }

  function renderRecipes(data) {
    let html = '<div style="font-weight:600;color:var(--accent-cyan);margin-bottom:0.3rem">Crafting Recipes</div>';
    html += '<table class="shop-table"><thead><tr><th>Item</th><th>Skill</th><th>Lv</th><th>Ingredients</th><th>XP</th></tr></thead><tbody>';
    for (const recipe of data) {
      const color = recipe.canCraft ? 'var(--accent-green)' : 'var(--text-muted)';
      html += `<tr style="color:${color}">
        <td class="item-name">${escHtml(recipe.name)}</td>
        <td>${escHtml(recipe.skill)}</td>
        <td>${recipe.level}</td>
        <td style="font-size:0.75rem">${escHtml(recipe.ingredients)}</td>
        <td>${recipe.xp}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    addHtml(html);
  }

  function renderExamine(data) {
    let html = '<div style="padding:0.4rem;background:var(--bg-medium);border-radius:var(--radius)">';
    for (const [key, value] of Object.entries(data)) {
      html += `<div style="font-size:0.82rem"><span style="color:var(--text-muted)">${key}:</span> <span style="color:var(--accent-cyan)">${escHtml(String(value))}</span></div>`;
    }
    html += '</div>';
    addHtml(html);
  }

  function renderStorage(data) {
    let html = `<div style="font-weight:600;color:var(--accent-cyan);margin-bottom:0.3rem">Home Storage (${data.used}/${data.max})</div>`;
    if (data.items.length === 0) {
      html += '<div style="color:var(--text-muted)">Storage is empty.</div>';
    } else {
      html += '<div class="data-table">';
      for (const item of data.items) {
        html += `<div class="data-row"><span style="color:var(--accent-cyan)">${escHtml(item.name)}</span><span>x${item.quantity}</span></div>`;
      }
      html += '</div>';
    }
    addHtml(html);
  }

  // =========================================================================
  // OUTPUT HELPERS
  // =========================================================================
  function addMessage(className, text) {
    const div = document.createElement('div');
    div.className = `msg ${className}`;
    div.innerHTML = text;
    outputScroll.appendChild(div);
    scrollToBottom();
  }

  function addHtml(html) {
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = html;
    outputScroll.appendChild(div);
    scrollToBottom();
  }

  function addSystemMessage(text) {
    addMessage('msg-system', text);
  }

  function addActivity(text) {
    const log = document.getElementById('activity-log');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.innerHTML = `<span class="activity-time">${time}</span> ${escHtml(text)}`;
    log.insertBefore(div, log.firstChild);
    // Keep max 50 items
    while (log.children.length > 50) log.removeChild(log.lastChild);
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      outputScroll.scrollTop = outputScroll.scrollHeight;
    });
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  // Global function for onclick handlers in dynamic HTML
  window.sendQuickCmd = function (cmd) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    commandInput.value = cmd;
    sendCommand();
  };
})();
