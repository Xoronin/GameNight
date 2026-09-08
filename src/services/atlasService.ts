import {
  atlasCountries,
  getAtlasCountry,
} from "../data/atlasCountries";
import type { AtlasCountry } from "../data/atlasCountries";
import { flagRegions } from "../data/atlasFlags";
import { supabase } from "../lib/supabase";
import type {
  AtlasAnswer,
  AtlasResponse,
  AtlasRound,
  AtlasRoundPayload,
  AtlasRoundStatus,
  AtlasRoundType,
  AtlasSessionStatus,
} from "../types/game";

export type AtlasSession = {
  id: string;
  roomId: string;
  status: AtlasSessionStatus;
  createdAt: string;
  finishedAt: string | null;
};

type SessionRow = {
  id: string;
  room_id: string;
  status: AtlasSessionStatus;
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  round_type: AtlasRoundType;
  payload: AtlasRoundPayload;
  status: AtlasRoundStatus;
  created_at: string;
  ends_at: string;
};

type AnswerRow = {
  id: string;
  round_id: string;
  player_id: string;
  response: AtlasResponse;
  correct_count: number;
  total_count: number;
  points: number;
  created_at: string;
};

/** How many countries a match round pairs up. */
export const MATCH_PAIR_COUNT = 4;

/** How many options the multiple-choice rounds offer. */
const CHOICE_COUNT = 4;

const ROUND_TYPES: AtlasRoundType[] =
  [
    "flag_paint",
    "flag_choice",
    "country_from_flag",
    "capital_choice",
    "capital_match",
  ];

function mapSession(
  row: SessionRow,
): AtlasSession {
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
): AtlasRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    roundType: row.round_type,
    payload: row.payload,
    status: row.status,
    createdAt: row.created_at,
    endsAt: row.ends_at,
  };
}

function mapAnswer(
  row: AnswerRow,
): AtlasAnswer {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    response: row.response,
    correctCount:
      row.correct_count,
    totalCount: row.total_count,
    points: row.points,
    createdAt: row.created_at,
  };
}

function shuffle<T>(
  items: T[],
): T[] {
  const copy = [...items];

  for (
    let index = copy.length - 1;
    index > 0;
    index -= 1
  ) {
    const swap = Math.floor(
      Math.random() *
        (index + 1),
    );

    [
      copy[index],
      copy[swap],
    ] = [
      copy[swap],
      copy[index],
    ];
  }

  return copy;
}

function pickRandom<T>(
  items: T[],
): T {
  return items[
    Math.floor(
      Math.random() *
        items.length,
    )
  ];
}

/**
 * Countries whose flag is a small number of flat regions, so it can be
 * handed to the player as empty slots to fill in. Botswana's five
 * bands, for instance, would be a chore rather than a puzzle.
 */
export function paintableCountries(): AtlasCountry[] {
  return atlasCountries.filter(
    (country) => {
      const regions =
        flagRegions(country.flag);

      return (
        regions.length >= 2 &&
        regions.length <= 3
      );
    },
  );
}

/**
 * Distractors for a multiple-choice round.
 *
 * Preferring countries from the same continent keeps the options from
 * being trivially separable, but the pool is topped up from anywhere if
 * that continent is too small to fill the list.
 */
function pickDistractors(
  answer: AtlasCountry,
  count: number,
  pool: AtlasCountry[],
): AtlasCountry[] {
  const others = pool.filter(
    (country) =>
      country.id !== answer.id,
  );

  const sameContinent =
    shuffle(
      others.filter(
        (country) =>
          country.continent ===
          answer.continent,
      ),
    );

  const rest = shuffle(
    others.filter(
      (country) =>
        country.continent !==
        answer.continent,
    ),
  );

  return [
    ...sameContinent,
    ...rest,
  ].slice(0, count);
}

/**
 * Builds the task for one round.
 *
 * `excludedCountryIds` are the countries already used as the answer in
 * this session, so a game does not ask about Germany three times.
 */
export function buildRoundPayload(
  roundType: AtlasRoundType,
  excludedCountryIds: string[],
): AtlasRoundPayload | null {
  const pool =
    roundType === "flag_paint"
      ? paintableCountries()
      : atlasCountries;

  const available = pool.filter(
    (country) =>
      !excludedCountryIds.includes(
        country.id,
      ),
  );

  /*
   * Falling back to the full pool beats ending the game early when a
   * long session has used up the countries this round type can ask
   * about — a repeat is better than a dead round.
   */
  const candidates =
    available.length > 0
      ? available
      : pool;

  if (candidates.length === 0) {
    return null;
  }

  if (
    roundType === "capital_match"
  ) {
    if (
      atlasCountries.length <
      MATCH_PAIR_COUNT
    ) {
      return null;
    }

    const chosen = shuffle(
      candidates,
    ).slice(
      0,
      MATCH_PAIR_COUNT,
    );

    /*
     * If the session has nearly exhausted the pool there may not be
     * enough unused countries left for a full board, so top it up.
     */
    if (
      chosen.length <
      MATCH_PAIR_COUNT
    ) {
      const filler = shuffle(
        atlasCountries.filter(
          (country) =>
            !chosen.some(
              (item) =>
                item.id ===
                country.id,
            ),
        ),
      ).slice(
        0,
        MATCH_PAIR_COUNT -
          chosen.length,
      );

      chosen.push(...filler);
    }

    const countryIds =
      chosen.map(
        (country) => country.id,
      );

    return {
      type: "capital_match",
      countryIds,
      capitalOrder:
        shuffle(countryIds),
    };
  }

  const answer =
    pickRandom(candidates);

  if (
    roundType === "flag_paint"
  ) {
    return {
      type: "flag_paint",
      countryId: answer.id,
    };
  }

  const distractors =
    pickDistractors(
      answer,
      CHOICE_COUNT - 1,
      atlasCountries,
    );

  const optionIds = shuffle([
    answer,
    ...distractors,
  ]).map(
    (country) => country.id,
  );

  return {
    type: roundType,
    countryId: answer.id,
    optionIds,
  };
}

export function pickRoundType(
  roundNumber: number,
): AtlasRoundType {
  /*
   * The first round is always a flag choice: it is the quickest type to
   * understand, and reading the rules mid-game is nobody's idea of fun.
   * After that the type is random, but never the same as the round
   * before, so the game keeps changing shape.
   */
  if (roundNumber <= 1) {
    return "flag_choice";
  }

  return pickRandom(
    ROUND_TYPES,
  );
}

/**
 * Grades a submission.
 *
 * Returns the raw tally rather than only a boolean so paint and match
 * rounds can award partial credit and show "3 / 4" on the reveal.
 */
export function gradeResponse(
  payload: AtlasRoundPayload,
  response: AtlasResponse,
): {
  correctCount: number;
  totalCount: number;
} {
  if (
    payload.type ===
      "flag_paint" &&
    response.type ===
      "flag_paint"
  ) {
    const country =
      getAtlasCountry(
        payload.countryId,
      );

    if (!country) {
      return {
        correctCount: 0,
        totalCount: 1,
      };
    }

    const regions =
      flagRegions(country.flag);

    const correctCount =
      regions.filter(
        (region) =>
          response.regions[
            region.id
          ] === region.color,
      ).length;

    return {
      correctCount,
      totalCount: regions.length,
    };
  }

  if (
    payload.type ===
    "capital_match"
  ) {
    if (
      response.type !==
      "capital_match"
    ) {
      return {
        correctCount: 0,
        totalCount:
          payload.countryIds
            .length,
      };
    }

    /* A pair is right when a country is matched to its own capital. */
    const correctCount =
      payload.countryIds.filter(
        (countryId) =>
          response.pairs[
            countryId
          ] === countryId,
      ).length;

    return {
      correctCount,
      totalCount:
        payload.countryIds.length,
    };
  }

  if (
    response.type === "choice" &&
    "countryId" in payload
  ) {
    return {
      correctCount:
        response.choiceId ===
        payload.countryId
          ? 1
          : 0,
      totalCount: 1,
    };
  }

  return {
    correctCount: 0,
    totalCount: 1,
  };
}

/**
 * Points for a graded answer.
 *
 * Partial credit scales the base award, and the speed bonus is only
 * paid on a flawless answer — otherwise rushing a half-right paint job
 * would beat taking the time to get it fully right.
 */
export function scoreAnswer(
  correctCount: number,
  totalCount: number,
  remainingSeconds: number,
): number {
  if (correctCount === 0) {
    return 0;
  }

  const ratio =
    correctCount / totalCount;

  const base = Math.round(
    600 * ratio,
  );

  const bonus =
    correctCount === totalCount
      ? Math.min(
          400,
          remainingSeconds * 20,
        )
      : 0;

  return base + bonus;
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
      `Could not load player score: ${error.message}`,
    );
  }

  const {
    error: updateError,
  } = await supabase
    .from("players")
    .update({
      score:
        (data.score ?? 0) +
        points,
    })
    .eq("id", playerId);

  if (updateError) {
    throw new Error(
      `Could not update player score: ${updateError.message}`,
    );
  }
}

export async function createAtlasSession(
  roomId: string,
): Promise<AtlasSession> {
  const { error: closeError } =
    await supabase
      .from("atlas_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("status", "playing");

  if (closeError) {
    throw new Error(
      `Could not close old Atlas session: ${closeError.message}`,
    );
  }

  const { data, error } =
    await supabase
      .from("atlas_sessions")
      .insert({
        room_id: roomId,
        status: "playing",
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Atlas session: ${error.message}`,
    );
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function getActiveAtlasSession(
  roomId: string,
): Promise<AtlasSession | null> {
  const { data, error } =
    await supabase
      .from("atlas_sessions")
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
      `Could not load Atlas session: ${error.message}`,
    );
  }

  return data
    ? mapSession(
        data as SessionRow,
      )
    : null;
}

export async function finishAtlasSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("atlas_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Atlas session: ${error.message}`,
    );
  }
}

export async function getLatestAtlasRound(
  sessionId: string,
): Promise<AtlasRound | null> {
  const { data, error } =
    await supabase
      .from("atlas_rounds")
      .select("*")
      .eq(
        "session_id",
        sessionId,
      )
      .order("round_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Atlas round: ${error.message}`,
    );
  }

  return data
    ? mapRound(data as RoundRow)
    : null;
}

export async function getAtlasAnswers(
  roundId: string,
): Promise<AtlasAnswer[]> {
  const { data, error } =
    await supabase
      .from("atlas_answers")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Could not load Atlas answers: ${error.message}`,
    );
  }

  return (
    (data ?? []) as AnswerRow[]
  ).map(mapAnswer);
}

export async function getAtlasUsedCountryIds(
  sessionId: string,
): Promise<string[]> {
  const { data, error } =
    await supabase
      .from("atlas_rounds")
      .select("payload")
      .eq(
        "session_id",
        sessionId,
      );

  if (error) {
    throw new Error(
      `Could not load used Atlas countries: ${error.message}`,
    );
  }

  return (data ?? []).flatMap(
    (row) => {
      const payload =
        row.payload as AtlasRoundPayload;

      if (
        payload.type ===
        "capital_match"
      ) {
        return payload.countryIds;
      }

      return [payload.countryId];
    },
  );
}

export async function createAtlasRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  excludedCountryIds: string[],
  timerSeconds: number,
): Promise<AtlasRound | null> {
  /* Guard against double-clicks and duplicate realtime actions. */
  const {
    data: existingRound,
    error: existingError,
  } = await supabase
    .from("atlas_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq(
      "round_number",
      roundNumber,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check Atlas round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    return mapRound(
      existingRound as RoundRow,
    );
  }

  const roundType =
    pickRoundType(roundNumber);

  const payload =
    buildRoundPayload(
      roundType,
      excludedCountryIds,
    );

  if (!payload) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("atlas_rounds")
      .insert({
        room_id: roomId,
        session_id: sessionId,
        round_number: roundNumber,
        round_type: roundType,
        payload,
        status: "playing",
        ends_at: new Date(
          Date.now() +
            timerSeconds * 1000,
        ).toISOString(),
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Atlas round: ${error.message}`,
    );
  }

  return mapRound(
    data as RoundRow,
  );
}

export async function submitAtlasAnswer(
  round: AtlasRound,
  playerId: string,
  response: AtlasResponse,
) {
  if (round.status !== "playing") {
    return;
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("atlas_answers")
    .select("id")
    .eq("round_id", round.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check existing answer: ${existingError.message}`,
    );
  }

  if (existing) {
    return;
  }

  const {
    correctCount,
    totalCount,
  } = gradeResponse(
    round.payload,
    response,
  );

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

  const points = scoreAnswer(
    correctCount,
    totalCount,
    remainingSeconds,
  );

  const { error } =
    await supabase
      .from("atlas_answers")
      .insert({
        round_id: round.id,
        player_id: playerId,
        response,
        correct_count:
          correctCount,
        total_count: totalCount,
        points,
      });

  if (error) {
    throw new Error(
      `Could not submit answer: ${error.message}`,
    );
  }

  if (points > 0) {
    await addScore(
      playerId,
      points,
    );
  }
}

export async function revealAtlasRound(
  roundId: string,
) {
  const { error } =
    await supabase
      .from("atlas_rounds")
      .update({ status: "reveal" })
      .eq("id", roundId)
      .eq("status", "playing");

  if (error) {
    throw new Error(
      `Could not reveal Atlas round: ${error.message}`,
    );
  }
}

export async function finishAtlasGame(
  roundId: string,
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("atlas_rounds")
      .update({
        status: "finished",
      })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not finish Atlas round: ${error.message}`,
    );
  }

  await finishAtlasSession(
    sessionId,
  );
}

export async function returnAtlasRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game: "atlas",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
