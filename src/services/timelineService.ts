import { supabase } from "../lib/supabase";
import type {
  TimelineCategory,
  TimelineCategoryType,
  TimelineItem,
  TimelinePlacement,
  TimelineRound,
  TimelineRoundStatus,
  TimelineSortDirection,
} from "../types/game";
import type {
  RoomPlayer,
} from "../types/player";

export const STARTING_LIVES = 3;

const CORRECT_PLACEMENT_POINTS = 150;

export type TimelineSession = {
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
  status: TimelineRoundStatus;
  current_player_id: string | null;
  current_item_id: string | null;
  turn_ends_at: string | null;
  used_item_ids: string[] | null;
  out_player_ids: string[] | null;
  player_lives: Record<string, number> | null;
  created_at: string;
};

type CategoryRow = {
  id: string;
  name_en: string;
  name_de: string;
  category_type: TimelineCategoryType;
  unit_en: string;
  unit_de: string;
  sort_direction: TimelineSortDirection;
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
  created_at: string;
};

function mapSession(
  row: SessionRow,
): TimelineSession {
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
): TimelineRound {
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
): TimelineCategory {
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
): TimelineItem {
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
): TimelinePlacement {
  return {
    id: row.id,
    roundId: row.round_id,
    itemId: row.item_id,
    placedBy: row.placed_by,
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

export async function getTimelineCategories(
  language: "en" | "de",
): Promise<TimelineCategory[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "timeline_categories",
    )
    .select("*")
    .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load Timeline categories: ${error.message}`,
    );
  }

  return (
    (data ?? []) as CategoryRow[]
  ).map((row) =>
    mapCategory(row, language),
  );
}

export async function getTimelineUsedCategoryIds(
  sessionId: string,
): Promise<string[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "timeline_rounds",
    )
    .select("category_id")
    .eq(
      "session_id",
      sessionId,
    );

  if (error) {
    throw new Error(
      `Could not load used Timeline categories: ${error.message}`,
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

export async function getTimelineItems(
  categoryId: string,
  language: "en" | "de",
): Promise<TimelineItem[]> {
  const {
    data,
    error,
  } = await supabase
    .from("timeline_items")
    .select("*")
    .eq(
      "category_id",
      categoryId,
    );

  if (error) {
    throw new Error(
      `Could not load Timeline items: ${error.message}`,
    );
  }

  return (
    (data ?? []) as ItemRow[]
  ).map((row) =>
    mapItem(row, language),
  );
}

export async function getTimelinePlacements(
  roundId: string,
): Promise<TimelinePlacement[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "timeline_placements",
    )
    .select("*")
    .eq("round_id", roundId);

  if (error) {
    throw new Error(
      `Could not load Timeline placements: ${error.message}`,
    );
  }

  return (
    (data ?? []) as PlacementRow[]
  ).map(mapPlacement);
}

export async function createTimelineSession(
  roomId: string,
): Promise<TimelineSession> {
  /*
   * Close any old unfinished Timeline
   * session first.
   */
  const {
    error: closeError,
  } = await supabase
    .from(
      "timeline_sessions",
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
      `Could not close old Timeline session: ${closeError.message}`,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "timeline_sessions",
    )
    .insert({
      room_id: roomId,
      status: "playing",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Timeline session: ${error.message}`,
    );
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function getActiveTimelineSession(
  roomId: string,
): Promise<TimelineSession | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "timeline_sessions",
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
      `Could not load Timeline session: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function finishTimelineSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from(
        "timeline_sessions",
      )
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Timeline session: ${error.message}`,
    );
  }
}

export async function getLatestTimelineRound(
  sessionId: string,
): Promise<TimelineRound | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "timeline_rounds",
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
      `Could not load Timeline round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as RoundRow,
  );
}

export async function createTimelineRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  players: RoomPlayer[],
  categoryId: string,
  timerSeconds: number,
): Promise<TimelineRound> {
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
      "timeline_rounds",
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
      `Could not check Timeline round: ${existingError.message}`,
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
    .from("timeline_items")
    .select("id, value")
    .eq(
      "category_id",
      categoryId,
    );

  if (itemsError) {
    throw new Error(
      `Could not load Timeline items: ${itemsError.message}`,
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

  const seedCount =
    shuffled.length >= 6
      ? 3
      : 2;

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
      "timeline_rounds",
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
      `Could not create Timeline round: ${roundError.message}`,
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
    }));

  const {
    error: placementsError,
  } = await supabase
    .from(
      "timeline_placements",
    )
    .insert(seedPlacements);

  if (placementsError) {
    /*
     * Clean up the incomplete round if
     * seeding the board fails.
     */
    await supabase
      .from(
        "timeline_rounds",
      )
      .delete()
      .eq("id", round.id);

    throw new Error(
      `Could not seed Timeline board: ${placementsError.message}`,
    );
  }

  return round;
}

/*
 * Places the round's current item into gap
 * `gapIndex` of `boardItems` (already sorted
 * ascending by value). Correct placements join
 * the board and score; wrong ones just cost the
 * player a life — either way the item is used up
 * and the turn moves on.
 */
export async function placeTimelineItem(
  round: TimelineRound,
  gapIndex: number,
  boardItems: TimelineItem[],
  currentItem: TimelineItem,
  playerId: string,
  players: RoomPlayer[],
  categoryItems: TimelineItem[],
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

  const usedItemIds =
    Array.from(
      new Set([
        ...round.usedItemIds,
        currentItem.id,
      ]),
    );

  let outPlayerIds =
    round.outPlayerIds;
  const playerLives = {
    ...round.playerLives,
  };

  if (!correct) {
    const remainingLives =
      Math.max(
        (playerLives[
          playerId
        ] ??
          STARTING_LIVES) - 1,
        0,
      );

    playerLives[playerId] =
      remainingLives;

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
  }

  const activeAfter =
    players.filter(
      (player) =>
        !outPlayerIds.includes(
          player.id,
        ),
    );

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
        playerId,
      );

  const {
    data: updatedRound,
    error: roundError,
  } = await supabase
    .from(
      "timeline_rounds",
    )
    .update({
      used_item_ids:
        usedItemIds,
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

  /*
   * Another client already resolved this
   * exact item.
   */
  if (!updatedRound) {
    return;
  }

  if (correct) {
    const {
      error: placementError,
    } = await supabase
      .from(
        "timeline_placements",
      )
      .insert({
        round_id: round.id,
        item_id: currentItem.id,
        placed_by: playerId,
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
  }
}

/*
 * The current player let their picking timer run
 * out without placing the item at all: costs them
 * a life, same as a wrong guess, and moves on.
 */
export async function passTimelineTurn(
  round: TimelineRound,
  categoryItems: TimelineItem[],
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

  const usedItemIds =
    Array.from(
      new Set([
        ...round.usedItemIds,
        currentItemId,
      ]),
    );

  const playerLives = {
    ...round.playerLives,
  };

  const remainingLives = Math.max(
    (playerLives[
      currentPlayerId
    ] ?? STARTING_LIVES) - 1,
    0,
  );

  playerLives[currentPlayerId] =
    remainingLives;

  let outPlayerIds =
    round.outPlayerIds;

  if (
    remainingLives <= 0 &&
    !outPlayerIds.includes(
      currentPlayerId,
    )
  ) {
    outPlayerIds = [
      ...outPlayerIds,
      currentPlayerId,
    ];
  }

  const activeAfter =
    players.filter(
      (player) =>
        !outPlayerIds.includes(
          player.id,
        ),
    );

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
        "timeline_rounds",
      )
      .update({
        used_item_ids:
          usedItemIds,
        out_player_ids:
          outPlayerIds,
        player_lives:
          playerLives,
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
      );

  if (error) {
    throw new Error(
      `Could not pass turn: ${error.message}`,
    );
  }
}

export async function finishTimelineGame(
  roundId: string,
  sessionId: string,
) {
  const { error } =
    await supabase
      .from(
        "timeline_rounds",
      )
      .update({
        status: "finished",
      })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not finish Timeline round: ${error.message}`,
    );
  }

  await finishTimelineSession(
    sessionId,
  );
}

export async function returnTimelineRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "timeline",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
