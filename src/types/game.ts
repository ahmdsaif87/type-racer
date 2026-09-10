export type CarColorId = 'cyan' | 'red' | 'green' | 'yellow' | 'purple' | 'orange';

export interface CarColor {
  id: CarColorId;
  name: string;
  primary: string;
  secondary: string;
  glow: string;
}

export type RoomStatus = 'LOBBY' | 'COUNTDOWN' | 'IN_RACE' | 'FINISHED';
export type TextLanguage = 'ID' | 'EN' | 'CUSTOM';
export type TextLength = 15 | 25 | 50;

export interface Player {
  id: string;
  name: string;
  color: CarColorId;
  isHost: boolean;
  isReady: boolean;
  progress: number; // 0 - 100
  wpm: number;
  accuracy: number;
  isFinished: boolean;
  finishTime?: number; // relative elapsed milliseconds
  correctCharIndex: number;
  errorCount: number;
  totalKeystrokes: number;
  joinedAt?: number;
}

export interface TextPreset {
  id: string;
  lang: TextLanguage;
  length: TextLength;
  text: string;
  title: string;
}

export interface RaceResult {
  playerId: string;
  name: string;
  color: CarColorId;
  rank: number;
  wpm: number;
  accuracy: number;
  finishTimeMs: number;
  totalErrors: number;
}

export interface RoomState {
  roomId: string;
  status: RoomStatus;
  targetText: string;
  textLanguage: TextLanguage;
  textLength: TextLength;
  hostId: string;
  players: Record<string, Player>;
  startTime?: number; // timestamp
  countdownSec?: number;
  isSinglePlayer?: boolean;
  customText?: string;
}
