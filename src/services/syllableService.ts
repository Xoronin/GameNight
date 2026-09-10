import { supabase } from "../lib/supabase";
import type {
  SyllableOutcome,
  SyllablePlayer,
  SyllablePrompt,
  SyllableRound,
  SyllableRoundStatus,
  SyllableSessionStatus,
  SyllableTurn,
} from "../types/game";

/*
 * Syllable Rush: a three-letter fragment appears and the player whose turn
 * it is has to type any word containing it. Get one and the turn passes on
 * with a fresh fragment; run out of time and you lose a life. Last player
 * standing wins the round.
 *
 * A word that is not in the dictionary is rejected where you typed it and
 * costs nothing but the seconds it took — only the clock takes a life. That
 * matters because the dictionary is 20000 common words rather than all of
 * them, so it will sometimes turn down a word that is perfectly real, and
 * that should never be what knocks a player out.
 */

export const STARTING_LIVES = 3;

/** A turn that ends in a word. */
export const SOLVE_POINTS = 100;

/*
 * Paid per letter past LONG_WORD_FROM, so reaching for a longer word than
 * the fragment strictly needs is worth the extra seconds.
 */
export const LETTER_BONUS = 20;
export const LONG_WORD_FROM = 5;
export const MAX_WORD_POINTS = 300;

/** Taking the round. */
export const SURVIVOR_POINTS = 800;

/*
 * The clock loses a second every SHRINK_EVERY turns, so a bout that opens
 * comfortably closes frantic. It never goes below FLOOR_SECONDS, which is
 * about as short as a turn can be and still be playable on a phone.
 */
export const SHRINK_EVERY = 5;
export const FLOOR_SECONDS = 5;

export type SyllableSession = {
  id: string;
  roomId: string;
  status: SyllableSessionStatus;
  createdAt: string;
  finishedAt: string | null;
};

/** Why a submission was turned down, or that it was accepted. */
export type SubmitResult =
  | "solved"
  | "missing_fragment"
  | "already_used"
  | "unknown_word"
  | "not_your_turn";

type SessionRow = {
  id: string;
  room_id: string;
  status: SyllableSessionStatus;
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  status: SyllableRoundStatus;
  prompt_id: string | null;
  current_player_id: string | null;
  turn_number: number;
  turn_seconds: number;
  turn_ends_at: string | null;
  created_at: string;
};

type PlayerRow = {
  id: string;
  round_id: string;
  player_id: string;
  lives: number;
  is_out: boolean;
  seat: number;
};

type TurnRow = {
  id: string;
  round_id: string;
  player_id: string;
  turn_number: number;
  fragment: string;
  word: string | null;
  outcome: SyllableOutcome;
  created_at: string;
};

type PromptRow = {
  id: string;
  language: "en" | "de";
  fragment: string;
  word_count: number;
  examples: string[];
};

function mapSession(
  row: SessionRow,
): SyllableSession {
  return {
    id: row.id,
    roomId: row.room_id,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

function mapRound(
  row: RoundRow,
): SyllableRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    status: row.status,
    promptId: row.prompt_id,
    currentPlayerId:
      row.current_player_id,
    turnNumber: row.turn_number,
    turnSeconds: row.turn_seconds,
    turnEndsAt: row.turn_ends_at,
    createdAt: row.created_at,
  };
}

function mapPlayer(
  row: PlayerRow,
): SyllablePlayer {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    lives: row.lives,
    isOut: row.is_out,
    seat: row.seat,
  };
}

function mapTurn(
  row: TurnRow,
): SyllableTurn {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    turnNumber: row.turn_number,
    fragment: row.fragment,
    word: row.word,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

function mapPrompt(
  row: PromptRow,
): SyllablePrompt {
  return {
    id: row.id,
    language: row.language,
    fragment: row.fragment,
    wordCount: row.word_count,
    examples: row.examples,
  };
}

/*
 * Submissions are compared in this form, which is also the form the
 * dictionary is stored in. German is kept as typed apart from case, since
 * its umlauts are letters in their own right rather than decoration.
 */
export function normalizeWord(
  word: string,
): string {
  return word
    .toLowerCase()
    .replace(
      /[^a-zäöüß]/g,
      "",
    )
    .trim();
}

/** What one accepted word is worth. */
export function wordPoints(
  word: string,
): number {
  const extra = Math.max(
    0,
    word.length - LONG_WORD_FROM,
  );

  return Math.min(
    MAX_WORD_POINTS,
    SOLVE_POINTS +
      extra * LETTER_BONUS,
  );
}

/** Seconds the player on turn `turnNumber` gets. */
export function turnSecondsFor(
  turnNumber: number,
  startSeconds: number,
): number {
  const lost = Math.floor(
    Math.max(0, turnNumber - 1) /
      SHRINK_EVERY,
  );

  return Math.max(
    FLOOR_SECONDS,
    startSeconds - lost,
  );
}

/*
 * The next player still in the round, walking the seat order from the
 * current one. Returns the current player when they are the only one left,
 * and null when nobody is.
 */
export function nextInTurn(
  players: SyllablePlayer[],
  currentPlayerId: string | null,
): SyllablePlayer | null {
  const seated = [
    ...players,
  ].sort(
    (a, b) => a.seat - b.seat,
  );

  const alive = seated.filter(
    (player) => !player.isOut,
  );

  if (alive.length === 0) {
    return null;
  }

  const current = seated.findIndex(
    (player) =>
      player.playerId ===
      currentPlayerId,
  );

  if (current === -1) {
    return alive[0]!;
  }

  for (
    let step = 1;
    step <= seated.length;
    step += 1
  ) {
    const candidate =
      seated[
        (current + step) %
          seated.length
      ]!;

    if (!candidate.isOut) {
      return candidate;
    }
  }

  return null;
}

/** The lone survivor, or null while the round is still contested. */
export function roundWinner(
  players: SyllablePlayer[],
): SyllablePlayer | null {
  const alive = players.filter(
    (player) => !player.isOut,
  );

  return alive.length === 1
    ? alive[0]!
    : null;
}

/*
 * Everything that can be decided without asking the database. Whether the
 * word is a real word is the one thing this cannot answer.
 */
export function checkWord(
  word: string,
  fragment: string,
  usedWords: string[],
): Exclude<
  SubmitResult,
  "not_your_turn" | "unknown_word"
> | null {
  if (!word.includes(fragment)) {
    return "missing_fragment";
  }

  if (usedWords.includes(word)) {
    return "already_used";
  }

  return null;
}

/** A fragment nobody has had yet this round, or any of them if all are spent. */
export function pickPrompt(
  prompts: SyllablePrompt[],
  usedFragments: string[],
): SyllablePrompt | null {
  if (prompts.length === 0) {
    return null;
  }

  const fresh = prompts.filter(
    (prompt) =>
      !usedFragments.includes(
        prompt.fragment,
      ),
  );

  const pool =
    fresh.length > 0
      ? fresh
      : prompts;

  return pool[
    Math.floor(
      Math.random() * pool.length,
    )
  ]!;
}

async function addScore(
  playerId: string,
  points: number,
) {
  const { data, error } =
    await supabase
      .from("players")
      .select("score")
      .eq("id", playerId)
      .single();

  if (error) {
    throw new Error(
      `Could not read player score: ${error.message}`,
    );
  }

  const { error: updateError } =
    await supabase
      .from("players")
      .update({
        score:
          ((
            data as {
              score: number;
            }
          ).score ?? 0) + points,
      })
      .eq("id", playerId);

  if (updateError) {
    throw new Error(
      `Could not update score: ${updateError.message}`,
    );
  }
}

export async function createSyllableSession(
  roomId: string,
): Promise<SyllableSession> {
  const { error: closeError } =
    await supabase
      .from("syllable_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("status", "playing");

  if (closeError) {
    throw new Error(
      `Could not close old Syllable session: ${closeError.message}`,
    );
  }

  const { data, error } =
    await supabase
      .from("syllable_sessions")
      .insert({
        room_id: roomId,
        status: "playing",
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Syllable session: ${error.message}`,
    );
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function getActiveSyllableSession(
  roomId: string,
): Promise<SyllableSession | null> {
  const { data, error } =
    await supabase
      .from("syllable_sessions")
      .select("*")
      .eq("room_id", roomId)
      .eq("status", "playing")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Syllable session: ${error.message}`,
    );
  }

  return data
    ? mapSession(
        data as SessionRow,
      )
    : null;
}

async function finishSyllableSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("syllable_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Syllable session: ${error.message}`,
    );
  }
}

export async function getLatestSyllableRound(
  sessionId: string,
): Promise<SyllableRound | null> {
  const { data, error } =
    await supabase
      .from("syllable_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Syllable round: ${error.message}`,
    );
  }

  return data
    ? mapRound(data as RoundRow)
    : null;
}

export async function getSyllableStandings(
  roundId: string,
): Promise<SyllablePlayer[]> {
  const { data, error } =
    await supabase
      .from("syllable_players")
      .select("*")
      .eq("round_id", roundId)
      .order("seat", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Could not load Syllable standings: ${error.message}`,
    );
  }

  return (
    (data as PlayerRow[]) ?? []
  ).map(mapPlayer);
}

export async function getSyllableTurns(
  roundId: string,
): Promise<SyllableTurn[]> {
  const { data, error } =
    await supabase
      .from("syllable_turns")
      .select("*")
      .eq("round_id", roundId)
      .order("turn_number", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Could not load Syllable turns: ${error.message}`,
    );
  }

  return (
    (data as TurnRow[]) ?? []
  ).map(mapTurn);
}

/*
 * Every fragment for the room's language. Static content, so the hook
 * loads it once and hands it back for each turn rather than asking again.
 */
export async function getSyllablePrompts(
  language: "en" | "de",
): Promise<SyllablePrompt[]> {
  const { data, error } =
    await supabase
      .from("syllable_prompts")
      .select("*")
      .eq("language", language)
      .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load Syllable prompts: ${error.message}`,
    );
  }

  return (
    (data as PromptRow[]) ?? []
  ).map(mapPrompt);
}

export async function getSyllablePrompt(
  promptId: string,
): Promise<SyllablePrompt | null> {
  const { data, error } =
    await supabase
      .from("syllable_prompts")
      .select("*")
      .eq("id", promptId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Syllable prompt: ${error.message}`,
    );
  }

  return data
    ? mapPrompt(data as PromptRow)
    : null;
}

/** Whether the dictionary has this word in this language. */
export async function isRealWord(
  word: string,
  language: "en" | "de",
): Promise<boolean> {
  const { data, error } =
    await supabase
      .from("syllable_words")
      .select("id")
      .eq("language", language)
      .eq("word", word)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not check the word: ${error.message}`,
    );
  }

  return !!data;
}

export async function createSyllableRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  playerIds: string[],
  prompts: SyllablePrompt[],
  startSeconds: number,
): Promise<SyllableRound | null> {
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("syllable_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq("round_number", roundNumber)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check Syllable round: ${existingError.message}`,
    );
  }

  if (existing) {
    return mapRound(
      existing as RoundRow,
    );
  }

  const prompt = pickPrompt(
    prompts,
    [],
  );

  if (
    !prompt ||
    playerIds.length === 0
  ) {
    return null;
  }

  const turnSeconds =
    turnSecondsFor(
      1,
      startSeconds,
    );

  const { data, error } =
    await supabase
      .from("syllable_rounds")
      .insert({
        session_id: sessionId,
        room_id: roomId,
        round_number: roundNumber,
        status: "playing",
        prompt_id: prompt.id,
        current_player_id:
          playerIds[0],
        turn_number: 1,
        turn_seconds: turnSeconds,
        turn_ends_at: new Date(
          Date.now() +
            turnSeconds * 1000,
        ).toISOString(),
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Syllable round: ${error.message}`,
    );
  }

  const round = mapRound(
    data as RoundRow,
  );

  /*
   * Seats are dealt from the room's player order and never move, so the
   * rotation stays predictable as players are knocked out.
   */
  const { error: seatError } =
    await supabase
      .from("syllable_players")
      .insert(
        playerIds.map(
          (playerId, seat) => ({
            round_id: round.id,
            player_id: playerId,
            lives: STARTING_LIVES,
            seat,
          }),
        ),
      );

  if (seatError) {
    throw new Error(
      `Could not seat the players: ${seatError.message}`,
    );
  }

  return round;
}

/*
 * Moves the round on to the next player with a fresh fragment, or ends it
 * when only one player is left standing.
 *
 * Gated on turn_number so that two callers racing — the player who just
 * answered and the host's clock deciding they did not — cannot both
 * advance it. The second one updates nothing and stops here.
 */
async function advanceTurn(
  round: SyllableRound,
  standings: SyllablePlayer[],
  prompts: SyllablePrompt[],
  usedFragments: string[],
  startSeconds: number,
): Promise<boolean> {
  const winner =
    roundWinner(standings);

  if (winner) {
    const { data: claimed } =
      await supabase
        .from("syllable_rounds")
        .update({
          status: "reveal",
          current_player_id: null,
          turn_ends_at: null,
        })
        .eq("id", round.id)
        .eq(
          "turn_number",
          round.turnNumber,
        )
        .eq("status", "playing")
        .select("id");

    if (
      (claimed ?? []).length > 0
    ) {
      await addScore(
        winner.playerId,
        SURVIVOR_POINTS,
      );
    }

    return true;
  }

  const next = nextInTurn(
    standings,
    round.currentPlayerId,
  );

  const prompt = pickPrompt(
    prompts,
    usedFragments,
  );

  if (!next || !prompt) {
    return false;
  }

  const turnNumber =
    round.turnNumber + 1;

  const turnSeconds =
    turnSecondsFor(
      turnNumber,
      startSeconds,
    );

  const { data: claimed, error } =
    await supabase
      .from("syllable_rounds")
      .update({
        prompt_id: prompt.id,
        current_player_id:
          next.playerId,
        turn_number: turnNumber,
        turn_seconds: turnSeconds,
        turn_ends_at: new Date(
          Date.now() +
            turnSeconds * 1000,
        ).toISOString(),
      })
      .eq("id", round.id)
      .eq(
        "turn_number",
        round.turnNumber,
      )
      .eq("status", "playing")
      .select("id");

  if (error) {
    throw new Error(
      `Could not pass the turn: ${error.message}`,
    );
  }

  return (claimed ?? []).length > 0;
}

/*
 * A word from the player whose turn it is. Anything the dictionary or the
 * fragment turns down is reported back and leaves the round untouched, so
 * a bad guess costs seconds rather than a life.
 */
export async function submitSyllableWord(
  round: SyllableRound,
  playerId: string,
  raw: string,
  fragment: string,
  language: "en" | "de",
  prompts: SyllablePrompt[],
  standings: SyllablePlayer[],
  startSeconds: number,
): Promise<SubmitResult> {
  if (
    round.status !== "playing" ||
    round.currentPlayerId !==
      playerId
  ) {
    return "not_your_turn";
  }

  const word =
    normalizeWord(raw);

  const turns =
    await getSyllableTurns(
      round.id,
    );

  const usedWords = turns
    .map((turn) => turn.word)
    .filter(
      (value): value is string =>
        !!value,
    );

  const problem = checkWord(
    word,
    fragment,
    usedWords,
  );

  if (problem) {
    return problem;
  }

  if (
    !(await isRealWord(
      word,
      language,
    ))
  ) {
    return "unknown_word";
  }

  const { error } = await supabase
    .from("syllable_turns")
    .insert({
      round_id: round.id,
      player_id: playerId,
      turn_number:
        round.turnNumber,
      fragment,
      word,
      outcome: "solved",
    });

  if (error) {
    /* The clock already recorded this turn; it is theirs, not ours. */
    if (error.code === "23505") {
      return "not_your_turn";
    }

    throw new Error(
      `Could not record the turn: ${error.message}`,
    );
  }

  await addScore(
    playerId,
    wordPoints(word),
  );

  await advanceTurn(
    round,
    standings,
    prompts,
    turns.map(
      (turn) => turn.fragment,
    ),
    startSeconds,
  );

  return "solved";
}

/*
 * The clock ran out on the current player: they lose a life, and are out
 * when that was the last one. Only the host calls this, and the unique
 * index on (round_id, turn_number) settles it if anyone calls it twice.
 */
export async function timeOutSyllableTurn(
  round: SyllableRound,
  fragment: string,
  prompts: SyllablePrompt[],
  standings: SyllablePlayer[],
  startSeconds: number,
) {
  if (
    round.status !== "playing" ||
    !round.currentPlayerId
  ) {
    return;
  }

  const playerId =
    round.currentPlayerId;

  const { error } = await supabase
    .from("syllable_turns")
    .insert({
      round_id: round.id,
      player_id: playerId,
      turn_number:
        round.turnNumber,
      fragment,
      word: null,
      outcome: "timeout",
    });

  if (error) {
    /* Already recorded, so the life has already been taken. */
    if (error.code === "23505") {
      return;
    }

    throw new Error(
      `Could not record the turn: ${error.message}`,
    );
  }

  const standing = standings.find(
    (entry) =>
      entry.playerId === playerId,
  );

  const lives = Math.max(
    0,
    (standing?.lives ??
      STARTING_LIVES) - 1,
  );

  const { error: lifeError } =
    await supabase
      .from("syllable_players")
      .update({
        lives,
        is_out: lives === 0,
      })
      .eq("round_id", round.id)
      .eq("player_id", playerId);

  if (lifeError) {
    throw new Error(
      `Could not take a life: ${lifeError.message}`,
    );
  }

  const updated = standings.map(
    (entry) =>
      entry.playerId === playerId
        ? {
            ...entry,
            lives,
            isOut: lives === 0,
          }
        : entry,
  );

  const turns =
    await getSyllableTurns(
      round.id,
    );

  await advanceTurn(
    round,
    updated,
    prompts,
    turns.map(
      (turn) => turn.fragment,
    ),
    startSeconds,
  );
}

export async function finishSyllableGame(
  roundId: string,
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("syllable_rounds")
      .update({ status: "finished" })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not finish Syllable round: ${error.message}`,
    );
  }

  await finishSyllableSession(
    sessionId,
  );
}

export async function returnSyllableRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "syllable-rush",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
