import React from 'react';
import { Player, GameModuleId } from '../types';
import { Tv, Volume2, VolumeX, QrCode, Users, Sparkles, Home } from 'lucide-react';
import { playSound } from '../utils/audio';

interface HeaderProps {
  players: Player[];
  activeGame: GameModuleId | null;
  onNavigateHome: () => void;
  onOpenPlayerSetup: () => void;
  onOpenQR: () => void;
  onSwitchToController?: () => void;
  roomCode?: string;
  isControllerConnected?: boolean;
  tvMode: boolean;
  onToggleTvMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  players,
  activeGame,
  onNavigateHome,
  onOpenPlayerSetup,
  onOpenQR,
  onSwitchToController,
  roomCode,
  isControllerConnected,
  tvMode,
  onToggleTvMode,
  soundEnabled,
  onToggleSound,
}) => {
  const getGameTitle = () => {
    switch (activeGame) {
      case 'whos-most-likely':
        return "Who's Most Likely To?";
      case 'would-you-rather':
        return 'Would You Rather?';
      case 'guess-the-emoji':
        return 'Guess the Emoji';
      default:
        return 'Party Games';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFF9F1]/95 backdrop-blur-md border-b border-[#E5DDFB] px-4 md:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playSound.pop(soundEnabled);
              onNavigateHome();
            }}
            className="flex items-center gap-2 text-left group transition-transform active:scale-95"
            title="Go to GIGGLE Lobby"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#F9DCE9] border-2 border-[#1E1B2E] flex items-center justify-center text-xl shadow-[2px_2px_0px_#1E1B2E] group-hover:rotate-6 transition-transform">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-2xl font-black tracking-tight text-[#1E1B2E]">
                  GIGGLE
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#FFF0CC] border border-[#1E1B2E] text-[#1E1B2E]">
                  4-Player
                </span>
              </div>
              {activeGame && (
                <div className="text-xs font-semibold text-purple-700 truncate max-w-[160px] sm:max-w-xs">
                  {getGameTitle()}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Player Score Chips (Clean unboxed inline badges) */}
        <div className="hidden lg:flex items-center gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1E1B2E]/15 text-xs font-medium shadow-[1px_1px_0px_rgba(0,0,0,0.06)]"
              style={{ backgroundColor: p.color }}
            >
              <span className="text-base">{p.avatar}</span>
              <span className="font-semibold text-[#1E1B2E] max-w-[70px] truncate">{p.name}</span>
              <span className="font-bold font-mono text-[#1E1B2E] bg-white/70 px-1.5 py-0.5 rounded-md">
                {p.score}
              </span>
            </div>
          ))}
        </div>

        {/* Controls Zone */}
        <div className="flex items-center gap-2 shrink-0">
          {/* TV Mode Toggle */}
          <button
            onClick={() => {
              playSound.pop(soundEnabled);
              onToggleTvMode();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] transition-all active:translate-y-0.5 ${
              tvMode ? 'bg-[#34D399] text-[#1E1B2E]' : 'bg-white hover:bg-[#DCEEFF] text-[#1E1B2E]'
            }`}
            title={tvMode ? 'Exit TV Big Screen Mode' : 'Enter TV Big Screen Mode'}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tvMode ? 'TV Mode ON' : 'TV View'}</span>
          </button>

          {/* Change Names Button */}
          <button
            onClick={() => {
              playSound.pop(soundEnabled);
              onOpenPlayerSetup();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-[#F9DCE9] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] transition-all active:translate-y-0.5"
            title="Change Player Names & Avatars"
          >
            <Users className="w-3.5 h-3.5 text-purple-700" />
            <span>Change Names</span>
          </button>

          {/* QR Code / Phone Controller Button */}
          <button
            onClick={() => {
              playSound.pop(soundEnabled);
              onOpenQR();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E5DDFB] hover:bg-[#D9F2E7] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] transition-all active:translate-y-0.5"
            title="Scan QR Code or Open Phone Controller"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phone Controller</span>
            {isControllerConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Connected" />
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const nextState = !soundEnabled;
              onToggleSound();
              if (nextState) playSound.pop(true);
            }}
            className="p-2 rounded-xl text-xs font-bold bg-white hover:bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] transition-all active:translate-y-0.5"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
            aria-label={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>

          {/* Back to Lobby if in game */}
          {activeGame && (
            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                onNavigateHome();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F9DCE9] hover:bg-[#F472B6] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] transition-all active:translate-y-0.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lobby</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
