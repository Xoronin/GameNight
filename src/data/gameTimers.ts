export type TimedGameId =
  | "bluff"
  | "categories"
  | "minefield"
  | "draw-guess"
  | "higher-lower"
  | "trivia"
  | "alphabet"
  | "spectrum"
  | "atlas"
  | "emoji-decode"
  | "know-your-friends";

export type CustomCategory = {
  key: string;
  label: string;
};

export type GameSettingsEntry = {
  timerSeconds?: number;
  roundCount?: number;
  categoryKeys?: string[];
  customCategories?: CustomCategory[];
  /** Atlas: which round types are in play. */
  modeKeys?: string[];
};

export type GameSettings = Record<
  string,
  GameSettingsEntry
>;

export const GAME_TIMER_DEFAULTS: Record<
  TimedGameId,
  number
> = {
  bluff: 60,
  categories: 90,
  minefield: 20,
  "draw-guess": 90,
  "higher-lower": 20,
  trivia: 20,
  alphabet: 30,
  spectrum: 30,
  atlas: 30,
  "emoji-decode": 45,
  "know-your-friends": 25,
};

export const GAME_TIMER_OPTIONS: Record<
  TimedGameId,
  number[]
> = {
  bluff: [30, 45, 60, 90, 120],
  categories: [45, 60, 90, 120, 150],
  minefield: [10, 15, 20, 30, 45],
  "draw-guess": [45, 60, 90, 120, 150],
  "higher-lower": [10, 15, 20, 30, 45],
  trivia: [10, 15, 20, 30, 45],
  alphabet: [15, 20, 30, 45, 60],
  spectrum: [15, 20, 30, 45, 60],
  atlas: [15, 20, 30, 45, 60],
  "emoji-decode": [20, 30, 45, 60, 90],
  "know-your-friends": [
    15, 20, 25, 30, 45,
  ],
};

export function getGameTimerSeconds(
  gameSettings: GameSettings | null | undefined,
  gameId: TimedGameId,
): number {
  return (
    gameSettings?.[gameId]
      ?.timerSeconds ??
    GAME_TIMER_DEFAULTS[gameId]
  );
}

export function withGameTimerSeconds(
  gameSettings: GameSettings | null | undefined,
  gameId: string,
  timerSeconds: number,
): GameSettings {
  return {
    ...gameSettings,
    [gameId]: {
      ...gameSettings?.[gameId],
      timerSeconds,
    },
  };
}

/*
 * For Draw & Guess, "round count" means rounds
 * *per player* (each round is one player's turn
 * to draw), not a flat total — the total is that
 * value times the current player count.
 */
export const GAME_ROUND_COUNT_DEFAULTS: Record<
  TimedGameId,
  number
> = {
  bluff: 8,
  categories: 5,
  minefield: 6,
  "draw-guess": 2,
  "higher-lower": 8,
  trivia: 8,
  alphabet: 3,
  spectrum: 5,
  atlas: 8,
  "emoji-decode": 8,
  "know-your-friends": 8,
};

export const GAME_ROUND_COUNT_OPTIONS: Record<
  TimedGameId,
  number[]
> = {
  bluff: [4, 6, 8, 10, 12],
  categories: [3, 5, 7, 10],
  minefield: [3, 4, 6, 8, 10],
  "draw-guess": [1, 2, 3, 4],
  "higher-lower": [4, 6, 8, 10, 12],
  trivia: [4, 6, 8, 10, 12],
  alphabet: [1, 2, 3, 5],
  spectrum: [3, 5, 8, 13],
  atlas: [7, 8, 10, 12],
  "emoji-decode": [5, 8, 10, 12],
  "know-your-friends": [
    4, 6, 8, 10, 12,
  ],
};

export function getGameRoundCount(
  gameSettings: GameSettings | null | undefined,
  gameId: TimedGameId,
): number {
  return (
    gameSettings?.[gameId]
      ?.roundCount ??
    GAME_ROUND_COUNT_DEFAULTS[gameId]
  );
}

export function withGameRoundCount(
  gameSettings: GameSettings | null | undefined,
  gameId: string,
  roundCount: number,
): GameSettings {
  return {
    ...gameSettings,
    [gameId]: {
      ...gameSettings?.[gameId],
      roundCount,
    },
  };
}

export const CATEGORIES_DEFAULT_KEYS = [
  "city",
  "country",
  "river",
  "animal",
  "name",
  "profession",
];

export function getCategoriesSelectedKeys(
  gameSettings: GameSettings | null | undefined,
): string[] {
  const keys =
    gameSettings?.categories
      ?.categoryKeys;

  /*
   * Never let the selection collapse to
   * zero categories — fall back to the
   * full default set instead of leaving
   * the game unplayable.
   */
  return keys && keys.length > 0
    ? keys
    : CATEGORIES_DEFAULT_KEYS;
}

export function withCategoriesSelectedKeys(
  gameSettings: GameSettings | null | undefined,
  categoryKeys: string[],
): GameSettings {
  return {
    ...gameSettings,
    categories: {
      ...gameSettings?.categories,
      categoryKeys,
    },
  };
}

export function getCategoriesCustom(
  gameSettings: GameSettings | null | undefined,
): CustomCategory[] {
  return (
    gameSettings?.categories
      ?.customCategories ?? []
  );
}

export function withCategoriesCustom(
  gameSettings: GameSettings | null | undefined,
  customCategories: CustomCategory[],
): GameSettings {
  return {
    ...gameSettings,
    categories: {
      ...gameSettings?.categories,
      customCategories,
    },
  };
}


/*
 * Atlas round types the host can turn on or off.
 *
 * Order is the order they appear in the lobby, grouped by what they ask
 * about: flags, then capitals, then maps.
 */
export const ATLAS_MODE_KEYS = [
  "flag_choice",
  "flag_paint",
  "country_from_flag",
  "capital_choice",
  "capital_match",
  "map_choice",
  "map_place",
] as const;

export type AtlasModeKey =
  (typeof ATLAS_MODE_KEYS)[number];

/** Translation key for each mode's label in the lobby. */
export const ATLAS_MODE_LABEL_KEYS: Record<
  AtlasModeKey,
  string
> = {
  flag_choice: "atlas.modeFlagChoice",
  flag_paint: "atlas.modeFlagPaint",
  country_from_flag:
    "atlas.modeCountryFromFlag",
  capital_choice:
    "atlas.modeCapitalChoice",
  capital_match:
    "atlas.modeCapitalMatch",
  map_choice: "atlas.modeMapChoice",
  map_place: "atlas.modeMapPlace",
};

export function getAtlasModes(
  gameSettings:
    | GameSettings
    | null
    | undefined,
): string[] {
  const modes =
    gameSettings?.atlas?.modeKeys;

  /*
   * Never let the selection collapse to nothing — a game with no modes
   * has no rounds to deal. An empty or missing setting means all of
   * them, which is also the sensible default.
   */
  return modes && modes.length > 0
    ? modes
    : [...ATLAS_MODE_KEYS];
}

/*
 * Emoji Decode categories. These are keys rather than the display names
 * the puzzles carry, so the host's choice does not change meaning when
 * the room switches language.
 */
export const EMOJI_CATEGORY_KEYS = [
  "movie",
  "game",
  "show",
  "song",
  "book",
  "food",
  "place",
  "saying",
] as const;

export type EmojiCategoryKey =
  (typeof EMOJI_CATEGORY_KEYS)[number];

/** Translation key for each category's label in the lobby. */
export const EMOJI_CATEGORY_LABEL_KEYS: Record<
  EmojiCategoryKey,
  string
> = {
  movie: "emojiDecode.categoryMovie",
  game: "emojiDecode.categoryGame",
  show: "emojiDecode.categoryShow",
  song: "emojiDecode.categorySong",
  book: "emojiDecode.categoryBook",
  food: "emojiDecode.categoryFood",
  place: "emojiDecode.categoryPlace",
  saying:
    "emojiDecode.categorySaying",
};

export function getEmojiCategories(
  gameSettings:
    | GameSettings
    | null
    | undefined,
): string[] {
  const categories =
    gameSettings?.["emoji-decode"]
      ?.categoryKeys;

  /*
   * An empty selection would leave nothing to deal, so it means all of
   * them — which is also the sensible default for a fresh room.
   */
  return categories &&
    categories.length > 0
    ? categories
    : [...EMOJI_CATEGORY_KEYS];
}

export function withEmojiCategories(
  gameSettings:
    | GameSettings
    | null
    | undefined,
  categoryKeys: string[],
): GameSettings {
  return {
    ...gameSettings,
    "emoji-decode": {
      ...gameSettings?.[
        "emoji-decode"
      ],
      categoryKeys,
    },
  };
}

export function withAtlasModes(
  gameSettings:
    | GameSettings
    | null
    | undefined,
  modeKeys: string[],
): GameSettings {
  return {
    ...gameSettings,
    atlas: {
      ...gameSettings?.atlas,
      modeKeys,
    },
  };
}
