import React from 'react';
import { Player } from '../types';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react';

interface LeaderboardCardProps {
  players: Player[];
  compact?: boolean;
  highlightPlayerId?: number;
  recentPointsMap?: Record<number, number>;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  players,
  compact = false,
  highlightPlayerId,
  recentPointsMap = {},
}) => {
  // Sort descending by score
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const highestScore = sorted[0]?.score || 0;

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 0:
        return <span className="text-lg">🥇</span>;
      case 1:
        return <span className="text-lg">🥈</span>;
      case 2:
        return <span className="text-lg">🥉</span>;
      default:
        return <span className="font-mono text-xs font-bold text-gray-500">#{rank + 1}</span>;
    }
  };

  if (compact) {
    return (
      <div className="bg-white/95 rounded-2xl border-2 border-[#1E1B2E] p-3 shadow-[2px_2px_0px_#1E1B2E]">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#1E1B2E]/10">
          <div className="flex items-center gap-1.5 font-display font-black text-xs text-[#1E1B2E]">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Party Leaderboard</span>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-[#E5DDFB] px-1.5 py-0.5 rounded">
            Live
          </span>
        </div>

        <div className="space-y-1.5">
          {sorted.map((p, idx) => {
            const added = recentPointsMap[p.id];
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl border border-[#1E1B2E]/15 text-xs font-semibold"
                style={{ backgroundColor: p.color }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 text-center shrink-0">{getRankBadge(idx)}</span>
                  <span className="text-base shrink-0">{p.avatar}</span>
                  <span className="text-[#1E1B2E] truncate font-bold">{p.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {added !== undefined && added > 0 && (
                    <span className="text-[10px] font-mono font-black text-emerald-700 bg-white/80 px-1 rounded">
                      +{added}
                    </span>
                  )}
                  <span className="font-mono font-black text-xs text-[#1E1B2E]">
                    {p.score} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border-3 border-[#1E1B2E] p-5 md:p-6 shadow-[5px_5px_0px_#1E1B2E] text-left">
      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-[#1E1B2E]/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#FFF0CC] border-2 border-[#1E1B2E] flex items-center justify-center text-lg shadow-[1px_1px_0px_#1E1B2E]">
            🏆
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-[#1E1B2E]">Party Leaderboard</h3>
            <div className="text-[11px] font-semibold text-[#1E1B2E]/60">Ranked by total session points</div>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-emerald-800 bg-[#D9F2E7] px-2.5 py-1 rounded-full border border-emerald-300">
          Top Score: {highestScore} pts
        </span>
      </div>

      <div className="space-y-2.5">
        {sorted.map((p, idx) => {
          const isLeader = idx === 0 && p.score > 0;
          const isHighlighted = highlightPlayerId === p.id;
          const added = recentPointsMap[p.id];

          return (
            <div
              key={p.id}
              className={`p-3 rounded-2xl border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-between gap-3 transition-transform ${
                isLeader ? 'ring-3 ring-amber-400' : ''
              } ${isHighlighted ? 'scale-102 bg-white' : ''}`}
              style={{ backgroundColor: p.color }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 flex items-center justify-center text-xl shrink-0">
                  {getRankBadge(idx)}
                </div>

                <div className="w-11 h-11 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[1px_1px_0px_#1E1B2E] flex items-center justify-center text-2xl shrink-0">
                  {p.avatar}
                </div>

                <div className="min-w-0">
                  <div className="font-display font-black text-sm text-[#1E1B2E] truncate flex items-center gap-1.5">
                    <span>{p.name}</span>
                    {isLeader && (
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-amber-300 border border-amber-600 text-amber-900">
                        Leader
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-[#1E1B2E]/60">
                    Player {p.id}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {added !== undefined && (
                  <span
                    className={`font-mono font-black text-xs px-2 py-0.5 rounded-lg border ${
                      added > 0
                        ? 'text-emerald-800 bg-[#D9F2E7] border-emerald-400'
                        : 'text-gray-500 bg-gray-100 border-gray-300'
                    }`}
                  >
                    {added > 0 ? `+${added}` : '0 pts'}
                  </span>
                )}
                <div className="font-mono font-black text-base text-[#1E1B2E] bg-white/80 px-3 py-1 rounded-xl border border-[#1E1B2E]/20">
                  {p.score} pts
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
