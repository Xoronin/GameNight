import {
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";
import { silhouettes } from "./scaleSilhouettes";
import {
  MAX_PAIR_RATIO,
  MIN_PAIR_RATIO,
} from "../services/scaleService";

/*
 * The objects live in a migration and their silhouettes in a generated
 * file, and the game only works if the two agree: every object needs a
 * shape to draw, and every shape needs a height to score against.
 */

const MIGRATIONS = "supabase/migrations";

type Entry = {
  key: string;
  nameEn: string;
  nameDe: string;
  heightM: number;
};

function objects(): Entry[] {
  const sql = readdirSync(MIGRATIONS)
    .filter(
      (file) =>
        file.includes("scale_game") &&
        file.endsWith(".sql"),
    )
    .sort()
    .map((file) =>
      readFileSync(
        join(MIGRATIONS, file),
        "utf8",
      ),
    )
    .join("\n");

  return [
    ...sql.matchAll(
      /\n {2}\('([a-z_]+)', '((?:[^']|'')*)', '((?:[^']|'')*)', ([\d.]+)\)/g,
    ),
  ].map((match) => ({
    key: match[1],
    nameEn: match[2].replaceAll(
      "''",
      "'",
    ),
    nameDe: match[3].replaceAll(
      "''",
      "'",
    ),
    heightM: Number(match[4]),
  }));
}

const all = objects();

describe("Scale objects", () => {
  /* If the scrape finds nothing, the rest of this proves nothing. */
  it("reads the seeded objects", () => {
    expect(
      all.length,
    ).toBeGreaterThan(20);
  });

  /*
   * The one that matters. A round draws the shape and scores the height;
   * an object missing either half is a round nobody can play.
   */
  it("has a silhouette for every object", () => {
    for (const entry of all) {
      expect(
        silhouettes[entry.key],
        `no silhouette for "${entry.key}"`,
      ).toBeTruthy();
    }
  });

  it("has an object for every silhouette", () => {
    const keys = new Set(
      all.map((entry) => entry.key),
    );

    for (const key of Object.keys(
      silhouettes,
    )) {
      expect(
        keys.has(key),
        `silhouette "${key}" has no object to give it a height`,
      ).toBe(true);
    }
  });

  it("gives every object a real height", () => {
    for (const entry of all) {
      expect(
        entry.heightM,
        entry.key,
      ).toBeGreaterThan(0);

      expect(
        entry.heightM,
      ).toBeLessThan(1000);
    }
  });

  it("names every object in both languages", () => {
    for (const entry of all) {
      expect(
        entry.nameEn.trim().length,
      ).toBeGreaterThan(0);

      expect(
        entry.nameDe.trim().length,
      ).toBeGreaterThan(0);
    }
  });

  it("lists no object twice", () => {
    const keys = all.map(
      (entry) => entry.key,
    );

    expect(new Set(keys).size).toBe(
      keys.length,
    );
  });

  /*
   * Every object has to be usable. One with no partner inside the ratio
   * band can never be dealt, so it is dead weight in the migration.
   */
  it("can pair every object with something", () => {
    for (const entry of all) {
      const partners = all.filter(
        (other) => {
          if (
            other.key === entry.key
          ) {
            return false;
          }

          const ratio =
            other.heightM /
            entry.heightM;

          const spread =
            ratio >= 1
              ? ratio
              : 1 / ratio;

          return (
            spread >=
              MIN_PAIR_RATIO &&
            spread <= MAX_PAIR_RATIO
          );
        },
      );

      expect(
        partners.length,
        `"${entry.key}" (${entry.heightM} m) has nothing to stand next to`,
      ).toBeGreaterThan(0);
    }
  });

  /*
   * A silhouette is normalised to a height of 100, so width is its true
   * aspect ratio. A zero or a wild one means the generator lost the
   * shape's bounding box.
   */
  it("gives every silhouette a sane aspect ratio", () => {
    for (const [
      key,
      shape,
    ] of Object.entries(silhouettes)) {
      expect(shape.height, key).toBe(
        100,
      );

      expect(
        shape.width,
        key,
      ).toBeGreaterThan(5);

      expect(
        shape.width,
        key,
      ).toBeLessThan(400);

      expect(
        shape.paths.length,
        key,
      ).toBeGreaterThan(0);
    }
  });

  it("spans a wide range of heights", () => {
    const heights = all.map(
      (entry) => entry.heightM,
    );

    expect(
      Math.max(...heights) /
        Math.min(...heights),
    ).toBeGreaterThan(50);
  });
});
