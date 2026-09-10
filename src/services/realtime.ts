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

class RealtimeService {
  private channel: BroadcastChannel | null = null;
  private socket: WebSocket | null = null;
  private peer: Peer | null = null;
  private peerConnections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  private currentRoomId: string = '';
  private lastProgressBroadcast: number = 0;

  public connectRoom(roomId: string) {
    if (this.currentRoomId === roomId && (this.channel || this.socket || this.peer)) return;

    this.disconnect();
    this.currentRoomId = roomId;

    const state = useRaceStore.getState();
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

    // 2. Local/Public WebSocket (Direct Node server relay via /ws endpoint)
    try {
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
    } catch {
      // WebSocket fallback
    }

    // 3. WebRTC PeerJS P2P DataChannel (Global P2P Fallback via PeerJS Cloud)
    try {
      if (isHost) {
        this.peer = new Peer(hostPeerId);
        
        this.peer.on('error', (err) => {
          if (err.type === 'unavailable-id') {
            this.peer = new Peer();
            this.setupHostListeners();
          }
        });

        this.setupHostListeners();
      } else {
        // Guest PeerJS instance
        this.peer = new Peer();

        this.peer.on('open', () => {
          if (!this.peer) return;
          const conn = this.peer.connect(hostPeerId);
          this.hostConnection = conn;

          conn.on('open', () => {
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

          conn.on('close', () => {
            this.hostConnection = null;
          });
        });
      }
    } catch {
      // PeerJS fallback
    }

    // Announce join and request state sync periodically until connected to room
    this.announceJoin(roomId);

    // Periodic sync request for joiners (every 2s until room has > 1 player)
    this.syncTimer = setInterval(() => {
      const s = useRaceStore.getState();
      if (Object.keys(s.players).length <= 1) {
        this.announceJoin(roomId);
      }
    }, 2000);
  }

  private setupHostListeners() {
    if (!this.peer) return;
    this.peer.on('connection', (conn) => {
      this.peerConnections.set(conn.peer, conn);

      conn.on('open', () => {
        // Send state sync when new guest connects
        const state = useRaceStore.getState();
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
      });

      conn.on('data', (data) => {
        try {
          const msg = JSON.parse(data as string) as RealtimeMessage;
          this.handleIncomingMessage(msg);

          // Host relays message to all other guests
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

  public disconnect() {
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
    if (!isFinished && now - this.lastProgressBroadcast < 150) {
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
  }

  public broadcastRoomStateChange(status: RoomStatus, targetText: string, countdownSec?: number) {
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
              players: state.players,
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
              players: state.players,
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
          players: { ...state.players, ...players },
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
        break;
      }
    }
  }
}

export const realtimeService = new RealtimeService();
