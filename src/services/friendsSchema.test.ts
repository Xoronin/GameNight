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
  unionMembers,
} from "./schemaAudit";

/*
 * Cross-checks Know Your Friends against its migration. See
 * schemaAudit.ts for why this exists and how it reads the SQL.
 */

describe("Know Your Friends code matches its migration", () => {
  const sql = migrationSql(
    "know_your_friends",
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
    "src/services/friendsService.ts",
    "utf8",
  );

  const game = readFileSync(
    "src/games/know-your-friends/KnowYourFriendsGame.tsx",
    "utf8",
  );

  it("has a migration at all", () => {
    expect(
      sql,
      "no migration file mentions know_your_friends",
    ).toContain(
      "create table if not exists friends_rounds",
    );
  });

  it("allows every round status the app can set", () => {
    const allowed = allowedValuesFor(
      sql,
      "friends_rounds",
      "status",
    );

    for (const status of unionMembers(
      types,
      "FriendsRoundStatus",
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
      "friends_sessions",
      "status",
    );

    for (const status of unionMembers(
      types,
      "FriendsSessionStatus",
    )) {
      expect(allowed).toContain(
        status,
      );
    }
  });

  it("only writes columns the schema declares", () => {
    const tables =
      declaredColumns(sql);

    const writes = [
      ...service.matchAll(
        /\.from\(\s*"(friends_\w+)"\s*\)\s*\n?\s*\.(insert|update)\(\{([^{}]*)\}\)/g,
      ),
    ];

    /* If the scrape finds nothing, the test is not testing anything. */
    expect(
      writes.length,
    ).toBeGreaterThan(5);

    for (const [
      ,
      table,
      operation,
      body,
    ] of writes) {
      const columns = [
        ...body.matchAll(
          /^\s*([a-z_]+):/gm,
        ),
      ].map((m) => m[1]);

      for (const column of columns) {
        expect(
          tables[table],
          `${operation} on ${table} writes "${column}", which no migration declares`,
        ).toContain(column);
      }
    }
  });

  /*
   * A prediction is one per player per round, and that is the constraint
   * rather than anything in the service — submit leans on it, treating a
   * unique violation as "already answered" instead of an error.
   */
  it("stops a player answering the same round twice", () => {
    expect(flat).toContain(
      "unique (round_id, player_id)",
    );
  });

  /*
   * The subject rotates by round number, so a session must not be able to
   * hold two rows for the same round or two players would be the subject.
   */
  it("stops a session holding one round twice", () => {
    expect(flat).toContain(
      "unique (session_id, round_number)",
    );
  });

  /*
   * The board shows one lettered button per option and the column only
   * accepts indexes inside that range, so the two have to agree.
   */
  it("accepts exactly the option indexes the board offers", () => {
    const letters = game.match(
      /const OPTION_LETTERS = \[([^\]]*)\]/,
    );

    expect(letters).toBeTruthy();

    const count = [
      ...letters![1].matchAll(
        /"[A-Z]"/g,
      ),
    ].length;

    expect(flat).toContain(
      `check (selected_index between 0 and ${count - 1})`,
    );

    expect(flat).toContain(
      `array_length(options_en, 1) = ${count}`,
    );

    expect(flat).toContain(
      `array_length(options_de, 1) = ${count}`,
    );
  });

  /*
   * Every screen updates off realtime rather than polling, so a table the
   * app watches has to be in the publication or the round never advances
   * for anyone but the host.
   */
  it("publishes the tables the app subscribes to", () => {
    const hook = readFileSync(
      "src/hooks/useFriendsRound.ts",
      "utf8",
    );

    const watched = new Set(
      [
        ...hook.matchAll(
          /table:\s*"(friends_\w+)"/g,
        ),
      ].map((match) => match[1]),
    );

    expect(
      watched.size,
    ).toBeGreaterThan(0);

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
