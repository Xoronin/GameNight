/*
 * Spotify sign-in for the host of a Music Timeline room.
 *
 * Authorization Code with PKCE, which is the flow for a client that cannot
 * keep a secret: the app proves it started the login by sending back the
 * verifier whose hash it committed to up front. No client secret ships in
 * the bundle, and none is needed — the client id is public by design.
 *
 * Only the host signs in. Their browser is the speaker in the room, so the
 * other players never see a Spotify prompt at all.
 */

const AUTHORIZE_URL =
  "https://accounts.spotify.com/authorize";

const TOKEN_URL =
  "https://accounts.spotify.com/api/token";

export const SPOTIFY_CALLBACK_PATH =
  "/spotify-callback";

/*
 * streaming plus the two identity scopes are what the Web Playback SDK
 * demands before it will create a device; the player scopes are for
 * handing playback to that device and starting a track on it.
 */
export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
];

const STORAGE_KEY = "gn.spotify.token";
const VERIFIER_KEY = "gn.spotify.verifier";
const RETURN_KEY = "gn.spotify.return";

/** Refresh this far ahead of expiry rather than racing it. */
const REFRESH_MARGIN_MS = 60_000;

export type SpotifyToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

export function spotifyClientId():
  | string
  | undefined {
  return import.meta.env
    .VITE_SPOTIFY_CLIENT_ID;
}

/** Whether this deployment has been given a client id at all. */
export function isSpotifyConfigured(): boolean {
  return !!spotifyClientId();
}

export function spotifyRedirectUri(): string {
  return `${window.location.origin}${SPOTIFY_CALLBACK_PATH}`;
}

/*
 * base64url: standard base64 with the two URL-hostile characters swapped
 * and the padding dropped, which is what the PKCE spec asks for.
 */
export function base64UrlEncode(
  bytes: Uint8Array,
): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(
      byte,
    );
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** A fresh PKCE verifier: 64 random base64url characters. */
export function createVerifier(
  random: Uint8Array = crypto.getRandomValues(
    new Uint8Array(48),
  ),
): string {
  return base64UrlEncode(random);
}

export async function challengeFor(
  verifier: string,
): Promise<string> {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        verifier,
      ),
    );

  return base64UrlEncode(
    new Uint8Array(digest),
  );
}

export function buildAuthorizeUrl(options: {
  clientId: string;
  redirectUri: string;
  challenge: string;
  state: string;
}): string {
  const params =
    new URLSearchParams({
      response_type: "code",
      client_id: options.clientId,
      scope:
        SPOTIFY_SCOPES.join(" "),
      redirect_uri:
        options.redirectUri,
      code_challenge_method: "S256",
      code_challenge:
        options.challenge,
      state: options.state,
    });

  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/** Shapes a token response into what gets stored. */
export function tokenFromResponse(
  body: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  },
  previousRefresh: string | null,
  now: number = Date.now(),
): SpotifyToken {
  return {
    accessToken: body.access_token,
    /*
     * A PKCE refresh rotates the refresh token, but Spotify does not
     * always send a new one — keeping the old one when it does not is
     * what stops a refresh from logging the host out.
     */
    refreshToken:
      body.refresh_token ??
      previousRefresh,
    expiresAt:
      now + body.expires_in * 1000,
  };
}

export function isExpired(
  token: SpotifyToken,
  now: number = Date.now(),
): boolean {
  return (
    token.expiresAt - REFRESH_MARGIN_MS <=
    now
  );
}

function readStored(): SpotifyToken | null {
  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    return raw
      ? (JSON.parse(
          raw,
        ) as SpotifyToken)
      : null;
  } catch {
    /* Private mode, or something else wrote nonsense here. */
    return null;
  }
}

function writeStored(
  token: SpotifyToken | null,
) {
  try {
    if (token) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(token),
      );
    } else {
      window.localStorage.removeItem(
        STORAGE_KEY,
      );
    }
  } catch {
    /* Nothing to do: the session simply will not survive a reload. */
  }
}

export function storedSpotifyToken(): SpotifyToken | null {
  return readStored();
}

export function disconnectSpotify() {
  writeStored(null);
}

/** Sends the host to Spotify, remembering where to put them back. */
export async function beginSpotifyLogin(
  returnTo: string,
) {
  const clientId = spotifyClientId();

  if (!clientId) {
    throw new Error(
      "Spotify is not configured on this deployment.",
    );
  }

  const verifier = createVerifier();

  const state = createVerifier(
    crypto.getRandomValues(
      new Uint8Array(12),
    ),
  );

  window.sessionStorage.setItem(
    VERIFIER_KEY,
    verifier,
  );

  window.sessionStorage.setItem(
    RETURN_KEY,
    returnTo,
  );

  window.location.assign(
    buildAuthorizeUrl({
      clientId,
      redirectUri:
        spotifyRedirectUri(),
      challenge:
        await challengeFor(verifier),
      state,
    }),
  );
}

/** Where the host was when they started signing in. */
export function consumeReturnTo(): string {
  const target =
    window.sessionStorage.getItem(
      RETURN_KEY,
    ) ?? "/";

  window.sessionStorage.removeItem(
    RETURN_KEY,
  );

  return target;
}

async function requestToken(
  body: URLSearchParams,
  previousRefresh: string | null,
): Promise<SpotifyToken> {
  const response = await fetch(
    TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Spotify refused the token request (${response.status}).`,
    );
  }

  const token = tokenFromResponse(
    await response.json(),
    previousRefresh,
  );

  writeStored(token);

  return token;
}

/** Trades the code Spotify sent back for a token. */
export async function completeSpotifyLogin(
  code: string,
): Promise<SpotifyToken> {
  const clientId = spotifyClientId();

  const verifier =
    window.sessionStorage.getItem(
      VERIFIER_KEY,
    );

  window.sessionStorage.removeItem(
    VERIFIER_KEY,
  );

  if (!clientId || !verifier) {
    throw new Error(
      "That sign-in could not be completed. Try connecting again.",
    );
  }

  return requestToken(
    new URLSearchParams({
      grant_type:
        "authorization_code",
      code,
      redirect_uri:
        spotifyRedirectUri(),
      client_id: clientId,
      code_verifier: verifier,
    }),
    null,
  );
}

/*
 * A token good for the next minute, refreshing first if the stored one is
 * close to running out. Returns null when the host is not signed in, which
 * the game treats as "play without audio" rather than as an error.
 */
export async function getSpotifyToken(): Promise<
  string | null
> {
  const stored = readStored();
  const clientId = spotifyClientId();

  if (!stored || !clientId) {
    return null;
  }

  if (!isExpired(stored)) {
    return stored.accessToken;
  }

  if (!stored.refreshToken) {
    disconnectSpotify();

    return null;
  }

  try {
    const refreshed =
      await requestToken(
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token:
            stored.refreshToken,
          client_id: clientId,
        }),
        stored.refreshToken,
      );

    return refreshed.accessToken;
  } catch {
    /* The grant was revoked or expired; make them connect again. */
    disconnectSpotify();

    return null;
  }
}
