import express from 'express';

const router = express.Router();

// ==================== CONSTANTS ====================
const COLORS = [
  '#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const ARENA_SIZE = 100;
const MAX_HEALTH = 100;
const DAMAGE = 25;
const RESPAWN_DELAY = 3000;

// ==================== GAME STATE ====================
const fpsPlayers = new Map();

// ==================== SOCKET.IO SETUP ====================
export function setupFpsSocket(io) {
  console.log('[FPS] Setting up CodeIt FPS namespace...');
  console.log('[FPS] IO object:', typeof io, io ? 'exists' : 'null');
  
  // Create a namespace for FPS game
  const fpsNamespace = io.of('/codeit-fps');
  
  console.log('[FPS] ✅ Namespace /codeit-fps created');
  console.log('[FPS] Available namespaces:', Object.keys(io._nsps || {}).join(', '));
  
  // Listen for any connection attempt
  fpsNamespace.use((socket, next) => {
    console.log('[FPS] Middleware - connection attempt from:', socket.id);
    next();
  });
  
  fpsNamespace.on('connection', (socket) => {
    console.log(`[FPS] ✅ Socket ${socket.id} CONNECTED to FPS namespace`);
    
    let currentPlayer = null;
    
    // ========== JOIN GAME ==========
    socket.on('fps:join', (data) => {
      const playerId = socket.id;
      const colorIndex = fpsPlayers.size % COLORS.length;
      
      // Random spawn position
      const spawnX = (Math.random() - 0.5) * (ARENA_SIZE - 10);
      const spawnZ = (Math.random() - 0.5) * (ARENA_SIZE - 10);
      
      currentPlayer = {
        id: playerId,
        name: data.name || 'Игрок',
        color: COLORS[colorIndex],
        x: spawnX,
        y: 1.7,
        z: spawnZ,
        rx: 0,
        ry: 0,
        crouch: false,
        health: MAX_HEALTH,
        kills: 0,
        deaths: 0,
        shooting: false,
        connected: true,
        joinedAt: Date.now()
      };
      
      fpsPlayers.set(playerId, currentPlayer);
      
      // Send player their data and all other players
      const otherPlayers = {};
      fpsPlayers.forEach((player, id) => {
        if (id !== playerId && player.connected) {
          otherPlayers[id] = player;
        }
      });
      
      socket.emit('fps:init', {
        id: playerId,
        players: otherPlayers
      });
      
      // Notify others
      socket.broadcast.emit('fps:player-joined', currentPlayer);
      
      console.log(`[FPS] ${currentPlayer.name} joined. Total players: ${fpsPlayers.size}`);
    });
    
    // ========== MOVEMENT ==========
    socket.on('fps:move', (data) => {
      if (!currentPlayer || currentPlayer.health <= 0) return;
      
      // Update position with bounds check
      currentPlayer.x = Math.max(-ARENA_SIZE/2 + 1, Math.min(ARENA_SIZE/2 - 1, data.x));
      currentPlayer.y = data.y;
      currentPlayer.z = Math.max(-ARENA_SIZE/2 + 1, Math.min(ARENA_SIZE/2 - 1, data.z));
      currentPlayer.rx = data.rx;
      currentPlayer.ry = data.ry;
      currentPlayer.crouch = data.crouch;
      
      fpsPlayers.set(socket.id, currentPlayer);
      
      // Broadcast to others
      socket.broadcast.emit('fps:player-moved', {
        id: socket.id,
        x: currentPlayer.x,
        y: currentPlayer.y,
        z: currentPlayer.z,
        rx: currentPlayer.rx,
        ry: currentPlayer.ry,
        crouch: currentPlayer.crouch
      });
    });
    
    // ========== SHOOTING ==========
    socket.on('fps:shoot', (data) => {
      if (!currentPlayer || currentPlayer.health <= 0) return;
      
      console.log(`[FPS] ${currentPlayer.name} shot, hitPlayerId: ${data.hitPlayerId}`);
      
      // Broadcast shot effect
      socket.broadcast.emit('fps:player-shot', { id: socket.id });
      
      // Check if hit someone
      if (data.hitPlayerId) {
        const targetPlayer = fpsPlayers.get(data.hitPlayerId);
        
        console.log(`[FPS] Target player found:`, targetPlayer ? targetPlayer.name : 'NOT FOUND');
        
        if (targetPlayer && targetPlayer.health > 0) {
          // Server-side distance validation (optional - max range 100)
          const dx = targetPlayer.x - currentPlayer.x;
          const dz = targetPlayer.z - currentPlayer.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          console.log(`[FPS] Distance to target: ${distance.toFixed(2)}`);
          
          if (distance <= 100) {
            targetPlayer.health -= DAMAGE;
            fpsPlayers.set(data.hitPlayerId, targetPlayer);
            
            console.log(`[FPS] HIT! ${targetPlayer.name} now has ${targetPlayer.health} HP`);
            
            // Notify hit
            fpsNamespace.emit('fps:hit', {
              shooterId: socket.id,
              shooterName: currentPlayer.name,
              targetId: data.hitPlayerId,
              targetName: targetPlayer.name,
              damage: DAMAGE
            });
            
            // Check for kill
            if (targetPlayer.health <= 0) {
              currentPlayer.kills++;
              targetPlayer.deaths++;
              fpsPlayers.set(socket.id, currentPlayer);
              fpsPlayers.set(data.hitPlayerId, targetPlayer);
              
              console.log(`[FPS] KILL! ${currentPlayer.name} killed ${targetPlayer.name}`);
              
              fpsNamespace.emit('fps:kill', {
                killerId: socket.id,
                killerName: currentPlayer.name,
                victimId: data.hitPlayerId,
                victimName: targetPlayer.name
              });
            }
          }
        }
      }
    });
    
    // ========== RESPAWN ==========
    socket.on('fps:respawn', () => {
      if (!currentPlayer) return;
      
      // Random respawn position
      currentPlayer.x = (Math.random() - 0.5) * (ARENA_SIZE - 10);
      currentPlayer.z = (Math.random() - 0.5) * (ARENA_SIZE - 10);
      currentPlayer.y = 1.7;
      currentPlayer.health = MAX_HEALTH;
      currentPlayer.crouch = false;
      
      fpsPlayers.set(socket.id, currentPlayer);
      
      fpsNamespace.emit('fps:respawn', {
        id: socket.id,
        x: currentPlayer.x,
        y: currentPlayer.y,
        z: currentPlayer.z
      });
      
      console.log(`[FPS] ${currentPlayer.name} respawned`);
    });
    
    // ========== CHAT ==========
    socket.on('fps:chat', (data) => {
      if (!currentPlayer || !data.text) return;
      
      const message = {
        id: Date.now(),
        playerId: socket.id,
        name: currentPlayer.name,
        color: currentPlayer.color,
        text: data.text.slice(0, 200),
        timestamp: Date.now()
      };
      
      fpsNamespace.emit('fps:chat', message);
    });
    
    // ========== DISCONNECT ==========
    socket.on('disconnect', () => {
      if (currentPlayer) {
        fpsPlayers.delete(socket.id);
        socket.broadcast.emit('fps:player-left', socket.id);
        console.log(`[FPS] ${currentPlayer.name} left. Total players: ${fpsPlayers.size}`);
      }
    });
  });
}

// ==================== REST API ====================
router.get('/stats', (req, res) => {
  const players = Array.from(fpsPlayers.values())
    .filter(p => p.connected)
    .map(p => ({
      name: p.name,
      color: p.color,
      kills: p.kills,
      deaths: p.deaths
    }))
    .sort((a, b) => b.kills - a.kills);
  
  res.json({
    playersOnline: players.length,
    players
  });
});

router.get('/leaderboard', (req, res) => {
  const leaderboard = Array.from(fpsPlayers.values())
    .filter(p => p.connected)
    .map(p => ({
      name: p.name,
      color: p.color,
      kills: p.kills,
      deaths: p.deaths,
      kd: p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2)
    }))
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 10);
  
  res.json(leaderboard);
});

export default router;
