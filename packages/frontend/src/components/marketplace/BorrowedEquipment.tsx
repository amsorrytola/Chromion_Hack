import React from 'react';
import { Equipment, LendingOffer } from '../../../../shared/src/types';
import { formatPrice, formatDuration } from '../../utils/marketplaceUtils';

interface BorrowedEquipmentProps {
  borrowedItems: (Equipment & { lendingOffer: LendingOffer })[];
  loading: boolean;
  onReturn: (equipmentId: string) => void;
}

const BorrowedEquipment: React.FC<BorrowedEquipmentProps> = ({ borrowedItems, loading, onReturn }) => {
  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'text-gray-400 border-gray-400',
      uncommon: 'text-green-400 border-green-400',
      rare: 'text-blue-400 border-blue-400',
      epic: 'text-purple-400 border-purple-400',
      legendary: 'text-orange-400 border-orange-400',
      mythic: 'text-red-400 border-red-400',
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  };

  const getTypeEmoji = (type: string) => {
    const emojis = {
      weapon: '⚔️',
      armor: '🛡️',
      accessory: '💍',
      consumable: '🧪',
    };
    return emojis[type as keyof typeof emojis] || '📦';
  };

  const getTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { text: 'Expired', color: 'text-red-400', isExpired: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      const remainingHours = hours % 24;
      return { 
        text: `${days}d ${remainingHours}h remaining`, 
        color: days > 1 ? 'text-green-400' : 'text-yellow-400',
        isExpired: false
      };
    } else if (hours > 0) {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return { 
        text: `${hours}h ${minutes}m remaining`, 
        color: hours > 6 ? 'text-yellow-400' : 'text-red-400',
        isExpired: false
      };
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return { 
        text: `${minutes}m remaining`, 
        color: 'text-red-400',
        isExpired: false
      };
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-morphism p-6 rounded-lg animate-pulse">
            <div className="flex space-x-4">
              <div className="w-16 h-16 bg-gray-600 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-600 rounded w-1/3"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (borrowedItems.length === 0) {
    return (
      <div className="glass-morphism p-12 rounded-lg text-center">
        <div className="text-6xl mb-4">🤝</div>
        <h3 className="text-xl font-bold text-white mb-2">No Borrowed Equipment</h3>
        <p className="text-gray-400 mb-6">
          You haven't borrowed any equipment yet. Browse the marketplace to find gear for your adventures.
        </p>
        <button className="game-button">
          Browse Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">
          Borrowed Equipment ({borrowedItems.length})
        </h3>
        <div className="text-sm text-gray-400">
          Remember to return equipment on time to avoid penalties
        </div>
      </div>

      {borrowedItems.map((item) => {
        // Calculate end time based on the lending order creation time and duration
        const endTime = item.lendingOffer.endTime || 
          new Date(item.lendingOffer.createdAt.getTime() + (item.lendingOffer.duration * 3600 * 1000));
        const timeRemaining = getTimeRemaining(endTime);
        
        return (
          <div key={item.id} className={`game-card ${timeRemaining?.isExpired ? 'border-red-500/50' : ''}`}>
            <div className="flex space-x-4">
              {/* Equipment Icon */}
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl border-2 ${getRarityColor(item.rarity)}`}>
                {getTypeEmoji(item.equipmentType)}
              </div>

              {/* Equipment Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-bold text-white">{item.name}</h4>
                    <p className="text-gray-400 text-sm capitalize">
                      {item.equipmentType} • {item.rarity}
                    </p>
                  </div>
                  {timeRemaining && (
                    <div className={`text-sm font-medium ${timeRemaining.color}`}>
                      {timeRemaining.text}
                    </div>
                  )}
                </div>

                {item.description && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Equipment Stats */}
                <div className="flex space-x-4 mb-4">
                  {item.stats.attackPower > 0 && (
                    <div className="flex items-center space-x-1 text-red-400 text-sm">
                      <span>⚔️</span>
                      <span>{item.stats.attackPower}</span>
                    </div>
                  )}
                  {item.stats.defensePower > 0 && (
                    <div className="flex items-center space-x-1 text-blue-400 text-sm">
                      <span>🛡️</span>
                      <span>{item.stats.defensePower}</span>
                    </div>
                  )}
                  {item.stats.magicPower > 0 && (
                    <div className="flex items-center space-x-1 text-purple-400 text-sm">
                      <span>✨</span>
                      <span>{item.stats.magicPower}</span>
                    </div>
                  )}
                  {item.stats.healthBonus && (
                    <div className="flex items-center space-x-1 text-green-400 text-sm">
                      <span>❤️</span>
                      <span>+{item.stats.healthBonus}</span>
                    </div>
                  )}
                  {item.stats.manaBonus && (
                    <div className="flex items-center space-x-1 text-cyan-400 text-sm">
                      <span>💙</span>
                      <span>+{item.stats.manaBonus}</span>
                    </div>
                  )}
                </div>

                {/* Rental Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-400">Rental Fee Paid</div>
                    <div className="text-purple-400 font-bold">{formatPrice(item.lendingOffer.rentalFee)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Collateral Locked</div>
                    <div className="text-yellow-400 font-bold">{formatPrice(item.lendingOffer.collateralAmount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Borrowed On</div>
                    <div className="text-gray-300 text-sm">
                      {item.lendingOffer.startTime?.toLocaleDateString() || item.lendingOffer.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Return By</div>
                    <div className="text-gray-300 text-sm">
                      {endTime.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Durability Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Durability</span>
                    <span>{item.durability}/{item.maxDurability}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        item.durability / item.maxDurability > 0.7 ? 'bg-green-500' :
                        item.durability / item.maxDurability > 0.3 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(item.durability / item.maxDurability) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => onReturn(item.id)}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      timeRemaining?.isExpired
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {timeRemaining?.isExpired ? 'Return (Overdue)' : 'Return Equipment'}
                  </button>
                  <button className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition-colors border border-blue-600/50">
                    Extend Rental
                  </button>
                  <button className="px-4 py-2 bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 rounded-lg text-sm font-medium transition-colors border border-gray-600/50">
                    View Details
                  </button>
                </div>

                {/* Warning for overdue items */}
                {timeRemaining?.isExpired && (
                  <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-400 text-sm">
                      <span>⚠️</span>
                      <span>This item is overdue! Return it immediately to avoid additional penalties.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BorrowedEquipment;
