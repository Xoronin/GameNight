/*
 * The slice of the Spotify Web API the game needs: find a track, and drive
 * playback on the host's own browser device.
 *
 * Tracks are resolved by searching for the title and artist rather than by
 * a stored id. That is deliberate — the song list carries a hand-checked
 * release year, which is the thing the game is scored on, and looking the
 * recording up at play time means the list does not rot as Spotify's
 * catalogue shifts underneath it. A song that resolves badly can still be
 * pinned by filling in its spotify_track_id.
 */

const API = "https://api.spotify.com/v1";

export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  durationMs: number;
  artworkUrl: string | null;
};

type SearchItem = {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album?: {
    images?: { url: string }[];
  };
};

/*
 * Versions that are the wrong recording for a "name that year" game: a
 * 2011 live take of a 1975 song would be scored against the wrong year.
 */
const OFF_VERSION =
  /\b(live|remix|remaster(ed)?|karaoke|cover|instrumental|acoustic|demo|edit|version|mix|radio)\b/i;

export function normalizeTitle(
  title: string,
): string {
  return title
    .toLowerCase()
    /* Drop the bracketed asides Spotify hangs off a title. */
    .replace(/[([].*?[)\]]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/*
 * Which of the results is the recording we asked for. Spotify sorts by
 * popularity, which on an old song is often a remaster or a live album, so
 * an exact title match is preferred over whatever came back first.
 */
export function pickBestTrack(
  items: SpotifyTrack[],
  title: string,
  artist: string,
): SpotifyTrack | null {
  if (items.length === 0) {
    return null;
  }

  const wantTitle =
    normalizeTitle(title);

  const wantArtist =
    normalizeTitle(artist);

  const scored = items.map(
    (item) => {
      let score = 0;

      if (
        normalizeTitle(item.name) ===
        wantTitle
      ) {
        score += 4;
      }

      if (
        item.artists.some(
          (name) =>
            normalizeTitle(name) ===
            wantArtist,
        )
      ) {
        score += 3;
      }

      if (
        OFF_VERSION.test(item.name)
      ) {
        score -= 2;
      }

      return { item, score };
    },
  );

  scored.sort(
    (a, b) => b.score - a.score,
  );

  return scored[0]!.item;
}

function mapTrack(
  item: SearchItem,
): SpotifyTrack {
  return {
    id: item.id,
    uri: item.uri,
    name: item.name,
    artists: item.artists.map(
      (artist) => artist.name,
    ),
    durationMs: item.duration_ms,
    artworkUrl:
      item.album?.images?.[0]?.url ??
      null,
  };
}

async function call(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getTrack(
  token: string,
  trackId: string,
): Promise<SpotifyTrack | null> {
  const response = await call(
    token,
    `/tracks/${trackId}`,
  );

  if (!response.ok) {
    return null;
  }

  return mapTrack(
    (await response.json()) as SearchItem,
  );
}

export async function searchTrack(
  token: string,
  title: string,
  artist: string,
): Promise<SpotifyTrack | null> {
  /*
   * Field filters rather than a bare phrase: without them a title that is
   * also a common word drags in half the catalogue.
   */
  const query = `track:"${title}" artist:"${artist}"`;

  const params =
    new URLSearchParams({
      q: query,
      type: "track",
      limit: "8",
    });

  const response = await call(
    token,
    `/search?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Spotify search failed (${response.status}).`,
    );
  }

  const body =
    (await response.json()) as {
      tracks?: {
        items?: SearchItem[];
      };
    };

  return pickBestTrack(
    (body.tracks?.items ?? []).map(
      mapTrack,
    ),
    title,
    artist,
  );
}

export async function startPlayback(
  token: string,
  deviceId: string,
  uri: string,
  positionMs = 0,
) {
  const response = await call(
    token,
    `/me/player/play?device_id=${deviceId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        uris: [uri],
        position_ms: positionMs,
      }),
    },
  );

  /* 202 means the device is still waking up, which resolves itself. */
  if (
    !response.ok &&
    response.status !== 202
  ) {
    throw new Error(
      `Could not start playback (${response.status}).`,
    );
  }
}

export async function pausePlayback(
  token: string,
  deviceId: string,
) {
  const response = await call(
    token,
    `/me/player/pause?device_id=${deviceId}`,
    { method: "PUT" },
  );

  /* 403 here just means it was not playing, which is the goal anyway. */
  if (
    !response.ok &&
    response.status !== 403 &&
    response.status !== 404
  ) {
    throw new Error(
      `Could not pause playback (${response.status}).`,
    );
  }
}
