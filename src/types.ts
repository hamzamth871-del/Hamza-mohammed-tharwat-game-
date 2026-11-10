export type GameModuleId = 'whos-most-likely' | 'would-you-rather' | 'guess-the-emoji';

export interface Player {
  id: number; // 1, 2, 3, 4
  name: string;
  avatar: string; // Emoji avatar
  color: string; // Pastel accent
  score: number;
}

export type WhosMostLikelyCategory =
  | 'Friendship'
  | 'Funny Situations'
  | 'School Life'
  | 'Future Predictions'
  | 'Personality'
  | 'Random Situations'
  | 'Everyday Life';

export interface WhosMostLikelyQuestion {
  id: string;
  question: string;
  category: WhosMostLikelyCategory;
}

export type WouldYouRatherCategory =
  | 'Funny'
  | 'Difficult Choices'
  | 'Friendship'
  | 'Food'
  | 'Travel'
  | 'School'
  | 'Fantasy'
  | 'Entertainment';

export interface WouldYouRatherQuestion {
  id: string;
  scenarioA: string;
  scenarioB: string;
  category: WouldYouRatherCategory;
}

export type GuessEmojiCategory =
  | 'Movies'
  | 'Cartoons'
  | 'Food'
  | 'Animals'
  | 'Objects'
  | 'Famous Phrases'
  | 'Music'
  | 'Everyday Expressions';

export interface GuessEmojiPuzzle {
  id: string;
  emojis: string;
  answer: string;
  options: [string, string, string, string]; // exactly 4 choices
  category: GuessEmojiCategory;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  hint: string;
}

export interface SessionLeaderboard {
  [playerId: number]: {
    whosMostLikelyWins: number;
    wouldYouRatherPopularVotes: number;
    guessEmojiCorrect: number;
    totalPoints: number;
  };
}
