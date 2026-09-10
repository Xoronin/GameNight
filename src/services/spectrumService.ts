import { supabase } from "../lib/supabase";
import type {
  SpectrumCategory,
  SpectrumCategoryType,
  SpectrumItem,
  SpectrumPlacement,
  SpectrumPlacementOutcome,
  SpectrumRound,
  SpectrumRoundStatus,
  SpectrumSortDirection,
} from "../types/game";
import type {
  RoomPlayer,
} from "../types/player";

export const STARTING_LIVES = 3;

const CORRECT_PLACEMENT_POINTS = 150;

export type SpectrumSession = {
  id: string;
  roomId: string;
  status: "playing" | "finished";
  createdAt: string;
  finishedAt: string | null;
};

type SessionRow = {
  id: string;
  room_id: string;
  status: "playing" | "finished";
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  category_id: string;
  status: SpectrumRoundStatus;
  current_player_id: string | null;
  current_item_id: string | null;
  turn_ends_at: string | null;
  used_item_ids: string[] | null;
  attempted_player_ids: string[] | null;
  out_player_ids: string[] | null;
  player_lives: Record<string, number> | null;
  created_at: string;
};

type CategoryRow = {
  id: string;
  name_en: string;
  name_de: string;
  category_type: SpectrumCategoryType;
  unit_en: string;
  unit_de: string;
  sort_direction: SpectrumSortDirection;
};

type ItemRow = {
  id: string;
  category_id: string;
  name_en: string;
  name_de: string;
  value: number | string;
  value_label_en: string;
  value_label_de: string;
};

type PlacementRow = {
  id: string;
  round_id: string;
  item_id: string;
  placed_by: string | null;
  outcome: SpectrumPlacementOutcome;
  created_at: string;
};

function mapSession(
  row: SessionRow,
): SpectrumSession {
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
): SpectrumRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    categoryId: row.category_id,
    status: row.status,
    currentPlayerId:
      row.current_player_id,
    currentItemId:
      row.current_item_id,
    turnEndsAt: row.turn_ends_at,
    usedItemIds:
      row.used_item_ids ?? [],
    attemptedPlayerIds:
      row.attempted_player_ids ??
      [],
    outPlayerIds:
      row.out_player_ids ?? [],
    playerLives:
      row.player_lives ?? {},
    createdAt: row.created_at,
  };
}

function mapCategory(
  row: CategoryRow,
  language: "en" | "de",
): SpectrumCategory {
  return {
    id: row.id,
    name:
      language === "de"
        ? row.name_de
        : row.name_en,
    categoryType:
      row.category_type,
    unit:
      language === "de"
        ? row.unit_de
        : row.unit_en,
    sortDirection:
      row.sort_direction,
  };
}

function mapItem(
  row: ItemRow,
  language: "en" | "de",
): SpectrumItem {
  return {
    id: row.id,
    categoryId:
      row.category_id,
    name:
      language === "de"
        ? row.name_de
        : row.name_en,
    value: Number(row.value),
    valueLabel:
      language === "de"
        ? row.value_label_de
        : row.value_label_en,
  };
}

function mapPlacement(
  row: PlacementRow,
): SpectrumPlacement {
  return {
    id: row.id,
    roundId: row.round_id,
    itemId: row.item_id,
    placedBy: row.placed_by,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

function getNextPlayer(
  players: RoomPlayer[],
  currentPlayerId: string,
) {
  const index =
    players.findIndex(
      (player) =>
        player.id ===
        currentPlayerId,
    );

  if (index === -1) {
    return players[0];
  }

  return players[
    (index + 1) %
      players.length
  ];
}

/*
 * A wrong guess (or a missed timer) costs the
 * attempting player a life and adds them to this
 * item's attempt list. The item only leaves play
 * once every currently active player has had one
 * failed shot at it (or everyone's out) — until
 * then it just passes to the next active player.
 */
function computeFailedAttempt(
  round: SpectrumRound,
  playerId: string,
  players: RoomPlayer[],
) {
  const attemptedPlayerIds =
    Array.from(
      new Set([
        ...round.attemptedPlayerIds,
        playerId,
      ]),
    );

  const playerLives = {
    ...round.playerLives,
  };

  const remainingLives = Math.max(
    (playerLives[playerId] ??
      STARTING_LIVES) - 1,
    0,
  );

  playerLives[playerId] =
    remainingLives;

  let outPlayerIds =
    round.outPlayerIds;

  if (
    remainingLives <= 0 &&
    !outPlayerIds.includes(
      playerId,
    )
  ) {
    outPlayerIds = [
      ...outPlayerIds,
      playerId,
    ];
  }

  const activeAfter =
    players.filter(
      (player) =>
        !outPlayerIds.includes(
          player.id,
        ),
    );

  const cycleOver =
    activeAfter.length === 0 ||
    activeAfter.every((player) =>
      attemptedPlayerIds.includes(
        player.id,
      ),
    );

  return {
    attemptedPlayerIds,
    outPlayerIds,
    playerLives,
    activeAfter,
    cycleOver,
  };
}

function pickNextItemAndPlayer(
  usedItemIds: string[],
  categoryItems: SpectrumItem[],
  activeAfter: RoomPlayer[],
  fromPlayerId: string,
) {
  const remainingPool =
    categoryItems.filter(
      (item) =>
        !usedItemIds.includes(
          item.id,
        ),
    );

  const roundOver =
    activeAfter.length === 0 ||
    remainingPool.length === 0;

  const nextItem = roundOver
    ? null
    : remainingPool[
        Math.floor(
          Math.random() *
            remainingPool.length,
        )
      ];

  const nextPlayer = roundOver
    ? null
    : getNextPlayer(
        activeAfter,
        fromPlayerId,
      );

  return {
    roundOver,
    nextItem,
    nextPlayer,
  };
}

async function addScore(
  playerId: string,
  points: number,
) {
  const {
    data,
    error,
  } = await supabase
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

export async function getSpectrumCategories(
  language: "en" | "de",
): Promise<SpectrumCategory[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "spectrum_categories",
    )
    .select("*")
    .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load Spectrum categories: ${error.message}`,
    );
  }

  return (
    (data ?? []) as CategoryRow[]
  ).map((row) =>
    mapCategory(row, language),
  );
}

export async function getSpectrumUsedCategoryIds(
  sessionId: string,
): Promise<string[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "spectrum_rounds",
    )
    .select("category_id")
    .eq(
      "session_id",
      sessionId,
    );

  if (error) {
    throw new Error(
      `Could not load used Spectrum categories: ${error.message}`,
    );
  }

  return (
    data ?? []
  )
    .map(
      (row) =>
        row.category_id as string,
    )
    .filter(Boolean);
}

export async function getSpectrumItems(
  categoryId: string,
  language: "en" | "de",
): Promise<SpectrumItem[]> {
  const {
    data,
    error,
  } = await supabase
    .from("spectrum_items")
    .select("*")
    .eq(
      "category_id",
      categoryId,
    );

  if (error) {
    throw new Error(
      `Could not load Spectrum items: ${error.message}`,
    );
  }

  return (
    (data ?? []) as ItemRow[]
  ).map((row) =>
    mapItem(row, language),
  );
}

export async function getSpectrumPlacements(
  roundId: string,
): Promise<SpectrumPlacement[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "spectrum_placements",
    )
    .select("*")
    .eq("round_id", roundId);

  if (error) {
    throw new Error(
      `Could not load Spectrum placements: ${error.message}`,
    );
  }

  return (
    (data ?? []) as PlacementRow[]
  ).map(mapPlacement);
}

export async function createSpectrumSession(
  roomId: string,
): Promise<SpectrumSession> {
  /*
   * Close any old unfinished Spectrum
   * session first.
   */
  const {
    error: closeError,
  } = await supabase
    .from(
      "spectrum_sessions",
    )
    .update({
      status: "finished",
      finished_at:
        new Date().toISOString(),
    })
    .eq("room_id", roomId)
    .eq("status", "playing");

  if (closeError) {
    throw new Error(
      `Could not close old Spectrum session: ${closeError.message}`,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "spectrum_sessions",
    )
    .insert({
      room_id: roomId,
      status: "playing",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Spectrum session: ${error.message}`,
    );
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function getActiveSpectrumSession(
  roomId: string,
): Promise<SpectrumSession | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "spectrum_sessions",
    )
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
      `Could not load Spectrum session: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapSession(
    data as SessionRow,
  );
}

async function finishSpectrumSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from(
        "spectrum_sessions",
      )
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Spectrum session: ${error.message}`,
    );
  }
}

export async function getLatestSpectrumRound(
  sessionId: string,
): Promise<SpectrumRound | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "spectrum_rounds",
    )
    .select("*")
    .eq(
      "session_id",
      sessionId,
    )
    .order(
      "round_number",
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Spectrum round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as RoundRow,
  );
}

export async function createSpectrumRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  players: RoomPlayer[],
  categoryId: string,
  timerSeconds: number,
): Promise<SpectrumRound> {
  if (players.length === 0) {
    throw new Error(
      "No players in room.",
    );
  }

  /*
   * Protect against double-clicks /
   * duplicate realtime actions.
   */
  const {
    data: existingRound,
    error: existingError,
  } = await supabase
    .from(
      "spectrum_rounds",
    )
    .select("*")
    .eq(
      "session_id",
      sessionId,
    )
    .eq(
      "round_number",
      roundNumber,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check Spectrum round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    return mapRound(
      existingRound as RoundRow,
    );
  }

  const {
    data: itemRows,
    error: itemsError,
  } = await supabase
    .from("spectrum_items")
    .select("id, value")
    .eq(
      "category_id",
      categoryId,
    );

  if (itemsError) {
    throw new Error(
      `Could not load Spectrum items: ${itemsError.message}`,
    );
  }

  const items = (
    (itemRows ?? []) as {
      id: string;
      value: number | string;
    }[]
  ).map((row) => ({
    id: row.id,
    value: Number(row.value),
  }));

  if (items.length < 4) {
    throw new Error(
      "This category doesn't have enough items yet.",
    );
  }

  const shuffled = [
    ...items,
  ].sort(
    () => Math.random() - 0.5,
  );

  /*
   * Start with a single reference point so the
   * very first turn is still a real guess, not a
   * freebie.
   */
  const seedCount = 1;

  const seedItems = shuffled
    .slice(0, seedCount)
    .sort(
      (a, b) =>
        a.value - b.value,
    );

  const remaining =
    shuffled.slice(seedCount);

  const firstItem =
    remaining[
      Math.floor(
        Math.random() *
          remaining.length,
      )
    ];

  /*
   * Rotate which player starts each
   * round, same as Minefield.
   */
  const startingPlayer =
    players[
      (roundNumber - 1) %
        players.length
    ];

  const playerLives: Record<
    string,
    number
  > = {};

  for (const player of players) {
    playerLives[player.id] =
      STARTING_LIVES;
  }

  const {
    data: roundData,
    error: roundError,
  } = await supabase
    .from(
      "spectrum_rounds",
    )
    .insert({
      room_id: roomId,
      session_id: sessionId,
      round_number: roundNumber,
      category_id: categoryId,
      status: "playing",
      current_player_id:
        startingPlayer.id,
      current_item_id:
        firstItem.id,
      turn_ends_at:
        new Date(
          Date.now() +
            timerSeconds * 1000,
        ).toISOString(),
      used_item_ids:
        seedItems.map(
          (item) => item.id,
        ),
      player_lives: playerLives,
    })
    .select("*")
    .single();

  if (roundError) {
    throw new Error(
      `Could not create Spectrum round: ${roundError.message}`,
    );
  }

  const round = mapRound(
    roundData as RoundRow,
  );

  const seedPlacements =
    seedItems.map((item) => ({
      round_id: round.id,
      item_id: item.id,
      placed_by: null,
      outcome: "seed",
    }));

  const {
    error: placementsError,
  } = await supabase
    .from(
      "spectrum_placements",
    )
    .insert(seedPlacements);

  if (placementsError) {
    /*
     * Clean up the incomplete round if
     * seeding the board fails.
     */
    await supabase
      .from(
        "spectrum_rounds",
      )
      .delete()
      .eq("id", round.id);

    throw new Error(
      `Could not seed Spectrum board: ${placementsError.message}`,
    );
  }

  return round;
}

/*
 * Places the round's current item into gap
 * `gapIndex` of `boardItems` (already sorted
 * ascending by value). A correct guess joins the
 * board, scores, and hands a fresh item to the next
 * active player. A wrong guess costs the player a
 * life and passes the *same* item to the next
 * active player — it only leaves play once every
 * active player has had one failed shot at it, at
 * which point it's auto-placed at its real
 * position, grayed out, with nobody credited.
 */
export async function placeSpectrumItem(
  round: SpectrumRound,
  gapIndex: number,
  boardItems: SpectrumItem[],
  currentItem: SpectrumItem,
  playerId: string,
  players: RoomPlayer[],
  categoryItems: SpectrumItem[],
  timerSeconds: number,
) {
  if (
    round.status !== "playing"
  ) {
    return;
  }

  if (
    round.currentPlayerId !==
    playerId
  ) {
    throw new Error(
      "It is not your turn.",
    );
  }

  if (
    !round.currentItemId ||
    round.currentItemId !==
      currentItem.id
  ) {
    return;
  }

  const left =
    gapIndex > 0
      ? boardItems[gapIndex - 1]
      : null;

  const right =
    gapIndex < boardItems.length
      ? boardItems[gapIndex]
      : null;

  const correct =
    (!left ||
      currentItem.value >=
        left.value) &&
    (!right ||
      currentItem.value <=
        right.value);

  if (correct) {
    const usedItemIds =
      Array.from(
        new Set([
          ...round.usedItemIds,
          currentItem.id,
        ]),
      );

    const activeAfter =
      players.filter(
        (player) =>
          !round.outPlayerIds.includes(
            player.id,
          ),
      );

    const {
      roundOver,
      nextItem,
      nextPlayer,
    } = pickNextItemAndPlayer(
      usedItemIds,
      categoryItems,
      activeAfter,
      playerId,
    );

    const {
      data: updatedRound,
      error: roundError,
    } = await supabase
      .from(
        "spectrum_rounds",
      )
      .update({
        used_item_ids:
          usedItemIds,
        attempted_player_ids:
          [],
        current_item_id:
          nextItem?.id ?? null,
        current_player_id:
          nextPlayer?.id ??
          round.currentPlayerId,
        turn_ends_at: roundOver
          ? round.turnEndsAt
          : new Date(
              Date.now() +
                timerSeconds *
                  1000,
            ).toISOString(),
        status: roundOver
          ? "reveal"
          : "playing",
      })
      .eq("id", round.id)
      .eq(
        "current_item_id",
        currentItem.id,
      )
      .select("*")
      .maybeSingle();

    if (roundError) {
      throw new Error(
        `Could not resolve item: ${roundError.message}`,
      );
    }

    /*
     * Another client already resolved this
     * exact item.
     */
    if (!updatedRound) {
      return;
    }

    const {
      error: placementError,
    } = await supabase
      .from(
        "spectrum_placements",
      )
      .insert({
        round_id: round.id,
        item_id: currentItem.id,
        placed_by: playerId,
        outcome: "correct",
      });

    if (placementError) {
      throw new Error(
        `Could not place item: ${placementError.message}`,
      );
    }

    await addScore(
      playerId,
      CORRECT_PLACEMENT_POINTS,
    );

    return;
  }

  const {
    attemptedPlayerIds,
    outPlayerIds,
    playerLives,
    activeAfter,
    cycleOver,
  } = computeFailedAttempt(
    round,
    playerId,
    players,
  );

  if (!cycleOver) {
    const nextPlayer =
      getNextPlayer(
        activeAfter,
        playerId,
      );

    const {
      error: roundError,
    } = await supabase
      .from(
        "spectrum_rounds",
      )
      .update({
        attempted_player_ids:
          attemptedPlayerIds,
        out_player_ids:
          outPlayerIds,
        player_lives:
          playerLives,
        current_player_id:
          nextPlayer?.id ??
          playerId,
        turn_ends_at:
          new Date(
            Date.now() +
              timerSeconds *
                1000,
          ).toISOString(),
      })
      .eq("id", round.id)
      .eq(
        "current_item_id",
        currentItem.id,
      );

    if (roundError) {
      throw new Error(
        `Could not pass the item on: ${roundError.message}`,
      );
    }

    return;
  }

  /*
   * Everyone active has now failed this item:
   * reveal where it really belonged, grayed
   * out, with nobody credited.
   */
  const usedItemIds =
    Array.from(
      new Set([
        ...round.usedItemIds,
        currentItem.id,
      ]),
    );

  const {
    roundOver,
    nextItem,
    nextPlayer,
  } = pickNextItemAndPlayer(
    usedItemIds,
    categoryItems,
    activeAfter,
    playerId,
  );

  const {
    data: updatedRound,
    error: roundError,
  } = await supabase
    .from(
      "spectrum_rounds",
    )
    .update({
      used_item_ids:
        usedItemIds,
      attempted_player_ids: [],
      out_player_ids:
        outPlayerIds,
      player_lives: playerLives,
      current_item_id:
        nextItem?.id ?? null,
      current_player_id:
        nextPlayer?.id ??
        round.currentPlayerId,
      turn_ends_at: roundOver
        ? round.turnEndsAt
        : new Date(
            Date.now() +
              timerSeconds *
                1000,
          ).toISOString(),
      status: roundOver
        ? "reveal"
        : "playing",
    })
    .eq("id", round.id)
    .eq(
      "current_item_id",
      currentItem.id,
    )
    .select("*")
    .maybeSingle();

  if (roundError) {
    throw new Error(
      `Could not resolve item: ${roundError.message}`,
    );
  }

  if (!updatedRound) {
    return;
  }

  const {
    error: placementError,
  } = await supabase
    .from(
      "spectrum_placements",
    )
    .insert({
      round_id: round.id,
      item_id: currentItem.id,
      placed_by: null,
      outcome: "failed",
    });

  if (placementError) {
    throw new Error(
      `Could not place item: ${placementError.message}`,
    );
  }
}

/*
 * The current player let their picking timer run
 * out without placing the item at all — treated
 * exactly like a wrong guess.
 */
export async function passSpectrumTurn(
  round: SpectrumRound,
  categoryItems: SpectrumItem[],
  players: RoomPlayer[],
  timerSeconds: number,
) {
  if (
    round.status !== "playing" ||
    !round.currentPlayerId ||
    !round.currentItemId
  ) {
    return;
  }

  const currentPlayerId =
    round.currentPlayerId;

  const currentItemId =
    round.currentItemId;

  const {
    attemptedPlayerIds,
    outPlayerIds,
    playerLives,
    activeAfter,
    cycleOver,
  } = computeFailedAttempt(
    round,
    currentPlayerId,
    players,
  );

  if (!cycleOver) {
    const nextPlayer =
      getNextPlayer(
        activeAfter,
        currentPlayerId,
      );

    /*
     * Guarded by the previous current_item_id
     * and current_player_id so a concurrent
     * placement can't be clobbered by a stale
     * timeout.
     */
    const { error } =
      await supabase
        .from(
          "spectrum_rounds",
        )
        .update({
          attempted_player_ids:
            attemptedPlayerIds,
          out_player_ids:
            outPlayerIds,
          player_lives:
            playerLives,
          current_player_id:
            nextPlayer?.id ??
            currentPlayerId,
          turn_ends_at:
            new Date(
              Date.now() +
                timerSeconds *
                  1000,
            ).toISOString(),
        })
        .eq("id", round.id)
        .eq(
          "status",
          "playing",
        )
        .eq(
          "current_item_id",
          currentItemId,
        )
        .eq(
          "current_player_id",
          currentPlayerId,
        );

    if (error) {
      throw new Error(
        `Could not pass the item on: ${error.message}`,
      );
    }

    return;
  }

  const usedItemIds =
    Array.from(
      new Set([
        ...round.usedItemIds,
        currentItemId,
      ]),
    );

  const {
    roundOver,
    nextItem,
    nextPlayer,
  } = pickNextItemAndPlayer(
    usedItemIds,
    categoryItems,
    activeAfter,
    currentPlayerId,
  );

  const {
    data: updatedRound,
    error,
  } = await supabase
    .from(
      "spectrum_rounds",
    )
    .update({
      used_item_ids:
        usedItemIds,
      attempted_player_ids: [],
      out_player_ids:
        outPlayerIds,
      player_lives: playerLives,
      current_item_id:
        nextItem?.id ?? null,
      current_player_id:
        nextPlayer?.id ??
        currentPlayerId,
      turn_ends_at: roundOver
        ? round.turnEndsAt
        : new Date(
            Date.now() +
              timerSeconds *
                1000,
          ).toISOString(),
      status: roundOver
        ? "reveal"
        : "playing",
    })
    .eq("id", round.id)
    .eq(
      "status",
      "playing",
    )
    .eq(
      "current_item_id",
      currentItemId,
    )
    .eq(
      "current_player_id",
      currentPlayerId,
    )
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not pass turn: ${error.message}`,
    );
  }

  if (!updatedRound) {
    return;
  }

  const {
    error: placementError,
  } = await supabase
    .from(
      "spectrum_placements",
    )
    .insert({
      round_id: round.id,
      item_id: currentItemId,
      placed_by: null,
      outcome: "failed",
    });

  if (placementError) {
    throw new Error(
      `Could not place item: ${placementError.message}`,
    );
  }
}

export async function finishSpectrumGame(
  roundId: string,
  sessionId: string,
) {
  const { error } =
    await supabase
      .from(
        "spectrum_rounds",
      )
      .update({
        status: "finished",
      })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not finish Spectrum round: ${error.message}`,
    );
  }

  await finishSpectrumSession(
    sessionId,
  );
}

export async function returnSpectrumRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "spectrum",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
