import React, { useState, useEffect } from 'react';
import { PencilIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  apiClient,
  GAME_PLAYER_GET_ROUTE,
  GAME_PLAYER_UPDATE_ROUTE,
  GAME_PLAYER_REGISTER_ROUTE,
  PARTY_PLAYER_GET_ROUTE,
  LOOT_PLAYER_GET_ROUTE
} from '../utils/routes';
import { useAccount } from "wagmi";
import { APIResponse } from '../../../shared/src/types';

interface PlayerData {
  id: string;
  wallet: string;
  username?: string;
  level: number;
  experience: number;
  equipment: Equipment[];
  gameStats?: GameStats;
  createdAt: string;
  updatedAt: string;
}

interface Equipment {
  id: string;
  tokenId: number;
  name: string;
  rarity: string;
  attackPower: number;
  defensePower: number;
  magicPower: number;
}

interface GameStats {
  dungeonsCleared: number;
  totalLoot: number;
  totalExperience: number;
  highestLevel: number;
  gamesPlayed: number;
}

interface PartyMember {
  player: {
    id: string;
    wallet: string;
    username?: string;
  };
  role: string;
  joinedAt: string;
}

interface PartyData {
  id: string;
  name?: string;
  chainId: number;
  isLeader?: boolean;
  members: PartyMember[];
}


const ProfilePage: React.FC = () => {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [party, setParty] = useState<PartyData | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address: WALLET_ADDRESS } = useAccount();

  // Fetch all profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!WALLET_ADDRESS) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const playerRes = await apiClient.get<APIResponse<PlayerData>>(
          GAME_PLAYER_GET_ROUTE.replace('{wallet}', WALLET_ADDRESS)
        );
        console.log('Player data:', playerRes.data);
        
        if (playerRes.data.success && playerRes.data.data) {
          const playerData = playerRes.data.data;
          setPlayer(playerData);
          console.log('Player data loaded:', playerData);
          setUsername(String(playerData.username || ''));
          setEquipment(Array.isArray(playerData.equipment) ? playerData.equipment : []);
          console.log('Equipment data:', playerData.equipment);
        } else {
          // Try to create player profile in database first
          try {
            console.log('No player found, attempting to create profile...');
            const createResponse = await apiClient.post<APIResponse<PlayerData>>(
              GAME_PLAYER_REGISTER_ROUTE,
              { wallet: WALLET_ADDRESS }
            );
            
            if (createResponse.data.success && createResponse.data.data) {
              const newPlayer = createResponse.data.data;
              setPlayer(newPlayer);
              setUsername(String(newPlayer.username || ''));
              setEquipment([]);
              console.log('New player profile created:', newPlayer);
            } else {
              throw new Error('Failed to create player profile');
            }
          } catch (createErr) {
            console.log('Could not create player profile, using fallback:', createErr);
            // Create a default player profile if none exists and can't create in DB
            const defaultPlayer = {
              id: 'temp-id',
              wallet: WALLET_ADDRESS,
              username: '',
              level: 1,
              experience: 0,
              equipment: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setPlayer(defaultPlayer);
            setUsername('');
            setEquipment([]);
          }
        }

        try {
          const partyRes = await apiClient.get<APIResponse<PartyData>>(
            PARTY_PLAYER_GET_ROUTE.replace('{address}', WALLET_ADDRESS)
          );
          
          if (partyRes.data.success && partyRes.data.data) {
            const partyData = partyRes.data.data;
            // Ensure members array exists and is valid
            if (partyData && Array.isArray(partyData.members)) {
              setParty(partyData);
              console.log('Party data:', partyData);
            }
          }
        } catch (partyErr) {
          console.log('No party data found or error loading party:', partyErr);
          // This is expected if user is not in a party
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        
        // Try to create a player profile if API is available but player doesn't exist
        try {
          console.log('Attempting to create player profile after error...');
          const createResponse = await apiClient.post<APIResponse<PlayerData>>(
            GAME_PLAYER_REGISTER_ROUTE,
            { wallet: WALLET_ADDRESS }
          );
          
          if (createResponse.data.success && createResponse.data.data) {
            const newPlayer = createResponse.data.data;
            setPlayer(newPlayer);
            setUsername(String(newPlayer.username || ''));
            setEquipment([]);
            console.log('Player profile created after error:', newPlayer);
          } else {
            throw new Error('Failed to create player profile');
          }
        } catch (createErr) {
          console.log('Could not create player profile, using fallback:', createErr);
          // Create a fallback profile if API is not available
          const fallbackPlayer = {
            id: 'temp-id',
            wallet: WALLET_ADDRESS,
            username: '',
            level: 1,
            experience: 0,
            equipment: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setPlayer(fallbackPlayer);
          setUsername('');
          setEquipment([]);
          console.log('Using fallback profile due to API error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [WALLET_ADDRESS]);

  const updateUsername = async () => {
    if (!player || !WALLET_ADDRESS) return;
    
    setSavingUsername(true);
    
    try {
      console.log('=== SAVING USERNAME ===');
      console.log('Username:', username);
      console.log('Player ID:', player.id);
      console.log('Wallet:', WALLET_ADDRESS);
      
      // If player ID is temporary, we need to create the player first
      if (!player.id || player.id === 'temp-id') {
        console.log('Creating new player profile with username');
        // Try to create/register player first
        const createResponse = await apiClient.post<APIResponse<PlayerData>>(
          GAME_PLAYER_REGISTER_ROUTE, 
          { 
            wallet: WALLET_ADDRESS,
            username: username 
          }
        );
        
        console.log('Create response:', createResponse.data);
        
        if (createResponse.data.success && createResponse.data.data) {
          const newPlayer = createResponse.data.data;
          setPlayer(newPlayer);
          console.log('Player profile created successfully with username:', newPlayer);
        } else {
          // Fallback: just update local state
          setPlayer(prev => prev ? { ...prev, username } : prev);
          console.warn('Could not create player profile in database, username saved locally only');
        }
      } else {
        // Player exists, update username
        console.log('Updating existing player username');
        const updateRoute = GAME_PLAYER_UPDATE_ROUTE.replace('{playerId}', player.id);
        console.log('Update route:', updateRoute);
        
        const response = await apiClient.put<APIResponse<PlayerData>>(
          updateRoute, 
          { username }
        );
        
        console.log('Update response:', response.data);
        
        if (response.data.success && response.data.data) {
          // Update the local player state with the response data
          setPlayer(response.data.data);
          console.log('Username saved successfully to database:', response.data.data);
        } else {
          console.error('Failed to save username - API returned error:', response.data);
          // Keep the entered username locally even if server save failed
          setPlayer(prev => prev ? { ...prev, username } : prev);
        }
      }
      
      setEditingUsername(false);
    } catch (err) {
      console.error('Failed to update username:', err);
      console.error('Error details:', err.response?.data || err.message);
      
      // For any errors, try to keep the username locally
      setPlayer(prev => prev ? { ...prev, username } : prev);
      setEditingUsername(false);
      
      // Show user feedback about the error
      console.warn('Username saved locally but may not persist. Please try again.');
    } finally {
      setSavingUsername(false);
    }
  };

  const rarityBadge = (rarity: string) => {
    const colors: Record<string, string> = {
      Legendary: 'bg-yellow-300 text-yellow-800',
      Epic: 'bg-purple-300 text-purple-800',
      Rare: 'bg-blue-300 text-blue-800',
      Common: 'bg-gray-200 text-gray-800',
    };
    return colors[rarity] || colors.Common;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-purple-400 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-gray-300 text-xl font-game">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-red-500/20">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Profile</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!WALLET_ADDRESS) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-yellow-500/20">
          <div className="text-yellow-400 text-6xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
          <p className="text-gray-300">Please connect your wallet to view your profile.</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-blue-500/20">
          <div className="text-blue-400 text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Profile Found</h2>
          <p className="text-gray-300">Start playing to create your profile!</p>
        </div>
      </div>
    );
  }

  // Helper function to safely convert values to numbers
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'object') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Helper function to safely convert any value to string for React rendering
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      // If it's an object, return empty string or a safe representation
      return '';
    }
    return String(value);
  };

  // Convert stats to an array instead of object to avoid React child issues
  const statsArray = [
    { label: 'Dungeons', value: safeNumber(player?.gameStats?.dungeonsCleared) },
    { label: 'Loot Collected', value: safeNumber(player?.gameStats?.totalLoot) },
    { label: 'XP Total', value: safeNumber(player?.gameStats?.totalExperience ?? player?.experience) },
    { label: 'Highest Level', value: safeNumber(player?.gameStats?.highestLevel ?? player?.level) },
    { label: 'Games Played', value: safeNumber(player?.gameStats?.gamesPlayed) },
  ];

  // Debug logging
  console.log('Player object:', player);
  console.log('Player gameStats:', player?.gameStats);
  console.log('Party object:', party);
  console.log('Stats array:', statsArray);
  
  // Check for any objects in party data that might cause issues
  if (party) {
    console.log('Party members:', party.members);
    party.members?.forEach((member, index) => {
      console.log(`Member ${index}:`, member);
      console.log(`Member ${index} player:`, member?.player);
    });
  }
  
  // Extra safety check - ensure all stats values are actually numbers
  statsArray.forEach(({ label, value }) => {
    if (typeof value !== 'number') {
      console.error(`Stats value "${label}" is not a number:`, value, typeof value);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* HERO SECTION */}
        <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-blue-600/20" />
          <div className="relative flex flex-col md:flex-row items-center p-8">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-4xl font-extrabold text-white shadow-xl border-4 border-white/20">
              {safeString(username || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="mt-6 md:mt-0 md:ml-8 flex-1">
              <h1 className="text-4xl font-bold text-white">
                {editingUsername ? (
                  <div className="flex items-center">
                    <input
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onBlur={updateUsername}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          updateUsername();
                        }
                        if (e.key === 'Escape') {
                          setEditingUsername(false);
                          setUsername(player?.username || '');
                        }
                      }}
                      autoFocus
                      disabled={savingUsername}
                      className="text-4xl font-bold bg-white/10 backdrop-blur text-white rounded-lg px-3 py-2 border border-purple-400/50 focus:border-purple-400 outline-none placeholder-gray-300 disabled:opacity-50"
                      placeholder="Enter your username"
                    />
                    {savingUsername && (
                      <div className="ml-3 text-purple-300">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-400 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="hover:text-purple-300 transition-colors">
                    {safeString(username) || 'Unnamed'}
                  </span>
                )}
                <button 
                  onClick={() => setEditingUsername(true)} 
                  className="ml-3 text-purple-300 hover:text-white transition-colors"
                  disabled={savingUsername}
                >
                  <PencilIcon className="w-6 h-6 inline" />
                </button>
              </h1>
              <p className="text-gray-300 mt-3 text-lg">
                <span className="text-purple-300">Wallet:</span> 
                <span className="font-mono ml-2 text-sm bg-black/30 px-2 py-1 rounded">
                  {safeString(player?.wallet)?.slice(0, 6) + '...' + safeString(player?.wallet)?.slice(-4) || 'Unknown'}
                </span>
              </p>
            </div>
            <div className="mt-6 md:mt-0 flex space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-300">{safeString(player?.level) || '0'}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">Level</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-300">{safeString(player?.experience) || '0'}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">XP</div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS PANELS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statsArray.map(({ label, value }, index) => {
            const displayValue = typeof value === 'number' ? value.toString() : '0';
            return (
              <div 
                key={`${label}-${index}`} 
                className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:bg-white/10 hover:border-purple-400/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-3xl font-bold text-purple-300 mb-2">{displayValue}</div>
                <div className="text-sm text-gray-400 uppercase tracking-wide">{label}</div>
              </div>
            );
          })}
        </div>

        {/* PARTY + EQUIPMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">🎭</span>
              Party Info
            </h2>
            {party && Array.isArray(party.members) ? (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-purple-400/20">
                  <div className="text-purple-300 font-semibold">Name:</div>
                  <div className="text-white">{safeString(party.name) || 'Unnamed Party'} {party.isLeader && <span className="text-green-400 ml-2">(Leader)</span>}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-purple-400/20">
                  <div className="text-purple-300 font-semibold">Role:</div>
                  <div className="text-white">{
        (() => {
          const member = party.members.find(m => m?.player?.wallet === player?.wallet);
          return safeString(member?.role) || 'Unknown';
        })()
      }</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-purple-400/20">
                  <div className="text-purple-300 font-semibold">Joined:</div>
                  <div className="text-white">{
        (() => {
          const member = party.members.find(m => m?.player?.wallet === player?.wallet);
          const joinedAt = member?.joinedAt;
          if (typeof joinedAt === 'string' && joinedAt.includes('T')) {
            return safeString(joinedAt.split('T')[0]);
          }
          return safeString(joinedAt) || 'N/A';
        })()
      }</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-purple-400/20">
                  <div className="text-purple-300 font-semibold">Chain:</div>
                  <div className="text-white">{safeString(party.chainId) || 'Unknown'}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-400">Not in a party yet.</p>
                <p className="text-sm text-gray-500 mt-2">Join a party to start your adventure!</p>
              </div>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">⚔️</span>
              Equipment
            </h2>
            <div className="space-y-4">
              {Array.isArray(equipment) && equipment.length > 0 ? (
                equipment.map((item, index) => (
                  <div 
                    key={item?.tokenId || index} 
                    className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 hover:bg-white/10 hover:border-purple-400/30 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {safeString(item?.name) || 'Unknown Item'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-300 mt-2">
                          <span className="flex items-center">
                            <span className="text-red-400">⚔️</span>
                            <span className="ml-1">{safeString(item?.attackPower) || '0'}</span>
                          </span>
                          <span className="flex items-center">
                            <span className="text-blue-400">🛡️</span>
                            <span className="ml-1">{safeString(item?.defensePower) || '0'}</span>
                          </span>
                          <span className="flex items-center">
                            <span className="text-purple-400">✨</span>
                            <span className="ml-1">{safeString(item?.magicPower) || '0'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${rarityBadge(item?.rarity || 'Common')}`}>
                          {safeString(item?.rarity) || 'Common'}
                        </span>
                        <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors"/>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-400">No equipment found.</p>
                  <p className="text-sm text-gray-500 mt-2">Start exploring to find powerful gear!</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
