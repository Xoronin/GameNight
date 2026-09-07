import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveTimelineSession,
  getLatestTimelineRound,
  getTimelineItems,
  getTimelinePlacements,
} from "../services/timelineService";
import type {
  TimelineSession,
} from "../services/timelineService";
import type {
  TimelineItem,
  TimelinePlacement,
  TimelineRound,
} from "../types/game";

export function useTimelineRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const [
    session,
    setSession,
  ] =
    useState<TimelineSession | null>(
      null,
    );

  const [
    round,
    setRound,
  ] =
    useState<TimelineRound | null>(
      null,
    );

  const [items, setItems] =
    useState<TimelineItem[]>(
      [],
    );

  const [
    placements,
    setPlacements,
  ] = useState<
    TimelinePlacement[]
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
            await getActiveTimelineSession(
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
              : "Could not load Timeline.",
          );

          setLoading(false);
        }
      };

    void loadSession();

    const channel =
      supabase
        .channel(
          `timeline-sessions-${roomId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "timeline_sessions",
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

    void getTimelineItems(
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
            await getTimelinePlacements(
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
              : "Could not update Timeline.",
          );
        }
      };

    void loadPlacements();

    const channel =
      supabase
        .channel(
          `timeline-placements-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "timeline_placements",
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
            await getLatestTimelineRound(
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
              : "Could not load Timeline round.",
          );
        }
      };

    void loadRound();

    const channel =
      supabase
        .channel(
          `timeline-rounds-${session.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "timeline_rounds",
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
