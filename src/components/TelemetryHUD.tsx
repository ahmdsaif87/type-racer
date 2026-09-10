import React, { useEffect, useState } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { useRaceStore } from '../store/useRaceStore';
import { UI_STRINGS } from '../data/i18n';

export const TelemetryHUD: React.FC = () => {
  const { netWpm, accuracy, startTime, isFinished } = useTypingStore();
  const { players, localPlayerId, uiLanguage } = useRaceStore();
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;

  useEffect(() => {
    if (!startTime || isFinished) return;

    const interval = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSec(sec);
    }, 500);

    return () => clearInterval(interval);
  }, [startTime, isFinished]);

  const sortedPlayers = Object.values(players).sort((a, b) => b.progress - a.progress);
  const myRank = sortedPlayers.findIndex(p => p.id === localPlayerId) + 1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full mx-auto grid grid-cols-2 sm:flex items-center justify-around gap-3 sm:gap-8 py-2 font-mono text-sm mb-2 select-none">
      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <span className="text-[var(--text-muted)] text-xs font-semibold">{strings.wpm}</span>
        <span className="text-[var(--accent-main)] font-bold text-xl sm:text-2xl drop-shadow-[0_0_10px_var(--accent-glow)]">{netWpm}</span>
      </div>

      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <span className="text-[var(--text-muted)] text-xs font-semibold">{strings.acc}</span>
        <span className="text-[var(--accent-main)] font-bold text-xl sm:text-2xl drop-shadow-[0_0_10px_var(--accent-glow)]">{accuracy}%</span>
      </div>

      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <span className="text-[var(--text-muted)] text-xs font-semibold">{strings.time}</span>
        <span className="text-[var(--text-typed)] font-bold text-xl sm:text-2xl drop-shadow-[0_0_8px_var(--accent-glow)]">{formatTime(elapsedSec)}</span>
      </div>

      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <span className="text-[var(--text-muted)] text-xs font-semibold">{strings.rank}</span>
        <span className="text-[var(--accent-main)] font-bold text-xl sm:text-2xl drop-shadow-[0_0_10px_var(--accent-glow)]">#{myRank > 0 ? myRank : 1}</span>
      </div>
    </div>
  );
};
