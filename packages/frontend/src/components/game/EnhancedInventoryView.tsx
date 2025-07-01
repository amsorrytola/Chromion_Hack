import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { mockDataService, MockEquipment } from '../../services/mockDataService';
import { blockchainService } from '../../services/blockchainServiceFrontend';
import LoadingSpinner from '../LoadingSpinner';

interface InventoryStats {
  totalItems: number;
  totalValue: string;
  rareItems: number;
  commonItems: number;
}

export const EnhancedInventoryView: React.FC = () => {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [equipment, setEquipment] = useState<MockEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MockEquipment | null>(null);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalValue: '0',
    rareItems: 0,
    commonItems: 0
  });

  // Load inventory data
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from blockchain first if on correct network
        if (address && publicClient && chainId === 11155111) {
          try {
            const realEquipment = await blockchainService.getPlayerEquipment(publicClient, chainId, address);
            
            // Convert blockchain equipment to mock format for display
            const convertedEquipment: MockEquipment[] = realEquipment.map((item: any) => ({
              tokenId: item.tokenId?.toString() || Math.random().toString(),
              name: item.name || 'Unknown Equipment',
              equipmentType: item.equipmentType || 'weapon',
              rarity: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'][item.rarity] || 'common',
              attackPower: Number(item.attackPower || 0),
              defensePower: Number(item.defensePower || 0),
              magicPower: Number(item.magicPower || 0),
              durability: Number(item.durability || 100),
              isLendable: Boolean(item.isLendable),
              attributes: item.attributes || []
            }));

            setEquipment(convertedEquipment);
          } catch (blockchainError) {
            console.warn('Failed to load from blockchain, falling back to mock data:', blockchainError);
            // Fallback to mock data
            const mockEquipment = await mockDataService.getPlayerEquipment(address || '');
            setEquipment(mockEquipment);
          }
        } else {
          // Use mock data for non-supported networks or missing wallet
          const mockEquipment = await mockDataService.getPlayerEquipment(address || '');
          setEquipment(mockEquipment);
        }

      } catch (err) {
        console.error('Failed to load inventory:', err);
        setError(err instanceof Error ? err.message : 'Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, [address, publicClient, chainId]);

  // Calculate stats whenever equipment changes
  useEffect(() => {
    const totalItems = equipment.length;
    const rareItems = equipment.filter(item => 
      ['epic', 'legendary', 'mythic'].includes(item.rarity.toLowerCase())
    ).length;
    const commonItems = totalItems - rareItems;
    const totalValue = equipment
      .reduce((sum, item) => sum + (item.attackPower + item.defensePower + item.magicPower) * 0.001, 0)
      .toFixed(4);

    setStats({
      totalItems,
      totalValue,
      rareItems,
      commonItems
    });
  }, [equipment]);

  const getRarityColor = (rarity: string) => {
    const colors = {
      'Common': 'text-gray-400 bg-gray-800',
      'Uncommon': 'text-green-400 bg-green-900/20',
      'Rare': 'text-blue-400 bg-blue-900/20',
      'Epic': 'text-purple-400 bg-purple-900/20',
      'Legendary': 'text-yellow-400 bg-yellow-900/20',
      'Mythic': 'text-red-400 bg-red-900/20'
    };
    return colors[rarity as keyof typeof colors] || colors.Common;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'weapon': '⚔️',
      'armor': '🛡️',
      'accessory': '💍',
      'consumable': '🧪'
    };
    return icons[type as keyof typeof icons] || '📦';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-8">
        <LoadingSpinner />
        <p className="text-center text-gray-400 mt-4">Loading your inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-8">
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Inventory</h3>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Data Source:</span>
          <div className="flex items-center space-x-2">
            {chainId === 11155111 ? (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm">Live Blockchain (Sepolia)</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-yellow-400 text-sm">Mock Data (Demo)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.totalItems}</div>
          <div className="text-sm text-gray-400">Total Items</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.totalValue} ETH</div>
          <div className="text-sm text-gray-400">Total Value</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">{stats.rareItems}</div>
          <div className="text-sm text-gray-400">Rare Items</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-400">{stats.commonItems}</div>
          <div className="text-sm text-gray-400">Common Items</div>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Your Equipment</h3>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
        
        {equipment.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎒</div>
            <h4 className="text-xl font-semibold text-gray-400 mb-2">Empty Inventory</h4>
            <p className="text-gray-500">
              You don't have any equipment yet. Generate some loot to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {equipment.map((item) => (
              <div
                key={item.tokenId}
                className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors border-2 border-transparent hover:border-blue-500"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl">{getTypeIcon(item.equipmentType)}</div>
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${getRarityColor(item.rarity)}`}>
                    {item.rarity}
                  </div>
                </div>
                
                <h4 className="font-semibold text-white mb-2 truncate">{item.name}</h4>
                <p className="text-sm text-gray-400 mb-3 capitalize">{item.equipmentType}</p>
                
                <div className="space-y-1 text-xs">
                  {item.attackPower > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-400">⚔️ Attack:</span>
                      <span className="text-white">{item.attackPower}</span>
                    </div>
                  )}
                  {item.defensePower > 0 && (
                    <div className="flex justify-between">
                      <span className="text-blue-400">🛡️ Defense:</span>
                      <span className="text-white">{item.defensePower}</span>
                    </div>
                  )}
                  {item.magicPower > 0 && (
                    <div className="flex justify-between">
                      <span className="text-purple-400">🔮 Magic:</span>
                      <span className="text-white">{item.magicPower}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Power Score:</span>
                    <span className="text-green-400">{item.attackPower + item.defensePower + item.magicPower}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">{selectedItem.name}</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{getTypeIcon(selectedItem.equipmentType)}</div>
                <div>
                  <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getRarityColor(selectedItem.rarity)}`}>
                    {selectedItem.rarity}
                  </div>
                  <p className="text-gray-400 text-sm mt-1 capitalize">{selectedItem.equipmentType}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-red-400 text-2xl">⚔️</div>
                  <div className="text-white font-semibold">{selectedItem.attackPower}</div>
                  <div className="text-xs text-gray-400">Attack</div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-blue-400 text-2xl">🛡️</div>
                  <div className="text-white font-semibold">{selectedItem.defensePower}</div>
                  <div className="text-xs text-gray-400">Defense</div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-purple-400 text-2xl">🔮</div>
                  <div className="text-white font-semibold">{selectedItem.magicPower}</div>
                  <div className="text-xs text-gray-400">Magic</div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Power Score:</span>
                  <span className="text-green-400 font-semibold">{selectedItem.attackPower + selectedItem.defensePower + selectedItem.magicPower}</span>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded p-3">
                <div className="text-sm text-gray-400 mb-2">Token ID:</div>
                <div className="text-white font-mono text-xs break-all">{selectedItem.tokenId}</div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    // TODO: Implement transfer functionality
                    console.log('Transfer item:', selectedItem);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                >
                  Transfer
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement marketplace listing
                    console.log('List item:', selectedItem);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                >
                  List for Rent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
