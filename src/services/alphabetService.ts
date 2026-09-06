import { supabase } from "../lib/supabase";
import type {
  AlphabetLetter,
  AlphabetLetterStatus,
  AlphabetRound,
  AlphabetRoundStatus,
  AlphabetVote,
} from "../types/game";
import type {
  RoomPlayer,
} from "../types/player";
import {
  isMajorityRejected,
  pointsForLetter,
  wordStartsWithLetter,
} from "../games/alphabet/alphabetScoring";

export const STARTING_LIVES = 3;

const VOTE_WINDOW_SECONDS = 8;

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(
    "",
  );

export type AlphabetSession = {
  id: string;
  roomId: string;
  status: "playing" | "finished";
  createdAt: string;
  finishedAt: string | null;
};

type AlphabetSessionRow = {
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
  topic: string;
  status: AlphabetRoundStatus;
  current_player_id: string | null;
  turn_ends_at: string | null;
  out_player_ids: string[] | null;
  player_lives: Record<string, number> | null;
  created_at: string;
};

type LetterRow = {
  id: string;
  round_id: string;
  letter: string;
  status: AlphabetLetterStatus;
  claimed_by: string | null;
  word: string | null;
  created_at: string;
};

type VoteRow = {
  id: string;
  round_id: string;
  letter_id: string;
  player_id: string;
  created_at: string;
};

function mapSession(
  row: AlphabetSessionRow,
): AlphabetSession {
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
): AlphabetRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    topic: row.topic,
    status: row.status,
    currentPlayerId:
      row.current_player_id,
    turnEndsAt: row.turn_ends_at,
    outPlayerIds:
      row.out_player_ids ?? [],
    playerLives:
      row.player_lives ?? {},
    createdAt: row.created_at,
  };
}

function mapLetter(
  row: LetterRow,
): AlphabetLetter {
  return {
    id: row.id,
    roundId: row.round_id,
    letter: row.letter,
    status: row.status,
    claimedBy: row.claimed_by,
    word: row.word,
    createdAt: row.created_at,
  };
}

function mapVote(
  row: VoteRow,
): AlphabetVote {
  return {
    id: row.id,
    roundId: row.round_id,
    letterId: row.letter_id,
    playerId: row.player_id,
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

async function updateAlphabetRoundStatus(
  roundId: string,
  status: AlphabetRoundStatus,
) {
  const { error } =
    await supabase
      .from(
        "alphabet_rounds",
      )
      .update({ status })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not update Alphabet round: ${error.message}`,
    );
  }
}

export async function createAlphabetSession(
  roomId: string,
): Promise<AlphabetSession> {
  /*
   * Close any old unfinished Alphabet
   * session first.
   */
  const {
    error: closeError,
  } = await supabase
    .from(
      "alphabet_sessions",
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
      `Could not close old Alphabet session: ${closeError.message}`,
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "alphabet_sessions",
    )
    .insert({
      room_id: roomId,
      status: "playing",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Could not create Alphabet session: ${error.message}`,
    );
  }

  return mapSession(
    data as AlphabetSessionRow,
  );
}

export async function getActiveAlphabetSession(
  roomId: string,
): Promise<AlphabetSession | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "alphabet_sessions",
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
      `Could not load Alphabet session: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapSession(
    data as AlphabetSessionRow,
  );
}

export async function finishAlphabetSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from(
        "alphabet_sessions",
      )
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Alphabet session: ${error.message}`,
    );
  }
}

export async function getLatestAlphabetRound(
  sessionId: string,
): Promise<AlphabetRound | null> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "alphabet_rounds",
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
      `Could not load Alphabet round: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapRound(
    data as RoundRow,
  );
}

export async function getAlphabetLetters(
  roundId: string,
): Promise<AlphabetLetter[]> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "alphabet_letters",
    )
    .select("*")
    .eq("round_id", roundId)
    .order("letter", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load Alphabet letters: ${error.message}`,
    );
  }

  return (
    (data ?? []) as LetterRow[]
  ).map(mapLetter);
}

export async function getAlphabetVotes(
  roundId: string,
): Promise<AlphabetVote[]> {
  const {
    data,
    error,
  } = await supabase
    .from("alphabet_votes")
    .select("*")
    .eq("round_id", roundId);

  if (error) {
    throw new Error(
      `Could not load Alphabet votes: ${error.message}`,
    );
  }

  return (
    (data ?? []) as VoteRow[]
  ).map(mapVote);
}

export async function createAlphabetRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  players: RoomPlayer[],
  topic: string,
  timerSeconds: number,
): Promise<AlphabetRound> {
  if (players.length === 0) {
    throw new Error(
      "No players in room.",
    );
  }

  const trimmedTopic =
    topic.trim();

  if (!trimmedTopic) {
    throw new Error(
      "Enter a topic first.",
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
      "alphabet_rounds",
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
      `Could not check Alphabet round: ${existingError.message}`,
    );
  }

  if (existingRound) {
    return mapRound(
      existingRound as RoundRow,
    );
  }

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
      "alphabet_rounds",
    )
    .insert({
      room_id: roomId,
      session_id: sessionId,
      round_number: roundNumber,
      topic: trimmedTopic,
      status: "playing",
      current_player_id:
        startingPlayer.id,
      turn_ends_at:
        new Date(
          Date.now() +
            timerSeconds * 1000,
        ).toISOString(),
      player_lives: playerLives,
    })
    .select("*")
    .single();

  if (roundError) {
    throw new Error(
      `Could not create Alphabet round: ${roundError.message}`,
    );
  }

  const round = mapRound(
    roundData as RoundRow,
  );

  const letters = ALPHABET.map(
    (letter) => ({
      round_id: round.id,
      letter,
    }),
  );

  const {
    error: lettersError,
  } = await supabase
    .from(
      "alphabet_letters",
    )
    .insert(letters);

  if (lettersError) {
    /*
     * Clean up the incomplete round if
     * board creation fails.
     */
    await supabase
      .from(
        "alphabet_rounds",
      )
      .delete()
      .eq("id", round.id);

    throw new Error(
      `Could not create Alphabet board: ${lettersError.message}`,
    );
  }

  return round;
}

export async function submitAlphabetWord(
  round: AlphabetRound,
  letter: AlphabetLetter,
  playerId: string,
  word: string,
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
    letter.status !== "available"
  ) {
    return;
  }

  const trimmed = word.trim();

  if (!trimmed) {
    throw new Error(
      "Enter a word first.",
    );
  }

  if (
    !wordStartsWithLetter(
      trimmed,
      letter.letter,
    )
  ) {
    throw new Error(
      `Your word must start with ${letter.letter}.`,
    );
  }

  /*
   * Update only if the letter hasn't
   * already been claimed.
   */
  const {
    data: claimedLetter,
    error: letterError,
  } = await supabase
    .from(
      "alphabet_letters",
    )
    .update({
      status: "pending",
      claimed_by: playerId,
      word: trimmed,
    })
    .eq("id", letter.id)
    .eq(
      "status",
      "available",
    )
    .select("*")
    .maybeSingle();

  if (letterError) {
    throw new Error(
      `Could not submit word: ${letterError.message}`,
    );
  }

  if (!claimedLetter) {
    return;
  }

  const {
    error: roundError,
  } = await supabase
    .from(
      "alphabet_rounds",
    )
    .update({
      turn_ends_at:
        new Date(
          Date.now() +
            VOTE_WINDOW_SECONDS *
              1000,
        ).toISOString(),
    })
    .eq("id", round.id)
    .eq(
      "status",
      "playing",
    );

  if (roundError) {
    throw new Error(
      `Could not start the vote: ${roundError.message}`,
    );
  }
}

export async function castAlphabetVote(
  roundId: string,
  letterId: string,
  playerId: string,
) {
  const { error } =
    await supabase
      .from(
        "alphabet_votes",
      )
      .upsert(
        {
          round_id: roundId,
          letter_id: letterId,
          player_id: playerId,
        },
        {
          onConflict:
            "letter_id,player_id",
        },
      );

  if (error) {
    throw new Error(
      `Could not cast vote: ${error.message}`,
    );
  }
}

export async function retractAlphabetVote(
  letterId: string,
  playerId: string,
) {
  const { error } =
    await supabase
      .from(
        "alphabet_votes",
      )
      .delete()
      .eq(
        "letter_id",
        letterId,
      )
      .eq(
        "player_id",
        playerId,
      );

  if (error) {
    throw new Error(
      `Could not retract vote: ${error.message}`,
    );
  }
}

/*
 * Resolves a pending word once its vote window has
 * run out: scores it if the room didn't vote it
 * down, otherwise costs its author a life. Either
 * way the letter is used up for the round — mirrors
 * Minefield's "the mine goes off regardless" turn
 * handling, just with a vote instead of a tile flip.
 */
export async function resolveAlphabetLetter(
  round: AlphabetRound,
  letter: AlphabetLetter,
  players: RoomPlayer[],
  rejectVotes: number,
  timerSeconds: number,
) {
  if (
    round.status !== "playing" ||
    letter.status !== "pending" ||
    !letter.claimedBy
  ) {
    return;
  }

  const claimedBy =
    letter.claimedBy;

  const activeBefore =
    players.filter(
      (player) =>
        !round.outPlayerIds.includes(
          player.id,
        ),
    );

  const eligibleVoters = Math.max(
    activeBefore.length - 1,
    0,
  );

  const rejected =
    isMajorityRejected(
      rejectVotes,
      eligibleVoters,
    );

  /*
   * Resolve the letter itself first, guarded so a
   * concurrent host tab can't score/penalize it
   * twice.
   */
  const {
    data: resolvedLetter,
    error: letterError,
  } = await supabase
    .from(
      "alphabet_letters",
    )
    .update({
      status: rejected
        ? "invalid"
        : "valid",
    })
    .eq("id", letter.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (letterError) {
    throw new Error(
      `Could not resolve letter: ${letterError.message}`,
    );
  }

  if (!resolvedLetter) {
    return;
  }

  if (!rejected) {
    await addScore(
      claimedBy,
      pointsForLetter(
        letter.letter,
      ),
    );
  }

  let outPlayerIds =
    round.outPlayerIds;
  const playerLives = {
    ...round.playerLives,
  };

  if (rejected) {
    const remainingLives =
      Math.max(
        (playerLives[
          claimedBy
        ] ??
          STARTING_LIVES) - 1,
        0,
      );

    playerLives[claimedBy] =
      remainingLives;

    if (
      remainingLives <= 0 &&
      !outPlayerIds.includes(
        claimedBy,
      )
    ) {
      outPlayerIds = [
        ...outPlayerIds,
        claimedBy,
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

  const remainingLetters =
    await getAlphabetLetters(
      round.id,
    );

  const boardCleared =
    remainingLetters.every(
      (item) =>
        item.status !==
        "available",
    );

  if (
    activeAfter.length === 0 ||
    boardCleared
  ) {
    const {
      error: outError,
    } = await supabase
      .from(
        "alphabet_rounds",
      )
      .update({
        out_player_ids:
          outPlayerIds,
        player_lives:
          playerLives,
      })
      .eq("id", round.id);

    if (outError) {
      throw new Error(
        `Could not update Alphabet round: ${outError.message}`,
      );
    }

    await updateAlphabetRoundStatus(
      round.id,
      "reveal",
    );

    return;
  }

  const nextPlayer =
    getNextPlayer(
      activeAfter,
      claimedBy,
    );

  if (!nextPlayer) {
    return;
  }

  const {
    error: roundError,
  } = await supabase
    .from(
      "alphabet_rounds",
    )
    .update({
      out_player_ids:
        outPlayerIds,
      player_lives:
        playerLives,
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

  if (roundError) {
    throw new Error(
      `Could not change turn: ${roundError.message}`,
    );
  }
}

/*
 * The current player let their picking timer run
 * out without choosing a letter at all: costs them
 * a life, same as a rejected word, and moves on.
 */
export async function passAlphabetTurn(
  round: AlphabetRound,
  players: RoomPlayer[],
  timerSeconds: number,
) {
  if (
    round.status !== "playing" ||
    !round.currentPlayerId
  ) {
    return;
  }

  const currentPlayerId =
    round.currentPlayerId;

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

  if (activeAfter.length === 0) {
    const {
      error: outError,
    } = await supabase
      .from(
        "alphabet_rounds",
      )
      .update({
        out_player_ids:
          outPlayerIds,
        player_lives:
          playerLives,
      })
      .eq("id", round.id)
      .eq(
        "current_player_id",
        currentPlayerId,
      );

    if (outError) {
      throw new Error(
        `Could not update Alphabet round: ${outError.message}`,
      );
    }

    await updateAlphabetRoundStatus(
      round.id,
      "reveal",
    );

    return;
  }

  const nextPlayer =
    getNextPlayer(
      activeAfter,
      currentPlayerId,
    );

  if (!nextPlayer) {
    return;
  }

  /*
   * Guarded by the previous
   * current_player_id so a concurrent
   * word submission can't be clobbered
   * by a stale timeout.
   */
  const { error } =
    await supabase
      .from(
        "alphabet_rounds",
      )
      .update({
        out_player_ids:
          outPlayerIds,
        player_lives:
          playerLives,
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
        currentPlayerId,
      );

  if (error) {
    throw new Error(
      `Could not pass turn: ${error.message}`,
    );
  }
}

export async function finishAlphabetGame(
  roundId: string,
  sessionId: string,
) {
  await updateAlphabetRoundStatus(
    roundId,
    "finished",
  );

  await finishAlphabetSession(
    sessionId,
  );
}

export async function returnAlphabetRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "alphabet",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
