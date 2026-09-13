import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  pausePlayback,
  startPlayback,
} from "../lib/spotifyApi";
import {
  disconnectSpotify,
  getSpotifyToken,
  isSpotifyConfigured,
  storedSpotifyToken,
} from "../lib/spotifyAuth";
import {
  connectSpotifyPlayer,
} from "../lib/spotifyPlayer";
import type {
  ConnectedPlayer,
  PlayerFailure,
} from "../lib/spotifyPlayer";

/*
 * Spotify, from the host's side. Nobody else calls this: the host's
 * browser is the speaker in the room, so only they load the SDK, only they
 * hold a token, and only they can start or stop a track.
 *
 * Every state other than "ready" is playable — the game falls back to
 * naming the song instead of playing it — so nothing here throws its way
 * out to the screen as a blocking error.
 */

export type SpotifyStatus =
  | "unconfigured"
  | "disconnected"
  | "connecting"
  | "ready"
  | "no_premium"
  | "error";

export function useSpotifyHost(
  enabled: boolean,
) {
  const [status, setStatus] =
    useState<SpotifyStatus>(() =>
      !isSpotifyConfigured()
        ? "unconfigured"
        : storedSpotifyToken()
          ? "connecting"
          : "disconnected",
    );

  const [message, setMessage] =
    useState<string | null>(null);

  const playerRef =
    useRef<ConnectedPlayer | null>(
      null,
    );

  useEffect(() => {
    if (
      !enabled ||
      status !== "connecting"
    ) {
      return;
    }

    let active = true;

    const onFailure = (
      failure: PlayerFailure,
      detail: string,
    ) => {
      if (!active) {
        return;
      }

      /*
       * A playback error is about one track, not the connection — the
       * device is still there and the next round can try again.
       */
      if (failure === "playback") {
        setMessage(detail);

        return;
      }

      setStatus(
        failure === "no_premium"
          ? "no_premium"
          : "error",
      );

      setMessage(detail);

      if (failure === "auth") {
        disconnectSpotify();
      }
    };

    void connectSpotifyPlayer({
      getToken: getSpotifyToken,
      onFailure,
    })
      .then((player) => {
        if (!active) {
          player.disconnect();

          return;
        }

        playerRef.current = player;

        setStatus("ready");
        setMessage(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }

        /* onFailure has already classified the ones it knows. */
        setStatus((current) =>
          current === "connecting"
            ? "error"
            : current,
        );

        setMessage(
          caught instanceof Error
            ? caught.message
            : null,
        );
      });

    return () => {
      active = false;

      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [enabled, status]);

  const play = useCallback(
    async (
      uri: string,
      positionMs = 0,
    ) => {
      const token =
        await getSpotifyToken();

      const device =
        playerRef.current?.deviceId;

      if (!token || !device) {
        return false;
      }

      try {
        await startPlayback(
          token,
          device,
          uri,
          positionMs,
        );

        return true;
      } catch (caught) {
        setMessage(
          caught instanceof Error
            ? caught.message
            : null,
        );

        return false;
      }
    },
    [],
  );

  const pause = useCallback(
    async () => {
      const token =
        await getSpotifyToken();

      const device =
        playerRef.current?.deviceId;

      if (!token || !device) {
        return;
      }

      try {
        await pausePlayback(
          token,
          device,
        );
      } catch {
        /* Nothing useful to say: the round is moving on regardless. */
      }
    },
    [],
  );

  const disconnect =
    useCallback(() => {
      playerRef.current?.disconnect();
      playerRef.current = null;

      disconnectSpotify();

      setStatus("disconnected");
      setMessage(null);
    }, []);

  /* Called after a fresh sign-in lands back on the game. */
  const retry = useCallback(() => {
    setStatus(
      !isSpotifyConfigured()
        ? "unconfigured"
        : storedSpotifyToken()
          ? "connecting"
          : "disconnected",
    );

    setMessage(null);
  }, []);

  return {
    status,
    message,
    play,
    pause,
    disconnect,
    retry,
    canPlay: status === "ready",
  };
}
