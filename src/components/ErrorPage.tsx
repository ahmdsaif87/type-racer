import React from 'react';
import { AlertTriangle, Home, PlusCircle } from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { soundEngine } from '../services/audio';

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
  const isIndo = uiLanguage === 'id';

  const defaultMsg = isIndo
    ? `Kode room ${roomId ? `"${roomId}"` : ''} tidak ditemukan, tidak valid, atau host telah keluar dari room.`
    : `Room code ${roomId ? `"${roomId}"` : ''} was not found, invalid, or the host has left the room.`;

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4 font-mono text-center select-none space-y-6">
      {/* Icon Badge */}
      <div className="w-20 h-20 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-pulse">
        <AlertTriangle className="w-10 h-10" />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--accent-main)] drop-shadow-[0_0_10px_var(--accent-glow)]">
          {isIndo ? 'Room Tidak Ditemukan' : 'Room Not Found'}
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
          className="w-full py-3.5 rounded-xl bg-[var(--accent-main)] hover:brightness-110 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>{isIndo ? 'Kembali ke Beranda' : 'Return to Home'}</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playKeyPress();
            onCreateNewRoom();
          }}
          className="w-full py-3.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border-main)] text-[var(--text-typed)] font-bold text-xs transition-all border border-[var(--border-main)] flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4 text-[var(--accent-main)]" />
          <span>{isIndo ? 'Buat Room Baru' : 'Create New Room'}</span>
        </button>
      </div>
    </div>
  );
};
