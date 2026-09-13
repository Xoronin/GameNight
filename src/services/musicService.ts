import { supabase } from "../lib/supabase";
import type {
  MusicCard,
  MusicPlacement,
  MusicRound,
  MusicRoundStatus,
  MusicSessionStatus,
  MusicSong,
} from "../types/game";

/*
 * Music Timeline. Each player keeps their own timeline of songs they have
 * won. On your turn a song plays and you say where in your timeline it
 * belongs; land it in the right gap and the card is yours. First player to
 * fill their timeline wins.
 *
 * Scoring is on the release year and nothing else, which is why the year
 * lives in our own table rather than being read back from Spotify — see
 * the migration for what streaming metadata does to a remastered track.
 */

/** Cards needed to take the game, including the one you start with. */
export const TARGET_CARDS = 10;

export const PLACEMENT_POINTS = 500;

/** Paid on top for placing into a gap between two songs you already hold. */
export const TIGHT_GAP_BONUS = 250;

export type MusicSession = {
  id: string;
  roomId: string;
  status: MusicSessionStatus;
  createdAt: string;
  finishedAt: string | null;
};

type SessionRow = {
  id: string;
  room_id: string;
  status: MusicSessionStatus;
  created_at: string;
  finished_at: string | null;
};

type RoundRow = {
  id: string;
  room_id: string;
  session_id: string;
  round_number: number;
  status: MusicRoundStatus;
  song_id: string;
  current_player_id: string | null;
  created_at: string;
  ends_at: string | null;
};

type SongRow = {
  id: string;
  title: string;
  artist: string;
  release_year: number;
  spotify_track_id: string | null;
  locale: "intl" | "de";
};

type CardRow = {
  id: string;
  session_id: string;
  player_id: string;
  song_id: string;
  is_starter: boolean;
  created_at: string;
};

type PlacementRow = {
  id: string;
  round_id: string;
  player_id: string;
  slot_index: number;
  is_correct: boolean;
  points: number;
  created_at: string;
};

function mapSession(
  row: SessionRow,
): MusicSession {
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
): MusicRound {
  return {
    id: row.id,
    roomId: row.room_id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    status: row.status,
    songId: row.song_id,
    currentPlayerId:
      row.current_player_id,
    createdAt: row.created_at,
    endsAt: row.ends_at,
  };
}

function mapSong(
  row: SongRow,
): MusicSong {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    releaseYear: row.release_year,
    spotifyTrackId:
      row.spotify_track_id,
    locale: row.locale,
  };
}

function mapCard(
  row: CardRow,
): MusicCard {
  return {
    id: row.id,
    sessionId: row.session_id,
    playerId: row.player_id,
    songId: row.song_id,
    isStarter: row.is_starter,
    createdAt: row.created_at,
  };
}

function mapPlacement(
  row: PlacementRow,
): MusicPlacement {
  return {
    id: row.id,
    roundId: row.round_id,
    playerId: row.player_id,
    slotIndex: row.slot_index,
    isCorrect: row.is_correct,
    points: row.points,
    createdAt: row.created_at,
  };
}

/** A player's timeline: their cards, oldest song first. */
export function timelineFor(
  cards: MusicCard[],
  songs: Map<string, MusicSong>,
): MusicSong[] {
  return cards
    .map((card) =>
      songs.get(card.songId),
    )
    .filter(
      (song): song is MusicSong =>
        !!song,
    )
    .sort(
      (a, b) =>
        a.releaseYear -
          b.releaseYear ||
        a.title.localeCompare(b.title),
    );
}

/*
 * A timeline of n songs has n + 1 gaps: before the first, between each
 * pair, and after the last. Slot i sits between songs i - 1 and i.
 */
export function slotBounds(
  timeline: MusicSong[],
  slotIndex: number,
): {
  after: number | null;
  before: number | null;
} {
  return {
    after:
      slotIndex > 0
        ? timeline[slotIndex - 1]!
            .releaseYear
        : null,
    before:
      slotIndex < timeline.length
        ? timeline[slotIndex]!
            .releaseYear
        : null,
  };
}

/*
 * Whether a year belongs in that gap. The bounds are inclusive on both
 * sides: two songs from the same year are equally right either side of
 * each other, and being marked wrong for that would be indefensible.
 */
export function isPlacementCorrect(
  timeline: MusicSong[],
  slotIndex: number,
  year: number,
): boolean {
  if (
    slotIndex < 0 ||
    slotIndex > timeline.length
  ) {
    return false;
  }

  const { after, before } =
    slotBounds(timeline, slotIndex);

  return (
    (after === null ||
      year >= after) &&
    (before === null ||
      year <= before)
  );
}

/*
 * What a correct placement is worth. Slotting between two songs you
 * already hold is the hard case — both ends constrain you — so it pays
 * more than dropping one off either end of the timeline.
 */
export function placementPoints(
  timeline: MusicSong[],
  slotIndex: number,
): number {
  const { after, before } =
    slotBounds(timeline, slotIndex);

  return (
    PLACEMENT_POINTS +
    (after !== null &&
    before !== null
      ? TIGHT_GAP_BONUS
      : 0)
  );
}

/** Whose turn it is, rotating through the room in a fixed order. */
export function playerForRound(
  roundNumber: number,
  playerIds: string[],
): string | null {
  return playerIds.length === 0
    ? null
    : playerIds[
        (roundNumber - 1) %
          playerIds.length
      ]!;
}

/** The first player holding enough cards to end the game. */
export function gameWinner(
  cards: MusicCard[],
  target: number = TARGET_CARDS,
): string | null {
  const held = new Map<
    string,
    number
  >();

  for (const card of cards) {
    held.set(
      card.playerId,
      (held.get(card.playerId) ?? 0) +
        1,
    );
  }

  for (const [
    playerId,
    count,
  ] of held) {
    if (count >= target) {
      return playerId;
    }
  }

  return null;
}

/** Songs eligible for a room: German-language ones only in German rooms. */
export function poolFor(
  songs: MusicSong[],
  language: "en" | "de",
): MusicSong[] {
  return language === "de"
    ? songs
    : songs.filter(
        (song) =>
          song.locale === "intl",
      );
}

export function pickSong(
  songs: MusicSong[],
  usedIds: string[],
): MusicSong | null {
  const fresh = songs.filter(
    (song) =>
      !usedIds.includes(song.id),
  );

  if (fresh.length === 0) {
    return null;
  }

  return fresh[
    Math.floor(
      Math.random() * fresh.length,
    )
  ]!;
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

export async function getMusicSongs(): Promise<
  MusicSong[]
> {
  const { data, error } =
    await supabase
      .from("music_songs")
      .select("*")
      .eq("active", true);

  if (error) {
    throw new Error(
      `Could not load the songs: ${error.message}`,
    );
  }

  return (
    (data as SongRow[]) ?? []
  ).map(mapSong);
}

export async function createMusicSession(
  roomId: string,
): Promise<MusicSession> {
  const { error: closeError } =
    await supabase
      .from("music_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .eq("status", "playing");

  if (closeError) {
    throw new Error(
      `Could not close old Music session: ${closeError.message}`,
    );
  }

  const { data, error } =
    await supabase
      .from("music_sessions")
      .insert({
        room_id: roomId,
        status: "playing",
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Music session: ${error.message}`,
    );
  }

  return mapSession(
    data as SessionRow,
  );
}

export async function getActiveMusicSession(
  roomId: string,
): Promise<MusicSession | null> {
  const { data, error } =
    await supabase
      .from("music_sessions")
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
      `Could not load Music session: ${error.message}`,
    );
  }

  return data
    ? mapSession(
        data as SessionRow,
      )
    : null;
}

async function finishMusicSession(
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("music_sessions")
      .update({
        status: "finished",
        finished_at:
          new Date().toISOString(),
      })
      .eq("id", sessionId);

  if (error) {
    throw new Error(
      `Could not finish Music session: ${error.message}`,
    );
  }
}

export async function getLatestMusicRound(
  sessionId: string,
): Promise<MusicRound | null> {
  const { data, error } =
    await supabase
      .from("music_rounds")
      .select("*")
      .eq("session_id", sessionId)
      .order("round_number", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load Music round: ${error.message}`,
    );
  }

  return data
    ? mapRound(data as RoundRow)
    : null;
}

export async function getMusicCards(
  sessionId: string,
): Promise<MusicCard[]> {
  const { data, error } =
    await supabase
      .from("music_cards")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw new Error(
      `Could not load the timelines: ${error.message}`,
    );
  }

  return (
    (data as CardRow[]) ?? []
  ).map(mapCard);
}

export async function getMusicPlacement(
  roundId: string,
): Promise<MusicPlacement | null> {
  const { data, error } =
    await supabase
      .from("music_placements")
      .select("*")
      .eq("round_id", roundId)
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load the placement: ${error.message}`,
    );
  }

  return data
    ? mapPlacement(
        data as PlacementRow,
      )
    : null;
}

async function usedSongIds(
  sessionId: string,
): Promise<string[]> {
  const { data, error } =
    await supabase
      .from("music_rounds")
      .select("song_id")
      .eq("session_id", sessionId);

  if (error) {
    throw new Error(
      `Could not load played songs: ${error.message}`,
    );
  }

  return (
    (data as {
      song_id: string;
    }[]) ?? []
  ).map((row) => row.song_id);
}

/*
 * Deals everyone their opening card. Standard for the game: without one,
 * the first placement would have no timeline to go into and would be
 * correct by default.
 */
export async function dealStarterCards(
  sessionId: string,
  playerIds: string[],
  pool: MusicSong[],
) {
  const taken: string[] = [];
  const rows = [];

  for (const playerId of playerIds) {
    const song = pickSong(
      pool,
      taken,
    );

    if (!song) {
      break;
    }

    taken.push(song.id);

    rows.push({
      session_id: sessionId,
      player_id: playerId,
      song_id: song.id,
      is_starter: true,
    });
  }

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("music_cards")
    .insert(rows)
    .select("id");

  if (error) {
    /* Already dealt, which a second host click would do. */
    if (error.code === "23505") {
      return;
    }

    throw new Error(
      `Could not deal the starting cards: ${error.message}`,
    );
  }
}

export async function createMusicRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  playerIds: string[],
  pool: MusicSong[],
  turnSeconds: number,
): Promise<MusicRound | null> {
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("music_rounds")
    .select("*")
    .eq("session_id", sessionId)
    .eq("round_number", roundNumber)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check Music round: ${existingError.message}`,
    );
  }

  if (existing) {
    return mapRound(
      existing as RoundRow,
    );
  }

  const player = playerForRound(
    roundNumber,
    playerIds,
  );

  const song = pickSong(
    pool,
    await usedSongIds(sessionId),
  );

  if (!player || !song) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("music_rounds")
      .insert({
        session_id: sessionId,
        room_id: roomId,
        round_number: roundNumber,
        status: "placing",
        song_id: song.id,
        current_player_id: player,
        ends_at: new Date(
          Date.now() +
            turnSeconds * 1000,
        ).toISOString(),
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Could not create Music round: ${error.message}`,
    );
  }

  return mapRound(data as RoundRow);
}

/*
 * Records where the player dropped the card and settles the round. A
 * slotIndex of -1 means the clock ran out with nothing chosen, which is
 * simply wrong rather than an error.
 */
export async function placeMusicCard(
  round: MusicRound,
  playerId: string,
  slotIndex: number,
  timeline: MusicSong[],
  song: MusicSong,
): Promise<boolean> {
  if (round.status !== "placing") {
    return false;
  }

  const correct =
    slotIndex >= 0 &&
    isPlacementCorrect(
      timeline,
      slotIndex,
      song.releaseYear,
    );

  const points = correct
    ? placementPoints(
        timeline,
        slotIndex,
      )
    : 0;

  const { error } = await supabase
    .from("music_placements")
    .insert({
      round_id: round.id,
      player_id: playerId,
      slot_index: slotIndex,
      is_correct: correct,
      points,
    });

  if (error) {
    /* Already settled — the clock and the player both got here. */
    if (error.code === "23505") {
      return false;
    }

    throw new Error(
      `Could not record the placement: ${error.message}`,
    );
  }

  if (correct) {
    const { error: cardError } =
      await supabase
        .from("music_cards")
        .insert({
          session_id:
            round.sessionId,
          player_id: playerId,
          song_id: song.id,
        });

    if (
      cardError &&
      cardError.code !== "23505"
    ) {
      throw new Error(
        `Could not award the card: ${cardError.message}`,
      );
    }

    await addScore(
      playerId,
      points,
    );
  }

  const { error: revealError } =
    await supabase
      .from("music_rounds")
      .update({ status: "reveal" })
      .eq("id", round.id)
      .eq("status", "placing");

  if (revealError) {
    throw new Error(
      `Could not reveal the round: ${revealError.message}`,
    );
  }

  return correct;
}

export async function nextMusicRound(
  round: MusicRound,
  playerIds: string[],
  pool: MusicSong[],
  turnSeconds: number,
) {
  return createMusicRound(
    round.sessionId,
    round.roomId,
    round.roundNumber + 1,
    playerIds,
    pool,
    turnSeconds,
  );
}

export async function finishMusicGame(
  roundId: string,
  sessionId: string,
) {
  const { error } =
    await supabase
      .from("music_rounds")
      .update({ status: "finished" })
      .eq("id", roundId);

  if (error) {
    throw new Error(
      `Could not finish Music round: ${error.message}`,
    );
  }

  await finishMusicSession(
    sessionId,
  );
}

export async function returnMusicRoomToLobby(
  roomId: string,
) {
  const { error } =
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        selected_game:
          "music-timeline",
      })
      .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not return to lobby: ${error.message}`,
    );
  }
}
