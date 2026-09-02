export type TimedGameId =
  | "bluff"
  | "categories"
  | "minefield"
  | "draw-guess"
  | "higher-lower"
  | "trivia";

export type GameSettings = Record<
  string,
  { timerSeconds: number }
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
  gameId: TimedGameId,
  timerSeconds: number,
): GameSettings {
  return {
    ...gameSettings,
    [gameId]: { timerSeconds },
  };
}
