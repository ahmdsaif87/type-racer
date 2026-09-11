import React, { useRef, useState, useEffect } from 'react';
import { useTypingStore } from '../store/useTypingStore';
import { useRaceStore } from '../store/useRaceStore';
import { realtimeService } from '../services/realtime';
import { soundEngine } from '../services/audio';
import { UI_STRINGS } from '../data/i18n';
import { Globe, RotateCcw } from 'lucide-react';

interface TypingBoxProps {
  isDisabled?: boolean;
  disabledReason?: string;
  onTypingProgress?: () => void;
}

export const TypingBox: React.FC<TypingBoxProps> = ({
  isDisabled = false,
  disabledReason = 'waiting for race...',
  onTypingProgress
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const restartBtnRef = useRef<HTMLButtonElement>(null);
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [isRestartFocused, setIsRestartFocused] = useState<boolean>(false);
  const [isRestartHovered, setIsRestartHovered] = useState<boolean>(false);

  const {
    targetText,
    userInput,
    correctCharIndex,
    handleInputChange,
    isFinished,
    resetTyping
  } = useTypingStore();

  const { isSinglePlayer, hostId, localPlayerId, textLanguage, uiLanguage, resetRaceRoom } = useRaceStore();
  const isHost = hostId === localPlayerId;
  const canRestart = isSinglePlayer || isHost;
  const strings = UI_STRINGS[uiLanguage] || UI_STRINGS.id;

  useEffect(() => {
    if (!isDisabled && !isFinished && !isRestartFocused) {
      inputRef.current?.focus();
      setIsFocused(true);

      const timer = setTimeout(() => {
        if (inputRef.current && !isDisabled && !isFinished && !isRestartFocused) {
          inputRef.current.focus();
          setIsFocused(true);
        }
      }, 30);

      const raf = requestAnimationFrame(() => {
        if (inputRef.current && !isDisabled && !isFinished && !isRestartFocused) {
          inputRef.current.focus();
        }
      });

      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(raf);
      };
    }
  }, [isDisabled, isFinished, isRestartFocused]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isDisabled || isFinished) return;

      if (
        document.activeElement !== inputRef.current &&
        document.activeElement !== restartBtnRef.current &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        inputRef.current?.focus();
        setIsFocused(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isDisabled, isFinished]);

  const onContainerClick = (e: React.MouseEvent) => {
    // Avoid stealing focus if user clicked the restart button
    if (restartBtnRef.current?.contains(e.target as Node)) {
      return;
    }
    if (!isDisabled && !isFinished) {
      inputRef.current?.focus();
      setIsFocused(true);
      setIsRestartFocused(false);
    }
  };

  const handleRestartAction = () => {
    if (!canRestart) return;
    soundEngine.playKeyPress();
    resetTyping();
    resetRaceRoom();

    const raceState = useRaceStore.getState();
    if (raceState.isSinglePlayer) {
      realtimeService.broadcastRoomStateChange('COUNTDOWN', raceState.targetText, 3);
    } else if (raceState.hostId === raceState.localPlayerId) {
      realtimeService.broadcastRoomStateChange('LOBBY', raceState.targetText);
    }

    // Refocus input after restart
    setTimeout(() => {
      setIsRestartFocused(false);
      inputRef.current?.focus();
    }, 50);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      soundEngine.playKeyPress();
      restartBtnRef.current?.focus();
      setIsRestartFocused(true);
    } else if (e.key === ' ') {
      const state = useTypingStore.getState();
      if (state.hasError || state.userInput.length > state.correctCharIndex) {
        soundEngine.playError();
      }
    }
  };

  const handleRestartButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRestartAction();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      inputRef.current?.focus();
      setIsRestartFocused(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled || isFinished) return;
    handleInputChange(e.target.value);
    if (onTypingProgress) {
      onTypingProgress();
    }
  };

  // Calculate typed character count
  const typedCount = Math.min(targetText.length, userInput.length);
  const totalLength = targetText.length;

  return (
    <div
      onClick={onContainerClick}
      onTouchEnd={(e) => onContainerClick(e as any)}
      className="relative w-full mx-auto py-8 md:py-12 cursor-text transition-all select-none"
    >
      {/* Full-Box Invisible Native Input Field for Mobile Virtual Keyboards */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        value={userInput}
        onChange={handleTextChange}
        onKeyDown={handleInputKeyDown}
        onFocus={() => {
          setIsFocused(true);
          setIsRestartFocused(false);
        }}
        onBlur={() => setIsFocused(false)}
        disabled={isDisabled || isFinished}
        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-text select-text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        {...{
          autocapitalize: 'none',
          autocorrect: 'off',
          autocomplete: 'off',
          spellcheck: 'false'
        } as any}
      />

      {/* Top Header - Character Counter & Language Indicator */}
      <div className="relative z-20 pointer-events-auto flex items-center justify-between mb-4 sm:mb-8 px-2">
        {/* Character Progress Counter */}
        <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[var(--accent-main)] drop-shadow-[0_0_10px_var(--accent-glow)]">
          {typedCount}/{totalLength}
        </div>

        {/* Language Badge */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
          <Globe className="w-3.5 h-3.5 text-[var(--accent-main)]" />
          <span className="lowercase">
            {textLanguage === 'ID' ? strings.indonesian : textLanguage === 'EN' ? strings.english : strings.customText}
          </span>
        </div>
      </div>

      {/* Text Passage Container - 100% Static with Preserved Spaces */}
      <div translate="no" className="notranslate relative z-0 pointer-events-none font-mono text-base sm:text-xl md:text-2xl leading-relaxed md:leading-loose tracking-wider break-words min-h-[120px] sm:min-h-[140px] text-left px-2 whitespace-pre-wrap select-none">
        {targetText.split('').map((char, index) => {
          const isTyped = index < userInput.length;
          const isCorrect = index < correctCharIndex;
          const isCurrentCursor = index === userInput.length;

          let colorClass = 'text-[var(--text-untyped)] font-semibold';

          if (isTyped) {
            if (isCorrect) {
              colorClass = 'text-[var(--text-typed)] font-semibold text-typed-glow';
            } else {
              colorClass = 'text-[var(--error-color)] font-semibold text-error-glow bg-[var(--error-bg)] rounded-[2px]';
            }
          }

          return (
            <span key={index} className="relative inline">
              {/* Sleek Vertical Cursor */}
              {isCurrentCursor && !isDisabled && !isFinished && !isRestartFocused && (
                <span className="absolute -left-[1px] top-[10%] bottom-[10%] w-[3px] bg-[var(--accent-main)] rounded-full animate-cursor-blink shadow-[0_0_14px_var(--accent-main),0_0_24px_var(--accent-main)] z-10" />
              )}
              <span className={colorClass}>
                {char}
              </span>
            </span>
          );
        })}
      </div>

      {/* Interactive Restart Button (Focused via Tab) & Tooltip Hint */}
      {canRestart && (
        <div className="relative z-20 pointer-events-auto flex flex-col items-center justify-center mt-4 sm:mt-6 space-y-2">
          <button
            ref={restartBtnRef}
            onClick={handleRestartAction}
            onKeyDown={handleRestartButtonKeyDown}
            onFocus={() => setIsRestartFocused(true)}
            onBlur={() => setIsRestartFocused(false)}
            onMouseEnter={() => setIsRestartHovered(true)}
            onMouseLeave={() => setIsRestartHovered(false)}
            className="p-2.5 sm:p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-[var(--accent-main)] hover:text-[var(--accent-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)] focus:border-[var(--accent-main)] text-[var(--text-muted)] transition-all group shadow-sm"
            title={`${strings.restartTest} (tab / enter)`}
          >
            <RotateCcw className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform text-[var(--accent-main)]" />
          </button>

          {/* Tooltip Badge matching Screenshot 2 */}
          <div className={`text-[11px] font-mono px-3 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-typed)] transition-opacity shadow-sm ${isRestartFocused || isRestartHovered ? 'opacity-100' : 'opacity-60'}`}>
            {strings.restartTest} <span className="text-[var(--accent-main)] font-bold">(tab / enter)</span>
          </div>
        </div>
      )}

      {/* Shortcut Hints Bar (Monkeytype Style) */}
      {canRestart && (
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] text-[var(--text-muted)] font-mono select-none">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--accent-main)] font-bold">tab</kbd>
            <span>- {strings.tabToFocus}</span>
          </span>

          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--accent-main)] font-bold">enter</kbd>
            <span>- {strings.enterToRestart}</span>
          </span>

          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--accent-main)] font-bold">esc</kbd>
            <span>- {strings.escToLobby}</span>
          </span>
        </div>
      )}

      {/* Disabled Overlay */}
      {isDisabled && (
        <div className="absolute inset-0 bg-[var(--bg-main)]/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
          <p className="text-[var(--accent-main)] text-sm font-mono tracking-wide shadow-[0_0_10px_var(--accent-glow)]">
            {disabledReason}
          </p>
        </div>
      )}

      {/* Unfocused Click Hint */}
      {!isFocused && !isRestartFocused && !isDisabled && !isFinished && (
        <div className="absolute inset-0 bg-[var(--bg-main)]/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10">
          <span className="text-[var(--accent-main)] text-xs font-mono tracking-widest uppercase bg-[var(--bg-card)] border border-[var(--border-main)] px-4 py-2 rounded-lg shadow-[0_0_12px_var(--accent-glow)]">
            {strings.clickToFocus}
          </span>
        </div>
      )}
    </div>
  );
};
