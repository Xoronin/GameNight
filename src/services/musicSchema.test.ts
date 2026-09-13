import { readFileSync } from "node:fs";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  allowedValuesFor,
  declaredColumns,
  migrationSql,
  serviceWrites,
  unionMembers,
} from "./schemaAudit";
import de from "../i18n/de";
import en from "../i18n/en";
import type { SpotifyStatus } from "../hooks/useSpotifyHost";

/*
 * Cross-checks Music Timeline against its migration. See schemaAudit.ts
 * for why this exists and how it reads the SQL.
 */

describe("Music Timeline code matches its migration", () => {
  const sql = migrationSql(
    "music_timeline",
  );

  const flat = sql.replace(
    /\s+/g,
    " ",
  );

  const types = readFileSync(
    "src/types/game.ts",
    "utf8",
  );

  const service = readFileSync(
    "src/services/musicService.ts",
    "utf8",
  );

  it("has a migration at all", () => {
    expect(
      sql,
      "no migration file mentions music_timeline",
    ).toContain(
      "create table if not exists music_rounds",
    );
  });

  it("allows every round status the app can set", () => {
    const allowed =
      allowedValuesFor(
        sql,
        "music_rounds",
        "status",
      );

    for (const status of unionMembers(
      types,
      "MusicRoundStatus",
    )) {
      expect(
        allowed,
        `round status "${status}" is missing from a check constraint — add a migration widening it`,
      ).toContain(status);
    }
  });

  it("allows every session status the app can set", () => {
    const allowed =
      allowedValuesFor(
        sql,
        "music_sessions",
        "status",
      );

    for (const status of unionMembers(
      types,
      "MusicSessionStatus",
    )) {
      expect(allowed).toContain(
        status,
      );
    }
  });

  it("only writes columns the schema declares", () => {
    const tables =
      declaredColumns(sql);

    const writes = serviceWrites(
      service,
      "music",
    );

    /* If the scrape finds nothing, the test is not testing anything. */
    expect(
      writes.length,
    ).toBeGreaterThan(5);

    for (const write of writes) {
      for (const column of write.columns) {
        expect(
          tables[write.table],
          `${write.operation} on ${write.table} writes "${column}", which no migration declares`,
        ).toContain(column);
      }
    }
  });

  /*
   * One placement per player per round. The player's own click and their
   * clock running out can both reach it, and this index is what settles
   * which of them counted — placeMusicCard treats the violation as
   * "already settled" rather than as an error.
   */
  it("lets a round be settled only once", () => {
    expect(flat).toContain(
      "unique (round_id, player_id)",
    );
  });

  /* A player cannot hold the same song twice, however it was won. */
  it("keeps a timeline free of duplicates", () => {
    expect(flat).toContain(
      "unique (session_id, player_id, song_id)",
    );
  });

  /*
   * The year is the whole basis for scoring, so the column has to be
   * there and constrained — a null or a zero would make every placement
   * wrong in a way nobody could explain.
   */
  it("requires a sane release year", () => {
    expect(flat).toContain(
      "release_year int not null",
    );

    expect(flat).toContain(
      "check (release_year between 1900 and 2100)",
    );
  });

  it("publishes the tables the app subscribes to", () => {
    const hook = readFileSync(
      "src/hooks/useMusicRound.ts",
      "utf8",
    );

    const watched = new Set(
      [
        ...hook.matchAll(
          /table:\s*"(music_\w+)"/g,
        ),
      ].map((match) => match[1]),
    );

    expect(
      watched.size,
    ).toBeGreaterThan(2);

    for (const table of watched) {
      expect(
        flat,
        `${table} is watched for realtime changes but never added to supabase_realtime`,
      ).toContain(
        `alter publication supabase_realtime add table ${table};`,
      );
    }
  });
});

/*
 * The Spotify panel builds its label key from the status at runtime
 * (`music.spotify.${status}`), which no static scan of the source can see
 * — so the app-wide i18n test cannot catch a missing one. A host would
 * just read "music.spotify.no_premium" off the screen.
 */
describe("every Spotify status has a label", () => {
  const statuses: SpotifyStatus[] = [
    "unconfigured",
    "disconnected",
    "connecting",
    "ready",
    "no_premium",
    "error",
  ];

  it("covers every status the hook can return", () => {
    const hook = readFileSync(
      "src/hooks/useSpotifyHost.ts",
      "utf8",
    );

    const declared = [
      ...(hook
        .match(
          /export type SpotifyStatus =([\s\S]*?);/,
        )?.[1]
        .matchAll(/"([a-z_]+)"/g) ??
        []),
    ].map((match) => match[1]);

    expect([...statuses].sort()).toEqual(
      declared.sort(),
    );
  });

  for (const language of [
    "en",
    "de",
  ] as const) {
    it(`has a ${language} label for each`, () => {
      const labels = (
        language === "en" ? en : de
      ).music.spotify as Record<
        string,
        string
      >;

      for (const status of statuses) {
        expect(
          labels[status],
          `music.spotify.${status} is missing in ${language}`,
        ).toBeTruthy();
      }
    });
  }
});
