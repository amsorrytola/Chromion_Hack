// Mock data for development and testing
export interface MockEquipment {
  tokenId: string;
  name: string;
  equipmentType: string;
  rarity: string;
  attackPower: number;
  defensePower: number;
  magicPower: number;
  durability: number;
  isLendable: boolean;
  attributes: string[];
}

export interface MockLootRequest {
  id: string;
  chainId: number;
  requestId: string;
  status: 'pending' | 'fulfilled' | 'failed';
  timestamp: number;
  result?: MockEquipment;
}

export interface MockMarketplaceListing {
  id: string;
  equipment: MockEquipment;
  lender: string;
  collateralRequired: string;
  dailyRate: string;
  duration: number;
  isActive: boolean;
}

export interface MockGameStats {
  totalEquipment: number;
  pendingLootRequests: number;
  activeListings: number;
  crossChainTransfers: number;
  totalPlayers: number;
}

// Mock equipment data
export const mockEquipment: MockEquipment[] = [
  {
    tokenId: '1',
    name: 'Dragon Slayer Sword',
    equipmentType: 'weapon',
    rarity: 'legendary',
    attackPower: 150,
    defensePower: 20,
    magicPower: 30,
    durability: 95,
    isLendable: true,
    attributes: ['Fire Damage +25', 'Dragon Slaying', 'Enchanted']
  },
  {
    tokenId: '2',
    name: 'Mystic Shield of Protection',
    equipmentType: 'armor',
    rarity: 'epic',
    attackPower: 10,
    defensePower: 120,
    magicPower: 50,
    durability: 88,
    isLendable: false,
    attributes: ['Magic Resistance +40', 'Spell Reflection', 'Ancient Runes']
  },
  {
    tokenId: '3',
    name: 'Ring of Swift Strikes',
    equipmentType: 'accessory',
    rarity: 'rare',
    attackPower: 35,
    defensePower: 5,
    magicPower: 15,
    durability: 100,
    isLendable: true,
    attributes: ['Attack Speed +20%', 'Critical Hit +10%']
  },
  {
    tokenId: '4',
    name: 'Healing Potion Supreme',
    equipmentType: 'consumable',
    rarity: 'uncommon',
    attackPower: 0,
    defensePower: 0,
    magicPower: 0,
    durability: 1,
    isLendable: false,
    attributes: ['Restores 500 HP', 'Removes Poison', 'Single Use']
  },
  {
    tokenId: '5',
    name: 'Shadowstep Cloak',
    equipmentType: 'armor',
    rarity: 'epic',
    attackPower: 25,
    defensePower: 80,
    magicPower: 60,
    durability: 92,
    isLendable: true,
    attributes: ['Stealth +30%', 'Shadow Magic', 'Movement Speed +15%']
  },
  {
    tokenId: '6',
    name: 'Common Iron Sword',
    equipmentType: 'weapon',
    rarity: 'common',
    attackPower: 45,
    defensePower: 5,
    magicPower: 0,
    durability: 75,
    isLendable: true,
    attributes: ['Reliable', 'Basic Craftsmanship']
  }
];

// Mock loot generation requests
export const mockLootRequests: MockLootRequest[] = [
  {
    id: '1',
    chainId: 11155111,
    requestId: '0x123...abc',
    status: 'fulfilled',
    timestamp: Date.now() - 3600000, // 1 hour ago
    result: {
      tokenId: '7',
      name: 'Ethereal Blade of Winds',
      equipmentType: 'weapon',
      rarity: 'mythic',
      attackPower: 200,
      defensePower: 30,
      magicPower: 80,
      durability: 100,
      isLendable: true,
      attributes: ['Wind Magic', 'Lightning Strikes', 'Levitation', 'Storm Calling']
    }
  },
  {
    id: '2',
    chainId: 11155111,
    requestId: '0x456...def',
    status: 'pending',
    timestamp: Date.now() - 300000, // 5 minutes ago
  },
  {
    id: '3',
    chainId: 11155111,
    requestId: '0x789...ghi',
    status: 'failed',
    timestamp: Date.now() - 1800000, // 30 minutes ago
  }
];

// Mock marketplace listings
export const mockMarketplaceListings: MockMarketplaceListing[] = [
  {
    id: '1',
    equipment: mockEquipment[0], // Dragon Slayer Sword
    lender: '0x742d35Cc6665C6532',
    collateralRequired: '0.5',
    dailyRate: '0.01',
    duration: 7,
    isActive: true
  },
  {
    id: '2',
    equipment: mockEquipment[1], // Mystic Shield
    lender: '0x8ba1f109551bD432',
    collateralRequired: '0.3',
    dailyRate: '0.008',
    duration: 3,
    isActive: true
  },
  {
    id: '3',
    equipment: mockEquipment[4], // Shadowstep Cloak
    lender: '0x123def456abc789',
    collateralRequired: '0.4',
    dailyRate: '0.012',
    duration: 5,
    isActive: true
  }
];

// Mock data service
export class MockDataService {
  private static instance: MockDataService;
  
  static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  // Simulate API delay
  private async delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getPlayerEquipment(address: string): Promise<MockEquipment[]> {
    await this.delay();
    // Return subset of equipment for this player
    return mockEquipment.slice(0, 4);
  }

  async getLootRequests(address: string): Promise<MockLootRequest[]> {
    await this.delay();
    return mockLootRequests;
  }

  async getMarketplaceListings(): Promise<MockMarketplaceListing[]> {
    await this.delay();
    return mockMarketplaceListings;
  }

  async requestRandomLoot(chainId: number): Promise<MockLootRequest> {
    await this.delay(1000);
    
    const newRequest: MockLootRequest = {
      id: Math.random().toString(36).substr(2, 9),
      chainId,
      requestId: '0x' + Math.random().toString(16).substr(2, 8),
      status: 'pending',
      timestamp: Date.now()
    };

    mockLootRequests.unshift(newRequest);
    
    // Simulate request fulfillment after some time
    setTimeout(() => {
      newRequest.status = 'fulfilled';
      newRequest.result = this.generateRandomEquipment();
    }, 5000);

    return newRequest;
  }

  private generateRandomEquipment(): MockEquipment {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    const types = ['weapon', 'armor', 'accessory'];
    const names = {
      weapon: ['Blade of', 'Sword of', 'Axe of', 'Hammer of', 'Dagger of'],
      armor: ['Shield of', 'Armor of', 'Cloak of', 'Helm of', 'Gauntlets of'],
      accessory: ['Ring of', 'Amulet of', 'Pendant of', 'Bracelet of', 'Crown of']
    };
    const suffixes = ['Power', 'Wisdom', 'Strength', 'Agility', 'Magic', 'Protection', 'Fortune', 'Destiny'];

    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const namePrefix = names[type as keyof typeof names][Math.floor(Math.random() * names[type as keyof typeof names].length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    const rarityMultiplier = rarities.indexOf(rarity) + 1;

    return {
      tokenId: Math.random().toString(36).substr(2, 9),
      name: `${namePrefix} ${suffix}`,
      equipmentType: type,
      rarity,
      attackPower: Math.floor(Math.random() * 50 * rarityMultiplier) + 10,
      defensePower: Math.floor(Math.random() * 40 * rarityMultiplier) + 5,
      magicPower: Math.floor(Math.random() * 30 * rarityMultiplier),
      durability: Math.floor(Math.random() * 20) + 80,
      isLendable: Math.random() > 0.3,
      attributes: this.generateRandomAttributes(rarityMultiplier)
    };
  }

  private generateRandomAttributes(rarityMultiplier: number): string[] {
    const allAttributes = [
      'Fire Damage +' + (rarityMultiplier * 10),
      'Ice Damage +' + (rarityMultiplier * 8),
      'Lightning Damage +' + (rarityMultiplier * 12),
      'Magic Resistance +' + (rarityMultiplier * 15),
      'Critical Hit +' + (rarityMultiplier * 5) + '%',
      'Attack Speed +' + (rarityMultiplier * 3) + '%',
      'Movement Speed +' + (rarityMultiplier * 2) + '%',
      'Health Regeneration',
      'Mana Regeneration',
      'Enchanted',
      'Cursed',
      'Ancient'
    ];

    const numAttributes = Math.min(rarityMultiplier, 4);
    const shuffled = allAttributes.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numAttributes);
  }

  async createLendingOrder(equipment: MockEquipment, collateral: string, dailyRate: string, duration: number): Promise<MockMarketplaceListing> {
    await this.delay();
    
    const newListing: MockMarketplaceListing = {
      id: Math.random().toString(36).substr(2, 9),
      equipment,
      lender: '0x' + Math.random().toString(16).substr(2, 16),
      collateralRequired: collateral,
      dailyRate,
      duration,
      isActive: true
    };

    mockMarketplaceListings.unshift(newListing);
    return newListing;
  }

  async burnEquipment(tokenId: string): Promise<boolean> {
    await this.delay();
    const index = mockEquipment.findIndex(eq => eq.tokenId === tokenId);
    if (index !== -1) {
      mockEquipment.splice(index, 1);
      return true;
    }
    return false;
  }

  async getGameStats(): Promise<MockGameStats> {
    await this.delay();
    return {
      totalEquipment: mockEquipment.length,
      pendingLootRequests: mockLootRequests.filter(r => r.status === 'pending').length,
      activeListings: mockMarketplaceListings.filter(l => l.isActive).length,
      crossChainTransfers: Math.floor(Math.random() * 10) + 1, // Random for demo
      totalPlayers: Math.floor(Math.random() * 50) + 10 // Random for demo
    };
  }
}

export const mockDataService = MockDataService.getInstance();
