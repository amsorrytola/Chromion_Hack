import React, { useState, useMemo } from 'react';
import { Equipment, LendingOffer } from '../../../../shared/src/types';
import { 
  formatPrice, 
  formatDuration, 
  getRarityColor, 
  getRarityEmoji, 
  getTypeEmoji, 
  getChainName,
  getChainEmoji,
  sortEquipmentByPrice,
  sortEquipmentByRarity,
  sortEquipmentByDate
} from '../../utils/marketplaceUtils';

interface EquipmentListingProps {
  equipment: (Equipment & { lendingOffer: LendingOffer })[];
  loading: boolean;
  onBorrow: (equipmentId: string) => void;
}

type SortOption = 'price-asc' | 'price-desc' | 'rarity-desc' | 'rarity-asc' | 'date-desc' | 'date-asc';

const EquipmentListing: React.FC<EquipmentListingProps> = ({ equipment, loading, onBorrow }) => {
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  const sortedEquipment = useMemo(() => {
    switch (sortBy) {
      case 'price-asc':
        return sortEquipmentByPrice(equipment, true);
      case 'price-desc':
        return sortEquipmentByPrice(equipment, false);
      case 'rarity-asc':
        return sortEquipmentByRarity(equipment, true);
      case 'rarity-desc':
        return sortEquipmentByRarity(equipment, false);
      case 'date-asc':
        return sortEquipmentByDate(equipment, true);
      case 'date-desc':
        return sortEquipmentByDate(equipment, false);
      default:
        return equipment;
    }
  }, [equipment, sortBy]);
  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'text-gray-400 border-gray-400',
      uncommon: 'text-green-400 border-green-400',
      rare: 'text-blue-400 border-blue-400',
      epic: 'text-purple-400 border-purple-400',
      legendary: 'text-orange-400 border-orange-400',
      mythic: 'text-red-400 border-red-400',
    };
    return colors[rarity] || colors.common;
  }
  const getRarityEmoji = (rarity: string) => {
    const emojis = {
      common: '⚪',
      uncommon: '🟢',
      rare: '🔵',
      epic: '🟣',
      legendary: '🟠',
      mythic: '🔴',
    };
    return emojis[rarity] || '⚪';
  }
  const getTypeEmoji = (type: string) => {
    const emojis = {
      weapon: '⚔️',
      armor: '🛡️',
      accessory: '💍',
      consumable: '🧪',
    };
    return emojis[type] || '📦';
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
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

  if (equipment.length === 0) {
    return (
      <div className="glass-morphism p-12 rounded-lg text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-bold text-white mb-2">No Equipment Found</h3>
        <p className="text-gray-400">
          Try adjusting your filters to find equipment that matches your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">
          {equipment.length} item{equipment.length !== 1 ? 's' : ''} available
        </h3>
        <div className="flex space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1 bg-black/30 text-gray-300 rounded text-sm hover:bg-black/50 transition-colors border border-gray-600"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rarity-desc">Rarity: High to Low</option>
            <option value="rarity-asc">Rarity: Low to High</option>
          </select>
        </div>
      </div>

      {sortedEquipment.map((item) => (
        <div key={item.id} className="game-card hover:scale-[1.02] transition-transform">
          <div className="flex space-x-4">
            {/* Equipment Icon/Image */}
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl border-2 ${getRarityColor(item.rarity)}`}>
              {getTypeEmoji(item.equipmentType)}
            </div>

            {/* Equipment Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>{item.name}</span>
                    <span className="text-sm">{getRarityEmoji(item.rarity)}</span>
                  </h4>
                  <p className="text-gray-400 text-sm capitalize">
                    {item.equipmentType} • {item.rarity}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-400">
                    {formatPrice(item.lendingOffer.rentalFee)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDuration(item.lendingOffer.duration * 3600)}
                  </div>
                </div>
              </div>

              {item.description && (
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                  {item.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex space-x-4 mb-3">
                {item.stats.attackPower > 0 && (
                  <div className="flex items-center space-x-1 text-red-400">
                    <span>⚔️</span>
                    <span className="text-sm">{item.stats.attackPower}</span>
                  </div>
                )}
                {item.stats.defensePower > 0 && (
                  <div className="flex items-center space-x-1 text-blue-400">
                    <span>🛡️</span>
                    <span className="text-sm">{item.stats.defensePower}</span>
                  </div>
                )}
                {item.stats.magicPower > 0 && (
                  <div className="flex items-center space-x-1 text-purple-400">
                    <span>✨</span>
                    <span className="text-sm">{item.stats.magicPower}</span>
                  </div>
                )}
                {item.stats.healthBonus && (
                  <div className="flex items-center space-x-1 text-green-400">
                    <span>❤️</span>
                    <span className="text-sm">+{item.stats.healthBonus}</span>
                  </div>
                )}
                {item.stats.manaBonus && (
                  <div className="flex items-center space-x-1 text-cyan-400">
                    <span>💙</span>
                    <span className="text-sm">+{item.stats.manaBonus}</span>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <div className="flex items-center space-x-1">
                    <span>🔗</span>
                    <span>{getChainName(item.chainId)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>🔧</span>
                    <span>{item.durability}/{item.maxDurability}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>💰</span>
                    <span>Collateral: {formatPrice(item.lendingOffer.collateralAmount)}</span>
                  </div>
                </div>

                <button
                  onClick={() => onBorrow(item.id)}
                  disabled={item.lendingOffer.status !== 'active'}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    item.lendingOffer.status === 'active'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {item.lendingOffer.status === 'active' ? 'Borrow' : 
                   item.lendingOffer.status === 'borrowed' ? 'Currently Borrowed' : 'Unavailable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EquipmentListing;
