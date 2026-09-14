import { Peer, type DataConnection } from 'peerjs';
import { useRaceStore } from '../store/useRaceStore';
import { useTypingStore } from '../store/useTypingStore';
import type { Player, RoomStatus, TextLanguage, TextMode, TextLength } from '../types/game';

type RealtimeMessage =
  | { event: 'join_room'; payload: { roomId: string; player: Player; roomState?: { targetText: string; status: RoomStatus; textLanguage: TextLanguage; textMode: TextMode; textLength: TextLength; hostId: string } } }
  | { event: 'player_progress'; payload: { roomId: string; playerId: string; progress: number; wpm: number; accuracy: number; isFinished: boolean; finishTime?: number } }
  | { event: 'player_ready'; payload: { roomId: string; playerId: string; isReady: boolean } }
  | { event: 'kick_player'; payload: { roomId: string; playerId: string } }
  | { event: 'room_state_change'; payload: { roomId: string; status: RoomStatus; targetText: string; countdownSec?: number } }
  | { event: 'host_settings_change'; payload: { roomId: string; textLanguage: TextLanguage; textMode: TextMode; textLength: TextLength; targetText: string } }
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
  private onKickedListener: (() => void) | null = null;

  public setOnRoomNotFound(cb: (roomId: string) => void) {
    this.onRoomNotFoundListener = cb;
  }

  public setOnKicked(cb: () => void) {
    this.onKickedListener = cb;
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
            textMode: state.textMode,
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

  public broadcastPlayerReady(isReady: boolean) {
    const state = useRaceStore.getState();
    state.updatePlayer(state.localPlayerId, { isReady });

    this.broadcast({
      event: 'player_ready',
      payload: {
        roomId: this.currentRoomId,
        playerId: state.localPlayerId,
        isReady
      }
    });
  }

  public broadcastKickPlayer(playerId: string) {
    const state = useRaceStore.getState();
    state.removePlayer(playerId);

    this.broadcast({
      event: 'kick_player',
      payload: {
        roomId: this.currentRoomId,
        playerId
      }
    });
  }

  public broadcastHostSettings(textLanguage: TextLanguage, textMode: TextMode, textLength: TextLength, targetText: string) {
    const state = useRaceStore.getState();
    state.setRoomSettings(textLanguage, textMode, textLength);
    state.setTargetText(targetText);
    useTypingStore.getState().resetTyping();

    this.broadcast({
      event: 'host_settings_change',
      payload: {
        roomId: this.currentRoomId,
        textLanguage,
        textMode,
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

  // --- Dedicated Event Handlers (Extract Method Pattern) ---

  private onJoinRoom(payload: Extract<RealtimeMessage, { event: 'join_room' }>['payload']) {
    const state = useRaceStore.getState();
    const { player, roomState } = payload;

    if (player.id === state.localPlayerId) return;

    state.joinRoom(this.currentRoomId, player);

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
      state.setTargetText(roomState.targetText);
      state.setRoomStatus(roomState.status);
      useRaceStore.setState({ hostId: roomState.hostId });
    }
  }

  private onRequestSync() {
    const state = useRaceStore.getState();
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
  }

  private onSyncState(payload: Extract<RealtimeMessage, { event: 'sync_state' }>['payload']) {
    const { players, targetText, status, hostId } = payload;
    useRaceStore.setState({
      players: { ...useRaceStore.getState().players, ...players },
      targetText,
      status,
      hostId
    });
    useTypingStore.getState().resetTyping();
  }

  private onPlayerProgress(payload: Extract<RealtimeMessage, { event: 'player_progress' }>['payload']) {
    const state = useRaceStore.getState();
    const { playerId, progress, wpm, accuracy, isFinished, finishTime } = payload;
    state.updatePlayer(playerId, {
      progress,
      wpm,
      accuracy,
      isFinished,
      finishTime
    });
    this.checkAllFinished();
  }

  private onPlayerReady(payload: Extract<RealtimeMessage, { event: 'player_ready' }>['payload']) {
    const state = useRaceStore.getState();
    const { playerId, isReady } = payload;
    state.updatePlayer(playerId, { isReady });
  }

  private onKickPlayer(payload: Extract<RealtimeMessage, { event: 'kick_player' }>['payload']) {
    const state = useRaceStore.getState();
    const { playerId } = payload;
    if (playerId === state.localPlayerId) {
      this.disconnect();
      state.resetRaceRoom();
      useTypingStore.getState().resetTyping();
      if (this.onKickedListener) {
        this.onKickedListener();
      }
    } else {
      state.removePlayer(playerId);
      this.checkAllFinished();
    }
  }

  private onRoomStateChange(payload: Extract<RealtimeMessage, { event: 'room_state_change' }>['payload']) {
    const state = useRaceStore.getState();
    const { status, targetText, countdownSec } = payload;
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
  }

  private onHostSettingsChange(payload: Extract<RealtimeMessage, { event: 'host_settings_change' }>['payload']) {
    const state = useRaceStore.getState();
    const { textLanguage, textMode, textLength, targetText } = payload;
    state.setRoomSettings(textLanguage, textMode, textLength);
    state.setTargetText(targetText);
  }

  private onPlayerLeave(payload: Extract<RealtimeMessage, { event: 'player_leave' }>['payload']) {
    const state = useRaceStore.getState();
    state.removePlayer(payload.playerId);
    const newState = useRaceStore.getState();
    if (newState.hostId === state.localPlayerId && (!this.peer || this.peer.destroyed)) {
      const cleanRoomId = this.currentRoomId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      this.initHostPeer(`tr-host-${cleanRoomId}`);
    }
    this.checkAllFinished();
  }

  // --- Handler Map Dispatch Table Pattern ---
  private messageHandlers: { [K in RealtimeMessage['event']]?: (payload: any) => void } = {
    join_room: (p) => this.onJoinRoom(p),
    request_sync: () => this.onRequestSync(),
    sync_state: (p) => this.onSyncState(p),
    player_progress: (p) => this.onPlayerProgress(p),
    player_ready: (p) => this.onPlayerReady(p),
    kick_player: (p) => this.onKickPlayer(p),
    room_state_change: (p) => this.onRoomStateChange(p),
    host_settings_change: (p) => this.onHostSettingsChange(p),
    player_leave: (p) => this.onPlayerLeave(p)
  };

  private handleIncomingMessage(msg: RealtimeMessage) {
    if (!msg || !msg.payload || msg.payload.roomId !== this.currentRoomId) return;

    const handler = this.messageHandlers[msg.event];
    if (handler) {
      handler(msg.payload);
    }
  }
}

export const realtimeService = new RealtimeService();

