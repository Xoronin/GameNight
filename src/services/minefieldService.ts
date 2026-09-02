import { supabase } from "../lib/supabase";
import type {
  MinefieldQuestion,
  MinefieldRound,
  MinefieldRoundStatus,
  MinefieldTile,
} from "../types/game";
import type {
  RoomPlayer,
} from "../types/player";

export type MinefieldDifficulty =
  | "mixed"
  | "easy"
  | "medium"
  | "hard";

export type MinefieldSession = {
  id: string;
  roomId: string;
  difficulty: MinefieldDifficulty;
  status: "playing" | "finished";
  createdAt: string;
  finishedAt: string | null;
};

type MinefieldSessionRow = {
  id: string;
  room_id: string;
  difficulty: MinefieldDifficulty;
  status: "playing" | "finished";
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  question_id: string;
  current_player_id: string | null;
  status: MinefieldRoundStatus;
  created_at: string;
  turn_ends_at: string | null;
};

type TileRow = {
  id: string;
  round_id: string;
  text: string;
  is_correct: boolean;
  revealed: boolean;
  picked_by: string | null;
  created_at: string;
};

type QuestionRow = {
  id: string;

  category_en: string;
  category_de: string;

  question_en: string;
  question_de: string;

  correct_answers_en: string[];
  correct_answers_de: string[];

  wrong_answers_en: string[];
  wrong_answers_de: string[];

  difficulty:
    | "easy"
    | "medium"
    | "hard";

  active: boolean;
};

function mapSession(
  row: MinefieldSessionRow,
): MinefieldSession {
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
): MinefieldRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    questionId: row.question_id,
    currentPlayerId:
      row.current_player_id,
    status: row.status,
    createdAt: row.created_at,
    turnEndsAt: row.turn_ends_at,
  };
}

function mapTile(
  row: TileRow,
): MinefieldTile {
  return {
    id: row.id,
    roundId: row.round_id,
    text: row.text,
    isCorrect: row.is_correct,
    revealed: row.revealed,
    pickedBy: row.picked_by,
    createdAt: row.created_at,
  };
}

function mapQuestion(
  row: QuestionRow,
  language: "en" | "de",
): MinefieldQuestion {
  return {
    id: row.id,

    category:
      language === "de"
        ? row.category_de
        : row.category_en,

    question:
      language === "de"
        ? row.question_de
        : row.question_en,

    correctAnswers:
      language === "de"
        ? row.correct_answers_de
        : row.correct_answers_en,

    wrongAnswers:
      language === "de"
        ? row.wrong_answers_de
        : row.wrong_answers_en,
  };
}

function shuffle<T>(
  items: T[],
) {
  const result = [...items];

  for (
    let index =
      result.length - 1;
    index > 0;
    index--
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (index + 1),
      );

    [
      result[index],
      result[randomIndex],
    ] = [
      result[randomIndex],
      result[index],
    ];
  }

  return result;
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

async function getAvailableQuestions() {
  const { data, error } =
    await supabase
      .from(
        "minefield_questions",
      )
      .select("*")
      .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load Minefield questions: ${error.message}`,
    );
  }

  return (
    data ?? []
  ) as QuestionRow[];
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

async function revealRemainingTiles(
  roundId: string,
) {
  const { error } =
    await supabase
      .from(
        "minefield_tiles",
      )
      .update({
        revealed: true,
      })
      .eq(
        "round_id",
        roundId,
      );

  if (error) {
    throw new Error(
      `Could not reveal Minefield tiles: ${error.message}`,
    );
  }
}

async function updateRoundStatus(
  roundId: string,
  status: MinefieldRoundStatus,
) {
  const { error } =
    await supabase
      .from(
        "minefield_rounds",
      )
      .update({
        status,
      })
      .eq(
        "id",
        roundId,
      );

  if (error) {
    throw new Error(
      `Could not update Minefield round: ${error.message}`,
    );
  }
}

export async function createMinefieldSession(
  roomId: string,
  difficulty: MinefieldDifficulty,
): Promise<MinefieldSession> {
  /*
   * Close any old unfinished
   * Minefield session first.
   */
  const {
    error: closeError,
  } = await supabase
    .from(
      "minefield_sessions",
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
      `Could not close old Minefield session: ${closeError.message}`,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "minefield_sessions",
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
      `Could not create Minefield session: ${error.message}`,
    );
  }

  return mapSession(
    data as MinefieldSessionRow,
  );
}

export async function getActiveMinefieldSession(
  roomId: string,
): Promise<MinefieldSession | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "minefield_sessions",
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
      `Could not load Minefield session: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapSession(
    data as MinefieldSessionRow,
  );
}

export async function finishMinefieldSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from(
        "minefield_sessions",
      )
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Minefield session: ${error.message}`,
    );
  }
}

export async function getLatestMinefieldRound(
  sessionId: string,
): Promise<MinefieldRound | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "minefield_rounds",
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
      `Could not load Minefield round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as RoundRow,
  );
}

export async function getMinefieldTiles(
  roundId: string,
): Promise<MinefieldTile[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "minefield_tiles",
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
      `Could not load Minefield tiles: ${error.message}`,
    );
  }

  return (
    (data ?? []) as TileRow[]
  ).map(mapTile);
}

export async function getMinefieldQuestion(
  questionId: string,
  language: "en" | "de",
): Promise<MinefieldQuestion> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "minefield_questions",
    )
    .select("*")
    .eq("id", questionId)
    .single();

  if (error) {
    throw new Error(
      `Could not load Minefield question: ${error.message}`,
    );
  }

  return mapQuestion(
    data as QuestionRow,
    language,
  );
}

export async function getMinefieldUsedQuestionIds(
  sessionId: string,
): Promise<string[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "minefield_rounds",
    )
    .select("question_id")
    .eq(
      "session_id",
      sessionId,
    );

  if (error) {
    throw new Error(
      `Could not load used Minefield questions: ${error.message}`,
    );
  }

  return (
    data ?? []
  )
    .map(
      (row) =>
        row.question_id as string,
    )
    .filter(Boolean);
}

export async function createMinefieldRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  players: RoomPlayer[],
  excludedQuestionIds: string[],
  language: "en" | "de",
  difficulty: MinefieldDifficulty,
  timerSeconds: number,
): Promise<MinefieldQuestion | null> {
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
      "minefield_rounds",
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
      `Could not check Minefield round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    const existing =
      existingRound as RoundRow;

    return getMinefieldQuestion(
      existing.question_id,
      language,
    );
  }

  const questions =
    await getAvailableQuestions();

  const unusedQuestions =
    questions.filter(
      (question) =>
        !excludedQuestionIds.includes(
          question.id,
        ),
    );

  if (
    unusedQuestions.length === 0
  ) {
    return null;
  }

  const selectedDifficulty =
    difficulty === "mixed"
      ? chooseDifficulty()
      : difficulty;

  let available =
    unusedQuestions.filter(
      (question) =>
        question.difficulty ===
        selectedDifficulty,
    );

  /*
   * Important fallback:
   * If Mixed rolls a difficulty
   * whose pool has been exhausted,
   * don't fail the entire game.
   */
  if (
    available.length === 0
  ) {
    available =
      unusedQuestions;
  }

  const questionRow =
    available[
      Math.floor(
        Math.random() *
          available.length,
      )
    ];

  const question =
    mapQuestion(
      questionRow,
      language,
    );

  /*
   * Rotate which player gets
   * the first turn each round.
   */
  const startingPlayer =
    players[
      (roundNumber - 1) %
        players.length
    ];

  const {
    data: roundData,
    error: roundError,
  } = await supabase
    .from(
      "minefield_rounds",
    )
    .insert({
      room_id: roomId,
      session_id:
        sessionId,
      round_number:
        roundNumber,
      question_id:
        question.id,
      current_player_id:
        startingPlayer.id,
      status: "playing",
      turn_ends_at:
        new Date(
          Date.now() +
            timerSeconds * 1000,
        ).toISOString(),
    })
    .select("*")
    .single();

  if (roundError) {
    throw new Error(
      `Could not create Minefield round: ${roundError.message}`,
    );
  }

  const round =
    mapRound(
      roundData as RoundRow,
    );

  const correctTiles =
    question.correctAnswers.map(
      (text) => ({
        round_id:
          round.id,
        text,
        is_correct: true,
        revealed: false,
        picked_by: null,
      }),
    );

  const wrongTiles =
    question.wrongAnswers.map(
      (text) => ({
        round_id:
          round.id,
        text,
        is_correct: false,
        revealed: false,
        picked_by: null,
      }),
    );

  const tiles =
    shuffle([
      ...correctTiles,
      ...wrongTiles,
    ]);

  const {
    error: tileError,
  } = await supabase
    .from(
      "minefield_tiles",
    )
    .insert(tiles);

  if (tileError) {
    /*
     * Clean up the incomplete round
     * if board creation fails.
     */
    await supabase
      .from(
        "minefield_rounds",
      )
      .delete()
      .eq(
        "id",
        round.id,
      );

    throw new Error(
      `Could not create Minefield board: ${tileError.message}`,
    );
  }

  return question;
}

export async function pickMinefieldTile(
  round: MinefieldRound,
  tile: MinefieldTile,
  players: RoomPlayer[],
  playerId: string,
  timerSeconds: number,
) {
  if (
    round.status !==
    "playing"
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

  if (tile.revealed) {
    return;
  }

  /*
   * Update only if the tile has
   * not already been claimed.
   */
  const {
    data: pickedTile,
    error: tileError,
  } = await supabase
    .from(
      "minefield_tiles",
    )
    .update({
      revealed: true,
      picked_by: playerId,
    })
    .eq("id", tile.id)
    .eq(
      "revealed",
      false,
    )
    .select("*")
    .maybeSingle();

  if (tileError) {
    throw new Error(
      `Could not select tile: ${tileError.message}`,
    );
  }

  /*
   * Another client may have beaten
   * us to this tile.
   */
  if (!pickedTile) {
    return;
  }

  const selectedTile =
    mapTile(
      pickedTile as TileRow,
    );

  if (
    selectedTile.isCorrect
  ) {
    await addScore(
      playerId,
      500,
    );
  }

  const updatedTiles =
    await getMinefieldTiles(
      round.id,
    );

  const remainingCorrect =
    updatedTiles.filter(
      (item) =>
        item.isCorrect &&
        !item.revealed,
    );

  /*
   * Player found the final safe
   * answer.
   */
  if (
    remainingCorrect.length ===
    0
  ) {
    await revealRemainingTiles(
      round.id,
    );

    await updateRoundStatus(
      round.id,
      "reveal",
    );

    return;
  }

  /*
   * Mine selected:
   * end the round immediately.
   */
  if (
    !selectedTile.isCorrect
  ) {
    await revealRemainingTiles(
      round.id,
    );

    await updateRoundStatus(
      round.id,
      "reveal",
    );

    return;
  }

  const nextPlayer =
    getNextPlayer(
      players,
      playerId,
    );

  if (!nextPlayer) {
    return;
  }

  const {
    error: turnError,
  } = await supabase
    .from(
      "minefield_rounds",
    )
    .update({
      current_player_id:
        nextPlayer.id,
      turn_ends_at:
        new Date(
          Date.now() +
            timerSeconds * 1000,
        ).toISOString(),
    })
    .eq("id", round.id)
    .eq(
      "status",
      "playing",
    );

  if (turnError) {
    throw new Error(
      `Could not change turn: ${turnError.message}`,
    );
  }
}

export async function passMinefieldTurn(
  round: MinefieldRound,
  players: RoomPlayer[],
  timerSeconds: number,
) {
  if (
    round.status !==
    "playing" ||
    !round.currentPlayerId
  ) {
    return;
  }

  const nextPlayer =
    getNextPlayer(
      players,
      round.currentPlayerId,
    );

  if (!nextPlayer) {
    return;
  }

  /*
   * Guarded by the previous
   * current_player_id so a
   * concurrent tile pick can't
   * be clobbered by a stale
   * timeout.
   */
  const { error } =
    await supabase
      .from(
        "minefield_rounds",
      )
      .update({
        current_player_id:
          nextPlayer.id,
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
        "current_player_id",
        round.currentPlayerId,
      );

  if (error) {
    throw new Error(
      `Could not pass turn: ${error.message}`,
    );
  }
}

export async function finishMinefieldGame(
  roundId: string,
  sessionId: string,
) {
  await updateRoundStatus(
    roundId,
    "finished",
  );

  await finishMinefieldSession(
    sessionId,
  );
}

export async function returnMinefieldRoomToLobby(
  roomId: string,
) {
  const {
    error,
  } = await supabase
    .from("rooms")
    .update({
      status: "lobby",
      selected_game:
        "minefield",
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}