import React from 'react';
import { useGame } from '../../contexts/GameContext';

const GameMenu: React.FC = () => {
  const { actions } = useGame();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-4xl mx-auto px-6">
        {/* Logo */}
        <div className="mb-8">
          <img 
            src="/logo.png" 
            alt="Cross-Chain AI Dungeon Crawler" 
            className="mx-auto h-20 w-auto mb-6 transition-all duration-300 hover:scale-105"
            style={{ filter: 'drop-shadow(0 0 15px rgba(147, 51, 234, 0.6))' }}
          />
          <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 mx-auto rounded-full"></div>
        </div>

        {/* Welcome Message */}
        <div className="glass-morphism p-8 rounded-lg mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome, Adventurer!
          </h2>
          <p className="text-gray-300 text-lg">
            Prepare yourself for an epic journey through mysterious dungeons filled with ancient treasures and dangerous creatures.
          </p>
        </div>

        {/* Game Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={actions.startGame}
            className="game-card p-6 text-center hover:bg-green-800 transition-all duration-300 group"
          >
            <div className="text-4xl mb-4 group-hover:animate-bounce">⚔️</div>
            <h3 className="text-xl font-bold text-white mb-2">Solo Adventure</h3>
            <p className="text-gray-300 text-sm">
              Embark on a single-player journey through procedurally generated dungeons
            </p>
          </button>

          <button
            onClick={() => alert('Party system coming soon!')}
            className="game-card p-6 text-center hover:bg-blue-800 transition-all duration-300 group opacity-75"
          >
            <div className="text-4xl mb-4 group-hover:animate-bounce">👥</div>
            <h3 className="text-xl font-bold text-white mb-2">Party Mode</h3>
            <p className="text-gray-300 text-sm">
              Join forces with other players for cooperative dungeon exploration
            </p>
            <div className="mt-2 text-xs text-yellow-400">Coming Soon</div>
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-morphism p-4 rounded-lg">
            <div className="text-2xl mb-2">🌉</div>
            <h4 className="text-white font-semibold mb-1">Cross-Chain</h4>
            <p className="text-gray-400 text-sm">Play across multiple blockchains</p>
          </div>
          
          <div className="glass-morphism p-4 rounded-lg">
            <div className="text-2xl mb-2">🤖</div>
            <h4 className="text-white font-semibold mb-1">AI NPCs</h4>
            <p className="text-gray-400 text-sm">Interact with intelligent characters</p>
          </div>
          
          <div className="glass-morphism p-4 rounded-lg">
            <div className="text-2xl mb-2">💰</div>
            <h4 className="text-white font-semibold mb-1">DeFi Integration</h4>
            <p className="text-gray-400 text-sm">Lend and borrow equipment</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameMenu;
