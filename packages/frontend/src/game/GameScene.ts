import Phaser from 'phaser';
import { GameRegistry } from './GameRegistry';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private loot!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any; // Keyboard keys object
  
  // UI Elements
  private healthBar!: Phaser.GameObjects.Graphics;
  private manaBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private combatUI!: Phaser.GameObjects.Container;
  
  // Game state
  private playerStats = {
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    level: 1,
    experience: 0,
    strength: 10,
    defense: 8,
    agility: 12,
    intelligence: 6
  };
  
  private inCombat = false;
  private currentEnemy: Phaser.Physics.Arcade.Sprite | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Create simple colored rectangles as sprites for now
    this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    
    // We'll create colored rectangles programmatically
    this.createColoredSprites();
  }

  create() {
    // Reset player stats to ensure fresh start
    this.resetPlayerStats();
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, 1200, 800);
    
    // Create dungeon layout
    this.createDungeon();
    
    // Create player
    this.createPlayer();
    
    // Create enemies
    this.createEnemies();
    
    // Create loot
    this.createLoot();
    
    // Setup controls
    this.setupControls();
    
    // Create UI
    this.createUI();
    
    // Setup collisions
    this.setupCollisions();
    
    // Camera follows player
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1.2);
  }

  private createColoredSprites() {
    // Create colored rectangles for game objects
    const graphics = this.add.graphics();
    
    // Player (Blue)
    graphics.fillStyle(0x4A90E2);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('player-sprite', 32, 32);
    
    // Enemy (Red)
    graphics.clear();
    graphics.fillStyle(0xFF4444);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('enemy-sprite', 32, 32);
    
    // Wall (Gray)
    graphics.clear();
    graphics.fillStyle(0x555555);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('wall-sprite', 32, 32);
    
    // Loot (Gold)
    graphics.clear();
    graphics.fillStyle(0xFFD700);
    graphics.fillCircle(16, 16, 12);
    graphics.generateTexture('loot-sprite', 32, 32);
    
    // Floor (Dark Gray)
    graphics.clear();
    graphics.fillStyle(0x222222);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('floor-sprite', 32, 32);
    
    graphics.destroy();
  }

  private createDungeon() {
    this.walls = this.physics.add.staticGroup();
    
    // Create a simple dungeon layout
    const dungeon = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,0,1,0,1,1,0,0,1],
      [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1],
      [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1,0,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,0,1,1,0,1],
      [1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,1],
      [1,1,0,1,0,1,1,0,1,1,1,1,1,0,1,1,0,1,0,1,0,1,0,1,1],
      [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,0,1,0,1,1,0,1,1,1,1,1,1,1,0,0,1],
      [1,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
      [1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    
    // Create floor tiles and walls
    for (let y = 0; y < dungeon.length; y++) {
      for (let x = 0; x < dungeon[y].length; x++) {
        const tileX = x * 32;
        const tileY = y * 32;
        
        if (dungeon[y][x] === 1) {
          // Wall
          const wall = this.physics.add.staticSprite(tileX + 16, tileY + 16, 'wall-sprite');
          this.walls.add(wall);
        } else {
          // Floor
          this.add.sprite(tileX + 16, tileY + 16, 'floor-sprite');
        }
      }
    }
  }

  private createPlayer() {
    // Start player at a safe position
    this.player = this.physics.add.sprite(64, 64, 'player-sprite');
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(300);
    this.player.setMaxVelocity(200);
    
    // Player animations (simple color changes for now)
    this.player.setTint(0x4A90E2);
  }

  private createEnemies() {
    this.enemies = this.physics.add.group();
    
    // Add some enemies in different positions
    const enemyPositions = [
      { x: 200, y: 200 },
      { x: 400, y: 300 },
      { x: 600, y: 200 },
      { x: 300, y: 500 },
      { x: 700, y: 400 }
    ];
    
    enemyPositions.forEach(pos => {
      const enemy = this.physics.add.sprite(pos.x, pos.y, 'enemy-sprite');
      enemy.setCollideWorldBounds(true);
      enemy.setTint(0xFF4444);
      
      // Add simple AI movement
      this.tweens.add({
        targets: enemy,
        x: pos.x + Phaser.Math.Between(-50, 50),
        y: pos.y + Phaser.Math.Between(-50, 50),
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.enemies.add(enemy);
    });
  }

  private createLoot() {
    this.loot = this.physics.add.group();
    
    // Add loot items
    const lootPositions = [
      { x: 150, y: 150 },
      { x: 500, y: 250 },
      { x: 350, y: 450 },
      { x: 650, y: 350 }
    ];
    
    lootPositions.forEach(pos => {
      const lootItem = this.physics.add.sprite(pos.x, pos.y, 'loot-sprite');
      lootItem.setTint(0xFFD700);
      
      // Add floating animation
      this.tweens.add({
        targets: lootItem,
        y: pos.y - 10,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.loot.add(lootItem);
    });
  }

  private setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
  }

  private createUI() {
    // Create fixed UI elements
    const uiContainer = this.add.container(0, 0);
    uiContainer.setScrollFactor(0); // Keep UI fixed to camera
    
    // Health bar background
    const healthBg = this.add.graphics();
    healthBg.fillStyle(0x333333);
    healthBg.fillRect(20, 20, 200, 20);
    uiContainer.add(healthBg);
    
    // Health bar
    this.healthBar = this.add.graphics();
    this.updateHealthBar();
    uiContainer.add(this.healthBar);
    
    // Mana bar background
    const manaBg = this.add.graphics();
    manaBg.fillStyle(0x333333);
    manaBg.fillRect(20, 50, 200, 20);
    uiContainer.add(manaBg);
    
    // Mana bar
    this.manaBar = this.add.graphics();
    this.updateManaBar();
    uiContainer.add(this.manaBar);
    
    // Level text
    this.levelText = this.add.text(20, 80, `Level: ${this.playerStats.level}`, {
      fontSize: '16px',
      color: '#ffffff'
    });
    uiContainer.add(this.levelText);
    
    // Instructions
    const instructions = this.add.text(20, 110, 'WASD/Arrow Keys: Move\nSpace: Attack\nEnter: Use Item', {
      fontSize: '12px',
      color: '#cccccc'
    });
    uiContainer.add(instructions);
    
    // Combat UI (initially hidden)
    this.createCombatUI();
  }

  private createCombatUI() {
    this.combatUI = this.add.container(400, 300);
    this.combatUI.setScrollFactor(0);
    this.combatUI.setVisible(false);
    
    // Combat background
    const combatBg = this.add.graphics();
    combatBg.fillStyle(0x000000, 0.8);
    combatBg.fillRect(-200, -100, 400, 200);
    combatBg.lineStyle(2, 0xffffff);
    combatBg.strokeRect(-200, -100, 400, 200);
    this.combatUI.add(combatBg);
    
    // Combat text
    const combatText = this.add.text(0, -50, 'COMBAT!', {
      fontSize: '24px',
      color: '#ff4444'
    }).setOrigin(0.5);
    this.combatUI.add(combatText);
    
    // Action buttons
    const attackBtn = this.add.text(-50, 20, 'Attack (Space)', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#444444',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive();
    
    attackBtn.on('pointerdown', () => this.performAttack());
    this.combatUI.add(attackBtn);
    
    const fleeBtn = this.add.text(50, 20, 'Flee (Esc)', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#444444',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive();
    
    fleeBtn.on('pointerdown', () => this.fleeCombat());
    this.combatUI.add(fleeBtn);
  }

  private setupCollisions() {
    // Player vs walls
    this.physics.add.collider(this.player, this.walls);
    
    // Player vs enemies (start combat)
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      this.startCombat(enemy as Phaser.Physics.Arcade.Sprite);
    });
    
    // Player vs loot (collect)
    this.physics.add.overlap(this.player, this.loot, (player, loot) => {
      this.collectLoot(loot as Phaser.Physics.Arcade.Sprite);
    });
    
    // Enemies vs walls
    this.physics.add.collider(this.enemies, this.walls);
  }

  private startCombat(enemy: Phaser.Physics.Arcade.Sprite) {
    if (this.inCombat) return;
    
    this.inCombat = true;
    this.currentEnemy = enemy;
    
    // Stop player movement
    this.player.setVelocity(0);
    
    // Show combat UI
    this.combatUI.setVisible(true);
    
    // Pause enemy tweens
    this.tweens.killTweensOf(enemy);
    
    // Add combat input handlers
    this.input.keyboard.on('keydown-SPACE', this.performAttack, this);
    this.input.keyboard.on('keydown-ESC', this.fleeCombat, this);
    
    // Notify game context
    GameRegistry.events.emit('combat-start', {
      enemy: {
        name: 'Dungeon Monster',
        health: 30,
        maxHealth: 30
      }
    });
  }

  private performAttack() {
    if (!this.inCombat || !this.currentEnemy) return;
    
    // Calculate damage
    const damage = Phaser.Math.Between(8, 15);
    
    // Visual feedback
    this.currentEnemy.setTint(0xffaaaa);
    this.time.delayedCall(200, () => {
      if (this.currentEnemy) {
        this.currentEnemy.setTint(0xff4444);
      }
    });
    
    // Check if enemy is defeated
    if (Math.random() > 0.3) { // 70% chance to defeat for demo
      this.defeatEnemy();
    } else {
      // Enemy attacks back
      this.enemyAttack();
    }
    
    GameRegistry.events.emit('combat-action', {
      type: 'attack',
      damage: damage
    });
  }

  private enemyAttack() {
    const damage = Phaser.Math.Between(5, 10);
    this.playerStats.health = Math.max(0, this.playerStats.health - damage);
    
    // Visual feedback
    this.player.setTint(0xffaaaa);
    this.time.delayedCall(200, () => {
      this.player.setTint(0x4A90E2);
    });
    
    this.updateHealthBar();
    
    if (this.playerStats.health <= 0) {
      this.gameOver();
    }
    
    GameRegistry.events.emit('combat-action', {
      type: 'enemy-attack',
      damage: damage
    });
  }

  private defeatEnemy() {
    if (!this.currentEnemy) return;
    
    // Remove enemy
    this.currentEnemy.destroy();
    this.currentEnemy = null;
    
    // End combat
    this.endCombat();
    
    // Gain experience
    const expGain = 25;
    this.playerStats.experience += expGain;
    
    // Check level up
    const expNeeded = this.playerStats.level * 100;
    if (this.playerStats.experience >= expNeeded) {
      this.levelUp();
    }
    
    GameRegistry.events.emit('combat-victory', {
      experience: expGain
    });
  }

  private fleeCombat() {
    if (Math.random() > 0.3) { // 70% success rate
      this.endCombat();
      GameRegistry.events.emit('combat-flee', { success: true });
    } else {
      this.enemyAttack();
      GameRegistry.events.emit('combat-flee', { success: false });
    }
  }

  private endCombat() {
    this.inCombat = false;
    this.currentEnemy = null;
    this.combatUI.setVisible(false);
    
    // Remove combat input handlers
    this.input.keyboard.off('keydown-SPACE', this.performAttack, this);
    this.input.keyboard.off('keydown-ESC', this.fleeCombat, this);
  }

  private collectLoot(loot: Phaser.Physics.Arcade.Sprite) {
    // Visual feedback
    this.tweens.add({
      targets: loot,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        loot.destroy();
      }
    });
    
    // Add to inventory (notify React context)
    GameRegistry.events.emit('loot-collected', {
      type: 'equipment',
      name: 'Mysterious Item',
      rarity: 'common'
    });
  }

  private levelUp() {
    this.playerStats.level++;
    this.playerStats.experience = 0;
    this.playerStats.maxHealth += 10;
    this.playerStats.health = this.playerStats.maxHealth;
    this.playerStats.maxMana += 5;
    this.playerStats.mana = this.playerStats.maxMana;
    
    this.updateUI();
    
    // Visual effect
    this.add.text(this.player.x, this.player.y - 50, 'LEVEL UP!', {
      fontSize: '20px',
      color: '#ffff00'
    }).setOrigin(0.5);
    
    GameRegistry.events.emit('player-level-up', {
      level: this.playerStats.level,
      stats: this.playerStats
    });
  }

  private gameOver() {
    this.scene.pause();
    
    const gameOverText = this.add.text(400, 300, 'GAME OVER\nPress R to Restart', {
      fontSize: '32px',
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);
    
    this.input.keyboard.on('keydown-R', () => {
      // Reset player stats before restarting
      this.resetPlayerStats();
      this.scene.restart();
    });
  }

  private resetPlayerStats() {
    // Reset player stats to initial values
    this.playerStats = {
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
      level: 1,
      experience: 0,
      strength: 10,
      defense: 8,
      agility: 12,
      intelligence: 6
    };
  }

  private updateHealthBar() {
    this.healthBar.clear();
    this.healthBar.fillStyle(0xff0000);
    const healthWidth = (this.playerStats.health / this.playerStats.maxHealth) * 200;
    this.healthBar.fillRect(20, 20, healthWidth, 20);
  }

  private updateManaBar() {
    this.manaBar.clear();
    this.manaBar.fillStyle(0x0000ff);
    const manaWidth = (this.playerStats.mana / this.playerStats.maxMana) * 200;
    this.manaBar.fillRect(20, 50, manaWidth, 20);
  }

  private updateUI() {
    this.updateHealthBar();
    this.updateManaBar();
    this.levelText.setText(`Level: ${this.playerStats.level}`);
  }

  update() {
    if (this.inCombat) return; // Don't move during combat
    
    // Player movement
    const speed = 160;
    
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }
    
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.player.setVelocityY(speed);
    } else {
      this.player.setVelocityY(0);
    }
  }
}
