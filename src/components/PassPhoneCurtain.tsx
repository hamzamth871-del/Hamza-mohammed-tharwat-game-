import React, { useState } from 'react';
import { Player } from '../types';
import { Shield, Eye, Smartphone, Check, Lock } from 'lucide-react';
import { playSound } from '../utils/audio';

interface PassPhoneCurtainProps {
  player: Player;
  playerIndex: number; // 0, 1, 2, 3
  totalPlayers?: number;
  children: React.ReactNode;
  soundEnabled: boolean;
  tvMode: boolean;
  onReadyToAnswer?: () => void;
}

export const PassPhoneCurtain: React.FC<PassPhoneCurtainProps> = ({
  player,
  playerIndex,
  totalPlayers = 4,
  children,
  soundEnabled,
  tvMode,
  onReadyToAnswer,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleUnlock = () => {
    playSound.pop(soundEnabled);
    setIsUnlocked(true);
    if (onReadyToAnswer) onReadyToAnswer();
  };

  // If unlocked, render the private voting/answer view
  if (isUnlocked) {
    return (
      <div className="w-full max-w-xl mx-auto animate-pop-in">
        {/* Top Active Turn Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-2xl border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] mb-4"
          style={{ backgroundColor: player.color }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{player.avatar}</span>
            <div>
              <div className="font-display font-black text-sm text-[#1E1B2E] leading-none">
                {player.name}’s Secret Turn
              </div>
              <div className="text-[11px] font-semibold text-[#1E1B2E]/70">
                Keep the screen angled away from others!
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-[#1E1B2E] bg-white/70 px-2.5 py-1 rounded-xl border border-[#1E1B2E]/20">
            <Lock className="w-3.5 h-3.5 text-purple-700" />
            <span>Player {playerIndex + 1}/{totalPlayers}</span>
          </div>
        </div>

        {/* Private Action Surface */}
        {children}
      </div>
    );
  }

  // Handoff Privacy Screen
  return (
    <div className="w-full max-w-md mx-auto my-6 animate-pop-in">
      <div
        className="rounded-3xl border-3 border-[#1E1B2E] p-7 text-center shadow-[6px_6px_0px_#1E1B2E] transition-all"
        style={{ backgroundColor: player.color }}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border-2 border-[#1E1B2E] text-xs font-bold text-[#1E1B2E] mb-4 shadow-[1px_1px_0px_#1E1B2E]">
          <Shield className="w-3.5 h-3.5 text-purple-700" />
          <span>Privacy Handoff · Player {playerIndex + 1} of {totalPlayers}</span>
        </div>

        {/* Giant Player Avatar */}
        <div className="w-24 h-24 mx-auto mb-3 rounded-3xl bg-white border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] flex items-center justify-center text-5xl animate-gentle-pulse">
          {player.avatar}
        </div>

        <h3 className="font-display text-2xl md:text-3xl font-black text-[#1E1B2E] mb-1">
          Pass the Phone to
        </h3>
        <div className="font-display text-3xl md:text-4xl font-black text-[#1E1B2E] tracking-tight mb-3 underline decoration-wavy decoration-purple-400">
          {player.name}!
        </div>

        <p className="text-xs md:text-sm text-[#1E1B2E]/80 mb-6 max-w-xs mx-auto leading-relaxed">
          Tilt the phone away from your friends and the TV so your answer remains a total secret!
        </p>

        {/* Ready Button */}
        <button
          type="button"
          onClick={handleUnlock}
          className="w-full py-4 px-6 rounded-2xl font-display font-black text-lg bg-white hover:bg-[#FFF0CC] active:bg-[#FFE082] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-3 transition-transform active:translate-y-1"
        >
          <Eye className="w-5 h-5 text-purple-700" />
          <span>I am {player.name} — Ready!</span>
        </button>
      </div>
    </div>
  );
};
