import React, { useState } from 'react';
import type { CarColorId } from '../types/game';
import { CAR_COLORS } from '../data/texts';
import { CarAvatar } from './CarAvatar';
import { useRaceStore } from '../store/useRaceStore';
import { soundEngine } from '../services/audio';
import { UI_STRINGS } from '../data/i18n';
import { Flag, Check } from 'lucide-react';

interface ProfileModalProps {
  roomCode: string;
  onSave: (name: string, color: CarColorId) => void;
  onCancel: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  roomCode,
  onSave,
  onCancel
}) => {
  const { uiLanguage } = useRaceStore();
  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;

  const [nameInput, setNameInput] = useState<string>(() => {
    return 'racer_' + Math.floor(1000 + Math.random() * 9000);
  });
  const [selectedColor, setSelectedColor] = useState<CarColorId>('cyan');

  React.useEffect(() => {
    soundEngine.playModalOpen();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) return;

    soundEngine.playKeyPress();
    onSave(cleanName, selectedColor);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--accent-main)]/50 rounded-2xl p-6 space-y-6 shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-extrabold text-[var(--text-typed)] tracking-tight flex items-center justify-center gap-2">
            <Flag className="w-5 h-5 text-[var(--accent-main)] inline-block" />
            <span>{strings.welcomeRoomTitle}</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {strings.welcomeRoomSubtitle} <span className="font-bold text-[var(--accent-main)]">{roomCode}</span>. {strings.pickProfileBeforeJoin}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {strings.raceUsername}
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={strings.enterNamePlaceholder}
              maxLength={16}
              required
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--text-typed)] text-sm font-bold focus:outline-none focus:border-[var(--accent-main)] focus:ring-1 focus:ring-[var(--accent-main)] transition-all"
            />
          </div>

          {/* Car Color Selection Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {strings.pickCarColor}
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {CAR_COLORS.map((car) => {
                const isSelected = selectedColor === car.id;
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyPress();
                      setSelectedColor(car.id);
                    }}
                    className={`relative p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-[var(--bg-input)] border-[var(--accent-main)] shadow-[0_0_12px_var(--accent-glow)] scale-105'
                        : 'bg-[var(--bg-main)] border-[var(--border-main)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--accent-main)] text-slate-950 flex items-center justify-center text-[10px] font-bold">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                    <CarAvatar colorId={car.id} size="sm" isMoving={isSelected} />
                    <span className="text-[10px] font-bold text-[var(--text-muted)] truncate w-full text-center">
                      {car.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="flex-1 py-3.5 rounded-xl bg-[var(--accent-main)] hover:brightness-110 disabled:opacity-40 text-slate-950 font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>{strings.enterRoomBtn} ({roomCode})</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text-typed)] text-xs font-bold border border-[var(--border-main)] transition-all"
            >
              {strings.cancel}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
