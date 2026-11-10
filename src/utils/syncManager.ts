import { Peer, DataConnection } from 'peerjs';
import { Player, GameModuleId } from '../types';

export interface SyncMessage {
  type: 
    | 'SYNC_FULL_STATE'
    | 'UPDATE_PLAYERS'
    | 'SELECT_GAME'
    | 'SUBMIT_VOTE'
    | 'START_VOTING'
    | 'NEXT_QUESTION'
    | 'USE_HINT'
    | 'SKIP_QUESTION'
    | 'CONTROLLER_READY';
  payload?: any;
}

export interface SharedGameState {
  players: Player[];
  activeGame: GameModuleId | null;
  gameStep: string;
  questionData?: any;
  currentTurnPlayerId?: number;
  votes?: Record<number, any>;
  usedHints?: Record<number, boolean>;
  results?: any;
  roomCode: string;
}

type MessageHandler = (msg: SyncMessage) => void;

class SyncManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private onConnectionStatusChange: ((status: 'disconnected' | 'connecting' | 'connected', peerId?: string) => void) | null = null;

  public roomCode: string = '';
  public role: 'tv' | 'controller' = 'tv';
  public isConnected: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('giggle_game_sync');
        this.broadcastChannel.onmessage = (event) => {
          this.notifyHandlers(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this environment', e);
      }
    }
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public setStatusCallback(cb: (status: 'disconnected' | 'connecting' | 'connected', peerId?: string) => void) {
    this.onConnectionStatusChange = cb;
  }

  private notifyHandlers(msg: SyncMessage) {
    this.messageHandlers.forEach((handler) => handler(msg));
  }

  // Initialize Host (TV Screen)
  public initHost(customRoomCode?: string) {
    this.role = 'tv';
    this.roomCode = customRoomCode || this.generateRoomCode();
    const hostPeerId = `giggle-${this.roomCode.toLowerCase()}`;

    if (this.peer) {
      this.peer.destroy();
    }

    try {
      this.peer = new Peer(hostPeerId, {
        debug: 1,
      });

      this.peer.on('open', (id) => {
        if (this.onConnectionStatusChange) {
          this.onConnectionStatusChange('connecting', id);
        }
      });

      this.peer.on('connection', (conn) => {
        this.connection = conn;
        this.setupConnectionHandlers(conn);
        this.isConnected = true;
        if (this.onConnectionStatusChange) {
          this.onConnectionStatusChange('connected', conn.peer);
        }
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS Host error (falling back to broadcast / local):', err);
      });
    } catch (e) {
      console.warn('Failed to start PeerJS host:', e);
    }
  }

  // Initialize Client (Phone Controller)
  public initController(targetRoomCode: string) {
    this.role = 'controller';
    this.roomCode = targetRoomCode.toUpperCase();
    const targetPeerId = `giggle-${this.roomCode.toLowerCase()}`;

    if (this.peer) {
      this.peer.destroy();
    }

    try {
      this.peer = new Peer({
        debug: 1,
      });

      this.peer.on('open', () => {
        if (this.onConnectionStatusChange) {
          this.onConnectionStatusChange('connecting');
        }
        // Connect to the TV Host
        const conn = this.peer!.connect(targetPeerId, {
          reliable: true,
        });
        this.connection = conn;
        this.setupConnectionHandlers(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS Client connection error:', err);
      });
    } catch (e) {
      console.warn('Failed to start PeerJS client:', e);
    }
  }

  private setupConnectionHandlers(conn: DataConnection) {
    conn.on('open', () => {
      this.isConnected = true;
      if (this.onConnectionStatusChange) {
        this.onConnectionStatusChange('connected', conn.peer);
      }
      this.send({ type: 'CONTROLLER_READY', payload: { role: this.role } });
    });

    conn.on('data', (data: any) => {
      this.notifyHandlers(data as SyncMessage);
    });

    conn.on('close', () => {
      this.isConnected = false;
      if (this.onConnectionStatusChange) {
        this.onConnectionStatusChange('disconnected');
      }
    });

    conn.on('error', (err) => {
      console.warn('DataConnection error:', err);
    });
  }

  // Send message across both WebRTC Peer and BroadcastChannel
  public send(msg: SyncMessage) {
    // 1. BroadcastChannel (for same-machine multi-tab / testing)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (e) {
        console.warn('BroadcastChannel send error:', e);
      }
    }

    // 2. WebRTC DataConnection (for phone-to-TV across different devices)
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(msg);
      } catch (e) {
        console.warn('WebRTC send error:', e);
      }
    }
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export const syncManager = new SyncManager();
