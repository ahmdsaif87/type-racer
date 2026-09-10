import { create } from 'zustand';
import type { Player, RoomStatus, TextLanguage, TextLength, CarColorId } from '../types/game';
import type { UiLanguage } from '../data/i18n';
import { getRandomText } from '../data/texts';

interface RaceState {
  roomId: string;
  status: RoomStatus;
  hostId: string;
  targetText: string;
  textLanguage: TextLanguage;
  textLength: TextLength;
  uiLanguage: UiLanguage;
  players: Record<string, Player>;
  countdownSec: number;
  localPlayerId: string;
  localPlayerName: string;
  localPlayerColor: CarColorId;
  isSinglePlayer: boolean;
  customText: string;

  // Actions
  setLocalPlayer: (name: string, color: CarColorId) => void;
  setUiLanguage: (lang: UiLanguage) => void;
  createRoom: (roomId: string) => void;
  joinExistingRoom: (roomId: string) => void;
  startSinglePlayer: (customText?: string) => void;
  joinRoom: (roomId: string, player: Player) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  removePlayer: (playerId: string) => void;
  setRoomStatus: (status: RoomStatus) => void;
  setRoomSettings: (lang: TextLanguage, length: TextLength, customTxt?: string) => void;
  setTargetText: (text: string) => void;
  setCountdownSec: (sec: number) => void;
  resetRaceRoom: () => void;
}

const DEFAULT_PLAYER_NAME = 'racer_' + Math.floor(1000 + Math.random() * 9000);

const getSessionPlayerId = () => {
  let pid = sessionStorage.getItem('typeracer_session_pid');
  if (!pid) {
    pid = 'p-' + Math.floor(10000 + Math.random() * 90000);
    sessionStorage.setItem('typeracer_session_pid', pid);
  }
  return pid;
};

export const MAX_PLAYERS_PER_ROOM = 5;

export const useRaceStore = create<RaceState>((set, get) => ({
  roomId: '',
  status: 'LOBBY',
  hostId: '',
  targetText: '',
  textLanguage: 'ID',
  textLength: 25,
  uiLanguage: (localStorage.getItem('typeracer_lang') as UiLanguage) || 'id',
  players: {},
  countdownSec: 3,
  localPlayerId: getSessionPlayerId(),
  localPlayerName: localStorage.getItem('typeracer_alias') || DEFAULT_PLAYER_NAME,
  localPlayerColor: (localStorage.getItem('typeracer_color') as CarColorId) || 'cyan',
  isSinglePlayer: false,
  customText: '',

  setLocalPlayer: (name: string, color: CarColorId) => {
    localStorage.setItem('typeracer_alias', name);
    localStorage.setItem('typeracer_color', color);
    set({ localPlayerName: name, localPlayerColor: color });
  },

  setUiLanguage: (lang: UiLanguage) => {
    localStorage.setItem('typeracer_lang', lang);
    document.documentElement.lang = lang;
    set({ uiLanguage: lang });
  },

  createRoom: (roomId: string) => {
    const { localPlayerId, localPlayerName, localPlayerColor, textLanguage, textLength } = get();
    const initialText = getRandomText(textLanguage, textLength);

    const hostPlayer: Player = {
      id: localPlayerId,
      name: localPlayerName,
      color: localPlayerColor,
      isHost: true,
      isReady: true,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      isFinished: false,
      correctCharIndex: 0,
      errorCount: 0,
      totalKeystrokes: 0,
      joinedAt: 1
    };

    set({
      roomId,
      status: 'LOBBY',
      hostId: localPlayerId,
      targetText: initialText,
      players: { [localPlayerId]: hostPlayer },
      isSinglePlayer: false
    });
  },

  joinExistingRoom: (roomId: string) => {
    const { localPlayerId, localPlayerName, localPlayerColor } = get();
    const mePlayer: Player = {
      id: localPlayerId,
      name: localPlayerName,
      color: localPlayerColor,
      isHost: false,
      isReady: true,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      isFinished: false,
      correctCharIndex: 0,
      errorCount: 0,
      totalKeystrokes: 0,
      joinedAt: Date.now()
    };

    set({
      roomId,
      status: 'LOBBY',
      players: { [localPlayerId]: mePlayer },
      isSinglePlayer: false
    });
  },

  startSinglePlayer: (customTxt?: string) => {
    const { localPlayerId, localPlayerName, localPlayerColor, textLanguage, textLength } = get();
    const activeText = customTxt?.trim() || getRandomText(textLanguage, textLength);
    const soloRoomId = 'SOLO-' + Math.floor(1000 + Math.random() * 9000);

    const soloPlayer: Player = {
      id: localPlayerId,
      name: localPlayerName,
      color: localPlayerColor,
      isHost: true,
      isReady: true,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      isFinished: false,
      correctCharIndex: 0,
      errorCount: 0,
      totalKeystrokes: 0,
      joinedAt: 1
    };

    set({
      roomId: soloRoomId,
      status: 'LOBBY',
      hostId: localPlayerId,
      targetText: activeText,
      players: { [localPlayerId]: soloPlayer },
      isSinglePlayer: true,
      customText: customTxt || ''
    });
  },

  joinRoom: (roomId: string, player: Player) => {
    const state = get();
    const existingPlayer = state.players[player.id];
    const playerIds = Object.keys(state.players);

    if (playerIds.length >= MAX_PLAYERS_PER_ROOM && !existingPlayer) {
      return;
    }

    const joinedAt = player.joinedAt || existingPlayer?.joinedAt || (player.isHost ? 1 : Date.now());

    set({
      roomId,
      players: {
        ...state.players,
        [player.id]: { ...player, joinedAt }
      }
    });
  },

  updatePlayer: (playerId: string, updates: Partial<Player>) => {
    const state = get();
    const existing = state.players[playerId];
    if (!existing) return;

    set({
      players: {
        ...state.players,
        [playerId]: { ...existing, ...updates }
      }
    });
  },

  removePlayer: (playerId: string) => {
    const state = get();
    const nextPlayers = { ...state.players };
    delete nextPlayers[playerId];
    set({ players: nextPlayers });
  },

  setRoomStatus: (status: RoomStatus) => {
    const state = get();
    if (status === 'LOBBY' || status === 'COUNTDOWN') {
      const resetPlayers: Record<string, Player> = {};
      Object.keys(state.players).forEach(id => {
        resetPlayers[id] = {
          ...state.players[id],
          progress: 0,
          wpm: 0,
          accuracy: 100,
          isFinished: false,
          finishTime: undefined,
          correctCharIndex: 0,
          errorCount: 0,
          totalKeystrokes: 0
        };
      });
      set({ status, players: resetPlayers });
    } else {
      set({ status });
    }
  },

  setRoomSettings: (lang: TextLanguage, length: TextLength, customTxt?: string) => {
    let newText = '';
    if (lang === 'CUSTOM') {
      newText = customTxt || get().customText || 'Type your custom text passage here.';
    } else {
      newText = getRandomText(lang, length);
    }

    set({
      textLanguage: lang,
      textLength: length,
      targetText: newText,
      customText: customTxt !== undefined ? customTxt : get().customText
    });
  },

  setTargetText: (text: string) => {
    set({ targetText: text });
  },

  setCountdownSec: (sec: number) => {
    set({ countdownSec: sec });
  },

  resetRaceRoom: () => {
    const state = get();
    const resetPlayers: Record<string, Player> = {};

    Object.keys(state.players).forEach(id => {
      resetPlayers[id] = {
        ...state.players[id],
        progress: 0,
        wpm: 0,
        accuracy: 100,
        isFinished: false,
        finishTime: undefined,
        correctCharIndex: 0,
        errorCount: 0,
        totalKeystrokes: 0
      };
    });

    let nextText = '';
    if (state.textLanguage === 'CUSTOM') {
      nextText = state.customText || 'Type your custom text passage here.';
    } else {
      nextText = getRandomText(state.textLanguage, state.textLength);
    }

    set({
      status: 'LOBBY',
      targetText: nextText,
      players: resetPlayers,
      countdownSec: 3
    });
  }
}));
