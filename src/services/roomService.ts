import { supabase } from "../lib/supabase";
import type { GameSettings } from "../data/gameTimers";
import type { Player, RoomPlayer } from "../types/player";
import type { Room, RoomStatus } from "../types/room";

type RoomRow = {
  id: string;
  code: string;
  host_player_id: string | null;
  selected_game: string;
  status: RoomStatus;
  created_at: string;
  game_language: "en" | "de";
  game_settings: GameSettings;
};

type PlayerRow = {
  id: string;
  room_id: string;
  profile_id: string | null;
  name: string;
  is_host: boolean;
  score: number;
  joined_at: string;
};

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    hostPlayerId: row.host_player_id,
    selectedGame: row.selected_game,
    status: row.status,
    createdAt: row.created_at,
    gameLanguage: row.game_language,
    gameSettings: row.game_settings ?? {},
  };
}

function mapPlayer(row: PlayerRow): RoomPlayer {
  return {
    id: row.id,
    roomId: row.room_id,
    profileId: row.profile_id,
    name: row.name,
    isHost: row.is_host,
    score: row.score,
    joinedAt: row.joined_at,
  };
}

export async function createRoom(
  code: string,
  player: Player,
): Promise<Room> {
  const cleanedCode = code.trim().toUpperCase();

  console.log("Creating room:", cleanedCode);

  const { data: roomData, error: roomError } = await supabase
    .from("rooms")
    .insert({
      code: cleanedCode,
      host_player_id: null,
      selected_game: "bluff",
      status: "lobby",
      game_language: "en",
    })
    .select("*")
    .single();

  if (roomError) {
    console.error("Room creation failed:", roomError);
    throw new Error(`Could not create room: ${roomError.message}`);
  }

  if (!roomData) {
    throw new Error("Room was created but Supabase returned no room.");
  }

  console.log("Room created:", roomData);

  const room = roomData as RoomRow;

  const { error: playerError } = await supabase
    .from("players")
    .insert({
      id: player.id,
      room_id: room.id,
      profile_id: player.profileId ?? null,
      name: player.name,
      is_host: true,
      score: 0,
    });

  if (playerError) {
    console.error("Host creation failed:", playerError);

    await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id);

    throw new Error(
      `Could not create host player: ${playerError.message}`,
    );
  }

  console.log("Host player created:", player);

  const { data: updatedRoom, error: updateError } = await supabase
    .from("rooms")
    .update({
      host_player_id: player.id,
    })
    .eq("id", room.id)
    .select("*")
    .single();

  if (updateError) {
    console.error(
      "Host assignment failed:",
      updateError,
    );

    await supabase
      .from("players")
      .delete()
      .eq("id", player.id);

    await supabase
      .from("rooms")
      .delete()
      .eq("id", room.id);

    throw new Error(
      `Could not assign room host: ${updateError.message}`,
    );
  }

  if (!updatedRoom) {
    throw new Error("Supabase returned no updated room.");
  }

  console.log("Room setup complete:", updatedRoom);

  return mapRoom(updatedRoom as RoomRow);
}

export async function getRoomByCode(
  code: string,
): Promise<Room | null> {
  const cleanedCode = code.trim().toUpperCase();

  console.log("Looking for room:", cleanedCode);

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", cleanedCode)
    .maybeSingle();

  if (error) {
    console.error("Room lookup failed:", error);

    throw new Error(
      `Could not load room: ${error.message}`,
    );
  }

  console.log("Room lookup result:", data);

  if (!data) {
    return null;
  }

  return mapRoom(data as RoomRow);
}

export async function joinRoom(
  code: string,
  player: Player,
): Promise<Room> {
  const room = await getRoomByCode(code);

  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.status !== "lobby") {
    throw new Error("This game has already started.");
  }

  const { error } = await supabase
    .from("players")
    .insert({
      id: player.id,
      room_id: room.id,
      profile_id: player.profileId ?? null,
      name: player.name,
      is_host: false,
      score: 0,
    });

  if (error) {
    console.error("Joining room failed:", error);

    throw new Error(
      `Could not join room: ${error.message}`,
    );
  }

  return room;
}

export async function getPlayers(
  roomId: string,
): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Could not load players: ${error.message}`,
    );
  }

  return (data as PlayerRow[]).map(mapPlayer);
}

export async function updateSelectedGame(
  roomId: string,
  gameId: string,
) {
  const { error } = await supabase
    .from("rooms")
    .update({
      selected_game: gameId,
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not change game: ${error.message}`,
    );
  }
}

export async function startGame(
  roomId: string,
  gameId: string,
) {
  const { error } = await supabase
    .from("rooms")
    .update({
      selected_game: gameId,
      status: "playing",
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not start game: ${error.message}`,
    );
  }
}

export async function leaveRoom(
  playerId: string,
) {
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (error) {
    throw new Error(
      `Could not leave room: ${error.message}`,
    );
  }
}

export async function updateGameSettings(
  roomId: string,
  gameSettings: GameSettings,
) {
  const { error } = await supabase
    .from("rooms")
    .update({
      game_settings: gameSettings,
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not update game settings: ${error.message}`,
    );
  }
}

export async function updateGameLanguage(
  roomId: string,
  gameLanguage: "en" | "de",
) {
  const { error } = await supabase
    .from("rooms")
    .update({
      game_language: gameLanguage,
    })
    .eq("id", roomId);

  if (error) {
    throw new Error(
      `Could not update game language: ${error.message}`,
    );
  }
}