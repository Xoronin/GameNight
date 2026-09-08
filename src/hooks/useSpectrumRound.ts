import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveSpectrumSession,
  getLatestSpectrumRound,
  getSpectrumItems,
  getSpectrumPlacements,
} from "../services/spectrumService";
import type {
  SpectrumSession,
} from "../services/spectrumService";
import type {
  SpectrumItem,
  SpectrumPlacement,
  SpectrumRound,
} from "../types/game";

export function useSpectrumRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const [
    session,
    setSession,
  ] =
    useState<SpectrumSession | null>(
      null,
    );

  const [
    round,
    setRound,
  ] =
    useState<SpectrumRound | null>(
      null,
    );

  const [items, setItems] =
    useState<SpectrumItem[]>(
      [],
    );

  const [
    placements,
    setPlacements,
  ] = useState<
    SpectrumPlacement[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;

    const loadSession =
      async () => {
        try {
          const latest =
            await getActiveSpectrumSession(
              roomId,
            );

          if (!active) {
            return;
          }

          setSession(latest);

          if (!latest) {
            setRound(null);
            setItems([]);
            setPlacements([]);
          }

          setError(null);
          setLoading(false);
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Spectrum.",
          );

          setLoading(false);
        }
      };

    void loadSession();

    const channel =
      supabase
        .channel(
          `spectrum-sessions-${roomId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "spectrum_sessions",
            filter: `room_id=eq.${roomId}`,
          },
          () => {
            void loadSession();
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [roomId]);

  useEffect(() => {
    if (!round?.categoryId) {
      return;
    }

    let active = true;

    void getSpectrumItems(
      round.categoryId,
      language,
    ).then((loaded) => {
      if (active) {
        setItems(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [
    round?.categoryId,
    language,
  ]);

  useEffect(() => {
    if (!round?.id) {
      return;
    }

    let active = true;

    const loadPlacements =
      async () => {
        try {
          const loaded =
            await getSpectrumPlacements(
              round.id,
            );

          if (!active) {
            return;
          }

          setPlacements(
            loaded,
          );

          setError(null);
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not update Spectrum.",
          );
        }
      };

    void loadPlacements();

    const channel =
      supabase
        .channel(
          `spectrum-placements-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "spectrum_placements",
            filter: `round_id=eq.${round.id}`,
          },
          () => {
            void loadPlacements();
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [round?.id]);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    let active = true;

    const loadRound =
      async () => {
        try {
          const latest =
            await getLatestSpectrumRound(
              session.id,
            );

          if (!active) {
            return;
          }

          setRound(latest);

          if (!latest) {
            setItems([]);
            setPlacements([]);
          }

          setError(null);
        } catch (
          caughtError
        ) {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load Spectrum round.",
          );
        }
      };

    void loadRound();

    const channel =
      supabase
        .channel(
          `spectrum-rounds-${session.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "spectrum_rounds",
            filter: `session_id=eq.${session.id}`,
          },
          () => {
            void loadRound();
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [session?.id]);

  return {
    session,
    round,
    items,
    placements,
    loading,
    error,
  };
}
