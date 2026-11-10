/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, GameModuleId } from './types';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { WhosMostLikelyGame } from './games/WhosMostLikelyGame';
import { WouldYouRatherGame } from './games/WouldYouRatherGame';
import { GuessTheEmojiGame } from './games/GuessTheEmojiGame';
import { PlayerSetupModal } from './components/PlayerSetupModal';
import { QRCodeModal } from './components/QRCodeModal';

const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Maya', avatar: '🐰', color: '#F9DCE9', score: 0 },
  { id: 2, name: 'Liam', avatar: '🐻', color: '#E5DDFB', score: 0 },
  { id: 3, name: 'Chloe', avatar: '🦊', color: '#D9F2E7', score: 0 },
  { id: 4, name: 'Leo', avatar: '🐼', color: '#DCEEFF', score: 0 },
];

export default function App() {
  // Load persistent players from localStorage
  const [players, setPlayers] = useState<Player[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('giggle_players');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 4) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Failed to parse saved players:', err);
      }
    }
    return DEFAULT_PLAYERS;
  });

  // Current active game module
  const [activeGame, setActiveGame] = useState<GameModuleId | null>(null);

  // Settings
  const [tvMode, setTvMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals
  const [isPlayerSetupOpen, setIsPlayerSetupOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);

  // Used questions/puzzles sets to prevent duplicates during the session
  const [usedWhosMostLikelyIds, setUsedWhosMostLikelyIds] = useState<Set<string>>(new Set());
  const [usedWouldYouRatherIds, setUsedWouldYouRatherIds] = useState<Set<string>>(new Set());
  const [usedGuessEmojiIds, setUsedGuessEmojiIds] = useState<Set<string>>(new Set());

  // Save players to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('giggle_players', JSON.stringify(players));
    } catch (err) {
      console.warn('Failed to save players to localStorage:', err);
    }
  }, [players]);

  // Award points to players
  const handleAwardPoints = (pointsMap: Record<number, number>) => {
    setPlayers((prev) =>
      prev.map((player) => {
        const added = pointsMap[player.id] || 0;
        return added > 0 ? { ...player, score: player.score + added } : player;
      })
    );
  };

  // Reset scores back to 0
  const handleResetScores = () => {
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0 })));
  };

  return (
    <div
      className={`min-h-screen bg-[#FFF9F1] text-[#1E1B2E] transition-all flex flex-col ${
        tvMode ? 'text-lg lg:scale-[1.03] origin-top' : ''
      }`}
    >
      {/* Global Header */}
      <Header
        players={players}
        activeGame={activeGame}
        onNavigateHome={() => setActiveGame(null)}
        onOpenPlayerSetup={() => setIsPlayerSetupOpen(true)}
        onOpenQR={() => setIsQROpen(true)}
        tvMode={tvMode}
        onToggleTvMode={() => setTvMode((prev) => !prev)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {activeGame === null && (
          <Lobby
            players={players}
            onSelectGame={(game) => setActiveGame(game)}
            onOpenPlayerSetup={() => setIsPlayerSetupOpen(true)}
            onOpenQR={() => setIsQROpen(true)}
            soundEnabled={soundEnabled}
            tvMode={tvMode}
          />
        )}

        {activeGame === 'whos-most-likely' && (
          <WhosMostLikelyGame
            players={players}
            onAwardPoints={handleAwardPoints}
            onBackToLobby={() => setActiveGame(null)}
            soundEnabled={soundEnabled}
            tvMode={tvMode}
            usedQuestionIds={usedWhosMostLikelyIds}
            onMarkQuestionUsed={(id) => setUsedWhosMostLikelyIds((prev) => new Set([...prev, id]))}
          />
        )}

        {activeGame === 'would-you-rather' && (
          <WouldYouRatherGame
            players={players}
            onAwardPoints={handleAwardPoints}
            onBackToLobby={() => setActiveGame(null)}
            soundEnabled={soundEnabled}
            tvMode={tvMode}
            usedQuestionIds={usedWouldYouRatherIds}
            onMarkQuestionUsed={(id) => setUsedWouldYouRatherIds((prev) => new Set([...prev, id]))}
          />
        )}

        {activeGame === 'guess-the-emoji' && (
          <GuessTheEmojiGame
            players={players}
            onAwardPoints={handleAwardPoints}
            onBackToLobby={() => setActiveGame(null)}
            soundEnabled={soundEnabled}
            tvMode={tvMode}
            usedPuzzleIds={usedGuessEmojiIds}
            onMarkPuzzleUsed={(id) => setUsedGuessEmojiIds((prev) => new Set([...prev, id]))}
          />
        )}
      </main>

      {/* Modals */}
      <PlayerSetupModal
        isOpen={isPlayerSetupOpen}
        onClose={() => setIsPlayerSetupOpen(false)}
        players={players}
        onSavePlayers={(newPlayers) => setPlayers(newPlayers)}
        onResetScores={handleResetScores}
        soundEnabled={soundEnabled}
      />

      <QRCodeModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        soundEnabled={soundEnabled}
      />
    </div>
  );
}
