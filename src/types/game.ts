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
  points: number;
};

export type CategoriesVote = {
  id: string;
  roundId: string;
  answerId: string;
  playerId: string;
  createdAt: string;
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
  outPlayerIds: string[];
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

export type AlphabetRoundStatus =
  | "playing"
  | "reveal"
  | "finished";

export type AlphabetRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  topic: string;
  topicId: string | null;
  status: AlphabetRoundStatus;
  currentPlayerId: string | null;
  turnEndsAt: string | null;
  outPlayerIds: string[];
  playerLives: Record<string, number>;
  createdAt: string;
};

export type AlphabetTopic = {
  id: string;
  topic: string;
};

export type AlphabetLetterStatus =
  | "available"
  | "pending"
  | "valid"
  | "invalid";

export type AlphabetLetter = {
  id: string;
  roundId: string;
  letter: string;
  status: AlphabetLetterStatus;
  claimedBy: string | null;
  word: string | null;
  createdAt: string;
};

export type AlphabetVote = {
  id: string;
  roundId: string;
  letterId: string;
  playerId: string;
  createdAt: string;
};

export type SpectrumCategoryType =
  | "timeline"
  | "ranking";

export type SpectrumSortDirection =
  | "asc"
  | "desc";

export type SpectrumCategory = {
  id: string;
  name: string;
  categoryType: SpectrumCategoryType;
  unit: string;
  sortDirection: SpectrumSortDirection;
};

export type SpectrumItem = {
  id: string;
  categoryId: string;
  name: string;
  value: number;
  valueLabel: string;
};

export type SpectrumRoundStatus =
  | "playing"
  | "reveal"
  | "finished";

export type SpectrumRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  categoryId: string;
  status: SpectrumRoundStatus;
  currentPlayerId: string | null;
  currentItemId: string | null;
  turnEndsAt: string | null;
  usedItemIds: string[];
  attemptedPlayerIds: string[];
  outPlayerIds: string[];
  playerLives: Record<string, number>;
  createdAt: string;
};

export type SpectrumPlacementOutcome =
  | "seed"
  | "correct"
  | "failed";

export type SpectrumPlacement = {
  id: string;
  roundId: string;
  itemId: string;
  placedBy: string | null;
  outcome: SpectrumPlacementOutcome;
  createdAt: string;
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
  color: string;

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

export type FriendsRoundStatus =
  | "answering"
  | "reveal"
  | "finished";

export type FriendsSessionStatus =
  | "playing"
  | "finished";

export type FriendsQuestion = {
  id: string;
  /** Carries a {name} placeholder for the subject. */
  prompt: string;
  options: string[];
};

export type FriendsRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  questionId: string;
  /** The player this round is about. */
  subjectPlayerId: string;
  status: FriendsRoundStatus;
  createdAt: string;
  endsAt: string;
};

export type FriendsAnswer = {
  id: string;
  roundId: string;
  playerId: string;
  selectedIndex: number;
  /** The subject's own answer rather than a prediction of it. */
  isSubject: boolean;
  isCorrect: boolean;
  points: number;
  createdAt: string;
};

export type EmojiRoundStatus =
  | "answering"
  | "reveal"
  | "finished";

export type EmojiSessionStatus =
  | "playing"
  | "finished";

export type EmojiPuzzle = {
  id: string;
  emojis: string;
  /** Stable key the host's category selection filters on. */
  categoryKey: string;
  /** The category's display name, in the room's language. */
  category: string;
  /** The answer in the room's language. */
  answer: string;
  /*
   * Every spelling that counts as right — both languages' titles and any
   * short forms. The grader takes the whole list, because a German room
   * still shouts the English name.
   */
  accepted: string[];
  difficulty:
    | "easy"
    | "medium"
    | "hard";
};

export type EmojiRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  puzzleId: string;
  status: EmojiRoundStatus;
  createdAt: string;
  endsAt: string;
};

export type EmojiGuess = {
  id: string;
  roundId: string;
  playerId: string;
  guess: string;
  isCorrect: boolean;
  points: number;
  createdAt: string;
};

import type { MapRegionId } from "../data/atlasMapPaths";

/*
 * Adding a value here also needs a migration widening the
 * atlas_rounds_round_type_check constraint — the database pins this
 * list too, and a mode missing from it fails at round creation with
 * "violates check constraint". See
 * supabase/migrations/20260909000000_atlas_map_round_types.sql.
 */
export type AtlasRoundType =
  | "flag_paint"
  | "flag_choice"
  | "country_from_flag"
  | "capital_choice"
  | "capital_match"
  | "map_choice"
  | "map_place";

export type AtlasRoundStatus =
  | "playing"
  | "reveal"
  | "finished";

export type AtlasSessionStatus =
  | "playing"
  | "finished";

/*
 * What the host generated for a round. Country ids reference
 * src/data/atlasCountries.ts; storing the ids (rather than the rendered
 * task) keeps every client showing the same options in the same order.
 */
export type AtlasRoundPayload =
  | {
      type: "flag_paint";
      countryId: string;
    }
  | {
      type: "flag_choice";
      countryId: string;
      /** Country ids whose flags are offered, already shuffled. */
      optionIds: string[];
    }
  | {
      type: "country_from_flag";
      countryId: string;
      optionIds: string[];
    }
  | {
      type: "capital_choice";
      countryId: string;
      /** Country ids whose capitals are offered, already shuffled. */
      optionIds: string[];
    }
  | {
      /*
       * A shared, turn-based board rather than a private puzzle: every
       * player sees the same ten countries and takes turns placing one
       * capital each.
       */
      type: "capital_match";
      /** Countries shown as drop targets, in display order. */
      countryIds: string[];
      /** The same countries, reshuffled, as the draggable capitals. */
      capitalOrder: string[];
    }
  | {
      /** One country lit up on a region map; name it, or its capital. */
      type: "map_choice";
      region: MapRegionId;
      countryId: string;
      optionIds: string[];
      /** Whether the options are country names or capital cities. */
      asks: "country" | "capital";
    }
  | {
      /*
       * The turn-based board again, but the slots are shapes on a map:
       * each turn a player drags one country name onto its outline.
       */
      type: "map_place";
      region: MapRegionId;
      /** Countries outlined as targets, and the pool to place. */
      countryIds: string[];
      placeOrder: string[];
    };

export type AtlasResponse =
  | {
      type: "flag_paint";
      /** Region id → colour the player painted it. */
      regions: Record<
        string,
        string
      >;
    }
  | {
      type: "choice";
      /** The country id the player picked. */
      choiceId: string | null;
    };

export type AtlasRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  roundType: AtlasRoundType;
  payload: AtlasRoundPayload;
  status: AtlasRoundStatus;
  createdAt: string;
  endsAt: string;

  /*
   * Turn state, used only by capital_match rounds. The other round
   * types are answered by everyone at once and leave these null/empty.
   */
  currentPlayerId: string | null;
  turnEndsAt: string | null;
  outPlayerIds: string[];
  playerLives: Record<
    string,
    number
  >;
};

/** One attempt at placing a capital on the shared match board. */
export type AtlasPlacement = {
  id: string;
  roundId: string;
  countryId: string;
  capitalCountryId: string;
  placedBy: string;
  isCorrect: boolean;
  createdAt: string;
};

export type AtlasAnswer = {
  id: string;
  roundId: string;
  playerId: string;
  response: AtlasResponse;
  correctCount: number;
  totalCount: number;
  points: number;
  createdAt: string;
};

export type SyllableRoundStatus =
  | "playing"
  | "reveal"
  | "finished";

export type SyllableSessionStatus =
  | "playing"
  | "finished";

/** How a turn ended: a word was accepted, or the clock ran out. */
export type SyllableOutcome =
  | "solved"
  | "timeout";

/** The letters a word has to contain, plus what it could have been. */
export type SyllablePrompt = {
  id: string;
  language: "en" | "de";
  fragment: string;
  wordCount: number;
  examples: string[];
};

export type SyllableRound = {
  id: string;
  roomId: string;
  sessionId: string;
  roundNumber: number;
  status: SyllableRoundStatus;
  promptId: string | null;
  currentPlayerId: string | null;
  turnNumber: number;
  turnSeconds: number;
  turnEndsAt: string | null;
  createdAt: string;
};

/** One player's standing in a round: lives left, and their seat. */
export type SyllablePlayer = {
  id: string;
  roundId: string;
  playerId: string;
  lives: number;
  isOut: boolean;
  seat: number;
};

export type SyllableTurn = {
  id: string;
  roundId: string;
  playerId: string;
  turnNumber: number;
  fragment: string;
  word: string | null;
  outcome: SyllableOutcome;
  createdAt: string;
};
