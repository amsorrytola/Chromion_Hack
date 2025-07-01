import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useGame } from '../contexts/GameContext';
import DungeonView from '../components/game/DungeonView';
import CombatView from '../components/game/CombatView';
import InventoryView from '../components/game/InventoryView';
import GameMenu from '../components/game/GameMenu';
import PlayerStats from '../components/game/PlayerStats';
import PhaserGame from '../game/PhaserGame';
import MultiplayerGame from '../game/MultiplayerGame';
import { socketService } from '../services/socketService';
import type { PartyMember } from '../../../shared/src/types';

const GamePage: React.FC = () => {
  const { state } = useGame();
  const { address } = useAccount();
  const location = useLocation();
  const [gameMode, setGameMode] = useState<'classic' | 'interactive'>('classic');
  
  // Party mode state from navigation
  const partyMode = location.state?.partyMode || false;
  const partyId = location.state?.partyId || null;
  const partyMembers = location.state?.partyMembers || [];
  const autoStartInteractive = location.state?.autoStartInteractive || false;
  
  const [connectedPartyMembers, setConnectedPartyMembers] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<Array<{
    playerId: string;
    playerName?: string;
    message: string;
    timestamp: Date;
    type?: 'message' | 'system' | 'action';
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-start interactive mode for party gameplay
    if (autoStartInteractive && partyMode) {
      setGameMode('interactive');
      // Start the game automatically
      if (!state.gameStarted) {
        // Trigger game start here if needed
      }
    }
    
    if (partyMode && partyId && address) {
      // Store callback references for cleanup
      const handleMemberJoined = (data: any) => {
        setConnectedPartyMembers(prev => new Set([...prev, data.playerId]));
      };
      
      const handleMemberLeft = (data: any) => {
        setConnectedPartyMembers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.playerId);
          return newSet;
        });
      };
      
      const handleMemberDisconnected = (data: any) => {
        setConnectedPartyMembers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.playerId);
          return newSet;
        });
      };
      
      const handleChatMessage = (data: any) => {
        const messageData = {
          playerId: data.playerId,
          playerName: data.playerName || `${data.playerId.slice(0, 6)}...${data.playerId.slice(-4)}`,
          message: data.message,
          timestamp: new Date(data.timestamp || Date.now()),
          type: (data.type || 'message') as 'message' | 'system' | 'action'
        };
        setChatMessages(prev => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => 
            msg.playerId === messageData.playerId && 
            msg.message === messageData.message && 
            Math.abs(msg.timestamp.getTime() - messageData.timestamp.getTime()) < 1000
          );
          
          if (messageExists) {
            return prev;
          }
          
          return [...prev, messageData];
        });
        
        // Increment unread count if chat is closed and message is not from current user
        if (!isChatOpen && data.playerId !== address) {
          setUnreadCount(prev => prev + 1);
        }
      };
      
      const handleDungeonAction = (data: any) => {
        // Handle real-time dungeon actions from other party members
        console.log('Party member action:', data);
      };
      
      const handleMultiplayerPlayerJoined = (data: any) => {
        if (gameMode === 'interactive' && partyMode) {
          // Add system message when player joins multiplayer game
          const joinMessage = {
            playerId: 'system',
            message: `${data.playerName || data.playerId.slice(0, 6) + '...' + data.playerId.slice(-4)} joined the dungeon`,
            timestamp: new Date(),
            type: 'system' as const
          };
          setChatMessages(prev => [...prev, joinMessage]);
          
          window.dispatchEvent(new CustomEvent('multiplayer:player_joined', { 
            detail: data 
          }));
        }
      };
      
      const handleMultiplayerPlayerLeft = (data: any) => {
        if (gameMode === 'interactive' && partyMode) {
          // Add system message when player leaves multiplayer game
          const leaveMessage = {
            playerId: 'system',
            message: `${data.playerName || data.playerId.slice(0, 6) + '...' + data.playerId.slice(-4)} left the dungeon`,
            timestamp: new Date(),
            type: 'system' as const
          };
          setChatMessages(prev => [...prev, leaveMessage]);
          
          window.dispatchEvent(new CustomEvent('multiplayer:player_left', { 
            detail: data 
          }));
        }
      };
      
      const handleMultiplayerLootUpdate = (data: any) => {
        if (gameMode === 'interactive' && partyMode) {
          window.dispatchEvent(new CustomEvent('multiplayer:loot_update', { 
            detail: data 
          }));
        }
      };

      // Connect to socket and join party room
      socketService.connect()
        .then(() => {
          // Join the game first
          socketService.joinGame(address, address);
          
          // Then join the party room
          socketService.joinParty(partyId, address);
          
          // Set up party event listeners
          socketService.on('party:member_joined', handleMemberJoined);
          socketService.on('party:member_left', handleMemberLeft);
          socketService.on('party:member_disconnected', handleMemberDisconnected);
          socketService.on('chat:message', handleChatMessage);
          socketService.on('dungeon:action', handleDungeonAction);
          
          // Only handle multiplayer join/leave for chat notifications
          socketService.on('multiplayer:player_joined', handleMultiplayerPlayerJoined);
          socketService.on('multiplayer:player_left', handleMultiplayerPlayerLeft);
          
          // If starting in interactive mode, join the multiplayer game
          if (gameMode === 'interactive') {
            socketService.joinMultiplayerGame(partyId, {
              playerId: address,
              wallet: address,
              health: state.player?.health || 100,
              maxHealth: state.player?.maxHealth || 100,
              level: state.player?.level || 1
            });
          }
        })
        .catch(console.error);
        
      return () => {
        // Clean up event listeners before leaving
        socketService.off('party:member_joined', handleMemberJoined);
        socketService.off('party:member_left', handleMemberLeft);
        socketService.off('party:member_disconnected', handleMemberDisconnected);
        socketService.off('chat:message', handleChatMessage);
        socketService.off('dungeon:action', handleDungeonAction);
        socketService.off('multiplayer:player_joined', handleMultiplayerPlayerJoined);
        socketService.off('multiplayer:player_left', handleMultiplayerPlayerLeft);
        
        if (partyMode && partyId && address) {
          socketService.leaveParty(partyId, address);
        }
      };
    }
  }, [partyMode, partyId, address]); // Removed isChatOpen from deps to prevent re-registration

  // Handle game mode changes for multiplayer integration
  useEffect(() => {
    if (partyMode && partyId && address && socketService.isConnected) {
      if (gameMode === 'interactive') {
        // Join multiplayer game when switching to interactive mode
        socketService.joinMultiplayerGame(partyId, {
          playerId: address,
          wallet: address,
          health: state.player?.health || 100,
          maxHealth: state.player?.maxHealth || 100,
          level: state.player?.level || 1
        });
      }
    }
  }, [gameMode, partyMode, partyId, address, state.player]);

  // Keyboard shortcuts for chat
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Open chat with 'T' or 'Enter' key (when not in an input)
      if ((e.key === 't' || e.key === 'T' || e.key === 'Enter') && 
          partyMode && 
          !isChatOpen && 
          !(e.target as HTMLElement).matches('input, textarea')) {
        e.preventDefault();
        toggleChat();
      }
      // Close chat with 'Escape'
      if (e.key === 'Escape' && isChatOpen) {
        setIsChatOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [partyMode, isChatOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const sendChatMessage = (message: string) => {
    if (partyMode && partyId && message.trim()) {
      const trimmedMessage = message.trim();
      
      // Handle chat commands
      if (trimmedMessage.startsWith('/')) {
        handleChatCommand(trimmedMessage);
        return;
      }
      
      socketService.sendChatMessage(trimmedMessage, partyId);
      setChatInput('');
    }
  };

  const handleChatCommand = (command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    
    switch (cmd) {
      case '/help':
        const helpMessage = {
          playerId: 'system',
          message: 'Available commands: /help, /clear, /who, /time',
          timestamp: new Date(),
          type: 'system' as const
        };
        setChatMessages(prev => [...prev, helpMessage]);
        break;
        
      case '/clear':
        setChatMessages([]);
        const clearMessage = {
          playerId: 'system',
          message: 'Chat cleared',
          timestamp: new Date(),
          type: 'system' as const
        };
        setChatMessages([clearMessage]);
        break;
        
      case '/who':
        const whoMessage = {
          playerId: 'system',
          message: `Party members online: ${Array.from(connectedPartyMembers).map(id => getPlayerDisplayName(id)).join(', ')}`,
          timestamp: new Date(),
          type: 'system' as const
        };
        setChatMessages(prev => [...prev, whoMessage]);
        break;
        
      case '/time':
        const timeMessage = {
          playerId: 'system',
          message: `Current time: ${new Date().toLocaleString()}`,
          timestamp: new Date(),
          type: 'system' as const
        };
        setChatMessages(prev => [...prev, timeMessage]);
        break;
        
      default:
        const unknownMessage = {
          playerId: 'system',
          message: `Unknown command: ${cmd}. Type /help for available commands.`,
          timestamp: new Date(),
          type: 'system' as const
        };
        setChatMessages(prev => [...prev, unknownMessage]);
    }
    
    setChatInput('');
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChatMessage(chatInput);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadCount(0); // Clear unread count when opening chat
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  };

  const getPlayerDisplayName = (playerId: string) => {
    const member = partyMembers.find((m: PartyMember) => m.walletAddress === playerId);
    return member ? `${member.walletAddress.slice(0, 6)}...${member.walletAddress.slice(-4)}` : 
           `${playerId.slice(0, 6)}...${playerId.slice(-4)}`;
  };

  const renderPartyChatWidget = () => {
    if (!partyMode) return null;
    
    return (
      <div className={`fixed right-4 transition-all duration-300 z-50 ${
        isChatOpen ? 'bottom-4 top-20' : 'bottom-4'
      }`}>
        <div className={`glass-morphism rounded-lg shadow-2xl ${
          isChatOpen ? 'w-80 h-96' : 'w-80 h-auto'
        }`}>
          {/* Chat Header */}
          <div 
            className="flex items-center justify-between p-3 border-b border-purple-500/30 cursor-pointer hover:bg-purple-600/20 transition-colors"
            onClick={toggleChat}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <span className="font-semibold text-white">Party Chat</span>
              <span className="text-xs text-gray-400">
                ({Array.from(connectedPartyMembers).length + (address && connectedPartyMembers.has(address) ? 0 : 1)}/{partyMembers.length} online)
              </span>
              {unreadCount > 0 && !isChatOpen && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <button className="text-purple-300 hover:text-white transition-colors">
              {isChatOpen ? '▼' : '▲'}
            </button>
          </div>

          {/* Chat Content */}
          {isChatOpen && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 h-64">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8">
                    <span>💬</span>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${
                      msg.playerId === address ? 'items-end' : 'items-start'
                    }`}>
                      <div 
                        className={`max-w-[80%] p-2 rounded-lg text-sm transition-all hover:scale-105 ${
                          msg.type === 'system' 
                            ? 'bg-yellow-600/20 text-yellow-300 self-center text-center'
                            : msg.type === 'action'
                            ? 'bg-blue-600/20 text-blue-300 italic'
                            : msg.playerId === address
                            ? 'bg-purple-600/50 text-white'
                            : 'bg-gray-600/50 text-gray-200'
                        }`}
                        title={`Sent at ${msg.timestamp.toLocaleString()}`}
                      >
                        {msg.type !== 'system' && (
                          <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                            {msg.playerName || getPlayerDisplayName(msg.playerId)}
                            {partyMembers.find((m: PartyMember) => m.walletAddress === msg.playerId && m.role === 'leader') && ' 👑'}
                            {connectedPartyMembers.has(msg.playerId) && (
                              <span className="w-2 h-2 bg-green-400 rounded-full" title="Online"></span>
                            )}
                          </div>
                        )}
                        <div className="break-words">{msg.message}</div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-purple-500/30">
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit(e);
                      }
                    }}
                    placeholder="Type a message... (/ for commands)"
                    className="flex-1 bg-gray-700/50 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-400 focus:outline-none text-sm"
                    maxLength={200}
                    disabled={!partyId}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || !partyId}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Send
                  </button>
                </form>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs text-gray-400">
                    {chatInput.length}/200 characters
                  </div>
                  <div className="text-xs text-gray-500">
                    Press Enter to send • Type /help for commands
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderPartyInfo = () => {
    if (!partyMode) return null;
    
    return (
      <div className="glass-morphism p-4 rounded-lg mb-4">
        <h3 className="text-lg font-bold text-white mb-2">
          🚀 Party Mode
          {gameMode === 'interactive' && (
            <span className="ml-2 text-sm bg-green-600/20 text-green-300 px-2 py-1 rounded-full">
              🎮 Multiplayer Active
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-purple-300 mb-1">Party Members ({partyMembers.length})</h4>
            <div className="space-y-1">
              {partyMembers.map((member: PartyMember) => (
                <div key={member.playerId} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    connectedPartyMembers.has(member.walletAddress) ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-gray-300">
                    {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                  </span>
                  {member.role === 'leader' && <span className="text-yellow-400">👑</span>}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-purple-300 mb-1">Cross-Chain Support</h4>
            <div className="text-xs text-gray-400">
              {Array.from(new Set(partyMembers.map(m => m.chainId))).map(chainId => (
                <div key={String(chainId)}>Chain {String(chainId)}</div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-purple-300 mb-1">Party Chat</h4>
            <div className="text-xs text-gray-400 space-y-1 max-h-16 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="text-gray-500">No messages yet</div>
              ) : (
                chatMessages.slice(-2).map((msg, i) => (
                  <div key={i} className="truncate">
                    <span className="text-purple-300">
                      {msg.playerName || getPlayerDisplayName(msg.playerId)}:
                    </span>{' '}
                    {msg.message}
                  </div>
                ))
              )}
              {!isChatOpen && chatMessages.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChat();
                  }}
                  className="text-purple-400 hover:text-purple-300 text-xs underline"
                >
                  Open chat ({unreadCount > 0 ? `${unreadCount} new` : `${chatMessages.length} messages`})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGameContent = () => {
    if (!state.gameStarted) {
      return <GameMenu />;
    }

    if (gameMode === 'interactive') {
      // Use MultiplayerGame for party mode, PhaserGame for solo
      if (partyMode && partyId && partyMembers.length > 0) {
        return (
          <div className="relative w-full h-full">
            <MultiplayerGame 
              width={800} 
              height={600} 
              partyId={partyId}
              partyMembers={partyMembers}
            />
          </div>
        );
      } else {
        return (
          <div className="relative w-full h-full">
            <PhaserGame width={800} height={600} />
          </div>
        );
      }
    }

    // Classic mode
    switch (state.gameMode) {
      case 'dungeon':
        return <DungeonView />;
      case 'combat':
        return <CombatView />;
      case 'inventory':
        return <InventoryView />;
      default:
        return <DungeonView />;
    }
  };

  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Party Information */}
        {renderPartyInfo()}
        
        {/* Game Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="glass-morphism p-2 rounded-lg">
            <button
              onClick={() => setGameMode('classic')}
              className={`px-4 py-2 rounded-lg mr-2 transition-colors ${
                gameMode === 'classic' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              📝 Classic Mode
            </button>
            <button
              onClick={() => setGameMode('interactive')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                gameMode === 'interactive' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              🎮 Interactive Mode
            </button>
          </div>
        </div>

        {state.gameStarted && gameMode === 'classic' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-1">
              <PlayerStats />
            </div>
            <div className="lg:col-span-3">
              <div className="glass-morphism p-4 rounded-lg">
                <div className="flex space-x-4 mb-4">
                  <span className="text-purple-300">Floor: {state.dungeonData.currentFloor}</span>
                  <span className="text-blue-300">Room: {state.dungeonData.currentRoom}</span>
                  <span className="text-green-300">Mode: {state.gameMode}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="game-content">
          {renderGameContent()}
        </div>

        {/* Mode Descriptions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-morphism p-4 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">📝 Classic Mode</h3>
            <p className="text-sm text-gray-300">
              Traditional turn-based RPG with menu-driven combat and text descriptions. 
              Perfect for strategic gameplay and deeper story immersion.
              {partyMode && <span className="text-purple-300 block mt-2">🚀 Party chat available - coordinate with your team!</span>}
            </p>
          </div>
          <div className="glass-morphism p-4 rounded-lg">
            <h3 className="text-lg font-bold text-white mb-2">🎮 Interactive Mode</h3>
            <p className="text-sm text-gray-300">
              Real-time 2D dungeon crawler with direct character control. 
              Move with WASD, explore visually, and engage in dynamic combat.
              {partyMode && <span className="text-green-300 block mt-2">👥 Full multiplayer support - play together in real-time! See party members move and fight alongside you.</span>}
            </p>
          </div>
        </div>

        {/* Party Chat Widget */}
        {renderPartyChatWidget()}
      </div>
    </div>
  );
};

export default GamePage;
