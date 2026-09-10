import { create } from 'zustand';
import { soundEngine } from '../services/audio';

interface TypingState {
  targetText: string;
  userInput: string;
  correctCharIndex: number;
  errorCount: number;
  totalKeystrokes: number;
  startTime: number | null;
  endTime: number | null;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  progress: number;
  isFinished: boolean;
  hasError: boolean;
  wpmHistory: number[];
  consistency: number;
  
  // Actions
  setTargetText: (text: string) => void;
  handleInputChange: (value: string) => void;
  resetTyping: () => void;
  calculateMetrics: () => { netWpm: number; grossWpm: number; accuracy: number; progress: number };
}

export const useTypingStore = create<TypingState>((set, get) => ({
  targetText: '',
  userInput: '',
  correctCharIndex: 0,
  errorCount: 0,
  totalKeystrokes: 0,
  startTime: null,
  endTime: null,
  grossWpm: 0,
  netWpm: 0,
  accuracy: 100,
  progress: 0,
  isFinished: false,
  hasError: false,
  wpmHistory: [],
  consistency: 100,

  setTargetText: (text: string) => {
    set({
      targetText: text,
      userInput: '',
      correctCharIndex: 0,
      errorCount: 0,
      totalKeystrokes: 0,
      startTime: null,
      endTime: null,
      grossWpm: 0,
      netWpm: 0,
      accuracy: 100,
      progress: 0,
      isFinished: false,
      hasError: false,
      wpmHistory: [],
      consistency: 100,
    });
  },

  resetTyping: () => {
    const { targetText } = get();
    set({
      userInput: '',
      correctCharIndex: 0,
      errorCount: 0,
      totalKeystrokes: 0,
      startTime: null,
      endTime: null,
      grossWpm: 0,
      netWpm: 0,
      accuracy: 100,
      progress: 0,
      isFinished: false,
      hasError: false,
      wpmHistory: [],
      consistency: 100,
      targetText,
    });
  },

  handleInputChange: (value: string) => {
    const state = get();
    if (state.isFinished || !state.targetText) return;

    const now = Date.now();
    const startTime = state.startTime ?? now;

    // Normalize smart quotes/punctuation from mobile keyboards
    const sanitizedValue = value
      .replace(/[’‘`]/g, "'")
      .replace(/[”“]/g, '"');

    // Keystroke count increment
    const totalKeystrokes = state.totalKeystrokes + 1;

    // Check matching correct characters from start
    let correctCount = 0;
    let currentHasError = false;

    for (let i = 0; i < sanitizedValue.length; i++) {
      if (i < state.targetText.length && sanitizedValue[i] === state.targetText[i]) {
        correctCount++;
      } else {
        currentHasError = true;
        break; // First error encountered
      }
    }

    let errorCount = state.errorCount;
    if (currentHasError) {
      errorCount++;
      soundEngine.playError();
    } else if (sanitizedValue.length > state.userInput.length) {
      soundEngine.playKeyPress();
    }

    // Check if finished entire target text
    const isFinished = correctCount >= state.targetText.length;
    const endTime = isFinished ? now : null;

    // Exact Monkeytype Calculation Formulas
    // 1 minute = 60000ms. Min elapsed cap = 0.001 min to avoid division by zero on 1st keypress
    const elapsedMinutes = Math.max(0.001, ((endTime ?? now) - startTime) / 60000);
    
    // Monkeytype Raw WPM = (totalKeystrokes / 5) / elapsedMinutes
    const grossWpm = Math.round((totalKeystrokes / 5) / elapsedMinutes);

    // Monkeytype Net WPM = (correctCharacters / 5) / elapsedMinutes
    const netWpm = Math.max(0, Math.round((correctCount / 5) / elapsedMinutes));

    // Monkeytype Accuracy = (correctCharacters / totalKeystrokes) * 100
    const accuracy = totalKeystrokes > 0 ? Math.min(100, Math.round((correctCount / totalKeystrokes) * 100)) : 100;

    // Progress = (correctCharacters / targetTextLength) * 100
    const progress = Math.min(100, Number(((correctCount / state.targetText.length) * 100).toFixed(1)));

    // Second-by-Second WPM History Sampling for SVG Chart & Consistency
    const currentWpmHistory = [...state.wpmHistory];
    const secondElapsed = Math.floor(((endTime ?? now) - startTime) / 1000);
    if (secondElapsed >= currentWpmHistory.length) {
      currentWpmHistory.push(netWpm);
    } else if (currentWpmHistory.length > 0) {
      currentWpmHistory[currentWpmHistory.length - 1] = netWpm;
    }

    // Monkeytype Consistency = (1 - Coefficient of Variation) * 100
    let consistency = 100;
    if (currentWpmHistory.length > 1) {
      const mean = currentWpmHistory.reduce((a, b) => a + b, 0) / currentWpmHistory.length;
      if (mean > 0) {
        const variance = currentWpmHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / currentWpmHistory.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean;
        consistency = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
      }
    }

    if (isFinished) {
      soundEngine.playFinishChime();
    }

    set({
      userInput: sanitizedValue,
      correctCharIndex: correctCount,
      totalKeystrokes,
      errorCount,
      startTime,
      endTime,
      grossWpm,
      netWpm,
      accuracy,
      progress,
      isFinished,
      hasError: currentHasError,
      wpmHistory: currentWpmHistory,
      consistency,
    });
  },

  calculateMetrics: () => {
    const state = get();
    if (!state.startTime) return { netWpm: 0, grossWpm: 0, accuracy: 100, progress: 0 };

    const now = state.endTime ?? Date.now();
    const elapsedMinutes = Math.max(0.001, (now - state.startTime) / 60000);
    const grossWpm = Math.round((state.totalKeystrokes / 5) / elapsedMinutes);
    const netWpm = Math.max(0, Math.round((state.correctCharIndex / 5) / elapsedMinutes));
    const accuracy = state.totalKeystrokes > 0 ? Math.min(100, Math.round((state.correctCharIndex / state.totalKeystrokes) * 100)) : 100;
    const progress = Math.min(100, Number(((state.correctCharIndex / state.targetText.length) * 100).toFixed(1)));

    return { netWpm, grossWpm, accuracy, progress };
  }
}));
