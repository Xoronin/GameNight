import { supabase } from "../lib/supabase";
import type {
  EmojiGuess,
  EmojiPuzzle,
  EmojiRound,
  EmojiRoundStatus,
  EmojiSessionStatus,
} from "../types/game";
import { matchesAnswer } from "../utils/answerMatch";

/*
 * Emoji Decode: everyone stares at the same handful of emoji and races to
 * type what they mean. Unlike the multiple-choice games a wrong guess
 * costs nothing but time, so players keep trying until they get it or the
 * clock runs out — which is what makes it a race rather than a quiz.
 */

/** A solve is worth this much before the clock is taken into account. */
export const BASE_POINTS = 400;

/** Every second still on the clock when you solve it. */
export const POINTS_PER_SECOND = 10;

export const MAX_SOLVE_POINTS = 900;

/** Being first is worth having, or there is nothing to race for. */
export const FIRST_SOLVE_BONUS = 200;

export type EmojiSession = {
  id: string;
  roomId: string;
  status: EmojiSessionStatus;
  createdAt: string;
  finishedAt: string | null;
};

type SessionRow = {
  id: string;
  room_id: string;
  status: EmojiSessionStatus;
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  puzzle_id: string;
  status: EmojiRoundStatus;
  created_at: string;
  ends_at: string;
};

type GuessRow = {
  id: string;
  round_id: string;
  player_id: string;
  guess: string;
  is_correct: boolean;
  points: number;
  created_at: string;
};

type PuzzleRow = {
  id: string;
  emojis: string;
  category_key: string;
  category_en: string;
  category_de: string;
  answer_en: string;
  answer_de: string;
  aliases_en: string[] | null;
  aliases_de: string[] | null;
  difficulty:
    | "easy"
    | "medium"
    | "hard";
};

function mapSession(
  row: SessionRow,
): EmojiSession {
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
): EmojiRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    puzzleId: row.puzzle_id,
    status: row.status,
    createdAt: row.created_at,
    endsAt: row.ends_at,
  };
}

function mapGuess(
  row: GuessRow,
): EmojiGuess {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    guess: row.guess,
    isCorrect: row.is_correct,
    points: row.points,
    createdAt: row.created_at,
  };
}

/*
 * Both languages' answers are accepted whichever the room is playing in:
 * a German group still shouts "Lion King", and refusing that would feel
 * like a bug rather than a rule.
 */
export function mapPuzzle(
  row: PuzzleRow,
  language: "en" | "de",
): EmojiPuzzle {
  const accepted = [
    row.answer_en,
    row.answer_de,
    ...(row.aliases_en ?? []),
    ...(row.aliases_de ?? []),
  ].filter(Boolean);

  return {
    id: row.id,
    emojis: row.emojis,
    categoryKey: row.category_key,
    category:
      language === "de"
        ? row.category_de
        : row.category_en,
    answer:
      language === "de"
        ? row.answer_de
        : row.answer_en,
    accepted,
    difficulty: row.difficulty,
  };
}

/** What a solve is worth, given the clock and who got there first. */
export function scoreSolve(
  remainingSeconds: number,
  isFirst: boolean,
): number {
  const onTheClock = Math.min(
    MAX_SOLVE_POINTS,
    BASE_POINTS +
      Math.max(
        0,
        Math.floor(
          remainingSeconds,
        ),
      ) *
        POINTS_PER_SECOND,
  );

  return (
    onTheClock +
    (isFirst
      ? FIRST_SOLVE_BONUS
      : 0)
  );
}

/** Whether a typed guess solves the puzzle. */
export function isSolved(
  guess: string,
  puzzle: EmojiPuzzle,
): boolean {
  return matchesAnswer(
    guess,
    puzzle.accepted,
  );
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

export async function createEmojiSession(
  roomId: string,
): Promise<EmojiSession> {
  /* Close any unfinished session so a rematch starts clean. */
  const { error: closeError } =
    await supabase
      .from("emoji_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("status", "playing");

  if (closeError) {
    throw new Error(
      `Could not close old Emoji session: ${closeError.message}`,
    );
  }

  const { data, error } =
    await supabase
      .from("emoji_sessions")
      .insert({
        room_id: roomId,
        status: "playing",
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Emoji session: ${error.message}`,
    );
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function getActiveEmojiSession(
  roomId: string,
): Promise<EmojiSession | null> {
  const { data, error } =
    await supabase
      .from("emoji_sessions")
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
      `Could not load Emoji session: ${error.message}`,
    );
  }

  return data
    ? mapSession(
        data as SessionRow,
      )
    : null;
}

export async function finishEmojiSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("emoji_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Emoji session: ${error.message}`,
    );
  }
}

/*
 * Keyed on the session rather than the room: a room plays several games,
 * and the round belonging to a finished session is not this game's round.
 */
export async function getLatestEmojiRound(
  sessionId: string,
): Promise<EmojiRound | null> {
  const { data, error } =
    await supabase
      .from("emoji_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Emoji round: ${error.message}`,
    );
  }

  return data
    ? mapRound(data as RoundRow)
    : null;
}

export async function getEmojiGuesses(
  roundId: string,
): Promise<EmojiGuess[]> {
  const { data, error } =
    await supabase
      .from("emoji_guesses")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Could not load Emoji guesses: ${error.message}`,
    );
  }

  return (
    (data as GuessRow[]) ?? []
  ).map(mapGuess);
}

export async function getEmojiPuzzle(
  puzzleId: string,
  language: "en" | "de",
): Promise<EmojiPuzzle | null> {
  const { data, error } =
    await supabase
      .from("emoji_puzzles")
      .select("*")
      .eq("id", puzzleId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Emoji puzzle: ${error.message}`,
    );
  }

  return data
    ? mapPuzzle(
        data as PuzzleRow,
        language,
      )
    : null;
}

export async function getEmojiUsedPuzzleIds(
  sessionId: string,
): Promise<string[]> {
  const { data, error } =
    await supabase
      .from("emoji_rounds")
      .select("puzzle_id")
      .eq("session_id", sessionId);

  if (error) {
    throw new Error(
      `Could not load used Emoji puzzles: ${error.message}`,
    );
  }

  return (
    (data as {
      puzzle_id: string;
    }[]) ?? []
  ).map((row) => row.puzzle_id);
}

export async function createEmojiRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  excludedPuzzleIds: string[],
  language: "en" | "de",
  timerSeconds: number,
  categoryKeys: string[],
): Promise<EmojiPuzzle | null> {
  /* Guards against a double tap or a duplicated realtime action. */
  const {
    data: existingRound,
    error: existingError,
  } = await supabase
    .from("emoji_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq(
      "round_number",
      roundNumber,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check Emoji round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    return getEmojiPuzzle(
      (existingRound as RoundRow)
        .puzzle_id,
      language,
    );
  }

  const { data, error } =
    await supabase
      .from("emoji_puzzles")
      .select("*")
      .eq("active", true)
      .in(
        "category_key",
        categoryKeys,
      );

  if (error) {
    throw new Error(
      `Could not load Emoji puzzles: ${error.message}`,
    );
  }

  const puzzles = (
    (data as PuzzleRow[]) ?? []
  ).filter(
    (puzzle) =>
      !excludedPuzzleIds.includes(
        puzzle.id,
      ),
  );

  if (puzzles.length === 0) {
    return null;
  }

  const chosen =
    puzzles[
      Math.floor(
        Math.random() *
          puzzles.length,
      )
    ]!;

  const endsAt = new Date(
    Date.now() +
      timerSeconds * 1000,
  ).toISOString();

  const { error: insertError } =
    await supabase
      .from("emoji_rounds")
      .insert({
        session_id: sessionId,
        room_id: roomId,
        round_number: roundNumber,
        puzzle_id: chosen.id,
        status: "answering",
        ends_at: endsAt,
      });

  if (insertError) {
    throw new Error(
      `Could not create Emoji round: ${insertError.message}`,
    );
  }

  return mapPuzzle(
    chosen,
    language,
  );
}

/**
 * Records a guess, and scores it when it solves the puzzle.
 *
 * Returns whether it was right so the caller can react without waiting
 * for the write to come back around over realtime.
 */
export async function submitEmojiGuess(
  round: EmojiRound,
  playerId: string,
  guess: string,
  puzzle: EmojiPuzzle,
): Promise<boolean> {
  if (
    round.status !== "answering"
  ) {
    return false;
  }

  const trimmed = guess.trim();

  if (trimmed.length === 0) {
    return false;
  }

  const correct = isSolved(
    trimmed,
    puzzle,
  );

  if (!correct) {
    const { error } =
      await supabase
        .from("emoji_guesses")
        .insert({
          round_id: round.id,
          player_id: playerId,
          guess: trimmed,
          is_correct: false,
          points: 0,
        });

    if (error) {
      throw new Error(
        `Could not submit guess: ${error.message}`,
      );
    }

    return false;
  }

  const remainingSeconds =
    Math.max(
      0,
      Math.ceil(
        (new Date(
          round.endsAt,
        ).getTime() -
          Date.now()) /
          1000,
      ),
    );

  /*
   * Whether anyone has solved it yet decides the bonus. Two players
   * finishing in the same instant would both read zero here, but the
   * unique index is on solving at all rather than on being first, so the
   * worst case is a shared bonus rather than a lost round.
   */
  const {
    count,
    error: countError,
  } = await supabase
    .from("emoji_guesses")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("round_id", round.id)
    .eq("is_correct", true);

  if (countError) {
    throw new Error(
      `Could not check solves: ${countError.message}`,
    );
  }

  const points = scoreSolve(
    remainingSeconds,
    (count ?? 0) === 0,
  );

  const { error } = await supabase
    .from("emoji_guesses")
    .insert({
      round_id: round.id,
      player_id: playerId,
      guess: trimmed,
      is_correct: true,
      points,
    });

  if (error) {
    /* The partial unique index rejects a second solve; that is fine. */
    if (error.code === "23505") {
      return true;
    }

    throw new Error(
      `Could not submit guess: ${error.message}`,
    );
  }

  await addScore(
    playerId,
    points,
  );

  return true;
}

async function updateRoundStatus(
  roundId: string,
  status: EmojiRoundStatus,
) {
  const { error } =
    await supabase
      .from("emoji_rounds")
      .update({ status })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not update Emoji round: ${error.message}`,
    );
  }
}

export async function revealEmojiRound(
  roundId: string,
) {
  const { error } =
    await supabase
      .from("emoji_rounds")
      .update({ status: "reveal" })
      .eq("id", roundId)
      .eq("status", "answering");

  if (error) {
    throw new Error(
      `Could not reveal Emoji round: ${error.message}`,
    );
  }
}

export async function finishEmojiGame(
  roundId: string,
  sessionId: string,
) {
  await updateRoundStatus(
    roundId,
    "finished",
  );

  await finishEmojiSession(
    sessionId,
  );
}

export async function returnEmojiRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "emoji-decode",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
