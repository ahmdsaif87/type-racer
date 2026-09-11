import React, { useEffect, useState } from 'react';

interface ScriptItem {
  target: string;
  typoAt?: number;       // Character index where typo happens
  typoChar?: string;     // Wrong character to type
  typoPause?: number;    // Pause duration when typo happens (ms)
}

const DEFAULT_SCRIPT: ScriptItem[] = [
  {
    target: 'typeracer blitz',
    typoAt: 14,          // At 'z'
    typoChar: 'x',       // Types 'typeracer blitx'
    typoPause: 400
  },
  {
    target: 'realtime multiplayer',
    typoAt: 17,          // At 'a' in multiplayer
    typoChar: 'e',       // Types 'realtime multiple'
    typoPause: 420
  },
  {
    target: 'speed typing arcade',
    typoAt: 16,          // At 'a' in arcade
    typoChar: 'e',       // Types 'speed typing er'
    typoPause: 380
  }
];

interface TypewriterTextProps {
  className?: string;
  cursorClassName?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  className = '',
  cursorClassName = ''
}) => {
  const [scriptIndex, setScriptIndex] = useState<number>(0);
  const [displayText, setDisplayText] = useState<string>('');
  const [phase, setPhase] = useState<'TYPING' | 'TYPO_HOLD' | 'FIXING_TYPO' | 'ERASING'>('TYPING');
  const [hasDoneTypoThisPhrase, setHasDoneTypoThisPhrase] = useState<boolean>(false);

  const currentItem = DEFAULT_SCRIPT[scriptIndex % DEFAULT_SCRIPT.length];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const { target, typoAt, typoChar, typoPause = 400 } = currentItem;

    if (phase === 'TYPING') {
      const currentLen = displayText.length;

      // Check if we reached typo trigger index and haven't done typo yet for this phrase
      if (typoAt !== undefined && typoChar !== undefined && currentLen === typoAt && !hasDoneTypoThisPhrase) {
        // Type the wrong character!
        setDisplayText(target.slice(0, typoAt) + typoChar);
        setHasDoneTypoThisPhrase(true);
        setPhase('TYPO_HOLD');
      } else if (currentLen < target.length) {
        // Type next correct character with human timing jitter (85 - 135ms)
        const jitter = Math.floor(Math.random() * 45) - 15;
        timer = setTimeout(() => {
          setDisplayText(target.slice(0, currentLen + 1));
        }, 95 + jitter);
      } else {
        // Reached full text! Hold for 3200ms
        timer = setTimeout(() => {
          setPhase('ERASING');
        }, 3200);
      }
    } else if (phase === 'TYPO_HOLD') {
      // Pause when typo happens (simulating human "oops!" realization)
      timer = setTimeout(() => {
        setPhase('FIXING_TYPO');
      }, typoPause);
    } else if (phase === 'FIXING_TYPO') {
      // Backspace the wrong character (70ms)
      timer = setTimeout(() => {
        if (typoAt !== undefined) {
          setDisplayText(target.slice(0, typoAt));
        }
        setPhase('TYPING');
      }, 70);
    } else if (phase === 'ERASING') {
      if (displayText.length > 0) {
        // Fast backspacing (45ms)
        timer = setTimeout(() => {
          setDisplayText((prev) => prev.slice(0, -1));
        }, 45);
      } else {
        // Empty state pause before switching to next phrase (500ms)
        timer = setTimeout(() => {
          setHasDoneTypoThisPhrase(false);
          setScriptIndex((prev) => prev + 1);
          setPhase('TYPING');
        }, 500);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, phase, scriptIndex, currentItem, hasDoneTypoThisPhrase]);

  const isCurrentlyInTypo = phase === 'TYPO_HOLD';

  return (
    <span className={`inline-flex items-center justify-center font-mono whitespace-pre ${className}`}>
      {/* Render individual characters matching race UI styling */}
      {displayText.split('').map((char, index) => {
        const isWrongChar = isCurrentlyInTypo && index === displayText.length - 1;

        return (
          <span
            key={index}
            className={
              isWrongChar
                ? 'text-[var(--error-color)] font-bold text-error-glow bg-[var(--error-bg)] rounded-[2px] px-[1px]'
                : 'text-[var(--text-typed)] font-bold text-typed-glow'
            }
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}

      {/* Sleek TypeRacer Neon Cursor */}
      <span
        className={`inline-block w-[3px] sm:w-[4px] h-[0.85em] ${
          isCurrentlyInTypo ? 'bg-[var(--error-color)] shadow-[0_0_12px_var(--error-color)]' : 'bg-[var(--accent-main)] shadow-[0_0_12px_var(--accent-glow)]'
        } ml-1 rounded-full animate-cursor-blink align-middle ${cursorClassName}`}
      />
    </span>
  );
};
