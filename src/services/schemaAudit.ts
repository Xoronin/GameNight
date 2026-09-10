import {
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";

/*
 * Shared tooling for the per-game schema audits.
 *
 * These exist because a shipped release could not play its two newest
 * Atlas modes at all: they were added to AtlasRoundType but not to the
 * round_type check constraint, so the database rejected every attempt to
 * create one. Every test at the time exercised the TypeScript, which knew
 * about seven modes; nothing compared it against the SQL, which knew
 * about five.
 *
 * Reading the migrations as text is crude, but it needs no database —
 * which is the point, since CI has none. Imported only by tests.
 */

const MIGRATIONS = "supabase/migrations";

/** Every migration whose filename mentions this game. */
export function migrationSql(
  game: string,
): string {
  return readdirSync(MIGRATIONS)
    .filter(
      (file) =>
        file.includes(game) &&
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
export function allowedValues(
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

/*
 * The same as above, but reading only the SQL that belongs to one table:
 * its `create table` body plus any `alter table` on it.
 *
 * Scoping matters because several tables in a game share the column name
 * `status`. Scanning the whole file merges their constraints, and a value
 * only one table allows then looks allowed everywhere — which is exactly
 * the mistake these audits exist to catch.
 */
export function allowedValuesFor(
  sql: string,
  table: string,
  column: string,
): Set<string> {
  const parts: string[] = [];

  const body = sql.match(
    new RegExp(
      `create table if not exists ${table} \\(([\\s\\S]*?)\\n\\);`,
    ),
  );

  if (body) {
    parts.push(body[1]);
  }

  for (const altered of sql.matchAll(
    new RegExp(
      `alter table ${table}\\b([\\s\\S]*?);`,
      "g",
    ),
  )) {
    parts.push(altered[1]);
  }

  expect(
    parts.length,
    `no SQL found for table ${table}`,
  ).toBeGreaterThan(0);

  return allowedValues(
    parts.join("\n"),
    column,
  );
}

/** Columns each `create table` declares, plus any added later. */
export function declaredColumns(
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
export function unionMembers(
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
