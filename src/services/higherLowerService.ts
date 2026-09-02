import { supabase } from "../lib/supabase";
import type {
  HigherLowerGuess,
  HigherLowerItem,
  HigherLowerRound,
  HigherLowerRoundStatus,
  HigherLowerSessionStatus,
} from "../types/game";

export type HigherLowerDifficulty =
  | "mixed"
  | "easy"
  | "medium"
  | "hard";

export type HigherLowerSession = {
  id: string;
  roomId: string;
  difficulty: HigherLowerDifficulty;
  status: HigherLowerSessionStatus;
  createdAt: string;
  finishedAt: string | null;
};

type HigherLowerSessionRow = {
  id: string;
  room_id: string;
  difficulty: HigherLowerDifficulty;
  status: HigherLowerSessionStatus;
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  current_item_id: string;
  next_item_id: string;
  status: HigherLowerRoundStatus;
  created_at: string;
  ends_at: string;
};

type GuessRow = {
  id: string;
  round_id: string;
  player_id: string;
  guess: "higher" | "lower";
  is_correct: boolean | null;
  created_at: string;
};

type ItemRow = {
  id: string;

  label_en: string;
  label_de: string;

  category_en: string | null;
  category_de: string | null;

  unit_en: string | null;
  unit_de: string | null;

  value: number;

  difficulty:
    | "easy"
    | "medium"
    | "hard";

  active: boolean;
};

function mapSession(
  row: HigherLowerSessionRow,
): HigherLowerSession {
  return {
    id: row.id,
    roomId: row.room_id,
    difficulty: row.difficulty,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

function mapRound(
  row: RoundRow,
): HigherLowerRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    currentItemId: row.current_item_id,
    nextItemId: row.next_item_id,
    status: row.status,
    createdAt: row.created_at,
    endsAt: row.ends_at,
  };
}

function mapGuess(
  row: GuessRow,
): HigherLowerGuess {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    guess: row.guess,
    isCorrect: row.is_correct,
    createdAt: row.created_at,
  };
}

function mapItem(
  row: ItemRow,
  language: "en" | "de",
): HigherLowerItem {
  return {
    id: row.id,

    label:
      language === "de"
        ? row.label_de
        : row.label_en,

    category:
      (language === "de"
        ? row.category_de
        : row.category_en) ?? null,

    unit:
      (language === "de"
        ? row.unit_de
        : row.unit_en) ?? null,

    value: row.value,

    difficulty: row.difficulty,
  };
}

function chooseDifficulty():
  | "easy"
  | "medium"
  | "hard" {
  const value = Math.random();

  // 15% easy
  if (value < 0.15) {
    return "easy";
  }

  // 55% medium
  if (value < 0.70) {
    return "medium";
  }

  // 30% hard
  return "hard";
}

async function getAvailableItems() {
  const { data, error } =
    await supabase
      .from(
        "higher_lower_items",
      )
      .select("*")
      .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load Higher / Lower items: ${error.message}`,
    );
  }

  return (
    data ?? []
  ) as ItemRow[];
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

async function updateRoundStatus(
  roundId: string,
  status: HigherLowerRoundStatus,
) {
  const { error } =
    await supabase
      .from(
        "higher_lower_rounds",
      )
      .update({
        status,
      })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not update Higher / Lower round: ${error.message}`,
    );
  }
}

export async function createHigherLowerSession(
  roomId: string,
  difficulty: HigherLowerDifficulty,
): Promise<HigherLowerSession> {
  /*
   * Close any old unfinished session
   * first so a rematch starts clean.
   */
  const {
    error: closeError,
  } = await supabase
    .from(
      "higher_lower_sessions",
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
      `Could not close old Higher / Lower session: ${closeError.message}`,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "higher_lower_sessions",
    )
    .insert({
      room_id: roomId,
      difficulty,
      status: "playing",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Higher / Lower session: ${error.message}`,
    );
  }

  return mapSession(
    data as HigherLowerSessionRow,
  );
}

export async function getActiveHigherLowerSession(
  roomId: string,
): Promise<HigherLowerSession | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "higher_lower_sessions",
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
      `Could not load Higher / Lower session: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapSession(
    data as HigherLowerSessionRow,
  );
}

export async function finishHigherLowerSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from(
        "higher_lower_sessions",
      )
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Higher / Lower session: ${error.message}`,
    );
  }
}

export async function getLatestHigherLowerRound(
  sessionId: string,
): Promise<HigherLowerRound | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "higher_lower_rounds",
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
      `Could not load Higher / Lower round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as RoundRow,
  );
}

export async function getHigherLowerGuesses(
  roundId: string,
): Promise<HigherLowerGuess[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "higher_lower_guesses",
    )
    .select("*")
    .eq(
      "round_id",
      roundId,
    )
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load Higher / Lower guesses: ${error.message}`,
    );
  }

  return (
    (data ?? []) as GuessRow[]
  ).map(mapGuess);
}

export async function getHigherLowerRoundItems(
  currentItemId: string,
  nextItemId: string,
  language: "en" | "de",
): Promise<{
  currentItem: HigherLowerItem;
  nextItem: HigherLowerItem;
}> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "higher_lower_items",
    )
    .select("*")
    .in("id", [
      currentItemId,
      nextItemId,
    ]);

  if (error) {
    throw new Error(
      `Could not load Higher / Lower items: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as ItemRow[];

  const currentRow =
    rows.find(
      (row) =>
        row.id === currentItemId,
    );

  const nextRow =
    rows.find(
      (row) =>
        row.id === nextItemId,
    );

  if (!currentRow || !nextRow) {
    throw new Error(
      "Higher / Lower items are missing.",
    );
  }

  return {
    currentItem: mapItem(
      currentRow,
      language,
    ),
    nextItem: mapItem(
      nextRow,
      language,
    ),
  };
}

export async function getHigherLowerUsedItemIds(
  sessionId: string,
): Promise<string[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "higher_lower_rounds",
    )
    .select(
      "current_item_id, next_item_id",
    )
    .eq(
      "session_id",
      sessionId,
    );

  if (error) {
    throw new Error(
      `Could not load used Higher / Lower items: ${error.message}`,
    );
  }

  const ids = new Set<string>();

  for (const row of data ?? []) {
    if (row.current_item_id) {
      ids.add(
        row.current_item_id as string,
      );
    }

    if (row.next_item_id) {
      ids.add(
        row.next_item_id as string,
      );
    }
  }

  return [...ids];
}

export async function createHigherLowerRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  previousRound: HigherLowerRound | null,
  excludedItemIds: string[],
  language: "en" | "de",
  difficulty: HigherLowerDifficulty,
  timerSeconds: number,
): Promise<{
  currentItem: HigherLowerItem;
  nextItem: HigherLowerItem;
} | null> {
  /*
   * Protect against double-clicks /
   * duplicate realtime actions.
   */
  const {
    data: existingRound,
    error: existingError,
  } = await supabase
    .from(
      "higher_lower_rounds",
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
      `Could not check Higher / Lower round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    const existing =
      existingRound as RoundRow;

    return getHigherLowerRoundItems(
      existing.current_item_id,
      existing.next_item_id,
      language,
    );
  }

  const items =
    await getAvailableItems();

  const unusedItems =
    items.filter(
      (item) =>
        !excludedItemIds.includes(
          item.id,
        ),
    );

  const selectedDifficulty =
    difficulty === "mixed"
      ? chooseDifficulty()
      : difficulty;

  let currentItemRow: ItemRow;
  let nextItemRow: ItemRow;

  if (!previousRound) {
    /*
     * Comparisons only make sense
     * within the same category
     * (population vs. population,
     * height vs. height, ...), so
     * the chain always starts by
     * picking a category first.
     */
    const byCategory = new Map<
      string,
      ItemRow[]
    >();

    for (const item of unusedItems) {
      const key =
        item.category_en ?? "";

      const group =
        byCategory.get(key) ?? [];

      group.push(item);
      byCategory.set(key, group);
    }

    let candidateGroups = [
      ...byCategory.values(),
    ].filter(
      (group) => group.length >= 2,
    );

    const difficultyGroups =
      candidateGroups
        .map((group) =>
          group.filter(
            (item) =>
              item.difficulty ===
              selectedDifficulty,
          ),
        )
        .filter(
          (group) =>
            group.length >= 2,
        );

    /*
     * Important fallback: if the
     * chosen difficulty has no
     * category with enough items,
     * don't fail the entire game.
     */
    if (difficultyGroups.length > 0) {
      candidateGroups =
        difficultyGroups;
    }

    if (candidateGroups.length === 0) {
      return null;
    }

    const group =
      candidateGroups[
        Math.floor(
          Math.random() *
            candidateGroups.length,
        )
      ];

    const shuffled = [...group].sort(
      () => Math.random() - 0.5,
    );

    currentItemRow = shuffled[0];
    nextItemRow = shuffled[1];
  } else {
    const currentRow =
      items.find(
        (item) =>
          item.id ===
          previousRound.nextItemId,
      );

    if (!currentRow) {
      throw new Error(
        "Could not find the current Higher / Lower item.",
      );
    }

    const sameCategory = (
      pool: ItemRow[],
    ) =>
      pool.filter(
        (item) =>
          item.category_en ===
            currentRow.category_en &&
          item.id !== currentRow.id,
      );

    let nextPool = sameCategory(
      unusedItems.filter(
        (item) =>
          item.difficulty ===
          selectedDifficulty,
      ),
    );

    /*
     * Fall back to any difficulty
     * within the same category, then
     * (rarely) to any category so an
     * exhausted pool doesn't stall
     * the game.
     */
    if (nextPool.length === 0) {
      nextPool = sameCategory(
        unusedItems,
      );
    }

    if (nextPool.length === 0) {
      nextPool = unusedItems.filter(
        (item) =>
          item.id !== currentRow.id,
      );
    }

    if (nextPool.length === 0) {
      return null;
    }

    currentItemRow = currentRow;

    nextItemRow =
      nextPool[
        Math.floor(
          Math.random() *
            nextPool.length,
        )
      ];
  }

  const { error: roundError } =
    await supabase
      .from(
        "higher_lower_rounds",
      )
      .insert({
        room_id: roomId,
        session_id: sessionId,
        round_number: roundNumber,
        current_item_id:
          currentItemRow.id,
        next_item_id:
          nextItemRow.id,
        status: "guessing",
        ends_at:
          new Date(
            Date.now() +
              timerSeconds *
                1000,
          ).toISOString(),
      });

  if (roundError) {
    throw new Error(
      `Could not create Higher / Lower round: ${roundError.message}`,
    );
  }

  return {
    currentItem: mapItem(
      currentItemRow,
      language,
    ),
    nextItem: mapItem(
      nextItemRow,
      language,
    ),
  };
}

export async function submitHigherLowerGuess(
  round: HigherLowerRound,
  playerId: string,
  guess: "higher" | "lower",
) {
  if (
    round.status !== "guessing"
  ) {
    return;
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from(
      "higher_lower_guesses",
    )
    .select("id")
    .eq("round_id", round.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check existing guess: ${existingError.message}`,
    );
  }

  if (existing) {
    return;
  }

  const { error } =
    await supabase
      .from(
        "higher_lower_guesses",
      )
      .insert({
        round_id: round.id,
        player_id: playerId,
        guess,
      });

  if (error) {
    throw new Error(
      `Could not submit guess: ${error.message}`,
    );
  }
}

export async function revealHigherLowerRound(
  round: HigherLowerRound,
  currentItem: HigherLowerItem,
  nextItem: HigherLowerItem,
  guesses: HigherLowerGuess[],
) {
  if (
    round.status !== "guessing"
  ) {
    return;
  }

  const actualDirection: "higher" | "lower" | "tie" =
    nextItem.value >
    currentItem.value
      ? "higher"
      : nextItem.value <
          currentItem.value
        ? "lower"
        : "tie";

  for (const guess of guesses) {
    const isCorrect =
      actualDirection === "tie"
        ? true
        : guess.guess ===
          actualDirection;

    const { error: guessError } =
      await supabase
        .from(
          "higher_lower_guesses",
        )
        .update({
          is_correct: isCorrect,
        })
        .eq("id", guess.id);

    if (guessError) {
      throw new Error(
        `Could not update guess: ${guessError.message}`,
      );
    }

    if (isCorrect) {
      await addScore(
        guess.playerId,
        500,
      );
    }
  }

  await updateRoundStatus(
    round.id,
    "reveal",
  );
}

export async function finishHigherLowerGame(
  roundId: string,
  sessionId: string,
) {
  await updateRoundStatus(
    roundId,
    "finished",
  );

  await finishHigherLowerSession(
    sessionId,
  );
}

export async function returnHigherLowerRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "higher-lower",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
