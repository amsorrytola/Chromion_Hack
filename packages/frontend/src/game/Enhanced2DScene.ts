import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameRegistry } from './GameRegistry';
import { useGame } from '../contexts/GameContext';
import { LEVELS, getLevel, getNextLevel, LevelConfig } from './levels/LevelData';
import { LevelRenderer } from './levels/LevelRenderer';
import { LevelManager } from './levels/LevelManager';

// Enhanced 2D scene with 3-level progression system
export class Enhanced2DScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private loot!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;
  
  // Level system
  private levelRenderer!: LevelRenderer;
  private levelManager!: LevelManager;
  private currentLevelId: number = 1;
  
  // UI
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private uiContainer!: Phaser.GameObjects.Container;
  private healthBar!: Phaser.GameObjects.Graphics;
  private manaBar!: Phaser.GameObjects.Graphics;
  private levelInfoText!: Phaser.GameObjects.Text;
  
  // Game state
  private playerStats = {
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    level: 1,
    experience: 0
  };

  private debugMode = false;
  private debugText!: Phaser.GameObjects.Text;
  private miniMap!: Phaser.GameObjects.Graphics;
  private miniMapObjects: any[] = [];
  private combatCooldown = false;

  constructor() {
    super({ key: 'Enhanced2DScene' });
  }

  preload() {
    // Initialize level system
    const initialLevel = getLevel(this.currentLevelId)!;
    this.levelRenderer = new LevelRenderer(this);
    this.levelManager = new LevelManager(this, initialLevel);
    
    // Create sprites for the current level
    this.levelRenderer.createSprites(initialLevel);
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
    this.createPlayer();
    this.createEnemies();
    this.createLoot();
    
    // Setup controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as any;
    
    // Setup camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBounds(0, 0, bounds.width, bounds.height);
    
    // Create UI camera
    this.uiCamera = this.cameras.add(0, 0, 800, 600);
    this.uiCamera.setName('ui');
    
    // Create UI container - all UI elements will go in here
    this.uiContainer = this.add.container(0, 0);
    this.uiContainer.setName('ui-container');
    
    // Create UI
    this.createUI();
    
    // Setup camera ignores after UI is created
    this.setupCameraIgnores();
    
    // Setup physics
    this.setupPhysics();
    
    // Show level intro
    this.levelManager.showLevelIntro(currentLevel);
    
    // Debug info
    console.log(`Enhanced2DScene created for Level ${currentLevel.id}: ${currentLevel.name}`);
  }

  private createEnvironment() {
    const currentLevel = this.levelManager.getCurrentLevel();
    this.walls = this.levelRenderer.renderLevel(currentLevel);
  }

  private createPlayer() {
    // Verify player texture exists before creating sprite
    if (!this.textures.exists('player-enhanced')) {
      console.error('Player texture does not exist! Cannot create player.');
      throw new Error('Player texture not found');
    }
    
    const startPos = this.levelManager.getPlayerStartPosition();
    this.player = this.physics.add.sprite(startPos.x, startPos.y, 'player-enhanced');
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(800);
    this.player.setMaxVelocity(160);
    this.player.body.setSize(24, 24);
    
    // Ensure player is always visible and on top
    this.player.setDepth(10);
    this.player.setVisible(true);
    
    // Add a subtle glow effect
    this.player.setTint(0xffffff);
    this.tweens.add({
      targets: this.player,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    console.log(`Player created at position (${startPos.x}, ${startPos.y})`);
  }

  private createEnemies() {
    this.enemies = this.physics.add.group();
    const currentLevel = this.levelManager.getCurrentLevel();
    this.levelRenderer.spawnEnemies(currentLevel, this.enemies);
  }

  private createLoot() {
    this.loot = this.physics.add.group();
    const currentLevel = this.levelManager.getCurrentLevel();
    this.levelRenderer.spawnLoot(currentLevel, this.loot);
  }

  private createUI() {
    // Clear any existing UI elements from the container
    this.uiContainer.removeAll(true);
    
    // Remove any existing UI elements with the same names to prevent duplicates
    const existingUIElements = [
      'healthBar', 'manaBar', 'controlsText', 'levelInfoText', 
      'statsText', 'enemiesText', 'miniMap', 'miniMapLabel', 
      'debugText', 'f1Instruction'
    ];
    
    existingUIElements.forEach(name => {
      const existing = this.children.getByName(name);
      if (existing) {
        existing.destroy();
      }
    });
    
    // Health bar
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(100);
    this.healthBar.setName('healthBar');
    this.uiContainer.add(this.healthBar);
    this.updateHealthBar();
    
    // Mana bar
    this.manaBar = this.add.graphics();
    this.manaBar.setScrollFactor(0);
    this.manaBar.setDepth(100);
    this.manaBar.setName('manaBar');
    this.uiContainer.add(this.manaBar);
    this.updateManaBar();
    
    // Controls instructions
    const controlsText = this.add.text(20, 80, 
      'Controls: WASD or Arrow Keys to Move\nDefeat enemies and collect loot!', 
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 }
      }
    );
    controlsText.setScrollFactor(0);
    controlsText.setAlpha(0.8);
    controlsText.setDepth(100);
    controlsText.setName('controlsText');
    this.uiContainer.add(controlsText);
    
    // Level info display
    const currentLevel = this.levelManager.getCurrentLevel();
    this.levelInfoText = this.add.text(20, 140, 
      `Level ${currentLevel.id}: ${currentLevel.name}`, 
      {
        fontSize: '14px',
        color: '#FFD700',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }
    );
    this.levelInfoText.setScrollFactor(0);
    this.levelInfoText.setDepth(100);
    this.levelInfoText.setName('levelInfoText');
    this.uiContainer.add(this.levelInfoText);
    
    // Stats display
    const statsText = this.add.text(20, 170, 
      `Player Level: ${this.playerStats.level} | XP: ${this.playerStats.experience}`, 
      {
        fontSize: '12px',
        color: '#ffff00',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }
    );
    statsText.setScrollFactor(0);
    statsText.setDepth(100);
    statsText.setName('statsText');
    this.uiContainer.add(statsText);
    
    // Enemies remaining display
    const enemiesText = this.add.text(20, 200, 
      `Enemies: ${this.enemies.children.size}`, 
      {
        fontSize: '12px',
        color: '#ff4444',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }
    );
    enemiesText.setScrollFactor(0);
    enemiesText.setName('enemiesText');
    enemiesText.setDepth(100);
    this.uiContainer.add(enemiesText);
    
    // Mini-map with actual world representation
    this.miniMap = this.add.graphics();
    this.miniMap.setScrollFactor(0);
    this.miniMap.setDepth(100);
    this.miniMap.setName('miniMap');
    this.uiContainer.add(this.miniMap);
    this.createMiniMap();
    
    // Add mini-map label
    const miniMapLabel = this.add.text(665, 155, 'Mini Map', {
      fontSize: '10px',
      color: '#ffffff'
    });
    miniMapLabel.setScrollFactor(0);
    miniMapLabel.setDepth(100);
    miniMapLabel.setName('miniMapLabel');
    this.uiContainer.add(miniMapLabel);
    
    // Debug text
    this.debugText = this.add.text(300, 20, '', {
      fontSize: '10px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    });
    this.debugText.setScrollFactor(0);
    this.debugText.setVisible(false);
    this.debugText.setDepth(100);
    this.debugText.setName('debugText');
    this.uiContainer.add(this.debugText);
    
    // Add F1 instruction
    const f1Instruction = this.add.text(20, 180, 'Press F1 for debug info', {
      fontSize: '10px',
      color: '#888888'
    });
    f1Instruction.setScrollFactor(0);
    f1Instruction.setDepth(100);
    f1Instruction.setName('f1Instruction');
    this.uiContainer.add(f1Instruction);
  }

  private createMiniMap() {
    const mapX = 650;
    const mapY = 20;
    const mapWidth = 130;
    const mapHeight = 130;
    
    // Clear and setup minimap background
    this.miniMap.clear();
    this.miniMap.fillStyle(0x000000, 0.8);
    this.miniMap.fillRect(mapX, mapY, mapWidth, mapHeight);
    this.miniMap.lineStyle(2, 0xffffff);
    this.miniMap.strokeRect(mapX, mapY, mapWidth, mapHeight);
    
    // Calculate scale factors based on current level
    const bounds = this.levelManager.getWorldBounds();
    const scaleX = mapWidth / bounds.width;
    const scaleY = mapHeight / bounds.height;
    
    // Draw walls on minimap
    this.walls.children.entries.forEach((wall: any) => {
      const miniX = mapX + (wall.x * scaleX);
      const miniY = mapY + (wall.y * scaleY);
      this.miniMap.fillStyle(0x808080);
      this.miniMap.fillRect(miniX - 1, miniY - 1, 2, 2);
    });
    
    // Store minimap info for updates
    this.miniMapObjects = [{
      x: mapX,
      y: mapY,
      width: mapWidth,
      height: mapHeight,
      scaleX,
      scaleY
    }];
  }

  private updateMiniMap() {
    if (this.miniMapObjects.length === 0) return;
    
    const mapInfo = this.miniMapObjects[0];
    const { x: mapX, y: mapY, width: mapWidth, height: mapHeight, scaleX, scaleY } = mapInfo;
    
    // Clear dynamic elements area
    this.miniMap.fillStyle(0x000000, 0.8);
    this.miniMap.fillRect(mapX + 2, mapY + 2, mapWidth - 4, mapHeight - 4);
    
    // Redraw walls
    this.walls.children.entries.forEach((wall: any) => {
      const miniX = mapX + (wall.x * scaleX);
      const miniY = mapY + (wall.y * scaleY);
      this.miniMap.fillStyle(0x808080);
      this.miniMap.fillRect(miniX - 1, miniY - 1, 2, 2);
    });
    
    // Draw player
    const playerMiniX = mapX + (this.player.x * scaleX);
    const playerMiniY = mapY + (this.player.y * scaleY);
    this.miniMap.fillStyle(0x00ff00); // Green for player
    this.miniMap.fillCircle(playerMiniX, playerMiniY, 3);
    
    // Draw enemies
    this.enemies.children.entries.forEach((enemy: any) => {
      const enemyMiniX = mapX + (enemy.x * scaleX);
      const enemyMiniY = mapY + (enemy.y * scaleY);
      this.miniMap.fillStyle(0xff0000); // Red for enemies
      this.miniMap.fillCircle(enemyMiniX, enemyMiniY, 2);
    });
    
    // Draw loot
    this.loot.children.entries.forEach((loot: any) => {
      const lootMiniX = mapX + (loot.x * scaleX);
      const lootMiniY = mapY + (loot.y * scaleY);
      this.miniMap.fillStyle(0xffff00); // Yellow for loot
      this.miniMap.fillCircle(lootMiniX, lootMiniY, 2);
    });
    
    // Draw border
    this.miniMap.lineStyle(2, 0xffffff);
    this.miniMap.strokeRect(mapX, mapY, mapWidth, mapHeight);
  }

  private setupPhysics() {
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    
    this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
      this.handleCombat(enemy as Phaser.Physics.Arcade.Sprite);
    });
    
    this.physics.add.overlap(this.player, this.loot, (player, loot) => {
      this.collectLoot(loot as Phaser.Physics.Arcade.Sprite);
    });
  }

  private handleCombat(enemy: Phaser.Physics.Arcade.Sprite) {
    // Prevent multiple combat triggers and check cooldowns
    if (enemy.getData('inCombat') || this.combatCooldown) return;
    
    const currentTime = this.time.now;
    const lastCombat = enemy.getData('combatCooldown') || 0;
    
    if (currentTime - lastCombat < 1000) return; // 1 second cooldown
    
    enemy.setData('inCombat', true);
    enemy.setData('combatCooldown', currentTime);
    this.combatCooldown = true;
    
    // Push player away from enemy
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    this.player.setVelocity(
      Math.cos(angle) * 150,
      Math.sin(angle) * 150
    );
    
    // Player attacks enemy
    const playerDamage = Phaser.Math.Between(15, 25);
    const enemyHealth = enemy.getData('health') - playerDamage;
    enemy.setData('health', enemyHealth);
    
    // Show damage text
    this.showDamageText(enemy.x, enemy.y - 30, `-${playerDamage}`, 0xff4444);
    
    // Update enemy health bar
    this.updateEnemyHealthBar(enemy);
    
    if (enemyHealth <= 0) {
      // Enemy dies
      this.killEnemy(enemy);
    } else {
      // Enemy counter-attacks
      this.time.delayedCall(500, () => {
        if (enemy && enemy.active) {
          this.enemyAttack(enemy);
        }
      });
    }
    
    // Reset combat flags
    this.time.delayedCall(1500, () => {
      if (enemy && enemy.active) {
        enemy.setData('inCombat', false);
      }
      this.combatCooldown = false;
    });
  }

  private enemyAttack(enemy: Phaser.Physics.Arcade.Sprite) {
    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    if (distance > 100) return; // Too far to attack
    
    const enemyDamage = enemy.getData('damage') || 10;
    this.playerStats.health = Math.max(0, this.playerStats.health - enemyDamage);
    
    // Show damage text
    this.showDamageText(this.player.x, this.player.y - 30, `-${enemyDamage}`, 0xff0000);
    
    // Flash effect on player
    this.tweens.add({
      targets: this.player,
      tint: 0xff0000,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.player.setTint(0xffffff);
      }
    });
    
    // Screen shake
    this.cameras.main.shake(200, 0.01);
    
    this.updateHealthBar();
    
    // Check if player died
    if (this.playerStats.health <= 0) {
      this.gameOver();
    }
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    // Death effect
    this.tweens.add({
      targets: enemy,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        // Remove health bar
        const healthBar = enemy.getData('healthBar');
        if (healthBar) {
          healthBar.destroy();
        }
        enemy.destroy();
        
        // Get experience based on enemy type
        const enemyType = enemy.getData('type') || 'goblin';
        let experience = 25;
        switch (enemyType) {
          case 'orc': experience = 40; break;
          case 'skeleton': experience = 35; break;
          case 'boss': experience = 100; break;
        }
        
        this.gainExperience(experience);
        
        // Check if level is complete
        this.checkLevelCompletion();
      }
    });
    
    // Victory effect
    this.showDamageText(enemy.x, enemy.y, 'DEFEATED!', 0x00ff00);
    
    GameRegistry.events.emit('combat-victory', { experience: 25 });
  }

  private checkLevelCompletion() {
    if (this.levelManager.checkLevelCompletion(this.enemies)) {
      const currentLevel = this.levelManager.getCurrentLevel();
      this.levelManager.markLevelCompleted(currentLevel.id);
      
      // Check if there's a next level
      const nextLevel = getNextLevel(currentLevel.id);
      if (!nextLevel) {
        // Game complete! No more levels
        this.gameComplete();
      }
    }
    
    // Update enemy count display
    const enemiesText = this.getUIElement('enemiesText') as Phaser.GameObjects.Text;
    if (enemiesText) {
      enemiesText.setText(`Enemies: ${this.enemies.children.size}`);
    }
  }

  private gameComplete() {
    // Game completion screen
    const gameCompleteText = this.add.text(400, 250, 'CONGRATULATIONS!\nYou have completed the dungeon!\n\nPress R to Restart', {
      fontSize: '32px',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);
    
    // Add completion stats
    const statsText = this.add.text(400, 350, 
      `Final Level: ${this.playerStats.level}\n` +
      `Total Experience: ${this.playerStats.experience}`, {
      fontSize: '20px',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);
    
    // Add sparkle effects
    this.tweens.add({
      targets: gameCompleteText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Add restart functionality
    const restartKey = this.input.keyboard!.addKey('R');
    restartKey.on('down', () => {
      // Reset player stats before restarting
      this.resetPlayerStats();
      this.scene.restart();
    });
    
    GameRegistry.events.emit('game-complete', {
      playerLevel: this.playerStats.level,
      experience: this.playerStats.experience
    });
  }

  // Remove level transition method since this is now a single-level game
  // Game completion is handled in gameComplete() method

  private updateEnemyHealthBar(enemy: Phaser.Physics.Arcade.Sprite) {
    const healthBar = enemy.getData('healthBar');
    if (!healthBar) return;
    
    const health = enemy.getData('health');
    const maxHealth = enemy.getData('maxHealth');
    const healthPercent = health / maxHealth;
    
    healthBar.clear();
    
    // Background
    healthBar.fillStyle(0x000000);
    healthBar.fillRect(enemy.x - 16, enemy.y - 40, 32, 4);
    
    // Health fill
    if (healthPercent > 0.6) {
      healthBar.fillStyle(0x00ff00); // Green
    } else if (healthPercent > 0.3) {
      healthBar.fillStyle(0xffff00); // Yellow
    } else {
      healthBar.fillStyle(0xff0000); // Red
    }
    
    healthBar.fillRect(enemy.x - 16, enemy.y - 40, 32 * healthPercent, 4);
    
    // Border
    healthBar.lineStyle(1, 0xffffff);
    healthBar.strokeRect(enemy.x - 16, enemy.y - 40, 32, 4);
  }

  private showDamageText(x: number, y: number, text: string, color: number) {
    const damageText = this.add.text(x, y, text, {
      fontSize: '16px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: damageText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });
  }

  private gameOver() {
    // Game over screen
    const gameOverText = this.add.text(400, 300, 'GAME OVER\nPress R to Restart', {
      fontSize: '32px',
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);
    
    // Add restart functionality
    const restartKey = this.input.keyboard!.addKey('R');
    restartKey.on('down', () => {
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
      experience: 0
    };
  }

  private collectLoot(loot: Phaser.Physics.Arcade.Sprite) {
    // Collect effect
    this.tweens.add({
      targets: loot,
      x: this.player.x,
      y: this.player.y,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 300,
      onComplete: () => {
        loot.destroy();
      }
    });
    
    // Get loot type and emit appropriate event
    const lootType = loot.getData('type') || 'chest';
    let rarity = 'common';
    let name = 'Treasure Chest';
    
    switch (lootType) {
      case 'rare_chest':
        rarity = 'rare';
        name = 'Silver Chest';
        break;
      case 'legendary_chest':
        rarity = 'legendary';
        name = 'Golden Chest';
        break;
    }
    
    GameRegistry.events.emit('loot-collected', {
      type: 'equipment',
      name: name,
      rarity: rarity
    });
  }

  private gainExperience(amount: number) {
    this.playerStats.experience += amount;
    const expNeeded = this.playerStats.level * 100;
    
    if (this.playerStats.experience >= expNeeded) {
      this.levelUp();
    }
  }

  private levelUp() {
    this.playerStats.level++;
    this.playerStats.experience = 0;
    this.playerStats.maxHealth += 10;
    this.playerStats.health = this.playerStats.maxHealth;
    this.playerStats.maxMana += 5;
    this.playerStats.mana = this.playerStats.maxMana;
    
    // Level up effect
    const levelText = this.add.text(this.player.x, this.player.y - 50, 'LEVEL UP!', {
      fontSize: '24px',
      color: '#ffff00'
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: levelText,
      y: this.player.y - 100,
      alpha: 0,
      duration: 2000,
      onComplete: () => levelText.destroy()
    });
    
    this.updateUI();
    GameRegistry.events.emit('player-level-up', {
      level: this.playerStats.level,
      stats: this.playerStats
    });
  }

  private updateHealthBar() {
    this.healthBar.clear();
    // Background
    this.healthBar.fillStyle(0x333333);
    this.healthBar.fillRect(20, 20, 200, 16);
    // Health fill
    this.healthBar.fillStyle(0xff0000);
    const healthWidth = (this.playerStats.health / this.playerStats.maxHealth) * 200;
    this.healthBar.fillRect(20, 20, healthWidth, 16);
    // Border
    this.healthBar.lineStyle(1, 0xffffff);
    this.healthBar.strokeRect(20, 20, 200, 16);
    
    // Add text label if not exists
    if (!this.healthBar.getData('label')) {
      const label = this.add.text(20, 4, 'Health', {
        fontSize: '12px',
        color: '#ffffff'
      }).setScrollFactor(0);
      this.healthBar.setData('label', label);
    }
  }

  private updateManaBar() {
    this.manaBar.clear();
    // Background
    this.manaBar.fillStyle(0x333333);
    this.manaBar.fillRect(20, 45, 200, 16);
    // Mana fill
    this.manaBar.fillStyle(0x0066ff);
    const manaWidth = (this.playerStats.mana / this.playerStats.maxMana) * 200;
    this.manaBar.fillRect(20, 45, manaWidth, 16);
    // Border
    this.manaBar.lineStyle(1, 0xffffff);
    this.manaBar.strokeRect(20, 45, 200, 16);
    
    // Add text label if not exists
    if (!this.manaBar.getData('label')) {
      const label = this.add.text(20, 29, 'Mana', {
        fontSize: '12px',
        color: '#ffffff'
      }).setScrollFactor(0);
      this.manaBar.setData('label', label);
    }
  }

  private updateUI() {
    this.updateHealthBar();
    this.updateManaBar();
  }

  private setupCameraIgnores() {
    // Make main camera ignore UI container
    this.cameras.main.ignore(this.uiContainer);
    
    // Make UI camera ignore all game objects except UI container
    const gameObjects = this.children.list.filter(child => child !== this.uiContainer);
    this.uiCamera.ignore(gameObjects);
    
    console.log('Camera ignores setup:', {
      mainCameraIgnoring: 'UI container',
      uiCameraIgnoring: `${gameObjects.length} game objects`,
      uiContainerChildren: this.uiContainer.list.length
    });
  }

  private getUIElement(name: string): Phaser.GameObjects.GameObject | null {
    // Check if the element is in the UI container
    const containerChild = this.uiContainer.list.find((child: any) => child.name === name);
    if (containerChild) {
      return containerChild as Phaser.GameObjects.GameObject;
    }
    
    // Fallback to checking scene children
    return this.children.getByName(name);
  }

  update() {
    const speed = 140;
    let velocityX = 0;
    let velocityY = 0;
    
    // Check horizontal movement
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -speed;
    }
    if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = speed;
    }
    
    // Check vertical movement
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -speed;
    }
    if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = speed;
    }
    
    // Handle diagonal movement - normalize velocity
    if (velocityX !== 0 && velocityY !== 0) {
      const diagonal = speed * 0.707; // sqrt(2) / 2
      velocityX = velocityX > 0 ? diagonal : -diagonal;
      velocityY = velocityY > 0 ? diagonal : -diagonal;
    }
    
    // Apply velocity
    this.player.setVelocity(velocityX, velocityY);
    
    // Update enemy health bars
    this.enemies.children.entries.forEach((enemy: any) => {
      this.updateEnemyHealthBar(enemy);
    });
    
    // Update minimap periodically
    if (this.time.now % 200 < 20) { // Update every ~200ms
      this.updateMiniMap();
    }
    
    // Update enemy count display
    const enemiesText = this.getUIElement('enemiesText') as Phaser.GameObjects.Text;
    if (enemiesText) {
      enemiesText.setText(`Enemies: ${this.enemies.children.size}`);
    }
    
    // Update stats display
    const statsText = this.getUIElement('statsText') as Phaser.GameObjects.Text;
    if (statsText) {
      statsText.setText(`Player Level: ${this.playerStats.level} | XP: ${this.playerStats.experience}`);
    }
    
    // Update debug info
    if (this.debugMode && this.debugText) {
      const currentLevel = this.levelManager.getCurrentLevel();
      this.debugText.setText([
        `Player: (${this.player.x.toFixed(0)}, ${this.player.y.toFixed(0)})`,
        `Player Visible: ${this.player.visible}, Depth: ${this.player.depth}`,
        `Velocity: (${this.player.body.velocity.x.toFixed(0)}, ${this.player.body.velocity.y.toFixed(0)})`,
        `Input: X=${velocityX}, Y=${velocityY}`,
        `Health: ${this.playerStats.health}/${this.playerStats.maxHealth}`,
        `Level: ${this.playerStats.level} (XP: ${this.playerStats.experience})`,
        `Game Level: ${currentLevel.id} - ${currentLevel.name}`,
        `Enemies: ${this.enemies.children.size}`,
        `Walls: ${this.walls.children.size}`,
        `Loot: ${this.loot.children.size}`,
        `Camera following: ${this.cameras.main.followOffset}`,
        `Combat Cooldown: ${this.combatCooldown}`
      ].join('\n'));
    }
    
    // Toggle debug mode with F1
    const f1Key = this.input.keyboard!.addKey('F1');
    if (Phaser.Input.Keyboard.JustDown(f1Key)) {
      this.debugMode = !this.debugMode;
      this.debugText.setVisible(this.debugMode);
    }
    
    // Update UI periodically
    if (this.time.now % 100 < 20) { // Update every ~100ms
      this.updateUI();
    }
  }
}