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
  keyStats: Record<string, { totalTimeMs: number; count: number; errorCount: number }>;
  lastKeyTime: number | null;
  
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
  keyStats: {},
  lastKeyTime: null,

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
      keyStats: {},
      lastKeyTime: null,
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
      keyStats: {},
      lastKeyTime: null,
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

    let finalValue = sanitizedValue;

    // Cap maximum allowed error characters beyond first mistake (max 8 extra chars) to prevent excessive typos
    const MAX_EXTRA_ERRORS = 8;
    if (sanitizedValue.length > state.userInput.length && currentHasError) {
      if (sanitizedValue.length > correctCount + MAX_EXTRA_ERRORS) {
        finalValue = sanitizedValue.slice(0, correctCount + MAX_EXTRA_ERRORS);
        // Re-evaluate correctCount and currentHasError for capped finalValue
        correctCount = 0;
        currentHasError = false;
        for (let i = 0; i < finalValue.length; i++) {
          if (i < state.targetText.length && finalValue[i] === state.targetText[i]) {
            correctCount++;
          } else {
            currentHasError = true;
            break;
          }
        }
      }
    }

    let errorCount = state.errorCount;
    if (currentHasError) {
      errorCount++;
      soundEngine.playError();
    } else if (finalValue.length > state.userInput.length) {
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

    // Key latency and error tracking for Heatmap Analysis
    const lastKeyTime = state.lastKeyTime ?? now;
    const timeDiffMs = Math.min(1500, Math.max(20, now - lastKeyTime));
    const nextKeyStats = { ...state.keyStats };

    if (finalValue.length > state.userInput.length) {
      const typedChar = finalValue[finalValue.length - 1];
      if (typedChar && typedChar.length === 1) {
        const keyName = typedChar === ' ' ? 'SPACE' : typedChar.toUpperCase();
        const existingKey = nextKeyStats[keyName] || { totalTimeMs: 0, count: 0, errorCount: 0 };
        nextKeyStats[keyName] = {
          totalTimeMs: existingKey.totalTimeMs + timeDiffMs,
          count: existingKey.count + 1,
          errorCount: existingKey.errorCount + (currentHasError ? 1 : 0)
        };
      }
    }

    set({
      userInput: finalValue,
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
      keyStats: nextKeyStats,
      lastKeyTime: now,
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
