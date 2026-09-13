import {
  describe,
  expect,
  it,
} from "vitest";
import {
  MAX_PAIR_RATIO,
  MAX_POINTS,
  MIN_PAIR_RATIO,
  closestGuess,
  logError,
  nameOf,
  pickPair,
  pointsFor,
  trueRatio,
} from "./scaleService";
import type {
  ScaleGuess,
  ScaleObject,
} from "../types/game";

function object(
  key: string,
  heightM: number,
): ScaleObject {
  return {
    id: `id-${key}`,
    shapeKey: key,
    nameEn: `${key} en`,
    nameDe: `${key} de`,
    heightM,
  };
}

function guess(
  playerId: string,
  logErrorValue: number,
  createdAt = "2026-01-01T00:00:00.000Z",
): ScaleGuess {
  return {
    id: `guess-${playerId}`,
    roundId: "round-1",
    playerId,
    ratio: 1,
    logError: logErrorValue,
    points: 0,
    createdAt,
  };
}

const bus = object("bus", 4.4);
const giraffe = object(
  "giraffe",
  5.5,
);

describe("trueRatio", () => {
  it("measures the mystery against the reference", () => {
    expect(
      trueRatio(bus, giraffe),
    ).toBeCloseTo(1.25, 5);
  });
});

describe("logError", () => {
  it("is zero for a perfect guess", () => {
    expect(logError(1.25, 1.25)).toBe(
      0,
    );
  });

  /*
   * The decision the whole game rests on. A player told that twice too
   * big costs more than twice too small is right to be annoyed, and
   * subtracting heights does exactly that.
   */
  it("costs the same to be twice too big as twice too small", () => {
    expect(
      logError(2, 1),
    ).toBeCloseTo(logError(0.5, 1), 10);
  });

  it("costs the same at any scale", () => {
    /* Doubling a mug and doubling an oak are the same mistake. */
    expect(
      logError(0.2, 0.1),
    ).toBeCloseTo(logError(20, 10), 10);
  });

  it("grows with the size of the mistake", () => {
    expect(
      logError(4, 1),
    ).toBeGreaterThan(
      logError(2, 1),
    );
  });

  it("refuses a nonsense ratio rather than returning NaN", () => {
    expect(logError(0, 1)).toBe(
      Infinity,
    );

    expect(logError(1, 0)).toBe(
      Infinity,
    );
  });
});

describe("pointsFor", () => {
  it("pays full marks for a perfect guess", () => {
    expect(pointsFor(0)).toBe(
      MAX_POINTS,
    );
  });

  it("still pays well for a near miss", () => {
    expect(
      pointsFor(Math.log(1.25)),
    ).toBeGreaterThan(600);
  });

  it("pays something for a factor of two", () => {
    const half = pointsFor(
      Math.log(2),
    );

    expect(half).toBeGreaterThan(200);
    expect(half).toBeLessThan(500);
  });

  /* Symmetric scoring falls straight out of symmetric error. */
  it("pays the same either side of right", () => {
    expect(
      pointsFor(logError(2, 1)),
    ).toBe(
      pointsFor(logError(0.5, 1)),
    );
  });

  it("pays nothing for a wild guess", () => {
    expect(
      pointsFor(Math.log(50)),
    ).toBe(0);
  });

  it("pays nothing rather than NaN for an impossible one", () => {
    expect(pointsFor(Infinity)).toBe(
      0,
    );
  });
});

describe("closestGuess", () => {
  it("has nothing to pick when nobody played", () => {
    expect(
      closestGuess([]),
    ).toBeNull();
  });

  it("picks the smallest error", () => {
    expect(
      closestGuess([
        guess("a", 0.9),
        guess("b", 0.2),
        guess("c", 0.5),
      ])?.playerId,
    ).toBe("b");
  });

  /* A tie goes to whoever locked it in first. */
  it("breaks a tie on who was first", () => {
    expect(
      closestGuess([
        guess(
          "late",
          0.3,
          "2026-01-01T00:00:05.000Z",
        ),
        guess(
          "early",
          0.3,
          "2026-01-01T00:00:01.000Z",
        ),
      ])?.playerId,
    ).toBe("early");
  });
});

describe("pickPair", () => {
  const pool = [
    object("mug", 0.095),
    object("door", 2),
    object("person", 1.75),
    object("tree", 20),
  ];

  it("has nothing to deal from one object", () => {
    expect(
      pickPair([object("a", 1)], []),
    ).toBeNull();
  });

  it("never pairs an object with itself", () => {
    const pair = pickPair(pool, []);

    expect(pair?.reference.id).not.toBe(
      pair?.mystery.id,
    );
  });

  /*
   * Both have to share a screen. A mug against an oak is 210 times over,
   * which would draw the mug a few pixels tall.
   */
  it("only deals pairs that fit on one screen", () => {
    for (let i = 0; i < 60; i += 1) {
      const pair = pickPair(pool, []);

      expect(pair).not.toBeNull();

      const ratio = trueRatio(
        pair!.reference,
        pair!.mystery,
      );

      const spread =
        ratio >= 1 ? ratio : 1 / ratio;

      expect(
        spread,
      ).toBeLessThanOrEqual(
        MAX_PAIR_RATIO,
      );

      expect(
        spread,
      ).toBeGreaterThanOrEqual(
        MIN_PAIR_RATIO,
      );
    }
  });

  it("has nothing to deal when no pair is close enough", () => {
    expect(
      pickPair(
        [
          object("mug", 0.095),
          object("tree", 20),
        ],
        [],
      ),
    ).toBeNull();
  });

  it("prefers objects that have not been seen", () => {
    const wide = [
      object("mug", 0.095),
      object("bottle", 0.3),
      object("door", 2),
      object("bus", 4.4),
    ];

    const pair = pickPair(wide, [
      "mug",
      "bottle",
    ]);

    expect(
      [
        pair!.reference.shapeKey,
        pair!.mystery.shapeKey,
      ].sort(),
    ).toEqual(["bus", "door"]);
  });

  /*
   * Two objects left that happen to be nearly the same height is not a
   * reason to end the game — it has to fall back to the whole set.
   */
  it("falls back when the unseen ones cannot pair with each other", () => {
    const pair = pickPair(pool, [
      "mug",
      "tree",
    ]);

    expect(pair).not.toBeNull();
  });

  /* A long game can use every object; starting over beats stalling. */
  it("starts over once everything has been seen", () => {
    expect(
      pickPair(
        pool,
        pool.map((o) => o.shapeKey),
      ),
    ).not.toBeNull();
  });
});

describe("nameOf", () => {
  it("uses the room's language", () => {
    expect(nameOf(bus, "en")).toBe(
      "bus en",
    );

    expect(nameOf(bus, "de")).toBe(
      "bus de",
    );
  });
});
