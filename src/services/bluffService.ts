import { supabase } from "../lib/supabase";
import type {
  BluffAnswer,
  BluffRound,
  BluffRoundStatus,
  BluffVote,
} from "../types/game";

export type BluffSessionRow = {
  id: string;
  room_id: string;
  status: "playing" | "finished";
  created_at: string;
  finished_at: string | null;
};

type BluffRoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  question_id: string;
  status: BluffRoundStatus;
  created_at: string;
  ends_at: string;
};

type BluffAnswerRow = {
  id: string;
  round_id: string;
  player_id: string | null;
  text: string;
  is_correct: boolean;
  created_at: string;
};

type BluffVoteRow = {
  id: string;
  round_id: string;
  player_id: string;
  answer_id: string;
  created_at: string;
};

function mapRound(
  row: BluffRoundRow,
): BluffRound {
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
  row: BluffAnswerRow,
): BluffAnswer {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    text: row.text,
    isCorrect: row.is_correct,
    createdAt: row.created_at,
  };
}

function mapVote(
  row: BluffVoteRow,
): BluffVote {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    answerId: row.answer_id,
    createdAt: row.created_at,
  };
}

/*
 * ----------------------------------------------------------------
 * BLUFF SESSION
 * ----------------------------------------------------------------
 */

export async function createBluffSession(
  roomId: string,
) {
  /*
   * Finish any old session that may still
   * incorrectly be marked as playing.
   *
   * This makes starting a rematch safer.
   */
  const {
    error: finishOldError,
  } = await supabase
    .from("bluff_sessions")
    .update({
      status: "finished",
      finished_at:
        new Date().toISOString(),
    })
    .eq("room_id", roomId)
    .eq("status", "playing");

  if (finishOldError) {
    throw new Error(
      `Could not close previous Bluff session: ${finishOldError.message}`,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("bluff_sessions")
    .insert({
      room_id: roomId,
      status: "playing",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Bluff session: ${error.message}`,
    );
  }

  return data as BluffSessionRow;
}

export async function getActiveBluffSession(
  roomId: string,
): Promise<BluffSessionRow | null> {
  const {
    data,
    error,
  } = await supabase
    .from("bluff_sessions")
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
      `Could not load Bluff session: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return data as BluffSessionRow;
}

export async function finishBluffSession(
  sessionId: string,
) {
  const {
    error,
  } = await supabase
    .from("bluff_sessions")
    .update({
      status: "finished",
      finished_at:
        new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Bluff session: ${error.message}`,
    );
  }
}

/*
 * ----------------------------------------------------------------
 * BLUFF ROUND
 * ----------------------------------------------------------------
 */

export async function getLatestBluffRound(
  sessionId: string,
): Promise<BluffRound | null> {
  const {
    data,
    error,
  } = await supabase
    .from("bluff_rounds")
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
      `Could not load Bluff round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as BluffRoundRow,
  );
}

export async function createBluffRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  questionId: string,
  correctAnswer: string,
  timerSeconds: number,
): Promise<BluffRound> {
  const {
    data: existingRound,
    error: existingError,
  } = await supabase
    .from("bluff_rounds")
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
      `Could not check Bluff round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    return mapRound(
      existingRound as BluffRoundRow,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("bluff_rounds")
    .insert({
      session_id:
        sessionId,
      room_id:
        roomId,
      round_number:
        roundNumber,
      question_id:
        questionId,
      status:
        "answering",
      ends_at:
        new Date(
          Date.now() +
            timerSeconds * 1000,
        ).toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Bluff round: ${error.message}`,
    );
  }

  const round =
    mapRound(
      data as BluffRoundRow,
    );

  const {
    error: answerError,
  } = await supabase
    .from("bluff_answers")
    .insert({
      round_id:
        round.id,
      player_id:
        null,
      text:
        correctAnswer,
      is_correct:
        true,
    });

  if (answerError) {
    /*
     * Clean up the round if the correct
     * answer could not be created.
     */
    await supabase
      .from("bluff_rounds")
      .delete()
      .eq("id", round.id);

    throw new Error(
      `Could not add real answer: ${answerError.message}`,
    );
  }

  return round;
}

export async function changeBluffRoundStatus(
  roundId: string,
  status: BluffRoundStatus,
) {
  const {
    error,
  } = await supabase
    .from("bluff_rounds")
    .update({
      status,
    })
    .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not change round: ${error.message}`,
    );
  }
}

/*
 * ----------------------------------------------------------------
 * ANSWERS
 * ----------------------------------------------------------------
 */

export async function getBluffAnswers(
  roundId: string,
): Promise<BluffAnswer[]> {
  const {
    data,
    error,
  } = await supabase
    .from("bluff_answers")
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
      `Could not load Bluff answers: ${error.message}`,
    );
  }

  return (
    data as BluffAnswerRow[]
  ).map(mapAnswer);
}

export async function submitBluffAnswer(
  roundId: string,
  playerId: string,
  text: string,
) {
  const cleaned =
    text.trim();

  if (!cleaned) {
    throw new Error(
      "Please enter an answer.",
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("bluff_answers")
    .select("id")
    .eq(
      "round_id",
      roundId,
    )
    .eq(
      "player_id",
      playerId,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check existing answer: ${existingError.message}`,
    );
  }

  if (existing) {
    throw new Error(
      "You already submitted an answer this round.",
    );
  }

  const {
    error,
  } = await supabase
    .from("bluff_answers")
    .insert({
      round_id:
        roundId,
      player_id:
        playerId,
      text:
        cleaned,
      is_correct:
        false,
    });

  if (error) {
    throw new Error(
      `Could not submit answer: ${error.message}`,
    );
  }
}

/*
 * ----------------------------------------------------------------
 * VOTES
 * ----------------------------------------------------------------
 */

export async function getBluffVotes(
  roundId: string,
): Promise<BluffVote[]> {
  const {
    data,
    error,
  } = await supabase
    .from("bluff_votes")
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
      `Could not load Bluff votes: ${error.message}`,
    );
  }

  return (
    data as BluffVoteRow[]
  ).map(mapVote);
}

export async function submitBluffVote(
  roundId: string,
  playerId: string,
  answerId: string,
) {
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("bluff_votes")
    .select("id")
    .eq(
      "round_id",
      roundId,
    )
    .eq(
      "player_id",
      playerId,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check existing vote: ${existingError.message}`,
    );
  }

  if (existing) {
    throw new Error(
      "You already voted this round.",
    );
  }

  const {
    error,
  } = await supabase
    .from("bluff_votes")
    .insert({
      round_id:
        roundId,
      player_id:
        playerId,
      answer_id:
        answerId,
    });

  if (error) {
    throw new Error(
      `Could not submit vote: ${error.message}`,
    );
  }
}

/*
 * ----------------------------------------------------------------
 * SCORING / REVEAL
 * ----------------------------------------------------------------
 */

export async function revealBluffRound(
  round: BluffRound,
  answers: BluffAnswer[],
  votes: BluffVote[],
) {
  if (
    round.status !==
    "voting"
  ) {
    return;
  }

  const correctAnswer =
    answers.find(
      (answer) =>
        answer.isCorrect,
    );

  if (!correctAnswer) {
    throw new Error(
      "Real answer is missing.",
    );
  }

  const scoreChanges =
    new Map<
      string,
      number
    >();

  /*
   * +1000 for choosing the real answer.
   */
  for (
    const vote of votes
  ) {
    if (
      vote.answerId ===
      correctAnswer.id
    ) {
      scoreChanges.set(
        vote.playerId,
        (
          scoreChanges.get(
            vote.playerId,
          ) ?? 0
        ) + 1000,
      );
    }
  }

  /*
   * +500 for every other player
   * fooled by your fake answer.
   */
  for (
    const answer of answers
  ) {
    if (
      answer.isCorrect ||
      !answer.playerId
    ) {
      continue;
    }

    const fooledPlayers =
      votes.filter(
        (vote) =>
          vote.answerId ===
            answer.id &&
          vote.playerId !==
            answer.playerId,
      );

    if (
      fooledPlayers.length >
      0
    ) {
      scoreChanges.set(
        answer.playerId,
        (
          scoreChanges.get(
            answer.playerId,
          ) ?? 0
        ) +
          fooledPlayers.length *
            500,
      );
    }
  }

  for (
    const [
      playerId,
      points,
    ] of scoreChanges
  ) {
    const {
      data: player,
      error: playerError,
    } = await supabase
      .from("players")
      .select("score")
      .eq(
        "id",
        playerId,
      )
      .single();

    if (playerError) {
      throw new Error(
        `Could not load player score: ${playerError.message}`,
      );
    }

    const {
      error: updateError,
    } = await supabase
      .from("players")
      .update({
        score:
          (player.score ??
            0) +
          points,
      })
      .eq(
        "id",
        playerId,
      );

    if (updateError) {
      throw new Error(
        `Could not update player score: ${updateError.message}`,
      );
    }
  }

  await changeBluffRoundStatus(
    round.id,
    "reveal",
  );
}

/*
 * ----------------------------------------------------------------
 * GAME END
 * ----------------------------------------------------------------
 */

export async function finishBluffGame(
  roundId: string,
  sessionId?: string,
) {
  await changeBluffRoundStatus(
    roundId,
    "finished",
  );

  if (sessionId) {
    await finishBluffSession(
      sessionId,
    );
  }
}

export async function returnBluffRoomToLobby(
  roomId: string,
) {
  const {
    error,
  } = await supabase
    .from("rooms")
    .update({
      status: "lobby",
      selected_game: null,
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}

/*
 * ----------------------------------------------------------------
 * RANDOM QUESTION SUPPORT
 * ----------------------------------------------------------------
 */

export async function getBluffUsedQuestionIds(
  sessionId: string,
): Promise<string[]> {
  const {
    data,
    error,
  } = await supabase
    .from("bluff_rounds")
    .select("question_id")
    .eq(
      "session_id",
      sessionId,
    );

  if (error) {
    throw new Error(
      `Could not load used Bluff questions: ${error.message}`,
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