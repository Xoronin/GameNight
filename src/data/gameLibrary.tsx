import {
  Bomb,
  Brain,
  Brush,
  ListChecks,
  MessageSquareQuote,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

export type GameLibraryEntry = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  players: string;
  icon: ReactNode;
  className: string;
};

export const gameLibrary: GameLibraryEntry[] = [
  {
    id: "bluff",
    nameKey: "games.bluff.name",
    descriptionKey:
      "games.bluff.description",
    players: "3–10",
    icon: <MessageSquareQuote />,
    className: "purple",
  },
  {
    id: "minefield",
    nameKey: "games.minefield.name",
    descriptionKey:
      "games.minefield.description",
    players: "2–10",
    icon: <Bomb />,
    className: "red",
  },
  {
    id: "higher-lower",
    nameKey:
      "games.higherLower.name",
    descriptionKey:
      "games.higherLower.description",
    players: "2–10",
    icon: <TrendingUp />,
    className: "green",
  },
  {
    id: "trivia",
    nameKey: "games.trivia.name",
    descriptionKey:
      "games.trivia.description",
    players: "2–12",
    icon: <Brain />,
    className: "blue",
  },
  {
    id: "categories",
    nameKey:
      "games.categories.name",
    descriptionKey:
      "games.categories.description",
    players: "2–12",
    icon: <ListChecks />,
    className: "orange",
  },
  {
    id: "draw-guess",
    nameKey:
      "games.drawGuess.name",
    descriptionKey:
      "games.drawGuess.description",
    players: "3–12",
    icon: <Brush />,
    className: "pink",
  },
];

export function getGameLibraryEntry(
  gameId: string | undefined,
): GameLibraryEntry | undefined {
  return gameLibrary.find(
    (game) => game.id === gameId,
  );
}
