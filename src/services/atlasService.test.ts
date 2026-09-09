import {
  describe,
  expect,
  it,
} from "vitest";
import {
  ATLAS_MODE_KEYS,
  getAtlasModes,
  withAtlasModes,
} from "../data/gameTimers";
import type { AtlasRoundType } from "../types/game";
import {
  MAP_PLACE_COUNT,
  MATCH_PAIR_COUNT,
  STARTING_LIVES,
  applyLifeLoss,
  boardCountryIds,
  buildRoundPayload,
  gradeResponse,
  isBoardRound,
  isMatchRoundOver,
  nextActivePlayer,
  pickRoundType,
  scoreAnswer,
  scorePlacement,
} from "./atlasService";

/*
 * Atlas is generated rather than authored: a round is built from random
 * draws, so a fault shows up as a rare unplayable round rather than a
 * reliable failure. These run the generators enough times to catch that.
 */

const ALL = [
  ...ATLAS_MODE_KEYS,
] as AtlasRoundType[];

/** Plays a whole game, returning the modes it dealt. */
function playGame(
  totalRounds: number,
  modes: AtlasRoundType[] = ALL,
) {
  const used: AtlasRoundType[] = [];

  for (
    let round = 1;
    round <= totalRounds;
    round += 1
  ) {
    used.push(
      pickRoundType(
        round,
        totalRounds,
        used,
        modes,
      ),
    );
  }

  return used;
}

describe("round generation", () => {
  it.each(ALL)(
    "builds a valid %s payload every time",
    (type) => {
      for (
        let attempt = 0;
        attempt < 300;
        attempt += 1
      ) {
        const payload =
          buildRoundPayload(type, []);

        expect(payload).not.toBeNull();
        expect(payload!.type).toBe(
          type,
        );
      }
    },
  );

  it("always puts the answer among the options", () => {
    for (const type of [
      "flag_choice",
      "country_from_flag",
      "capital_choice",
      "map_choice",
    ] as const) {
      for (
        let attempt = 0;
        attempt < 200;
        attempt += 1
      ) {
        const payload =
          buildRoundPayload(
            type,
            [],
          ) as {
            countryId: string;
            optionIds: string[];
          };

        expect(
          payload.optionIds,
        ).toHaveLength(4);

        expect(
          new Set(payload.optionIds)
            .size,
        ).toBe(4);

        expect(
          payload.optionIds,
        ).toContain(
          payload.countryId,
        );
      }
    }
  });

  it("fills both boards with distinct countries and a matching pool", () => {
    for (const [
      type,
      size,
    ] of [
      [
        "capital_match",
        MATCH_PAIR_COUNT,
      ],
      ["map_place", MAP_PLACE_COUNT],
    ] as const) {
      for (
        let attempt = 0;
        attempt < 200;
        attempt += 1
      ) {
        const payload =
          buildRoundPayload(
            type,
            [],
          ) as {
            countryIds: string[];
            capitalOrder?: string[];
            placeOrder?: string[];
          };

        const pool =
          payload.capitalOrder ??
          payload.placeOrder!;

        expect(
          payload.countryIds,
        ).toHaveLength(size);

        expect(
          new Set(payload.countryIds)
            .size,
        ).toBe(size);

        expect(
          [...pool].sort(),
        ).toEqual(
          [
            ...payload.countryIds,
          ].sort(),
        );
      }
    }
  });

  it("varies whether a map round asks for the country or the capital", () => {
    const asked = new Set<string>();

    for (
      let attempt = 0;
      attempt < 200;
      attempt += 1
    ) {
      asked.add(
        (
          buildRoundPayload(
            "map_choice",
            [],
          ) as { asks: string }
        ).asks,
      );
    }

    expect(asked).toEqual(
      new Set(["country", "capital"]),
    );
  });

  it("still builds a round once every country has been used", () => {
    /*
     * A long game exhausts the pool. Repeating a country beats ending
     * the game early, so exclusion is a preference, not a rule.
     */
    const everything =
      ALL.flatMap(() => []) as string[];

    for (const type of ALL) {
      const used = Array.from(
        { length: 200 },
        (_unused, index) =>
          `x${index}`,
      ).concat(everything);

      expect(
        buildRoundPayload(type, used),
      ).not.toBeNull();
    }
  });
});

describe("grading and scoring", () => {
  const paint = {
    type: "flag_paint" as const,
    countryId: "de",
  };

  it("gives partial credit for a partly painted flag", () => {
    const full = gradeResponse(
      paint,
      {
        type: "flag_paint",
        regions: {
          "band-0": "#12100f",
          "band-1": "#d52b1e",
          "band-2": "#fcd116",
        },
      },
    );

    expect(full).toEqual({
      correctCount: 3,
      totalCount: 3,
    });

    const partial = gradeResponse(
      paint,
      {
        type: "flag_paint",
        regions: {
          "band-0": "#12100f",
          "band-1": "#ffffff",
        },
      },
    );

    expect(
      partial.correctCount,
    ).toBe(1);
  });

  it("grades a choice, including no answer at all", () => {
    const payload = {
      type: "flag_choice" as const,
      countryId: "fr",
      optionIds: [
        "de",
        "fr",
        "it",
        "ie",
      ],
    };

    expect(
      gradeResponse(payload, {
        type: "choice",
        choiceId: "fr",
      }).correctCount,
    ).toBe(1);

    expect(
      gradeResponse(payload, {
        type: "choice",
        choiceId: "de",
      }).correctCount,
    ).toBe(0);

    expect(
      gradeResponse(payload, {
        type: "choice",
        choiceId: null,
      }).correctCount,
    ).toBe(0);
  });

  it("leaves board rounds to per-placement scoring", () => {
    const board = {
      type: "map_place" as const,
      region: "europe" as const,
      countryIds: ["de", "fr"],
      placeOrder: ["fr", "de"],
    };

    expect(
      gradeResponse(board, {
        type: "choice",
        choiceId: "de",
      }).correctCount,
    ).toBe(0);

    expect(
      boardCountryIds(board),
    ).toEqual(["de", "fr"]);

    expect(
      boardCountryIds(paint),
    ).toEqual([]);
  });

  it("withholds the speed bonus unless the answer is perfect", () => {
    /*
     * Otherwise rushing a half-right answer would beat taking the time
     * to get it fully right.
     */
    expect(
      scoreAnswer(3, 3, 0),
    ).toBeGreaterThan(
      scoreAnswer(2, 3, 20),
    );

    expect(scoreAnswer(0, 3, 20)).toBe(
      0,
    );

    expect(
      scoreAnswer(1, 1, 99999),
    ).toBe(scoreAnswer(1, 1, 20));
  });

  it("caps the placement speed bonus", () => {
    expect(
      scorePlacement(0),
    ).toBeGreaterThan(0);

    expect(
      scorePlacement(20),
    ).toBeGreaterThan(
      scorePlacement(5),
    );

    expect(
      scorePlacement(99999),
    ).toBe(scorePlacement(10));
  });
});

describe("turn order and lives", () => {
  const seats = ["a", "b", "c", "d"];

  it("follows the table and skips eliminated players", () => {
    expect(
      nextActivePlayer(seats, "a", []),
    ).toBe("b");

    expect(
      nextActivePlayer(seats, "d", []),
    ).toBe("a");

    expect(
      nextActivePlayer(seats, "a", [
        "b",
        "c",
      ]),
    ).toBe("d");

    expect(
      nextActivePlayer(seats, "c", [
        "d",
        "a",
      ]),
    ).toBe("b");
  });

  it("leaves the turn with a lone survivor, and nobody at all when the table is out", () => {
    expect(
      nextActivePlayer(seats, "b", [
        "a",
        "c",
        "d",
      ]),
    ).toBe("b");

    expect(
      nextActivePlayer(
        seats,
        "a",
        seats,
      ),
    ).toBeNull();
  });

  it("visits every seat once per lap", () => {
    const visited: string[] = [];
    let current = "a";

    for (
      let step = 0;
      step < seats.length;
      step += 1
    ) {
      current = nextActivePlayer(
        seats,
        current,
        [],
      )!;

      visited.push(current);
    }

    expect(visited).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
  });

  it("eliminates at zero lives, once, and never goes negative", () => {
    let lives: Record<string, number> =
      { a: 3, b: 3 };

    let out: string[] = [];

    for (
      let miss = 0;
      miss < 5;
      miss += 1
    ) {
      ({
        playerLives: lives,
        outPlayerIds: out,
      } = applyLifeLoss(
        lives,
        out,
        "a",
      ));
    }

    expect(lives.a).toBe(0);
    expect(lives.b).toBe(3);
    expect(
      out.filter(
        (id) => id === "a",
      ),
    ).toEqual(["a"]);
  });

  it("starts an unknown player from a full set of lives", () => {
    expect(
      applyLifeLoss({}, [], "z")
        .playerLives.z,
    ).toBe(STARTING_LIVES - 1);
  });

  it("ends a board when it is solved or the table is out, not before", () => {
    const board = [
      "de",
      "fr",
      "it",
    ];

    expect(
      isMatchRoundOver(
        board,
        ["de"],
        seats,
        [],
      ),
    ).toBe(false);

    expect(
      isMatchRoundOver(
        board,
        ["it", "de", "fr"],
        seats,
        [],
      ),
    ).toBe(true);

    expect(
      isMatchRoundOver(
        board,
        ["de"],
        seats,
        seats,
      ),
    ).toBe(true);

    expect(
      isMatchRoundOver(
        board,
        ["de"],
        seats,
        ["a", "b", "c"],
      ),
    ).toBe(false);
  });
});

describe("mode scheduling", () => {
  it.each([7, 8, 10, 12])(
    "deals every mode at least once in a %i-round game",
    (total) => {
      for (
        let game = 0;
        game < 2000;
        game += 1
      ) {
        const used = playGame(total);

        for (const mode of ALL) {
          expect(
            used,
            `a ${total}-round game never dealt ${mode}`,
          ).toContain(mode);
        }
      }
    },
  );

  it("never deals a turn-based board twice in one game", () => {
    for (
      let game = 0;
      game < 2000;
      game += 1
    ) {
      const used = playGame(12);

      for (const board of ALL.filter(
        isBoardRound,
      )) {
        expect(
          used.filter(
            (type) => type === board,
          ),
        ).toHaveLength(1);
      }
    }
  });

  it("opens with a quick mode, never a board", () => {
    for (
      let game = 0;
      game < 500;
      game += 1
    ) {
      expect(
        isBoardRound(
          playGame(8)[0],
        ),
      ).toBe(false);
    }
  });

  it.each([
    [["map_choice", "map_place"]],
    [["flag_paint", "flag_choice"]],
    [["capital_choice"]],
  ])(
    "deals only the modes the host enabled (%s)",
    (modes) => {
      const enabled =
        modes as AtlasRoundType[];

      for (
        let game = 0;
        game < 1000;
        game += 1
      ) {
        const used = playGame(
          8,
          enabled,
        );

        for (const type of used) {
          expect(enabled).toContain(
            type,
          );
        }

        for (const mode of enabled) {
          expect(used).toContain(mode);
        }
      }
    },
  );
});

describe("mode settings", () => {
  it("treats a missing or empty selection as every mode", () => {
    expect(
      getAtlasModes(undefined),
    ).toHaveLength(
      ATLAS_MODE_KEYS.length,
    );

    expect(
      getAtlasModes({
        atlas: { modeKeys: [] },
      }),
    ).toHaveLength(
      ATLAS_MODE_KEYS.length,
    );
  });

  it("round-trips a stored selection", () => {
    expect(
      getAtlasModes(
        withAtlasModes(undefined, [
          "map_place",
        ]),
      ),
    ).toEqual(["map_place"]);
  });

  it("keeps every mode key in step with the round types", () => {
    expect(
      [...ATLAS_MODE_KEYS].sort(),
    ).toEqual([...ALL].sort());
  });
});
