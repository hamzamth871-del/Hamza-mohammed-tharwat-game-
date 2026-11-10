import React, { useState, useEffect, useMemo } from 'react';
import { Player, WouldYouRatherQuestion, WouldYouRatherCategory } from '../types';
import { WOULD_YOU_RATHER_QUESTIONS } from '../data/wouldYouRatherData';
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
  Home, 
  Sparkles, 
  ArrowLeft,
  Flame,
  Scale
} from 'lucide-react';

interface WouldYouRatherGameProps {
  players: Player[];
  onAwardPoints: (pointsMap: Record<number, number>) => void;
  onBackToLobby: () => void;
  soundEnabled: boolean;
  tvMode: boolean;
  usedQuestionIds: Set<string>;
  onMarkQuestionUsed: (id: string) => void;
}

type Step = 'INSTRUCTIONS' | 'QUESTION_PREVIEW' | 'VOTING' | 'REVEAL';

const CATEGORIES: ('All' | WouldYouRatherCategory)[] = [
  'All',
  'Funny',
  'Difficult Choices',
  'Friendship',
  'Food',
  'Travel',
  'School',
  'Fantasy',
  'Entertainment',
];

export const WouldYouRatherGame: React.FC<WouldYouRatherGameProps> = ({
  players,
  onAwardPoints,
  onBackToLobby,
  soundEnabled,
  tvMode,
  usedQuestionIds,
  onMarkQuestionUsed,
}) => {
  const [step, setStep] = useState<Step>('INSTRUCTIONS');
  const [selectedCategory, setSelectedCategory] = useState<'All' | WouldYouRatherCategory>('All');
  const [currentQuestion, setCurrentQuestion] = useState<WouldYouRatherQuestion>(WOULD_YOU_RATHER_QUESTIONS[0]);
  
  // Voting state: maps voter ID to choice 'A' or 'B'
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [choices, setChoices] = useState<Record<number, 'A' | 'B'>>({});
  const [curtainKey, setCurtainKey] = useState(0);

  // Pick a fresh question
  const pickNewQuestion = (category = selectedCategory) => {
    let pool = WOULD_YOU_RATHER_QUESTIONS;
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
    setChoices({});
    setCurrentVoterIndex(0);
    setCurtainKey((k) => k + 1);
    setStep('QUESTION_PREVIEW');
  };

  const proceedToVoting = () => {
    playSound.pop(soundEnabled);
    setCurrentVoterIndex(0);
    setChoices({});
    setCurtainKey((k) => k + 1);
    setStep('VOTING');
  };

  // Broadcast state to Phone Controller
  useEffect(() => {
    syncManager.send({
      type: 'SYNC_FULL_STATE',
      payload: {
        activeGame: 'would-you-rather',
        step,
        currentQuestion,
        currentVoterIndex,
        choices,
        players,
      },
    });
  }, [step, currentQuestion, currentVoterIndex, choices, players]);

  // Listen to incoming Controller actions
  useEffect(() => {
    return syncManager.onMessage((msg) => {
      if (msg.type === 'SUBMIT_VOTE') {
        const choice = msg.payload?.choice ?? msg.payload;
        if (choice === 'A' || choice === 'B') {
          handleSelectChoice(choice);
        }
      } else if (msg.type === 'NEXT_QUESTION') {
        startRound();
      } else if (msg.type === 'SKIP_QUESTION') {
        pickNewQuestion();
      } else if (msg.type === 'CONTROLLER_READY') {
        syncManager.send({
          type: 'SYNC_FULL_STATE',
          payload: {
            activeGame: 'would-you-rather',
            step,
            currentQuestion,
            currentVoterIndex,
            choices,
            players,
          },
        });
      }
    });
  }, [step, currentQuestion, currentVoterIndex, choices, players]);

  const handleSelectChoice = (choice: 'A' | 'B') => {
    const voter = players[currentVoterIndex];
    playSound.lockIn(soundEnabled);

    const nextChoices = { ...choices, [voter.id]: choice };
    setChoices(nextChoices);

    if (currentVoterIndex < 3) {
      setCurrentVoterIndex((i) => i + 1);
      setCurtainKey((k) => k + 1);
    } else {
      // All 4 players have submitted!
      finishRound(nextChoices);
    }
  };

  const finishRound = (finalChoices: Record<number, 'A' | 'B'>) => {
    playSound.reveal(soundEnabled);
    setTimeout(() => {
      playSound.fanfare(soundEnabled);
      fireConfetti(2600);
    }, 400);

    // Calculate majority voters for bonus party points
    const countA = Object.values(finalChoices).filter((c) => c === 'A').length;
    const countB = Object.values(finalChoices).filter((c) => c === 'B').length;

    const pointsAwarded: Record<number, number> = {};
    if (countA !== countB) {
      const winningChoice = countA > countB ? 'A' : 'B';
      Object.entries(finalChoices).forEach(([playerId, choice]) => {
        if (choice === winningChoice) {
          pointsAwarded[Number(playerId)] = 50; // +50 for voting with majority
        }
      });
    } else {
      // Perfect split 50/50: all 4 players get 50 synergy points!
      players.forEach((p) => {
        pointsAwarded[p.id] = 50;
      });
    }
    onAwardPoints(pointsAwarded);
    setStep('REVEAL');
  };

  // Calculations for results percentages and avatars
  const results = useMemo(() => {
    const playersA: Player[] = [];
    const playersB: Player[] = [];

    players.forEach((p) => {
      const c = choices[p.id];
      if (c === 'A') playersA.push(p);
      if (c === 'B') playersB.push(p);
    });

    const percentA = Math.round((playersA.length / 4) * 100);
    const percentB = 100 - percentA;

    return { playersA, playersB, percentA, percentB };
  }, [choices, players]);

  // 1. INSTRUCTIONS
  if (step === 'INSTRUCTIONS') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-pop-in">
        <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#1E1B2E] text-center">
          <div className="inline-flex p-3 rounded-2xl bg-[#DCEEFF] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] mb-3 text-3xl">
            ⚖️
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-black text-[#1E1B2E] mb-2">
            Would You Rather?
          </h2>
          <p className="text-sm md:text-base text-[#1E1B2E]/80 mb-6 max-w-lg mx-auto">
            Choose between two wild, difficult, or hilarious scenarios and see how your friend group divides!
          </p>

          {/* How to play card */}
          <div className="bg-white border-2 border-[#1E1B2E] rounded-2xl p-5 mb-6 text-left shadow-[3px_3px_0px_#1E1B2E] space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700">How to Play:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm text-[#1E1B2E]/90">
              <div className="flex items-start gap-2">
                <span className="font-display font-black text-base text-blue-600">1.</span>
                <span>Two big dilemma cards appear on the TV.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-display font-black text-base text-blue-600">2.</span>
                <span>Pass the smartphone secretly to each player.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-display font-black text-base text-blue-600">3.</span>
                <span>Each player privately taps Option A or Option B.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-display font-black text-base text-blue-600">4.</span>
                <span>TV reveals the percentages, avatars, and discussions!</span>
              </div>
            </div>
          </div>

          {/* Category Filter Selector */}
          <div className="mb-6 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1E1B2E]/70 mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Choose Scenario Category (212+ Dilemmas):</span>
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
                      ? 'bg-[#60A5FA] shadow-[2px_2px_0px_#1E1B2E] text-white'
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
              className="flex-1 py-3 px-6 rounded-2xl font-display font-black text-base bg-[#DCEEFF] hover:bg-[#93C5FD] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Game</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. TV QUESTION PREVIEW (Big Choice Cards on TV)
  if (step === 'QUESTION_PREVIEW') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 animate-pop-in">
        <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#1E1B2E] text-center">
          {/* Category Tag */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-4">
            <span>Would You Rather?</span>
            <span aria-hidden="true">·</span>
            <span>{currentQuestion.category}</span>
          </div>

          <h2 className="font-display text-2xl md:text-3xl font-black text-[#1E1B2E] mb-6">
            Would You Rather...
          </h2>

          {/* Split Dilemma Cards on TV */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {/* Card A */}
            <div className="bg-[#F9DCE9] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[4px_4px_0px_#1E1B2E] flex flex-col justify-between text-left">
              <div>
                <div className="inline-block px-3 py-1 rounded-xl bg-white border-2 border-[#1E1B2E] font-display font-black text-sm text-[#1E1B2E] shadow-[1px_1px_0px_#1E1B2E] mb-3">
                  Option A
                </div>
                <div className="font-display font-black text-xl md:text-2xl text-[#1E1B2E] leading-snug">
                  {currentQuestion.scenarioA}
                </div>
              </div>
            </div>

            {/* Card B */}
            <div className="bg-[#DCEEFF] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[4px_4px_0px_#1E1B2E] flex flex-col justify-between text-left">
              <div>
                <div className="inline-block px-3 py-1 rounded-xl bg-white border-2 border-[#1E1B2E] font-display font-black text-sm text-[#1E1B2E] shadow-[1px_1px_0px_#1E1B2E] mb-3">
                  Option B
                </div>
                <div className="font-display font-black text-xl md:text-2xl text-[#1E1B2E] leading-snug">
                  {currentQuestion.scenarioB}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                pickNewQuestion();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#DCEEFF] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center gap-1.5 active:translate-y-0.5"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random Scenario</span>
            </button>

            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                pickNewQuestion();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center gap-1.5 active:translate-y-0.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip Scenario</span>
            </button>
          </div>

          {/* Start Pass Button */}
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

  // 3. VOTING (Pass-the-phone secrecy & TV Progress Board)
  if (step === 'VOTING') {
    const activeVoter = players[currentVoterIndex];

    return (
      <div className="max-w-3xl mx-auto px-4 py-4 animate-pop-in">
        {/* Big Dilemma Summary on TV */}
        <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-5 md:p-6 shadow-[5px_5px_0px_#1E1B2E] mb-5 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">
            Would You Rather...
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
            <div className="p-3 rounded-2xl bg-[#F9DCE9] border-2 border-[#1E1B2E]">
              <span className="font-display font-black text-xs text-[#1E1B2E] block mb-1">Option A:</span>
              <span className="font-display font-bold text-sm text-[#1E1B2E]">{currentQuestion.scenarioA}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#DCEEFF] border-2 border-[#1E1B2E]">
              <span className="font-display font-black text-xs text-[#1E1B2E] block mb-1">Option B:</span>
              <span className="font-display font-bold text-sm text-[#1E1B2E]">{currentQuestion.scenarioB}</span>
            </div>
          </div>
        </div>

        {/* TV Audience Live Voting Progress Board */}
        <div className="bg-white border-3 border-[#1E1B2E] rounded-3xl p-5 shadow-[4px_4px_0px_#1E1B2E] mb-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1E1B2E]/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-display font-black text-xs md:text-sm text-[#1E1B2E]">
                TV Audience Board · Choices Locked on Phone
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-[#DCEEFF] px-2 py-0.5 rounded-full border border-blue-300">
              Percentages reveal on TV at end of round
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
                      ? 'ring-3 ring-blue-500 scale-102 shadow-[2px_2px_0px_#1E1B2E]'
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
                      <span className="text-emerald-700">✅ Choice Locked</span>
                    ) : isCurrent ? (
                      <span className="text-blue-700 animate-pulse">📱 Choosing on Phone...</span>
                    ) : (
                      <span className="text-gray-400">⏳ Waiting</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pass-the-phone privacy shield */}
        <PassPhoneCurtain
          key={curtainKey}
          player={activeVoter}
          playerIndex={currentVoterIndex}
          totalPlayers={4}
          soundEnabled={soundEnabled}
          tvMode={tvMode}
        >
          <div className="bg-white border-3 border-[#1E1B2E] rounded-3xl p-5 md:p-6 shadow-[5px_5px_0px_#1E1B2E]">
            <div className="text-center mb-4">
              <h3 className="font-display text-xl font-black text-[#1E1B2E]">
                What is your secret choice?
              </h3>
              <p className="text-xs text-[#1E1B2E]/70">
                Tap Option A or Option B privately. Answers are hidden until all 4 submit!
              </p>
            </div>

            <div className="space-y-3 mb-4">
              {/* Option A button */}
              <button
                type="button"
                onClick={() => handleSelectChoice('A')}
                className="w-full p-4 rounded-2xl bg-[#F9DCE9] hover:bg-[#F472B6] border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-left transition-all active:scale-98 flex items-start gap-3"
              >
                <div className="px-2.5 py-1 rounded-xl bg-white border-2 border-[#1E1B2E] font-display font-black text-sm text-[#1E1B2E] shrink-0">
                  A
                </div>
                <div className="font-display font-bold text-base text-[#1E1B2E] pt-0.5 leading-snug">
                  {currentQuestion.scenarioA}
                </div>
              </button>

              {/* Option B button */}
              <button
                type="button"
                onClick={() => handleSelectChoice('B')}
                className="w-full p-4 rounded-2xl bg-[#DCEEFF] hover:bg-[#93C5FD] border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-left transition-all active:scale-98 flex items-start gap-3"
              >
                <div className="px-2.5 py-1 rounded-xl bg-white border-2 border-[#1E1B2E] font-display font-black text-sm text-[#1E1B2E] shrink-0">
                  B
                </div>
                <div className="font-display font-bold text-base text-[#1E1B2E] pt-0.5 leading-snug">
                  {currentQuestion.scenarioB}
                </div>
              </button>
            </div>

            <div className="text-center text-[11px] font-semibold text-purple-700">
              🔒 Tapping your option locks it immediately and advances to the next player
            </div>
          </div>
        </PassPhoneCurtain>
      </div>
    );
  }

  // 4. TV REVEAL STEP (Percentages, Avatars on Choice A/B, Tie handling)
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pop-in">
      <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#1E1B2E] text-center">
        {/* Header */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#DCEEFF] border-2 border-[#1E1B2E] text-xs font-bold text-blue-900 mb-3 shadow-[2px_2px_0px_#1E1B2E]">
          <Scale className="w-4 h-4 text-blue-600" />
          <span>The Room Has Decided!</span>
        </div>

        <h2 className="font-display text-xl md:text-2xl font-black text-[#1E1B2E] mb-6">
          Would You Rather...
        </h2>

        {/* Results Percentage Comparison Bar */}
        <div className="mb-6 max-w-xl mx-auto">
          <div className="flex justify-between font-display font-black text-sm text-[#1E1B2E] mb-1.5">
            <span>Option A: {results.percentA}%</span>
            <span>Option B: {results.percentB}%</span>
          </div>
          <div className="h-6 w-full rounded-full border-2 border-[#1E1B2E] bg-white overflow-hidden flex shadow-[2px_2px_0px_#1E1B2E]">
            <div
              className="h-full bg-[#F472B6] transition-all duration-1000 ease-out"
              style={{ width: `${results.percentA}%` }}
            />
            <div
              className="h-full bg-[#60A5FA] transition-all duration-1000 ease-out"
              style={{ width: `${results.percentB}%` }}
            />
          </div>
        </div>

        {/* Both Cards with Player Avatars Placed Under Them */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 text-left">
          {/* Side A */}
          <div
            className={`p-6 rounded-3xl border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] flex flex-col justify-between transition-all ${
              results.percentA > results.percentB
                ? 'bg-[#F9DCE9] ring-4 ring-pink-400'
                : 'bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-xl bg-white border-2 border-[#1E1B2E] font-display font-black text-sm text-[#1E1B2E]">
                  Option A ({results.percentA}%)
                </span>
                {results.percentA > results.percentB && (
                  <span className="text-xs font-black text-pink-700 bg-white/80 px-2 py-0.5 rounded-full border border-pink-300">
                    👑 Most Popular
                  </span>
                )}
              </div>
              <div className="font-display font-bold text-lg text-[#1E1B2E] mb-4">
                {currentQuestion.scenarioA}
              </div>
            </div>

            {/* Avatars who chose A */}
            <div className="pt-3 border-t-2 border-[#1E1B2E]/20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#1E1B2E]/70 mb-2">
                Chose Option A ({results.playersA.length}):
              </div>
              <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
                {results.playersA.length > 0 ? (
                  results.playersA.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-[#1E1B2E] shadow-[1px_1px_0px_#1E1B2E]"
                      style={{ backgroundColor: p.color }}
                    >
                      <span className="text-xl">{p.avatar}</span>
                      <span className="font-display font-bold text-xs text-[#1E1B2E]">{p.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs italic text-gray-500">Nobody chose Option A!</span>
                )}
              </div>
            </div>
          </div>

          {/* Side B */}
          <div
            className={`p-6 rounded-3xl border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] flex flex-col justify-between transition-all ${
              results.percentB > results.percentA
                ? 'bg-[#DCEEFF] ring-4 ring-blue-400'
                : 'bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-xl bg-white border-2 border-[#1E1B2E] font-display font-black text-sm text-[#1E1B2E]">
                  Option B ({results.percentB}%)
                </span>
                {results.percentB > results.percentA && (
                  <span className="text-xs font-black text-blue-700 bg-white/80 px-2 py-0.5 rounded-full border border-blue-300">
                    👑 Most Popular
                  </span>
                )}
              </div>
              <div className="font-display font-bold text-lg text-[#1E1B2E] mb-4">
                {currentQuestion.scenarioB}
              </div>
            </div>

            {/* Avatars who chose B */}
            <div className="pt-3 border-t-2 border-[#1E1B2E]/20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#1E1B2E]/70 mb-2">
                Chose Option B ({results.playersB.length}):
              </div>
              <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
                {results.playersB.length > 0 ? (
                  results.playersB.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl border-2 border-[#1E1B2E] shadow-[1px_1px_0px_#1E1B2E]"
                      style={{ backgroundColor: p.color }}
                    >
                      <span className="text-xl">{p.avatar}</span>
                      <span className="font-display font-bold text-xs text-[#1E1B2E]">{p.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs italic text-gray-500">Nobody chose Option B!</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fun Result Announcement */}
        <div className="bg-white border-2 border-[#1E1B2E] rounded-2xl p-4 max-w-xl mx-auto mb-6 shadow-[3px_3px_0px_#1E1B2E]">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
            Room Consensus
          </div>
          <div className="font-display font-black text-base text-[#1E1B2E]">
            {results.percentA === 50 ? (
              <>🤝 A dead 50/50 tie! The room is perfectly split down the middle! (+50 pts all)</>
            ) : results.percentA === 100 || results.percentB === 100 ? (
              <>🤯 100% Unanimous Agreement! Everyone picked the exact same scenario! (+50 pts all)</>
            ) : (
              <>
                🔥 {results.percentA > results.percentB ? 'Option A' : 'Option B'} takes the crown with{' '}
                {Math.max(results.percentA, results.percentB)}% of the votes!
              </>
            )}
          </div>
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
            className="flex-1 py-3 px-6 rounded-2xl font-display font-black text-base bg-[#DCEEFF] hover:bg-[#93C5FD] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Next Scenario</span>
          </button>
        </div>
      </div>
    </div>
  );
};
