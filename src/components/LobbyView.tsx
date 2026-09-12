import React, { useState, useEffect } from 'react';
import { useRaceStore, MAX_PLAYERS_PER_ROOM } from '../store/useRaceStore';
import { useTypingStore } from '../store/useTypingStore';
import { realtimeService } from '../services/realtime';
import { RaceTrack } from './RaceTrack';
import type { TextLanguage, TextLength } from '../types/game';
import { soundEngine } from '../services/audio';
import { UI_STRINGS } from '../data/i18n';
import { getRandomText } from '../data/texts';
import { Copy, Check, Info } from 'lucide-react';

interface LobbyViewProps {
  onLeaveLobby: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onLeaveLobby }) => {
  const {
    roomId,
    hostId,
    localPlayerId,
    players,
    textLanguage,
    textLength,
    uiLanguage,
    targetText,
    isSinglePlayer,
    customText
  } = useRaceStore();

  const [copied, setCopied] = useState<boolean>(false);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customTextInput, setCustomTextInput] = useState<string>(customText || '');

  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;
  const isHost = localPlayerId === hostId;
  const playerList = Object.values(players);

  const nonHostPlayers = playerList.filter(p => !p.isHost);
  const allGuestsReady = isSinglePlayer || nonHostPlayers.length === 0 || nonHostPlayers.every(p => p.isReady);
  const readyGuestsCount = nonHostPlayers.filter(p => p.isReady).length;

  // Power User Shortcut: Ctrl+Enter or Cmd+Enter to start race as Host
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHost && allGuestsReady && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleStartRace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHost, allGuestsReady, targetText]);

  const handleCopyLink = () => {
    const shareUrl = isSinglePlayer 
      ? roomId 
      : `${window.location.origin}/race/${roomId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    soundEngine.playKeyPress();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLanguageChange = (lang: TextLanguage) => {
    if (!isHost) return;
    soundEngine.playKeyPress();

    if (lang === 'CUSTOM') {
      setShowCustomModal(true);
      return;
    }

    const state = useRaceStore.getState();
    const newText = getRandomText(lang, state.textLength);
    state.setRoomSettings(lang, state.textLength, newText);
    realtimeService.broadcastHostSettings(lang, state.textLength, newText);
  };

  const handleCustomTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTextInput.trim()) return;

    soundEngine.playKeyPress();
    setShowCustomModal(false);
    const state = useRaceStore.getState();
    state.setRoomSettings('CUSTOM', state.textLength, customTextInput.trim());
    realtimeService.broadcastHostSettings('CUSTOM', state.textLength, customTextInput.trim());
  };

  const handleLengthChange = (length: TextLength) => {
    if (!isHost) return;
    soundEngine.playKeyPress();
    const state = useRaceStore.getState();
    const newText = getRandomText(state.textLanguage, length);
    state.setRoomSettings(state.textLanguage, length, newText);
    realtimeService.broadcastHostSettings(state.textLanguage, length, newText);
  };

  const me = players[localPlayerId];
  const isLocalReady = me?.isReady ?? false;

  const handleToggleReady = () => {
    soundEngine.playKeyPress();
    const nextReady = !isLocalReady;
    realtimeService.broadcastPlayerReady(nextReady);
  };

  const handleStartRace = () => {
    if (!isHost || !allGuestsReady) return;
    soundEngine.playKeyPress();
    useRaceStore.getState().setRoomStatus('COUNTDOWN');
    useTypingStore.getState().resetTyping();
    realtimeService.broadcastRoomStateChange('COUNTDOWN', targetText, 3);
  };

  return (
    <div className="w-full mx-auto space-y-5 font-mono select-none">
      {/* Room Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-4 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onLeaveLobby}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors"
          >
            {strings.leave}
          </button>
          <span className="text-sm font-bold text-[var(--accent-main)]">
            {isSinglePlayer ? strings.soloPractice : `${strings.room}: ${roomId}`}
          </span>
          {isHost && !isSinglePlayer && (
            <span className="text-[10px] text-[var(--accent-main)] bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-main)] font-semibold">
              host
            </span>
          )}
          {!isSinglePlayer && (
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-input)] px-2 py-0.5 rounded border border-[var(--border-main)] font-mono flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${playerList.length > 1 || isHost ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              {playerList.length > 1 || isHost ? `${strings.players}: ${playerList.length}/${MAX_PLAYERS_PER_ROOM}` : strings.connectingToRoom}
            </span>
          )}
        </div>

        {!isSinglePlayer && (
          <button
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              copied
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-[var(--bg-input)] border-[var(--border-main)] hover:border-[var(--accent-main)] text-[var(--accent-main)]'
            }`}
            title={strings.copyInvite}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{strings.linkCopied || strings.inviteCopied}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{strings.copyLink || strings.copyInvite}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* P2P Multi-Player Guidance Badge */}
      {!isSinglePlayer && playerList.length <= 1 && (
        <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg px-3.5 py-2 text-[11px] text-[var(--text-muted)] shadow-sm">
          <Info className="w-4 h-4 text-[var(--accent-main)] shrink-0" />
          <span>
            {strings.multiplayerGuidance}
          </span>
        </div>
      )}

      {/* Mode Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-3 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-muted)]">
        {/* Language & Custom selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[var(--accent-main)] font-bold">{strings.mode}:</span>
          <button
            onClick={() => handleLanguageChange('ID')}
            disabled={!isHost}
            className={`px-2.5 py-1 rounded transition-all ${
              textLanguage === 'ID'
                ? 'text-[var(--accent-main)] bg-[var(--bg-input)] font-bold border border-[var(--accent-main)]/50 shadow-sm'
                : 'hover:text-[var(--text-typed)]'
            }`}
          >
            {strings.indonesian}
          </button>
          <button
            onClick={() => handleLanguageChange('EN')}
            disabled={!isHost}
            className={`px-2.5 py-1 rounded transition-all ${
              textLanguage === 'EN'
                ? 'text-[var(--accent-main)] bg-[var(--bg-input)] font-bold border border-[var(--accent-main)]/50 shadow-sm'
                : 'hover:text-[var(--text-typed)]'
            }`}
          >
            {strings.english}
          </button>
          <button
            onClick={() => handleLanguageChange('CUSTOM')}
            disabled={!isHost}
            className={`px-2.5 py-1 rounded transition-all ${
              textLanguage === 'CUSTOM'
                ? 'text-[var(--accent-main)] bg-[var(--bg-input)] font-bold border border-[var(--accent-main)]/50 shadow-sm'
                : 'hover:text-[var(--text-typed)]'
            }`}
          >
            {strings.customText}
          </button>
        </div>

        {textLanguage !== 'CUSTOM' && (
          <>
            <div className="w-[1px] h-4 bg-[var(--border-main)]" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[var(--accent-main)] font-bold">{strings.length}:</span>
              {([15, 25, 50] as TextLength[]).map((len) => (
                <button
                  key={len}
                  onClick={() => handleLengthChange(len)}
                  disabled={!isHost}
                  className={`px-2.5 py-1 rounded transition-all ${
                    textLength === len
                      ? 'text-[var(--accent-main)] bg-[var(--bg-input)] font-bold border border-[var(--accent-main)]/50 shadow-sm'
                      : 'hover:text-[var(--text-typed)]'
                  }`}
                >
                  {len}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Track Preview */}
      <RaceTrack players={playerList} currentPlayerId={localPlayerId} />

      {/* Action Button: Start Race (Host) or Toggle Ready (Non-Host) */}
      <div className="pt-1">
        {isHost ? (
          <button
            onClick={handleStartRace}
            disabled={!allGuestsReady}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-1.5 ${
              allGuestsReady
                ? 'bg-[var(--accent-main)] hover:brightness-110 text-slate-950 cursor-pointer shadow-[0_0_15px_var(--accent-glow)]'
                : 'bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] opacity-60 cursor-not-allowed'
            }`}
          >
            {allGuestsReady ? (
              <>
                <span>{strings.startRace}</span>
                <span className="text-xs font-semibold opacity-80">(ctrl + enter)</span>
              </>
            ) : (
              <span>{strings.waitingForMembersReady.replace('{ready}', readyGuestsCount.toString()).replace('{total}', nonHostPlayers.length.toString())}</span>
            )}
          </button>
        ) : (
          <button
            onClick={handleToggleReady}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isLocalReady
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isLocalReady ? (
              <>
                <span>{strings.iAmReadyBadge}</span>
                <span className="text-xs opacity-80 font-semibold">{strings.clickToUnready}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{strings.iAmReady}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Custom Text Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-[#000000]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--accent-main)]/50 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
              <span className="text-sm font-bold text-[var(--accent-main)]">{strings.customTextTitle}</span>
              <button onClick={() => setShowCustomModal(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-typed)]">{strings.close}</button>
            </div>

            <form onSubmit={handleCustomTextSubmit} className="space-y-4">
              <textarea
                value={customTextInput}
                onChange={(e) => setCustomTextInput(e.target.value)}
                placeholder={strings.customTextPlaceholder}
                rows={5}
                className="w-full p-3.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--text-typed)] placeholder-[var(--text-untyped)] text-xs font-mono focus:outline-none focus:border-[var(--accent-main)] resize-none"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!customTextInput.trim()}
                  className="flex-1 py-3 rounded-lg bg-[var(--accent-main)] hover:brightness-110 disabled:opacity-40 text-white font-extrabold text-xs transition-all"
                >
                  {strings.saveCustomText}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-3 rounded-lg bg-[var(--bg-input)] text-[var(--text-typed)] text-xs font-bold border border-[var(--border-main)]"
                >
                  {strings.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
