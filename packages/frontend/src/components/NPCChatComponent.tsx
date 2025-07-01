import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { apiService } from '../services/api';

interface NPC {
  id: string;
  name: string;
  personality: string;
  specialties: string[];
}

interface AIInteraction {
  id: string;
  npcId: string;
  playerId: string;
  message: string;
  response: string;
  context: any;
  createdAt: string;
}

interface Player {
  id: string;
  wallet: string;
  username?: string;
}

const NPCChatComponent: React.FC = () => {
  const { address } = useAccount();
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<AIInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      initializePlayer();
      loadNPCs();
    }
  }, [address]);

  const initializePlayer = async () => {
    try {
      let playerResponse = await apiService.getPlayer(address!);
      if (!playerResponse.success || !playerResponse.data) {
        playerResponse = await apiService.createPlayer(address!);
      }
      
      if (playerResponse.success && playerResponse.data) {
        setPlayer(playerResponse.data);
      }
    } catch (err) {
      console.error('Error initializing player:', err);
    }
  };

  const loadNPCs = async () => {
    try {
      const response = await apiService.getNPCs();
      if (response.success && response.data) {
        setNpcs(response.data);
      }
    } catch (err) {
      console.error('Error loading NPCs:', err);
    }
  };

  const loadChatHistory = async (playerId: string) => {
    try {
      const response = await apiService.getInteractionHistory(playerId, {
        limit: 10,
        offset: 0,
      });
      
      if (response.success && response.data) {
        setChatHistory(response.data);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  const sendMessage = async () => {
    if (!selectedNPC || !player || !message.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.interactWithNPC({
        playerId: player.id,
        npcId: selectedNPC.id,
        message: message.trim(),
        context: {
          location: 'dungeon',
          mood: 'adventurous'
        }
      });
      
      if (response.success && response.data) {
        // Add to local chat history
        const newInteraction: AIInteraction = {
          id: Date.now().toString(),
          npcId: selectedNPC.id,
          playerId: player.id,
          message: message.trim(),
          response: response.data.response,
          context: response.data.interaction.context,
          createdAt: new Date().toISOString(),
        };
        
        setChatHistory(prev => [newInteraction, ...prev]);
        setMessage('');
      } else {
        setError(response.message || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectNPC = (npc: NPC) => {
    setSelectedNPC(npc);
    if (player) {
      loadChatHistory(player.id);
    }
  };

  const getPersonalityEmoji = (personality: string) => {
    switch (personality.toLowerCase()) {
      case 'friendly': return '😊';
      case 'wise': return '🧙‍♂️';
      case 'mysterious': return '🔮';
      case 'grumpy': return '😠';
      case 'cheerful': return '😄';
      case 'serious': return '😐';
      default: return '🤖';
    }
  };

  if (!address) {
    return (
      <div className="glass-morphism p-6 rounded-lg text-center">
        <h3 className="text-xl font-bold text-white mb-4">🤖 AI NPCs</h3>
        <p className="text-gray-300">Connect your wallet to chat with AI-powered NPCs</p>
      </div>
    );
  }

  return (
    <div className="glass-morphism p-6 rounded-lg">
      <h3 className="text-xl font-bold text-white mb-4">🤖 AI-Powered NPCs</h3>
      
      {error && (
        <div className="p-3 rounded-lg border border-red-500 bg-red-900/20 mb-4">
          <p className="text-red-300 text-sm">⚠️ {error}</p>
        </div>
      )}

      {!selectedNPC ? (
        <div>
          <p className="text-gray-300 mb-4">Choose an NPC to start chatting:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {npcs.length === 0 ? (
              <div className="col-span-2 text-center py-6">
                <div className="text-4xl mb-2">🏗️</div>
                <p className="text-gray-400">NPCs will be available soon...</p>
              </div>
            ) : (
              npcs.map((npc) => (
                <button
                  key={npc.id}
                  onClick={() => selectNPC(npc)}
                  className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg transition-all duration-300 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getPersonalityEmoji(npc.personality)}</div>
                    <div>
                      <h4 className="font-bold text-white">{npc.name}</h4>
                      <p className="text-sm text-gray-400 capitalize">{npc.personality}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {npc.specialties.slice(0, 2).map((specialty, index) => (
                          <span key={index} className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* NPC Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{getPersonalityEmoji(selectedNPC.personality)}</div>
              <div>
                <h4 className="font-bold text-white">{selectedNPC.name}</h4>
                <p className="text-sm text-gray-400 capitalize">{selectedNPC.personality}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedNPC(null)}
              className="text-gray-400 hover:text-white"
            >
              ❌
            </button>
          </div>

          {/* Chat History */}
          <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <p>Start a conversation with {selectedNPC.name}!</p>
              </div>
            ) : (
              chatHistory.slice().reverse().map((interaction) => (
                <div key={interaction.id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-purple-600 text-white px-3 py-2 rounded-lg max-w-xs text-sm">
                      {interaction.message}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-200 px-3 py-2 rounded-lg max-w-xs text-sm">
                      {interaction.response}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
              placeholder={`Say something to ${selectedNPC.name}...`}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="game-button px-4 py-2"
            >
              {loading ? '⏳' : '📤'}
            </button>
          </div>

          {/* NPC Info */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex flex-wrap gap-2">
              {selectedNPC.specialties.map((specialty, index) => (
                <span key={index} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
                  💡 {specialty}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NPCChatComponent;
