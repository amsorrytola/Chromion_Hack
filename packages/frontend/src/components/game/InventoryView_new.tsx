import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useGame } from '../../contexts/GameContext';
import { apiService } from '../../services/api';

interface Equipment {
  id: string;
  tokenId: string;
  name: string;
  equipmentType: string;
  rarity: string;
  attackPower: number;
  defensePower: number;
  magicPower: number;
  specialAbility?: string;
  isLendable: boolean;
  lendingPrice?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface Player {
  id: string;
  wallet: string;
  username?: string;
  level: number;
  experience: number;
  isActive: boolean;
}

const InventoryView: React.FC = () => {
  const { state, actions } = useGame();
  const { address } = useAccount();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'weapons' | 'armor' | 'accessories'>('all');

  useEffect(() => {
    if (address) {
      loadInventory();
    }
  }, [address]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get or create player
      let playerResponse = await apiService.getPlayer(address!);
      if (!playerResponse.success || !playerResponse.data) {
        playerResponse = await apiService.createPlayer(address!);
      }
      
      if (playerResponse.success && playerResponse.data) {
        setPlayer(playerResponse.data);
        
        // Load equipment
        const equipmentResponse = await apiService.getPlayerEquipment(playerResponse.data.id);
        if (equipmentResponse.success && equipmentResponse.data) {
          setEquipment(equipmentResponse.data);
        }
      } else {
        setError('Failed to load player data');
      }
    } catch (err) {
      setError('Failed to load inventory');
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateLoot = async () => {
    if (!player) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.generateLoot({
        playerId: player.id,
        playerAddress: address!,
        dungeonLevel: state.dungeonData.currentFloor || 1,
        chainId: 11155111,
      });
      
      if (response.success) {
        await loadInventory();
      } else {
        setError(response.message || 'Failed to generate loot');
      }
    } catch (err) {
      setError('Failed to generate loot');
      console.error('Error generating loot:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'text-yellow-400 border-yellow-400 bg-yellow-900/10';
      case 'epic': return 'text-purple-400 border-purple-400 bg-purple-900/10';
      case 'rare': return 'text-blue-400 border-blue-400 bg-blue-900/10';
      case 'uncommon': return 'text-green-400 border-green-400 bg-green-900/10';
      default: return 'text-gray-400 border-gray-400 bg-gray-900/10';
    }
  };

  const getRarityEmoji = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return '🌟';
      case 'epic': return '💜';
      case 'rare': return '💎';
      case 'uncommon': return '🟢';
      default: return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'weapon': return '⚔️';
      case 'armor': return '🛡️';
      case 'accessory': return '💍';
      default: return '📦';
    }
  };

  const filterEquipment = (equipment: Equipment[]) => {
    switch (filter) {
      case 'weapons':
        return equipment.filter(eq => eq.equipmentType.toLowerCase() === 'weapon');
      case 'armor':
        return equipment.filter(eq => eq.equipmentType.toLowerCase() === 'armor');
      case 'accessories':
        return equipment.filter(eq => eq.equipmentType.toLowerCase() === 'accessory');
      default:
        return equipment;
    }
  };

  const getTotalStats = (equipment: Equipment[]) => {
    return equipment.reduce((total, item) => ({
      attack: total.attack + item.attackPower,
      defense: total.defense + item.defensePower,
      magic: total.magic + item.magicPower,
    }), { attack: 0, defense: 0, magic: 0 });
  };

  const backToDungeon = () => {
    // Navigate back to the game page
    window.location.href = '/game';
  };

  const filteredEquipment = filterEquipment(equipment);
  const totalStats = getTotalStats(equipment);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white text-glow">🎒 Inventory</h2>
        <div className="flex space-x-2">
          <button
            onClick={backToDungeon}
            className="game-button-secondary px-4 py-2"
          >
            ← Back to Dungeon
          </button>
          <button
            onClick={generateLoot}
            disabled={loading}
            className="game-button px-4 py-2"
          >
            {loading ? '⏳ Generating...' : '🎲 Generate Loot'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-morphism p-4 rounded-lg border border-red-500 bg-red-900/20">
          <p className="text-red-300">⚠️ {error}</p>
        </div>
      )}

      {/* Player Stats Summary */}
      {player && (
        <div className="glass-morphism p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-1">👤</div>
              <div className="text-sm text-gray-400">Level</div>
              <div className="text-lg font-bold text-white">{player.level}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1 text-red-400">⚔️</div>
              <div className="text-sm text-gray-400">Total Attack</div>
              <div className="text-lg font-bold text-red-400">{totalStats.attack}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1 text-blue-400">🛡️</div>
              <div className="text-sm text-gray-400">Total Defense</div>
              <div className="text-lg font-bold text-blue-400">{totalStats.defense}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1 text-purple-400">✨</div>
              <div className="text-sm text-gray-400">Total Magic</div>
              <div className="text-lg font-bold text-purple-400">{totalStats.magic}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="glass-morphism p-2 rounded-lg">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📦 All ({equipment.length})
          </button>
          <button
            onClick={() => setFilter('weapons')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'weapons' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⚔️ Weapons ({equipment.filter(eq => eq.equipmentType.toLowerCase() === 'weapon').length})
          </button>
          <button
            onClick={() => setFilter('armor')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'armor' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🛡️ Armor ({equipment.filter(eq => eq.equipmentType.toLowerCase() === 'armor').length})
          </button>
          <button
            onClick={() => setFilter('accessories')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'accessories' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            💍 Accessories ({equipment.filter(eq => eq.equipmentType.toLowerCase() === 'accessory').length})
          </button>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="glass-morphism p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">
          {filter === 'all' ? '🎒 All Equipment' : 
           filter === 'weapons' ? '⚔️ Weapons' :
           filter === 'armor' ? '🛡️ Armor' : '💍 Accessories'}
        </h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-300">Loading equipment...</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎒</div>
            <p className="text-gray-300 mb-4">
              {filter === 'all' ? 'No equipment found' : `No ${filter} found`}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Start adventuring to collect powerful equipment!
            </p>
            <button
              onClick={generateLoot}
              disabled={loading}
              className="game-button"
            >
              {loading ? '⏳ Generating...' : '🎲 Generate Your First Equipment'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipment.map((item) => (
              <div key={item.id} className={`p-4 rounded-lg border-2 ${getRarityColor(item.rarity)}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-2xl">{getTypeIcon(item.equipmentType)}</span>
                      <span className="text-lg">{getRarityEmoji(item.rarity)}</span>
                    </div>
                    <div className="font-bold text-white text-sm">{item.name}</div>
                    <div className={`text-xs ${getRarityColor(item.rarity).split(' ')[0]} capitalize`}>
                      {item.rarity} {item.equipmentType}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    #{item.tokenId}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400">⚔️ Attack:</span>
                    <span className="text-white font-bold">{item.attackPower}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-400">🛡️ Defense:</span>
                    <span className="text-white font-bold">{item.defensePower}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-400">✨ Magic:</span>
                    <span className="text-white font-bold">{item.magicPower}</span>
                  </div>
                </div>
                
                {item.specialAbility && (
                  <div className="mb-4">
                    <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded p-2">
                      🌟 {item.specialAbility}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                  <span>
                    {item.isLendable ? '💰 Lendable' : '🔒 Not Lendable'}
                  </span>
                  <span>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => actions.equipItem(item.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 px-3 rounded transition-colors"
                  >
                    ⚡ Equip
                  </button>
                  {item.isLendable && (
                    <button
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-2 px-3 rounded transition-colors"
                    >
                      💰 Lend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inventory Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-morphism p-4 rounded-lg text-center">
          <div className="text-3xl mb-2">🎲</div>
          <h3 className="text-lg font-bold text-white mb-2">Generate Loot</h3>
          <p className="text-sm text-gray-300 mb-3">
            Use Chainlink VRF to generate random equipment
          </p>
          <button
            onClick={generateLoot}
            disabled={loading}
            className="game-button w-full"
          >
            {loading ? '⏳ Generating...' : '🎲 Generate Equipment'}
          </button>
        </div>
        
        <div className="glass-morphism p-4 rounded-lg text-center">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="text-lg font-bold text-white mb-2">Lend Equipment</h3>
          <p className="text-sm text-gray-300 mb-3">
            Earn passive income by lending unused equipment
          </p>
          <button
            onClick={() => window.location.href = '/marketplace'}
            className="game-button-secondary w-full"
          >
            🏪 Go to Marketplace
          </button>
        </div>
        
        <div className="glass-morphism p-4 rounded-lg text-center">
          <div className="text-3xl mb-2">🔄</div>
          <h3 className="text-lg font-bold text-white mb-2">Sync Blockchain</h3>
          <p className="text-sm text-gray-300 mb-3">
            Sync your equipment with the blockchain
          </p>
          <button
            onClick={loadInventory}
            disabled={loading}
            className="game-button-secondary w-full"
          >
            {loading ? '⏳ Syncing...' : '🔄 Sync Equipment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
