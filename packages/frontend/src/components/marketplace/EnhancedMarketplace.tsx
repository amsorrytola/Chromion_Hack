import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { mockDataService, MockMarketplaceListing } from '../../services/mockDataService';
import LoadingSpinner from '../LoadingSpinner';

interface LendingOrder {
  id: string;
  equipment: {
    name: string;
    equipmentType: string;
    rarity: string;
    attackPower: number;
    defensePower: number;
    magicPower: number;
  };
  lender: string;
  collateralRequired: string;
  dailyRate: string;
  duration: number;
  isActive: boolean;
}

export const EnhancedMarketplace: React.FC = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [lendingOrders, setLendingOrders] = useState<LendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadMarketplaceData();
  }, [address]);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from backend API first
      try {
        const response = await fetch('/api/loot/marketplace');
        const data = await response.json();

        if (data.success && data.data.listings?.length > 0) {
          setLendingOrders(data.data.listings);
          return;
        }
      } catch (apiError) {
        console.warn('API loading failed, using mock data:', apiError);
      }

      // Fallback to mock data
      console.log('Loading mock marketplace data for development');
      const mockListings = await mockDataService.getMarketplaceListings();
      
      const convertedListings: LendingOrder[] = mockListings.map(listing => ({
        id: listing.id,
        equipment: {
          name: listing.equipment.name,
          equipmentType: listing.equipment.equipmentType,
          rarity: listing.equipment.rarity,
          attackPower: listing.equipment.attackPower,
          defensePower: listing.equipment.defensePower || 0,
          magicPower: listing.equipment.magicPower || 0,
        },
        lender: listing.lender,
        collateralRequired: listing.collateralRequired,
        dailyRate: listing.dailyRate,
        duration: listing.duration,
        isActive: listing.isActive
      }));

      setLendingOrders(convertedListings);

    } catch (err) {
      console.error('Error loading marketplace data:', err);
      setError('Failed to load marketplace data. Using mock data for development.');
      
      try {
        const mockListings = await mockDataService.getMarketplaceListings();
        const convertedListings: LendingOrder[] = mockListings.map(listing => ({
          id: listing.id,
          equipment: {
            name: listing.equipment.name,
            equipmentType: listing.equipment.equipmentType,
            rarity: listing.equipment.rarity,
            attackPower: listing.equipment.attackPower,
            defensePower: listing.equipment.defensePower || 0,
            magicPower: listing.equipment.magicPower || 0,
          },
          lender: listing.lender,
          collateralRequired: listing.collateralRequired,
          dailyRate: listing.dailyRate,
          duration: listing.duration,
          isActive: listing.isActive
        }));
        setLendingOrders(convertedListings);
        setError(null);
      } catch (mockError) {
        console.error('Failed to load mock data:', mockError);
        setLendingOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowEquipment = async (orderId: string) => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setActionLoading(`borrow-${orderId}`);
      
      // Mock borrow operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setError(null);
      alert('Equipment borrowed successfully! (Mock operation)');

    } catch (err: any) {
      console.error('Error borrowing equipment:', err);
      setError('Failed to borrow equipment');
    } finally {
      setActionLoading(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'text-gray-400 border-gray-400',
      uncommon: 'text-green-400 border-green-400',
      rare: 'text-blue-400 border-blue-400',
      epic: 'text-purple-400 border-purple-400',
      legendary: 'text-yellow-400 border-yellow-400',
      mythic: 'text-red-400 border-red-400',
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getEquipmentIcon = (type: string) => {
    const icons = {
      weapon: '⚔️',
      armor: '🛡️',
      accessory: '💍',
      consumable: '🧪',
    };
    return icons[type as keyof typeof icons] || '⚡';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 mt-4">Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">🏪 Equipment Marketplace</h2>
          <p className="text-gray-400">Lend and borrow equipment from other players</p>
        </div>
        <button
          onClick={loadMarketplaceData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
          <p className="text-yellow-400">⚠️ {error}</p>
        </div>
      )}

      {lendingOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Listings Available</h3>
          <p className="text-gray-500">Be the first to list equipment for lending!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lendingOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-gray-700 rounded-lg p-4 border-2 transition-all hover:scale-105 ${getRarityColor(order.equipment.rarity)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getEquipmentIcon(order.equipment.equipmentType)}</span>
                  <div>
                    <h3 className="font-bold text-white text-sm">{order.equipment.name}</h3>
                    <p className={`text-xs capitalize ${getRarityColor(order.equipment.rarity).split(' ')[0]}`}>
                      {order.equipment.rarity} {order.equipment.equipmentType}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="text-center">
                  <div className="text-red-400">⚔️ {order.equipment.attackPower}</div>
                  <div className="text-gray-500">ATK</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400">🛡️ {order.equipment.defensePower}</div>
                  <div className="text-gray-500">DEF</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-400">✨ {order.equipment.magicPower}</div>
                  <div className="text-gray-500">MAG</div>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Daily Rate:</span>
                  <span className="text-green-400">{order.dailyRate} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Collateral:</span>
                  <span className="text-yellow-400">{order.collateralRequired} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-blue-400">{order.duration} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lender:</span>
                  <span className="text-gray-300">{order.lender.slice(0, 6)}...{order.lender.slice(-4)}</span>
                </div>
              </div>

              {address && address.toLowerCase() !== order.lender.toLowerCase() ? (
                <button
                  onClick={() => handleBorrowEquipment(order.id)}
                  disabled={actionLoading === `borrow-${order.id}`}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {actionLoading === `borrow-${order.id}` ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Borrowing...</span>
                    </div>
                  ) : (
                    '💰 Borrow Equipment'
                  )}
                </button>
              ) : (
                <div className="text-center py-2 text-gray-400 text-sm">
                  {address?.toLowerCase() === order.lender.toLowerCase() ? 'Your Listing' : 'Connect wallet to borrow'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
        <h4 className="text-blue-400 font-semibold mb-2">Marketplace Features:</h4>
        <ul className="text-sm text-blue-300 space-y-1">
          <li>• Peer-to-peer equipment lending</li>
          <li>• Collateral-based borrowing system</li>
          <li>• Flexible lending terms and rates</li>
          <li>• Automatic returns and penalties</li>
        </ul>
      </div>
    </div>
  );
};

export default EnhancedMarketplace;
