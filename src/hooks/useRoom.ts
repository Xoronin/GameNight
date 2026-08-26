import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  getPlayers,
  getRoomByCode,
} from "../services/roomService";
import type { RoomPlayer } from "../types/player";
import type { Room } from "../types/room";

type UseRoomResult = {
  room: Room | null;
  players: RoomPlayer[];
  loading: boolean;
  error: string | null;
};

export function useRoom(
  roomCode: string | undefined,
): UseRoomResult {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) {
      setLoading(false);
      setError("Missing room code.");
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);

        const loadedRoom =
          await getRoomByCode(roomCode);

        if (!active) {
          return;
        }

        if (!loadedRoom) {
          setRoom(null);
          setPlayers([]);
          setError("Room not found.");
          return;
        }

        const loadedPlayers =
          await getPlayers(loadedRoom.id);

        if (!active) {
          return;
        }

        setRoom(loadedRoom);
        setPlayers(loadedPlayers);
        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load room.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    const roomChannel = supabase
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode.toUpperCase()}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(roomChannel);
    };
  }, [roomCode]);

  useEffect(() => {
    if (!room) {
      return;
    }

    const playerChannel = supabase
      .channel(`players-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          try {
            const updatedPlayers =
              await getPlayers(room.id);

            setPlayers(updatedPlayers);
          } catch {
            // Keep existing list if refresh fails.
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(playerChannel);
    };
  }, [room]);

  return {
    room,
    players,
    loading,
    error,
  };
}