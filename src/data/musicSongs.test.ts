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
import { GAME_ROUND_COUNT_OPTIONS } from "./gameTimers";

/*
 * The songs live in a migration rather than in the code. release_year is
 * the only thing the game scores on, so what matters here is that it is
 * present, sane, and spread widely enough that a timeline has somewhere to
 * grow in both directions.
 */

const MIGRATIONS = "supabase/migrations";

type Song = {
  title: string;
  artist: string;
  year: number;
  locale: string;
};

function songs(): Song[] {
  const sql = readdirSync(MIGRATIONS)
    .filter(
      (file) =>
        file.includes(
          "music_timeline",
        ) && file.endsWith(".sql"),
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
      /\n {2}\('((?:[^']|'')*)', '((?:[^']|'')*)', (\d{4}), '(intl|de)'\)/g,
    ),
  ].map((match) => ({
    title: match[1].replaceAll(
      "''",
      "'",
    ),
    artist: match[2].replaceAll(
      "''",
      "'",
    ),
    year: Number(match[3]),
    locale: match[4],
  }));
}

const all = songs();

describe("Music Timeline songs", () => {
  /* If the scrape finds nothing, the rest of this proves nothing. */
  it("reads the seeded songs", () => {
    expect(
      all.length,
    ).toBeGreaterThan(60);
  });

  /*
   * A game runs until somebody fills their timeline, dealing one song a
   * turn and never repeating. Running dry mid-game would strand the room,
   * so there has to be comfortable headroom over the longest game.
   */
  it("has enough songs for the longest game", () => {
    const target = Math.max(
      ...GAME_ROUND_COUNT_OPTIONS[
        "music-timeline"
      ],
    );

    /* Worst case: ten players, every one of them missing every guess. */
    expect(
      all.length,
      `a ${target}-card game needs a lot of songs`,
    ).toBeGreaterThanOrEqual(
      target * 6,
    );
  });

  it("gives every song a plausible year", () => {
    for (const song of all) {
      expect(
        song.year,
        `${song.title} (${song.artist})`,
      ).toBeGreaterThanOrEqual(1900);

      expect(
        song.year,
      ).toBeLessThanOrEqual(2030);
    }
  });

  it("has no empty titles or artists", () => {
    for (const song of all) {
      expect(
        song.title.trim().length,
      ).toBeGreaterThan(0);

      expect(
        song.artist.trim().length,
      ).toBeGreaterThan(0);
    }
  });

  it("never lists the same recording twice", () => {
    const keys = all.map(
      (song) =>
        `${song.title.toLowerCase()}|${song.artist.toLowerCase()}`,
    );

    expect(new Set(keys).size).toBe(
      keys.length,
    );
  });

  /*
   * An English room is dealt only 'intl'. If that pool were thin the
   * English game would run out long before the German one.
   */
  it("has a deep enough international pool on its own", () => {
    const intl = all.filter(
      (song) =>
        song.locale === "intl",
    );

    expect(
      intl.length,
    ).toBeGreaterThanOrEqual(
      Math.max(
        ...GAME_ROUND_COUNT_OPTIONS[
          "music-timeline"
        ],
      ) * 5,
    );
  });

  it("ships German-language songs for German rooms", () => {
    expect(
      all.filter(
        (song) =>
          song.locale === "de",
      ).length,
    ).toBeGreaterThan(15);
  });

  /*
   * The game is placing a song relative to others. If everything clustered
   * in one decade every placement would be a coin toss between two
   * adjacent cards, so the spread is part of whether the game works.
   */
  it("covers a wide span of decades", () => {
    const decades = new Set(
      all.map(
        (song) =>
          Math.floor(
            song.year / 10,
          ) * 10,
      ),
    );

    expect(
      decades.size,
    ).toBeGreaterThanOrEqual(6);
  });

  it("puts at least a few songs in every decade it covers", () => {
    const counts = new Map<
      number,
      number
    >();

    for (const song of all) {
      const decade =
        Math.floor(song.year / 10) *
        10;

      counts.set(
        decade,
        (counts.get(decade) ?? 0) + 1,
      );
    }

    /* The 1950s and the current decade are naturally thin; the rest are not. */
    for (const [
      decade,
      count,
    ] of counts) {
      if (
        decade >= 1960 &&
        decade <= 2010
      ) {
        expect(
          count,
          `only ${count} songs from the ${decade}s`,
        ).toBeGreaterThanOrEqual(8);
      }
    }
  });
});
