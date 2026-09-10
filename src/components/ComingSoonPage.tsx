import React from 'react';
import { Sparkles, ArrowLeft, Trophy, Swords, FileCode2 } from 'lucide-react';
import { useRaceStore } from '../store/useRaceStore';
import { soundEngine } from '../services/audio';

interface ComingSoonPageProps {
  featureName?: string;
  onReturnHome: () => void;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  featureName,
  onReturnHome
}) => {
  const { uiLanguage } = useRaceStore();
  const isIndo = uiLanguage === 'id';

  const upcomingFeatures = [
    {
      icon: Swords,
      title: isIndo ? 'Mode Ranked 1v1' : 'Ranked 1v1 Mode',
      desc: isIndo ? 'Tanding adu kecepatan 1 lawan 1 dengan sistem peringkat ELO & Divisi.' : 'Competitive 1v1 typing battles with ELO ratings & divisions.'
    },
    {
      icon: Trophy,
      title: isIndo ? 'Mode Turnamen' : 'Tournament Mode',
      desc: isIndo ? 'Turnamen multiplayer sistem gugur otomatis hingga 32 pemain.' : 'Automated knockout multiplayer tournaments for up to 32 racers.'
    },
    {
      icon: FileCode2,
      title: isIndo ? 'Pasar Teks Komunitas' : 'Community Passage Market',
      desc: isIndo ? 'Buat, bagikan, dan nilai kutipan teks kustom dari komunitas.' : 'Create, share, and rate custom quotes from the global community.'
    }
  ];

  return (
    <div className="w-full max-w-lg mx-auto py-10 px-4 font-mono select-none space-y-6">
      {/* Header Badge */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--accent-main)]/10 border border-[var(--accent-main)]/30 flex items-center justify-center text-[var(--accent-main)] shadow-[0_0_20px_var(--accent-glow)] animate-pulse">
          <Sparkles className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-[var(--accent-main)] drop-shadow-[0_0_10px_var(--accent-glow)]">
          {featureName ? `${featureName}` : isIndo ? 'Fitur Dalam Pengembangan' : 'Feature Under Development'}
        </h2>

        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
          {isIndo
            ? 'Modul ini sedang dikembangkan secara aktif oleh tim TypeRacer Blitz. Pantau pembaruan selanjutnya!'
            : 'This module is actively under development by the TypeRacer Blitz team. Stay tuned for future updates!'}
        </p>
      </div>

      {/* Feature Preview Cards */}
      <div className="space-y-3 pt-2">
        <div className="text-[10px] uppercase tracking-wider text-[var(--accent-main)] font-bold text-center mb-1">
          {isIndo ? '--- Fitur Mendatang ---' : '--- Upcoming Features ---'}
        </div>

        {upcomingFeatures.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] flex items-start gap-3 shadow-md hover:border-[var(--accent-main)]/50 transition-all"
            >
              <div className="p-2 rounded-lg bg-[var(--bg-input)] text-[var(--accent-main)] border border-[var(--border-main)] shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-left">
                <h3 className="text-xs font-bold text-[var(--text-typed)] flex items-center gap-2">
                  <span>{item.title}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-main)]/20 text-[var(--accent-main)] border border-[var(--accent-main)]/30 uppercase font-semibold">
                    {isIndo ? 'Segera' : 'Soon'}
                  </span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Return Button */}
      <div className="pt-2">
        <button
          onClick={() => {
            soundEngine.playKeyPress();
            onReturnHome();
          }}
          className="w-full py-3.5 rounded-xl bg-[var(--accent-main)] hover:brightness-110 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isIndo ? 'Kembali ke Beranda' : 'Return to Home'}</span>
        </button>
      </div>
    </div>
  );
};
