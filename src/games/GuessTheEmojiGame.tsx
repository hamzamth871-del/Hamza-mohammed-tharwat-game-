import React, { useState, useEffect, useMemo } from 'react';
import { Player, GuessEmojiPuzzle, GuessEmojiCategory } from '../types';
import { GUESS_THE_EMOJI_PUZZLES } from '../data/guessTheEmojiData';
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
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Keyboard,
  ListFilter
} from 'lucide-react';

interface GuessTheEmojiGameProps {
  players: Player[];
  onAwardPoints: (pointsMap: Record<number, number>) => void;
  onBackToLobby: () => void;
  soundEnabled: boolean;
  tvMode: boolean;
  usedPuzzleIds: Set<string>;
  onMarkPuzzleUsed: (id: string) => void;
}

type Step = 'INSTRUCTIONS' | 'PUZZLE_PREVIEW' | 'GUESSING' | 'REVEAL';

const CATEGORIES: ('All' | GuessEmojiCategory)[] = [
  'All',
  'Movies',
  'Cartoons',
  'Food',
  'Animals',
  'Objects',
  'Famous Phrases',
  'Music',
  'Everyday Expressions',
];

export const GuessTheEmojiGame: React.FC<GuessTheEmojiGameProps> = ({
  players,
  onAwardPoints,
  onBackToLobby,
  soundEnabled,
  tvMode,
  usedPuzzleIds,
  onMarkPuzzleUsed,
}) => {
  const [step, setStep] = useState<Step>('INSTRUCTIONS');
  const [selectedCategory, setSelectedCategory] = useState<'All' | GuessEmojiCategory>('All');
  const [currentPuzzle, setCurrentPuzzle] = useState<GuessEmojiPuzzle>(GUESS_THE_EMOJI_PUZZLES[0]);
  
  // Guessing state:
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0); // 0, 1, 2, 3
  const [guesses, setGuesses] = useState<Record<number, string>>({}); // { playerId: answerString }
  const [usedHints, setUsedHints] = useState<Record<number, boolean>>({}); // { playerId: boolean }
  const [curtainKey, setCurtainKey] = useState(0);

  // Input mode: multiple-choice (default) or text field
  const [inputMode, setInputMode] = useState<'multiple-choice' | 'text'>('multiple-choice');
  const [textInputValue, setTextInputValue] = useState('');
  const [isHintRevealedForTurn, setIsHintRevealedForTurn] = useState(false);

  // Pick a fresh puzzle
  const pickNewPuzzle = (category = selectedCategory) => {
    let pool = GUESS_THE_EMOJI_PUZZLES;
    if (category !== 'All') {
      pool = pool.filter((p) => p.category === category);
    }
    const unused = pool.filter((p) => !usedPuzzleIds.has(p.id));
    const targetPool = unused.length > 0 ? unused : pool;
    const randomItem = targetPool[Math.floor(Math.random() * targetPool.length)];
    setCurrentPuzzle(randomItem);
    onMarkPuzzleUsed(randomItem.id);
  };

  const startRound = () => {
    playSound.pop(soundEnabled);
    pickNewPuzzle(selectedCategory);
    setGuesses({});
    setUsedHints({});
    setCurrentVoterIndex(0);
    setTextInputValue('');
    setIsHintRevealedForTurn(false);
    setCurtainKey((k) => k + 1);
    setStep('PUZZLE_PREVIEW');
  };

  const proceedToGuessing = () => {
    playSound.pop(soundEnabled);
    setCurrentVoterIndex(0);
    setGuesses({});
    setUsedHints({});
    setTextInputValue('');
    setIsHintRevealedForTurn(false);
    setCurtainKey((k) => k + 1);
    setStep('GUESSING');
  };

  // Broadcast state to Phone Controller
  useEffect(() => {
    syncManager.send({
      type: 'SYNC_FULL_STATE',
      payload: {
        activeGame: 'guess-the-emoji',
        step,
        currentQuestion: currentPuzzle,
        currentVoterIndex,
        guesses,
        usedHints,
        players,
      },
    });
  }, [step, currentPuzzle, currentVoterIndex, guesses, usedHints, players]);

  // Listen to incoming Controller actions
  useEffect(() => {
    return syncManager.onMessage((msg) => {
      if (msg.type === 'SUBMIT_VOTE') {
        const guess = msg.payload?.answer ?? msg.payload?.guess ?? msg.payload;
        if (typeof guess === 'string') {
          handleSubmitGuess(guess);
        }
      } else if (msg.type === 'USE_HINT') {
        handleUseHint();
      } else if (msg.type === 'NEXT_QUESTION') {
        startRound();
      } else if (msg.type === 'SKIP_QUESTION') {
        pickNewPuzzle();
      } else if (msg.type === 'CONTROLLER_READY') {
        syncManager.send({
          type: 'SYNC_FULL_STATE',
          payload: {
            activeGame: 'guess-the-emoji',
            step,
            currentQuestion: currentPuzzle,
            currentVoterIndex,
            guesses,
            usedHints,
            players,
          },
        });
      }
    });
  }, [step, currentPuzzle, currentVoterIndex, guesses, usedHints, players]);

  const handleUseHint = () => {
    playSound.hint(soundEnabled);
    const voter = players[currentVoterIndex];
    setUsedHints((prev) => ({ ...prev, [voter.id]: true }));
    setIsHintRevealedForTurn(true);
  };

  const handleSubmitGuess = (answer: string) => {
    const voter = players[currentVoterIndex];
    const cleanedAnswer = answer.trim();
    if (!cleanedAnswer) return;

    playSound.lockIn(soundEnabled);

    const nextGuesses = { ...guesses, [voter.id]: cleanedAnswer };
    setGuesses(nextGuesses);
    setTextInputValue('');
    setIsHintRevealedForTurn(false);

    if (currentVoterIndex < 3) {
      setCurrentVoterIndex((i) => i + 1);
      setCurtainKey((k) => k + 1);
    } else {
      // All 4 players have submitted!
      finishRound(nextGuesses);
    }
  };

  const finishRound = (finalGuesses: Record<number, string>) => {
    playSound.reveal(soundEnabled);

    // Calculate scores:
    // Correct: 100 points
    // No hint bonus: +25 points
    // Hint used: forfeits 25 bonus
    const pointsAwarded: Record<number, number> = {};
    let anyCorrect = false;

    players.forEach((p) => {
      const playerGuess = finalGuesses[p.id] || '';
      const isCorrect = playerGuess.toLowerCase() === currentPuzzle.answer.toLowerCase();
      if (isCorrect) {
        anyCorrect = true;
        const usedHint = usedHints[p.id];
        // 100 pts base + 25 if no hint was used!
        const totalPts = usedHint ? 100 : 125;
        pointsAwarded[p.id] = totalPts;
      } else {
        pointsAwarded[p.id] = 0;
      }
    });

    onAwardPoints(pointsAwarded);

    setTimeout(() => {
      if (anyCorrect) {
        playSound.fanfare(soundEnabled);
        fireConfetti(2600);
      } else {
        playSound.wrong(soundEnabled);
      }
    }, 450);

    setStep('REVEAL');
  };

  // Multiple choice options shuffled deterministically for the puzzle
  const shuffledOptions = useMemo(() => {
    return [...currentPuzzle.options].sort(() => 0.5 - Math.random());
  }, [currentPuzzle]);

  // 1. INSTRUCTIONS
  if (step === 'INSTRUCTIONS') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 animate-pop-in">
        <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#1E1B2E] text-center">
          <div className="inline-flex p-3 rounded-2xl bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] mb-3 text-3xl">
            🧩
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-black text-[#1E1B2E] mb-2">
            Guess the Emoji
          </h2>
          <p className="text-sm md:text-base text-[#1E1B2E]/80 mb-6 max-w-lg mx-auto">
            Decode clever emoji combinations into movies, songs, food, animals, phrases, and famous expressions!
          </p>

          {/* Scoring & Rules */}
          <div className="bg-white border-2 border-[#1E1B2E] rounded-2xl p-5 mb-6 text-left shadow-[3px_3px_0px_#1E1B2E] space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Scoring & Clues:</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs md:text-sm text-[#1E1B2E]/90">
              <div className="p-2.5 rounded-xl bg-[#D9F2E7] border border-emerald-300">
                <span className="font-display font-black text-emerald-800 text-sm block">125 Points</span>
                <span>Correct answer without using a hint!</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FFF0CC] border border-amber-300">
                <span className="font-display font-black text-amber-800 text-sm block">100 Points</span>
                <span>Correct answer with hint used (-25 credit).</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="font-display font-black text-gray-700 text-sm block">0 Points</span>
                <span>Incorrect or blank guess.</span>
              </div>
            </div>
          </div>

          {/* Category Filter Selector */}
          <div className="mb-6 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-[#1E1B2E]/70 mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Choose Puzzle Category (210+ Puzzles):</span>
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
                      ? 'bg-[#FBBF24] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E]'
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
              className="flex-1 py-3 px-6 rounded-2xl font-display font-black text-base bg-[#FFF0CC] hover:bg-[#FFE082] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Game</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. TV PUZZLE PREVIEW (Large emoji combination on TV)
  if (step === 'PUZZLE_PREVIEW') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 animate-pop-in">
        <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-10 shadow-[6px_6px_0px_#1E1B2E] text-center">
          {/* Metadata */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-4">
            <span>Guess the Emoji</span>
            <span aria-hidden="true">·</span>
            <span>{currentPuzzle.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-purple-700">{currentPuzzle.difficulty}</span>
          </div>

          {/* Big TV Emoji Box */}
          <div className="bg-white border-3 border-[#1E1B2E] rounded-3xl p-8 md:p-14 shadow-[5px_5px_0px_#1E1B2E] mb-6 flex flex-col items-center justify-center">
            <div className="text-5xl md:text-7xl lg:text-8xl tracking-widest select-none animate-gentle-pulse">
              {currentPuzzle.emojis}
            </div>
            <div className="mt-4 text-xs font-semibold text-[#1E1B2E]/60 uppercase tracking-widest">
              Decode the emojis!
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                pickNewPuzzle();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#DCEEFF] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center gap-1.5 active:translate-y-0.5"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random Puzzle</span>
            </button>

            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                pickNewPuzzle();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center gap-1.5 active:translate-y-0.5"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Skip Puzzle</span>
            </button>

            {/* Toggle Multiple Choice vs Text Mode */}
            <button
              onClick={() => {
                playSound.pop(soundEnabled);
                setInputMode(inputMode === 'multiple-choice' ? 'text' : 'multiple-choice');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E5DDFB] hover:bg-[#D9F2E7] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center gap-1.5 active:translate-y-0.5"
            >
              {inputMode === 'multiple-choice' ? (
                <>
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Switch to Text Typing</span>
                </>
              ) : (
                <>
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Switch to 4 Choices</span>
                </>
              )}
            </button>
          </div>

          {/* Start Pass Button */}
          <button
            onClick={proceedToGuessing}
            className="w-full max-w-md mx-auto py-4 px-8 rounded-2xl font-display font-black text-lg bg-[#34D399] hover:bg-[#10B981] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-1 transition-transform"
          >
            <span>Pass Phone to Player 1</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // 3. GUESSING (Secret pass-the-phone privacy shield & TV Status Board)
  if (step === 'GUESSING') {
    const activeVoter = players[currentVoterIndex];

    return (
      <div className="max-w-3xl mx-auto px-4 py-4 animate-pop-in">
        {/* Big TV Emoji Box */}
        <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[5px_5px_0px_#1E1B2E] mb-5 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            Puzzle on TV: {currentPuzzle.category}
          </div>
          <div className="text-5xl md:text-7xl py-2 mb-1 select-none animate-gentle-pulse">
            {currentPuzzle.emojis}
          </div>
        </div>

        {/* TV Audience Live Progress Board */}
        <div className="bg-white border-3 border-[#1E1B2E] rounded-3xl p-5 shadow-[4px_4px_0px_#1E1B2E] mb-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1E1B2E]/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-display font-black text-xs md:text-sm text-[#1E1B2E]">
                TV Audience Board · Guesses Locked on Phone
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-800 bg-[#FFF0CC] px-2 py-0.5 rounded-full border border-amber-300">
              Answers reveal on TV at end of round
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
                      ? 'ring-3 ring-amber-500 scale-102 shadow-[2px_2px_0px_#1E1B2E]'
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
                      <span className="text-emerald-700">✅ Answer Locked</span>
                    ) : isCurrent ? (
                      <span className="text-amber-800 animate-pulse">📱 Guessing on Phone...</span>
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
            {/* The Emoji combination */}
            <div className="text-center mb-4">
              <div className="text-4xl md:text-5xl py-2 mb-1 select-none">
                {currentPuzzle.emojis}
              </div>
              <div className="text-xs font-semibold text-[#1E1B2E]/60 uppercase tracking-wider">
                Category: {currentPuzzle.category}
              </div>
            </div>

            {/* Hint System (-25 credit penalty) */}
            <div className="mb-4">
              {isHintRevealedForTurn || usedHints[activeVoter.id] ? (
                <div className="p-3 bg-[#FFF0CC] rounded-xl border-2 border-[#1E1B2E] text-xs font-semibold text-[#1E1B2E] flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                  <span><strong>Hint:</strong> {currentPuzzle.hint}</span>
                  <span className="ml-auto text-[10px] font-bold text-amber-800 bg-white/70 px-1.5 py-0.5 rounded">
                    -25 pts penalty
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleUseHint}
                  className="w-full py-2 px-3 rounded-xl bg-[#FFF9F1] hover:bg-[#FFF0CC] border border-dashed border-[#1E1B2E]/40 text-xs font-bold text-[#1E1B2E] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Reveal Hint (Costs 25 Bonus Points from Credit)</span>
                </button>
              )}
            </div>

            {/* Mode 1: Multiple Choice (4 Buttons) */}
            {inputMode === 'multiple-choice' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                {shuffledOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSubmitGuess(opt)}
                    className="p-3.5 rounded-2xl bg-[#FFF9F1] hover:bg-[#D9F2E7] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] font-display font-bold text-sm text-[#1E1B2E] text-left transition-all active:scale-98"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              /* Mode 2: Direct Text Input */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitGuess(textInputValue);
                }}
                className="space-y-3 mb-3"
              >
                <input
                  type="text"
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  placeholder="Type your guess here..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl border-2 border-[#1E1B2E] font-display font-bold text-base text-[#1E1B2E] bg-[#FFF9F1] focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  type="submit"
                  disabled={!textInputValue.trim()}
                  className="w-full py-3 rounded-2xl font-display font-black text-sm bg-[#34D399] hover:bg-[#10B981] disabled:opacity-50 border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-1.5 active:translate-y-0.5"
                >
                  <span>Submit Guess</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="text-center text-[11px] font-semibold text-purple-700">
              🔒 Answers are stored secretly until everyone has guessed!
            </div>
          </div>
        </PassPhoneCurtain>
      </div>
    );
  }

  // 4. TV REVEAL (Correct answer, individual player results, points)
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pop-in">
      <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl p-6 md:p-8 shadow-[6px_6px_0px_#1E1B2E] text-center">
        {/* Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF0CC] border-2 border-[#1E1B2E] text-xs font-bold text-amber-900 mb-3 shadow-[2px_2px_0px_#1E1B2E]">
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>Puzzle Solved!</span>
        </div>

        {/* Emoji Combination */}
        <div className="text-4xl md:text-6xl mb-2 select-none">
          {currentPuzzle.emojis}
        </div>

        {/* Correct Answer Header */}
        <div className="font-display font-black text-2xl md:text-4xl text-[#1E1B2E] mb-6">
          Answer: <span className="text-emerald-700 underline decoration-wavy">{currentPuzzle.answer}</span>
        </div>

        {/* 4 Players Result Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {players.map((p) => {
            const guess = guesses[p.id] || '';
            const isCorrect = guess.toLowerCase() === currentPuzzle.answer.toLowerCase();
            const usedHint = usedHints[p.id];
            const earnedPoints = isCorrect ? (usedHint ? 100 : 125) : 0;

            return (
              <div
                key={p.id}
                className={`p-4 md:p-5 rounded-3xl border-3 border-[#1E1B2E] text-center transition-all shadow-[4px_4px_0px_#1E1B2E] ${
                  isCorrect
                    ? 'ring-4 ring-emerald-400 bg-[#D9F2E7]'
                    : 'bg-rose-50 opacity-90'
                }`}
              >
                {/* Avatar */}
                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-2 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-center text-3xl md:text-4xl">
                  {p.avatar}
                </div>

                <div className="font-display font-black text-sm md:text-base text-[#1E1B2E] truncate">
                  {p.name}
                </div>

                {/* Status indicator */}
                <div className="my-2 flex items-center justify-center gap-1">
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-white px-2 py-0.5 rounded-full border border-rose-300">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Missed
                    </span>
                  )}
                </div>

                {/* Points Awarded */}
                <div className="font-mono font-black text-sm md:text-base text-[#1E1B2E]">
                  +{earnedPoints} pts
                </div>

                {/* Clue indicator */}
                <div className="mt-1 text-[10px] text-[#1E1B2E]/70 font-semibold">
                  {isCorrect && !usedHint && '⚡ No Hint Bonus (+25)'}
                  {isCorrect && usedHint && '💡 Used Hint (-25)'}
                  {!isCorrect && `Guessed: "${guess || 'No answer'}"`}
                </div>
              </div>
            );
          })}
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
            className="flex-1 py-3 px-6 rounded-2xl font-display font-black text-base bg-[#FFF0CC] hover:bg-[#FFE082] border-3 border-[#1E1B2E] shadow-[4px_4px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Next Puzzle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
