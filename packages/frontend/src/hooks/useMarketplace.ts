import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { 
  marketplaceService, 
  MarketplaceListing, 
  MarketplaceFilters, 
  MarketplaceData, 
  UserListings 
} from '../services/marketplaceService';
import { EquipmentType, Rarity } from '../../../shared/src/types';

export interface UseMarketplaceState {
  // Data
  listings: MarketplaceListing[];
  myListings: MarketplaceListing[];
  borrowedEquipment: MarketplaceListing[];
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  
  // Actions
  fetchListings: (filters?: MarketplaceFilters) => Promise<void>;
  fetchUserListings: () => Promise<void>;
  borrowEquipment: (orderId: string) => Promise<void>;
  cancelListing: (orderId: string) => Promise<void>;
  returnEquipment: (orderId: string) => Promise<void>;
  updateListing: (orderId: string, updates: { price?: number; collateral?: number; duration?: number }) => Promise<void>;
  
  // Utilities
  clearError: () => void;
  refetch: () => Promise<void>;
}

export interface MarketplaceFiltersState {
  search: string;
  equipmentType: EquipmentType | 'all';
  rarity: Rarity | 'all';
  maxPrice: number;
  onlyAvailable: boolean;
}

export const useMarketplace = (initialFilters?: Partial<MarketplaceFiltersState>): UseMarketplaceState => {
  const { address } = useAccount();
  
  // State
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [borrowedEquipment, setBorrowedEquipment] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    limit: 20,
    hasMore: false
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchListings = useCallback(async (filters?: MarketplaceFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await marketplaceService.getMarketplaceListings({
        limit: 20,
        offset: 0,
        ...filters
      });
      
      setListings(data.listings);
      setPagination(data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch marketplace listings';
      setError(errorMessage);
      console.error('Error fetching marketplace listings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserListings = useCallback(async () => {
    if (!address) {
      // If no wallet connected, clear user-specific data but don't show error
      setMyListings([]);
      setBorrowedEquipment([]);
      return;
    }
    
    try {
      setError(null);
      
      const userListings = await marketplaceService.getUserListings(address);
      setMyListings(userListings.myListings);
      setBorrowedEquipment(userListings.borrowedEquipment);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user listings';
      setError(errorMessage);
      console.error('Error fetching user listings:', err);
    }
  }, [address]);

  const borrowEquipment = useCallback(async (orderId: string) => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      
      await marketplaceService.borrowEquipment({
        orderId,
        borrowerId: address,
        borrowerAddress: address
      });
      
      // Refresh data after successful borrow
      await Promise.all([fetchListings(), fetchUserListings()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to borrow equipment';
      setError(errorMessage);
      console.error('Error borrowing equipment:', err);
      throw err; // Re-throw to allow component-level error handling
    }
  }, [address, fetchListings, fetchUserListings]);

  const cancelListing = useCallback(async (orderId: string) => {
    try {
      setError(null);
      
      await marketplaceService.cancelLendingOffer(orderId);
      
      // Refresh data after successful cancellation
      await Promise.all([fetchListings(), fetchUserListings()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel listing';
      setError(errorMessage);
      console.error('Error canceling listing:', err);
      throw err;
    }
  }, [fetchListings, fetchUserListings]);

  const returnEquipment = useCallback(async (orderId: string) => {
    try {
      setError(null);
      
      await marketplaceService.returnEquipment(orderId);
      
      // Refresh data after successful return
      await Promise.all([fetchListings(), fetchUserListings()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to return equipment';
      setError(errorMessage);
      console.error('Error returning equipment:', err);
      throw err;
    }
  }, [fetchListings, fetchUserListings]);

  const updateListing = useCallback(async (
    orderId: string, 
    updates: { price?: number; collateral?: number; duration?: number }
  ) => {
    try {
      setError(null);
      
      await marketplaceService.updateLendingOffer(orderId, updates);
      
      // Refresh data after successful update
      await Promise.all([fetchListings(), fetchUserListings()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update listing';
      setError(errorMessage);
      console.error('Error updating listing:', err);
      throw err;
    }
  }, [fetchListings, fetchUserListings]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchListings(), fetchUserListings()]);
  }, [fetchListings, fetchUserListings]);

  // Initial data fetch
  useEffect(() => {
    fetchListings(initialFilters);
  }, [fetchListings]);

  // Fetch user-specific data when address changes
  useEffect(() => {
    fetchUserListings(); // Always call, it will handle the no-address case
  }, [address, fetchUserListings]);

  return {
    // Data
    listings,
    myListings,
    borrowedEquipment,
    
    // UI State
    loading,
    error,
    
    // Pagination
    pagination,
    
    // Actions
    fetchListings,
    fetchUserListings,
    borrowEquipment,
    cancelListing,
    returnEquipment,
    updateListing,
    
    // Utilities
    clearError,
    refetch
  };
};

export default useMarketplace;
