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

/*
 * Cross-checks the Atlas code against the Atlas migrations.
 *
 * This exists because a shipped release could not play its two newest
 * modes at all: they were added to AtlasRoundType but not to the
 * round_type check constraint, so the database rejected every attempt
 * to create one. Every test at the time exercised the TypeScript, which
 * knew about seven modes; nothing compared it against the SQL, which
 * knew about five.
 *
 * Reading the migrations as text is crude, but it needs no database —
 * which is the point, since CI has none.
 */

const MIGRATIONS = "supabase/migrations";

function atlasSql(): string {
  return readdirSync(MIGRATIONS)
    .filter(
      (file) =>
        file.includes("atlas") &&
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
}

/** Values a `check (col in (...))` constraint permits, latest wins. */
function allowedValues(
  sql: string,
  column: string,
): Set<string> {
  const pattern = new RegExp(
    `check\\s*\\(\\s*\\n?\\s*${column} in \\(([^)]*)\\)`,
    "g",
  );

  const found = new Set<string>();

  for (const match of sql.matchAll(
    pattern,
  )) {
    for (const value of match[1].matchAll(
      /'([^']+)'/g,
    )) {
      found.add(value[1]);
    }
  }

  return found;
}

/** Columns each `create table` declares, plus any added later. */
function declaredColumns(
  sql: string,
): Record<string, Set<string>> {
  const tables: Record<
    string,
    Set<string>
  > = {};

  for (const match of sql.matchAll(
    /create table if not exists (\w+) \(([\s\S]*?)\n\);/g,
  )) {
    const columns = new Set<string>();

    for (const line of match[2].split(
      "\n",
    )) {
      const column = line
        .trim()
        .match(
          /^([a-z_]+)\s+(uuid|text|int|smallint|boolean|jsonb|timestamptz)/,
        );

      if (column) {
        columns.add(column[1]);
      }
    }

    tables[match[1]] = columns;
  }

  for (const match of sql.matchAll(
    /alter table (\w+)([\s\S]*?);/g,
  )) {
    for (const added of match[2].matchAll(
      /add column if not exists ([a-z_]+)/g,
    )) {
      tables[match[1]]?.add(added[1]);
    }
  }

  return tables;
}

/** String literals in a TypeScript union type. */
function unionMembers(
  source: string,
  name: string,
): string[] {
  const match = source.match(
    new RegExp(
      `export type ${name} =([\\s\\S]*?);`,
    ),
  );

  expect(
    match,
    `${name} not found`,
  ).toBeTruthy();

  return [
    ...match![1].matchAll(
      /"([a-z_]+)"/g,
    ),
  ].map((m) => m[1]);
}

describe("Atlas code matches its migrations", () => {
  const sql = atlasSql();

  const types = readFileSync(
    "src/types/game.ts",
    "utf8",
  );

  const service = readFileSync(
    "src/services/atlasService.ts",
    "utf8",
  );

  it("allows every round type the app can produce", () => {
    const allowed = allowedValues(
      sql,
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
    const allowed = allowedValues(
      sql,
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
    const allowed = allowedValues(
      sql,
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

    const writes = [
      ...service.matchAll(
        /\.from\(\s*"(atlas_\w+)"\s*\)\s*\.(insert|update)\(\{([\s\S]*?)\n\s*\}\)/g,
      ),
    ];

    /* If the scrape finds nothing, the test is not testing anything. */
    expect(
      writes.length,
    ).toBeGreaterThan(4);

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
});
