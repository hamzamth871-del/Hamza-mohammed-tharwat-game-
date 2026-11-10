/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Player, GameModuleId } from './types';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { WhosMostLikelyGame } from './games/WhosMostLikelyGame';
import { WouldYouRatherGame } from './games/WouldYouRatherGame';
import { GuessTheEmojiGame } from './games/GuessTheEmojiGame';
import { PlayerSetupModal } from './components/PlayerSetupModal';
import { QRCodeModal } from './components/QRCodeModal';
import { PhoneController } from './components/PhoneController';
import { syncManager, SyncMessage } from './utils/syncManager';
import { playSound } from './utils/audio';

const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: 'Maya', avatar: '🐰', color: '#F9DCE9', score: 0 },
  { id: 2, name: 'Liam', avatar: '🐻', color: '#E5DDFB', score: 0 },
  { id: 3, name: 'Chloe', avatar: '🦊', color: '#D9F2E7', score: 0 },
  { id: 4, name: 'Leo', avatar: '🐼', color: '#DCEEFF', score: 0 },
];

export default function App() {
  // Determine initial role and room from URL query
  const [userRole, setUserRole] = useState<'tv' | 'controller'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('role') === 'controller') {
        return 'controller';
      }
    }
    return 'tv';
  });

  const [roomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paramRoom = params.get('room');
      if (paramRoom) return paramRoom.toUpperCase();
    }
    return syncManager.generateRoomCode();
  });

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

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

  // Setup SyncManager connection based on role
  useEffect(() => {
    syncManager.setStatusCallback((status) => {
      setConnectionStatus(status);
    });

    if (userRole === 'tv') {
      syncManager.initHost(roomCode);
    } else {
      syncManager.initController(roomCode);
    }

    // Subscribe to incoming peer messages
    const unsubscribe = syncManager.onMessage((msg: SyncMessage) => {
      switch (msg.type) {
        case 'UPDATE_PLAYERS':
          if (Array.isArray(msg.payload) && msg.payload.length === 4) {
            setPlayers(msg.payload);
            try {
              localStorage.setItem('giggle_players', JSON.stringify(msg.payload));
            } catch (e) {
              console.warn(e);
            }
          }
          break;

        case 'SELECT_GAME':
          setActiveGame(msg.payload);
          break;

        case 'CONTROLLER_READY':
          // TV host broadcasts current player roster and game state to newly connected controller
          if (userRole === 'tv') {
            syncManager.send({
              type: 'UPDATE_PLAYERS',
              payload: players,
            });
            if (activeGame) {
              syncManager.send({
                type: 'SELECT_GAME',
                payload: activeGame,
              });
            }
          }
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userRole, roomCode]);

  // Save players to localStorage and broadcast to peer controller whenever updated
  const handleUpdatePlayers = (newPlayers: Player[], shouldBroadcast = true) => {
    setPlayers(newPlayers);
    try {
      localStorage.setItem('giggle_players', JSON.stringify(newPlayers));
    } catch (err) {
      console.warn('Failed to save players to localStorage:', err);
    }
    if (shouldBroadcast) {
      syncManager.send({
        type: 'UPDATE_PLAYERS',
        payload: newPlayers,
      });
    }
  };

  // Select game and broadcast
  const handleSelectGame = (game: GameModuleId | null, shouldBroadcast = true) => {
    setActiveGame(game);
    if (shouldBroadcast) {
      syncManager.send({
        type: 'SELECT_GAME',
        payload: game,
      });
    }
  };

  // Award points to players
  const handleAwardPoints = (pointsMap: Record<number, number>) => {
    setPlayers((prev) => {
      const updated = prev.map((player) => {
        const added = pointsMap[player.id] || 0;
        return added > 0 ? { ...player, score: player.score + added } : player;
      });
      syncManager.send({
        type: 'UPDATE_PLAYERS',
        payload: updated,
      });
      return updated;
    });
  };

  // Reset scores back to 0
  const handleResetScores = () => {
    const reset = players.map((p) => ({ ...p, score: 0 }));
    handleUpdatePlayers(reset, true);
  };

  // IF USER IS IN CONTROLLER MODE (Scanned with smartphone)
  if (userRole === 'controller') {
    return (
      <PhoneController
        players={players}
        onUpdatePlayers={handleUpdatePlayers}
        activeGame={activeGame}
        onSelectGame={handleSelectGame}
        gameStep="VOTING"
        currentQuestionOrPuzzle={null}
        currentTurnPlayerIndex={0}
        onVote={(vote) => syncManager.send({ type: 'SUBMIT_VOTE', payload: vote })}
        onNextQuestion={() => syncManager.send({ type: 'NEXT_QUESTION' })}
        onSwitchToTvView={() => {
          setUserRole('tv');
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('role');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        connectionStatus={connectionStatus}
        roomCode={roomCode}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
      />
    );
  }

  // STANDARD TV / DISPLAY VIEW
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
        onNavigateHome={() => handleSelectGame(null)}
        onOpenPlayerSetup={() => setIsPlayerSetupOpen(true)}
        onOpenQR={() => setIsQROpen(true)}
        onSwitchToController={() => {
          setUserRole('controller');
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('role', 'controller');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        roomCode={roomCode}
        isControllerConnected={connectionStatus === 'connected'}
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
            onSelectGame={(game) => handleSelectGame(game)}
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
            onBackToLobby={() => handleSelectGame(null)}
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
            onBackToLobby={() => handleSelectGame(null)}
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
            onBackToLobby={() => handleSelectGame(null)}
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
        onSavePlayers={(newPlayers) => handleUpdatePlayers(newPlayers, true)}
        onResetScores={handleResetScores}
        soundEnabled={soundEnabled}
      />

      <QRCodeModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        roomCode={roomCode}
        isConnected={connectionStatus === 'connected'}
        onOpenControllerDirectly={() => {
          setUserRole('controller');
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('role', 'controller');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        soundEnabled={soundEnabled}
      />
    </div>
  );
}
