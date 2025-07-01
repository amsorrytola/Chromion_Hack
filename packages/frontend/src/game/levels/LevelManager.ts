import Phaser from 'phaser';
import { LevelConfig } from './LevelData';

export class LevelManager {
  private scene: Phaser.Scene;
  private currentLevel: LevelConfig;
  private completedLevels: Set<number> = new Set();

  constructor(scene: Phaser.Scene, initialLevel: LevelConfig) {
    this.scene = scene;
    this.currentLevel = initialLevel;
  }

  getCurrentLevel(): LevelConfig {
    return this.currentLevel;
  }

  setCurrentLevel(level: LevelConfig): void {
    this.currentLevel = level;
  }

  markLevelCompleted(levelId: number): void {
    this.completedLevels.add(levelId);
  }

  isLevelCompleted(levelId: number): boolean {
    return this.completedLevels.has(levelId);
  }

  getCompletedLevels(): number[] {
    return Array.from(this.completedLevels);
  }

  checkLevelCompletion(enemies: Phaser.Physics.Arcade.Group): boolean {
    // Level is completed when all enemies are defeated
    return enemies.children.size === 0;
  }

  getWorldBounds(): { width: number; height: number } {
    return {
      width: this.currentLevel.width * 32,
      height: this.currentLevel.height * 32
    };
  }

  getPlayerStartPosition(): { x: number; y: number } {
    const startPos = this.currentLevel.playerStart;
    
    // Verify the start position is on a valid floor tile (0)
    const tileX = Math.floor(startPos.x / 32);
    const tileY = Math.floor(startPos.y / 32);
    
    if (this.currentLevel.map[tileY] && this.currentLevel.map[tileY][tileX] === 0) {
      return startPos;
    } else {
      // Find a safe fallback position
      console.warn(`Invalid start position (${tileX}, ${tileY}) for level ${this.currentLevel.id}, finding fallback`);
      
      for (let y = 1; y < this.currentLevel.map.length - 1; y++) {
        for (let x = 1; x < this.currentLevel.map[y].length - 1; x++) {
          if (this.currentLevel.map[y][x] === 0) {
            return { x: x * 32 + 16, y: y * 32 + 16 };
          }
        }
      }
      
      // Ultimate fallback
      return { x: 64, y: 64 };
    }
  }

  showLevelTransition(fromLevel: number, toLevel: number, onComplete: () => void): void {
    // Create transition overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, 800, 600);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    // Create transition text
    const transitionText = this.scene.add.text(400, 250, `Level ${fromLevel} Complete!`, {
      fontSize: '32px',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const nextLevelText = this.scene.add.text(400, 300, `Entering Level ${toLevel}...`, {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const instructionText = this.scene.add.text(400, 350, 'Press SPACE to continue', {
      fontSize: '16px',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Add blinking effect to instruction
    this.scene.tweens.add({
      targets: instructionText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Handle space key to continue
    const spaceKey = this.scene.input.keyboard!.addKey('SPACE');
    const handleSpacePress = () => {
      spaceKey.off('down', handleSpacePress);
      
      // Fade out transition
      this.scene.tweens.add({
        targets: [overlay, transitionText, nextLevelText, instructionText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          transitionText.destroy();
          nextLevelText.destroy();
          instructionText.destroy();
          onComplete();
        }
      });
    };

    spaceKey.on('down', handleSpacePress);
  }

  showGameComplete(): void {
    // Create game completion overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, 800, 600);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    // Victory text with golden color
    const victoryText = this.scene.add.text(400, 200, 'GAME COMPLETE!', {
      fontSize: '48px',
      color: '#FFD700',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const congratsText = this.scene.add.text(400, 260, 'You have conquered all three levels!', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const statsText = this.scene.add.text(400, 320, 
      `Levels Completed: ${this.completedLevels.size}/3\nWell done, brave adventurer!`, {
      fontSize: '18px',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const restartText = this.scene.add.text(400, 400, 'Press R to restart the adventure', {
      fontSize: '16px',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Add celebration effects
    this.scene.tweens.add({
      targets: victoryText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.scene.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Handle restart
    const restartKey = this.scene.input.keyboard!.addKey('R');
    restartKey.on('down', () => {
      this.scene.scene.restart();
    });
  }

  showLevelIntro(level: LevelConfig): void {
    // Create intro overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, 800, 600);
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);

    // Level intro text
    const levelText = this.scene.add.text(400, 200, `Level ${level.id}`, {
      fontSize: '48px',
      color: '#FFD700',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const nameText = this.scene.add.text(400, 260, level.name, {
      fontSize: '32px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const objectiveText = this.scene.add.text(400, 320, 'Defeat all enemies to proceed', {
      fontSize: '18px',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    const startText = this.scene.add.text(400, 380, 'Press SPACE to begin', {
      fontSize: '16px',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    // Add intro effects
    this.scene.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    // Handle space key to start
    const spaceKey = this.scene.input.keyboard!.addKey('SPACE');
    const handleSpacePress = () => {
      spaceKey.off('down', handleSpacePress);
      
      // Fade out intro
      this.scene.tweens.add({
        targets: [overlay, levelText, nameText, objectiveText, startText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          levelText.destroy();
          nameText.destroy();
          objectiveText.destroy();
          startText.destroy();
        }
      });
    };

    spaceKey.on('down', handleSpacePress);
  }
}
