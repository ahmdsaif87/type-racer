import React, { useState } from 'react';
import { CAR_COLORS } from '../data/texts';
import type { CarColorId } from '../types/game';
import { CarAvatar } from './CarAvatar';
import { useRaceStore } from '../store/useRaceStore';
import { soundEngine } from '../services/audio';
import { UI_STRINGS } from '../data/i18n';

interface LandingPageProps {
  onStartRace: (roomId: string, isCreate?: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartRace }) => {
  const { localPlayerName, localPlayerColor, uiLanguage, setLocalPlayer, createRoom, startSinglePlayer } = useRaceStore();
  
  const [alias, setAlias] = useState<string>(localPlayerName);
  const [selectedColor, setSelectedColor] = useState<CarColorId>(localPlayerColor);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');

  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;

  const handleColorSelect = (colorId: CarColorId) => {
    setSelectedColor(colorId);
    soundEngine.playKeyPress();
  };

  const handleCreateRoom = () => {
    const finalAlias = alias.trim() || 'racer_' + Math.floor(1000 + Math.random() * 9000);
    setLocalPlayer(finalAlias, selectedColor);
    
    const newRoomId = 'RACE-' + Math.floor(1000 + Math.random() * 9000);
    createRoom(newRoomId);
    onStartRace(newRoomId, true);
  };

  const handleSinglePlayerMode = () => {
    const finalAlias = alias.trim() || 'racer_' + Math.floor(1000 + Math.random() * 9000);
    setLocalPlayer(finalAlias, selectedColor);
    
    startSinglePlayer();
    const soloRoomId = useRaceStore.getState().roomId;
    onStartRace(soloRoomId, true);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    const finalAlias = alias.trim() || 'racer_' + Math.floor(1000 + Math.random() * 9000);
    setLocalPlayer(finalAlias, selectedColor);

    const formattedCode = roomCodeInput.trim().toUpperCase();
    onStartRace(formattedCode, false);
  };

  return (
    <div className="w-full max-w-lg mx-auto py-10 px-4 font-mono select-none">
      {/* Logo Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--accent-main)] drop-shadow-[0_0_12px_var(--accent-glow)] mb-1">
          {strings.appTitle}
        </h1>
        <p className="text-xs text-[var(--text-typed)]/70">
          {strings.tagline}
        </p>
      </div>

      {/* Container */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-6 space-y-6 shadow-xl">
        {/* Alias Input */}
        <div>
          <label className="block text-xs text-[var(--accent-main)] uppercase tracking-wider mb-2 font-bold">
            {strings.playerAlias}
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder={strings.aliasPlaceholder}
            maxLength={20}
            className="w-full px-4 py-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--text-typed)] placeholder-[var(--text-untyped)] text-sm focus:outline-none focus:border-[var(--accent-main)] transition-all"
          />
        </div>

        {/* Color Picker with Preview */}
        <div>
          <label className="block text-xs text-[var(--accent-main)] uppercase tracking-wider mb-2 font-bold">
            {strings.carColor}
          </label>
          
          <div className="w-full h-16 bg-[var(--bg-input)] rounded-lg border border-[var(--border-main)] flex items-center justify-center mb-3">
            <CarAvatar colorId={selectedColor} size="md" isMoving={true} />
          </div>

          <div className="grid grid-cols-6 gap-2">
            {CAR_COLORS.map((c) => {
              const isSelected = selectedColor === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleColorSelect(c.id)}
                  className={`h-9 rounded-lg transition-all relative ${
                    isSelected 
                      ? 'ring-2 ring-[var(--accent-main)] scale-105 shadow-md' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.primary }}
                  title={c.name}
                />
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {/* Single Player Button */}
          <button
            onClick={handleSinglePlayerMode}
            className="w-full py-3.5 rounded-lg bg-[var(--accent-main)] hover:brightness-110 text-slate-950 font-extrabold text-sm transition-all shadow-md"
          >
            {strings.singlePlayer}
          </button>

          {/* Create Multiplayer Room Button */}
          <button
            onClick={handleCreateRoom}
            className="w-full py-3.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-main)] text-[var(--text-typed)] font-bold text-sm transition-all border border-[var(--border-main)]"
          >
            {strings.createRoom}
          </button>

          {/* Join Room Form */}
          <form onSubmit={handleJoinRoom} className="flex gap-2">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder={strings.roomCodePlaceholder}
              className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--text-typed)] placeholder-[var(--text-untyped)] text-xs font-mono focus:outline-none focus:border-[var(--accent-main)]"
            />
            <button
              type="submit"
              disabled={!roomCodeInput.trim()}
              className="px-5 py-3 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-main)] disabled:opacity-40 text-[var(--text-typed)] font-bold text-xs transition-all border border-[var(--border-main)]"
            >
              {strings.joinRoom}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
