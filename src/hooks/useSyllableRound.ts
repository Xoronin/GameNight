import {
  useEffect,
  useState,
} from "react";
import { reportChannelStatus } from "../lib/realtime";
import { supabase } from "../lib/supabase";
import {
  getActiveSyllableSession,
  getLatestSyllableRound,
  getSyllablePrompt,
  getSyllablePrompts,
  getSyllableStandings,
  getSyllableTurns,
} from "../services/syllableService";
import type { SyllableSession } from "../services/syllableService";
import type {
  SyllablePlayer,
  SyllablePrompt,
  SyllableRound,
  SyllableTurn,
} from "../types/game";
import { useRealtimeGeneration } from "./useConnection";

export function useSyllableRound(
  roomId: string | undefined,
  language: "en" | "de",
) {
  const generation =
    useRealtimeGeneration();

  const [session, setSession] =
    useState<SyllableSession | null>(
      null,
    );

  const [round, setRound] =
    useState<SyllableRound | null>(
      null,
    );

  const [prompt, setPrompt] =
    useState<SyllablePrompt | null>(
      null,
    );

  /*
   * Every fragment for the language. Static content, so it is fetched once
   * and handed to the service on each turn rather than re-queried per turn.
   */
  const [prompts, setPrompts] =
    useState<SyllablePrompt[]>([]);

  const [standings, setStandings] =
    useState<SyllablePlayer[]>([]);

  const [turns, setTurns] =
    useState<SyllableTurn[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * Last non-null session id, never reset back to undefined — see the
   * round-loading effect for why. Adjusted during render rather than in an
   * effect so it is ready before that effect runs on this same render.
   */
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

    const loadPrompts =
      async () => {
        try {
          const all =
            await getSyllablePrompts(
              language,
            );

          if (active) {
            setPrompts(all);
          }
        } catch (caughtError) {
          if (active) {
            setError(
              caughtError instanceof
                Error
                ? caughtError.message
                : "Could not load the fragments.",
            );
          }
        }
      };

    void loadPrompts();

    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let active = true;

    const loadSession = async () => {
      try {
        const latest =
          await getActiveSyllableSession(
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
            : "Could not load Syllable Rush.",
        );

        setLoading(false);
      }
    };

    void loadSession();

    const channel = supabase
      .channel(
        `syllable-sessions-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "syllable_sessions",
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
   * Keyed on the last non-null session id rather than session?.id:
   * finishing a game writes the round to "finished" and then, moments
   * later, the session too. Tearing down on that second write could
   * discard an in-flight fetch still resolving the round's final status.
   */
  useEffect(() => {
    if (!lastSessionId) {
      return;
    }

    let active = true;

    const loadRound = async () => {
      try {
        const latest =
          await getLatestSyllableRound(
            lastSessionId,
          );

        if (!active) {
          return;
        }

        setRound(latest);

        if (!latest) {
          setPrompt(null);
          setStandings([]);
          setTurns([]);
        }

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

    void loadRound();

    const channel = supabase
      .channel(
        `syllable-rounds-${lastSessionId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "syllable_rounds",
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

    return () => {
      active = false;

      void supabase.removeChannel(
        channel,
      );
    };
  }, [lastSessionId, generation]);

  /*
   * Standings and turn history, both keyed on the round. Two tables, one
   * channel each, but a single loader — either one changing means the
   * board on screen is stale.
   */
  useEffect(() => {
    if (!round?.id) {
      return;
    }

    const roundId = round.id;

    let active = true;

    const loadBoard = async () => {
      try {
        const [
          loadedStandings,
          loadedTurns,
        ] = await Promise.all([
          getSyllableStandings(
            roundId,
          ),

          getSyllableTurns(roundId),
        ]);

        if (!active) {
          return;
        }

        setStandings(
          loadedStandings,
        );

        setTurns(loadedTurns);

        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not update the board.",
        );
      }
    };

    void loadBoard();

    const players = supabase
      .channel(
        `syllable-players-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "syllable_players",
          filter:
            `round_id=eq.${roundId}`,
        },
        () => {
          void loadBoard();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    const history = supabase
      .channel(
        `syllable-turns-${roundId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "syllable_turns",
          filter:
            `round_id=eq.${roundId}`,
        },
        () => {
          void loadBoard();
        },
      )
      .subscribe(
        reportChannelStatus,
      );

    return () => {
      active = false;

      void supabase.removeChannel(
        players,
      );

      void supabase.removeChannel(
        history,
      );
    };
  }, [round?.id, generation]);

  /*
   * The fragment on screen. Looked up from the round's prompt id rather
   * than found in `prompts`, so it is right even before that list lands.
   */
  useEffect(() => {
    const promptId =
      round?.promptId;

    if (!promptId) {
      return;
    }

    let active = true;

    const loadPrompt = async () => {
      try {
        const loaded =
          await getSyllablePrompt(
            promptId,
          );

        if (active) {
          setPrompt(loaded);
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : "Could not load the fragment.",
          );
        }
      }
    };

    void loadPrompt();

    return () => {
      active = false;
    };
  }, [round?.promptId]);

  /*
   * Held back until it is the round's current fragment. The fetch above
   * lands a turn late, and showing the previous player's fragment next to
   * the new player's name would be worse than showing none.
   */
  const currentPrompt =
    round?.promptId &&
    prompt?.id === round.promptId
      ? prompt
      : null;

  return {
    session,
    round,
    prompt: currentPrompt,
    prompts,
    standings,
    turns,
    loading,
    error,
  };
}
