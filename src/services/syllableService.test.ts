import {
  describe,
  expect,
  it,
} from "vitest";
import {
  FLOOR_SECONDS,
  LETTER_BONUS,
  MAX_WORD_POINTS,
  SHRINK_EVERY,
  SOLVE_POINTS,
  checkWord,
  nextInTurn,
  normalizeWord,
  pickPrompt,
  roundWinner,
  turnSecondsFor,
  wordPoints,
} from "./syllableService";
import type {
  SyllablePlayer,
  SyllablePrompt,
} from "../types/game";

function seat(
  playerId: string,
  index: number,
  overrides: Partial<SyllablePlayer> = {},
): SyllablePlayer {
  return {
    id: `standing-${playerId}`,
    roundId: "round-1",
    playerId,
    lives: 3,
    isOut: false,
    seat: index,
    ...overrides,
  };
}

function prompt(
  fragment: string,
): SyllablePrompt {
  return {
    id: `prompt-${fragment}`,
    language: "en",
    fragment,
    wordCount: 40,
    examples: ["example"],
  };
}

describe("normalizeWord", () => {
  it("lowercases and trims", () => {
    expect(
      normalizeWord("  Table  "),
    ).toBe("table");
  });

  /* German nouns are typed capitalised but stored lowercase. */
  it("keeps umlauts and sharp s", () => {
    expect(
      normalizeWord("Straße"),
    ).toBe("straße");

    expect(
      normalizeWord("GLÜCK"),
    ).toBe("glück");
  });

  it("drops anything that is not a letter", () => {
    expect(
      normalizeWord("re-write!"),
    ).toBe("rewrite");

    expect(
      normalizeWord("word 2"),
    ).toBe("word");
  });
});

describe("wordPoints", () => {
  it("pays the flat rate for a short word", () => {
    expect(wordPoints("table")).toBe(
      SOLVE_POINTS,
    );
  });

  it("pays more per letter past the threshold", () => {
    expect(
      wordPoints("tables"),
    ).toBe(
      SOLVE_POINTS + LETTER_BONUS,
    );
  });

  /* Otherwise one enormous compound noun decides the game. */
  it("caps what a single word can be worth", () => {
    expect(
      wordPoints(
        "unbelievablylongword",
      ),
    ).toBe(MAX_WORD_POINTS);
  });
});

describe("turnSecondsFor", () => {
  it("gives the full clock on the first turn", () => {
    expect(
      turnSecondsFor(1, 12),
    ).toBe(12);
  });

  it("holds steady within a shrink step", () => {
    expect(
      turnSecondsFor(
        SHRINK_EVERY,
        12,
      ),
    ).toBe(12);
  });

  it("loses a second at each step", () => {
    expect(
      turnSecondsFor(
        SHRINK_EVERY + 1,
        12,
      ),
    ).toBe(11);

    expect(
      turnSecondsFor(
        SHRINK_EVERY * 2 + 1,
        12,
      ),
    ).toBe(10);
  });

  /* A turn shorter than this is not playable on a phone. */
  it("never drops below the floor", () => {
    expect(
      turnSecondsFor(500, 12),
    ).toBe(FLOOR_SECONDS);
  });
});

describe("nextInTurn", () => {
  const table = [
    seat("a", 0),
    seat("b", 1),
    seat("c", 2),
  ];

  it("passes to the next seat", () => {
    expect(
      nextInTurn(table, "a")
        ?.playerId,
    ).toBe("b");
  });

  it("wraps around the table", () => {
    expect(
      nextInTurn(table, "c")
        ?.playerId,
    ).toBe("a");
  });

  /* The whole point of seats: knocked-out players are stepped over. */
  it("skips players who are out", () => {
    const withOut = [
      seat("a", 0),
      seat("b", 1, {
        isOut: true,
      }),
      seat("c", 2),
    ];

    expect(
      nextInTurn(withOut, "a")
        ?.playerId,
    ).toBe("c");
  });

  it("skips a run of players who are out", () => {
    const withOut = [
      seat("a", 0),
      seat("b", 1, {
        isOut: true,
      }),
      seat("c", 2, {
        isOut: true,
      }),
      seat("d", 3),
    ];

    expect(
      nextInTurn(withOut, "a")
        ?.playerId,
    ).toBe("d");
  });

  it("comes back to the last player standing", () => {
    const alone = [
      seat("a", 0),
      seat("b", 1, {
        isOut: true,
      }),
    ];

    expect(
      nextInTurn(alone, "a")
        ?.playerId,
    ).toBe("a");
  });

  it("has nobody to pass to when everyone is out", () => {
    expect(
      nextInTurn(
        [
          seat("a", 0, {
            isOut: true,
          }),
        ],
        "a",
      ),
    ).toBeNull();
  });

  /* Rows arrive in whatever order the query returns them. */
  it("follows seat order, not row order", () => {
    const shuffled = [
      seat("c", 2),
      seat("a", 0),
      seat("b", 1),
    ];

    expect(
      nextInTurn(shuffled, "a")
        ?.playerId,
    ).toBe("b");
  });
});

describe("roundWinner", () => {
  it("has no winner while two are still in", () => {
    expect(
      roundWinner([
        seat("a", 0),
        seat("b", 1),
      ]),
    ).toBeNull();
  });

  it("names the last player standing", () => {
    expect(
      roundWinner([
        seat("a", 0),
        seat("b", 1, {
          isOut: true,
        }),
      ])?.playerId,
    ).toBe("a");
  });

  it("has no winner when everyone is out", () => {
    expect(
      roundWinner([
        seat("a", 0, {
          isOut: true,
        }),
      ]),
    ).toBeNull();
  });
});

describe("checkWord", () => {
  it("accepts a word carrying the fragment", () => {
    expect(
      checkWord(
        "station",
        "tio",
        [],
      ),
    ).toBeNull();
  });

  it("turns down a word without the fragment", () => {
    expect(
      checkWord("table", "tio", []),
    ).toBe("missing_fragment");
  });

  it("turns down a word already played", () => {
    expect(
      checkWord("station", "tio", [
        "station",
      ]),
    ).toBe("already_used");
  });

  /* The fragment is checked first: both wrong reads as the plainer one. */
  it("reports the missing fragment before the repeat", () => {
    expect(
      checkWord("table", "tio", [
        "table",
      ]),
    ).toBe("missing_fragment");
  });
});

describe("pickPrompt", () => {
  it("has nothing to pick from an empty list", () => {
    expect(
      pickPrompt([], []),
    ).toBeNull();
  });

  it("never repeats a fragment while fresh ones are left", () => {
    const picked = pickPrompt(
      [
        prompt("tio"),
        prompt("ing"),
      ],
      ["tio"],
    );

    expect(picked?.fragment).toBe(
      "ing",
    );
  });

  /*
   * A long round can use every fragment there is. Running out has to mean
   * starting over rather than the round stalling with no prompt.
   */
  it("starts over once every fragment is spent", () => {
    const picked = pickPrompt(
      [prompt("tio")],
      ["tio"],
    );

    expect(picked?.fragment).toBe(
      "tio",
    );
  });
});
