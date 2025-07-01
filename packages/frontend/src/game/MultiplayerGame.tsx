import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { MultiplayerScene } from './MultiplayerScene';
import { GameRegistry } from './GameRegistry';
import { useGame } from '../contexts/GameContext';
import { useAccount } from 'wagmi';
import { socketService } from '../services/socketService';
import type { PartyMember } from '../../../shared/src/types';

interface MultiplayerGameProps {
  width?: number;
  height?: number;
  partyId: string;
  partyMembers: PartyMember[];
}

const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ 
  width = 800, 
  height = 600,
  partyId,
  partyMembers 
}) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const { state, actions } = useGame();
  const { address } = useAccount();

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current || !address) return;

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

    // Prepare player data
    const currentPlayer = partyMembers.find(member => member.walletAddress === address);
    const playerData = {
      id: address,
      x: 0,
      y: 0,
      wallet: address,
      health: state.player?.health || 100,
      maxHealth: state.player?.maxHealth || 100,
      level: state.player?.level || 1,
      isLeader: currentPlayer?.role === 'leader'
    };

    const otherPlayersData = partyMembers
      .filter(member => member.walletAddress !== address)
      .map(member => ({
        id: member.walletAddress,
        x: 0,
        y: 0,
        wallet: member.walletAddress,
        health: 100,
        maxHealth: 100,
        level: 1,
        isLeader: member.role === 'leader'
      }));

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
          debug: false,
          debugShowBody: false,
          debugShowStaticBody: false,
          debugShowVelocity: false,
          debugVelocityColor: 0x000000,
          debugBodyColor: 0x000000,
          debugStaticBodyColor: 0x000000,
          overlapBias: 4,
          tileBias: 16
        }
      },
      scene: [
        new MultiplayerScene({
          partyId,
          playerData,
          partyMembers: [playerData, ...otherPlayersData]
        })
      ],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      pixelArt: true
    };

    // Create Phaser game
    phaserGameRef.current = new Phaser.Game(config);

    // Ensure player is joined first, then join multiplayer game
    socketService.joinGame(address, address);
    
    // Add a small delay to ensure the first player is properly initialized
    const initMultiplayer = setTimeout(() => {
      console.log('🎮 Joining multiplayer game:', { partyId, playerData });
      socketService.joinMultiplayerGame(partyId, playerData);
    }, 500);

    // Cleanup function
    return () => {
      clearTimeout(initMultiplayer);
      if (phaserGameRef.current) {
        // Leave multiplayer game
        socketService.leaveMultiplayerGame(partyId, address);
        
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      GameRegistry.events.removeAllListeners();
    };
  }, [actions, width, height, partyId, partyMembers, address, state.player]);

  return (
    <div className="multiplayer-game-container relative">
      <div ref={gameRef} className="phaser-game border-2 border-purple-500 rounded-lg overflow-hidden" />
      
      {/* Multiplayer UI overlay */}
      {/* <div className="absolute top-4 left-4 z-10 text-white bg-black bg-opacity-70 p-3 rounded-lg text-sm"> */}
        {/* <h3 className="font-bold mb-2 text-purple-300">🎮 Multiplayer Dungeon</h3> */}
        {/* <div className="space-y-1 text-xs">
          <div>🏃 <strong>Move:</strong> WASD / Arrow Keys</div>
          <div>⚔️ <strong>Combat:</strong> Walk into enemies</div>
          <div>💰 <strong>Loot:</strong> Collect treasure chests</div>
          <div>👥 <strong>Party:</strong> Real-time cooperation</div>
        </div> */}
      {/* </div> */}

      {/* Party members info */}
      <div className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-70 p-3 rounded-lg text-sm">
        <h3 className="font-bold mb-2 text-green-300">👥 Party ({partyMembers.length})</h3>
        <div className="space-y-1 text-xs">
          {partyMembers.map((member) => (
            <div key={member.walletAddress} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                member.walletAddress === address ? 'bg-green-500' : 'bg-blue-500'
              }`}></div>
              <span className={member.role === 'leader' ? 'text-yellow-400' : 'text-white'}>
                {member.role === 'leader' ? '👑' : '⚔️'} 
                {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Game stats overlay */}
      {/* <div className="absolute bottom-4 left-4 z-10 text-white bg-black bg-opacity-70 p-3 rounded-lg text-sm">
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
        <h3 className="font-bold mb-2 text-yellow-300">🌟 Multiplayer Features</h3>
        <div className="space-y-1 text-xs">
          <div>✅ Real-time party cooperation</div>
          <div>✅ Synchronized enemy encounters</div>
          <div>✅ Shared loot distribution</div>
          <div>✅ Cross-chain party support</div>
          <div>✅ Leader-coordinated exploration</div>
        </div>
      </div> */}
    </div>
  );
};

export default MultiplayerGame;
