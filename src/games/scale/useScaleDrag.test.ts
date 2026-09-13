import {
  describe,
  expect,
  it,
} from "vitest";
import {
  MAX_RATIO,
  MIN_RATIO,
  positionOf,
  ratioAt,
} from "./useScaleDrag";

/*
 * The finger-to-ratio mapping. It is logarithmic for the same reason the
 * scoring is, and the property that matters is that equal travel always
 * buys the same factor — otherwise the bottom of the range is unusable.
 */

describe("ratioAt", () => {
  it("bottoms out at the smallest ratio", () => {
    expect(ratioAt(0)).toBeCloseTo(
      MIN_RATIO,
      6,
    );
  });

  it("tops out at the largest", () => {
    expect(ratioAt(1)).toBeCloseTo(
      MAX_RATIO,
      6,
    );
  });

  /* The midpoint of a log scale is the geometric mean, which is 1 here. */
  it("sits at one in the middle", () => {
    expect(ratioAt(0.5)).toBeCloseTo(
      1,
      6,
    );
  });

  /*
   * Equal travel, equal factor. A linear mapping would give the whole
   * range below 1 about four pixels on a phone.
   */
  it("buys the same factor for the same travel", () => {
    const low =
      ratioAt(0.3) / ratioAt(0.2);

    const high =
      ratioAt(0.8) / ratioAt(0.7);

    expect(low).toBeCloseTo(high, 6);
  });

  it("clamps rather than running off the track", () => {
    expect(ratioAt(-5)).toBeCloseTo(
      MIN_RATIO,
      6,
    );

    expect(ratioAt(9)).toBeCloseTo(
      MAX_RATIO,
      6,
    );
  });

  it("never returns a ratio that would break scoring", () => {
    for (
      let p = 0;
      p <= 1;
      p += 0.05
    ) {
      expect(
        ratioAt(p),
      ).toBeGreaterThan(0);

      expect(
        Number.isFinite(ratioAt(p)),
      ).toBe(true);
    }
  });
});

describe("positionOf", () => {
  it("round-trips with ratioAt", () => {
    for (const p of [
      0, 0.17, 0.5, 0.83, 1,
    ]) {
      expect(
        positionOf(ratioAt(p)),
      ).toBeCloseTo(p, 6);
    }
  });

  it("puts a ratio of one in the middle", () => {
    expect(positionOf(1)).toBeCloseTo(
      0.5,
      6,
    );
  });

  it("clamps a ratio outside the track", () => {
    expect(positionOf(1000)).toBe(1);
    expect(positionOf(0.0001)).toBe(0);
    expect(positionOf(0)).toBe(0);
  });
});
