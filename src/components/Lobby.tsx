import React from 'react';
import { Player, GameModuleId } from '../types';
import { playSound } from '../utils/audio';
import { 
  Users, 
  Tv, 
  Smartphone, 
  Trophy, 
  Sparkles, 
  Play, 
  QrCode, 
  Sliders, 
  HelpCircle,
  Vote,
  Scale,
  Smile
} from 'lucide-react';

interface LobbyProps {
  players: Player[];
  onSelectGame: (game: GameModuleId) => void;
  onOpenPlayerSetup: () => void;
  onOpenQR: () => void;
  soundEnabled: boolean;
  tvMode: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  players,
  onSelectGame,
  onOpenPlayerSetup,
  onOpenQR,
  soundEnabled,
  tvMode,
}) => {
  // Sort players by score for podium/leaderboard highlight
  const rankedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 animate-pop-in">
      {/* Hero Banner */}
      <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-10 shadow-[6px_6px_0px_#1E1B2E] text-center relative overflow-hidden">
        {/* Subtle decorative pastel spots */}
        <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-[#F9DCE9] -z-10 blur-xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-[#DCEEFF] -z-10 blur-xl opacity-60 pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF0CC] border-2 border-[#1E1B2E] text-xs font-bold text-[#1E1B2E] mb-4 shadow-[2px_2px_0px_#1E1B2E]">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>One Smartphone · Four Players · Infinite Laughs</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black text-[#1E1B2E] tracking-tight mb-4">
          GIGGLE
        </h1>

        <p className="text-base sm:text-lg text-[#1E1B2E]/80 max-w-2xl mx-auto font-medium leading-relaxed mb-6">
          The ultimate living-room party game suite. Pass one phone in secret between four friends,
          mirror to your TV, and watch the hilarity unfold together!
        </p>

        {/* Quick Start TV / Phone Setup Guide Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F9DCE9] border border-[#1E1B2E] flex items-center justify-center shrink-0 text-xl">
              📱
            </div>
            <div>
              <div className="font-display font-black text-xs text-[#1E1B2E]">1 Shared Phone</div>
              <div className="text-[11px] text-[#1E1B2E]/70">No extra devices needed</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DCEEFF] border border-[#1E1B2E] flex items-center justify-center shrink-0 text-xl">
              📺
            </div>
            <div>
              <div className="font-display font-black text-xs text-[#1E1B2E]">Cast to TV or Laptop</div>
              <div className="text-[11px] text-[#1E1B2E]/70">Everyone watches reveals</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9F2E7] border border-[#1E1B2E] flex items-center justify-center shrink-0 text-xl">
              🔒
            </div>
            <div>
              <div className="font-display font-black text-xs text-[#1E1B2E]">Secret Turn Shield</div>
              <div className="text-[11px] text-[#1E1B2E]/70">Handoff curtain keeps votes safe</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Players Roster Bar */}
      <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 shadow-[5px_5px_0px_#1E1B2E]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-700" />
            <h2 className="font-display text-xl font-black text-[#1E1B2E]">
              Party Roster (4 Players)
            </h2>
          </div>
          <button
            onClick={() => {
              playSound.pop(soundEnabled);
              onOpenPlayerSetup();
            }}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl font-display font-bold text-xs bg-white hover:bg-[#F9DCE9] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center gap-1.5 active:translate-y-0.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Names & Avatars</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {players.map((player, idx) => (
            <div
              key={player.id}
              className="p-4 rounded-2xl border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] flex items-center gap-3 transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: player.color }}
            >
              <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-center text-2xl shrink-0">
                {player.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#1E1B2E]/60">
                  Player {player.id}
                </div>
                <div className="font-display font-black text-sm text-[#1E1B2E] truncate">
                  {player.name}
                </div>
                <div className="font-mono font-bold text-xs text-[#1E1B2E] mt-0.5">
                  {player.score} pts
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* THREE GAME MODULES GRID */}
      <div>
        <div className="text-center mb-6">
          <h2 className="font-display text-3xl font-black text-[#1E1B2E]">
            Pick a Party Game
          </h2>
          <p className="text-sm text-[#1E1B2E]/70 mt-1">
            All games support 4 players on one smartphone with TV casting
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* GAME 1: WHO'S MOST LIKELY TO? */}
          <div className="bg-[#F9DCE9] border-3 border-[#1E1B2E] rounded-3xl p-6 shadow-[6px_6px_0px_#1E1B2E] flex flex-col justify-between hover:-translate-y-1 transition-all group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform">
                  🗳️
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white border border-[#1E1B2E] text-[10px] font-extrabold uppercase tracking-wider text-[#1E1B2E]">
                  215+ Questions
                </span>
              </div>

              <h3 className="font-display text-2xl font-black text-[#1E1B2E] mb-2">
                Who's Most Likely To?
              </h3>

              <p className="text-xs md:text-sm text-[#1E1B2E]/80 leading-relaxed mb-4">
                Vote secretly for the friend who fits funny everyday, school, and future situations!
                Winner gets crowned on the TV.
              </p>

              {/* Categories unboxed */}
              <div className="text-[11px] text-[#1E1B2E]/70 font-semibold mb-6">
                7 Categories: Friendship · School · Future · Funny · Personality · Random
              </div>
            </div>

            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                onSelectGame('whos-most-likely');
              }}
              className="w-full py-3.5 px-5 rounded-2xl font-display font-black text-sm bg-white hover:bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5 transition-all"
            >
              <Play className="w-4 h-4 fill-current text-purple-700" />
              <span>Play Who's Most Likely</span>
            </button>
          </div>

          {/* GAME 2: WOULD YOU RATHER? */}
          <div className="bg-[#DCEEFF] border-3 border-[#1E1B2E] rounded-3xl p-6 shadow-[6px_6px_0px_#1E1B2E] flex flex-col justify-between hover:-translate-y-1 transition-all group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform">
                  ⚖️
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white border border-[#1E1B2E] text-[10px] font-extrabold uppercase tracking-wider text-[#1E1B2E]">
                  212+ Dilemmas
                </span>
              </div>

              <h3 className="font-display text-2xl font-black text-[#1E1B2E] mb-2">
                Would You Rather?
              </h3>

              <p className="text-xs md:text-sm text-[#1E1B2E]/80 leading-relaxed mb-4">
                Pick between two wild or hilarious dilemmas. TV reveals your group's percentages and where everyone stands!
              </p>

              {/* Categories unboxed */}
              <div className="text-[11px] text-[#1E1B2E]/70 font-semibold mb-6">
                8 Categories: Food · Travel · Difficult · Fantasy · Friends · Entertainment
              </div>
            </div>

            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                onSelectGame('would-you-rather');
              }}
              className="w-full py-3.5 px-5 rounded-2xl font-display font-black text-sm bg-white hover:bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5 transition-all"
            >
              <Play className="w-4 h-4 fill-current text-blue-700" />
              <span>Play Would You Rather</span>
            </button>
          </div>

          {/* GAME 3: GUESS THE EMOJI */}
          <div className="bg-[#FFF0CC] border-3 border-[#1E1B2E] rounded-3xl p-6 shadow-[6px_6px_0px_#1E1B2E] flex flex-col justify-between hover:-translate-y-1 transition-all group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform">
                  🧩
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white border border-[#1E1B2E] text-[10px] font-extrabold uppercase tracking-wider text-[#1E1B2E]">
                  210+ Puzzles
                </span>
              </div>

              <h3 className="font-display text-2xl font-black text-[#1E1B2E] mb-2">
                Guess the Emoji
              </h3>

              <p className="text-xs md:text-sm text-[#1E1B2E]/80 leading-relaxed mb-4">
                Decode emoji combinations into famous movies, songs, foods, animals & expressions!
                Use hints if you dare (-25 credit).
              </p>

              {/* Categories unboxed */}
              <div className="text-[11px] text-[#1E1B2E]/70 font-semibold mb-6">
                8 Categories: Movies · Cartoons · Food · Animals · Phrases · Music · Expressions
              </div>
            </div>

            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                onSelectGame('guess-the-emoji');
              }}
              className="w-full py-3.5 px-5 rounded-2xl font-display font-black text-sm bg-white hover:bg-[#D9F2E7] border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5 transition-all"
            >
              <Play className="w-4 h-4 fill-current text-amber-700" />
              <span>Play Guess the Emoji</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
