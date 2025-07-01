import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface Enemy {
  id: string;
  x: number;
  y: number;
  type: string;
  health: number;
  maxHealth: number;
  alive: boolean;
}

interface LootItem {
  id: string;
  x: number;
  y: number;
  type: string;
  collected: boolean;
}

interface PartyGameState {
  partyId: string;
  level: number;
  enemies: Enemy[];
  loot: LootItem[];
  seed: number; // For deterministic generation
  lastUpdate: number;
}

export class GameSocketManager {
  private io: Server;
  private connectedPlayers: Map<string, Socket> = new Map();
  private partyRooms: Map<string, Set<string>> = new Map();
  private partyGameStates: Map<string, PartyGameState> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('player:join', (data: { playerId: string, wallet: string }) => {
        this.handlePlayerJoin(socket, data);
      });

      socket.on('party:join', (data: { partyId: string, playerId: string }) => {
        this.handlePartyJoin(socket, data);
      });

      socket.on('party:leave', (data: { partyId: string, playerId: string }) => {
        this.handlePartyLeave(socket, data);
      });

      socket.on('dungeon:action', (data: any) => {
        this.handleDungeonAction(socket, data);
      });

      socket.on('multiplayer:join_game', (data: { partyId: string; playerData: any }) => {
        this.handleMultiplayerJoin(socket, data);
      });

      socket.on('multiplayer:leave_game', (data: { partyId: string; playerId: string }) => {
        this.handleMultiplayerLeave(socket, data);
      });

      socket.on('chat:message', (data: { message: string, partyId?: string }) => {
        this.handleChatMessage(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handlePlayerJoin(socket: Socket, data: { playerId: string, wallet: string }): void {
    socket.data.playerId = data.playerId;
    socket.data.wallet = data.wallet;
    this.connectedPlayers.set(data.playerId, socket);
    
    socket.emit('player:joined', { success: true });
    logger.info(`Player ${data.playerId} joined game`);
  }

  private handlePartyJoin(socket: Socket, data: { partyId: string, playerId: string }): void {
    const { partyId, playerId } = data;
    
    socket.join(partyId);
    
    if (!this.partyRooms.has(partyId)) {
      this.partyRooms.set(partyId, new Set());
    }
    this.partyRooms.get(partyId)!.add(playerId);

    socket.to(partyId).emit('party:member_joined', { playerId });
    socket.emit('party:joined', { partyId, success: true });
    
    logger.info(`Player ${playerId} joined party ${partyId}`);
  }

  private handlePartyLeave(socket: Socket, data: { partyId: string, playerId: string }): void {
    const { partyId, playerId } = data;
    
    socket.leave(partyId);
    
    const partyMembers = this.partyRooms.get(partyId);
    if (partyMembers) {
      partyMembers.delete(playerId);
      if (partyMembers.size === 0) {
        this.partyRooms.delete(partyId);
      }
    }

    socket.to(partyId).emit('party:member_left', { playerId });
    socket.emit('party:left', { partyId, success: true });
    
    logger.info(`Player ${playerId} left party ${partyId}`);
  }

  private handleDungeonAction(socket: Socket, data: any): void {
    const { partyId, action, payload } = data;
    
    // Handle specific multiplayer actions
    if (action === 'player_move') {
      socket.to(partyId).emit('multiplayer:player_move', {
        playerId: socket.data.playerId,
        action,
        payload,
        timestamp: new Date()
      });
    } else if (action === 'player_action') {
      socket.to(partyId).emit('multiplayer:player_action', {
        playerId: socket.data.playerId,
        action,
        payload,
        timestamp: new Date()
      });
    } else if (action === 'enemy_damage') {
      this.handleEnemyDamage(socket, partyId, payload);
    } else if (action === 'loot_collect') {
      this.handleLootCollect(socket, partyId, payload);
    } else if (action === 'request_game_state') {
      // Send current game state to the requesting player
      const gameState = this.getPartyGameState(partyId);
      if (gameState) {
        socket.emit('multiplayer:game_state', {
          playerId: 'server',
          action: 'game_state',
          payload: gameState,
          timestamp: new Date()
        });
        logger.info(`Sent game state to ${socket.data.playerId} for party ${partyId}`);
      }
    } else {
      // Broadcast generic action to all party members
      socket.to(partyId).emit('dungeon:action', {
        playerId: socket.data.playerId,
        action,
        payload,
        timestamp: new Date()
      });
    }
  }

  private handleEnemyDamage(socket: Socket, partyId: string, payload: { enemyId: string; damage: number }): void {
    const gameState = this.partyGameStates.get(partyId);
    if (!gameState) return;

    const enemy = gameState.enemies.find(e => e.id === payload.enemyId);
    if (!enemy || !enemy.alive) return;

    enemy.health = Math.max(0, enemy.health - payload.damage);
    if (enemy.health <= 0) {
      enemy.alive = false;
    }

    gameState.lastUpdate = Date.now();

    // Broadcast enemy state update to all party members
    this.io.to(partyId).emit('multiplayer:enemy_update', {
      playerId: socket.data.playerId,
      action: 'enemy_damage',
      payload: {
        enemyId: payload.enemyId,
        health: enemy.health,
        alive: enemy.alive,
        damage: payload.damage
      },
      timestamp: new Date()
    });

    logger.info(`Enemy ${payload.enemyId} took ${payload.damage} damage in party ${partyId}`);
  }

  private handleLootCollect(socket: Socket, partyId: string, payload: { lootId: string }): void {
    const gameState = this.partyGameStates.get(partyId);
    if (!gameState) return;

    const loot = gameState.loot.find(l => l.id === payload.lootId);
    if (!loot || loot.collected) return;

    loot.collected = true;
    gameState.lastUpdate = Date.now();

    // Broadcast loot collection to all party members
    this.io.to(partyId).emit('multiplayer:loot_update', {
      playerId: socket.data.playerId,
      action: 'loot_collect',
      payload: {
        lootId: payload.lootId,
        lootType: loot.type,
        collectedBy: socket.data.playerId
      },
      timestamp: new Date()
    });

    logger.info(`Loot ${payload.lootId} collected by ${socket.data.playerId} in party ${partyId}`);
  }

  private handleMultiplayerJoin(socket: Socket, data: { partyId: string; playerData: any }): void {
    const { partyId, playerData } = data;
    
    logger.info(`Handling multiplayer join for socket ${socket.id}, playerId: ${socket.data.playerId}`);
    
    // Ensure we have a valid playerId
    if (!socket.data.playerId) {
      logger.error(`Socket ${socket.id} trying to join multiplayer game without playerId set`);
      socket.emit('error', { message: 'Must join as player first' });
      return;
    }
    
    socket.join(partyId);
    
    // Initialize or get existing game state for this party
    if (!this.partyGameStates.has(partyId)) {
      logger.info(`Creating new game state for party ${partyId}`);
      this.initializePartyGameState(partyId);
    } else {
      logger.info(`Using existing game state for party ${partyId}`);
    }
    
    // Notify other players that this player joined the game
    socket.to(partyId).emit('multiplayer:player_joined', {
      playerId: socket.data.playerId,
      action: 'player_joined',
      payload: playerData,
      timestamp: new Date()
    });
    
    // Send current game state to the joining player
    const gameState = this.getPartyGameState(partyId);
    logger.info(`Sending game state to ${socket.data.playerId}:`, {
      enemyCount: gameState?.enemies?.length || 0,
      lootCount: gameState?.loot?.length || 0,
      seed: gameState?.seed
    });
    
    socket.emit('multiplayer:game_state', {
      playerId: 'server',
      action: 'game_state',
      payload: gameState,
      timestamp: new Date()
    });
    
    logger.info(`Player ${socket.data.playerId} joined multiplayer game in party ${partyId}`);
  }

  private handleMultiplayerLeave(socket: Socket, data: { partyId: string; playerId: string }): void {
    const { partyId, playerId } = data;
    
    socket.leave(partyId);
    
    // Notify other players that this player left the game
    socket.to(partyId).emit('multiplayer:player_left', {
      playerId: socket.data.playerId,
      action: 'player_left',
      payload: { playerId },
      timestamp: new Date()
    });
    
    // Check if party is empty and cleanup game state
    const partyMembers = this.partyRooms.get(partyId);
    if (!partyMembers || partyMembers.size <= 1) {
      this.partyGameStates.delete(partyId);
      logger.info(`Cleaned up game state for empty party ${partyId}`);
    }
    
    logger.info(`Player ${playerId} left multiplayer game in party ${partyId}`);
  }

  private getPartyGameState(partyId: string): PartyGameState | null {
    return this.partyGameStates.get(partyId) || null;
  }

  private initializePartyGameState(partyId: string): void {
    const seed = Math.floor(Math.random() * 1000000);
    logger.info(`Creating game state for party ${partyId} with seed ${seed}`);
    
    const enemies = this.generateEnemies(seed);
    const loot = this.generateLoot(seed);
    
    const gameState: PartyGameState = {
      partyId,
      level: 1,
      enemies,
      loot,
      seed,
      lastUpdate: Date.now()
    };
    
    this.partyGameStates.set(partyId, gameState);
    logger.info(`Initialized game state for party ${partyId}: ${enemies.length} enemies, ${loot.length} loot items`);
  }

  private generateEnemies(seed: number): Enemy[] {
    // Use seed for deterministic enemy generation
    const enemies: Enemy[] = [];
    const rng = this.createSeededRandom(seed);
    
    // Generate 5-8 enemies for level 1
    const enemyCount = Math.floor(rng() * 4) + 5;
    
    for (let i = 0; i < enemyCount; i++) {
      const enemy = {
        id: `enemy_${i}_${seed}`,
        x: Math.floor(rng() * 700) + 50,
        y: Math.floor(rng() * 500) + 50,
        type: this.getRandomEnemyType(rng()),
        health: 30,
        maxHealth: 30,
        alive: true
      };
      enemies.push(enemy);
    }
    
    return enemies;
  }

  private generateLoot(seed: number): LootItem[] {
    const loot: LootItem[] = [];
    const rng = this.createSeededRandom(seed + 1000); // Different seed for loot
    
    // Generate 3-5 loot items
    const lootCount = Math.floor(rng() * 3) + 3;
    
    for (let i = 0; i < lootCount; i++) {
      loot.push({
        id: `loot_${i}_${seed}`,
        x: Math.floor(rng() * 700) + 50,
        y: Math.floor(rng() * 500) + 50,
        type: this.getRandomLootType(rng()),
        collected: false
      });
    }
    
    return loot;
  }

  private createSeededRandom(seed: number): () => number {
    // Simple seeded random number generator
    let m = 0x80000000; // 2**31
    let a = 1103515245;
    let c = 12345;
    seed = seed % m;
    
    return function() {
      seed = (a * seed + c) % m;
      return seed / (m - 1);
    };
  }

  private getRandomEnemyType(random: number): string {
    const types = ['goblin', 'orc', 'skeleton', 'spider'];
    return types[Math.floor(random * types.length)];
  }

  private getRandomLootType(random: number): string {
    const types = ['chest', 'potion', 'coin', 'gem'];
    return types[Math.floor(random * types.length)];
  }

  private handleChatMessage(socket: Socket, data: { message: string, partyId?: string }): void {
    const { message, partyId } = data;
    const playerId = socket.data.playerId;
    
    const chatData = {
      playerId,
      message,
      timestamp: new Date()
    };

    if (partyId) {
      // Send to all party members including sender
      this.io.to(partyId).emit('chat:message', chatData);
    } else {
      // Send to global chat including sender
      this.io.emit('chat:message', chatData);
    }
  }

  private handleDisconnect(socket: Socket): void {
    const playerId = socket.data.playerId;
    
    if (playerId) {
      this.connectedPlayers.delete(playerId);
      
      // Remove from all party rooms
      for (const [partyId, members] of this.partyRooms.entries()) {
        if (members.has(playerId)) {
          members.delete(playerId);
          socket.to(partyId).emit('party:member_disconnected', { playerId });
          
          if (members.size === 0) {
            this.partyRooms.delete(partyId);
          }
        }
      }
    }
    
    logger.info(`Client disconnected: ${socket.id}`);
  }

  // Public methods for emitting events from other parts of the application
  emitToPlayer(playerId: string, event: string, data: any): void {
    const socket = this.connectedPlayers.get(playerId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  emitToParty(partyId: string, event: string, data: any): void {
    this.io.to(partyId).emit(event, data);
  }

  emitToPartyLeader(partyId: string, event: string, data: any): void {
    // Find and emit to the party leader specifically
    // This would require storing which players are leaders
    this.io.to(partyId).emit(event, data);
  }

  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  getConnectedPlayersCount(): number {
    return this.connectedPlayers.size;
  }

  getPartyMembersCount(partyId: string): number {
    return this.partyRooms.get(partyId)?.size || 0;
  }
}
