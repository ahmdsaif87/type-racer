import { useEffect, useState } from 'react';
import { useRaceStore } from './store/useRaceStore';
import { useTypingStore } from './store/useTypingStore';
import { realtimeService } from './services/realtime';
import { soundEngine } from './services/audio';
import { getRandomText } from './data/texts';

// Components
import { LandingPage } from './components/LandingPage';
import { LobbyView } from './components/LobbyView';
import { RaceTrack } from './components/RaceTrack';
import { TypingBox } from './components/TypingBox';
import { TelemetryHUD } from './components/TelemetryHUD';
import { CountdownOverlay } from './components/CountdownOverlay';
import { PostRaceModal } from './components/PostRaceModal';
import { LoadingScreen } from './components/LoadingScreen';
import { AntigravityParticles } from './components/AntigravityParticles';

export function App() {
  const [view, setView] = useState<'LANDING' | 'RACE_ROOM'>('LANDING');
  const [isInitialBoot, setIsInitialBoot] = useState<boolean>(true);
  const [isPageNavigating, setIsPageNavigating] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getIsMuted());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('typeracer_theme') as 'dark' | 'light') || 'dark';
  });

  const {
    status,
    players,
    localPlayerId,
    targetText,
    uiLanguage,
    setUiLanguage,
    resetRaceRoom
  } = useRaceStore();

  const {
    setTargetText,
    resetTyping
  } = useTypingStore();

  // Initial App Boot Loading Screen (1200ms)
  useEffect(() => {
    const bootTimer = setTimeout(() => {
      setIsInitialBoot(false);
    }, 1200);

    return () => clearTimeout(bootTimer);
  }, []);

  // Check URL route on load (e.g. /race/RACE-9182)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/race/')) {
      const extractedCode = path.replace('/race/', '').toUpperCase();
      if (extractedCode) {
        handleEnterRaceRoom(extractedCode);
      }
    }
  }, []);

  // Global Keyboard Shortcuts (Esc to exit/lobby)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundEngine.playKeyPress();
        if (view === 'RACE_ROOM') {
          handleLeaveLobby();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  // Sync html lang attribute
  useEffect(() => {
    document.documentElement.lang = uiLanguage;
  }, [uiLanguage]);

  // Sync Typing Engine target text when room target text changes
  useEffect(() => {
    if (targetText) {
      setTargetText(targetText);
    }
  }, [targetText, setTargetText]);

  // Broadcast typing progress to room real-time channel
  const handleTypingProgress = () => {
    if (status !== 'IN_RACE') return;
    const typingState = useTypingStore.getState();
    realtimeService.broadcastProgress(
      typingState.progress,
      typingState.netWpm,
      typingState.accuracy,
      typingState.isFinished
    );

    if (typingState.isFinished || typingState.progress >= 100) {
      realtimeService.broadcastProgress(100, typingState.netWpm, typingState.accuracy, true, Date.now());
      setTimeout(() => {
        realtimeService.broadcastRoomStateChange('FINISHED', targetText);
      }, 250);
    }
  };

  const handleEnterRaceRoom = (roomCode: string, isCreate: boolean = false) => {
    setIsPageNavigating(true);
    const state = useRaceStore.getState();
    if (isCreate) {
      state.createRoom(roomCode);
    } else if (state.roomId !== roomCode) {
      state.joinExistingRoom(roomCode);
    }
    realtimeService.connectRoom(roomCode);
    
    setTimeout(() => {
      setView('RACE_ROOM');
      window.history.pushState({}, '', `/race/${roomCode}`);
      setIsPageNavigating(false);
    }, 600);
  };

  const handleLeaveLobby = () => {
    setIsPageNavigating(true);
    setTimeout(() => {
      realtimeService.disconnect();
      resetRaceRoom();
      resetTyping();
      setView('LANDING');
      window.history.pushState({}, '', '/');
      setIsPageNavigating(false);
    }, 500);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('typeracer_theme', nextTheme);
    soundEngine.playKeyPress();
  };

  const handleToggleLanguage = () => {
    const nextLang = uiLanguage === 'id' ? 'en' : 'id';
    setUiLanguage(nextLang);
    soundEngine.playKeyPress();

    const state = useRaceStore.getState();
    if (state.status === 'LOBBY' && state.hostId === state.localPlayerId && state.textLanguage !== 'CUSTOM') {
      const passageLang = nextLang === 'id' ? 'ID' : 'EN';
      const newText = getRandomText(passageLang, state.textLength);
      state.setRoomSettings(passageLang, state.textLength, newText);
      realtimeService.broadcastHostSettings(passageLang, state.textLength, newText);
    }
  };

  useEffect(() => {
    document.documentElement.className = theme === 'dark' ? 'theme-dark' : 'theme-light';
  }, [theme]);

  const playerList = Object.values(players);

  return (
    <div className={`relative min-h-screen font-mono flex flex-col justify-between transition-colors duration-300 bg-[var(--bg-main)] text-[var(--text-typed)] overflow-x-hidden ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      {/* Interactive Antigravity Background Particles */}
      <AntigravityParticles />

      {/* Initial Boot Loading Screen */}
      {isInitialBoot && <LoadingScreen message="initializing typeracer blitz..." />}

      {/* Page Navigation Transition Overlay */}
      {isPageNavigating && <LoadingScreen message="loading room..." isOverlay={true} />}

      {/* Header Bar */}
      <header className="relative z-10 w-full px-4 sm:w-[90%] md:w-[85%] mx-auto py-4 sm:py-6 flex flex-wrap items-center justify-between gap-2">
        <div 
          onClick={handleLeaveLobby}
          className="cursor-pointer group flex items-center gap-2"
        >
          <span className="font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-[var(--accent-main)] drop-shadow-[0_0_10px_var(--accent-glow)]">
            typeracer blitz
          </span>
        </div>

        {/* Audio, Theme & Language Controls */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs text-[var(--accent-main)] font-mono">
          <button
            onClick={handleToggleLanguage}
            className="hover:underline font-bold uppercase tracking-wider"
          >
            lang: {uiLanguage}
          </button>

          <button
            onClick={handleToggleTheme}
            className="hover:underline font-bold"
          >
            theme: {theme}
          </button>

          <button
            onClick={handleToggleMute}
            className="hover:underline font-bold"
          >
            {isMuted ? 'sound: off' : 'sound: on'}
          </button>
        </div>
      </header>

      {/* Main Content Body with Smooth Fade Transition */}
      <main key={view} className="relative z-10 flex-1 w-full px-3 sm:w-[90%] md:w-[85%] mx-auto py-2 sm:py-4 flex flex-col justify-center page-fade-enter">
        {view === 'LANDING' && (
          <LandingPage onStartRace={handleEnterRaceRoom} />
        )}

        {view === 'RACE_ROOM' && (
          <>
            {/* LOBBY STATE */}
            {status === 'LOBBY' && (
              <LobbyView onLeaveLobby={handleLeaveLobby} />
            )}

            {/* COUNTDOWN OVERLAY */}
            {status === 'COUNTDOWN' && (
              <CountdownOverlay />
            )}

            {/* IN RACE STATE */}
            {(status === 'IN_RACE' || status === 'COUNTDOWN') && (
              <div className="w-full space-y-4">
                <TelemetryHUD />
                <RaceTrack players={playerList} currentPlayerId={localPlayerId} />
                <TypingBox
                  isDisabled={status === 'COUNTDOWN'}
                  disabledReason="waiting for race..."
                  onTypingProgress={handleTypingProgress}
                />
              </div>
            )}

            {/* POST-RACE MODAL */}
            {status === 'FINISHED' && (
              <PostRaceModal onReturnToLobby={() => {
                resetRaceRoom();
                resetTyping();
              }} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-4 sm:w-[90%] md:w-[85%] mx-auto py-4 sm:py-6 text-center text-xs text-[var(--text-muted)] flex items-center justify-between">
        <span>typeracer blitz</span>
        <span>theme: {theme}</span>
      </footer>
    </div>
  );
}

export default App;

