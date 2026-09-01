export type BluffRoundStatus =
  | "answering"
  | "voting"
  | "reveal"
  | "finished";

export type BluffRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  questionId: string;
  status: BluffRoundStatus;
  createdAt: string;
};

export type BluffAnswer = {
  id: string;
  roundId: string;
  playerId: string | null;
  text: string;
  isCorrect: boolean;
  createdAt: string;
};

export type BluffVote = {
  id: string;
  roundId: string;
  playerId: string;
  answerId: string;
  createdAt: string;
};

export type CategoriesRoundStatus =
  | "answering"
  | "reveal"
  | "finished";

export type CategoriesRound = {
  id: string;
  roomId: string;
  roundNumber: number;
  letter: string;
  status: CategoriesRoundStatus;
  createdAt: string;
  scoresApplied: boolean;
};

export type CategoriesAnswer = {
  id: string;
  roundId: string;
  playerId: string;
  categoryKey: string;
  answer: string;
  createdAt: string;

  validationStatus:
    | "valid"
    | "invalid"
    | "unknown"
    | null;

  validationSource:
    | string
    | null;

  validationReason:
    | string
    | null;

  points: number;
};

export type MinefieldRoundStatus =
  | "playing"
  | "reveal"
  | "finished";

export type MinefieldRound = {
  id: string;
  roomId: string;
  roundNumber: number;
  questionId: string;
  currentPlayerId: string | null;
  status: MinefieldRoundStatus;
  createdAt: string;
  sessionId: string;
};

export type MinefieldTile = {
  id: string;
  roundId: string;
  text: string;
  isCorrect: boolean;
  revealed: boolean;
  pickedBy: string | null;
  createdAt: string;
};

export type MinefieldQuestion = {
  id: string;
  category: string;
  question: string;
  correctAnswers: string[];
  wrongAnswers: string[];
};