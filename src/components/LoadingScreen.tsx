import React, { useEffect, useState } from 'react';
import { CarAvatar } from './CarAvatar';

interface LoadingScreenProps {
  message?: string;
  isOverlay?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'loading...',
  isOverlay = false
}) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + Math.floor(Math.random() * 15 + 10);
      });
    }, 150);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      translate="no"
      className={`notranslate ${
        isOverlay
          ? 'fixed inset-0 z-40 bg-[var(--bg-main)]/90 backdrop-blur-sm'
          : 'fixed inset-0 z-50 bg-[var(--bg-main)]'
      } text-[var(--text-typed)] font-mono flex flex-col items-center justify-center space-y-6 select-none transition-all duration-300`}
    >
      {/* Brand Logo */}
      <div className="flex flex-col items-center space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--accent-main)] drop-shadow-[0_0_15px_var(--accent-glow)] animate-pulse">
          typeracer blitz
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] tracking-widest uppercase">
          minimalist speed typing
        </p>
      </div>

      {/* Moving Nitro Car Preview */}
      <div className="relative w-48 h-10 flex items-center justify-center">
        <CarAvatar colorId="cyan" size="md" isMoving={true} />
      </div>

      {/* Minimal Progress Bar Indicator */}
      <div className="w-56 h-1.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-main)] overflow-hidden relative">
        <div
          className="h-full bg-[var(--accent-main)] rounded-full transition-all duration-200 ease-out shadow-[0_0_10px_var(--accent-glow)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-[var(--text-muted)] font-mono tracking-wider">
        {message} <span className="text-[var(--accent-main)]">{progress}%</span>
      </p>
    </div>
  );
};

