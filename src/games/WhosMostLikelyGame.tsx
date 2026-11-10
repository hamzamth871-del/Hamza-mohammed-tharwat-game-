import React, { useState, useEffect, useMemo } from 'react';
import { Player, WhosMostLikelyQuestion, WhosMostLikelyCategory } from '../types';
import { WHOS_MOST_LIKELY_QUESTIONS } from '../data/whosMostLikelyData';
import { PassPhoneCurtain } from '../components/PassPhoneCurtain';
import { playSound } from '../utils/audio';
import { fireConfetti } from '../utils/confetti';
import { syncManager } from '../utils/syncManager';
import { 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Shuffle, 
  SkipForward, 
  Sliders, 
  Trophy, 
  Users, 
  Home, 
  Sparkles, 
  CheckCircle,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { LeaderboardCard } from '../components/LeaderboardCard';

interface WhosMostLikelyGameProps {
  players: Player[];
  onAwardPoints: (pointsMap: Record<number, number>) => void;
  onBackToLobby: () => void;
  soundEnabled: boolean;
  tvMode: boolean;
  usedQuestionIds: Set<string>;
  onMarkQuestionUsed: (id: string) => void;
}

type Step = 'INSTRUCTIONS' | 'QUESTION_PREVIEW' | 'VOTING' | 'REVEAL';

const CATEGORIES: ('All' | WhosMostLikelyCategory)[] = [
  'All',
  'Friendship',
  'Funny Situations',
  'School Life',
  'Future Predictions',
  'Personality',
  'Random Situations',
  'Everyday Life',
];

export const WhosMostLikelyGame: React.FC<WhosMostLikelyGameProps> = ({
  players,
  onAwardPoints,
  onBackToLobby,
  soundEnabled,
  tvMode,
  usedQuestionIds,
  onMarkQuestionUsed,
}) => {
  const [step, setStep] = useState<Step>('INSTRUCTIONS');
  const [selectedCategory, setSelectedCategory] = useState<'All' | WhosMostLikelyCategory>('All');
  const [currentQuestion, setCurrentQuestion] = useState<WhosMostLikelyQuestion>(WHOS_MOST_LIKELY_QUESTIONS[0]);
  
  // Voting state: maps voter player ID to chosen target player ID
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0); // 0, 1, 2, 3
  const [votes, setVotes] = useState<Record<number, number>>({}); // { voterId: targetPlayerId }
  const [roundPointsMap, setRoundPointsMap] = useState<Record<number, number>>({});
  const [curtainKey, setCurtainKey] = useState(0);

  // Filter questions based on category and unused status
  const availableQuestions = useMemo(() => {
    let pool = WHOS_MOST_LIKELY_QUESTIONS;
    if (selectedCategory !== 'All') {
      pool = pool.filter((q) => q.category === selectedCategory);
    }
    const unused = pool.filter((q) => !usedQuestionIds.has(q.id));
    return unused.length > 0 ? unused : pool; // fallback to pool if all were played
  }, [selectedCategory, usedQuestionIds]);

  // Pick a fresh question
  const pickNewQuestion = (category = selectedCategory) => {
    let pool = WHOS_MOST_LIKELY_QUESTIONS;
    if (category !== 'All') {
      pool = pool.filter((q) => q.category === category);
    }
    const unused = pool.filter((q) => !usedQuestionIds.has(q.id));
    const targetPool = unused.length > 0 ? unused : pool;
    const randomItem = targetPool[Math.floor(Math.random() * targetPool.length)];
    setCurrentQuestion(randomItem);
    onMarkQuestionUsed(randomItem.id);
  };

  const startRound = () => {
    playSound.pop(soundEnabled);
    pickNewQuestion(selectedCategory);
    setVotes({});
    setRoundPointsMap({});
    setCurrentVoterIndex(0);
    setCurtainKey((k) => k + 1);
    setStep('QUESTION_PREVIEW');
  };

  const proceedToVoting = () => {
    playSound.pop(soundEnabled);
    setCurrentVoterIndex(0);
    setVotes({});
    setCurtainKey((k) => k + 1);
    setStep('VOTING');
  };

  // Broadcast state to Phone Controller whenever step, question, voter, or votes change
  useEffect(() => {
    syncManager.send({
      type: 'SYNC_FULL_STATE',
      payload: {
        activeGame: 'whos-most-likely',
        step,
        currentQuestion,
        currentVoterIndex,
        votes,
        players,
      },
    });
  }, [step, currentQuestion, currentVoterIndex, votes, players]);

  // Listen to incoming Controller actions (voting, next round, skip)
  useEffect(() => {
    return syncManager.onMessage((msg) => {
      if (msg.type === 'SUBMIT_VOTE') {
        const targetId = Number(msg.payload?.targetPlayerId ?? msg.payload);
        if (targetId) {
          handleVote(targetId);
        }
      } else if (msg.type === 'START_VOTING') {
        if (step === 'INSTRUCTIONS') {
          startRound();
        } else {
          proceedToVoting();
        }
      } else if (msg.type === 'NEXT_QUESTION') {
        if (step === 'INSTRUCTIONS') {
          startRound();
        } else if (step === 'QUESTION_PREVIEW') {
          proceedToVoting();
        } else {
          startRound();
        }
      } else if (msg.type === 'SKIP_QUESTION') {
        pickNewQuestion();
      } else if (msg.type === 'CONTROLLER_READY') {
        syncManager.send({
          type: 'SYNC_FULL_STATE',
          payload: {
            activeGame: 'whos-most-likely',
            step,
            currentQuestion,
            currentVoterIndex,
            votes,
            players,
          },
        });
      }
    });
  }, [step, currentQuestion, currentVoterIndex, votes, players]);

  const handleVote = (targetPlayerId: number) => {
    const voter = players[currentVoterIndex];
    playSound.lockIn(soundEnabled);

    const nextVotes = { ...votes, [voter.id]: targetPlayerId };
    setVotes(nextVotes);

    if (currentVoterIndex < 3) {
      setCurrentVoterIndex((i) => i + 1);
      setCurtainKey((k) => k + 1);
    } else {
      // All 4 players have voted! Reveal results
      finishRound(nextVotes);
    }
  };

  const finishRound = (finalVotes: Record<number, number>) => {
    playSound.reveal(soundEnabled);
    setTimeout(() => {
      playSound.fanfare(soundEnabled);
      fireConfetti(2800);
    }, 450);

    // Calculate vote counts per player
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    Object.values(finalVotes).forEach((targetId) => {
      counts[targetId] = (counts[targetId] || 0) + 1;
    });

    // Find highest vote count
    let maxVotes = 0;
    Object.values(counts).forEach((c) => {
      if (c > maxVotes) maxVotes = c;
    });

    // Award points to whoever got the highest votes (100 pts)
    // Plus bonus points to anyone who correctly voted for the crowned winner (25 pts)
    const winners = Object.keys(counts)
      .map(Number)
      .filter((id) => counts[id] === maxVotes && maxVotes > 0);

    const pointsAwarded: Record<number, number> = {};
    const resultsBreakdown: Record<number, { isCorrect: boolean; guess: string; points: number }> = {};

    players.forEach((p) => {
      const votedTargetId = finalVotes[p.id];
      const votedTarget = players.find((x) => x.id === votedTargetId);
      const isWinner = winners.includes(p.id);
      const backedWinner = winners.includes(votedTargetId);
      const pts = (isWinner ? 100 : 0) + (backedWinner ? 25 : 0);
      pointsAwarded[p.id] = pts;

      resultsBreakdown[p.id] = {
        isCorrect: backedWinner || isWinner,
        guess: `Voted for ${votedTarget ? votedTarget.name : 'Unknown'}`,
        points: pts,
      };
    });

    setRoundPointsMap(pointsAwarded);
    onAwardPoints(pointsAwarded);

    syncManager.send({
      type: 'SYNC_FULL_STATE',
      payload: {
        activeGame: 'whos-most-likely',
        step: 'REVEAL',
        currentQuestion,
        votes: finalVotes,
        results: {
          gameTitle: "Who's Most Likely To?",
          pointsAwarded,
          resultsBreakdown,
          winners,
          crownedNames: winners.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean),
          maxVotes,
        },
        players,
      },
    });

    setStep('REVEAL');
  };

  // Vote counting for results
  const voteTallies = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    Object.values(votes).forEach((targetId) => {
      counts[targetId] = (counts[targetId] || 0) + 1;
    });
    const maxVotes = Math.max(...Object.values(counts));
    const winners = Object.keys(counts)
      .map(Number)
      .filter((id) => counts[id] === maxVotes && maxVotes > 0);
    return { counts, maxVotes, winners };
  }, [votes]);

  // 1. INSTRUCTIONS VIEW
  if (step === 'INSTRUCTIONS') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-pop-in">
        <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#1E1B2E] text-center">
          <div className="inline-flex p-3 rounded-2xl bg-[#F9DCE9] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] mb-3 text-3xl">
            🗳️
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-black text-[#1E1B2E] mb-2">
            Who's Most Likely To?
          </h2>
          <p className="text-sm md:text-base text-[#1E1B2E]/80 mb-6 max-w-lg mx-auto">
            A funny voting game where all 4 players vote for the friend who best fits hilarious, real-life scenarios!
          </p>

          {/* How to play card */}
          <div className="bg-white border-2 border-[#1E1B2E] rounded-2xl p-5 mb-6 text-left shadow-[3px_3px_0px_#1E1B2E] space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-700">How to Play:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm text-[#1E1B2E]/90">
              <div className="flex items-start gap-2">
                <span className="font-display font-black text-base text-purple-600">1.</span>
                <span>The big prompt appears on the TV or shared screen.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-display font-black text-base text-purple-600">2.</span>
                <span>Pass the smartphone secretly to each player in order.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-display font-black text-base text-purple-600">3.</span>
                <span>Each player secretly taps the friend they choose.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-display font-black text-base text-purple-600">4.</span>
                <span>The TV reveals everyone’s votes, points, and crowns the winner!</span>
              </div>
            </div>
          </div>

          {/* Category Filter Selector */}
          <div className="mb-6 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1E1B2E]/70 mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Choose Question Category (215+ Questions):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    playSound.pop(soundEnabled);
                    setSelectedCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-[#1E1B2E] transition-all active:translate-y-0.5 ${
                    selectedCategory === cat
                      ? 'bg-[#34D399] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E]'
                      : 'bg-white hover:bg-[#FFF0CC] text-[#1E1B2E]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                onBackToLobby();
              }}
              className="py-3 px-5 rounded-2xl font-display font-bold text-sm bg-white hover:bg-gray-100 border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Lobby</span>
            </button>

            <button
              onClick={startRound}
              className="flex-1 py-3 px-6 rounded-2xl font-display font-black text-base bg-[#F9DCE9] hover:bg-[#F472B6] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Game</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. TV QUESTION PREVIEW (Everyone sees the big prompt on the TV before passing phone)
  if (step === 'QUESTION_PREVIEW') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 animate-pop-in">
        <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-10 shadow-[6px_6px_0px_#1E1B2E] text-center relative">
          {/* Category Tag (Clean unboxed inline metadata) */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider mb-4">
            <span>Who's Most Likely To?</span>
            <span aria-hidden="true">·</span>
            <span>{currentQuestion.category}</span>
          </div>

          {/* Big TV Question Display */}
          <div className="bg-[#FFF0CC] border-3 border-[#1E1B2E] rounded-3xl p-8 md:p-12 shadow-[4px_4px_0px_#1E1B2E] mb-6">
            <div className="text-3xl md:text-5xl mb-4">🤔</div>
            <h2 className="font-display text-2xl md:text-4xl lg:text-5xl font-black text-[#1E1B2E] leading-tight max-w-2xl mx-auto">
              "{currentQuestion.question}"
            </h2>
          </div>

          {/* Quick Controls Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                pickNewQuestion();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#DCEEFF] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center gap-1.5 active:translate-y-0.5"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random Question</span>
            </button>

            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                pickNewQuestion();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center gap-1.5 active:translate-y-0.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip Question</span>
            </button>
          </div>

          {/* Start Secret Pass Button */}
          <button
            onClick={proceedToVoting}
            className="w-full max-w-md mx-auto py-4 px-8 rounded-2xl font-display font-black text-lg bg-[#34D399] hover:bg-[#10B981] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-1 transition-transform"
          >
            <span>Pass Phone to Player 1</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // 3. VOTING STEP (Secret pass-the-phone privacy shield & TV Status Board)
  if (step === 'VOTING') {
    const activeVoter = players[currentVoterIndex];

    return (
      <div className="max-w-3xl mx-auto px-4 py-4 animate-pop-in">
        {/* TV Question Card */}
        <div className="bg-[#FFF0CC] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[5px_5px_0px_#1E1B2E] text-center mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
            Question on TV:
          </div>
          <div className="font-display font-black text-2xl md:text-3xl text-[#1E1B2E] leading-snug">
            "{currentQuestion.question}"
          </div>
        </div>

        {/* TV Audience Live Voting Progress Board */}
        <div className="bg-white border-3 border-[#1E1B2E] rounded-3xl p-5 shadow-[4px_4px_0px_#1E1B2E] mb-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1E1B2E]/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-display font-black text-xs md:text-sm text-[#1E1B2E]">
                TV Audience Board · Voting in Progress
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-purple-700 bg-[#E5DDFB] px-2 py-0.5 rounded-full border border-purple-300">
              Votes reveal on TV at end of round
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {players.map((p, idx) => {
              const hasVoted = idx < currentVoterIndex;
              const isCurrent = idx === currentVoterIndex;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border-2 border-[#1E1B2E] transition-all ${
                    isCurrent
                      ? 'ring-3 ring-purple-500 scale-102 shadow-[2px_2px_0px_#1E1B2E]'
                      : hasVoted
                      ? 'bg-emerald-50 opacity-90'
                      : 'bg-gray-50 opacity-60'
                  }`}
                  style={{ backgroundColor: isCurrent ? p.color : undefined }}
                >
                  <div className="text-2xl mb-1">{p.avatar}</div>
                  <div className="font-display font-black text-xs text-[#1E1B2E] truncate">
                    {p.name}
                  </div>
                  <div className="mt-1 text-[10px] font-bold">
                    {hasVoted ? (
                      <span className="text-emerald-700">✅ Voted (Secret)</span>
                    ) : isCurrent ? (
                      <span className="text-purple-700 animate-pulse">📱 Voting on Phone...</span>
                    ) : (
                      <span className="text-gray-400">⏳ Waiting</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Secret Pass-The-Phone Curtain (Interactive on shared screen/laptop) */}
        <PassPhoneCurtain
          key={curtainKey}
          player={activeVoter}
          playerIndex={currentVoterIndex}
          totalPlayers={4}
          soundEnabled={soundEnabled}
          tvMode={tvMode}
        >
          {/* Private Voting Grid */}
          <div className="bg-white border-3 border-[#1E1B2E] rounded-3xl p-5 md:p-6 shadow-[5px_5px_0px_#1E1B2E]">
            <div className="text-center mb-4">
              <h3 className="font-display text-lg font-black text-[#1E1B2E]">
                Who do you vote for?
              </h3>
              <p className="text-xs text-[#1E1B2E]/70">
                Tap your friend’s card secretly. (You can also vote for yourself!)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {players.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => handleVote(target.id)}
                  className="p-4 rounded-2xl border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] hover:scale-102 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-2 group"
                  style={{ backgroundColor: target.color }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-center text-3xl group-hover:rotate-6 transition-transform">
                    {target.avatar}
                  </div>
                  <div className="font-display font-black text-sm text-[#1E1B2E] truncate w-full">
                    {target.name}
                  </div>
                  {target.id === activeVoter.id && (
                    <span className="text-[10px] font-bold text-[#1E1B2E]/70 bg-white/60 px-1.5 py-0.5 rounded-full">
                      Myself
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="text-center text-[11px] font-semibold text-purple-700">
              🔒 Your choice will instantly lock and screen will switch to the next player
            </div>
          </div>
        </PassPhoneCurtain>
      </div>
    );
  }

  // 4. TV RESULTS REVEAL STEP
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pop-in">
      <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#1E1B2E] text-center">
        {/* Results Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D9F2E7] border-2 border-[#1E1B2E] text-xs font-bold text-emerald-900 mb-3 shadow-[2px_2px_0px_#1E1B2E]">
          <Trophy className="w-4 h-4 text-emerald-600" />
          <span>Results Revealed on TV!</span>
        </div>

        {/* The Question */}
        <h2 className="font-display text-xl md:text-3xl font-black text-[#1E1B2E] mb-6 max-w-2xl mx-auto leading-snug">
          "{currentQuestion.question}"
        </h2>

        {/* 4 Player Vote Tallies Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {players.map((p) => {
            const count = voteTallies.counts[p.id] || 0;
            const isWinner = voteTallies.winners.includes(p.id);

            return (
              <div
                key={p.id}
                className={`relative p-5 rounded-3xl border-3 border-[#1E1B2E] text-center transition-all shadow-[4px_4px_0px_#1E1B2E] ${
                  isWinner
                    ? 'ring-4 ring-yellow-400 scale-105 z-10 animate-gentle-pulse'
                    : 'opacity-90'
                }`}
                style={{ backgroundColor: p.color }}
              >
                {/* Crown for winner */}
                {isWinner && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFF0CC] border-2 border-[#1E1B2E] rounded-full px-2.5 py-0.5 text-xs font-black shadow-[2px_2px_0px_#1E1B2E] flex items-center gap-1">
                    👑 <span>+100 pts</span>
                  </div>
                )}

                {/* Avatar */}
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-center text-4xl md:text-5xl">
                  {p.avatar}
                </div>

                <div className="font-display font-black text-base md:text-lg text-[#1E1B2E] truncate">
                  {p.name}
                </div>

                {/* Vote Count Badge */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border-2 border-[#1E1B2E] font-mono font-bold text-sm text-[#1E1B2E] shadow-[1px_1px_0px_#1E1B2E]">
                  <span>{count} {count === 1 ? 'Vote' : 'Votes'}</span>
                </div>

                {/* Points and Vote outcome badge */}
                <div className="mt-2 flex flex-col items-center gap-1">
                  {roundPointsMap[p.id] !== undefined && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      roundPointsMap[p.id] > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {roundPointsMap[p.id] > 0 ? `+${roundPointsMap[p.id]} pts` : '0 pts'}
                    </span>
                  )}
                  {votes[p.id] && (
                    <span className="text-[10px] font-bold text-[#1E1B2E]/80">
                      Voted: {players.find((pl) => pl.id === votes[p.id])?.name || 'Unknown'}{' '}
                      {voteTallies.winners.includes(votes[p.id]) ? (
                        <span className="text-emerald-700 font-black">✅ Right</span>
                      ) : (
                        <span className="text-rose-700 font-black">❌ Wrong</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Who voted for this person */}
                <div className="mt-2 text-[10px] text-[#1E1B2E]/70 font-semibold min-h-[16px]">
                  {Object.entries(votes)
                    .filter(([_, targetId]) => targetId === p.id)
                    .map(([voterId]) => {
                      const voter = players.find((pl) => pl.id === Number(voterId));
                      return voter ? voter.name : '';
                    })
                    .join(', ')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fun Summary Announcement */}
        <div className="bg-white border-2 border-[#1E1B2E] rounded-2xl p-4 max-w-xl mx-auto mb-6 shadow-[3px_3px_0px_#1E1B2E]">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
            Round Summary
          </div>
          <div className="font-display font-black text-base text-[#1E1B2E]">
            {voteTallies.winners.length === 1 ? (
              <>
                🎉 {players.find((p) => p.id === voteTallies.winners[0])?.name} won the crowd with{' '}
                {voteTallies.maxVotes} votes! (+100 points)
              </>
            ) : (
              <>
                🤝 It’s a tie between{' '}
                {voteTallies.winners
                  .map((id) => players.find((p) => p.id === id)?.name)
                  .join(' & ')}
                ! Both receive +100 points!
              </>
            )}
          </div>
        </div>

        {/* Live Leaderboard Display */}
        <div className="mb-6 max-w-xl mx-auto">
          <LeaderboardCard players={players} recentPointsMap={roundPointsMap} />
        </div>

        {/* Action Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <button
            onClick={() => {
              playSound.pop(soundEnabled);
              onBackToLobby();
            }}
            className="py-3 px-5 rounded-2xl font-display font-bold text-sm bg-white hover:bg-gray-100 border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-1.5 active:translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            <span>Back to Games</span>
          </button>

          <button
            onClick={startRound}
            className="flex-1 py-3 px-6 rounded-2xl font-display font-black text-base bg-[#F9DCE9] hover:bg-[#F472B6] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Next Question</span>
          </button>
        </div>
      </div>
    </div>
  );
};
