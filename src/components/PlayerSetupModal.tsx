import React, { useState } from 'react';
import { Player } from '../types';
import { X, Check, RotateCcw, Sparkles } from 'lucide-react';
import { playSound } from '../utils/audio';

interface PlayerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSavePlayers: (players: Player[]) => void;
  onResetScores: () => void;
  soundEnabled: boolean;
}

const AVAILABLE_AVATARS = [
  '🐰', '🐻', '🦊', '🐼', '🐱', '🐶', '🐸', '🐨',
  '🦁', '🐧', '🦄', '🐙', '🐯', '🐵', '🦆', '🐹'
];

export const PlayerSetupModal: React.FC<PlayerSetupModalProps> = ({
  isOpen,
  onClose,
  players,
  onSavePlayers,
  onResetScores,
  soundEnabled,
}) => {
  const [editedPlayers, setEditedPlayers] = useState<Player[]>(players);
  const [activePickerPlayerId, setActivePickerPlayerId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (id: number, name: string) => {
    setEditedPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: name.slice(0, 14) } : p))
    );
  };

  const handleAvatarChange = (id: number, avatar: string) => {
    playSound.pop(soundEnabled);
    setEditedPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, avatar } : p))
    );
    setActivePickerPlayerId(null);
  };

  const handleSave = () => {
    playSound.pop(soundEnabled);
    onSavePlayers(editedPlayers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl max-w-lg w-full p-6 shadow-[6px_6px_0px_#1E1B2E] relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            playSound.pop(soundEnabled);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white hover:bg-[#F9DCE9] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] active:translate-y-0.5"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <h2 className="font-display text-2xl font-black text-[#1E1B2E]">Party Player Profiles</h2>
          <p className="text-xs text-[#1E1B2E]/70 mt-1">
            Exactly 4 players on one smartphone. Names & scores stay saved for the whole night!
          </p>
        </div>

        {/* 4 Players List */}
        <div className="space-y-3 mb-6">
          {editedPlayers.map((player) => (
            <div
              key={player.id}
              className="p-3.5 rounded-2xl border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] transition-all"
              style={{ backgroundColor: player.color }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar Button */}
                <button
                  type="button"
                  onClick={() => {
                    playSound.pop(soundEnabled);
                    setActivePickerPlayerId(activePickerPlayerId === player.id ? null : player.id);
                  }}
                  className="w-12 h-12 rounded-2xl bg-white border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-transform shrink-0"
                  title="Change avatar"
                >
                  {player.avatar}
                </button>

                {/* Name Input */}
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1E1B2E]/70 mb-0.5">
                    Player {player.id}
                  </label>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => handleNameChange(player.id, e.target.value)}
                    placeholder={`Player ${player.id}`}
                    maxLength={14}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border-2 border-[#1E1B2E] font-display font-semibold text-sm text-[#1E1B2E] focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {/* Current Score */}
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#1E1B2E]/70">
                    Points
                  </div>
                  <div className="font-mono font-bold text-base text-[#1E1B2E]">
                    {player.score}
                  </div>
                </div>
              </div>

              {/* Avatar Selector Dropdown */}
              {activePickerPlayerId === player.id && (
                <div className="mt-3 p-3 bg-white rounded-xl border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E]">
                  <div className="text-[11px] font-bold text-[#1E1B2E] mb-2">Pick an Avatar:</div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {AVAILABLE_AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAvatarChange(player.id, emoji)}
                        className={`p-1.5 text-xl rounded-lg hover:bg-[#FFF0CC] transition-transform active:scale-90 ${
                          player.avatar === emoji ? 'bg-[#D9F2E7] ring-2 ring-emerald-500' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset all scores back to 0 for a brand new game?')) {
                playSound.pop(soundEnabled);
                onResetScores();
                setEditedPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
              }
            }}
            className="py-2.5 px-4 rounded-xl font-display font-semibold text-xs bg-white hover:bg-rose-50 border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-rose-700 flex items-center justify-center gap-1.5 active:translate-y-0.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Scores</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl font-display font-bold text-sm bg-[#34D399] hover:bg-[#10B981] border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Profiles</span>
          </button>
        </div>
      </div>
    </div>
  );
};
