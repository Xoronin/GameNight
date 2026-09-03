import { supabase } from "../lib/supabase";
import type {
  CategoriesAnswer,
  CategoriesRound,
  CategoriesRoundStatus,
  CategoriesVote,
} from "../types/game";

type CategoriesRoundRow = {
  id: string;
  room_id: string;
  round_number: number;
  letter: string;
  status: CategoriesRoundStatus;
  created_at: string;
  scores_applied: boolean;
  ends_at: string;
};

type CategoriesAnswerRow = {
  id: string;
  round_id: string;
  player_id: string;
  category_key: string;
  answer: string;
  created_at: string;
  points: number;
};

type CategoriesVoteRow = {
  id: string;
  round_id: string;
  answer_id: string;
  player_id: string;
  created_at: string;
};

function mapRound(
  row: CategoriesRoundRow,
): CategoriesRound {
  return {
    id: row.id,
    roomId: row.room_id,
    roundNumber: row.round_number,
    letter: row.letter,
    status: row.status,
    createdAt: row.created_at,
    scoresApplied:
      row.scores_applied,
    endsAt: row.ends_at,
  };
}

function mapAnswer(
  row: CategoriesAnswerRow,
): CategoriesAnswer {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    categoryKey: row.category_key,
    answer: row.answer,
    createdAt: row.created_at,
    points: row.points,
  };
}

function mapVote(
  row: CategoriesVoteRow,
): CategoriesVote {
  return {
    id: row.id,
    roundId: row.round_id,
    answerId: row.answer_id,
    playerId: row.player_id,
    createdAt: row.created_at,
  };
}

export async function getLatestCategoriesRound(
  roomId: string,
): Promise<CategoriesRound | null> {
  const { data, error } = await supabase
    .from("categories_rounds")
    .select("*")
    .eq("room_id", roomId)
    .order("round_number", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Categories round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as CategoriesRoundRow,
  );
}

export async function getCategoriesAnswers(
  roundId: string,
): Promise<CategoriesAnswer[]> {
  const { data, error } = await supabase
    .from("categories_answers")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load Categories answers: ${error.message}`,
    );
  }

  return (
    data as CategoriesAnswerRow[]
  ).map(mapAnswer);
}

export async function createCategoriesRound(
  roomId: string,
  roundNumber: number,
  letter: string,
  timerSeconds: number,
) {
  const { data: existing } = await supabase
    .from("categories_rounds")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .maybeSingle();

  if (existing) {
    return mapRound(
      existing as CategoriesRoundRow,
    );
  }

  const { data, error } = await supabase
    .from("categories_rounds")
    .insert({
      room_id: roomId,
      round_number: roundNumber,
      letter,
      status: "answering",
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
      `Could not create Categories round: ${error.message}`,
    );
  }

  return mapRound(
    data as CategoriesRoundRow,
  );
}

export async function submitCategoriesAnswers(
  roundId: string,
  playerId: string,
  answers: Record<string, string>,
) {
  const rows = Object.entries(answers)
    .map(([categoryKey, answer]) => ({
      round_id: roundId,
      player_id: playerId,
      category_key: categoryKey,
      answer: answer.trim(),
    }))
    .filter((row) => row.answer.length > 0);

  if (rows.length === 0) {
    throw new Error(
      "Enter at least one answer.",
    );
  }

  const { data: existing, error: existingError } =
    await supabase
      .from("categories_answers")
      .select("id")
      .eq("round_id", roundId)
      .eq("player_id", playerId)
      .limit(1);

  if (existingError) {
    throw new Error(
      existingError.message,
    );
  }

  if (existing && existing.length > 0) {
    throw new Error(
      "You already submitted this round.",
    );
  }

  const { error } = await supabase
    .from("categories_answers")
    .insert(rows);

  if (error) {
    throw new Error(
      `Could not submit answers: ${error.message}`,
    );
  }
}

export async function setCategoriesRoundStatus(
  roundId: string,
  status: CategoriesRoundStatus,
) {
  const { error } = await supabase
    .from("categories_rounds")
    .update({
      status,
    })
    .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not update round: ${error.message}`,
    );
  }
}

export async function returnCategoriesToLobby(
  roomId: string,
) {
  const { error } = await supabase
    .from("rooms")
    .update({
      status: "lobby",
      selected_game: "categories",
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}

export async function setCategoriesAnswerPoints(
  answerId: string,
  points: number,
) {
  const { error } = await supabase
    .from("categories_answers")
    .update({
      points,
    })
    .eq("id", answerId);

  if (error) {
    throw new Error(
      `Could not update answer points: ${error.message}`,
    );
  }
}

export async function getCategoriesVotes(
  roundId: string,
): Promise<CategoriesVote[]> {
  const { data, error } = await supabase
    .from("categories_answer_votes")
    .select("*")
    .eq("round_id", roundId);

  if (error) {
    throw new Error(
      `Could not load votes: ${error.message}`,
    );
  }

  return (
    data as CategoriesVoteRow[]
  ).map(mapVote);
}

export async function castCategoriesVote(
  roundId: string,
  answerId: string,
  playerId: string,
) {
  const { error } = await supabase
    .from("categories_answer_votes")
    .upsert(
      {
        round_id: roundId,
        answer_id: answerId,
        player_id: playerId,
      },
      {
        onConflict:
          "answer_id,player_id",
      },
    );

  if (error) {
    throw new Error(
      `Could not cast vote: ${error.message}`,
    );
  }
}

export async function retractCategoriesVote(
  answerId: string,
  playerId: string,
) {
  const { error } = await supabase
    .from("categories_answer_votes")
    .delete()
    .eq("answer_id", answerId)
    .eq("player_id", playerId);

  if (error) {
    throw new Error(
      `Could not retract vote: ${error.message}`,
    );
  }
}

export async function finalizeCategoriesRound(
  roundId: string,
) {
  const { error } =
    await supabase.rpc(
      "finalize_categories_round",
      {
        p_round_id: roundId,
      },
    );

  if (error) {
    throw new Error(
      `Could not finalize Categories round: ${error.message}`,
    );
  }
}

export async function finishCategoriesGame(
  roundId: string,
) {
  await finalizeCategoriesRound(
    roundId,
  );

  await setCategoriesRoundStatus(
    roundId,
    "finished",
  );
}