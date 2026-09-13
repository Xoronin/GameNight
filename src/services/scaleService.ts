import { supabase } from "../lib/supabase";
import type {
  ScaleGuess,
  ScaleObject,
  ScaleRoundStatus,
  ScaleRound,
  ScaleSessionStatus,
} from "../types/game";

/*
 * Scale: how tall is that, next to this?
 *
 * Everything here turns on one decision. A guess is scored on the ratio it
 * got wrong, not the height it got wrong: |ln(guess / truth)|. Twice too
 * big and twice too small are the same mistake, and a player who is told
 * otherwise is right to be annoyed. It also makes the game work across a
 * mug and an oak tree in the same session, which subtracting metres does
 * not.
 */

export const MAX_POINTS = 1000;

/*
 * How fast points fall away from a perfect guess. At this rate being 25%
 * out still pays about 700, a factor of two pays about 330, and a factor
 * of four pays about 110 — wrong, but not nothing.
 */
export const FALLOFF = 1.6;

/** Below this the guess is a shrug rather than an estimate. */
export const MIN_POINTS = 10;

/*
 * Stored in place of an infinite error, so the column stays a number the
 * reveal can sort on. Nothing real ever comes near it.
 */
export const LOST_CAUSE = 99;

/** Extra for the closest guess in the room, when more than one played. */
export const CLOSEST_BONUS = 250;

/*
 * Both objects have to share a screen, so a pair is only dealt when the
 * heights are within this factor of each other. Wider than this and the
 * smaller one is a smudge a few pixels tall.
 */
export const MAX_PAIR_RATIO = 12;

/** And closer than this is not a question worth asking. */
export const MIN_PAIR_RATIO = 1.15;

export type ScaleSession = {
  id: string;
  roomId: string;
  status: ScaleSessionStatus;
  createdAt: string;
  finishedAt: string | null;
};

type SessionRow = {
  id: string;
  room_id: string;
  status: ScaleSessionStatus;
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  status: ScaleRoundStatus;
  reference_id: string;
  mystery_id: string;
  created_at: string;
  ends_at: string | null;
};

type ObjectRow = {
  id: string;
  shape_key: string;
  name_en: string;
  name_de: string;
  height_m: number;
};

type GuessRow = {
  id: string;
  round_id: string;
  player_id: string;
  ratio: number;
  log_error: number;
  points: number;
  created_at: string;
};

function mapSession(
  row: SessionRow,
): ScaleSession {
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
): ScaleRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    status: row.status,
    referenceId: row.reference_id,
    mysteryId: row.mystery_id,
    createdAt: row.created_at,
    endsAt: row.ends_at,
  };
}

function mapObject(
  row: ObjectRow,
): ScaleObject {
  return {
    id: row.id,
    shapeKey: row.shape_key,
    nameEn: row.name_en,
    nameDe: row.name_de,
    heightM: Number(row.height_m),
  };
}

function mapGuess(
  row: GuessRow,
): ScaleGuess {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    ratio: Number(row.ratio),
    logError: Number(row.log_error),
    points: row.points,
    createdAt: row.created_at,
  };
}

export function nameOf(
  object: ScaleObject,
  language: "en" | "de",
): string {
  return language === "de"
    ? object.nameDe
    : object.nameEn;
}

/** How many times the reference's height the mystery object really is. */
export function trueRatio(
  reference: ScaleObject,
  mystery: ScaleObject,
): number {
  return (
    mystery.heightM /
    reference.heightM
  );
}

/*
 * The whole scoring model in one line. Symmetric in the ratio, so half and
 * double are the same distance from right.
 */
export function logError(
  guessRatio: number,
  actualRatio: number,
): number {
  if (
    guessRatio <= 0 ||
    actualRatio <= 0
  ) {
    return Infinity;
  }

  return Math.abs(
    Math.log(
      guessRatio / actualRatio,
    ),
  );
}

export function pointsFor(
  error: number,
): number {
  if (!Number.isFinite(error)) {
    return 0;
  }

  const raw = Math.round(
    MAX_POINTS *
      Math.exp(-FALLOFF * error),
  );

  return raw < MIN_POINTS ? 0 : raw;
}

/** The guess that landed nearest, or null when nobody played. */
export function closestGuess(
  guesses: ScaleGuess[],
): ScaleGuess | null {
  if (guesses.length === 0) {
    return null;
  }

  return [...guesses].sort(
    (a, b) =>
      a.logError - b.logError ||
      a.createdAt.localeCompare(
        b.createdAt,
      ),
  )[0]!;
}

/*
 * A pair that can share a screen and is worth asking about. Returns null
 * when the pool has nothing left that fits, which ends the game rather
 * than dealing an unanswerable round.
 */
type Pair = {
  reference: ScaleObject;
  mystery: ScaleObject;
};

function pairsWithin(
  pool: ScaleObject[],
): Pair[] {
  const pairs: Pair[] = [];

  for (const reference of pool) {
    for (const mystery of pool) {
      if (
        reference.id === mystery.id
      ) {
        continue;
      }

      const ratio = trueRatio(
        reference,
        mystery,
      );

      const spread =
        ratio >= 1
          ? ratio
          : 1 / ratio;

      if (
        spread >= MIN_PAIR_RATIO &&
        spread <= MAX_PAIR_RATIO
      ) {
        pairs.push({
          reference,
          mystery,
        });
      }
    }
  }

  return pairs;
}

export function pickPair(
  objects: ScaleObject[],
  usedKeys: string[],
): Pair | null {
  const fresh = objects.filter(
    (object) =>
      !usedKeys.includes(
        object.shapeKey,
      ),
  );

  /*
   * Unseen objects first, but falling back to the whole set when they
   * cannot make a pair between them — two objects left that happen to be
   * nearly the same height is not a reason to end the game, and checking
   * only the count would do exactly that.
   */
  const unseen = pairsWithin(fresh);

  const pairs =
    unseen.length > 0
      ? unseen
      : pairsWithin(objects);

  if (pairs.length === 0) {
    return null;
  }

  return pairs[
    Math.floor(
      Math.random() * pairs.length,
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

export async function getScaleObjects(): Promise<
  ScaleObject[]
> {
  const { data, error } =
    await supabase
      .from("scale_objects")
      .select("*")
      .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load the objects: ${error.message}`,
    );
  }

  return (
    (data as ObjectRow[]) ?? []
  ).map(mapObject);
}

export async function createScaleSession(
  roomId: string,
): Promise<ScaleSession> {
  const { error: closeError } =
    await supabase
      .from("scale_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("status", "playing");

  if (closeError) {
    throw new Error(
      `Could not close old Scale session: ${closeError.message}`,
    );
  }

  const { data, error } =
    await supabase
      .from("scale_sessions")
      .insert({
        room_id: roomId,
        status: "playing",
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Scale session: ${error.message}`,
    );
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function getActiveScaleSession(
  roomId: string,
): Promise<ScaleSession | null> {
  const { data, error } =
    await supabase
      .from("scale_sessions")
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
      `Could not load Scale session: ${error.message}`,
    );
  }

  return data
    ? mapSession(
        data as SessionRow,
      )
    : null;
}

async function finishScaleSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("scale_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Scale session: ${error.message}`,
    );
  }
}

export async function getLatestScaleRound(
  sessionId: string,
): Promise<ScaleRound | null> {
  const { data, error } =
    await supabase
      .from("scale_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Scale round: ${error.message}`,
    );
  }

  return data
    ? mapRound(data as RoundRow)
    : null;
}

export async function getScaleGuesses(
  roundId: string,
): Promise<ScaleGuess[]> {
  const { data, error } =
    await supabase
      .from("scale_guesses")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Could not load the guesses: ${error.message}`,
    );
  }

  return (
    (data as GuessRow[]) ?? []
  ).map(mapGuess);
}

async function usedShapeKeys(
  sessionId: string,
  objects: ScaleObject[],
): Promise<string[]> {
  const { data, error } =
    await supabase
      .from("scale_rounds")
      .select(
        "reference_id, mystery_id",
      )
      .eq("session_id", sessionId);

  if (error) {
    throw new Error(
      `Could not load played rounds: ${error.message}`,
    );
  }

  const byId = new Map(
    objects.map((object) => [
      object.id,
      object.shapeKey,
    ]),
  );

  return (
    (data as {
      reference_id: string;
      mystery_id: string;
    }[]) ?? []
  ).flatMap((row) =>
    [
      byId.get(row.reference_id),
      byId.get(row.mystery_id),
    ].filter(
      (key): key is string => !!key,
    ),
  );
}

export async function createScaleRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  objects: ScaleObject[],
  turnSeconds: number,
): Promise<ScaleRound | null> {
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("scale_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq("round_number", roundNumber)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check Scale round: ${existingError.message}`,
    );
  }

  if (existing) {
    return mapRound(
      existing as RoundRow,
    );
  }

  const pair = pickPair(
    objects,
    await usedShapeKeys(
      sessionId,
      objects,
    ),
  );

  if (!pair) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("scale_rounds")
      .insert({
        session_id: sessionId,
        room_id: roomId,
        round_number: roundNumber,
        status: "guessing",
        reference_id:
          pair.reference.id,
        mystery_id: pair.mystery.id,
        ends_at: new Date(
          Date.now() +
            turnSeconds * 1000,
        ).toISOString(),
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Scale round: ${error.message}`,
    );
  }

  return mapRound(data as RoundRow);
}

export async function submitScaleGuess(
  round: ScaleRound,
  playerId: string,
  ratio: number,
  reference: ScaleObject,
  mystery: ScaleObject,
) {
  if (round.status !== "guessing") {
    return;
  }

  const ratioError = logError(
    ratio,
    trueRatio(reference, mystery),
  );

  const { error } = await supabase
    .from("scale_guesses")
    .insert({
      round_id: round.id,
      player_id: playerId,
      ratio,
      log_error: Number.isFinite(
        ratioError,
      )
        ? ratioError
        : LOST_CAUSE,
      points: pointsFor(ratioError),
    });

  if (error) {
    /* Already guessed; the unique index says so. */
    if (error.code === "23505") {
      return;
    }

    throw new Error(
      `Could not submit the guess: ${error.message}`,
    );
  }
}

/*
 * Pays everyone out and flips the round. Gated on the status so the host's
 * clock and the last player locking in cannot both pay for the same round.
 */
export async function revealScaleRound(
  roundId: string,
) {
  const { data: claimed, error } =
    await supabase
      .from("scale_rounds")
      .update({ status: "reveal" })
      .eq("id", roundId)
      .eq("status", "guessing")
      .select("id");

  if (error) {
    throw new Error(
      `Could not reveal the round: ${error.message}`,
    );
  }

  if ((claimed ?? []).length === 0) {
    return;
  }

  const guesses =
    await getScaleGuesses(roundId);

  const closest =
    closestGuess(guesses);

  for (const guess of guesses) {
    const bonus =
      guesses.length > 1 &&
      closest?.id === guess.id
        ? CLOSEST_BONUS
        : 0;

    const total =
      guess.points + bonus;

    if (bonus > 0) {
      const { error: bonusError } =
        await supabase
          .from("scale_guesses")
          .update({ points: total })
          .eq("id", guess.id);

      if (bonusError) {
        throw new Error(
          `Could not award the bonus: ${bonusError.message}`,
        );
      }
    }

    if (total > 0) {
      await addScore(
        guess.playerId,
        total,
      );
    }
  }
}

export async function finishScaleGame(
  roundId: string,
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("scale_rounds")
      .update({ status: "finished" })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not finish Scale round: ${error.message}`,
    );
  }

  await finishScaleSession(
    sessionId,
  );
}

export async function returnScaleRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game: "scale",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
