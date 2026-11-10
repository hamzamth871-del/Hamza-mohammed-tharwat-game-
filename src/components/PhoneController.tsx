import React, { useState, useEffect } from 'react';
import { Player, GameModuleId } from '../types';
import { playSound } from '../utils/audio';
import { syncManager, SyncMessage } from '../utils/syncManager';
import { 
  Tv, 
  RotateCcw, 
  ArrowRight, 
  Lightbulb, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Volume2, 
  VolumeX,
  Play,
  CheckCircle,
  HelpCircle,
  Smartphone
} from 'lucide-react';

interface PhoneControllerProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  activeGame: GameModuleId | null;
  onSelectGame: (game: GameModuleId | null) => void;
  gameStep: string;
  currentQuestionOrPuzzle: any;
  currentTurnPlayerIndex: number;
  onVote: (vote: any) => void;
  onNextQuestion: () => void;
  onSwitchToTvView: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  roomCode: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const AVAILABLE_AVATARS = [
  '🐰', '🐻', '🦊', '🐼', '🐱', '🐶', '🐸', '🐨',
  '🦁', '🐧', '🦄', '🐙', '🐯', '🐵', '🦆', '🐹'
];

export const PhoneController: React.FC<PhoneControllerProps> = ({
  players,
  onUpdatePlayers,
  activeGame: propActiveGame,
  onSelectGame,
  onSwitchToTvView,
  connectionStatus,
  roomCode,
  soundEnabled,
  onToggleSound,
}) => {
  // Real-time synced state from TV Screen
  const [activeGame, setActiveGame] = useState<GameModuleId | null>(propActiveGame);
  const [gameStep, setGameStep] = useState<string>('INSTRUCTIONS');
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentVoterIndex, setCurrentVoterIndex] = useState<number>(0);
  const [votesCast, setVotesCast] = useState<Record<number, any>>({});
  const [isHintUsed, setIsHintUsed] = useState<boolean>(false);

  // Controller UI state
  const [showNameEditor, setShowNameEditor] = useState<boolean>(false);
  const [activePickerPlayerId, setActivePickerPlayerId] = useState<number | null>(null);
  const [isUnlockedForVoter, setIsUnlockedForVoter] = useState<boolean>(false);
  const [lastVotedPlayerId, setLastVotedPlayerId] = useState<number | null>(null);

  // Haptic trigger helper
  const triggerHaptic = (pattern: number | number[] = 35) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // ignore
      }
    }
  };

  // Subscribe to live updates from the TV
  useEffect(() => {
    // Request initial sync on mount
    syncManager.send({ type: 'CONTROLLER_READY' });

    const unsubscribe = syncManager.onMessage((msg: SyncMessage) => {
      if (msg.type === 'SYNC_FULL_STATE' && msg.payload) {
        const p = msg.payload;
        if (p.activeGame !== undefined) setActiveGame(p.activeGame);
        if (p.step) setGameStep(p.step);
        if (p.currentQuestion) setCurrentQuestion(p.currentQuestion);
        if (p.currentVoterIndex !== undefined) {
          // If voter changed, reset the privacy unlock for the new player!
          if (p.currentVoterIndex !== currentVoterIndex) {
            setIsUnlockedForVoter(false);
            setLastVotedPlayerId(null);
          }
          setCurrentVoterIndex(p.currentVoterIndex);
        }
        if (p.votes) setVotesCast(p.votes);
        if (p.guesses) setVotesCast(p.guesses);
        if (p.choices) setVotesCast(p.choices);
        if (p.usedHints) {
          const voter = players[p.currentVoterIndex || 0];
          setIsHintUsed(!!(voter && p.usedHints[voter.id]));
        }
        if (p.players && Array.isArray(p.players)) {
          onUpdatePlayers(p.players);
        }
      } else if (msg.type === 'UPDATE_PLAYERS' && Array.isArray(msg.payload)) {
        onUpdatePlayers(msg.payload);
      } else if (msg.type === 'SELECT_GAME') {
        setActiveGame(msg.payload);
        setIsUnlockedForVoter(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentVoterIndex, players]);

  // Handle immediate player name change on controller
  const handleNameChange = (id: number, newName: string) => {
    const updated = players.map((p) =>
      p.id === id ? { ...p, name: newName.slice(0, 14) } : p
    );
    onUpdatePlayers(updated);
    syncManager.send({
      type: 'UPDATE_PLAYERS',
      payload: updated,
    });
  };

  // Handle avatar change
  const handleAvatarChange = (id: number, emoji: string) => {
    triggerHaptic(25);
    playSound.pop(soundEnabled);
    const updated = players.map((p) =>
      p.id === id ? { ...p, avatar: emoji } : p
    );
    onUpdatePlayers(updated);
    syncManager.send({
      type: 'UPDATE_PLAYERS',
      payload: updated,
    });
    setActivePickerPlayerId(null);
  };

  // Controller Actions sent to TV:
  const handleSelectGameAction = (game: GameModuleId) => {
    triggerHaptic([30, 20, 30]);
    playSound.pop(soundEnabled);
    setActiveGame(game);
    onSelectGame(game);
    syncManager.send({ type: 'SELECT_GAME', payload: game });
  };

  const handleSendVote = (value: any) => {
    triggerHaptic([40, 30, 60]);
    playSound.lockIn(soundEnabled);
    const voter = players[currentVoterIndex] || players[0];
    setLastVotedPlayerId(voter.id);

    // Send to TV
    syncManager.send({
      type: 'SUBMIT_VOTE',
      payload: value,
    });

    // Auto re-lock screen for privacy
    setTimeout(() => {
      setIsUnlockedForVoter(false);
    }, 350);
  };

  const handleNextQuestionAction = () => {
    triggerHaptic([30, 20, 40]);
    playSound.pop(soundEnabled);
    setIsUnlockedForVoter(false);
    setLastVotedPlayerId(null);
    syncManager.send({ type: 'NEXT_QUESTION' });
  };

  const handleUseHintAction = () => {
    triggerHaptic(40);
    playSound.hint(soundEnabled);
    setIsHintUsed(true);
    syncManager.send({ type: 'USE_HINT' });
  };

  const currentVoter = players[currentVoterIndex] || players[0];

  return (
    <div className="min-h-screen bg-[#1E1B2E] text-white p-3 sm:p-4 max-w-md mx-auto flex flex-col justify-between select-none">
      {/* GAMEPAD SHELL TOP / SHOULDER BUTTONS */}
      <div>
        {/* Shoulder Triggers (L & R) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* L Trigger: Change Names */}
          <button
            onClick={() => {
              triggerHaptic(20);
              playSound.pop(soundEnabled);
              setShowNameEditor((prev) => !prev);
            }}
            className="flex-1 py-1.5 px-3 rounded-t-xl bg-[#2D2845] hover:bg-[#3D375C] border-2 border-b-0 border-[#4D4573] text-[11px] font-mono font-bold tracking-wider text-purple-200 flex items-center justify-center gap-1.5 shadow-sm active:translate-y-0.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-400" />
            <span>[L] EDIT NAMES</span>
          </button>

          {/* R Trigger: TV View Switch */}
          <button
            onClick={() => {
              triggerHaptic(20);
              playSound.pop(soundEnabled);
              onSwitchToTvView();
            }}
            className="flex-1 py-1.5 px-3 rounded-t-xl bg-[#2D2845] hover:bg-[#3D375C] border-2 border-b-0 border-[#4D4573] text-[11px] font-mono font-bold tracking-wider text-cyan-200 flex items-center justify-center gap-1.5 shadow-sm active:translate-y-0.5"
          >
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
            <span>[R] TV SCREEN</span>
          </button>
        </div>

        {/* Gamepad Header Display HUD */}
        <div className="p-3 bg-[#26213B] rounded-2xl border-2 border-[#4D4573] shadow-md mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-lg">
              🎮
            </div>
            <div>
              <div className="font-display font-black text-sm tracking-wide text-purple-200 flex items-center gap-1.5 leading-none">
                <span>GIGGLE CONTROLLER</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Connected" />
              </div>
              <div className="text-[10px] font-mono text-gray-400 mt-1">
                TV LINK: <span className="text-emerald-400 font-bold">{roomCode}</span> · 4 PLAYERS
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleSound}
              className="p-1.5 rounded-lg bg-[#3D375C] border border-[#5D558A] text-gray-300 active:scale-95"
              aria-label="Sound Toggle"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-gray-500" />}
            </button>
          </div>
        </div>

        {/* ---------------- CHANGE NAMES ACCORDION SHEET ---------------- */}
        {showNameEditor && (
          <div className="bg-[#2D2845] border-2 border-purple-400 rounded-2xl p-3 mb-3 shadow-lg animate-pop-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-purple-200">
                EDIT 4 PLAYER NAMES & AVATARS:
              </span>
              <button
                onClick={() => setShowNameEditor(false)}
                className="text-[10px] uppercase font-bold text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="p-2 rounded-xl bg-[#1E1B2E] border border-purple-400/40 flex items-center gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setActivePickerPlayerId(activePickerPlayerId === p.id ? null : p.id);
                    }}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg shrink-0"
                    title="Change avatar"
                  >
                    {p.avatar}
                  </button>

                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => handleNameChange(p.id, e.target.value)}
                    placeholder={`Player ${p.id}`}
                    maxLength={14}
                    className="w-full px-1.5 py-0.5 rounded bg-transparent font-display font-bold text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              ))}
            </div>

            {/* Avatar Palette */}
            {activePickerPlayerId !== null && (
              <div className="mt-2 p-2 bg-[#1E1B2E] rounded-xl border border-purple-500/30">
                <div className="text-[10px] text-gray-400 mb-1">Pick Avatar:</div>
                <div className="grid grid-cols-8 gap-1">
                  {AVAILABLE_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAvatarChange(activePickerPlayerId, emoji)}
                      className="p-1 text-base hover:bg-white/10 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- GAME CONTROLLER BODY ---------------- */}

        {/* STATE 1: LOBBY (Start Game from Gamepad) */}
        {!activeGame && (
          <div className="space-y-3 animate-pop-in">
            <div className="bg-[#26213B] rounded-2xl border-2 border-[#4D4573] p-4 text-center">
              <div className="text-3xl mb-1">🎮</div>
              <h2 className="font-display font-black text-lg text-white">
                Choose Game to Play on TV
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">
                Press any button below to launch on the big screen!
              </p>
            </div>

            {/* Chunky Arcade Game Selection Buttons */}
            <button
              onClick={() => handleSelectGameAction('whos-most-likely')}
              className="w-full p-4 rounded-2xl bg-[#F9DCE9] text-[#1E1B2E] border-3 border-[#1E1B2E] shadow-[0_6px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1.5 transition-all text-left flex items-center justify-between font-display font-black"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🗳️</span>
                <div>
                  <div className="text-base leading-none">Who's Most Likely To?</div>
                  <div className="text-[11px] font-bold text-[#1E1B2E]/70 mt-1">215+ Funny Group Questions</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#1E1B2E]" />
            </button>

            <button
              onClick={() => handleSelectGameAction('would-you-rather')}
              className="w-full p-4 rounded-2xl bg-[#DCEEFF] text-[#1E1B2E] border-3 border-[#1E1B2E] shadow-[0_6px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1.5 transition-all text-left flex items-center justify-between font-display font-black"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚖️</span>
                <div>
                  <div className="text-base leading-none">Would You Rather?</div>
                  <div className="text-[11px] font-bold text-[#1E1B2E]/70 mt-1">212+ Tough & Funny Dilemmas</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#1E1B2E]" />
            </button>

            <button
              onClick={() => handleSelectGameAction('guess-the-emoji')}
              className="w-full p-4 rounded-2xl bg-[#FFF0CC] text-[#1E1B2E] border-3 border-[#1E1B2E] shadow-[0_6px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1.5 transition-all text-left flex items-center justify-between font-display font-black"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🧩</span>
                <div>
                  <div className="text-base leading-none">Guess the Emoji</div>
                  <div className="text-[11px] font-bold text-[#1E1B2E]/70 mt-1">210+ Puzzles with Clues</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#1E1B2E]" />
            </button>
          </div>
        )}

        {/* STATE 2: ACTIVE VOTING / SECRET INPUT CONTROLLER */}
        {activeGame && (gameStep === 'VOTING' || gameStep === 'GUESSING') && (
          <div className="space-y-3 animate-pop-in">
            {/* PRIVACY HANDOFF SHIELD */}
            {!isUnlockedForVoter ? (
              <div
                className="rounded-3xl border-3 border-[#1E1B2E] p-6 text-center text-[#1E1B2E] shadow-[0_6px_0_#0D0B17]"
                style={{ backgroundColor: currentVoter.color }}
              >
                <div className="w-20 h-20 mx-auto mb-2 rounded-2xl bg-white border-3 border-[#1E1B2E] shadow-[2px_2px_0_#1E1B2E] flex items-center justify-center text-4xl animate-gentle-pulse">
                  {currentVoter.avatar}
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-[#1E1B2E]/70">
                  Pass Controller to:
                </div>
                <div className="font-display text-3xl font-black text-[#1E1B2E] mb-1">
                  {currentVoter.name}!
                </div>
                <div className="text-[11px] font-bold text-[#1E1B2E]/70 mb-5">
                  Player {currentVoterIndex + 1} of 4 · Secret Turn
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(30);
                    playSound.pop(soundEnabled);
                    setIsUnlockedForVoter(true);
                  }}
                  className="w-full py-4 px-6 rounded-2xl font-display font-black text-lg bg-white hover:bg-yellow-100 border-3 border-[#1E1B2E] shadow-[0_5px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1 text-[#1E1B2E] flex items-center justify-center gap-2"
                >
                  <Lock className="w-5 h-5 text-purple-700" />
                  <span>I am {currentVoter.name} — Unlock!</span>
                </button>
              </div>
            ) : (
              /* UNLOCKED TACTILE ARCADE BUTTONS */
              <div className="bg-[#26213B] rounded-3xl border-2 border-[#4D4573] p-4 shadow-xl">
                {/* Active Player HUD */}
                <div className="flex items-center justify-between pb-3 border-b border-[#4D4573] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{currentVoter.avatar}</span>
                    <span className="font-display font-black text-sm text-purple-200">
                      {currentVoter.name}’s Secret Pick
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500">
                    🔒 HIDDEN FROM TV
                  </span>
                </div>

                {/* GAME 1: WHO'S MOST LIKELY ARCADE BUZZERS */}
                {activeGame === 'whos-most-likely' && (
                  <div>
                    <div className="text-xs font-bold text-center text-gray-300 mb-2">
                      Tap who fits this best (Answers reveal on TV at end of round):
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {players.map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => handleSendVote({ targetPlayerId: target.id })}
                          className="p-4 rounded-2xl border-3 border-[#1E1B2E] shadow-[0_5px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1 transition-all flex flex-col items-center justify-center gap-1.5"
                          style={{ backgroundColor: target.color }}
                        >
                          <span className="text-3xl">{target.avatar}</span>
                          <span className="font-display font-black text-xs text-[#1E1B2E] truncate w-full text-center">
                            {target.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* GAME 2: WOULD YOU RATHER GIANT ARCADE PADDLES */}
                {activeGame === 'would-you-rather' && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-center text-gray-300 mb-1">
                      Tap your secret dilemma choice:
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendVote({ choice: 'A' })}
                      className="w-full p-4 rounded-2xl bg-[#F9DCE9] text-[#1E1B2E] border-3 border-[#1E1B2E] shadow-[0_6px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1.5 text-left transition-all font-display font-black text-sm flex items-start gap-3"
                    >
                      <span className="w-8 h-8 rounded-xl bg-white border-2 border-[#1E1B2E] flex items-center justify-center text-sm font-black shrink-0">
                        A
                      </span>
                      <span className="pt-1 leading-snug">
                        {currentQuestion?.scenarioA || 'Option A (Shown on TV)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendVote({ choice: 'B' })}
                      className="w-full p-4 rounded-2xl bg-[#DCEEFF] text-[#1E1B2E] border-3 border-[#1E1B2E] shadow-[0_6px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1.5 text-left transition-all font-display font-black text-sm flex items-start gap-3"
                    >
                      <span className="w-8 h-8 rounded-xl bg-white border-2 border-[#1E1B2E] flex items-center justify-center text-sm font-black shrink-0">
                        B
                      </span>
                      <span className="pt-1 leading-snug">
                        {currentQuestion?.scenarioB || 'Option B (Shown on TV)'}
                      </span>
                    </button>
                  </div>
                )}

                {/* GAME 3: GUESS THE EMOJI ARCADE CHOICES & HINT */}
                {activeGame === 'guess-the-emoji' && (
                  <div className="space-y-3">
                    {/* Emojis Display */}
                    <div className="text-center text-4xl py-1 select-none">
                      {currentQuestion?.emojis || '🧩'}
                    </div>

                    {/* Hint Button */}
                    <div>
                      {isHintUsed ? (
                        <div className="p-2.5 rounded-xl bg-amber-400 text-[#1E1B2E] font-bold text-xs">
                          💡 Hint: {currentQuestion?.hint} (-25 pts)
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleUseHintAction}
                          className="w-full py-1.5 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>Unlock Hint (-25 credit)</span>
                        </button>
                      )}
                    </div>

                    {/* 4 Choices */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(currentQuestion?.options || ['Option 1', 'Option 2', 'Option 3', 'Option 4']).map(
                        (opt: string) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSendVote({ answer: opt })}
                            className="p-3 rounded-xl bg-[#FFF9F1] hover:bg-[#D9F2E7] text-[#1E1B2E] border-2 border-[#1E1B2E] shadow-[0_4px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1 font-display font-black text-xs text-left"
                          >
                            {opt}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STATE 3: RESULTS REVEAL ON TV */}
        {activeGame && gameStep === 'REVEAL' && (
          <div className="space-y-3 animate-pop-in">
            <div className="bg-[#26213B] rounded-3xl border-2 border-[#4D4573] p-5 text-center shadow-lg">
              <div className="text-4xl mb-2">📺 🎉</div>
              <h3 className="font-display font-black text-lg text-white">
                ANSWERS ARE LIVE ON TV!
              </h3>
              <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
                Look at the laptop or TV screen to see everyone's votes, percentages, correct answers, and points!
              </p>
            </div>

            {/* Next Round Arcade Push Button */}
            <button
              onClick={handleNextQuestionAction}
              className="w-full py-4 px-6 rounded-2xl bg-[#34D399] hover:bg-[#10B981] text-[#1E1B2E] border-3 border-[#1E1B2E] shadow-[0_6px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1.5 font-display font-black text-base flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Next Round on TV Screen</span>
            </button>
          </div>
        )}

        {/* STATE 4: QUESTION PREVIEW ON TV */}
        {activeGame && (gameStep === 'QUESTION_PREVIEW' || gameStep === 'INSTRUCTIONS') && (
          <div className="space-y-3 animate-pop-in">
            <div className="bg-[#26213B] rounded-3xl border-2 border-[#4D4573] p-5 text-center">
              <div className="text-3xl mb-1">👀</div>
              <h3 className="font-display font-black text-base text-white">
                Reading Prompt on TV
              </h3>
              <p className="text-xs text-gray-300 mt-1">
                When everyone is ready, press the button below to start passing the phone controller!
              </p>
            </div>

            <button
              onClick={handleNextQuestionAction}
              className="w-full py-4 px-6 rounded-2xl bg-[#34D399] hover:bg-[#10B981] text-[#1E1B2E] border-3 border-[#1E1B2E] shadow-[0_6px_0_#1E1B2E] active:shadow-[0_1px_0_#1E1B2E] active:translate-y-1.5 font-display font-black text-base flex items-center justify-center gap-2"
            >
              <span>Pass Controller to Player 1</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* GAMEPAD BOTTOM GRIP / EXIT BAR */}
      <div className="mt-4 pt-3 border-t border-[#3D375C] flex items-center justify-between text-xs text-gray-400">
        <button
          onClick={() => {
            triggerHaptic(20);
            playSound.pop(soundEnabled);
            setActiveGame(null);
            onSelectGame(null);
            syncManager.send({ type: 'SELECT_GAME', payload: null });
          }}
          className="hover:text-white font-bold"
        >
          ← Change Game
        </button>

        <span className="font-mono text-[10px] text-purple-400">
          GIGGLE GAMEPAD v2.0
        </span>
      </div>
    </div>
  );
};
