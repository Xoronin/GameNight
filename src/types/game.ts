export type BluffRoundStatus =
  | "answering"
  | "voting"
  | "reveal"
  | "finished";

export type BluffRound = {
  id: string;
  roomId: string;
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