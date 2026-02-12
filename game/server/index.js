// ============================================================================
// CLAWDCITY MMORPG - Main Server
// Express + WebSocket server with authentication
// ============================================================================

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const GameEngine = require('./engine/gameEngine');
const { parseCommand } = require('./engine/commandParser');
const { createNewPlayer, getPlayerSummary } = require('./engine/player');
const { QUESTS } = require('./data/world');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ============================================================================
// DATABASE (in-memory for simplicity - would use a real DB in production)
// ============================================================================
const accounts = {}; // username -> { passwordHash, token }
const sessions = {}; // token -> username

// ============================================================================
// GAME ENGINE
// ============================================================================
const engine = new GameEngine();

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

// ============================================================================
// AUTH ROUTES
// ============================================================================
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters.' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }
  if (accounts[username.toLowerCase()]) {
    return res.status(409).json({ error: 'Username already taken.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = uuidv4();
  const lowerUsername = username.toLowerCase();

  accounts[lowerUsername] = { passwordHash, displayName: username };
  sessions[token] = lowerUsername;

  // Create player character
  engine.players[lowerUsername] = createNewPlayer(username);

  // Auto-accept tutorial quest
  const player = engine.players[lowerUsername];
  player.activeQuests.push('tutorial_start');
  player.questProgress['tutorial_start'] = { 0: 0, 1: 0, 2: 0 };

  console.log(`[REGISTER] New player: ${username}`);
  res.json({ token, username: username });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const lowerUsername = username.toLowerCase();
  const account = accounts[lowerUsername];

  if (!account) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Invalidate old sessions for this user
  for (const [tok, user] of Object.entries(sessions)) {
    if (user === lowerUsername) delete sessions[tok];
  }

  const token = uuidv4();
  sessions[token] = lowerUsername;

  // Update last login
  if (engine.players[lowerUsername]) {
    engine.players[lowerUsername].lastLogin = Date.now();
  }

  console.log(`[LOGIN] Player: ${account.displayName}`);
  res.json({ token, username: account.displayName });
});

// Serve the game client
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ============================================================================
// WEBSOCKET - GAME CONNECTION
// ============================================================================
wss.on('connection', (ws) => {
  let authenticatedUser = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid message format.' } }));
      return;
    }

    // Authentication
    if (msg.type === 'auth') {
      const username = sessions[msg.token];
      if (!username) {
        ws.send(JSON.stringify({ type: 'auth_failed', data: { message: 'Invalid session. Please log in again.' } }));
        return;
      }

      // Disconnect existing connection for this user
      if (engine.onlinePlayers[username]) {
        try {
          engine.onlinePlayers[username].send(JSON.stringify({ type: 'kicked', data: { message: 'You have been logged in from another location.' } }));
          engine.onlinePlayers[username].close();
        } catch (e) { /* ignore */ }
      }

      authenticatedUser = username;
      engine.onlinePlayers[username] = ws;

      const player = engine.players[username];
      if (!player) {
        ws.send(JSON.stringify({ type: 'error', data: { message: 'Player data not found.' } }));
        return;
      }

      // Send initial game state
      ws.send(JSON.stringify({
        type: 'game_init',
        data: {
          player: getPlayerSummary(player),
          location: engine.handleLook(player),
          activeQuests: player.activeQuests.map(qId => QUESTS[qId]?.name).filter(Boolean),
          worldEvent: engine.worldState.activeEvent ? { name: engine.worldState.activeEvent.name, description: engine.worldState.activeEvent.description } : null,
          onlinePlayers: Object.keys(engine.onlinePlayers),
        }
      }));

      // Notify others
      engine.broadcastToLocation(player.location, 'player_arrived', { username: player.username }, username);
      console.log(`[ONLINE] ${player.username} connected (${Object.keys(engine.onlinePlayers).length} online)`);
      return;
    }

    // Game commands
    if (msg.type === 'command') {
      if (!authenticatedUser) {
        ws.send(JSON.stringify({ type: 'error', data: { message: 'Not authenticated.' } }));
        return;
      }

      const player = engine.players[authenticatedUser];
      if (!player) return;

      // If player was resting and does something other than stats/help, stop resting
      if (player.state === 'resting' && !['stats', 'help', 'skills', 'inventory', 'equipment', 'quests', 'who', 'leaderboard', 'map'].includes(msg.command?.action)) {
        player.state = 'idle';
      }

      const command = parseCommand(msg.text);
      const results = engine.handleAction(authenticatedUser, command);

      for (const result of results) {
        ws.send(JSON.stringify({ type: result.type, data: result.data || { message: result.message } }));
      }
    }
  });

  ws.on('close', () => {
    if (authenticatedUser) {
      const player = engine.players[authenticatedUser];
      if (player) {
        player.state = 'idle';
        player.stateData = null;
        engine.broadcastToLocation(player.location, 'player_left', { username: player.username, destination: 'offline' }, authenticatedUser);
      }
      delete engine.onlinePlayers[authenticatedUser];
      console.log(`[OFFLINE] ${authenticatedUser} disconnected (${Object.keys(engine.onlinePlayers).length} online)`);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS ERROR] ${authenticatedUser || 'unknown'}:`, err.message);
  });
});

// ============================================================================
// START SERVER
// ============================================================================
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ██████╗██╗      █████╗ ██╗    ██╗██████╗                ║
║    ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗               ║
║    ██║     ██║     ███████║██║ █╗ ██║██║  ██║               ║
║    ██║     ██║     ██╔══██║██║███╗██║██║  ██║               ║
║    ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝               ║
║     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝╚═════╝               ║
║                     ██████╗██╗████████╗██╗   ██╗            ║
║                    ██╔════╝██║╚══██╔══╝╚██╗ ██╔╝            ║
║                    ██║     ██║   ██║    ╚████╔╝             ║
║                    ██║     ██║   ██║     ╚██╔╝              ║
║                    ╚██████╗██║   ██║      ██║               ║
║                     ╚═════╝╚═╝   ╚═╝      ╚═╝               ║
║                                                              ║
║           Text-Command MMORPG - Server Running               ║
║           Port: ${String(PORT).padEnd(41)}║
║           http://localhost:${String(PORT).padEnd(33)}║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
