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
  endsAt: string;
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
  endsAt: string;
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
  turnEndsAt: string | null;
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

export type DrawingRoundStatus =
  | "drawing"
  | "reveal"
  | "finished";

export type DrawingSession = {
  id: string;
  roomId: string;
  status:
    | "playing"
    | "finished";
  createdAt: string;
  finishedAt: string | null;
};

export type DrawingRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;

  drawerPlayerId: string;

  wordId: string;

  status: DrawingRoundStatus;

  startedAt: string;
  endsAt: string;
  createdAt: string;
};

export type DrawingPoint = {
  x: number;
  y: number;
};

export type DrawingStroke = {
  id: string;
  roundId: string;
  playerId: string;

  points: DrawingPoint[];

  lineWidth: number;

  createdAt: string;
};

export type DrawingGuess = {
  id: string;
  roundId: string;
  playerId: string;

  guess: string;

  isCorrect: boolean;

  points: number;

  createdAt: string;
};

export type DrawingWord = {
  id: string;

  word: string;

  category: string;

  difficulty:
    | "easy"
    | "medium"
    | "hard";
};

export type HigherLowerRoundStatus =
  | "guessing"
  | "reveal"
  | "finished";

export type HigherLowerSessionStatus =
  | "playing"
  | "finished";

export type HigherLowerItem = {
  id: string;
  label: string;
  category: string | null;
  unit: string | null;
  value: number;
  difficulty:
    | "easy"
    | "medium"
    | "hard";
};

export type HigherLowerRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  currentItemId: string;
  nextItemId: string;
  status: HigherLowerRoundStatus;
  createdAt: string;
  endsAt: string;
};

export type HigherLowerGuess = {
  id: string;
  roundId: string;
  playerId: string;
  guess: "higher" | "lower";
  isCorrect: boolean | null;
  createdAt: string;
};

export type TriviaRoundStatus =
  | "answering"
  | "reveal"
  | "finished";

export type TriviaSessionStatus =
  | "playing"
  | "finished";

export type TriviaQuestion = {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty:
    | "easy"
    | "medium"
    | "hard";
};

export type TriviaRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  questionId: string;
  status: TriviaRoundStatus;
  createdAt: string;
  endsAt: string;
};

export type TriviaAnswer = {
  id: string;
  roundId: string;
  playerId: string;
  selectedIndex: number;
  isCorrect: boolean;
  points: number;
  createdAt: string;
};