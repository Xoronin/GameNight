import { supabase } from "../lib/supabase";
import type {
  FriendsAnswer,
  FriendsQuestion,
  FriendsRound,
  FriendsRoundStatus,
  FriendsSessionStatus,
} from "../types/game";

/*
 * Know Your Friends: one player answers a question about themselves while
 * everyone else predicts what they said.
 *
 * Both sides are the same shape — a player and the option they picked — so
 * they share a table and are told apart by isSubject. Everyone acts in one
 * window rather than in two phases: the subject's pick is simply hidden
 * until the reveal, which keeps it to a single timer and nobody waiting.
 */

/** A correct prediction. Flat, because this is not a race. */
export const PREDICTION_POINTS = 500;

/*
 * What the subject earns per player who read them right. Being known is
 * worth something, and it stops the subject from picking an answer purely
 * to be unguessable.
 */
export const SUBJECT_POINTS_EACH = 150;

export type FriendsSession = {
  id: string;
  roomId: string;
  status: FriendsSessionStatus;
  createdAt: string;
  finishedAt: string | null;
};

type SessionRow = {
  id: string;
  room_id: string;
  status: FriendsSessionStatus;
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  question_id: string;
  subject_player_id: string;
  status: FriendsRoundStatus;
  created_at: string;
  ends_at: string;
};

type AnswerRow = {
  id: string;
  round_id: string;
  player_id: string;
  selected_index: number;
  is_subject: boolean;
  is_correct: boolean;
  points: number;
  created_at: string;
};

type QuestionRow = {
  id: string;
  prompt_en: string;
  prompt_de: string;
  options_en: string[];
  options_de: string[];
};

function mapSession(
  row: SessionRow,
): FriendsSession {
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
): FriendsRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    questionId: row.question_id,
    subjectPlayerId:
      row.subject_player_id,
    status: row.status,
    createdAt: row.created_at,
    endsAt: row.ends_at,
  };
}

function mapAnswer(
  row: AnswerRow,
): FriendsAnswer {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    selectedIndex:
      row.selected_index,
    isSubject: row.is_subject,
    isCorrect: row.is_correct,
    points: row.points,
    createdAt: row.created_at,
  };
}

export function mapQuestion(
  row: QuestionRow,
  language: "en" | "de",
): FriendsQuestion {
  return {
    id: row.id,
    prompt:
      language === "de"
        ? row.prompt_de
        : row.prompt_en,
    options:
      language === "de"
        ? row.options_de
        : row.options_en,
  };
}

/** Puts the subject's name into the prompt's placeholder. */
export function askAbout(
  prompt: string,
  name: string,
): string {
  return prompt.replaceAll(
    "{name}",
    name,
  );
}

/*
 * Whose round it is. Rotating by round number rather than picking at
 * random means everyone is the subject before anyone is twice, which is
 * the whole point of the game.
 */
export function subjectFor(
  roundNumber: number,
  playerIds: string[],
): string | null {
  if (playerIds.length === 0) {
    return null;
  }

  return playerIds[
    (roundNumber - 1) %
      playerIds.length
  ]!;
}

/** What a round is worth to everyone once the subject's answer is known. */
export function scoreRound(
  answers: FriendsAnswer[],
): Record<string, number> {
  const subject = answers.find(
    (answer) => answer.isSubject,
  );

  const points: Record<
    string,
    number
  > = {};

  if (!subject) {
    return points;
  }

  const readers = answers.filter(
    (answer) =>
      !answer.isSubject &&
      answer.selectedIndex ===
        subject.selectedIndex,
  );

  for (const reader of readers) {
    points[reader.playerId] =
      PREDICTION_POINTS;
  }

  if (readers.length > 0) {
    points[subject.playerId] =
      readers.length *
      SUBJECT_POINTS_EACH;
  }

  return points;
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

export async function createFriendsSession(
  roomId: string,
): Promise<FriendsSession> {
  const { error: closeError } =
    await supabase
      .from("friends_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("status", "playing");

  if (closeError) {
    throw new Error(
      `Could not close old Friends session: ${closeError.message}`,
    );
  }

  const { data, error } =
    await supabase
      .from("friends_sessions")
      .insert({
        room_id: roomId,
        status: "playing",
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Friends session: ${error.message}`,
    );
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function getActiveFriendsSession(
  roomId: string,
): Promise<FriendsSession | null> {
  const { data, error } =
    await supabase
      .from("friends_sessions")
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
      `Could not load Friends session: ${error.message}`,
    );
  }

  return data
    ? mapSession(
        data as SessionRow,
      )
    : null;
}

async function finishFriendsSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("friends_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Friends session: ${error.message}`,
    );
  }
}

export async function getLatestFriendsRound(
  sessionId: string,
): Promise<FriendsRound | null> {
  const { data, error } =
    await supabase
      .from("friends_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Friends round: ${error.message}`,
    );
  }

  return data
    ? mapRound(data as RoundRow)
    : null;
}

/*
 * Every answer for the round, the subject's own included. The screen only
 * shows theirs once the round is revealed, but it is on the client before
 * then, so a player with the console open could look. Hiding it for real
 * needs a row-level policy rather than a filter here — the room's tables
 * are all `using (true)` today — and that is a change for every game at
 * once, not this one.
 */
export async function getFriendsAnswers(
  roundId: string,
): Promise<FriendsAnswer[]> {
  const { data, error } =
    await supabase
      .from("friends_answers")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Could not load Friends answers: ${error.message}`,
    );
  }

  return (
    (data as AnswerRow[]) ?? []
  ).map(mapAnswer);
}

export async function getFriendsQuestion(
  questionId: string,
  language: "en" | "de",
): Promise<FriendsQuestion | null> {
  const { data, error } =
    await supabase
      .from("friends_questions")
      .select("*")
      .eq("id", questionId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Friends question: ${error.message}`,
    );
  }

  return data
    ? mapQuestion(
        data as QuestionRow,
        language,
      )
    : null;
}

export async function getFriendsUsedQuestionIds(
  sessionId: string,
): Promise<string[]> {
  const { data, error } =
    await supabase
      .from("friends_rounds")
      .select("question_id")
      .eq("session_id", sessionId);

  if (error) {
    throw new Error(
      `Could not load used Friends questions: ${error.message}`,
    );
  }

  return (
    (data as {
      question_id: string;
    }[]) ?? []
  ).map((row) => row.question_id);
}

export async function createFriendsRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  excludedQuestionIds: string[],
  playerIds: string[],
  language: "en" | "de",
  timerSeconds: number,
): Promise<FriendsQuestion | null> {
  const {
    data: existingRound,
    error: existingError,
  } = await supabase
    .from("friends_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq(
      "round_number",
      roundNumber,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check Friends round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    return getFriendsQuestion(
      (existingRound as RoundRow)
        .question_id,
      language,
    );
  }

  const subject = subjectFor(
    roundNumber,
    playerIds,
  );

  if (!subject) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("friends_questions")
      .select("*")
      .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load Friends questions: ${error.message}`,
    );
  }

  const questions = (
    (data as QuestionRow[]) ?? []
  ).filter(
    (question) =>
      !excludedQuestionIds.includes(
        question.id,
      ),
  );

  if (questions.length === 0) {
    return null;
  }

  const chosen =
    questions[
      Math.floor(
        Math.random() *
          questions.length,
      )
    ]!;

  const endsAt = new Date(
    Date.now() +
      timerSeconds * 1000,
  ).toISOString();

  const { error: insertError } =
    await supabase
      .from("friends_rounds")
      .insert({
        session_id: sessionId,
        room_id: roomId,
        round_number: roundNumber,
        question_id: chosen.id,
        subject_player_id: subject,
        status: "answering",
        ends_at: endsAt,
      });

  if (insertError) {
    throw new Error(
      `Could not create Friends round: ${insertError.message}`,
    );
  }

  return mapQuestion(
    chosen,
    language,
  );
}

export async function submitFriendsAnswer(
  round: FriendsRound,
  playerId: string,
  selectedIndex: number,
) {
  if (
    round.status !== "answering"
  ) {
    return;
  }

  const { error } = await supabase
    .from("friends_answers")
    .insert({
      round_id: round.id,
      player_id: playerId,
      selected_index: selectedIndex,
      is_subject:
        playerId ===
        round.subjectPlayerId,
    });

  if (error) {
    /* Already answered; the unique index says so. */
    if (error.code === "23505") {
      return;
    }

    throw new Error(
      `Could not submit answer: ${error.message}`,
    );
  }
}

/*
 * Scoring happens here rather than on submit, because a prediction cannot
 * be graded until the subject has answered — and they might answer last.
 *
 * The host can reach this twice for one round — everyone answers just as
 * the clock runs out — so it has to be safe to run again. It scores only
 * rows still sitting at zero and gives up if the round has already moved
 * on, which is what keeps a player from being paid twice.
 */
export async function revealFriendsRound(
  roundId: string,
) {
  const {
    data: roundRow,
    error: roundError,
  } = await supabase
    .from("friends_rounds")
    .select("status")
    .eq("id", roundId)
    .maybeSingle();

  if (roundError) {
    throw new Error(
      `Could not load Friends round: ${roundError.message}`,
    );
  }

  if (
    (
      roundRow as {
        status: FriendsRoundStatus;
      } | null
    )?.status !== "answering"
  ) {
    return;
  }

  const answers =
    await getFriendsAnswers(
      roundId,
    );

  const points = scoreRound(answers);

  for (const answer of answers) {
    /* Already paid for this round on an earlier pass. */
    if (answer.points > 0) {
      continue;
    }

    const earned =
      points[answer.playerId] ?? 0;

    const { error } = await supabase
      .from("friends_answers")
      .update({
        is_correct:
          !answer.isSubject &&
          earned > 0,
        points: earned,
      })
      .eq("id", answer.id);

    if (error) {
      throw new Error(
        `Could not score answer: ${error.message}`,
      );
    }

    if (earned > 0) {
      await addScore(
        answer.playerId,
        earned,
      );
    }
  }

  const { error } = await supabase
    .from("friends_rounds")
    .update({ status: "reveal" })
    .eq("id", roundId)
    .eq("status", "answering");

  if (error) {
    throw new Error(
      `Could not reveal Friends round: ${error.message}`,
    );
  }
}

export async function finishFriendsGame(
  roundId: string,
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("friends_rounds")
      .update({ status: "finished" })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not finish Friends round: ${error.message}`,
    );
  }

  await finishFriendsSession(
    sessionId,
  );
}

export async function returnFriendsRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "know-your-friends",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
