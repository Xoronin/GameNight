import {
  describe,
  expect,
  it,
} from "vitest";
import {
  FLAG_PALETTE,
  allAtlasCountries,
  atlasCountries,
  flagCountries,
} from "./atlasCountries";
import { flagRegions } from "./atlasFlags";
import { mapPlayableIds } from "./atlasMapRegions";

/*
 * The Atlas roster is hand-written data, and a mistake in it shows up
 * as an unanswerable round rather than a crash — two countries whose
 * flags render identically make "pick the flag" a coin toss, and a
 * region with three countries cannot fill a four-way choice.
 */

const coloursOf = (
  country: (typeof allAtlasCountries)[number],
) =>
  country.flag
    ? flagRegions(country.flag).map(
        (region) => region.color,
      )
    : [];

describe("Atlas country data", () => {
  it("has no duplicate ids", () => {
    const ids = allAtlasCountries.map(
      (country) => country.id,
    );

    expect(
      new Set(ids).size,
    ).toBe(ids.length);
  });

  it("has no duplicate names in either language", () => {
    for (const field of [
      "nameEn",
      "nameDe",
    ] as const) {
      const names =
        allAtlasCountries.map(
          (country) =>
            country[field],
        );

      expect(
        new Set(names).size,
        `duplicate ${field}`,
      ).toBe(names.length);
    }
  });

  it("gives every country a name and capital in both languages", () => {
    for (const country of allAtlasCountries) {
      for (const field of [
        "nameEn",
        "nameDe",
        "capitalEn",
        "capitalDe",
      ] as const) {
        expect(
          country[field]?.trim(),
          `${country.id} is missing ${field}`,
        ).toBeTruthy();
      }
    }
  });

  it("only uses colours the paint palette offers", () => {
    const palette = new Set(
      Object.values(FLAG_PALETTE),
    );

    for (const country of flagCountries) {
      for (const colour of coloursOf(
        country,
      )) {
        expect(
          palette,
          `${country.nameEn} uses ${colour}, which the palette does not offer — the paint round would be unsolvable`,
        ).toContain(colour);
      }
    }
  });

  it("never renders two flags identically", () => {
    const seen = new Map<
      string,
      string
    >();

    for (const country of flagCountries) {
      const shape = JSON.stringify(
        country.flag,
      );

      expect(
        seen.get(shape),
        `${country.nameEn} renders identically to ${seen.get(
          shape,
        )} — "pick the flag" would be unanswerable`,
      ).toBeUndefined();

      seen.set(shape, country.nameEn);
    }
  });

  it("keeps band weights in step with band counts", () => {
    for (const country of flagCountries) {
      const flag = country.flag!;

      if (
        flag.kind === "stripes" &&
        flag.weights
      ) {
        expect(
          flag.weights.length,
          `${country.nameEn} has ${flag.weights.length} weights for ${flag.bands.length} bands`,
        ).toBe(flag.bands.length);
      }
    }
  });

  it("exposes flagCountries as exactly the drawable ones", () => {
    expect(
      flagCountries.every(
        (country) => !!country.flag,
      ),
    ).toBe(true);

    expect(flagCountries).toEqual(
      atlasCountries.filter(
        (country) => !!country.flag,
      ),
    );
  });

  it("gives every map region enough countries to play", () => {
    for (const [
      region,
      ids,
    ] of Object.entries(
      mapPlayableIds,
    )) {
      /* Four for a choice round, six for a placement board. */
      expect(
        ids.length,
        `${region} has only ${ids.length} answerable countries`,
      ).toBeGreaterThanOrEqual(6);
    }
  });

  it("only lists countries that exist in the roster as map answers", () => {
    const known = new Set(
      allAtlasCountries.map(
        (country) => country.id,
      ),
    );

    for (const [
      region,
      ids,
    ] of Object.entries(
      mapPlayableIds,
    )) {
      for (const id of ids) {
        expect(
          known,
          `${region} can ask about "${id}", which is not in the roster`,
        ).toContain(id);
      }
    }
  });
});
