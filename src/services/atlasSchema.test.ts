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
 * Cross-checks the Atlas code against the Atlas migrations. See
 * schemaAudit.ts for why this exists and how it reads the SQL.
 */

describe("Atlas code matches its migrations", () => {
  const sql = migrationSql("atlas");

  const types = readFileSync(
    "src/types/game.ts",
    "utf8",
  );

  const service = readFileSync(
    "src/services/atlasService.ts",
    "utf8",
  );

  it("allows every round type the app can produce", () => {
    const allowed = allowedValuesFor(
      sql,
      "atlas_rounds",
      "round_type",
    );

    for (const type of unionMembers(
      types,
      "AtlasRoundType",
    )) {
      expect(
        allowed,
        `round type "${type}" is missing from the round_type check constraint — add a migration widening it`,
      ).toContain(type);
    }
  });

  it("allows every round status the app can set", () => {
    const allowed = allowedValuesFor(
      sql,
      "atlas_rounds",
      "status",
    );

    for (const status of unionMembers(
      types,
      "AtlasRoundStatus",
    )) {
      expect(allowed).toContain(
        status,
      );
    }
  });

  it("allows every session status the app can set", () => {
    const allowed = allowedValuesFor(
      sql,
      "atlas_sessions",
      "status",
    );

    for (const status of unionMembers(
      types,
      "AtlasSessionStatus",
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
        "atlas",
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
});
