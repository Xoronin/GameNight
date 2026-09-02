import { supabase } from "../lib/supabase";
import type {
  DrawingGuess,
  DrawingPoint,
  DrawingRound,
  DrawingRoundStatus,
  DrawingSession,
  DrawingStroke,
  DrawingWord,
} from "../types/game";
import type {
  RoomPlayer,
} from "../types/player";

type DrawingSessionRow = {
  id: string;
  room_id: string;
  status: "playing" | "finished";
  created_at: string;
  finished_at: string | null;
};

type DrawingRoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  drawer_player_id: string;
  word_id: string;
  status: DrawingRoundStatus;
  started_at: string;
  ends_at: string;
  created_at: string;
};

type DrawingStrokeRow = {
  id: string;
  round_id: string;
  player_id: string;
  points: DrawingPoint[];
  line_width: number;
  created_at: string;
};

type DrawingGuessRow = {
  id: string;
  round_id: string;
  player_id: string;
  guess: string;
  is_correct: boolean;
  points: number;
  created_at: string;
};

type DrawingWordRow = {
  id: string;
  word_en: string;
  word_de: string;
  category_en: string;
  category_de: string;
  difficulty:
    | "easy"
    | "medium"
    | "hard";
  active: boolean;
};

function mapSession(
  row: DrawingSessionRow,
): DrawingSession {
  return {
    id: row.id,
    roomId: row.room_id,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

function mapRound(
  row: DrawingRoundRow,
): DrawingRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    drawerPlayerId:
      row.drawer_player_id,
    wordId: row.word_id,
    status: row.status,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

function mapStroke(
  row: DrawingStrokeRow,
): DrawingStroke {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    points: row.points,
    lineWidth: Number(
      row.line_width,
    ),
    createdAt: row.created_at,
  };
}

function mapGuess(
  row: DrawingGuessRow,
): DrawingGuess {
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

function mapWord(
  row: DrawingWordRow,
  language: "en" | "de",
): DrawingWord {
  return {
    id: row.id,

    word:
      language === "de"
        ? row.word_de
        : row.word_en,

    category:
      language === "de"
        ? row.category_de
        : row.category_en,

    difficulty:
      row.difficulty,
  };
}

function normalize(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

export async function createDrawingSession(
  roomId: string,
): Promise<DrawingSession> {
  const {
    error: closeError,
  } = await supabase
    .from("drawing_sessions")
    .update({
      status: "finished",
      finished_at:
        new Date().toISOString(),
    })
    .eq("room_id", roomId)
    .eq("status", "playing");

  if (closeError) {
    throw new Error(
      `Could not close previous Drawing session: ${closeError.message}`,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("drawing_sessions")
    .insert({
      room_id: roomId,
      status: "playing",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Drawing session: ${error.message}`,
    );
  }

  return mapSession(
    data as DrawingSessionRow,
  );
}

export async function getActiveDrawingSession(
  roomId: string,
): Promise<DrawingSession | null> {
  const {
    data,
    error,
  } = await supabase
    .from("drawing_sessions")
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
      `Could not load Drawing session: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapSession(
    data as DrawingSessionRow,
  );
}

export async function getLatestDrawingRound(
  sessionId: string,
): Promise<DrawingRound | null> {
  const {
    data,
    error,
  } = await supabase
    .from("drawing_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .order("round_number", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Drawing round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as DrawingRoundRow,
  );
}

async function getUsedWordIds(
  sessionId: string,
): Promise<string[]> {
  const {
    data,
    error,
  } = await supabase
    .from("drawing_rounds")
    .select("word_id")
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(
      `Could not load used Drawing words: ${error.message}`,
    );
  }

  return (data ?? [])
    .map(
      (row) =>
        row.word_id as string,
    )
    .filter(Boolean);
}

async function pickDrawingWord(
  sessionId: string,
): Promise<DrawingWordRow> {
  const usedIds =
    await getUsedWordIds(
      sessionId,
    );

  const {
    data,
    error,
  } = await supabase
    .from("drawing_words")
    .select("*")
    .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load Drawing words: ${error.message}`,
    );
  }

  const words =
    (data ?? []) as DrawingWordRow[];

  if (words.length === 0) {
    throw new Error(
      "No Drawing words are available.",
    );
  }

  const unused =
    words.filter(
      (word) =>
        !usedIds.includes(
          word.id,
        ),
    );

  const pool =
    unused.length > 0
      ? unused
      : words;

  return pool[
    Math.floor(
      Math.random() *
        pool.length,
    )
  ];
}

export async function createDrawingRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  players: RoomPlayer[],
  timerSeconds: number,
): Promise<DrawingRound> {
  if (
    players.length < 2
  ) {
    throw new Error(
      "Draw & Guess requires at least 2 players.",
    );
  }

  const drawer =
    players[
      (roundNumber - 1) %
        players.length
    ];

  if (!drawer?.id) {
    throw new Error(
      "Could not determine the drawing player.",
    );
  }

  const {
    data: existingRound,
    error: existingError,
  } = await supabase
    .from("drawing_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq(
      "round_number",
      roundNumber,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check Drawing round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    return mapRound(
      existingRound as DrawingRoundRow,
    );
  }

  const word =
    await pickDrawingWord(
      sessionId,
    );

  const startedAt =
    new Date();

  const endsAt =
    new Date(
      startedAt.getTime() +
        timerSeconds *
          1000,
    );

  const {
    data,
    error,
  } = await supabase
    .from("drawing_rounds")
    .insert({
      room_id: roomId,
      session_id: sessionId,
      round_number:
        roundNumber,
      drawer_player_id:
        drawer.id,
      word_id: word.id,
      status: "drawing",
      started_at:
        startedAt.toISOString(),
      ends_at:
        endsAt.toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Drawing round: ${error.message}`,
    );
  }

  return mapRound(
    data as DrawingRoundRow,
  );
}

export async function getDrawingWord(
  wordId: string,
  language: "en" | "de",
): Promise<DrawingWord> {
  const {
    data,
    error,
  } = await supabase
    .from("drawing_words")
    .select("*")
    .eq("id", wordId)
    .single();

  if (error) {
    throw new Error(
      `Could not load Drawing word: ${error.message}`,
    );
  }

  return mapWord(
    data as DrawingWordRow,
    language,
  );
}

export async function getDrawingStrokes(
  roundId: string,
): Promise<DrawingStroke[]> {
  const {
    data,
    error,
  } = await supabase
    .from("drawing_strokes")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load drawing strokes: ${error.message}`,
    );
  }

  return (
    (data ?? []) as DrawingStrokeRow[]
  ).map(mapStroke);
}

export async function addDrawingStroke(
  roundId: string,
  playerId: string,
  points: DrawingPoint[],
  lineWidth: number,
) {
  if (
    points.length < 2
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("drawing_strokes")
      .insert({
        round_id: roundId,
        player_id:
          playerId,
        points,
        line_width:
          lineWidth,
      });

  if (error) {
    throw new Error(
      `Could not save drawing stroke: ${error.message}`,
    );
  }
}

export async function clearDrawing(
  roundId: string,
) {
  const { error } =
    await supabase
      .from("drawing_strokes")
      .delete()
      .eq("round_id", roundId);

  if (error) {
    throw new Error(
      `Could not clear drawing: ${error.message}`,
    );
  }
}

export async function getDrawingGuesses(
  roundId: string,
): Promise<DrawingGuess[]> {
  const {
    data,
    error,
  } = await supabase
    .from("drawing_guesses")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load guesses: ${error.message}`,
    );
  }

  return (
    (data ?? []) as DrawingGuessRow[]
  ).map(mapGuess);
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

export async function submitDrawingGuess(
  round: DrawingRound,
  playerId: string,
  guess: string,
  language: "en" | "de",
) {
  const cleaned =
    guess.trim();

  if (!cleaned) {
    return;
  }

  if (
    playerId ===
    round.drawerPlayerId
  ) {
    return;
  }

  const previousGuesses =
    await getDrawingGuesses(
      round.id,
    );

  const alreadyCorrect =
    previousGuesses.some(
      (item) =>
        item.playerId ===
          playerId &&
        item.isCorrect,
    );

  if (alreadyCorrect) {
    return;
  }

  const word =
    await getDrawingWord(
      round.wordId,
      language,
    );

  const isCorrect =
    normalize(cleaned) ===
    normalize(word.word);

  let points = 0;

  if (isCorrect) {
    const remainingSeconds =
      Math.max(
        0,
        Math.ceil(
          (
            new Date(
              round.endsAt,
            ).getTime() -
            Date.now()
          ) / 1000,
        ),
      );

    points =
      Math.max(
        250,
        500 +
          remainingSeconds *
            5,
      );
  }

  const { error } =
    await supabase
      .from("drawing_guesses")
      .insert({
        round_id:
          round.id,
        player_id:
          playerId,
        guess: cleaned,
        is_correct:
          isCorrect,
        points,
      });

  if (error) {
    throw new Error(
      `Could not submit guess: ${error.message}`,
    );
  }

  if (isCorrect) {
    await addScore(
      playerId,
      points,
    );

    await addScore(
      round.drawerPlayerId,
      250,
    );
  }
}

export async function revealDrawingRound(
  roundId: string,
) {
  const { error } =
    await supabase
      .from("drawing_rounds")
      .update({
        status: "reveal",
      })
      .eq("id", roundId)
      .eq("status", "drawing");

  if (error) {
    throw new Error(
      `Could not reveal Drawing round: ${error.message}`,
    );
  }
}

export async function finishDrawingGame(
  roundId: string,
  sessionId: string,
) {
  const {
    error: roundError,
  } = await supabase
    .from("drawing_rounds")
    .update({
      status: "finished",
    })
    .eq("id", roundId);

  if (roundError) {
    throw new Error(
      `Could not finish Drawing round: ${roundError.message}`,
    );
  }

  const {
    error: sessionError,
  } = await supabase
    .from("drawing_sessions")
    .update({
      status: "finished",
      finished_at:
        new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (sessionError) {
    throw new Error(
      `Could not finish Drawing session: ${sessionError.message}`,
    );
  }
}

export async function returnDrawingToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game: null,
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return Drawing game to lobby: ${error.message}`,
    );
  }
}