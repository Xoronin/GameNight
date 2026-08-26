import { supabase } from "../lib/supabase";
import type {
  BluffAnswer,
  BluffRound,
  BluffRoundStatus,
  BluffVote,
} from "../types/game";

type BluffRoundRow = {
  id: string;
  room_id: string;
  round_number: number;
  question_id: string;
  status: BluffRoundStatus;
  created_at: string;
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

function mapRound(row: BluffRoundRow): BluffRound {
  return {
    id: row.id,
    roomId: row.room_id,
    roundNumber: row.round_number,
    questionId: row.question_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapAnswer(row: BluffAnswerRow): BluffAnswer {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    text: row.text,
    isCorrect: row.is_correct,
    createdAt: row.created_at,
  };
}

function mapVote(row: BluffVoteRow): BluffVote {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    answerId: row.answer_id,
    createdAt: row.created_at,
  };
}

export async function getLatestBluffRound(
  roomId: string,
): Promise<BluffRound | null> {
  const { data, error } = await supabase
    .from("bluff_rounds")
    .select("*")
    .eq("room_id", roomId)
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

  return mapRound(data as BluffRoundRow);
}

export async function getBluffAnswers(
  roundId: string,
): Promise<BluffAnswer[]> {
  const { data, error } = await supabase
    .from("bluff_answers")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load Bluff answers: ${error.message}`,
    );
  }

  return (data as BluffAnswerRow[]).map(mapAnswer);
}

export async function getBluffVotes(
  roundId: string,
): Promise<BluffVote[]> {
  const { data, error } = await supabase
    .from("bluff_votes")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load Bluff votes: ${error.message}`,
    );
  }

  return (data as BluffVoteRow[]).map(mapVote);
}

export async function createBluffRound(
  roomId: string,
  roundNumber: number,
  questionId: string,
  correctAnswer: string,
): Promise<BluffRound> {
  const { data: existingRound } = await supabase
    .from("bluff_rounds")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .maybeSingle();

  if (existingRound) {
    return mapRound(existingRound as BluffRoundRow);
  }

  const { data, error } = await supabase
    .from("bluff_rounds")
    .insert({
      room_id: roomId,
      round_number: roundNumber,
      question_id: questionId,
      status: "answering",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Bluff round: ${error.message}`,
    );
  }

  const round = mapRound(data as BluffRoundRow);

  const { error: answerError } = await supabase
    .from("bluff_answers")
    .insert({
      round_id: round.id,
      player_id: null,
      text: correctAnswer,
      is_correct: true,
    });

  if (answerError) {
    throw new Error(
      `Could not add real answer: ${answerError.message}`,
    );
  }

  return round;
}

export async function submitBluffAnswer(
  roundId: string,
  playerId: string,
  text: string,
) {
  const cleaned = text.trim();

  if (!cleaned) {
    throw new Error("Please enter an answer.");
  }

  const { data: existing } = await supabase
    .from("bluff_answers")
    .select("id")
    .eq("round_id", roundId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    throw new Error(
      "You already submitted an answer this round.",
    );
  }

  const { error } = await supabase
    .from("bluff_answers")
    .insert({
      round_id: roundId,
      player_id: playerId,
      text: cleaned,
      is_correct: false,
    });

  if (error) {
    throw new Error(
      `Could not submit answer: ${error.message}`,
    );
  }
}

export async function changeBluffRoundStatus(
  roundId: string,
  status: BluffRoundStatus,
) {
  const { error } = await supabase
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

export async function submitBluffVote(
  roundId: string,
  playerId: string,
  answerId: string,
) {
  const { data: existing } = await supabase
    .from("bluff_votes")
    .select("id")
    .eq("round_id", roundId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existing) {
    throw new Error(
      "You already voted this round.",
    );
  }

  const { error } = await supabase
    .from("bluff_votes")
    .insert({
      round_id: roundId,
      player_id: playerId,
      answer_id: answerId,
    });

  if (error) {
    throw new Error(
      `Could not submit vote: ${error.message}`,
    );
  }
}

export async function revealBluffRound(
  round: BluffRound,
  answers: BluffAnswer[],
  votes: BluffVote[],
) {
  if (round.status !== "voting") {
    return;
  }

  const correctAnswer = answers.find(
    (answer) => answer.isCorrect,
  );

  if (!correctAnswer) {
    throw new Error("Real answer is missing.");
  }

  const scoreChanges = new Map<string, number>();

  for (const vote of votes) {
    if (vote.answerId === correctAnswer.id) {
      scoreChanges.set(
        vote.playerId,
        (scoreChanges.get(vote.playerId) ?? 0) + 1000,
      );
    }
  }

  for (const answer of answers) {
    if (answer.isCorrect || !answer.playerId) {
      continue;
    }

    const fooledPlayers = votes.filter(
      (vote) =>
        vote.answerId === answer.id &&
        vote.playerId !== answer.playerId,
    );

    if (fooledPlayers.length > 0) {
      scoreChanges.set(
        answer.playerId,
        (scoreChanges.get(answer.playerId) ?? 0) +
          fooledPlayers.length * 500,
      );
    }
  }

  for (const [playerId, points] of scoreChanges) {
    const { data: player, error: playerError } =
      await supabase
        .from("players")
        .select("score")
        .eq("id", playerId)
        .single();

    if (playerError) {
      throw playerError;
    }

    const { error: updateError } = await supabase
      .from("players")
      .update({
        score: (player.score ?? 0) + points,
      })
      .eq("id", playerId);

    if (updateError) {
      throw updateError;
    }
  }

  await changeBluffRoundStatus(
    round.id,
    "reveal",
  );
}

export async function finishBluffGame(
  roundId: string,
) {
  await changeBluffRoundStatus(
    roundId,
    "finished",
  );
}

export async function returnBluffRoomToLobby(
  roomId: string,
) {
  const { error } = await supabase
    .from("rooms")
    .update({
      status: "lobby",
      selected_game: "bluff",
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}