import { Equipment, EquipmentType, Rarity, LendingStatus } from '../../../shared/src/types';

/**
 * Utility functions for the marketplace
 */

export const formatPrice = (price: bigint | string | number): string => {
  try {
    let priceNum: number;
    
    if (typeof price === 'string') {
      // If it's a string that looks like Wei (very large number), convert from Wei
      const numPrice = parseFloat(price);
      if (numPrice >= 1e15) { // If price is >= 0.001 ETH in Wei
        priceNum = numPrice / 1e18; // Convert from Wei to ETH
      } else {
        priceNum = numPrice; // Already in ETH
      }
    } else if (typeof price === 'bigint') {
      // Convert Wei back to ETH
      priceNum = Number(price) / 1e18;
    } else {
      priceNum = price;
    }
    
    if (priceNum < 0.001) {
      return `${(priceNum * 1000).toFixed(0)} mETH`;
    }
    return `${priceNum.toFixed(3)} ETH`;
  } catch {
    return '0 ETH';
  }
};

export const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
};

export const getRarityColor = (rarity: Rarity): string => {
  const colors = {
    common: 'text-gray-400 border-gray-400',
    uncommon: 'text-green-400 border-green-400',
    rare: 'text-blue-400 border-blue-400',
    epic: 'text-purple-400 border-purple-400',
    legendary: 'text-orange-400 border-orange-400',
    mythic: 'text-red-400 border-red-400',
  };
  return colors[rarity] || colors.common;
};

export const getRarityEmoji = (rarity: Rarity): string => {
  const emojis = {
    common: '⚪',
    uncommon: '🟢',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟠',
    mythic: '🔴',
  };
  return emojis[rarity] || '⚪';
};

export const getTypeEmoji = (type: EquipmentType): string => {
  const emojis = {
    weapon: '⚔️',
    armor: '🛡️',
    accessory: '💍',
    consumable: '🧪',
  };
  return emojis[type] || '📦';
};

export const getStatusColor = (status: LendingStatus): string => {
  const colors = {
    available: 'text-green-400 bg-green-500/20 border-green-500/50',
    active: 'text-blue-400 bg-blue-500/20 border-blue-500/50',
    completed: 'text-gray-400 bg-gray-500/20 border-gray-500/50',
    defaulted: 'text-red-400 bg-red-500/20 border-red-500/50',
    cancelled: 'text-orange-400 bg-orange-500/20 border-orange-500/50',
  };
  return colors[status] || colors.available;
};

export const getStatusLabel = (status: LendingStatus): string => {
  const labels = {
    available: 'Available',
    active: 'Currently Borrowed',
    completed: 'Completed',
    defaulted: 'Defaulted',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

export const getChainName = (chainId: number): string => {
  const chains = {
    1: 'Ethereum',
    137: 'Polygon',
    42161: 'Arbitrum',
    11155111: 'Sepolia',
    80001: 'Mumbai',
  };
  return chains[chainId as keyof typeof chains] || `Chain ${chainId}`;
};

export const getChainEmoji = (chainId: number): string => {
  const emojis = {
    1: '🔷',
    137: '🟣',
    42161: '🔵',
    11155111: '🧪',
    80001: '🧪',
  };
  return emojis[chainId as keyof typeof emojis] || '⛓️';
};

export const calculateCollateralRatio = (collateral: bigint | number, rentalFee: bigint | number): number => {
  try {
    const collateralNum = typeof collateral === 'bigint' ? Number(collateral) : collateral;
    const rentalFeeNum = typeof rentalFee === 'bigint' ? Number(rentalFee) : rentalFee;
    
    if (rentalFeeNum === 0) return 0;
    return (collateralNum / rentalFeeNum) * 100;
  } catch {
    return 0;
  }
};

export const sortEquipmentByPrice = (equipment: any[], ascending = true) => {
  return [...equipment].sort((a, b) => {
    const priceA = Number(a.lendingOffer.rentalFee);
    const priceB = Number(b.lendingOffer.rentalFee);
    return ascending ? priceA - priceB : priceB - priceA;
  });
};

export const sortEquipmentByRarity = (equipment: any[], ascending = false) => {
  const rarityOrder = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    mythic: 6,
  };

  return [...equipment].sort((a, b) => {
    const rarityA = rarityOrder[a.rarity as keyof typeof rarityOrder] || 0;
    const rarityB = rarityOrder[b.rarity as keyof typeof rarityOrder] || 0;
    return ascending ? rarityA - rarityB : rarityB - rarityA;
  });
};

export const sortEquipmentByDate = (equipment: any[], ascending = false) => {
  return [...equipment].sort((a, b) => {
    const dateA = new Date(a.lendingOffer.createdAt).getTime();
    const dateB = new Date(b.lendingOffer.createdAt).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

export const validateLendingParams = (params: {
  price: number;
  collateral: number;
  duration: number;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (params.price <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (params.collateral <= 0) {
    errors.push('Collateral must be greater than 0');
  }

  if (params.duration < 3600) {
    errors.push('Duration must be at least 1 hour');
  }

  if (params.duration > 86400 * 30) {
    errors.push('Duration cannot exceed 30 days');
  }

  const collateralRatio = calculateCollateralRatio(params.collateral, params.price);
  if (collateralRatio < 110) {
    errors.push('Collateral must be at least 110% of rental fee');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
