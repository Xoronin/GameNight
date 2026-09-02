import { supabase } from "../lib/supabase";
import type {
  TriviaAnswer,
  TriviaQuestion,
  TriviaRound,
  TriviaRoundStatus,
  TriviaSessionStatus,
} from "../types/game";

export type TriviaDifficulty =
  | "mixed"
  | "easy"
  | "medium"
  | "hard";

export type TriviaSession = {
  id: string;
  roomId: string;
  difficulty: TriviaDifficulty;
  status: TriviaSessionStatus;
  createdAt: string;
  finishedAt: string | null;
};

type TriviaSessionRow = {
  id: string;
  room_id: string;
  difficulty: TriviaDifficulty;
  status: TriviaSessionStatus;
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  question_id: string;
  status: TriviaRoundStatus;
  created_at: string;
  ends_at: string;
};

type AnswerRow = {
  id: string;
  round_id: string;
  player_id: string;
  selected_index: number;
  is_correct: boolean;
  points: number;
  created_at: string;
};

type QuestionRow = {
  id: string;

  category_en: string;
  category_de: string;

  question_en: string;
  question_de: string;

  options_en: string[];
  options_de: string[];

  correct_index: number;

  difficulty:
    | "easy"
    | "medium"
    | "hard";

  active: boolean;
};

function mapSession(
  row: TriviaSessionRow,
): TriviaSession {
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
): TriviaRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    questionId: row.question_id,
    status: row.status,
    createdAt: row.created_at,
    endsAt: row.ends_at,
  };
}

function mapAnswer(
  row: AnswerRow,
): TriviaAnswer {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    selectedIndex: row.selected_index,
    isCorrect: row.is_correct,
    points: row.points,
    createdAt: row.created_at,
  };
}

function mapQuestion(
  row: QuestionRow,
  language: "en" | "de",
): TriviaQuestion {
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

    options:
      language === "de"
        ? row.options_de
        : row.options_en,

    correctIndex: row.correct_index,

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

async function getAvailableQuestions() {
  const { data, error } =
    await supabase
      .from(
        "trivia_questions",
      )
      .select("*")
      .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load Trivia questions: ${error.message}`,
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

async function updateRoundStatus(
  roundId: string,
  status: TriviaRoundStatus,
) {
  const { error } =
    await supabase
      .from(
        "trivia_rounds",
      )
      .update({
        status,
      })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not update Trivia round: ${error.message}`,
    );
  }
}

export async function createTriviaSession(
  roomId: string,
  difficulty: TriviaDifficulty,
): Promise<TriviaSession> {
  /*
   * Close any old unfinished session
   * first so a rematch starts clean.
   */
  const {
    error: closeError,
  } = await supabase
    .from(
      "trivia_sessions",
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
      `Could not close old Trivia session: ${closeError.message}`,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "trivia_sessions",
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
      `Could not create Trivia session: ${error.message}`,
    );
  }

  return mapSession(
    data as TriviaSessionRow,
  );
}

export async function getActiveTriviaSession(
  roomId: string,
): Promise<TriviaSession | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "trivia_sessions",
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
      `Could not load Trivia session: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapSession(
    data as TriviaSessionRow,
  );
}

export async function finishTriviaSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from(
        "trivia_sessions",
      )
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Trivia session: ${error.message}`,
    );
  }
}

export async function getLatestTriviaRound(
  sessionId: string,
): Promise<TriviaRound | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "trivia_rounds",
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
      `Could not load Trivia round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as RoundRow,
  );
}

export async function getTriviaAnswers(
  roundId: string,
): Promise<TriviaAnswer[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "trivia_answers",
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
      `Could not load Trivia answers: ${error.message}`,
    );
  }

  return (
    (data ?? []) as AnswerRow[]
  ).map(mapAnswer);
}

export async function getTriviaQuestion(
  questionId: string,
  language: "en" | "de",
): Promise<TriviaQuestion> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "trivia_questions",
    )
    .select("*")
    .eq("id", questionId)
    .single();

  if (error) {
    throw new Error(
      `Could not load Trivia question: ${error.message}`,
    );
  }

  return mapQuestion(
    data as QuestionRow,
    language,
  );
}

export async function getTriviaUsedQuestionIds(
  sessionId: string,
): Promise<string[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "trivia_rounds",
    )
    .select("question_id")
    .eq(
      "session_id",
      sessionId,
    );

  if (error) {
    throw new Error(
      `Could not load used Trivia questions: ${error.message}`,
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

export async function createTriviaRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  excludedQuestionIds: string[],
  language: "en" | "de",
  difficulty: TriviaDifficulty,
  timerSeconds: number,
): Promise<TriviaQuestion | null> {
  /*
   * Protect against double-clicks /
   * duplicate realtime actions.
   */
  const {
    data: existingRound,
    error: existingError,
  } = await supabase
    .from(
      "trivia_rounds",
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
      `Could not check Trivia round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    const existing =
      existingRound as RoundRow;

    return getTriviaQuestion(
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

  const {
    error: roundError,
  } = await supabase
    .from(
      "trivia_rounds",
    )
    .insert({
      room_id: roomId,
      session_id: sessionId,
      round_number: roundNumber,
      question_id:
        questionRow.id,
      status: "answering",
      ends_at:
        new Date(
          Date.now() +
            timerSeconds * 1000,
        ).toISOString(),
    });

  if (roundError) {
    throw new Error(
      `Could not create Trivia round: ${roundError.message}`,
    );
  }

  return mapQuestion(
    questionRow,
    language,
  );
}

export async function submitTriviaAnswer(
  round: TriviaRound,
  playerId: string,
  selectedIndex: number,
  correctIndex: number,
) {
  if (
    round.status !== "answering"
  ) {
    return;
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from(
      "trivia_answers",
    )
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

  const isCorrect =
    selectedIndex ===
    correctIndex;

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

  const points = isCorrect
    ? Math.min(
        1000,
        500 +
          remainingSeconds * 10,
      )
    : 0;

  const { error } =
    await supabase
      .from(
        "trivia_answers",
      )
      .insert({
        round_id: round.id,
        player_id: playerId,
        selected_index:
          selectedIndex,
        is_correct: isCorrect,
        points,
      });

  if (error) {
    throw new Error(
      `Could not submit answer: ${error.message}`,
    );
  }

  if (isCorrect) {
    await addScore(
      playerId,
      points,
    );
  }
}

export async function revealTriviaRound(
  roundId: string,
) {
  const { error } =
    await supabase
      .from(
        "trivia_rounds",
      )
      .update({
        status: "reveal",
      })
      .eq("id", roundId)
      .eq(
        "status",
        "answering",
      );

  if (error) {
    throw new Error(
      `Could not reveal Trivia round: ${error.message}`,
    );
  }
}

export async function finishTriviaGame(
  roundId: string,
  sessionId: string,
) {
  await updateRoundStatus(
    roundId,
    "finished",
  );

  await finishTriviaSession(
    sessionId,
  );
}

export async function returnTriviaRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "trivia",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
