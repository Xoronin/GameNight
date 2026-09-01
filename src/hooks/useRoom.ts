import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getPlayers,
  getRoomByCode,
} from "../services/roomService";
import type {
  RoomPlayer,
} from "../types/player";
import type { Room } from "../types/room";

export function useRoom(
  roomCode?: string,
) {
  const [room, setRoom] =
    useState<Room | null>(
      null,
    );

  const [players, setPlayers] =
    useState<RoomPlayer[]>([]);

  const [loading, setLoading] =
    useState(Boolean(roomCode));

  const [error, setError] =
    useState<string | null>(
      roomCode
        ? null
        : "Missing room code.",
    );

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    let cancelled = false;

    const cleanedCode =
      roomCode
        .trim()
        .toUpperCase();

    const loadRoom =
      async () => {
        try {
          const loadedRoom =
            await getRoomByCode(
              cleanedCode,
            );

          if (cancelled) {
            return;
          }

          if (!loadedRoom) {
            setRoom(null);
            setPlayers([]);
            setError(
              "Room not found.",
            );
            setLoading(false);
            return;
          }

          const loadedPlayers =
            await getPlayers(
              loadedRoom.id,
            );

          if (cancelled) {
            return;
          }

          setRoom(loadedRoom);
          setPlayers(
            loadedPlayers,
          );
          setError(null);
          setLoading(false);
        } catch (
          caughtError
        ) {
          if (cancelled) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load room.",
          );

          setLoading(false);
        }
      };

    void loadRoom();

    const roomChannel =
      supabase
        .channel(
          `room:${cleanedCode}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "rooms",
            filter:
              `code=eq.${cleanedCode}`,
          },
          async () => {
            try {
              const updatedRoom =
                await getRoomByCode(
                  cleanedCode,
                );

              if (
                cancelled
              ) {
                return;
              }

              setRoom(
                updatedRoom,
              );
            } catch (
              caughtError
            ) {
              console.error(
                "Could not refresh room:",
                caughtError,
              );
            }
          },
        )
        .subscribe();

    let playerChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    const setupPlayerSubscription =
      async () => {
        try {
          const loadedRoom =
            await getRoomByCode(
              cleanedCode,
            );

          if (
            !loadedRoom ||
            cancelled
          ) {
            return;
          }

          playerChannel =
            supabase
              .channel(
                `players:${loadedRoom.id}`,
              )
              .on(
                "postgres_changes",
                {
                  event: "*",
                  schema:
                    "public",
                  table:
                    "players",
                  filter:
                    `room_id=eq.${loadedRoom.id}`,
                },
                async () => {
                  try {
                    const updatedPlayers =
                      await getPlayers(
                        loadedRoom.id,
                      );

                    if (
                      cancelled
                    ) {
                      return;
                    }

                    setPlayers(
                      updatedPlayers,
                    );
                  } catch (
                    caughtError
                  ) {
                    console.error(
                      "Could not refresh players:",
                      caughtError,
                    );
                  }
                },
              )
              .subscribe();
        } catch (
          caughtError
        ) {
          console.error(
            "Could not subscribe to players:",
            caughtError,
          );
        }
      };

    void setupPlayerSubscription();

    return () => {
      cancelled = true;

      void supabase.removeChannel(
        roomChannel,
      );

      if (playerChannel) {
        void supabase.removeChannel(
          playerChannel,
        );
      }
    };
  }, [roomCode]);

  return {
    room,
    players,
    loading,
    error,
  };
}