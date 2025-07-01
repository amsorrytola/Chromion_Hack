import io, { Socket } from 'socket.io-client';

export interface SocketEvents {
  'player:joined': (data: { success: boolean }) => void;
  'party:joined': (data: { partyId: string; success: boolean }) => void;
  'party:left': (data: { partyId: string; success: boolean }) => void;
  'party:member_joined': (data: { playerId: string }) => void;
  'party:member_left': (data: { playerId: string }) => void;
  'party:member_disconnected': (data: { playerId: string }) => void;
  'party:request_received': (data: { requestId: string; playerName: string; message?: string }) => void;
  'party:request_response': (data: { approved: boolean; partyName: string }) => void;
  'dungeon:action': (data: { playerId: string; action: string; payload: any; timestamp: Date }) => void;
  'chat:message': (data: { playerId: string; message: string; timestamp: Date }) => void;
  'multiplayer:player_move': (data: { playerId: string; action: string; payload: any; timestamp: Date }) => void;
  'multiplayer:player_action': (data: { playerId: string; action: string; payload: any; timestamp: Date }) => void;
  'multiplayer:player_joined': (data: { playerId: string; action: string; payload: any; timestamp: Date }) => void;
  'multiplayer:player_left': (data: { playerId: string; action: string; payload: any; timestamp: Date }) => void;
  'multiplayer:game_state': (data: { playerId: string; action: string; payload: any; timestamp: Date }) => void;
  'multiplayer:enemy_update': (data: { playerId: string; action: string; payload: any; timestamp: Date }) => void;
  'multiplayer:loot_update': (data: { playerId: string; action: string; payload: any; timestamp: Date }) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(serverUrl: string = 'http://localhost:3001'): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Player actions
  joinGame(playerId: string, wallet: string): void {
    this.emit('player:join', { playerId, wallet });
  }

  // Party actions
  joinParty(partyId: string, playerId: string): void {
    this.emit('party:join', { partyId, playerId });
  }

  leaveParty(partyId: string, playerId: string): void {
    this.emit('party:leave', { partyId, playerId });
  }

  // Dungeon actions
  sendDungeonAction(partyId: string, action: string, payload: any): void {
    this.emit('dungeon:action', { partyId, action, payload });
  }

  // Chat
  sendChatMessage(message: string, partyId?: string): void {
    this.emit('chat:message', { message, partyId });
  }

  // Multiplayer game events
  joinMultiplayerGame(partyId: string, playerData: any): void {
    this.emit('multiplayer:join_game', { partyId, playerData });
  }

  leaveMultiplayerGame(partyId: string, playerId: string): void {
    this.emit('multiplayer:leave_game', { partyId, playerId });
  }

  // Event handling
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    if (this.socket) {
      this.socket.on(event as string, callback as any);
    }
  }

  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }

    if (this.socket) {
      this.socket.off(event as string, callback as any);
    }
  }

  private emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
