import React from 'react';
import { EquipmentType, Rarity } from '../../../../shared/src/types';

interface FilterState {
  search: string;
  equipmentType: EquipmentType | 'all';
  rarity: Rarity | 'all';
  maxPrice: number;
  onlyAvailable: boolean;
}

interface SearchFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, onFiltersChange }) => {
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const equipmentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'weapon', label: '⚔️ Weapons' },
    { value: 'armor', label: '🛡️ Armor' },
    { value: 'accessory', label: '💍 Accessories' },
    { value: 'consumable', label: '🧪 Consumables' },
  ];

  const rarities = [
    { value: 'all', label: 'All Rarities' },
    { value: 'common', label: '⚪ Common' },
    { value: 'uncommon', label: '🟢 Uncommon' },
    { value: 'rare', label: '🔵 Rare' },
    { value: 'epic', label: '🟣 Epic' },
    { value: 'legendary', label: '🟠 Legendary' },
    { value: 'mythic', label: '🔴 Mythic' },
  ];

  return (
    <div className="glass-morphism p-6 rounded-lg h-fit">
      <h3 className="text-xl font-bold mb-6 text-white">🔍 Filters</h3>
      
      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Search Equipment
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Search by name or description..."
          className="w-full px-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Equipment Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Equipment Type
        </label>
        <select
          value={filters.equipmentType}
          onChange={(e) => handleFilterChange('equipmentType', e.target.value)}
          className="w-full px-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        >
          {equipmentTypes.map((type) => (
            <option key={type.value} value={type.value} className="bg-gray-800">
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Rarity */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Rarity
        </label>
        <select
          value={filters.rarity}
          onChange={(e) => handleFilterChange('rarity', e.target.value)}
          className="w-full px-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        >
          {rarities.map((rarity) => (
            <option key={rarity.value} value={rarity.value} className="bg-gray-800">
              {rarity.label}
            </option>
          ))}
        </select>
      </div>

      {/* Max Price */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Max Rental Fee: {filters.maxPrice} ETH
        </label>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={filters.maxPrice}
          onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0 ETH</span>
          <span>1000 ETH</span>
        </div>
      </div>

      {/* Only Available */}
      <div className="mb-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.onlyAvailable}
            onChange={(e) => handleFilterChange('onlyAvailable', e.target.checked)}
            className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
          />
          <span className="text-sm text-gray-300">Only show available items</span>
        </label>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => onFiltersChange({
          search: '',
          equipmentType: 'all',
          rarity: 'all',
          maxPrice: 1000,
          onlyAvailable: true,
        })}
        className="w-full px-4 py-2 bg-gray-600/50 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
      >
        Clear Filters
      </button>
    </div>
  );
};

export default SearchFilters;
