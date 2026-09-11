import React, { useEffect, useState } from 'react';
import { useRaceStore } from '../store/useRaceStore';
import { useTypingStore } from '../store/useTypingStore';
import { realtimeService } from '../services/realtime';
import { soundEngine } from '../services/audio';
import { UI_STRINGS } from '../data/i18n';
import { RotateCcw, Trophy, BarChart2, Home, Keyboard, Zap } from 'lucide-react';

interface PostRaceModalProps {
  onReturnToLobby: () => void;
}

export const PostRaceModal: React.FC<PostRaceModalProps> = ({ onReturnToLobby }) => {
  const { players, hostId, localPlayerId, uiLanguage, textLanguage, textLength, targetText, isSinglePlayer } = useRaceStore();
  const { netWpm, grossWpm, accuracy, startTime, endTime, correctCharIndex, errorCount, wpmHistory, consistency, keyStats } = useTypingStore();

  const isHost = hostId === localPlayerId;
  const canRematch = isSinglePlayer || isHost;
  const [activeTab, setActiveTab] = useState<'stats' | 'heatmap' | 'leaderboard'>('stats');

  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;

  // Process keyStats for Weakest Keys & QWERTY Heatmap
  const keyEntries = Object.entries(keyStats || {}).map(([char, data]) => ({
    char,
    avgMs: data.count > 0 ? Math.round(data.totalTimeMs / data.count) : 0,
    errors: data.errorCount,
    count: data.count
  }));

  const weakestKeys = [...keyEntries]
    .sort((a, b) => (b.errors !== a.errors ? b.errors - a.errors : b.avgMs - a.avgMs))
    .filter(k => k.count > 0)
    .slice(0, 4);

  const keyMap = new Map(keyEntries.map(k => [k.char, k]));

  // State for hovered key stats details
  const [hoveredKeyInfo, setHoveredKeyInfo] = useState<{ label: string; stat: { count: number; avgMs: number; errors: number } } | null>(null);

  // Helper to aggregate stats for physical keycaps (combines primary & shift symbols)
  const getAggregatedStat = (keyId: string, topSymbol?: string, bottomSymbol?: string) => {
    if (keyId === 'SPACE') {
      return keyMap.get('SPACE') || { count: 0, avgMs: 0, errors: 0 };
    }

    const char1 = bottomSymbol?.toUpperCase();
    const char2 = topSymbol?.toUpperCase();

    const stat1 = char1 ? keyMap.get(char1) : undefined;
    const stat2 = (char2 && char2 !== char1) ? keyMap.get(char2) : undefined;
    const statRaw1 = bottomSymbol ? keyMap.get(bottomSymbol) : undefined;
    const statRaw2 = topSymbol ? keyMap.get(topSymbol) : undefined;

    let totalCount = 0;
    let totalTime = 0;
    let totalErrors = 0;

    const seen = new Set();
    [stat1, stat2, statRaw1, statRaw2].forEach(s => {
      if (s && !seen.has(s)) {
        seen.add(s);
        totalCount += s.count;
        totalTime += s.count * s.avgMs;
        totalErrors += s.errors;
      }
    });

    return {
      count: totalCount,
      avgMs: totalCount > 0 ? Math.round(totalTime / totalCount) : 0,
      errors: totalErrors
    };
  };

  interface KeyCapDef {
    id: string;
    top?: string;
    bottom?: string;
    type?: 'char' | 'mod' | 'space';
    label?: string;
    flex?: string;
  }

  const physicalKeyboardRows: KeyCapDef[][] = [
    // Row 1 (14.8 flex units)
    [
      { id: '`', top: '~', bottom: '`', flex: 'flex-1' },
      { id: '1', top: '!', bottom: '1', flex: 'flex-1' },
      { id: '2', top: '@', bottom: '2', flex: 'flex-1' },
      { id: '3', top: '#', bottom: '3', flex: 'flex-1' },
      { id: '4', top: '$', bottom: '4', flex: 'flex-1' },
      { id: '5', top: '%', bottom: '5', flex: 'flex-1' },
      { id: '6', top: '^', bottom: '6', flex: 'flex-1' },
      { id: '7', top: '&', bottom: '7', flex: 'flex-1' },
      { id: '8', top: '*', bottom: '8', flex: 'flex-1' },
      { id: '9', top: '(', bottom: '9', flex: 'flex-1' },
      { id: '0', top: ')', bottom: '0', flex: 'flex-1' },
      { id: '-', top: '_', bottom: '-', flex: 'flex-1' },
      { id: '=', top: '+', bottom: '=', flex: 'flex-1' },
      { id: 'BACKSPACE', type: 'mod', label: 'Backspace', flex: 'flex-[1.8]' }
    ],
    // Row 2 (14.8 flex units)
    [
      { id: 'TAB', type: 'mod', label: 'Tab', flex: 'flex-[1.4]' },
      { id: 'Q', bottom: 'Q', flex: 'flex-1' },
      { id: 'W', bottom: 'W', flex: 'flex-1' },
      { id: 'E', bottom: 'E', flex: 'flex-1' },
      { id: 'R', bottom: 'R', flex: 'flex-1' },
      { id: 'T', bottom: 'T', flex: 'flex-1' },
      { id: 'Y', bottom: 'Y', flex: 'flex-1' },
      { id: 'U', bottom: 'U', flex: 'flex-1' },
      { id: 'I', bottom: 'I', flex: 'flex-1' },
      { id: 'O', bottom: 'O', flex: 'flex-1' },
      { id: 'P', bottom: 'P', flex: 'flex-1' },
      { id: '[', top: '{', bottom: '[', flex: 'flex-1' },
      { id: ']', top: '}', bottom: ']', flex: 'flex-1' },
      { id: '\\', top: '|', bottom: '\\', flex: 'flex-[1.4]' }
    ],
    // Row 3 (14.8 flex units)
    [
      { id: 'CAPS', type: 'mod', label: 'Caps', flex: 'flex-[1.6]' },
      { id: 'A', bottom: 'A', flex: 'flex-1' },
      { id: 'S', bottom: 'S', flex: 'flex-1' },
      { id: 'D', bottom: 'D', flex: 'flex-1' },
      { id: 'F', bottom: 'F', flex: 'flex-1' },
      { id: 'G', bottom: 'G', flex: 'flex-1' },
      { id: 'H', bottom: 'H', flex: 'flex-1' },
      { id: 'J', bottom: 'J', flex: 'flex-1' },
      { id: 'K', bottom: 'K', flex: 'flex-1' },
      { id: 'L', bottom: 'L', flex: 'flex-1' },
      { id: ';', top: ':', bottom: ';', flex: 'flex-1' },
      { id: "'", top: '"', bottom: "'", flex: 'flex-1' },
      { id: 'ENTER', type: 'mod', label: 'Enter', flex: 'flex-[2.2]' }
    ],
    // Row 4 (14.8 flex units)
    [
      { id: 'SHIFT_L', type: 'mod', label: 'Shift', flex: 'flex-[2.1]' },
      { id: 'Z', bottom: 'Z', flex: 'flex-1' },
      { id: 'X', bottom: 'X', flex: 'flex-1' },
      { id: 'C', bottom: 'C', flex: 'flex-1' },
      { id: 'V', bottom: 'V', flex: 'flex-1' },
      { id: 'B', bottom: 'B', flex: 'flex-1' },
      { id: 'N', bottom: 'N', flex: 'flex-1' },
      { id: 'M', bottom: 'M', flex: 'flex-1' },
      { id: ',', top: '<', bottom: ',', flex: 'flex-1' },
      { id: '.', top: '>', bottom: '.', flex: 'flex-1' },
      { id: '/', top: '?', bottom: '/', flex: 'flex-1' },
      { id: 'SHIFT_R', type: 'mod', label: 'Shift', flex: 'flex-[2.7]' }
    ],
    // Row 5 (14.8 flex units)
    [
      { id: 'CTRL_L', type: 'mod', label: 'Ctrl', flex: 'flex-[1.2]' },
      { id: 'WIN', type: 'mod', label: '❖', flex: 'flex-1' },
      { id: 'ALT_L', type: 'mod', label: 'Alt', flex: 'flex-[1.2]' },
      { id: 'SPACE', type: 'space', label: 'spacebar', flex: 'flex-[7.2]' },
      { id: 'ALT_R', type: 'mod', label: 'Alt', flex: 'flex-[1.2]' },
      { id: 'FN', type: 'mod', label: 'Fn', flex: 'flex-1' },
      { id: 'CTRL_R', type: 'mod', label: 'Ctrl', flex: 'flex-[1.2]' }
    ]
  ];

  const leaderboard = Object.values(players).sort((a, b) => {
    if (a.isFinished && b.isFinished) {
      return b.wpm - a.wpm;
    }
    if (a.isFinished) return -1;
    if (b.isFinished) return 1;
    return b.progress - a.progress;
  });

  const myRankIndex = leaderboard.findIndex((p) => p.id === localPlayerId);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : 1;
  const winner = leaderboard[0];

  const totalTimeSeconds = Math.max(1, Math.round(((endTime ?? Date.now()) - (startTime ?? Date.now())) / 1000));

  const handleReturnAction = () => {
    const state = useRaceStore.getState();
    state.resetRaceRoom();
    useTypingStore.getState().resetTyping();

    const isLocalHost = state.hostId === state.localPlayerId;
    if (isLocalHost && !state.isSinglePlayer) {
      realtimeService.broadcastRoomStateChange('LOBBY', state.targetText);
    }
    onReturnToLobby();
  };

  const handleRematch = () => {
    if (!canRematch) return;
    soundEngine.playKeyPress();
    const state = useRaceStore.getState();
    state.resetRaceRoom();
    useTypingStore.getState().resetTyping();

    if (state.isSinglePlayer) {
      realtimeService.broadcastRoomStateChange('COUNTDOWN', state.targetText, 3);
    } else {
      handleReturnAction();
    }
  };

  useEffect(() => {
    soundEngine.playFinishChime();
  }, []);

  // Global keybind for Tab + Enter or R (Host / Solo only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === 'r' || e.key === 'R') && canRematch) {
        e.preventDefault();
        handleRematch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canRematch]);

  // Generate SVG Points for WPM timeline graph
  const chartData = wpmHistory.length > 0 ? wpmHistory : [netWpm];
  const maxWpmInChart = Math.max(100, ...chartData, netWpm);
  const chartWidth = 500;
  const chartHeight = 160;
  const paddingLeft = 35;
  const paddingBottom = 25;
  const paddingTop = 15;
  const paddingRight = 15;

  const innerW = chartWidth - paddingLeft - paddingRight;
  const innerH = chartHeight - paddingTop - paddingBottom;

  const points = chartData.map((val, idx) => {
    const x = paddingLeft + (chartData.length > 1 ? (idx / (chartData.length - 1)) * innerW : innerW / 2);
    const y = paddingTop + innerH - (val / maxWpmInChart) * innerH;
    return { x, y, val };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerH} L ${points[0].x} ${paddingTop + innerH} Z`
    : '';

  return (
    <div className="fixed inset-0 bg-[var(--bg-main)]/95 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6 font-mono select-none overflow-y-auto">
      <div className="w-full max-w-5xl lg:max-w-6xl bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-5 sm:p-9 space-y-6 shadow-2xl transition-all my-auto">
        
        {/* Header - Winner Banner & Match Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--border-main)] pb-5 gap-3">
          <div className="flex items-center gap-3">
            {/* Cleaned Trophy Container without SVG bounding box glitch */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--accent-main)] shadow-[0_0_12px_var(--accent-glow)] flex items-center justify-center">
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--accent-main)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-[var(--accent-main)] font-bold">
                  {myRank === 1 ? (strings.firstPlace || '#1 PLACE - CHAMPION!') : `#${myRank} ${strings.place || 'PLACE'}`}
                </span>
                {winner && (
                  <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-input)] px-2.5 py-0.5 rounded border border-[var(--border-main)] font-mono">
                    {strings.winner}: <strong className="text-[var(--accent-main)]">{winner.name}</strong> ({winner.wpm} wpm)
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-3xl font-bold text-[var(--text-typed)] tracking-tight">
                {strings.raceResults}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* View Switcher Buttons */}
            <div className="flex bg-[var(--bg-input)] p-1 rounded-lg border border-[var(--border-main)] gap-1">
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'stats'
                    ? 'bg-[var(--accent-main)] text-slate-950 font-bold shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-typed)]'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{strings.stats}</span>
              </button>

              <button
                onClick={() => setActiveTab('heatmap')}
                className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'heatmap'
                    ? 'bg-[var(--accent-main)] text-slate-950 font-bold shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-typed)]'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>{strings.keyHeatmap}</span>
              </button>

              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-[var(--accent-main)] text-slate-950 font-bold shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-typed)]'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{strings.board} ({leaderboard.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Body Container - Equalized fixed height across all tabs for identical modal size */}
        <div className="h-[360px] sm:h-[380px] flex flex-col justify-between">
          {activeTab === 'stats' ? (
            <div className="h-full flex flex-col justify-between space-y-4">
              {/* Main Stats Row: Monkeytype Style (Giant Numbers on Left, SVG Graph on Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center flex-1">
                
                {/* Left Column: Giant Primary WPM & ACC Displays */}
                <div className="md:col-span-4 flex flex-row md:flex-col justify-around md:justify-center items-center md:items-start space-y-0 md:space-y-4 py-2 border-b md:border-b-0 md:border-r border-[var(--border-main)] pr-0 md:pr-6">
                  
                  {/* WPM Display */}
                  <div>
                    <span className="text-xs text-[var(--text-muted)] lowercase tracking-wider font-semibold block mb-0.5">
                      {strings.wpm}
                    </span>
                    <div className="text-5xl sm:text-7xl font-bold text-[var(--accent-main)] leading-none drop-shadow-[0_0_20px_var(--accent-glow)]">
                      {netWpm}
                    </div>
                  </div>

                  {/* ACC Display */}
                  <div>
                    <span className="text-xs text-[var(--text-muted)] lowercase tracking-wider font-semibold block mb-0.5">
                      {strings.acc}
                    </span>
                    <div className="text-4xl sm:text-5xl font-bold text-[var(--accent-main)] leading-none drop-shadow-[0_0_15px_var(--accent-glow)]">
                      {accuracy}%
                    </div>
                  </div>
                </div>

                {/* Right Column: Monkeytype SVG Speed Chart Graph */}
                <div className="md:col-span-8 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl p-4 sm:p-5 relative">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
                    <span>Words per Minute</span>
                    <span>Time (s)</span>
                  </div>

                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 sm:h-44 overflow-visible">
                    <defs>
                      <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-main)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--accent-main)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
                      const y = paddingTop + innerH * (1 - ratio);
                      const val = Math.round(maxWpmInChart * ratio);
                      return (
                        <g key={i}>
                          <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="var(--border-main)" strokeDasharray="3 3" opacity="0.6" />
                          <text x={paddingLeft - 6} y={y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end">{val}</text>
                        </g>
                      );
                    })}

                    {/* Gradient Area Fill */}
                    {areaD && <path d={areaD} fill="url(#wpmGradient)" />}

                    {/* Polyline Curve */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="var(--accent-main)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Plot Points */}
                    {points.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r="3"
                        fill="var(--bg-main)"
                        stroke="var(--accent-main)"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                </div>
              </div>

              {/* Bottom Breakdown Bar (Monkeytype Standard Info Row) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-center sm:text-left border-t border-[var(--border-main)]">
                <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border-main)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">{strings.testType}</span>
                  <span className="text-xs font-bold text-[var(--text-typed)] truncate block">
                    words {textLength} ({textLanguage.toLowerCase()})
                  </span>
                </div>

                <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border-main)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">{strings.raw}</span>
                  <span className="text-sm font-bold text-[var(--accent-main)] block">{grossWpm}</span>
                </div>

                <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border-main)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">{strings.characters}</span>
                  <span className="text-xs font-bold text-[var(--text-typed)] block">
                    {correctCharIndex}/{errorCount}/0/{Math.max(0, targetText.length - correctCharIndex)}
                  </span>
                </div>

                <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border-main)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">{strings.consistency}</span>
                  <span className="text-sm font-bold text-[var(--accent-main)] block">{consistency}%</span>
                </div>

                <div className="bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border-main)] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">{strings.time}</span>
                  <span className="text-sm font-bold text-[var(--text-typed)] block">{totalTimeSeconds}s</span>
                </div>
              </div>
            </div>
          ) : activeTab === 'heatmap' ? (
            /* Key Heatmap & Weakest Keys Breakdown View */
            <div className="h-full flex flex-col justify-between space-y-2.5">
              {/* Weakest Keys Summary Card */}
              <div className="bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl p-2.5 sm:p-3 shrink-0">
                <div className="flex items-center gap-2 mb-1.5 text-xs text-[var(--accent-main)] font-bold uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{strings.weakestKeysTitle}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {weakestKeys.length > 0 ? (
                    weakestKeys.map((item) => {
                      const displayKey = item.char === 'SPACE' ? 'SPACEBAR' : item.char;
                      return (
                        <div key={item.char} className="flex items-center gap-2 bg-[var(--bg-card)] border border-rose-500/30 px-2.5 py-1 rounded-lg shadow-sm">
                          <kbd className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-xs font-mono shadow-sm">
                            {displayKey}
                          </kbd>
                          <div className="flex flex-col text-xs leading-tight">
                            <span className="text-rose-400 font-bold text-[11px]">{item.errors} {item.errors === 1 ? strings.errors.replace(/s$/, '') : strings.errors}</span>
                            <span className="text-[var(--text-muted)] text-[10px]">{item.avgMs}ms {strings.latency}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full text-xs text-[var(--text-muted)] py-0.5 text-center font-mono">
                      {strings.flawlessAccuracy}
                    </div>
                  )}
                </div>
              </div>

              {/* Compact Physical Keyboard Layout (Equalized Height with Keyboard Display) */}
              <div className="bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between items-center w-full shadow-inner">
                {/* Status Legend & Dynamic Hover Status Pill Bar */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] px-1 gap-2 mb-1 shrink-0">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-main)] shadow-[0_0_6px_var(--accent-main)]" /> {strings.fast}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" /> {strings.slow}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" /> {strings.typoError}
                    </span>
                  </div>

                  {/* Dynamic Hover Detail Pill */}
                  <div className="text-xs font-mono text-[var(--accent-main)] font-semibold h-4">
                    {hoveredKeyInfo ? (
                      <span>
                        <strong className="text-[var(--text-typed)]">[ {hoveredKeyInfo.label} ]</strong> : {hoveredKeyInfo.stat.count} {strings.hits} • {hoveredKeyInfo.stat.avgMs}ms • {hoveredKeyInfo.stat.errors} {strings.errors}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] opacity-70">{strings.hoverKeyHint}</span>
                    )}
                  </div>
                </div>

                {/* 5-Row Physical Keyboard Display (Compact Sleek Keycaps h-7 sm:h-8) */}
                <div className="space-y-1 w-full mx-auto py-0.5">
                  {physicalKeyboardRows.map((rowKeys, rIdx) => (
                    <div key={rIdx} className="flex justify-between gap-1 sm:gap-1.5 w-full">
                      {rowKeys.map((kDef) => {
                        if (kDef.type === 'mod') {
                          return (
                            <div
                              key={kDef.id}
                              className={`${kDef.flex} min-w-0 h-7 sm:h-8 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-muted)] opacity-50 flex items-center justify-center text-[9px] sm:text-xs font-mono font-semibold select-none shrink-0`}
                            >
                              <span className="truncate px-0.5">{kDef.label}</span>
                            </div>
                          );
                        }

                        if (kDef.type === 'space') {
                          const spaceStat = keyMap.get('SPACE');
                          let spaceBgClass = 'bg-[var(--bg-card)] text-[var(--text-muted)] opacity-40 border-[var(--border-main)]';
                          if (spaceStat && spaceStat.count > 0) {
                            if (spaceStat.errors > 0) {
                              spaceBgClass = 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.25)] font-extrabold opacity-100';
                            } else if (spaceStat.avgMs > 300) {
                              spaceBgClass = 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-extrabold opacity-100';
                            } else {
                              spaceBgClass = 'bg-[var(--accent-main)]/20 text-[var(--text-typed)] border-[var(--accent-main)]/50 font-extrabold shadow-sm opacity-100';
                            }
                          }

                          return (
                            <div
                              key={kDef.id}
                              onMouseEnter={() => setHoveredKeyInfo({ label: 'SPACEBAR', stat: spaceStat || { count: 0, avgMs: 0, errors: 0 } })}
                              onMouseLeave={() => setHoveredKeyInfo(null)}
                              className={`${kDef.flex} min-w-0 h-7 sm:h-8 rounded-md border flex items-center justify-center text-[9px] sm:text-xs uppercase tracking-widest font-mono cursor-pointer transition-all hover:scale-[1.02] ${spaceBgClass}`}
                            >
                              {strings.spacebar}
                            </div>
                          );
                        }

                        // Character Keycap (Single or Dual Symbol)
                        const stat = getAggregatedStat(kDef.id, kDef.top, kDef.bottom);
                        let bgClass = 'bg-[var(--bg-card)] text-[var(--text-muted)] opacity-35 border-[var(--border-main)]';

                        if (stat.count > 0) {
                          if (stat.errors > 0) {
                            bgClass = 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.25)] font-extrabold opacity-100';
                          } else if (stat.avgMs > 300) {
                            bgClass = 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-extrabold opacity-100';
                          } else {
                            bgClass = 'bg-[var(--accent-main)]/20 text-[var(--text-typed)] border-[var(--accent-main)]/50 font-extrabold shadow-sm opacity-100';
                          }
                        }

                        const displayLabel = kDef.top ? `${kDef.top}  ${kDef.bottom || ''}` : (kDef.bottom || kDef.id);

                        return (
                          <div
                            key={kDef.id}
                            onMouseEnter={() => setHoveredKeyInfo({ label: displayLabel, stat })}
                            onMouseLeave={() => setHoveredKeyInfo(null)}
                            className={`${kDef.flex} min-w-0 h-7 sm:h-8 rounded-md border flex flex-col items-center justify-center font-mono transition-all cursor-pointer hover:scale-105 hover:z-10 ${bgClass}`}
                          >
                            {kDef.top ? (
                              <>
                                <span className="text-[7.5px] sm:text-[8.5px] leading-none opacity-75">{kDef.top}</span>
                                <span className="text-[9.5px] sm:text-[11px] font-bold leading-none">{kDef.bottom}</span>
                              </>
                            ) : (
                              <span className="text-[10px] sm:text-xs font-bold">{kDef.bottom}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Multiplayer Leaderboard Table View - Height equalized to h-full */
            <div className="h-full overflow-x-auto rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] overflow-y-auto">
              <table className="w-full text-left text-xs sm:text-sm font-mono">
                <thead className="bg-[var(--bg-input)] text-[var(--accent-main)] border-b border-[var(--border-main)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3.5">#</th>
                    <th className="px-4 py-3.5">{strings.racer || 'racer'}</th>
                    <th className="px-4 py-3.5">{strings.wpm}</th>
                    <th className="px-4 py-3.5">{strings.acc}</th>
                    <th className="px-4 py-3.5">{strings.statusStr || 'status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)] text-[var(--text-typed)]">
                  {leaderboard.map((p, idx) => (
                    <tr key={p.id} className={p.id === localPlayerId ? 'bg-[var(--bg-input)] text-[var(--accent-main)] font-bold' : ''}>
                      <td className="px-4 py-3.5 text-[var(--text-muted)] font-bold">#{idx + 1}</td>
                      <td className="px-4 py-3.5 font-semibold">{p.name} {p.id === localPlayerId && `(${strings.you || 'You'})`}</td>
                      <td className="px-4 py-3.5 font-bold text-[var(--accent-main)] text-sm sm:text-base">{p.wpm}</td>
                      <td className="px-4 py-3.5 text-[var(--accent-main)]">{p.accuracy}%</td>
                      <td className="px-4 py-3.5 text-xs text-[var(--text-muted)]">
                        {p.isFinished ? 'finished' : `${p.progress.toFixed(0)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Controls & Keybind Hints (Distinct Roomy Separation Gap) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 sm:pt-6 mt-4 sm:mt-6 border-t border-[var(--border-main)]">
          <div className="text-xs text-[var(--text-muted)] flex items-center gap-4">
            {canRematch ? (
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--accent-main)] font-bold">tab + enter</kbd>
                <span>atau</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--accent-main)] font-bold">r</kbd>
                <span>- restart / next test</span>
              </span>
            ) : (
              <span className="text-[var(--accent-main)] font-semibold animate-pulse flex items-center gap-1.5">
                <span>⏳</span>
                <span>{strings.waitingForHostNextRace}</span>
              </span>
            )}
          </div>

          <div className="flex gap-3.5 w-full sm:w-auto">
            {canRematch ? (
              <>
                <button
                  onClick={handleRematch}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-[var(--accent-main)] hover:brightness-110 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent-glow)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{strings.nextRace}</span>
                </button>

                <button
                  onClick={onReturnToLobby}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border-main)] text-[var(--text-typed)] font-bold text-xs transition-all border border-[var(--border-main)] flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>{strings.returnToLobby}</span>
                </button>
              </>
            ) : (
              <button
                onClick={onReturnToLobby}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border-main)] text-[var(--text-typed)] font-bold text-xs transition-all border border-[var(--border-main)] flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{strings.leaveRoom}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
