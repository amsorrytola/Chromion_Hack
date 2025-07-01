/**
 * API service for communicating with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface Player {
  id: string;
  wallet: string;
  username?: string;
  level: number;
  experience: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Party {
  id: string;
  name?: string;
  maxSize: number;
  chainId: number;
  isActive: boolean;
  members: PartyMember[];
  dungeonRuns?: any[];
  createdAt: string;
  updatedAt: string;
}

interface PartyMember {
  id: string;
  playerId: string;
  role: string;
  isLeader: boolean;
  joinedAt: string;
  player: Player;
}

interface Equipment {
  id: string;
  tokenId: string;
  name: string;
  equipmentType: string;
  rarity: string;
  attackPower: number;
  defensePower: number;
  magicPower: number;
  specialAbility?: string;
  isLendable: boolean;
  lendingPrice?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface LendingOrder {
  id: string;
  equipmentId: string;
  lenderId: string;
  borrowerId?: string;
  price: string;
  collateral: string;
  duration: number;
  status: string;
  createdAt: string;
  expiresAt: string;
  equipment: Equipment & { owner: Player };
}

interface GameState {
  player: Player;
  party: Party | null;
  equipment: Equipment[];
  stats: any;
  currentDungeon?: any;
}

interface AIInteractionRequest {
  playerId: string;
  npcId: string;
  message: string;
  context?: any;
}

interface AIInteractionResponse {
  npc: {
    id: string;
    name: string;
    personality: string;
    specialties: string[];
  };
  response: string;
  interaction: any;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // Player endpoints
  async createPlayer(wallet: string, username?: string): Promise<ApiResponse<Player>> {
    return this.request('/api/game/player/connect', {
      method: 'POST',
      body: JSON.stringify({ wallet, username }),
    });
  }

  async getPlayer(wallet: string): Promise<ApiResponse<Player>> {
    return this.request(`/api/game/player/${wallet}`);
  }

  async getGameState(playerId: string): Promise<ApiResponse<GameState>> {
    return this.request(`/api/game/state/${playerId}`);
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<ApiResponse<Player>> {
    return this.request(`/api/game/player/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Party endpoints
  async createParty(data: {
    playerId: string;
    playerAddress: string;
    name?: string;
    maxSize?: number;
    chainId?: number;
  }): Promise<ApiResponse<Party & { blockchainPartyId: string; transactionHash: string }>> {
    return this.request('/api/party/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async joinParty(data: {
    partyId: string;
    playerId: string;
    role?: string;
  }): Promise<ApiResponse<Party>> {
    return this.request('/api/party/join', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async leaveParty(data: {
    partyId: string;
    playerId: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/party/leave', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getParty(partyId: string): Promise<ApiResponse<Party>> {
    return this.request(`/api/party/${partyId}`);
  }

  async getPlayerParty(playerId: string): Promise<ApiResponse<Party | null>> {
    return this.request(`/api/party/player/${playerId}`);
  }

  async getAllAvailableParties(excludePlayerId?: string, limit?: number, offset?: number): Promise<ApiResponse<Party[]>> {
    const params = new URLSearchParams();
    if (excludePlayerId) params.append('excludePlayerId', excludePlayerId);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const queryString = params.toString();
    return this.request(`/api/party/available${queryString ? `?${queryString}` : ''}`);
  }

  async disbandParty(partyId: string, playerId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/party/${partyId}/disband`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });
  }

  async requestToJoinParty(data: {
    partyId: string;
    playerId: string;
    message?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/party/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPartyRequests(partyId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/api/party/${partyId}/requests`);
  }

  async respondToPartyRequest(requestId: string, data: {
    action: 'approve' | 'reject';
    responderId: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/party/requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Loot endpoints
  async generateLoot(data: {
    playerId: string;
    playerAddress: string;
    dungeonLevel?: number;
    chainId?: number;
  }): Promise<ApiResponse<Equipment & { transactionHash: string }>> {
    return this.request('/api/loot/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEquipment(tokenId: string): Promise<ApiResponse<Equipment & { owner: Player; lendingOrders: LendingOrder[] }>> {
    return this.request(`/api/loot/equipment/${tokenId}`);
  }

  async getPlayerEquipment(playerId: string): Promise<ApiResponse<Equipment[]>> {
    return this.request(`/api/loot/player/${playerId}`);
  }

  async syncEquipment(data: {
    playerId: string;
    playerAddress: string;
    chainId?: number;
  }): Promise<ApiResponse<Equipment[]>> {
    return this.request('/api/loot/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Marketplace endpoints
  async getMarketplace(params?: {
    limit?: number;
    offset?: number;
    rarity?: string;
    equipmentType?: string;
    minPrice?: string;
    maxPrice?: string;
  }): Promise<ApiResponse<{
    orders: LendingOrder[];
    pagination: {
      total: number;
      offset: number;
      limit: number;
      hasMore: boolean;
    };
  }>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const query = queryParams.toString();
    return this.request(`/api/loot/marketplace${query ? `?${query}` : ''}`);
  }

  async createLendingOrder(data: {
    equipmentId: string;
    lenderId: string;
    price: string;
    collateral: string;
    duration?: number;
  }): Promise<ApiResponse<LendingOrder>> {
    return this.request('/api/loot/lend', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async borrowEquipment(data: {
    orderId: string;
    borrowerId: string;
    borrowerAddress: string;
  }): Promise<ApiResponse<LendingOrder>> {
    return this.request('/api/loot/borrow', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLendingOrder(orderId: string, data: {
    status?: string;
    borrowerId?: string;
  }): Promise<ApiResponse<LendingOrder>> {
    return this.request(`/api/loot/lending/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // AI endpoints
  async interactWithNPC(data: AIInteractionRequest): Promise<ApiResponse<AIInteractionResponse>> {
    return this.request('/api/ai/interact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInteractionHistory(playerId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const query = queryParams.toString();
    return this.request(`/api/ai/history/${playerId}${query ? `?${query}` : ''}`);
  }

  async getNPCs(): Promise<ApiResponse<any[]>> {
    return this.request('/api/ai/npcs');
  }

  async getUserListings(playerId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<LendingOrder[]>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return this.request(`/api/loot/user/${playerId}/listings${query ? `?${query}` : ''}`);
  }

  async getUserBorrowedEquipment(playerId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<LendingOrder[]>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return this.request(`/api/loot/user/${playerId}/borrowed${query ? `?${query}` : ''}`);
  }
}

export const apiService = new ApiService();
export type { 
  Player, 
  Party, 
  PartyMember, 
  Equipment, 
  LendingOrder, 
  GameState, 
  AIInteractionRequest, 
  AIInteractionResponse,
  ApiResponse
};
