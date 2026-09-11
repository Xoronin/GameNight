/*
 * The host's browser as a Spotify playback device, via the Web Playback
 * SDK. Everyone in the room hears this one speaker; the other players'
 * browsers never load the SDK at all.
 *
 * The SDK needs a Premium account and refuses to create a device without
 * one. That refusal arrives as an "account_error", and the game treats it
 * as "play without audio" rather than as something broken.
 */

const SDK_URL =
  "https://sdk.scdn.co/spotify-player.js";

export const PLAYER_NAME =
  "Game Night";

export type PlayerFailure =
  | "no_premium"
  | "auth"
  | "init"
  | "playback";

type SpotifyPlayerEvent = {
  message: string;
};

type SpotifyPlayerInstance = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (
    event: string,
    handler: (
      payload: never,
    ) => void,
  ) => boolean;
};

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (
          done: (
            token: string,
          ) => void,
        ) => void;
        volume?: number;
      }) => SpotifyPlayerInstance;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let sdkPromise: Promise<void> | null =
  null;

/*
 * Loads the SDK script once per page. The SDK announces itself by calling
 * a global rather than by resolving anything, so that global is what this
 * waits on — and it has to be set before the script runs.
 */
export function loadSpotifySdk(): Promise<void> {
  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<void>(
    (resolve, reject) => {
      if (window.Spotify) {
        resolve();

        return;
      }

      window.onSpotifyWebPlaybackSDKReady =
        () => {
          resolve();
        };

      const script =
        document.createElement(
          "script",
        );

      script.src = SDK_URL;
      script.async = true;

      script.onerror = () => {
        sdkPromise = null;

        reject(
          new Error(
            "Could not load the Spotify player.",
          ),
        );
      };

      document.body.appendChild(
        script,
      );
    },
  );

  return sdkPromise;
}

export type ConnectedPlayer = {
  deviceId: string;
  disconnect: () => void;
};

/*
 * Connects a device and resolves once Spotify says it is ready. The
 * failure path is a rejection carrying one of PlayerFailure, so the caller
 * can tell "you need Premium" apart from "that token is stale".
 */
export function connectSpotifyPlayer(options: {
  getToken: () => Promise<
    string | null
  >;
  onFailure?: (
    failure: PlayerFailure,
    message: string,
  ) => void;
}): Promise<ConnectedPlayer> {
  return new Promise(
    (resolve, reject) => {
      void loadSpotifySdk()
        .then(() => {
          if (!window.Spotify) {
            throw new Error(
              "The Spotify player did not load.",
            );
          }

          const player =
            new window.Spotify.Player(
              {
                name: PLAYER_NAME,
                volume: 0.8,
                getOAuthToken: (
                  done,
                ) => {
                  void options
                    .getToken()
                    .then((token) => {
                      if (token) {
                        done(token);
                      }
                    });
                },
              },
            );

          const fail = (
            failure: PlayerFailure,
          ) =>
            (event: SpotifyPlayerEvent) => {
              options.onFailure?.(
                failure,
                event.message,
              );

              reject(
                Object.assign(
                  new Error(
                    event.message,
                  ),
                  { failure },
                ),
              );
            };

          player.addListener(
            "initialization_error",
            fail("init") as (
              payload: never,
            ) => void,
          );

          player.addListener(
            "authentication_error",
            fail("auth") as (
              payload: never,
            ) => void,
          );

          player.addListener(
            "account_error",
            fail("no_premium") as (
              payload: never,
            ) => void,
          );

          player.addListener(
            "playback_error",
            ((
              event: SpotifyPlayerEvent,
            ) => {
              options.onFailure?.(
                "playback",
                event.message,
              );
            }) as (
              payload: never,
            ) => void,
          );

          player.addListener(
            "ready",
            ((event: {
              device_id: string;
            }) => {
              resolve({
                deviceId:
                  event.device_id,
                disconnect: () => {
                  player.disconnect();
                },
              });
            }) as (
              payload: never,
            ) => void,
          );

          return player.connect();
        })
        .catch(reject);
    },
  );
}
