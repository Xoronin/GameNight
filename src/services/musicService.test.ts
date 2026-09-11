import {
  describe,
  expect,
  it,
} from "vitest";
import {
  PLACEMENT_POINTS,
  TIGHT_GAP_BONUS,
  gameWinner,
  isPlacementCorrect,
  pickSong,
  placementPoints,
  playerForRound,
  poolFor,
  slotBounds,
  timelineFor,
} from "./musicService";
import type {
  MusicCard,
  MusicSong,
} from "../types/game";

function song(
  id: string,
  year: number,
  locale: "intl" | "de" = "intl",
): MusicSong {
  return {
    id,
    title: `Song ${id}`,
    artist: `Artist ${id}`,
    releaseYear: year,
    spotifyTrackId: null,
    locale,
  };
}

function card(
  playerId: string,
  songId: string,
): MusicCard {
  return {
    id: `card-${playerId}-${songId}`,
    sessionId: "session-1",
    playerId,
    songId,
    isStarter: false,
    createdAt:
      "2026-01-01T00:00:00.000Z",
  };
}

const line = [
  song("a", 1975),
  song("b", 1991),
  song("c", 2008),
];

describe("timelineFor", () => {
  it("sorts a player's cards oldest first", () => {
    const songs = new Map(
      [
        song("x", 2008),
        song("y", 1975),
        song("z", 1991),
      ].map((s) => [s.id, s]),
    );

    const sorted = timelineFor(
      [
        card("p", "x"),
        card("p", "y"),
        card("p", "z"),
      ],
      songs,
    );

    expect(
      sorted.map(
        (s) => s.releaseYear,
      ),
    ).toEqual([1975, 1991, 2008]);
  });

  /* A card can outlive the song row it points at. */
  it("drops a card whose song is missing", () => {
    expect(
      timelineFor(
        [card("p", "gone")],
        new Map(),
      ),
    ).toEqual([]);
  });
});

describe("slotBounds", () => {
  it("has no lower bound before the first card", () => {
    expect(
      slotBounds(line, 0),
    ).toEqual({
      after: null,
      before: 1975,
    });
  });

  it("has no upper bound after the last card", () => {
    expect(
      slotBounds(line, 3),
    ).toEqual({
      after: 2008,
      before: null,
    });
  });

  it("is bounded on both sides in between", () => {
    expect(
      slotBounds(line, 1),
    ).toEqual({
      after: 1975,
      before: 1991,
    });
  });
});

describe("isPlacementCorrect", () => {
  it("accepts a year inside the gap", () => {
    expect(
      isPlacementCorrect(
        line,
        1,
        1983,
      ),
    ).toBe(true);
  });

  it("rejects a year that belongs in another gap", () => {
    expect(
      isPlacementCorrect(
        line,
        1,
        2001,
      ),
    ).toBe(false);
  });

  it("accepts anything older before the first card", () => {
    expect(
      isPlacementCorrect(
        line,
        0,
        1960,
      ),
    ).toBe(true);

    expect(
      isPlacementCorrect(
        line,
        0,
        1999,
      ),
    ).toBe(false);
  });

  it("accepts anything newer after the last card", () => {
    expect(
      isPlacementCorrect(
        line,
        3,
        2023,
      ),
    ).toBe(true);

    expect(
      isPlacementCorrect(
        line,
        3,
        1980,
      ),
    ).toBe(false);
  });

  /*
   * Two songs from the same year are equally right either side of each
   * other. Being marked wrong for that would be indefensible, so the
   * bounds are inclusive at both ends.
   */
  it("accepts a tie with the card below", () => {
    expect(
      isPlacementCorrect(
        line,
        1,
        1975,
      ),
    ).toBe(true);
  });

  it("accepts a tie with the card above", () => {
    expect(
      isPlacementCorrect(
        line,
        1,
        1991,
      ),
    ).toBe(true);
  });

  /* An empty timeline has exactly one gap, and everything fits it. */
  it("accepts any year into an empty timeline", () => {
    expect(
      isPlacementCorrect(
        [],
        0,
        1999,
      ),
    ).toBe(true);
  });

  /* -1 is how a timed-out turn is recorded. */
  it("rejects a slot that is not on the board", () => {
    expect(
      isPlacementCorrect(
        line,
        -1,
        1983,
      ),
    ).toBe(false);

    expect(
      isPlacementCorrect(
        line,
        9,
        1983,
      ),
    ).toBe(false);
  });
});

describe("placementPoints", () => {
  it("pays the flat rate off the end of the timeline", () => {
    expect(
      placementPoints(line, 0),
    ).toBe(PLACEMENT_POINTS);

    expect(
      placementPoints(line, 3),
    ).toBe(PLACEMENT_POINTS);
  });

  /* Both ends constrain you, so it is the harder placement. */
  it("pays more for a gap between two cards", () => {
    expect(
      placementPoints(line, 1),
    ).toBe(
      PLACEMENT_POINTS +
        TIGHT_GAP_BONUS,
    );
  });

  it("pays the flat rate into an empty timeline", () => {
    expect(
      placementPoints([], 0),
    ).toBe(PLACEMENT_POINTS);
  });
});

describe("playerForRound", () => {
  const table = ["a", "b", "c"];

  it("starts with the first player", () => {
    expect(
      playerForRound(1, table),
    ).toBe("a");
  });

  it("gives everyone a turn before repeating", () => {
    expect(
      [1, 2, 3].map((n) =>
        playerForRound(n, table),
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("wraps around", () => {
    expect(
      playerForRound(4, table),
    ).toBe("a");
  });

  it("has nobody to pick in an empty room", () => {
    expect(
      playerForRound(1, []),
    ).toBeNull();
  });
});

describe("gameWinner", () => {
  it("has no winner before anyone reaches the target", () => {
    expect(
      gameWinner(
        [
          card("a", "1"),
          card("a", "2"),
          card("b", "3"),
        ],
        3,
      ),
    ).toBeNull();
  });

  it("names the player who reached the target", () => {
    expect(
      gameWinner(
        [
          card("a", "1"),
          card("a", "2"),
          card("a", "3"),
          card("b", "4"),
        ],
        3,
      ),
    ).toBe("a");
  });
});

describe("poolFor", () => {
  const songs = [
    song("i", 1999, "intl"),
    song("d", 1983, "de"),
  ];

  /* A German room gets both; an English one would not know the German hits. */
  it("keeps German songs out of an English room", () => {
    expect(
      poolFor(songs, "en").map(
        (s) => s.id,
      ),
    ).toEqual(["i"]);
  });

  it("deals everything in a German room", () => {
    expect(
      poolFor(songs, "de"),
    ).toHaveLength(2);
  });
});

describe("pickSong", () => {
  it("never repeats a song already played", () => {
    const picked = pickSong(
      [song("a", 1990), song("b", 1991)],
      ["a"],
    );

    expect(picked?.id).toBe("b");
  });

  /* Running out has to end the game rather than deal a repeat. */
  it("has nothing left once every song is spent", () => {
    expect(
      pickSong(
        [song("a", 1990)],
        ["a"],
      ),
    ).toBeNull();
  });
});
