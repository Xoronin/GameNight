import {
  allAtlasCountries,
  flagCountries,
  getAtlasCountry,
} from "../data/atlasCountries";
import type { AtlasCountry } from "../data/atlasCountries";
import { flagRegions } from "../data/atlasFlags";
import {
  mapPlayableIds,
  mapRegionIds,
} from "../data/atlasMapRegions";
import type { MapRegionId } from "../data/atlasMapPaths";
import { supabase } from "../lib/supabase";
import type {
  AtlasAnswer,
  AtlasPlacement,
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
  current_player_id: string | null;
  turn_ends_at: string | null;
  out_player_ids: string[] | null;
  player_lives: Record<
    string,
    number
  > | null;
};

type PlacementRow = {
  id: string;
  round_id: string;
  country_id: string;
  capital_country_id: string;
  placed_by: string;
  is_correct: boolean;
  created_at: string;
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

/** How many countries the shared match board holds. */
export const MATCH_PAIR_COUNT = 10;

/** Lives each player starts a match round with. */
export const STARTING_LIVES = 3;

/** Points for correctly placing one capital, before the speed bonus. */
const PLACEMENT_POINTS = 300;

/** Awarded to the only player still standing when a round ends. */
const LAST_STANDING_BONUS = 500;

/** How many options the multiple-choice rounds offer. */
const CHOICE_COUNT = 4;

const ROUND_TYPES: AtlasRoundType[] =
  [
    "flag_paint",
    "flag_choice",
    "country_from_flag",
    "capital_choice",
    "capital_match",
    "map_choice",
    "map_place",
  ];

/**
 * The shared, turn-based boards. Each runs many turns where the other
 * modes take a single answer, so they are guaranteed once but never
 * drawn again — two in a game would unbalance it rather than vary it.
 */
export const BOARD_ROUND_TYPES: AtlasRoundType[] =
  [
    "capital_match",
    "map_place",
  ];

/** The slots on a turn-based board, whichever board it is. */
export function boardCountryIds(
  payload: AtlasRoundPayload,
): string[] {
  return payload.type ===
    "capital_match" ||
    payload.type === "map_place"
    ? payload.countryIds
    : [];
}

export function isBoardRound(
  type: AtlasRoundType,
): boolean {
  return BOARD_ROUND_TYPES.includes(
    type,
  );
}

/** How many countries a map placement board holds. */
export const MAP_PLACE_COUNT = 6;

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
    currentPlayerId:
      row.current_player_id,
    turnEndsAt: row.turn_ends_at,
    outPlayerIds:
      row.out_player_ids ?? [],
    playerLives:
      row.player_lives ?? {},
  };
}

function mapPlacement(
  row: PlacementRow,
): AtlasPlacement {
  return {
    id: row.id,
    roundId: row.round_id,
    countryId: row.country_id,
    capitalCountryId:
      row.capital_country_id,
    placedBy: row.placed_by,
    isCorrect: row.is_correct,
    createdAt: row.created_at,
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
  return flagCountries.filter(
    (country) => {
      const regions = flagRegions(
        country.flag!,
      );

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
  /*
   * A mode may only draw countries it can render. The flag modes need
   * a drawable flag; the capital modes are happy with any country.
   */
  const pool =
    roundType === "flag_paint"
      ? paintableCountries()
      : roundType ===
            "flag_choice" ||
          roundType ===
            "country_from_flag"
        ? flagCountries
        : allAtlasCountries;

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
      allAtlasCountries.length <
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
        allAtlasCountries.filter(
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

  if (roundType === "map_place") {
    const region = pickRegion(
      MAP_PLACE_COUNT,
    );

    if (!region) {
      return null;
    }

    const countryIds = shuffle(
      mapPlayableIds[region],
    ).slice(0, MAP_PLACE_COUNT);

    return {
      type: "map_place",
      region,
      countryIds,
      placeOrder:
        shuffle(countryIds),
    };
  }

  if (roundType === "map_choice") {
    const region = pickRegion(
      CHOICE_COUNT,
    );

    if (!region) {
      return null;
    }

    const inRegion =
      mapPlayableIds[region];

    /*
     * Prefer a country this session has not asked about, but never
     * fail the round over it.
     */
    const fresh = inRegion.filter(
      (id) =>
        !excludedCountryIds.includes(
          id,
        ),
    );

    const answerId = pickRandom(
      fresh.length > 0
        ? fresh
        : inRegion,
    );

    const optionIds = shuffle([
      answerId,
      ...shuffle(
        inRegion.filter(
          (id) => id !== answerId,
        ),
      ).slice(
        0,
        CHOICE_COUNT - 1,
      ),
    ]);

    return {
      type: "map_choice",
      region,
      countryId: answerId,
      optionIds,
      /* Half the time the map asks for the capital instead. */
      asks:
        Math.random() < 0.5
          ? "country"
          : "capital",
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
      pool,
    );

  const optionIds = shuffle([
    answer,
    ...distractors,
  ]).map(
    (country) => country.id,
  );

  if (
    roundType === "flag_choice" ||
    roundType ===
      "country_from_flag" ||
    roundType === "capital_choice"
  ) {
    return {
      type: roundType,
      countryId: answer.id,
      optionIds,
    };
  }

  return null;
}

/**
 * Chooses the task for a round.
 *
 * Every mode is guaranteed to come up at least once per game before
 * anything repeats. A plain random draw does not give that: at one in
 * five per round, a default eight-round game would often never show
 * some modes at all.
 *
 * The guarantee comes from one rule — if the modes still unseen would
 * no longer fit in the rounds that remain, this round must take one of
 * them. Above that floor the pick is random, weighted by how much room
 * is left, so the unseen modes spread out instead of all bunching at
 * the end. That invariant (unseen never exceeds rounds remaining) holds
 * every round, so coverage can never be missed.
 *
 * Once every mode has been seen the rest of the game is a free draw —
 * except for the turn-based boards, which are deliberately left out of
 * it. See BOARD_ROUND_TYPES.
 */
/**
 * A region with enough answerable countries for the round.
 *
 * Region membership comes from the generated id lists rather than the
 * roster's continent field: a country can sit in a continent but fall
 * outside that region's map frame, and asking players to place a shape
 * that is mostly off the edge would not be fair.
 */
function pickRegion(
  needed: number,
): MapRegionId | null {
  const usable = mapRegionIds.filter(
    (region) =>
      mapPlayableIds[region]
        .length >= needed,
  );

  return usable.length > 0
    ? pickRandom(usable)
    : null;
}

export function pickRoundType(
  roundNumber: number,
  totalRounds: number,
  usedTypes: AtlasRoundType[],
  enabledModes: AtlasRoundType[] = ROUND_TYPES,
): AtlasRoundType {
  const enabled =
    enabledModes.length > 0
      ? enabledModes
      : ROUND_TYPES;

  /*
   * The first round opens with a flag choice where it is available: it
   * is the quickest type to grasp, and reading the rules mid-game is
   * nobody's idea of fun. If the host has turned that mode off, any
   * other non-board mode will do.
   */
  if (roundNumber <= 1) {
    if (
      enabled.includes(
        "flag_choice",
      )
    ) {
      return "flag_choice";
    }

    const gentle = enabled.filter(
      (type) => !isBoardRound(type),
    );

    return pickRandom(
      gentle.length > 0
        ? gentle
        : enabled,
    );
  }

  const seen = new Set(usedTypes);

  const unseen = enabled.filter(
    (type) => !seen.has(type),
  );

  /* Rounds still to be dealt, this one included. */
  const roundsLeft = Math.max(
    1,
    totalRounds - roundNumber + 1,
  );

  if (unseen.length > 0) {
    /*
     * At the floor: every remaining round is needed for a mode nobody
     * has seen yet, so there is no freedom left.
     */
    if (
      unseen.length >= roundsLeft
    ) {
      return pickRandom(unseen);
    }

    /*
     * Above the floor, take an unseen mode with the probability that
     * keeps them evenly spread over the rounds that remain.
     */
    if (
      Math.random() <
      unseen.length / roundsLeft
    ) {
      return pickRandom(unseen);
    }
  }

  const quick = enabled.filter(
    (type) => !isBoardRound(type),
  );

  return pickRandom(
    quick.length > 0
      ? quick
      : enabled,
  );
}

export async function getAtlasUsedRoundTypes(
  sessionId: string,
): Promise<AtlasRoundType[]> {
  const { data, error } =
    await supabase
      .from("atlas_rounds")
      .select("round_type")
      .eq(
        "session_id",
        sessionId,
      );

  if (error) {
    throw new Error(
      `Could not load Atlas round types: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (row) =>
      row.round_type as AtlasRoundType,
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

    if (!country.flag) {
      return {
        correctCount: 0,
        totalCount: 1,
      };
    }

    const regions = flagRegions(
      country.flag,
    );

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

  /*
   * capital_match is not graded here: it is a turn-based board scored
   * one placement at a time as players take their turns, not a single
   * submission at the end.
   */

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

/**
 * The next player in seating order who is still in the round.
 *
 * Falls back to the current player when nobody else is left, so a
 * last-player-standing keeps taking turns rather than the round
 * stalling with no active player.
 */
export function nextActivePlayer(
  playerIds: string[],
  currentPlayerId: string | null,
  outPlayerIds: string[],
): string | null {
  const active = playerIds.filter(
    (id) =>
      !outPlayerIds.includes(id),
  );

  if (active.length === 0) {
    return null;
  }

  const startIndex =
    currentPlayerId
      ? playerIds.indexOf(
          currentPlayerId,
        )
      : -1;

  /*
   * Walk forward from the current seat rather than filtering first, so
   * the turn order still follows the table even after players drop out.
   */
  for (
    let step = 1;
    step <= playerIds.length;
    step += 1
  ) {
    const candidate =
      playerIds[
        (startIndex + step) %
          playerIds.length
      ];

    if (
      !outPlayerIds.includes(
        candidate,
      )
    ) {
      return candidate;
    }
  }

  return active[0];
}

/**
 * Applies a wrong placement (or a missed turn) to the round's lives.
 */
export function applyLifeLoss(
  playerLives: Record<
    string,
    number
  >,
  outPlayerIds: string[],
  playerId: string,
): {
  playerLives: Record<
    string,
    number
  >;
  outPlayerIds: string[];
} {
  const lives = {
    ...playerLives,
  };

  const remaining = Math.max(
    (lives[playerId] ??
      STARTING_LIVES) - 1,
    0,
  );

  lives[playerId] = remaining;

  const out =
    remaining <= 0 &&
    !outPlayerIds.includes(
      playerId,
    )
      ? [...outPlayerIds, playerId]
      : outPlayerIds;

  return {
    playerLives: lives,
    outPlayerIds: out,
  };
}

/**
 * Whether the board is finished: every country solved, or nobody left
 * to solve it.
 */
export function isMatchRoundOver(
  countryIds: string[],
  solvedCountryIds: string[],
  playerIds: string[],
  outPlayerIds: string[],
): boolean {
  const allSolved =
    countryIds.every((id) =>
      solvedCountryIds.includes(id),
    );

  const anyoneLeft =
    playerIds.some(
      (id) =>
        !outPlayerIds.includes(id),
    );

  return allSolved || !anyoneLeft;
}

export function scorePlacement(
  remainingSeconds: number,
): number {
  return (
    PLACEMENT_POINTS +
    Math.min(
      200,
      remainingSeconds * 20,
    )
  );
}

export async function getAtlasPlacements(
  roundId: string,
): Promise<AtlasPlacement[]> {
  const { data, error } =
    await supabase
      .from("atlas_placements")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Could not load Atlas placements: ${error.message}`,
    );
  }

  return (
    (data ?? []) as PlacementRow[]
  ).map(mapPlacement);
}

async function updateRoundTurn(
  roundId: string,
  fields: {
    currentPlayerId: string | null;
    outPlayerIds: string[];
    playerLives: Record<
      string,
      number
    >;
    turnSeconds: number;
    status?: AtlasRoundStatus;
  },
) {
  const { error } =
    await supabase
      .from("atlas_rounds")
      .update({
        current_player_id:
          fields.currentPlayerId,
        out_player_ids:
          fields.outPlayerIds,
        player_lives:
          fields.playerLives,
        turn_ends_at: new Date(
          Date.now() +
            fields.turnSeconds *
              1000,
        ).toISOString(),
        ...(fields.status
          ? {
              status:
                fields.status,
            }
          : {}),
      })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not update Atlas turn: ${error.message}`,
    );
  }
}

/**
 * Places one capital on the shared board.
 *
 * The whole turn is resolved here rather than in the component so that
 * two clients reacting to the same realtime event cannot both advance
 * the turn: the placement insert is guarded by the round's current
 * player, and the solved-country index rejects a duplicate solve.
 */
export async function placeAtlasCapital(
  round: AtlasRound,
  playerId: string,
  countryId: string,
  capitalCountryId: string,
  playerIds: string[],
  turnSeconds: number,
): Promise<void> {
  if (
    round.status !== "playing" ||
    !isBoardRound(
      round.payload.type,
    ) ||
    round.currentPlayerId !==
      playerId
  ) {
    return;
  }

  const isCorrect =
    countryId === capitalCountryId;

  const {
    error: insertError,
  } = await supabase
    .from("atlas_placements")
    .insert({
      round_id: round.id,
      country_id: countryId,
      capital_country_id:
        capitalCountryId,
      placed_by: playerId,
      is_correct: isCorrect,
    });

  if (insertError) {
    throw new Error(
      `Could not place capital: ${insertError.message}`,
    );
  }

  let outPlayerIds =
    round.outPlayerIds;

  let playerLives =
    round.playerLives;

  if (isCorrect) {
    const remainingSeconds =
      Math.max(
        0,
        Math.ceil(
          (new Date(
            round.turnEndsAt ??
              round.endsAt,
          ).getTime() -
            Date.now()) /
            1000,
        ),
      );

    await addScore(
      playerId,
      scorePlacement(
        remainingSeconds,
      ),
    );
  } else {
    const result = applyLifeLoss(
      playerLives,
      outPlayerIds,
      playerId,
    );

    playerLives =
      result.playerLives;

    outPlayerIds =
      result.outPlayerIds;
  }

  const placements =
    await getAtlasPlacements(
      round.id,
    );

  const solved = placements
    .filter(
      (placement) =>
        placement.isCorrect,
    )
    .map(
      (placement) =>
        placement.countryId,
    );

  const boardIds =
    boardCountryIds(round.payload);

  const over = isMatchRoundOver(
    boardIds,
    solved,
    playerIds,
    outPlayerIds,
  );

  if (over) {
    const survivors =
      playerIds.filter(
        (id) =>
          !outPlayerIds.includes(
            id,
          ),
      );

    /* Surviving alone is worth something on its own. */
    if (
      survivors.length === 1 &&
      playerIds.length > 1
    ) {
      await addScore(
        survivors[0],
        LAST_STANDING_BONUS,
      );
    }

    await updateRoundTurn(
      round.id,
      {
        currentPlayerId: null,
        outPlayerIds,
        playerLives,
        turnSeconds: 0,
        status: "reveal",
      },
    );

    return;
  }

  await updateRoundTurn(round.id, {
    currentPlayerId:
      nextActivePlayer(
        playerIds,
        playerId,
        outPlayerIds,
      ),
    outPlayerIds,
    playerLives,
    turnSeconds,
  });
}

/**
 * Ends the current player's turn without a placement — used when their
 * timer runs out. Costs a life, exactly as a wrong placement does.
 */
export async function passAtlasTurn(
  round: AtlasRound,
  playerIds: string[],
  turnSeconds: number,
): Promise<void> {
  if (
    round.status !== "playing" ||
    !isBoardRound(
      round.payload.type,
    ) ||
    !round.currentPlayerId
  ) {
    return;
  }

  const playerId =
    round.currentPlayerId;

  const {
    playerLives,
    outPlayerIds,
  } = applyLifeLoss(
    round.playerLives,
    round.outPlayerIds,
    playerId,
  );

  const placements =
    await getAtlasPlacements(
      round.id,
    );

  const solved = placements
    .filter(
      (placement) =>
        placement.isCorrect,
    )
    .map(
      (placement) =>
        placement.countryId,
    );

  if (
    isMatchRoundOver(
      boardCountryIds(
        round.payload,
      ),
      solved,
      playerIds,
      outPlayerIds,
    )
  ) {
    const survivors =
      playerIds.filter(
        (id) =>
          !outPlayerIds.includes(
            id,
          ),
      );

    if (
      survivors.length === 1 &&
      playerIds.length > 1
    ) {
      await addScore(
        survivors[0],
        LAST_STANDING_BONUS,
      );
    }

    await updateRoundTurn(
      round.id,
      {
        currentPlayerId: null,
        outPlayerIds,
        playerLives,
        turnSeconds: 0,
        status: "reveal",
      },
    );

    return;
  }

  await updateRoundTurn(round.id, {
    currentPlayerId:
      nextActivePlayer(
        playerIds,
        playerId,
        outPlayerIds,
      ),
    outPlayerIds,
    playerLives,
    turnSeconds,
  });
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
          "capital_match" ||
        payload.type ===
          "map_place"
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
  playerIds: string[],
  totalRounds: number,
  enabledModes: AtlasRoundType[],
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

  const roundType = pickRoundType(
    roundNumber,
    totalRounds,
    await getAtlasUsedRoundTypes(
      sessionId,
    ),
    enabledModes,
  );

  const payload =
    buildRoundPayload(
      roundType,
      excludedCountryIds,
    );

  if (!payload) {
    return null;
  }

  /*
   * A match round is turn-based, so it starts with a seated player and
   * a per-player life count. The other round types are answered by
   * everyone at once and leave the turn columns alone.
   */
  const isBoard = isBoardRound(
    payload.type,
  );

  const turnFields = isBoard
    ? {
        current_player_id:
          playerIds[0] ?? null,
        turn_ends_at: new Date(
          Date.now() +
            timerSeconds * 1000,
        ).toISOString(),
        out_player_ids: [],
        player_lives:
          Object.fromEntries(
            playerIds.map((id) => [
              id,
              STARTING_LIVES,
            ]),
          ),
      }
    : {};

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
        ...turnFields,
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
