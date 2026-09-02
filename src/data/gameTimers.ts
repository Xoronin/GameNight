export type TimedGameId =
  | "bluff"
  | "categories"
  | "minefield"
  | "draw-guess"
  | "higher-lower"
  | "trivia";

export type GameSettingsEntry = {
  timerSeconds?: number;
  roundCount?: number;
  categoryKeys?: string[];
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

export const CATEGORIES_ROUND_COUNT_DEFAULT = 5;

export const CATEGORIES_ROUND_COUNT_OPTIONS = [
  3, 5, 7, 10,
];

export function getCategoriesRoundCount(
  gameSettings: GameSettings | null | undefined,
): number {
  return (
    gameSettings?.categories
      ?.roundCount ??
    CATEGORIES_ROUND_COUNT_DEFAULT
  );
}

export function withCategoriesRoundCount(
  gameSettings: GameSettings | null | undefined,
  roundCount: number,
): GameSettings {
  return {
    ...gameSettings,
    categories: {
      ...gameSettings?.categories,
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
