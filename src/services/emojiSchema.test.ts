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
 * Cross-checks the Emoji Decode code against its migration. See
 * schemaAudit.ts for why this exists and how it reads the SQL.
 */

describe("Emoji Decode code matches its migration", () => {
  const sql = migrationSql("emoji");

  const types = readFileSync(
    "src/types/game.ts",
    "utf8",
  );

  const service = readFileSync(
    "src/services/emojiService.ts",
    "utf8",
  );

  it("has a migration at all", () => {
    expect(
      sql,
      "no migration file mentions emoji",
    ).toContain(
      "create table if not exists emoji_rounds",
    );
  });

  it("allows every round status the app can set", () => {
    const allowed = allowedValuesFor(
      sql,
      "emoji_rounds",
      "status",
    );

    for (const status of unionMembers(
      types,
      "EmojiRoundStatus",
    )) {
      expect(
        allowed,
        `round status "${status}" is missing from a check constraint — add a migration widening it`,
      ).toContain(status);
    }
  });

  it("allows every session status the app can set", () => {
    const allowed = allowedValuesFor(
      sql,
      "emoji_sessions",
      "status",
    );

    for (const status of unionMembers(
      types,
      "EmojiSessionStatus",
    )) {
      expect(allowed).toContain(
        status,
      );
    }
  });

  it("only writes columns the schema declares", () => {
    const tables =
      declaredColumns(sql);

    const writes =
      serviceWrites(
        service,
        "emoji",
      );

    /* If the scrape finds nothing, the test is not testing anything. */
    expect(
      writes.length,
    ).toBeGreaterThan(3);

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
   * A player may guess as often as they like but score once, and that is
   * the index rather than anything in the service.
   */
  it("stops a player scoring the same round twice", () => {
    expect(
      sql.replace(/\s+/g, " "),
    ).toContain(
      "create unique index if not exists emoji_guesses_solved_idx on emoji_guesses (round_id, player_id) where is_correct",
    );
  });
});
