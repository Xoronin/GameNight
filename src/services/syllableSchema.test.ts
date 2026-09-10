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
 * Cross-checks Syllable Rush against its migration. See schemaAudit.ts for
 * why this exists and how it reads the SQL.
 */

describe("Syllable Rush code matches its migration", () => {
  const sql = migrationSql(
    "syllable_rush",
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
    "src/services/syllableService.ts",
    "utf8",
  );

  it("has a migration at all", () => {
    expect(
      sql,
      "no migration file mentions syllable_rush",
    ).toContain(
      "create table if not exists syllable_rounds",
    );
  });

  it("allows every round status the app can set", () => {
    const allowed =
      allowedValuesFor(
        sql,
        "syllable_rounds",
        "status",
      );

    for (const status of unionMembers(
      types,
      "SyllableRoundStatus",
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
        "syllable_sessions",
        "status",
      );

    for (const status of unionMembers(
      types,
      "SyllableSessionStatus",
    )) {
      expect(allowed).toContain(
        status,
      );
    }
  });

  it("allows every turn outcome the app can record", () => {
    const allowed =
      allowedValuesFor(
        sql,
        "syllable_turns",
        "outcome",
      );

    for (const outcome of unionMembers(
      types,
      "SyllableOutcome",
    )) {
      expect(allowed).toContain(
        outcome,
      );
    }
  });

  it("only writes columns the schema declares", () => {
    const tables =
      declaredColumns(sql);

    const writes =
      serviceWrites(
        service,
        "syllable",
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
   * The clock and the player who just answered can both try to close the
   * same turn. Recording it is what settles which of them got there, and
   * that is this index rather than anything in the service — timing out
   * leans on it, treating a unique violation as "already handled".
   */
  it("lets a turn be recorded only once", () => {
    expect(flat).toContain(
      "unique (round_id, turn_number)",
    );
  });

  /* Seats are the turn order, so two players cannot share one. */
  it("keeps seats unique within a round", () => {
    expect(flat).toContain(
      "unique (round_id, seat)",
    );

    expect(flat).toContain(
      "unique (round_id, player_id)",
    );
  });

  /*
   * A word is looked up by language and spelling on every submission,
   * under a clock that can be five seconds. Without the index that is a
   * sequential scan of the whole dictionary.
   */
  it("indexes the dictionary the way it is queried", () => {
    expect(flat).toContain(
      "on syllable_words (language, word)",
    );
  });

  /*
   * Every screen updates off realtime rather than polling, so a table the
   * app watches has to be in the publication or the turn never passes for
   * anyone but the host.
   */
  it("publishes the tables the app subscribes to", () => {
    const hook = readFileSync(
      "src/hooks/useSyllableRound.ts",
      "utf8",
    );

    const watched = new Set(
      [
        ...hook.matchAll(
          /table:\s*"(syllable_\w+)"/g,
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
