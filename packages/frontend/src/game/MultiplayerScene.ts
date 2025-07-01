import Phaser from 'phaser';
import { GameRegistry } from './GameRegistry';
import { LEVELS, getLevel } from './levels/LevelData';
import { LevelRenderer } from './levels/LevelRenderer';
import { LevelManager } from './levels/LevelManager';
import { socketService } from '../services/socketService';

interface PlayerData {
  id: string;
  x: number;
  y: number;
  wallet: string;
  health: number;
  maxHealth: number;
  level: number;
  isLeader: boolean;
}

interface GameAction {
  type: 'move' | 'attack' | 'loot' | 'cast_spell';
  playerId: string;
  data: any;
  timestamp: number;
}

export class MultiplayerScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private otherPlayers!: Map<string, Phaser.Physics.Arcade.Sprite>;
  private playerData: PlayerData;
  private partyId: string;
  private partyMembers: PlayerData[];
  
  // Game objects
  private enemies!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private loot!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;
  
  // Level system
  private levelRenderer!: LevelRenderer;
  private levelManager!: LevelManager;
  private currentLevelId: number = 1;
  
  // Multiplayer game state
  private serverGameState: any = null;
  private enemySprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private lootSprites: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  
  // No custom UI - keep it simple
  
  // Network state
  private lastNetworkUpdate: number = 0;
  private networkUpdateInterval: number = 50; // Update every 50ms
  private actionQueue: GameAction[] = [];
  
  constructor(config: { partyId: string; playerData: PlayerData; partyMembers: PlayerData[] }) {
    super({ key: 'MultiplayerScene' });
    this.partyId = config.partyId;
    this.playerData = config.playerData;
    this.partyMembers = config.partyMembers;
    this.otherPlayers = new Map();
  }

  preload() {
    // Initialize level system
    const initialLevel = getLevel(this.currentLevelId)!;
    this.levelRenderer = new LevelRenderer(this);
    this.levelManager = new LevelManager(this, initialLevel);
    
    // Create sprites for the current level
    this.levelRenderer.createSprites(initialLevel);
    
    // Setup network listeners
    this.setupNetworkListeners();
  }

  create() {
    // Reset player stats to ensure fresh start
    this.resetPlayerStats();
    
    // Get current level
    const currentLevel = this.levelManager.getCurrentLevel();
    const bounds = this.levelManager.getWorldBounds();
    
    // Create world
    this.physics.world.setBounds(0, 0, bounds.width, bounds.height);
    this.physics.world.setFPS(60);
    
    // Create environment
    this.createEnvironment();
    this.createLocalPlayer();
    this.createOtherPlayers();
    this.createEnemies();
    this.createLoot();
    
    // Setup controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as any;
    
    // Setup camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBounds(0, 0, bounds.width, bounds.height);
    
    // Start network sync
    this.startNetworkSync();
    
    // Setup physics collisions
    this.setupCollisions();
    
    // Request initial game state if not already received
    setTimeout(() => {
      if (!this.serverGameState) {
        socketService.sendDungeonAction(this.partyId, 'request_game_state', {});
      }
    }, 1000);
  }

  private setupNetworkListeners(): void {
    socketService.on('multiplayer:player_move', (data) => {
      this.handlePlayerMove(data);
    });
    
    socketService.on('multiplayer:player_action', (data) => {
      this.handlePlayerAction(data);
    });
    
    socketService.on('multiplayer:player_joined', (data) => {
      this.handlePlayerJoined(data);
    });
    
    socketService.on('multiplayer:player_left', (data) => {
      this.handlePlayerLeft(data);
    });
    
    socketService.on('multiplayer:game_state', (data) => {
      this.handleGameStateUpdate(data);
    });
    
    socketService.on('multiplayer:enemy_update', (data) => {
      this.handleEnemyUpdate(data);
    });
    
    socketService.on('multiplayer:loot_update', (data) => {
      this.handleLootUpdate(data);
    });
  }

  private createEnvironment(): void {
    // Create level environment using the level renderer
    const currentLevel = this.levelManager.getCurrentLevel();
    this.walls = this.levelRenderer.renderLevel(currentLevel);
  }

  private createLocalPlayer(): void {
    const startPos = this.levelManager.getPlayerStartPosition();
    
    // Use existing player texture
    this.player = this.physics.add.sprite(startPos.x, startPos.y, 'player-enhanced')
      .setScale(0.8)
      .setDepth(10)
      .setTint(0x00ff00); // Green tint for local player
    
    // Set player properties
    this.player.setCollideWorldBounds(true);
    this.player.setData('playerId', this.playerData.id);
    this.player.setData('isLocal', true);
    
    // Add player name label
    const nameText = this.add.text(0, -40, this.formatPlayerName(this.playerData.wallet), {
      fontSize: '12px',
      color: '#00ff00',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5, 0.5);
    
    this.player.setData('nameText', nameText);
  }

  private createOtherPlayers(): void {
    // Create sprites for other party members
    this.partyMembers.forEach(member => {
      if (member.id !== this.playerData.id) {
        this.createOtherPlayer(member);
      }
    });
  }

  private createOtherPlayer(playerData: PlayerData): void {
    const startPos = this.levelManager.getPlayerStartPosition();
    
    // Use existing player texture
    const otherPlayer = this.physics.add.sprite(
      startPos.x + Math.random() * 100, 
      startPos.y + Math.random() * 100, 
      'player-enhanced'
    )
      .setScale(0.8)
      .setDepth(10)
      .setTint(playerData.isLeader ? 0xffd700 : 0x0080ff); // Gold for leader, blue for others
    
    otherPlayer.setCollideWorldBounds(true);
    otherPlayer.setData('playerId', playerData.id);
    otherPlayer.setData('isLocal', false);
    
    // Add player name label
    const nameText = this.add.text(0, -40, this.formatPlayerName(playerData.wallet), {
      fontSize: '12px',
      color: playerData.isLeader ? '#ffd700' : '#0080ff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5, 0.5);
    
    otherPlayer.setData('nameText', nameText);
    
    this.otherPlayers.set(playerData.id, otherPlayer);
  }

  private createEnemies(): void {
    this.enemies = this.physics.add.group();
    
    // If we have server game state, use it; otherwise generate locally
    if (this.serverGameState && this.serverGameState.enemies) {
      this.spawnEnemiesFromServer(this.serverGameState.enemies);
    } else {
      // Fallback to local generation for single player or when server state not available
      const currentLevel = this.levelManager.getCurrentLevel();
      this.levelRenderer.spawnEnemies(currentLevel, this.enemies);
    }
  }

  private createLoot(): void {
    this.loot = this.physics.add.group();
    
    // If we have server game state, use it; otherwise generate locally
    if (this.serverGameState && this.serverGameState.loot) {
      this.spawnLootFromServer(this.serverGameState.loot);
    } else {
      // Fallback to local generation for single player or when server state not available
      const currentLevel = this.levelManager.getCurrentLevel();
      this.levelRenderer.spawnLoot(currentLevel, this.loot);
    }
  }

  private createUI(): void {
    // Simple UI - just essential info
    const infoText = this.add.text(20, 20, `Multiplayer Dungeon - Level ${this.currentLevelId}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 8, y: 4 }
    });
    infoText.setScrollFactor(0);
    
    const controlsText = this.add.text(20, 50, 'WASD/Arrow Keys: Move | Walk into enemies to attack', {
      fontSize: '12px',
      color: '#cccccc',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 6, y: 3 }
    });
    controlsText.setScrollFactor(0);
  }

  private createPartyUI(): void {
    // Simple party member list
    const partyText = this.add.text(600, 20, `Party: ${this.partyMembers.length} members`, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 8, y: 4 }
    });
    partyText.setScrollFactor(0);
  }

  private setupCameraIgnores(): void {
    // Simplified - no special camera setup needed
  }

  private setupCollisions(): void {
    // Player collisions
    this.physics.add.collider(this.player, this.walls);
    
    // Other players collisions
    this.otherPlayers.forEach(player => {
      this.physics.add.collider(player, this.walls);
    });
    
    // Enemy collisions
    this.physics.add.collider(this.enemies, this.walls);
    
    // Player-enemy collisions
    this.physics.add.overlap(this.player, this.enemies, this.handleCombat, undefined, this);
    
    // Player-loot collisions
    this.physics.add.overlap(this.player, this.loot, this.handleLootCollection, undefined, this);
  }

  private startNetworkSync(): void {
    // Send initial position
    this.sendPlayerUpdate();
  }

  update(time: number, delta: number): void {
    this.handleInput();
    this.updatePlayerLabels();
    this.processActionQueue();
    
    // Network sync
    if (time - this.lastNetworkUpdate > this.networkUpdateInterval) {
      this.sendPlayerUpdate();
      this.lastNetworkUpdate = time;
    }
  }

  private handleInput(): void {
    const speed = 200;
    let moved = false;
    
    // Reset velocity
    this.player.setVelocity(0);
    
    // Handle movement
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.player.setVelocityX(-speed);
      moved = true;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.player.setVelocityX(speed);
      moved = true;
    }
    
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.player.setVelocityY(-speed);
      moved = true;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.player.setVelocityY(speed);
      moved = true;
    }
    
    // Send movement update if player moved
    if (moved) {
      this.queueAction({
        type: 'move',
        playerId: this.playerData.id,
        data: { x: this.player.x, y: this.player.y },
        timestamp: Date.now()
      });
    }
  }

  private updatePlayerLabels(): void {
    // Update local player label
    const nameText = this.player.getData('nameText');
    if (nameText) {
      nameText.setPosition(this.player.x, this.player.y - 40);
    }
    
    // Update other players' labels
    this.otherPlayers.forEach(player => {
      const nameText = player.getData('nameText');
      if (nameText) {
        nameText.setPosition(player.x, player.y - 40);
      }
    });
  }

  private queueAction(action: GameAction): void {
    this.actionQueue.push(action);
  }

  private processActionQueue(): void {
    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift()!;
      this.sendAction(action);
    }
  }

  private sendPlayerUpdate(): void {
    socketService.sendDungeonAction(this.partyId, 'player_move', {
      playerId: this.playerData.id,
      x: this.player.x,
      y: this.player.y,
      health: this.playerData.health,
      timestamp: Date.now()
    });
  }

  private sendAction(action: GameAction): void {
    socketService.sendDungeonAction(this.partyId, 'player_action', action);
  }

  // Network event handlers
  private handlePlayerMove(data: any): void {
    const { playerId, x, y } = data.payload;
    
    if (playerId === this.playerData.id) return; // Ignore own movements
    
    const otherPlayer = this.otherPlayers.get(playerId);
    if (otherPlayer) {
      // Smoothly interpolate to new position
      this.tweens.add({
        targets: otherPlayer,
        x: x,
        y: y,
        duration: this.networkUpdateInterval,
        ease: 'Linear'
      });
    }
  }

  private handlePlayerAction(data: any): void {
    const action = data.payload as GameAction;
    
    switch (action.type) {
      case 'attack':
        this.handleRemoteAttack(action);
        break;
      case 'loot':
        this.handleRemoteLoot(action);
        break;
      case 'cast_spell':
        this.handleRemoteSpell(action);
        break;
    }
  }

  private handlePlayerJoined(data: any): void {
    const playerData = data.payload as PlayerData;
    
    if (playerData.id !== this.playerData.id) {
      // Check if player already exists to avoid duplicates
      if (!this.otherPlayers.has(playerData.id)) {
        this.createOtherPlayer(playerData);
      }
    }
  }

  private handlePlayerLeft(data: any): void {
    const { playerId } = data.payload;
    const otherPlayer = this.otherPlayers.get(playerId);
    
    if (otherPlayer) {
      const nameText = otherPlayer.getData('nameText');
      if (nameText) nameText.destroy();
      otherPlayer.destroy();
      this.otherPlayers.delete(playerId);
    }
  }

  private handleGameStateUpdate(data: any): void {
    console.log('🔄 Processing game state update:', data);
    const gameState = data.payload;
    if (!gameState) {
      console.log('❌ No game state payload found');
      return;
    }
    
    console.log('📊 Game state details:', {
      enemies: gameState.enemies?.length || 0,
      loot: gameState.loot?.length || 0,
      seed: gameState.seed
    });
    
    this.serverGameState = gameState;
    
    // Clear locally generated enemies and loot, replace with server state
    this.enemies.clear(true, true); // Remove all existing enemies
    this.loot.clear(true, true); // Remove all existing loot
    
    // Clear our tracking maps
    this.enemySprites.clear();
    this.lootSprites.clear();
    
    // Spawn from server state
    this.spawnEnemiesFromServer(gameState.enemies || []);
    this.spawnLootFromServer(gameState.loot || []);
    
    console.log(`✅ Spawned ${this.enemySprites.size} enemies and ${this.lootSprites.size} loot items from server`);
  }

  private handleEnemyUpdate(data: any): void {
    const { enemyId, health, alive, damage } = data.payload;
    const enemySprite = this.enemySprites.get(enemyId);
    
    if (enemySprite) {
      // Update enemy health visually
      if (!alive) {
        // Enemy died - create death effect
        const deathEffect = this.add.circle(enemySprite.x, enemySprite.y, 0, 0xff4444, 0.8);
        this.tweens.add({
          targets: deathEffect,
          radius: 25,
          alpha: 0,
          duration: 500,
          onComplete: () => deathEffect.destroy()
        });
        
        // Remove enemy sprite
        enemySprite.destroy();
        this.enemySprites.delete(enemyId);
      } else {
        // Show damage
        const damageText = this.add.text(enemySprite.x, enemySprite.y - 20, `-${damage}`, {
          fontSize: '12px',
          color: '#ff4444'
        });
        
        this.tweens.add({
          targets: damageText,
          y: enemySprite.y - 40,
          alpha: 0,
          duration: 800,
          onComplete: () => damageText.destroy()
        });
      }
    }
  }

  private handleLootUpdate(data: any): void {
    const { lootId, lootType, collectedBy } = data.payload;
    const lootSprite = this.lootSprites.get(lootId);
    
    if (lootSprite) {
      // Create collection effect
      const collectEffect = this.add.circle(lootSprite.x, lootSprite.y, 0, 0xffd700, 0.5);
      this.tweens.add({
        targets: collectEffect,
        radius: 30,
        alpha: 0,
        duration: 400,
        onComplete: () => collectEffect.destroy()
      });
      
      // Show who collected it
      const collectorText = this.add.text(lootSprite.x, lootSprite.y - 20, 
        `${lootType} collected by ${collectedBy.slice(0, 6)}...`, {
        fontSize: '10px',
        color: '#ffdd88'
      });
      
      this.tweens.add({
        targets: collectorText,
        y: lootSprite.y - 40,
        alpha: 0,
        duration: 1200,
        onComplete: () => collectorText.destroy()
      });
      
      // Remove loot sprite
      lootSprite.destroy();
      this.lootSprites.delete(lootId);
    }
  }

  private spawnEnemiesFromServer(enemies: any[]): void {
    // Spawn enemies from server state
    enemies.forEach(enemy => {
      if (!enemy.alive) return; // Don't spawn dead enemies
      
      const textureKey = `enemy-${enemy.type}`;
      
      // Verify texture exists before creating sprite
      if (!this.textures.exists(textureKey)) {
        console.error(`Enemy texture ${textureKey} does not exist! Using default enemy-goblin`);
        const enemySprite = this.physics.add.sprite(enemy.x, enemy.y, 'enemy-goblin')
          .setScale(0.6)
          .setDepth(5)
          .setTint(0xff4444);
        
        enemySprite.setData('enemyId', enemy.id);
        enemySprite.setData('health', enemy.health);
        enemySprite.setData('maxHealth', enemy.maxHealth);
        
        this.enemies.add(enemySprite);
        this.enemySprites.set(enemy.id, enemySprite);
      } else {
        const enemySprite = this.physics.add.sprite(enemy.x, enemy.y, textureKey)
          .setScale(0.6)
          .setDepth(5)
          .setTint(0xff4444);
        
        enemySprite.setData('enemyId', enemy.id);
        enemySprite.setData('health', enemy.health);
        enemySprite.setData('maxHealth', enemy.maxHealth);
        
        this.enemies.add(enemySprite);
        this.enemySprites.set(enemy.id, enemySprite);
      }
    });
  }

  private spawnLootFromServer(loot: any[]): void {
    // Spawn loot from server state
    loot.forEach(lootItem => {
      if (lootItem.collected) return; // Don't spawn collected loot
      
      let textureKey = `loot-${lootItem.type}`;
      
      // Map backend loot types to frontend texture keys
      if (lootItem.type === 'chest') textureKey = 'loot-chest';
      else if (lootItem.type === 'potion') textureKey = 'loot-chest'; // Use chest for potion
      else if (lootItem.type === 'coin') textureKey = 'loot-chest'; // Use chest for coin  
      else if (lootItem.type === 'gem') textureKey = 'loot-rare_chest'; // Use rare chest for gem
      else textureKey = 'loot-chest'; // Default fallback
      
      // Verify texture exists before creating sprite
      if (!this.textures.exists(textureKey)) {
        console.error(`Loot texture ${textureKey} does not exist! Using default loot-chest`);
        textureKey = 'loot-chest';
      }
      
      const lootSprite = this.physics.add.sprite(lootItem.x, lootItem.y, textureKey)
        .setScale(0.5)
        .setDepth(3)
        .setTint(0xffd700);
      
      lootSprite.setData('lootId', lootItem.id);
      lootSprite.setData('lootType', lootItem.type);
      
      this.loot.add(lootSprite);
      this.lootSprites.set(lootItem.id, lootSprite);
    });
  }

  // Combat and interaction handlers
  private handleCombat(player: any, enemy: any): void {
    const enemyId = enemy.getData('enemyId');
    const damage = 10; // Base damage
    
    // Send damage to server for synchronization
    socketService.sendDungeonAction(this.partyId, 'enemy_damage', {
      enemyId: enemyId,
      damage: damage
    });
  }

  private handleLootCollection(player: any, loot: any): void {
    const lootId = loot.getData('lootId');
    
    // Send loot collection to server for synchronization
    socketService.sendDungeonAction(this.partyId, 'loot_collect', {
      lootId: lootId
    });
  }

  private handleRemoteAttack(action: GameAction): void {
    // Handle attack from another player
    console.log('Remote attack:', action);
    
    // Create visual effect at attack location
    if (action.data.x && action.data.y) {
      const attackEffect = this.add.circle(action.data.x, action.data.y, 0, 0xff0000, 0.8);
      this.tweens.add({
        targets: attackEffect,
        radius: 20,
        alpha: 0,
        duration: 300,
        onComplete: () => attackEffect.destroy()
      });
    }
  }

  private handleRemoteLoot(action: GameAction): void {
    // Handle loot collection from another player
    console.log('Remote loot collection:', action);
  }

  private handleRemoteSpell(action: GameAction): void {
    // Handle spell casting from another player
    console.log('Remote spell cast:', action);
  }

  // Utility methods
  private formatPlayerName(wallet: string): string {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  }

  private resetPlayerStats(): void {
    // Reset player stats if needed
    this.playerData.health = this.playerData.maxHealth;
  }
}
