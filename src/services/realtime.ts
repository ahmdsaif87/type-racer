import { Peer, type DataConnection } from 'peerjs';
import { useRaceStore } from '../store/useRaceStore';
import { useTypingStore } from '../store/useTypingStore';
import type { Player, RoomStatus, TextLanguage, TextLength } from '../types/game';

type RealtimeMessage =
  | { event: 'join_room'; payload: { roomId: string; player: Player; roomState?: { targetText: string; status: RoomStatus; textLanguage: TextLanguage; textLength: TextLength; hostId: string } } }
  | { event: 'player_progress'; payload: { roomId: string; playerId: string; progress: number; wpm: number; accuracy: number; isFinished: boolean; finishTime?: number } }
  | { event: 'room_state_change'; payload: { roomId: string; status: RoomStatus; targetText: string; countdownSec?: number } }
  | { event: 'host_settings_change'; payload: { roomId: string; textLanguage: TextLanguage; textLength: TextLength; targetText: string } }
  | { event: 'sync_state'; payload: { roomId: string; players: Record<string, Player>; targetText: string; status: RoomStatus; hostId: string } }
  | { event: 'request_sync'; payload: { roomId: string; requesterId: string } }
  | { event: 'player_leave'; payload: { roomId: string; playerId: string } };

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

class RealtimeService {
  private channel: BroadcastChannel | null = null;
  private socket: WebSocket | null = null;
  private peer: Peer | null = null;
  private peerConnections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  private currentRoomId: string = '';
  private lastProgressBroadcast: number = 0;
  private isConnectingHost: boolean = false;
  private joinAttemptStartTime: number = 0;
  private onRoomNotFoundListener: ((roomId: string) => void) | null = null;

  public setOnRoomNotFound(cb: (roomId: string) => void) {
    this.onRoomNotFoundListener = cb;
  }

  public connectRoom(roomId: string) {
    if (this.currentRoomId === roomId && (this.channel || this.socket || this.peer)) return;

    this.disconnect();
    this.currentRoomId = roomId;
    this.joinAttemptStartTime = Date.now();

    const state = useRaceStore.getState();

    // Solo practice mode runs 100% locally - bypass network peer registration
    if (state.isSinglePlayer) {
      return;
    }

    const isHost = state.hostId === state.localPlayerId;
    const cleanRoomId = roomId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const hostPeerId = `tr-host-${cleanRoomId}`;

    // 1. BroadcastChannel (for multi-tab on same browser instance)
    try {
      this.channel = new BroadcastChannel(`typeracer_room_${roomId}`);
      this.channel.onmessage = (event: MessageEvent<RealtimeMessage>) => {
        this.handleIncomingMessage(event.data);
      };
    } catch {
      // BroadcastChannel fallback
    }

    // 2. Local/Public WebSocket (Direct Node server relay via /ws endpoint if available)
    try {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          this.announceJoin(roomId);
        };

        this.socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as RealtimeMessage;
            this.handleIncomingMessage(msg);
          } catch {
            // ignore non-json
          }
        };

        this.socket.onerror = () => {
          // Silent fallback on non-websocket hosts
        };
      }
    } catch {
      // WebSocket fallback
    }

    // 3. WebRTC PeerJS P2P DataChannel (Global P2P via PeerJS Cloud with STUN)
    try {
      if (isHost) {
        this.initHostPeer(hostPeerId);
      } else {
        this.initGuestPeer(hostPeerId, roomId);
      }
    } catch {
      // PeerJS fallback
    }

    // Announce join for local channels
    this.announceJoin(roomId);
  }

  private initHostPeer(hostPeerId: string) {
    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
    }

    this.peer = new Peer(hostPeerId, PEER_CONFIG);

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Peer ID already claimed or stale, retry after cleanup
        setTimeout(() => {
          if (this.peer && !this.peer.destroyed) {
            this.peer.destroy();
          }
          this.initHostPeer(hostPeerId);
        }, 1500);
      }
    });

    this.setupHostListeners();
  }

  private initGuestPeer(hostPeerId: string, roomId: string) {
    this.peer = new Peer(PEER_CONFIG);

    const connectToHost = () => {
      if (!this.peer || this.peer.destroyed) return;
      if (this.hostConnection && this.hostConnection.open) return;
      if (this.isConnectingHost) return;

      try {
        this.isConnectingHost = true;
        const conn = this.peer.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on('open', () => {
          this.isConnectingHost = false;
          // Send instant join & sync request over open data connection
          const state = useRaceStore.getState();
          const localPlayer = state.players[state.localPlayerId];
          if (localPlayer) {
            conn.send(JSON.stringify({
              event: 'join_room',
              payload: { roomId, player: localPlayer }
            }));
            conn.send(JSON.stringify({
              event: 'request_sync',
              payload: { roomId, requesterId: state.localPlayerId }
            }));
          }
          this.announceJoin(roomId);
        });

        conn.on('data', (data) => {
          try {
            const msg = JSON.parse(data as string) as RealtimeMessage;
            this.handleIncomingMessage(msg);
          } catch {
            // ignore
          }
        });

        conn.on('error', () => {
          this.isConnectingHost = false;
          this.hostConnection = null;
        });

        conn.on('close', () => {
          this.isConnectingHost = false;
          this.hostConnection = null;
        });
      } catch {
        this.isConnectingHost = false;
        this.hostConnection = null;
      }
    };

    this.peer.on('open', () => {
      connectToHost();
    });

    this.peer.on('error', () => {
      this.isConnectingHost = false;
      this.hostConnection = null;
    });

    // Periodic check: if no host responds after 3.5 seconds, notify room not found
    this.syncTimer = setInterval(() => {
      const s = useRaceStore.getState();
      const hasOtherPlayers = Object.keys(s.players).length > 1;
      const timeElapsed = Date.now() - this.joinAttemptStartTime;

      if (!hasOtherPlayers && !s.hostId && timeElapsed > 3500) {
        if (this.onRoomNotFoundListener) {
          this.onRoomNotFoundListener(roomId);
        }
        this.disconnect();
        return;
      }

      if (!this.hostConnection || !this.hostConnection.open) {
        connectToHost();
      }
    }, 1500);
  }

  private setupHostListeners() {
    if (!this.peer) return;
    this.peer.on('connection', (conn) => {
      this.peerConnections.set(conn.peer, conn);

      const sendCurrentState = () => {
        const state = useRaceStore.getState();
        if (conn.open) {
          conn.send(JSON.stringify({
            event: 'sync_state',
            payload: {
              roomId: this.currentRoomId,
              players: state.players,
              targetText: state.targetText,
              status: state.status,
              hostId: state.hostId
            }
          }));
        }
      };

      if (conn.open) {
        sendCurrentState();
      } else {
        conn.on('open', () => {
          sendCurrentState();
        });
      }

      conn.on('data', (data) => {
        try {
          const msg = JSON.parse(data as string) as RealtimeMessage;
          this.handleIncomingMessage(msg);

          // Host relays message to all other connected guests
          this.peerConnections.forEach((otherConn, pid) => {
            if (pid !== conn.peer && otherConn.open) {
              otherConn.send(data as string);
            }
          });
        } catch {
          // ignore
        }
      });

      conn.on('close', () => {
        this.peerConnections.delete(conn.peer);
      });
      conn.on('error', () => {
        this.peerConnections.delete(conn.peer);
      });
    });
  }

  private announceJoin(roomId: string) {
    const state = useRaceStore.getState();
    const localPlayer = state.players[state.localPlayerId];
    if (localPlayer) {
      this.broadcast({
        event: 'join_room',
        payload: {
          roomId,
          player: localPlayer,
          roomState: state.hostId === localPlayer.id ? {
            targetText: state.targetText,
            status: state.status,
            textLanguage: state.textLanguage,
            textLength: state.textLength,
            hostId: state.hostId
          } : undefined
        }
      });
      this.broadcast({
        event: 'request_sync',
        payload: { roomId, requesterId: state.localPlayerId }
      });
    }
  }

  private finishTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  private checkAllFinished() {
    const state = useRaceStore.getState();
    if (state.status !== 'IN_RACE') return;

    const playerList = Object.values(state.players);
    if (playerList.length === 0) return;

    const allFinished = state.isSinglePlayer || playerList.every(p => p.isFinished || p.progress >= 100);
    const finishedCount = playerList.filter(p => p.isFinished || p.progress >= 100).length;

    if (allFinished) {
      if (this.finishTimeoutTimer) {
        clearTimeout(this.finishTimeoutTimer);
        this.finishTimeoutTimer = null;
      }
      this.broadcastRoomStateChange('FINISHED', state.targetText);
    } else if (finishedCount >= 1 && !this.finishTimeoutTimer && !state.isSinglePlayer) {
      // 30-second safety timeout if a player drops connection or takes too long
      this.finishTimeoutTimer = setTimeout(() => {
        const currentState = useRaceStore.getState();
        if (currentState.status === 'IN_RACE') {
          this.broadcastRoomStateChange('FINISHED', currentState.targetText);
        }
        this.finishTimeoutTimer = null;
      }, 30000);
    }
  }

  public disconnect() {
    this.isConnectingHost = false;
    if (this.finishTimeoutTimer) {
      clearTimeout(this.finishTimeoutTimer);
      this.finishTimeoutTimer = null;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.channel) {
      const state = useRaceStore.getState();
      this.broadcast({
        event: 'player_leave',
        payload: { roomId: this.currentRoomId, playerId: state.localPlayerId }
      });
      this.channel.close();
      this.channel = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.peerConnections.clear();
  }

  public broadcastProgress(progress: number, wpm: number, accuracy: number, isFinished: boolean, finishTime?: number) {
    const now = Date.now();
    if (!isFinished && progress < 100 && now - this.lastProgressBroadcast < 80) {
      return;
    }

    this.lastProgressBroadcast = now;
    const state = useRaceStore.getState();

    state.updatePlayer(state.localPlayerId, {
      progress,
      wpm,
      accuracy,
      isFinished,
      finishTime
    });

    this.broadcast({
      event: 'player_progress',
      payload: {
        roomId: this.currentRoomId,
        playerId: state.localPlayerId,
        progress,
        wpm,
        accuracy,
        isFinished,
        finishTime
      }
    });

    if (isFinished) {
      this.checkAllFinished();
    }
  }

  public broadcastRoomStateChange(status: RoomStatus, targetText: string, countdownSec?: number) {
    if (this.finishTimeoutTimer) {
      clearTimeout(this.finishTimeoutTimer);
      this.finishTimeoutTimer = null;
    }

    const state = useRaceStore.getState();
    state.setRoomStatus(status);

    if (status === 'COUNTDOWN') {
      useTypingStore.getState().resetTyping();
    }

    if (targetText) {
      state.setTargetText(targetText);
    }

    if (countdownSec !== undefined) {
      state.setCountdownSec(countdownSec);
    }

    this.broadcast({
      event: 'room_state_change',
      payload: {
        roomId: this.currentRoomId,
        status,
        targetText: state.targetText,
        countdownSec
      }
    });
  }

  public broadcastHostSettings(textLanguage: TextLanguage, textLength: TextLength, targetText: string) {
    const state = useRaceStore.getState();
    state.setRoomSettings(textLanguage, textLength);
    state.setTargetText(targetText);
    useTypingStore.getState().resetTyping();

    this.broadcast({
      event: 'host_settings_change',
      payload: {
        roomId: this.currentRoomId,
        textLanguage,
        textLength,
        targetText
      }
    });
  }

  private broadcast(msg: RealtimeMessage) {
    const msgStr = JSON.stringify(msg);

    // 1. BroadcastChannel
    if (this.channel) {
      this.channel.postMessage(msg);
    }

    // 2. WebSocket
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(msgStr);
    }

    // 3. PeerJS DataChannels
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(msgStr);
    }

    if (this.peerConnections.size > 0) {
      this.peerConnections.forEach((conn) => {
        if (conn.open) {
          conn.send(msgStr);
        }
      });
    }
  }

  private handleIncomingMessage(msg: RealtimeMessage) {
    const state = useRaceStore.getState();
    if (msg.payload.roomId !== this.currentRoomId) return;

    switch (msg.event) {
      case 'join_room': {
        const { player, roomState } = msg.payload;

        // Don't duplicate self
        if (player.id === state.localPlayerId) break;

        // Add joining player to state
        state.joinRoom(this.currentRoomId, player);

        // If I am host, send my authoritative state back to new joiner
        if (state.hostId === state.localPlayerId) {
          this.broadcast({
            event: 'sync_state',
            payload: {
              roomId: this.currentRoomId,
              players: useRaceStore.getState().players,
              targetText: state.targetText,
              status: state.status,
              hostId: state.hostId
            }
          });
        } else if (roomState && roomState.hostId) {
          // If joined a room with existing host state
          state.setTargetText(roomState.targetText);
          state.setRoomStatus(roomState.status);
          useRaceStore.setState({ hostId: roomState.hostId });
        }
        break;
      }

      case 'request_sync': {
        if (state.hostId === state.localPlayerId) {
          this.broadcast({
            event: 'sync_state',
            payload: {
              roomId: this.currentRoomId,
              players: useRaceStore.getState().players,
              targetText: state.targetText,
              status: state.status,
              hostId: state.hostId
            }
          });
        }
        break;
      }

      case 'sync_state': {
        const { players, targetText, status, hostId } = msg.payload;
        useRaceStore.setState({
          players: { ...useRaceStore.getState().players, ...players },
          targetText,
          status,
          hostId
        });
        useTypingStore.getState().resetTyping();
        break;
      }

      case 'player_progress': {
        const { playerId, progress, wpm, accuracy, isFinished, finishTime } = msg.payload;
        state.updatePlayer(playerId, {
          progress,
          wpm,
          accuracy,
          isFinished,
          finishTime
        });
        this.checkAllFinished();
        break;
      }

      case 'room_state_change': {
        const { status, targetText, countdownSec } = msg.payload;
        state.setRoomStatus(status);
        if (status === 'COUNTDOWN') {
          useTypingStore.getState().resetTyping();
        }
        if (targetText) {
          state.setTargetText(targetText);
        }
        if (countdownSec !== undefined) {
          state.setCountdownSec(countdownSec);
        }
        break;
      }

      case 'host_settings_change': {
        const { textLanguage, textLength, targetText } = msg.payload;
        state.setRoomSettings(textLanguage, textLength);
        state.setTargetText(targetText);
        break;
      }

      case 'player_leave': {
        state.removePlayer(msg.payload.playerId);
        this.checkAllFinished();
        break;
      }
    }
  }
}

export const realtimeService = new RealtimeService();

