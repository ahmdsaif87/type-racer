import { create } from 'zustand';
import type { Player, RoomStatus, TextLanguage, TextMode, TextLength, CarColorId } from '../types/game';
import type { UiLanguage } from '../data/i18n';
import { getRandomText, getRandomTextAsync } from '../data/texts';

interface RaceState {
  roomId: string;
  status: RoomStatus;
  hostId: string;
  targetText: string;
  textLanguage: TextLanguage;
  textMode: TextMode;
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
  kickPlayer: (playerId: string) => void;
  setRoomStatus: (status: RoomStatus) => void;
  setRoomSettings: (lang: TextLanguage, mode: TextMode, length: TextLength, customTxt?: string) => void;
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
  textMode: 'WORDS',
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
    set({ uiLanguage: lang });
  },

  createRoom: (roomId: string) => {
    const { localPlayerId, localPlayerName, localPlayerColor, textLanguage, textMode, textLength } = get();
    const initialText = getRandomText(textLanguage, textMode, textLength);

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

    if (textMode !== 'CUSTOM') {
      getRandomTextAsync(textLanguage, textMode, textLength).then((fetched) => {
        if (fetched && get().roomId === roomId && get().textLanguage === textLanguage && get().textMode === textMode) {
          set({ targetText: fetched });
        }
      });
    }
  },

  joinExistingRoom: (roomId: string) => {
    const { localPlayerId, localPlayerName, localPlayerColor } = get();
    const mePlayer: Player = {
      id: localPlayerId,
      name: localPlayerName,
      color: localPlayerColor,
      isHost: false,
      isReady: false,
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
      hostId: '',
      players: { [localPlayerId]: mePlayer },
      isSinglePlayer: false
    });
  },

  startSinglePlayer: (customTxt?: string) => {
    const { localPlayerId, localPlayerName, localPlayerColor, textLanguage, textMode, textLength } = get();
    const activeMode: TextMode = customTxt ? 'CUSTOM' : textMode;
    const activeText = customTxt?.trim() || getRandomText(textLanguage, activeMode, textLength);
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
      textMode: activeMode,
      customText: customTxt ? customTxt : get().customText,
      players: { [localPlayerId]: soloPlayer },
      isSinglePlayer: true
    });

    if (!customTxt && activeMode !== 'CUSTOM') {
      getRandomTextAsync(textLanguage, activeMode, textLength).then((fetched) => {
        if (fetched && get().roomId === soloRoomId) {
          set({ targetText: fetched });
        }
      });
    }
  },

  joinRoom: (_roomId: string, player: Player) => {
    const state = get();
    const joinedAt = player.joinedAt || Date.now();
    set({
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

    let nextHostId = state.hostId;

    if (playerId === state.hostId || !nextPlayers[state.hostId]) {
      const remainingList = Object.values(nextPlayers).sort(
        (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)
      );

      if (remainingList.length > 0) {
        const newHost = remainingList[0];
        nextHostId = newHost.id;
        nextPlayers[newHost.id] = {
          ...newHost,
          isHost: true,
          isReady: true
        };
      } else {
        nextHostId = '';
      }
    }

    set({ players: nextPlayers, hostId: nextHostId });
  },

  kickPlayer: (playerId: string) => {
    get().removePlayer(playerId);
  },

  setRoomStatus: (status: RoomStatus) => {
    const state = get();
    if (status === 'LOBBY' || status === 'COUNTDOWN') {
      const resetPlayers: Record<string, Player> = {};
      Object.keys(state.players).forEach(id => {
        resetPlayers[id] = {
          ...state.players[id],
          isReady: status === 'LOBBY' ? (state.players[id].isHost ? true : false) : state.players[id].isReady,
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

  setRoomSettings: (lang: TextLanguage, mode: TextMode, length: TextLength, customTxt?: string) => {
    let newText = '';
    if (mode === 'CUSTOM') {
      newText = customTxt || get().customText || 'Type your custom text passage here.';
    } else if (customTxt) {
      newText = customTxt;
    } else {
      newText = getRandomText(lang, mode, length, get().targetText);
    }

    set({
      textLanguage: lang,
      textMode: mode,
      textLength: length,
      targetText: newText,
      customText: customTxt !== undefined ? customTxt : get().customText
    });

    if (mode !== 'CUSTOM' && !customTxt) {
      getRandomTextAsync(lang, mode, length, get().targetText).then((fetchedText) => {
        if (fetchedText && get().textLanguage === lang && get().textMode === mode && get().textLength === length) {
          set({ targetText: fetchedText });
        }
      });
    }
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
        isReady: state.players[id].isHost ? true : false,
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
    if (state.textMode === 'CUSTOM') {
      nextText = state.customText || 'Type your custom text passage here.';
    } else {
      nextText = getRandomText(state.textLanguage, state.textMode, state.textLength, state.targetText);
    }

    set({
      status: 'LOBBY',
      targetText: nextText,
      players: resetPlayers,
      countdownSec: 3
    });

    if (state.textMode !== 'CUSTOM') {
      getRandomTextAsync(state.textLanguage, state.textMode, state.textLength, nextText).then((fetched) => {
        if (fetched && get().status === 'LOBBY') {
          set({ targetText: fetched });
        }
      });
    }
  }
}));
