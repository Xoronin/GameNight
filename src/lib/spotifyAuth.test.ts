import {
  describe,
  expect,
  it,
} from "vitest";
import {
  SPOTIFY_SCOPES,
  base64UrlEncode,
  buildAuthorizeUrl,
  isExpired,
  tokenFromResponse,
} from "./spotifyAuth";

describe("base64UrlEncode", () => {
  /*
   * PKCE is carried in a query string, so the two base64 characters that
   * mean something in a URL have to go, and so does the padding.
   */
  it("produces nothing that needs escaping in a URL", () => {
    const encoded = base64UrlEncode(
      new Uint8Array(
        Array.from(
          { length: 256 },
          (_, i) => i,
        ),
      ),
    );

    expect(encoded).toMatch(
      /^[A-Za-z0-9\-_]+$/,
    );
  });

  it("encodes bytes the way base64 does", () => {
    expect(
      base64UrlEncode(
        new TextEncoder().encode(
          "hello",
        ),
      ),
    ).toBe("aGVsbG8");
  });
});

describe("buildAuthorizeUrl", () => {
  const url = new URL(
    buildAuthorizeUrl({
      clientId: "client-123",
      redirectUri:
        "https://example.test/spotify-callback",
      challenge: "challenge-abc",
      state: "state-xyz",
    }),
  );

  it("asks Spotify for a code", () => {
    expect(
      url.searchParams.get(
        "response_type",
      ),
    ).toBe("code");
  });

  /* S256 rather than plain: the verifier must never travel up front. */
  it("commits to the hashed verifier", () => {
    expect(
      url.searchParams.get(
        "code_challenge_method",
      ),
    ).toBe("S256");

    expect(
      url.searchParams.get(
        "code_challenge",
      ),
    ).toBe("challenge-abc");
  });

  it("carries the redirect and state back", () => {
    expect(
      url.searchParams.get(
        "redirect_uri",
      ),
    ).toBe(
      "https://example.test/spotify-callback",
    );

    expect(
      url.searchParams.get("state"),
    ).toBe("state-xyz");
  });

  /*
   * The SDK refuses to create a device without streaming and the two
   * identity scopes, and playback cannot be started without the player
   * ones. Dropping any of them breaks the game at a different point.
   */
  it("asks for every scope the player needs", () => {
    const asked = (
      url.searchParams.get("scope") ??
      ""
    ).split(" ");

    for (const scope of SPOTIFY_SCOPES) {
      expect(asked).toContain(scope);
    }

    expect(asked).toContain(
      "streaming",
    );

    expect(asked).toContain(
      "user-modify-playback-state",
    );
  });

  it("never sends a client secret", () => {
    expect(
      url.searchParams.get(
        "client_secret",
      ),
    ).toBeNull();
  });
});

describe("tokenFromResponse", () => {
  it("turns expires_in into a moment", () => {
    const token = tokenFromResponse(
      {
        access_token: "a",
        refresh_token: "r",
        expires_in: 3600,
      },
      null,
      1_000_000,
    );

    expect(token.expiresAt).toBe(
      1_000_000 + 3_600_000,
    );
  });

  /*
   * A PKCE refresh rotates the refresh token, but Spotify does not always
   * send a new one. Dropping the old one when it is absent would log the
   * host out on the next refresh.
   */
  it("keeps the old refresh token when none comes back", () => {
    expect(
      tokenFromResponse(
        {
          access_token: "a",
          expires_in: 3600,
        },
        "previous",
      ).refreshToken,
    ).toBe("previous");
  });

  it("takes the new refresh token when one does", () => {
    expect(
      tokenFromResponse(
        {
          access_token: "a",
          refresh_token: "rotated",
          expires_in: 3600,
        },
        "previous",
      ).refreshToken,
    ).toBe("rotated");
  });
});

describe("isExpired", () => {
  const token = {
    accessToken: "a",
    refreshToken: "r",
    expiresAt: 1_000_000,
  };

  it("is not expired well before the deadline", () => {
    expect(
      isExpired(token, 800_000),
    ).toBe(false);
  });

  it("is expired after the deadline", () => {
    expect(
      isExpired(token, 1_100_000),
    ).toBe(true);
  });

  /*
   * Refreshing a minute early rather than racing the deadline: a token
   * that expires mid-request takes the music out with it.
   */
  it("is expired inside the safety margin", () => {
    expect(
      isExpired(token, 970_000),
    ).toBe(true);
  });
});
