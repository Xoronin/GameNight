export type BluffPhase =
    | "question"
    | "vote"
    | "reveal"
    | "finished";

export type BluffAnswerOption = {
    id: string;
    text: string;
    isCorrect: boolean;
    author?: string;
};

export type BluffRoundResult = {
    selectedAnswerId: string | null;
    correctAnswerId: string;
    wasCorrect: boolean;
    pointsEarned: number;
};