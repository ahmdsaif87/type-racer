import React, { useEffect, useState } from 'react';
import { soundEngine } from '../services/audio';
import { realtimeService } from '../services/realtime';
import { useRaceStore } from '../store/useRaceStore';

export const CountdownOverlay: React.FC = () => {
  const { countdownSec, hostId, localPlayerId, targetText } = useRaceStore();
  const [count, setCount] = useState<number>(countdownSec || 3);
  const isHost = hostId === localPlayerId;

  useEffect(() => {
    soundEngine.playCountdownBeep();

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          soundEngine.playGoSiren();

          // Set room status to IN_RACE for both host & guests locally
          useRaceStore.getState().setRoomStatus('IN_RACE');

          if (isHost) {
            setTimeout(() => {
              realtimeService.broadcastRoomStateChange('IN_RACE', targetText);
            }, 300);
          }
          return 0;
        }
        soundEngine.playCountdownBeep();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, targetText]);

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed inset-0 bg-[var(--bg-main)]/95 z-50 flex items-center justify-center font-mono select-none backdrop-blur-sm"
    >
      <div className="text-center bg-[var(--bg-card)] border border-[var(--border-main)] p-10 rounded-2xl shadow-2xl">
        <span
          key={count}
          className="text-8xl font-bold tracking-tighter block text-[var(--accent-main)] drop-shadow-[0_0_20px_var(--accent-glow)]"
        >
          {count === 0 ? 'go!' : count}
        </span>
      </div>
    </div>
  );
};
