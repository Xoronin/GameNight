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

/*
 * Cross-checks Scale against its migration. See schemaAudit.ts for why
 * this exists and how it reads the SQL.
 */

describe("Scale code matches its migration", () => {
  const sql =
    migrationSql("scale_game");

  const flat = sql.replace(
    /\s+/g,
    " ",
  );

  const types = readFileSync(
    "src/types/game.ts",
    "utf8",
  );

  const service = readFileSync(
    "src/services/scaleService.ts",
    "utf8",
  );

  it("has a migration at all", () => {
    expect(
      sql,
      "no migration file mentions scale_game",
    ).toContain(
      "create table if not exists scale_rounds",
    );
  });

  it("allows every round status the app can set", () => {
    const allowed =
      allowedValuesFor(
        sql,
        "scale_rounds",
        "status",
      );

    for (const status of unionMembers(
      types,
      "ScaleRoundStatus",
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
        "scale_sessions",
        "status",
      );

    for (const status of unionMembers(
      types,
      "ScaleSessionStatus",
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
      "scale",
    );

    /* If the scrape finds nothing, the test is not testing anything. */
    expect(
      writes.length,
    ).toBeGreaterThan(4);

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
   * One guess per player per round. The player locking in and the host's
   * clock revealing can both arrive at once, and this index is what
   * settles it — submitScaleGuess treats the violation as "already
   * guessed" rather than as an error.
   */
  it("lets a player guess only once per round", () => {
    expect(flat).toContain(
      "unique (round_id, player_id)",
    );
  });

  /*
   * A ratio of zero or less would make ln() return -Infinity or NaN and
   * take the whole reveal down with it, so the column refuses one.
   */
  it("refuses a ratio that would break the scoring", () => {
    expect(flat).toContain(
      "ratio numeric not null check (ratio > 0)",
    );
  });

  /* Height is the entire basis for scoring. */
  it("requires a positive height on every object", () => {
    expect(flat).toContain(
      "height_m numeric not null check (height_m > 0)",
    );
  });

  /* A round where both objects are the same has no answer. */
  it("refuses a round that pairs an object with itself", () => {
    expect(flat).toContain(
      "check (reference_id <> mystery_id)",
    );
  });

  /*
   * shape_key is the join to the generated silhouette file, so two
   * objects sharing one would silently draw the wrong thing.
   */
  it("keeps shape keys unique", () => {
    expect(flat).toContain(
      "shape_key text not null unique",
    );
  });

  it("publishes the tables the app subscribes to", () => {
    const hook = readFileSync(
      "src/hooks/useScaleRound.ts",
      "utf8",
    );

    const watched = new Set(
      [
        ...hook.matchAll(
          /table:\s*"(scale_\w+)"/g,
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
