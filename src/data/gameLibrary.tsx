import {
  Ban,
  Bomb,
  Brain,
  Brush,
  Eye,
  Gavel,
  Heart,
  HelpCircle,
  History,
  Link2,
  ListChecks,
  ListOrdered,
  MessageSquareQuote,
  Music2,
  Smile,
  TrendingUp,
  Type,
  Volume2,
  ZoomIn,
} from "lucide-react";
import type { ReactNode } from "react";

export type GameGroup = "team" | "solo";

export type GameLibraryEntry = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  players: string;
  icon: ReactNode;
  className: string;
  group: GameGroup;
  comingSoon?: boolean;
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
    group: "solo",
  },
  {
    id: "minefield",
    nameKey: "games.minefield.name",
    descriptionKey:
      "games.minefield.description",
    players: "2–10",
    icon: <Bomb />,
    className: "red",
    group: "solo",
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
    group: "solo",
  },
  {
    id: "trivia",
    nameKey: "games.trivia.name",
    descriptionKey:
      "games.trivia.description",
    players: "2–12",
    icon: <Brain />,
    className: "blue",
    group: "solo",
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
    group: "solo",
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
    group: "solo",
  },

  /*
   * Placeholders for planned games — not yet
   * playable. Shown so the roadmap is visible, but
   * not selectable in the Lobby.
   */
  {
    id: "codewords",
    nameKey: "games.codewords.name",
    descriptionKey:
      "games.codewords.description",
    players: "4–12",
    icon: <Eye />,
    className: "purple",
    group: "team",
    comingSoon: true,
  },
  {
    id: "risk-it",
    nameKey: "games.riskIt.name",
    descriptionKey:
      "games.riskIt.description",
    players: "2–12",
    icon: <Gavel />,
    className: "orange",
    group: "team",
    comingSoon: true,
  },
  {
    id: "forbidden-words",
    nameKey:
      "games.forbiddenWords.name",
    descriptionKey:
      "games.forbiddenWords.description",
    players: "4–12",
    icon: <Ban />,
    className: "red",
    group: "team",
    comingSoon: true,
  },
  {
    id: "emoji-decode",
    nameKey:
      "games.emojiDecode.name",
    descriptionKey:
      "games.emojiDecode.description",
    players: "2–12",
    icon: <Smile />,
    className: "pink",
    group: "team",
    comingSoon: true,
  },
  {
    id: "syllable-rush",
    nameKey:
      "games.syllableRush.name",
    descriptionKey:
      "games.syllableRush.description",
    players: "2–10",
    icon: <Type />,
    className: "blue",
    group: "solo",
    comingSoon: true,
  },
  {
    id: "know-your-friends",
    nameKey:
      "games.knowYourFriends.name",
    descriptionKey:
      "games.knowYourFriends.description",
    players: "3–10",
    icon: <Heart />,
    className: "pink",
    group: "solo",
    comingSoon: true,
  },
  {
    id: "know-their-ranking",
    nameKey:
      "games.knowTheirRanking.name",
    descriptionKey:
      "games.knowTheirRanking.description",
    players: "3–10",
    icon: <ListOrdered />,
    className: "green",
    group: "solo",
    comingSoon: true,
  },
  {
    id: "timeline",
    nameKey: "games.timeline.name",
    descriptionKey:
      "games.timeline.description",
    players: "2–10",
    icon: <History />,
    className: "orange",
    group: "solo",
    comingSoon: true,
  },
  {
    id: "sound-guess",
    nameKey:
      "games.soundGuess.name",
    descriptionKey:
      "games.soundGuess.description",
    players: "2–10",
    icon: <Volume2 />,
    className: "purple",
    group: "solo",
    comingSoon: true,
  },
  {
    id: "reverse-quiz",
    nameKey:
      "games.reverseQuiz.name",
    descriptionKey:
      "games.reverseQuiz.description",
    players: "2–10",
    icon: <HelpCircle />,
    className: "red",
    group: "solo",
    comingSoon: true,
  },
  {
    id: "zoomed-in",
    nameKey: "games.zoomedIn.name",
    descriptionKey:
      "games.zoomedIn.description",
    players: "2–10",
    icon: <ZoomIn />,
    className: "blue",
    group: "solo",
    comingSoon: true,
  },
  {
    id: "music-timeline",
    nameKey:
      "games.musicTimeline.name",
    descriptionKey:
      "games.musicTimeline.description",
    players: "2–10",
    icon: <Music2 />,
    className: "green",
    group: "solo",
    comingSoon: true,
  },
  {
    id: "match-up",
    nameKey: "games.matchUp.name",
    descriptionKey:
      "games.matchUp.description",
    players: "2–10",
    icon: <Link2 />,
    className: "orange",
    group: "solo",
    comingSoon: true,
  },
];

export function getGameLibraryEntry(
  gameId: string | undefined,
): GameLibraryEntry | undefined {
  return gameLibrary.find(
    (game) => game.id === gameId,
  );
}
