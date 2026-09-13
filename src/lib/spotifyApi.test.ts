import {
  describe,
  expect,
  it,
} from "vitest";
import {
  normalizeTitle,
  pickBestTrack,
} from "./spotifyApi";

function track(
  name: string,
  artist: string,
) {
  return {
    id: name,
    uri: `spotify:track:${name}`,
    name,
    artists: [artist],
    durationMs: 200_000,
    artworkUrl: null,
  };
}

describe("normalizeTitle", () => {
  it("ignores case and punctuation", () => {
    expect(
      normalizeTitle(
        "(I Can't Get No) Satisfaction",
      ),
    ).toBe("satisfaction");
  });

  it("drops a bracketed aside", () => {
    expect(
      normalizeTitle(
        "Mambo No. 5 (A Little Bit of...)",
      ),
    ).toBe("mambo no 5");
  });
});

describe("pickBestTrack", () => {
  it("has nothing to pick from an empty result", () => {
    expect(
      pickBestTrack(
        [],
        "Anything",
        "Anyone",
      ),
    ).toBeNull();
  });

  /*
   * The reason this function exists. Spotify sorts by popularity, and on
   * an older song the popular result is often a remaster or a live take —
   * a recording whose release year is not the one the game is scored on.
   */
  it("prefers the original over a remaster listed first", () => {
    const picked = pickBestTrack(
      [
        track(
          "Bohemian Rhapsody - Remastered 2011",
          "Queen",
        ),
        track(
          "Bohemian Rhapsody",
          "Queen",
        ),
      ],
      "Bohemian Rhapsody",
      "Queen",
    );

    expect(picked?.name).toBe(
      "Bohemian Rhapsody",
    );
  });

  it("prefers the original over a live version", () => {
    const picked = pickBestTrack(
      [
        track(
          "Wonderwall - Live at Wembley",
          "Oasis",
        ),
        track("Wonderwall", "Oasis"),
      ],
      "Wonderwall",
      "Oasis",
    );

    expect(picked?.name).toBe(
      "Wonderwall",
    );
  });

  it("prefers the artist we asked for over a cover", () => {
    const picked = pickBestTrack(
      [
        track(
          "Take On Me",
          "Some Tribute Band",
        ),
        track("Take On Me", "a-ha"),
      ],
      "Take On Me",
      "a-ha",
    );

    expect(picked?.artists).toEqual([
      "a-ha",
    ]);
  });

  /* Something is better than nothing: the round still needs a song. */
  it("still returns a result when nothing matches well", () => {
    expect(
      pickBestTrack(
        [
          track(
            "Something Else",
            "Someone Else",
          ),
        ],
        "Wonderwall",
        "Oasis",
      ),
    ).not.toBeNull();
  });
});
