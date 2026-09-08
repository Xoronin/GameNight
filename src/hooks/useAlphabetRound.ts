import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import {
  getActiveAlphabetSession,
  getAlphabetLetters,
  getAlphabetVotes,
  getLatestAlphabetRound,
} from "../services/alphabetService";
import type {
  AlphabetSession,
} from "../services/alphabetService";
import type {
  AlphabetLetter,
  AlphabetRound,
  AlphabetVote,
} from "../types/game";

export function useAlphabetRound(
  roomId: string | undefined,
) {
  const [
    session,
    setSession,
  ] =
    useState<AlphabetSession | null>(
      null,
    );

  const [
    round,
    setRound,
  ] =
    useState<AlphabetRound | null>(
      null,
    );

  const [
    letters,
    setLetters,
  ] = useState<
    AlphabetLetter[]
  >([]);

  const [votes, setVotes] =
    useState<AlphabetVote[]>(
      [],
    );

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
            await getActiveAlphabetSession(
              roomId,
            );

          if (!active) {
            return;
          }

          setSession(latest);

          if (!latest) {
            setRound(null);
            setLetters([]);
            setVotes([]);
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
              : "Could not load Alphabet.",
          );

          setLoading(false);
        }
      };

    void loadSession();

    const channel =
      supabase
        .channel(
          `alphabet-sessions-${roomId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "alphabet_sessions",
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
    if (!round?.id) {
      return;
    }

    let active = true;
    let lettersChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;
    let votesChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    const loadLetters =
      async () => {
        try {
          const loaded =
            await getAlphabetLetters(
              round.id,
            );

          if (!active) {
            return;
          }

          setLetters(loaded);
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
              : "Could not update Alphabet.",
          );
        }
      };

    const loadVotes =
      async () => {
        try {
          const loaded =
            await getAlphabetVotes(
              round.id,
            );

          if (!active) {
            return;
          }

          setVotes(loaded);
        } catch (
          caughtError
        ) {
          console.error(
            "Could not load Alphabet votes:",
            caughtError,
          );
        }
      };

    void loadLetters();
    void loadVotes();

    lettersChannel =
      supabase
        .channel(
          `alphabet-letters-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "alphabet_letters",
            filter: `round_id=eq.${round.id}`,
          },
          () => {
            void loadLetters();
          },
        )
        .subscribe();

    votesChannel =
      supabase
        .channel(
          `alphabet-votes-${round.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "alphabet_votes",
            filter: `round_id=eq.${round.id}`,
          },
          () => {
            void loadVotes();
          },
        )
        .subscribe();

    return () => {
      active = false;

      if (lettersChannel) {
        void supabase.removeChannel(
          lettersChannel,
        );
      }

      if (votesChannel) {
        void supabase.removeChannel(
          votesChannel,
        );
      }
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
            await getLatestAlphabetRound(
              session.id,
            );

          if (!active) {
            return;
          }

          setRound(latest);

          if (!latest) {
            setLetters([]);
            setVotes([]);
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
              : "Could not load Alphabet round.",
          );
        }
      };

    void loadRound();

    const channel =
      supabase
        .channel(
          `alphabet-rounds-${session.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "alphabet_rounds",
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
    letters,
    votes,
    loading,
    error,
  };
}
