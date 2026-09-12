import React from 'react';
import { AlertTriangle, Home, PlusCircle } from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { soundEngine } from '../services/audio';
import { UI_STRINGS } from '../data/i18n';

interface ErrorPageProps {
  errorMessage?: string;
  roomId?: string;
  onReturnHome: () => void;
  onCreateNewRoom: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  errorMessage,
  roomId,
  onReturnHome,
  onCreateNewRoom
}) => {
  const { uiLanguage } = useRaceStore();
  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;

  const defaultMsg = strings.roomNotFoundDefaultMsg.replace('{roomId}', roomId ? `"${roomId}"` : '');

  React.useEffect(() => {
    soundEngine.playModalOpen();
  }, []);

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4 font-mono text-center select-none space-y-6">
      {/* Title & Icon */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--accent-main)] drop-shadow-[0_0_10px_var(--accent-glow)] flex items-center justify-center gap-2">
          <AlertTriangle className="w-6 h-6 text-rose-400 inline-block" />
          <span>{strings.roomNotFoundTitle}</span>
        </h2>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed px-2">
          {errorMessage || defaultMsg}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-4">
        <button
          onClick={() => {
            soundEngine.playKeyPress();
            onReturnHome();
          }}
          className="w-full py-3.5 rounded-xl bg-[var(--accent-main)] hover:brightness-110 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>{strings.returnToHome}</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playKeyPress();
            onCreateNewRoom();
          }}
          className="w-full py-3.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border-main)] text-[var(--text-typed)] font-bold text-xs transition-all border border-[var(--border-main)] flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-[var(--accent-main)]" />
          <span>{strings.createNewRoom}</span>
        </button>
      </div>
    </div>
  );
};
