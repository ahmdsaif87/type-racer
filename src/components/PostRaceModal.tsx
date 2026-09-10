import React, { useEffect, useState } from 'react';
import { useRaceStore } from '../store/useRaceStore';
import { useTypingStore } from '../store/useTypingStore';
import { realtimeService } from '../services/realtime';
import { soundEngine } from '../services/audio';
import { UI_STRINGS } from '../data/i18n';
import { RotateCcw, Trophy, BarChart2, Home } from 'lucide-react';

interface PostRaceModalProps {
  onReturnToLobby: () => void;
}

export const PostRaceModal: React.FC<PostRaceModalProps> = ({ onReturnToLobby }) => {
  const { players, hostId, localPlayerId, uiLanguage, textLanguage, textLength, targetText, isSinglePlayer } = useRaceStore();
  const { netWpm, grossWpm, accuracy, startTime, endTime, correctCharIndex, errorCount, wpmHistory, consistency } = useTypingStore();

  const isHost = hostId === localPlayerId;
  const canRematch = isSinglePlayer || isHost;
  const [activeTab, setActiveTab] = useState<'stats' | 'leaderboard'>('stats');

  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;

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
    <div className="fixed inset-0 bg-[var(--bg-main)] z-50 flex items-center justify-center p-3 sm:p-6 font-mono select-none overflow-y-auto">
      <div className="w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xl transition-all">
        
        {/* Header - Winner Banner & Match Summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--border-main)] pb-4 gap-3">
          <div className="flex items-center gap-3">
            {/* Cleaned Trophy Container without SVG bounding box glitch */}
            <div className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--accent-main)] shadow-[0_0_12px_var(--accent-glow)] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[var(--accent-main)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-[var(--accent-main)] font-bold">
                  {myRank === 1 ? '#1 PLACE - CHAMPION!' : `#${myRank} PLACE`}
                </span>
                {winner && (
                  <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-input)] px-2.5 py-0.5 rounded border border-[var(--border-main)] font-mono">
                    winner: <strong className="text-[var(--accent-main)]">{winner.name}</strong> ({winner.wpm} wpm)
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-typed)] tracking-tight">
                {strings.raceResults}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* View Switcher Buttons */}
            <div className="flex bg-[var(--bg-input)] p-1 rounded-lg border border-[var(--border-main)]">
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'stats'
                    ? 'bg-[var(--accent-main)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-typed)]'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Stats</span>
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-[var(--accent-main)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-typed)]'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Board ({leaderboard.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Body Container with Equalized Height (340px) across Stats & Board */}
        <div className="min-h-[340px] flex flex-col justify-between">
          {activeTab === 'stats' ? (
            <div className="space-y-6 h-full flex flex-col justify-between">
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
                <div className="md:col-span-8 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl p-3 sm:p-4 relative">
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center sm:text-left border-t border-[var(--border-main)]">
                <div className="bg-[var(--bg-main)] p-2.5 rounded-lg border border-[var(--border-main)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">test type</span>
                  <span className="text-xs font-bold text-[var(--text-typed)] truncate block">
                    words {textLength} ({textLanguage.toLowerCase()})
                  </span>
                </div>

                <div className="bg-[var(--bg-main)] p-2.5 rounded-lg border border-[var(--border-main)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">raw</span>
                  <span className="text-sm font-bold text-[var(--accent-main)] block">{grossWpm}</span>
                </div>

                <div className="bg-[var(--bg-main)] p-2.5 rounded-lg border border-[var(--border-main)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">characters</span>
                  <span className="text-xs font-bold text-[var(--text-typed)] block">
                    {correctCharIndex}/{errorCount}/0/{Math.max(0, targetText.length - correctCharIndex)}
                  </span>
                </div>

                <div className="bg-[var(--bg-main)] p-2.5 rounded-lg border border-[var(--border-main)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">consistency</span>
                  <span className="text-sm font-bold text-[var(--accent-main)] block">{consistency}%</span>
                </div>

                <div className="bg-[var(--bg-main)] p-2.5 rounded-lg border border-[var(--border-main)] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">time</span>
                  <span className="text-sm font-bold text-[var(--text-typed)] block">{totalTimeSeconds}s</span>
                </div>
              </div>
            </div>
          ) : (
            /* Multiplayer Leaderboard Table View - Height equalized to 340px */
            <div className="h-[340px] overflow-x-auto rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-input)] text-[var(--accent-main)] border-b border-[var(--border-main)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">racer</th>
                    <th className="px-4 py-3">{strings.wpm}</th>
                    <th className="px-4 py-3">{strings.acc}</th>
                    <th className="px-4 py-3">status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)] text-[var(--text-typed)]">
                  {leaderboard.map((p, idx) => (
                    <tr key={p.id} className={p.id === localPlayerId ? 'bg-[var(--bg-input)] text-[var(--accent-main)] font-bold' : ''}>
                      <td className="px-4 py-3 text-[var(--text-muted)] font-bold">#{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold">{p.name} {p.id === localPlayerId && '(You)'}</td>
                      <td className="px-4 py-3 font-bold text-[var(--accent-main)] text-sm">{p.wpm}</td>
                      <td className="px-4 py-3 text-[var(--accent-main)]">{p.accuracy}%</td>
                      <td className="px-4 py-3 text-[11px] text-[var(--text-muted)]">
                        {p.isFinished ? 'finished' : `${p.progress.toFixed(0)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Controls & Keybind Hints */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[var(--border-main)]">
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-4">
            {canRematch ? (
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--accent-main)] font-bold">tab + enter</kbd>
                <span>or</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--accent-main)] font-bold">r</kbd>
                <span>- restart / next test</span>
              </span>
            ) : (
              <span className="text-[var(--accent-main)] font-semibold animate-pulse flex items-center gap-1.5">
                <span>⏳</span>
                <span>{strings.waitingForHostNextRace}</span>
              </span>
            )}
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            {canRematch ? (
              <>
                <button
                  onClick={handleRematch}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[var(--accent-main)] hover:brightness-110 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent-glow)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{strings.nextRace}</span>
                </button>

                <button
                  onClick={onReturnToLobby}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border-main)] text-[var(--text-typed)] font-bold text-xs transition-all border border-[var(--border-main)] flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4 text-[var(--text-muted)]" />
                  <span>{strings.returnToLobby}</span>
                </button>
              </>
            ) : (
              <button
                onClick={onReturnToLobby}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border-main)] text-[var(--text-typed)] font-bold text-xs transition-all border border-[var(--border-main)] flex items-center justify-center gap-2"
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
