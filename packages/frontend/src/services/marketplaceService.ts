import { apiService } from './api';
import { Equipment, LendingOffer, EquipmentType, Rarity } from '../../../shared/src/types';

export interface MarketplaceListing extends Equipment {
  lendingOffer: LendingOffer;
}

export interface MarketplaceFilters {
  search?: string;
  equipmentType?: EquipmentType | 'all';
  rarity?: Rarity | 'all';
  minPrice?: number;
  maxPrice?: number;
  onlyAvailable?: boolean;
  limit?: number;
  offset?: number;
}

export interface MarketplaceData {
  listings: MarketplaceListing[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface UserListings {
  myListings: MarketplaceListing[];
  borrowedEquipment: MarketplaceListing[];
}

class MarketplaceService {
  /**
   * Convert ETH value to Wei (BigInt)
   * Handles both integer and decimal string values
   * Also handles values that are already in Wei format
   */
  private ethToWei(ethValue: string): bigint {
    const numValue = parseFloat(ethValue);
    
    // If the value is very large (>= 1e15), it's likely already in Wei
    if (numValue >= 1e15) {
      return BigInt(ethValue);
    }
    
    // Otherwise, convert from ETH to Wei
    return BigInt(Math.floor(numValue * 1e18));
  }

  /**
   * Get all marketplace listings with optional filters
   */
  async getMarketplaceListings(filters?: MarketplaceFilters): Promise<MarketplaceData> {
    try {
      const params: any = {};
      
      if (filters) {
        if (filters.equipmentType && filters.equipmentType !== 'all') {
          params.equipmentType = filters.equipmentType;
        }
        if (filters.rarity && filters.rarity !== 'all') {
          params.rarity = filters.rarity;
        }
        if (filters.minPrice !== undefined) {
          params.minPrice = filters.minPrice.toString();
        }
        if (filters.maxPrice !== undefined) {
          params.maxPrice = filters.maxPrice.toString();
        }
        if (filters.limit !== undefined) {
          params.limit = filters.limit.toString();
        }
        if (filters.offset !== undefined) {
          params.offset = filters.offset.toString();
        }
      }

      const response = await apiService.getMarketplace(params);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch marketplace data');
      }

      // Transform the backend data to match our frontend types
      const transformedListings: MarketplaceListing[] = response.data.orders.map(order => ({
        id: order.equipment.id,
        tokenId: parseInt(order.equipment.tokenId),
        name: order.equipment.name,
        description: (order.equipment as any).description || '',
        equipmentType: order.equipment.equipmentType as EquipmentType,
        rarity: order.equipment.rarity as Rarity,
        stats: {
          attackPower: order.equipment.attackPower,
          defensePower: order.equipment.defensePower,
          magicPower: order.equipment.magicPower,
        },
        durability: (order.equipment as any).durability || 100,
        maxDurability: (order.equipment as any).maxDurability || 100,
        isLendable: order.equipment.isLendable,
        ownerId: order.equipment.ownerId,
        originalOwnerId: order.equipment.ownerId,
        chainId: (order.equipment as any).chainId || 1,
        contractAddress: (order.equipment as any).contractAddress || '',
        createdAt: new Date(order.equipment.createdAt),
        lendingOffer: {
          id: order.id,
          equipmentId: order.equipmentId,
          lenderId: order.lenderId,
          borrowerId: order.borrowerId,
          collateralAmount: this.ethToWei(order.collateral),
          rentalFee: this.ethToWei(order.price),
          duration: order.duration,
          status: order.status as any,
          chainId: (order.equipment as any).chainId || 1,
          contractAddress: (order.equipment as any).contractAddress || '',
          createdAt: new Date(order.createdAt),
        }
      }));

      // Apply client-side filtering for search
      let filteredListings = transformedListings;
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredListings = transformedListings.filter(listing =>
          listing.name.toLowerCase().includes(searchTerm) ||
          (listing.description && listing.description.toLowerCase().includes(searchTerm))
        );
      }

      // Apply availability filter
      if (filters?.onlyAvailable) {
        filteredListings = filteredListings.filter(listing => 
          listing.lendingOffer.status === 'active'
        );
      }

      return {
        listings: filteredListings,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      throw error;
    }
  }

  /**
   * Get user's listings and borrowed equipment
   */
  async getUserListings(playerId: string): Promise<UserListings> {
    try {
      const [listingsResponse, borrowedResponse] = await Promise.all([
        apiService.getUserListings(playerId),
        apiService.getUserBorrowedEquipment(playerId)
      ]);

      if (!listingsResponse.success || !borrowedResponse.success) {
        throw new Error('Failed to fetch user listings');
      }

      const myListingsData = listingsResponse.data || [];
      const borrowedData = borrowedResponse.data || [];

      const transformOrder = (order: any): MarketplaceListing => ({
        id: order.equipment.id,
        tokenId: parseInt(order.equipment.tokenId),
        name: order.equipment.name,
        description: (order.equipment as any).description || '',
        equipmentType: order.equipment.equipmentType as EquipmentType,
        rarity: order.equipment.rarity as Rarity,
        stats: {
          attackPower: order.equipment.attackPower,
          defensePower: order.equipment.defensePower,
          magicPower: order.equipment.magicPower,
        },
        durability: (order.equipment as any).durability || 100,
        maxDurability: (order.equipment as any).maxDurability || 100,
        isLendable: order.equipment.isLendable,
        ownerId: order.equipment.ownerId,
        originalOwnerId: order.equipment.ownerId,
        chainId: (order.equipment as any).chainId || 1,
        contractAddress: (order.equipment as any).contractAddress || '',
        createdAt: new Date(order.equipment.createdAt),
        lendingOffer: {
          id: order.id,
          equipmentId: order.equipmentId,
          lenderId: order.lenderId,
          borrowerId: order.borrowerId,
          collateralAmount: this.ethToWei(order.collateral),
          rentalFee: this.ethToWei(order.price),
          duration: order.duration,
          status: order.status as any,
          chainId: (order.equipment as any).chainId || 1,
          contractAddress: (order.equipment as any).contractAddress || '',
          createdAt: new Date(order.createdAt),
        }
      });

      const myListings = myListingsData.map(transformOrder);
      const borrowedEquipment = borrowedData.map(transformOrder);

      return {
        myListings,
        borrowedEquipment
      };
    } catch (error) {
      console.error('Error fetching user listings:', error);
      throw error;
    }
  }

  /**
   * Create a new lending offer
   */
  async createLendingOffer(data: {
    equipmentId: string;
    lenderId: string;
    price: number;
    collateral: number;
    duration?: number;
  }): Promise<void> {
    try {
      const response = await apiService.createLendingOrder({
        equipmentId: data.equipmentId,
        lenderId: data.lenderId,
        price: data.price.toString(),
        collateral: data.collateral.toString(),
        duration: data.duration || 24
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create lending offer');
      }
    } catch (error) {
      console.error('Error creating lending offer:', error);
      throw error;
    }
  }

  /**
   * Borrow equipment
   */
  async borrowEquipment(data: {
    orderId: string;
    borrowerId: string;
    borrowerAddress: string;
  }): Promise<void> {
    try {
      const response = await apiService.borrowEquipment(data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to borrow equipment');
      }
    } catch (error) {
      console.error('Error borrowing equipment:', error);
      throw error;
    }
  }

  /**
   * Cancel a lending offer
   */
  async cancelLendingOffer(orderId: string): Promise<void> {
    try {
      const response = await apiService.updateLendingOrder(orderId, {
        status: 'cancelled'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel lending offer');
      }
    } catch (error) {
      console.error('Error canceling lending offer:', error);
      throw error;
    }
  }

  /**
   * Return borrowed equipment
   */
  async returnEquipment(orderId: string): Promise<void> {
    try {
      const response = await apiService.updateLendingOrder(orderId, {
        status: 'completed'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to return equipment');
      }
    } catch (error) {
      console.error('Error returning equipment:', error);
      throw error;
    }
  }

  /**
   * Update lending offer
   */
  async updateLendingOffer(orderId: string, updates: {
    price?: number;
    collateral?: number;
    duration?: number;
  }): Promise<void> {
    try {
      // Note: This might require backend endpoint updates to support price/collateral changes
      const response = await apiService.updateLendingOrder(orderId, updates as any);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update lending offer');
      }
    } catch (error) {
      console.error('Error updating lending offer:', error);
      throw error;
    }
  }
}

export const marketplaceService = new MarketplaceService();
