import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import EquipmentListing from '../components/marketplace/EquipmentListing';
import SearchFilters from '../components/marketplace/SearchFilters';
import MyListings from '../components/marketplace/MyListings';
import BorrowedEquipment from '../components/marketplace/BorrowedEquipment';
import { Equipment, LendingOffer, EquipmentType, Rarity } from '../../../shared/src/types';
import { useMarketplace, MarketplaceFiltersState } from '../hooks/useMarketplace';
import { MarketplaceListing } from '../services/marketplaceService';
import { apiService } from '../services/api';
import { useToast } from '../contexts/ToastContext';

interface FilterState {
  search: string;
  equipmentType: EquipmentType | 'all';
  rarity: Rarity | 'all';
  maxPrice: number;
  onlyAvailable: boolean;
}

const MarketplacePage: React.FC = () => {
  const { address } = useAccount();
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'browse' | 'mylisting' | 'borrowed'>('browse');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    equipmentType: 'all',
    rarity: 'all',
    maxPrice: 1000,
    onlyAvailable: true,
  });
  const [generatingLoot, setGeneratingLoot] = useState(false);

  // Use the marketplace hook
  const {
    listings,
    myListings,
    borrowedEquipment,
    loading,
    error,
    pagination,
    fetchListings,
    borrowEquipment: handleBorrowEquipment,
    cancelListing: handleCancelListing,
    returnEquipment: handleReturnEquipment,
    updateListing: handleUpdateListing,
    clearError,
    refetch
  } = useMarketplace();

  // Load initial data on mount
  useEffect(() => {
    const initialFilters = {
      search: filters.search,
      equipmentType: filters.equipmentType !== 'all' ? filters.equipmentType : undefined,
      rarity: filters.rarity !== 'all' ? filters.rarity : undefined,
      maxPrice: filters.maxPrice,
      onlyAvailable: filters.onlyAvailable,
    };
    fetchListings(initialFilters);
  }, [fetchListings]); // Add fetchListings as dependency

  // Handle filter changes and refetch data
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    
    // Convert filters to marketplace service format
    const marketplaceFilters = {
      search: newFilters.search,
      equipmentType: newFilters.equipmentType !== 'all' ? newFilters.equipmentType : undefined,
      rarity: newFilters.rarity !== 'all' ? newFilters.rarity : undefined,
      maxPrice: newFilters.maxPrice,
      onlyAvailable: newFilters.onlyAvailable,
    };
    
    fetchListings(marketplaceFilters);
  }, [fetchListings]);

  // Filter listings based on search and availability (client-side filtering)
  const filteredEquipment = listings.filter(item => {
    const matchesSearch = !filters.search || 
      item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesAvailability = !filters.onlyAvailable || 
      item.lendingOffer.status === 'active';
    
    return matchesSearch && matchesAvailability;
  });

  // Handle borrow action with error handling
  const onBorrow = async (equipmentId: string) => {
    try {
      clearError();
      const listing = listings.find(item => item.id === equipmentId);
      if (!listing) {
        throw new Error('Equipment not found');
      }
      
      await handleBorrowEquipment(listing.lendingOffer.id);
      
      success(`Successfully borrowed ${listing.name}!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to borrow equipment';
      showError(errorMessage);
      console.error('Failed to borrow equipment:', error);
    }
  };

  // Handle cancel listing
  const onCancelListing = async (listingId: string) => {
    try {
      clearError();
      const listing = myListings.find(item => item.lendingOffer.id === listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }
      
      await handleCancelListing(listingId);
      
      success(`Successfully canceled listing for ${listing.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel listing';
      showError(errorMessage);
      console.error('Failed to cancel listing:', error);
    }
  };

  // Handle update listing
  const onUpdateListing = async (listingId: string, updates: any) => {
    try {
      clearError();
      await handleUpdateListing(listingId, updates);
      
      success('Successfully updated listing');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update listing';
      showError(errorMessage);
      console.error('Failed to update listing:', error);
    }
  };

  // Handle return equipment
  const onReturn = async (equipmentId: string) => {
    try {
      clearError();
      const borrowedItem = borrowedEquipment.find(item => item.id === equipmentId);
      if (!borrowedItem) {
        throw new Error('Borrowed equipment not found');
      }
      
      await handleReturnEquipment(borrowedItem.lendingOffer.id);
      
      success(`Successfully returned ${borrowedItem.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to return equipment';
      showError(errorMessage);
      console.error('Failed to return equipment:', error);
    }
  };

  // Add dev loot generation for testing
  const generateTestLoot = async () => {
    if (generatingLoot) return;
    
    try {
      setGeneratingLoot(true);
      const testAddress = address || '0x1234567890123456789012345678901234567890';
      
      const response = await fetch('http://localhost:3001/api/loot/generate-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: testAddress,
          playerAddress: testAddress,
          dungeonLevel: Math.floor(Math.random() * 5) + 1,
          chainId: 11155111
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        success(`Generated ${data.data?.name}! 🎉`);
        // Refresh the listings
        refetch();
      } else {
        throw new Error(data.error || 'Failed to generate loot');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate loot';
      showError(errorMessage);
    } finally {
      setGeneratingLoot(false);
    }
  };

  const tabs = [
    { key: 'browse', label: '🛒 Browse Equipment', count: filteredEquipment.length },
    { key: 'mylisting', label: '📝 My Listings', count: myListings.length },
    { key: 'borrowed', label: '🤝 Borrowed', count: borrowedEquipment.length },
  ];

  return (
    <div className="text-white min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-4 text-glow">🏪 Equipment Marketplace</h1>
            <p className="text-gray-300 text-lg">
              Lend and borrow powerful equipment across chains. Earn fees or access gear you need for your adventures.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={generateTestLoot}
              disabled={generatingLoot}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>🎲</span>
              <span>{generatingLoot ? 'Generating...' : 'Generate Test Loot'}</span>
            </button>
            <button
              onClick={refetch}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-red-300">⚠️ {error}</span>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300 ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-black/30 p-1 rounded-lg backdrop-blur-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 px-4 rounded-md transition-all duration-200 font-medium ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-1 bg-purple-500/30 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Search and Filters */}
          <div className="lg:col-span-1">
            <SearchFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </div>
          
          {/* Equipment Listings */}
          <div className="lg:col-span-3">
            <EquipmentListing 
              equipment={filteredEquipment} 
              loading={loading}
              onBorrow={onBorrow}
            />
          </div>
        </div>
      )}

      {activeTab === 'mylisting' && (
        address ? (
          <MyListings 
            listings={myListings}
            loading={loading}
            onCancelListing={onCancelListing}
            onUpdateListing={onUpdateListing}
            onRefresh={refetch}
          />
        ) : (
          <div className="glass-morphism p-12 rounded-lg text-center">
            <div className="text-6xl mb-4">👛</div>
            <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
            <p className="text-gray-400 mb-6">
              Connect your wallet to view and manage your equipment listings.
            </p>
          </div>
        )
      )}

      {activeTab === 'borrowed' && (
        address ? (
          <BorrowedEquipment 
            borrowedItems={borrowedEquipment}
            loading={loading}
            onReturn={onReturn}
          />
        ) : (
          <div className="glass-morphism p-12 rounded-lg text-center">
            <div className="text-6xl mb-4">👛</div>
            <h3 className="text-xl font-bold text-white mb-2">Wallet Not Connected</h3>
            <p className="text-gray-400 mb-6">
              Connect your wallet to view your borrowed equipment.
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default MarketplacePage;
