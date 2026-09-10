import React from 'react';
import type { Player } from '../types/game';
import { CarAvatar } from './CarAvatar';
import { useRaceStore } from '../store/useRaceStore';
import { UI_STRINGS } from '../data/i18n';

interface RaceTrackProps {
  players: Player[];
  currentPlayerId: string;
}

export const RaceTrack: React.FC<RaceTrackProps> = ({ players, currentPlayerId }) => {
  const { uiLanguage, hostId } = useRaceStore();
  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;

  // WPM Rank sorting
  const sortedPlayersByProgress = [...players].sort((a, b) => b.progress - a.progress);

  // Track Lane Order: Host (lane 1), Joiner 1 (lane 2), Joiner 2 (lane 3), etc.
  const laneOrderedPlayers = [...players].sort((a, b) => {
    if (a.id === hostId || a.isHost) return -1;
    if (b.id === hostId || b.isHost) return 1;
    return (a.joinedAt || 0) - (b.joinedAt || 0);
  });

  return (
    <div className="w-full mx-auto bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-4 md:p-5 space-y-3 font-mono select-none shadow-md">
      {/* Track Header */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] border-b border-[var(--border-main)] pb-2">
        <span className="uppercase tracking-wider text-[var(--accent-main)] font-bold">{strings.racetrack}</span>
        <span>{players.length} {strings.racersOnTrack}</span>
      </div>

      {/* Multi-lane track with moving cars */}
      <div className="space-y-3">
        {laneOrderedPlayers.map((player, index) => {
          const isCurrent = player.id === currentPlayerId;
          const currentRankIndex = sortedPlayersByProgress.findIndex(p => p.id === player.id);
          const rank = currentRankIndex >= 0 ? currentRankIndex + 1 : index + 1;

          return (
            <div
              key={player.id}
              className={`relative h-14 md:h-16 rounded-lg px-3 flex items-center transition-all overflow-hidden border ${
                isCurrent 
                  ? 'bg-[var(--bg-input)] border-[var(--accent-main)] shadow-[0_0_12px_var(--accent-glow)]' 
                  : 'bg-[var(--bg-main)] border-[var(--border-main)]'
              }`}
            >
              {/* Lane Center Line */}
              <div className="absolute left-36 right-16 top-1/2 -translate-y-1/2 h-[1px] border-t border-dashed border-[var(--border-main)] pointer-events-none" />

              {/* Finish Line Marker */}
              <div className="absolute right-12 top-2 bottom-2 w-3 rounded overflow-hidden flex flex-col justify-between border border-[var(--border-main)] opacity-80">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex h-1/4">
                    <div className={`w-1/2 ${i % 2 === 0 ? 'bg-[var(--accent-main)]' : 'bg-[var(--bg-card)]'}`} />
                    <div className={`w-1/2 ${i % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--accent-main)]'}`} />
                  </div>
                ))}
              </div>

              {/* Player Label Info */}
              <div className="flex items-center gap-1.5 sm:gap-2 z-10 w-24 sm:w-36 truncate">
                <span className="text-[10px] sm:text-[11px] text-[var(--accent-main)] font-bold">#{rank}</span>
                <div className="flex flex-col truncate">
                  <span className={`text-[11px] sm:text-xs truncate ${isCurrent ? 'text-[var(--text-typed)] font-bold text-typed-glow' : 'text-[var(--text-muted)]'}`}>
                    {player.name}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-[var(--accent-main)] font-semibold">
                    {player.wpm} wpm
                  </span>
                </div>
              </div>

              {/* Car Track Lane */}
              <div className="relative flex-1 h-full mx-2 flex items-center">
                <div
                  className="absolute transition-all duration-150 ease-out flex items-center"
                  style={{
                    left: `calc(${Math.min(96, Math.max(0, player.progress))}% - ${player.progress > 85 ? '40px' : '0px'})`
                  }}
                >
                  <CarAvatar 
                    colorId={player.color} 
                    size="sm" 
                    isMoving={player.wpm > 0 && !player.isFinished} 
                  />
                </div>
              </div>

              {/* Finish Status */}
              <div className="text-[11px] text-[var(--text-muted)] text-right w-10 z-10 font-mono">
                {player.isFinished ? (
                  <span className="text-[var(--accent-main)] font-bold drop-shadow-[0_0_6px_var(--accent-glow)]">done</span>
                ) : (
                  <span className="text-[var(--accent-main)]">{player.progress.toFixed(0)}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
