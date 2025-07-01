import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { Enhanced2DScene } from './Enhanced2DScene';
import { GameRegistry } from './GameRegistry';
import { useGame } from '../contexts/GameContext';

interface PhaserGameProps {
  width?: number;
  height?: number;
  enhanced?: boolean;
}

const PhaserGame: React.FC<PhaserGameProps> = ({ 
  width = 800, 
  height = 600,
  enhanced = true 
}) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const { state, actions } = useGame();

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) return;

    // Initialize GameRegistry
    GameRegistry.init();

    // Setup event listeners for React <-> Phaser communication
    GameRegistry.events.on('combat-start', (data: any) => {
      actions.enterCombat({
        id: 'phaser-enemy',
        name: data.enemy.name,
        health: data.enemy.health,
        maxHealth: data.enemy.maxHealth,
        stats: { attack: 10, defense: 5, agility: 3 },
        lootTable: ['sword', 'potion']
      });
    });

    GameRegistry.events.on('combat-victory', (data: any) => {
      console.log('Victory! Gained experience:', data.experience);
    });

    GameRegistry.events.on('loot-collected', (data: any) => {
      console.log('Loot collected:', data);
    });

    GameRegistry.events.on('player-level-up', (data: any) => {
      console.log('Level up!', data);
    });

    // Phaser game configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: width,
      height: height,
      parent: gameRef.current,
      backgroundColor: '#1a1a2e',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: enhanced ? [Enhanced2DScene] : [GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      pixelArt: true
    };

    // Create Phaser game
    phaserGameRef.current = new Phaser.Game(config);

    // Cleanup function
    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      GameRegistry.events.removeAllListeners();
    };
  }, [actions, width, height, enhanced]);

  return (
    <div className="phaser-game-container relative">
      <div ref={gameRef} className="phaser-game border-2 border-purple-500 rounded-lg overflow-hidden" />
      
      {/* Enhanced overlay UI */}
      {/* <div className="absolute top-4 left-4 z-10 text-white bg-black bg-opacity-70 p-3 rounded-lg text-sm">
        <h3 className="font-bold mb-2 text-purple-300">🎮 Interactive Dungeon</h3>
        <div className="space-y-1 text-xs">
          <div>🏃 <strong>Move:</strong> WASD / Arrow Keys</div>
          <div>⚔️ <strong>Combat:</strong> Walk into enemies</div>
          <div>💰 <strong>Loot:</strong> Collect treasure chests</div>
          <div>🎯 <strong>Goal:</strong> Explore and level up!</div>
        </div>
      </div> */}

      {/* Performance info */}
      {/* <div className="absolute bottom-4 left-4 z-10 text-white bg-black bg-opacity-70 p-2 rounded text-xs">
        <div>🎲 Procedural dungeon generation</div>
        <div>✨ Real-time lighting & effects</div>
        <div>🤖 Smart enemy AI movement</div>
      </div> */}

      {/* Game stats overlay */}
      {/* <div className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-70 p-3 rounded-lg text-sm">
        <h3 className="font-bold mb-2 text-green-300">📊 Character</h3>
        <div className="space-y-1 text-xs">
          <div>⭐ Level: {state.player?.level || 1}</div>
          <div>❤️ Health: {state.player?.health || 100}/{state.player?.maxHealth || 100}</div>
          <div>💙 Mana: {state.player?.mana || 50}/{state.player?.maxMana || 50}</div>
          <div>🏰 Floor: {state.dungeonData.currentFloor}</div>
        </div>
      </div> */}

      {/* Features showcase */}
      {/* <div className="absolute bottom-4 right-4 z-10 text-white bg-black bg-opacity-70 p-3 rounded-lg text-sm max-w-xs">
        <h3 className="font-bold mb-2 text-yellow-300">🌟 Features</h3>
        <div className="space-y-1 text-xs">
          <div>✅ Real-time 2D exploration</div>
          <div>✅ Procedural dungeon layout</div>
          <div>✅ Dynamic enemy spawning</div>
          <div>✅ Visual effects & animations</div>
          <div>🔜 Multiplayer coming soon!</div>
        </div>
      </div> */}
    </div>
  );
};

export default PhaserGame;