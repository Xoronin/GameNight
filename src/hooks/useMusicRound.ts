import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { reportChannelStatus } from "../lib/realtime";
import { supabase } from "../lib/supabase";
import {
  getActiveMusicSession,
  getLatestMusicRound,
  getMusicCards,
  getMusicPlacement,
  getMusicSongs,
  poolFor,
} from "../services/musicService";
import type { MusicSession } from "../services/musicService";
import type {
  MusicCard,
  MusicPlacement,
  MusicRound,
  MusicSong,
} from "../types/game";
import { useRealtimeGeneration } from "./useConnection";

export function useMusicRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const generation =
    useRealtimeGeneration();

  const [session, setSession] =
    useState<MusicSession | null>(
      null,
    );

  const [round, setRound] =
    useState<MusicRound | null>(null);

  /* Static content, so it is loaded once and reused every round. */
  const [songs, setSongs] = useState<
    MusicSong[]
  >([]);

  const [cards, setCards] = useState<
    MusicCard[]
  >([]);

  const [placement, setPlacement] =
    useState<MusicPlacement | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    lastSessionId,
    setLastSessionId,
  ] = useState<
    string | undefined
  >(undefined);

  if (
    session?.id &&
    session.id !== lastSessionId
  ) {
    setLastSessionId(session.id);
  }

  useEffect(() => {
    let active = true;

    const loadSongs = async () => {
      try {
        const all =
          await getMusicSongs();

        if (active) {
          setSongs(all);
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Could not load the songs.",
          );
        }
      }
    };

    void loadSongs();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;

    const loadSession = async () => {
      try {
        const latest =
          await getActiveMusicSession(
            roomId,
          );

        if (!active) {
          return;
        }

        setSession(latest);

        setError(null);
        setLoading(false);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load Music Timeline.",
        );

        setLoading(false);
      }
    };

    void loadSession();

    const channel = supabase
      .channel(
        `music-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "music_sessions",
          filter:
            `room_id=eq.${roomId}`,
        },
        () => {
          void loadSession();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [roomId, generation]);

  /*
   * Keyed on the last non-null session id rather than session?.id, so
   * finishing a game cannot tear this down mid-fetch and lose the round's
   * final status. See useSyllableRound for the same reasoning.
   */
  useEffect(() => {
    if (!lastSessionId) {
      return;
    }

    let active = true;

    const loadRound = async () => {
      try {
        const latest =
          await getLatestMusicRound(
            lastSessionId,
          );

        if (!active) {
          return;
        }

        setRound(latest);

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load the round.",
        );
      }
    };

    const loadCards = async () => {
      try {
        const all =
          await getMusicCards(
            lastSessionId,
          );

        if (active) {
          setCards(all);
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Could not load the timelines.",
          );
        }
      }
    };

    void loadRound();
    void loadCards();

    const rounds = supabase
      .channel(
        `music-rounds-${lastSessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "music_rounds",
          filter:
            `session_id=eq.${lastSessionId}`,
        },
        () => {
          void loadRound();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    const deck = supabase
      .channel(
        `music-cards-${lastSessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "music_cards",
          filter:
            `session_id=eq.${lastSessionId}`,
        },
        () => {
          void loadCards();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    return () => {
      active = false;

      void supabase.removeChannel(
        rounds,
      );

      void supabase.removeChannel(
        deck,
      );
    };
  }, [lastSessionId, generation]);

  useEffect(() => {
    if (!round?.id) {
      return;
    }

    const roundId = round.id;

    let active = true;

    const loadPlacement =
      async () => {
        try {
          const latest =
            await getMusicPlacement(
              roundId,
            );

          if (active) {
            setPlacement(latest);
          }
        } catch (caughtError) {
          if (active) {
            setError(
              caughtError instanceof
                Error
                ? caughtError.message
                : "Could not load the placement.",
            );
          }
        }
      };

    void loadPlacement();

    const channel = supabase
      .channel(
        `music-placements-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "music_placements",
          filter:
            `round_id=eq.${roundId}`,
        },
        () => {
          void loadPlacement();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [round?.id, generation]);

  const songsById = useMemo(
    () =>
      new Map(
        songs.map((song) => [
          song.id,
          song,
        ]),
      ),
    [songs],
  );

  const pool = useMemo(
    () => poolFor(songs, language),
    [songs, language],
  );

  /*
   * Held back until it belongs to the round on screen: the placement
   * fetch lands a beat after the round does, and showing the previous
   * round's result under a new song would read as this round's.
   */
  const currentPlacement =
    placement &&
    round &&
    placement.roundId === round.id
      ? placement
      : null;

  return {
    session,
    round,
    songs,
    songsById,
    pool,
    cards,
    placement: currentPlacement,
    loading,
    error,
  };
}
