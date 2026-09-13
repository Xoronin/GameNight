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

/*
 * The type list below is what marks a line as a column declaration, so a
 * type missing from it makes that column invisible to every audit — the
 * check passes while testing nothing. `numeric` was absent until Scale
 * needed it, which had also been hiding Spectrum's `value` column.
 */
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
          /^([a-z_]+)\s+(uuid|text|int|integer|smallint|bigint|numeric|decimal|real|double precision|boolean|jsonb|json|date|timestamptz)/,
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

/*
 * The property names an object literal sets, shorthand included.
 *
 * A multi-line body is read a line at a time and the trailing comma is
 * required: without it a wrapped ternary like `? someVar` on its own line
 * reads as a property and the audit fails on a column that does not
 * exist. A single-line body has no commas to anchor on, so it is split
 * instead — `.update({ status })` sets one column and has to be seen.
 */
function columnsIn(
  body: string,
): string[] {
  if (body.includes("\n")) {
    return [
      ...body.matchAll(
        /^\s*([a-z_]+)\s*(?::|,\s*$)/gm,
      ),
    ].map((match) => match[1]);
  }

  return body
    .split(",")
    .map(
      (part) =>
        part
          .trim()
          .match(
            /^([a-z_]+)\s*(?::|$)/,
          )?.[1],
    )
    .filter(
      (name): name is string =>
        !!name,
    );
}

/** One `.insert({...})` or `.update({...})` a service performs. */
export type ServiceWrite = {
  table: string;
  operation: string;
  columns: string[];
};

/*
 * Every write a service makes to its own tables, with the columns each one
 * sets, so an audit can hold them against what the migration declares.
 *
 * The column pattern has to accept shorthand — `{ fragment, word }` sets
 * two columns just as surely as `{ fragment: x }` sets one. Matching only
 * `name:` quietly skipped those, which left the columns most likely to be
 * named after their variable as the ones nothing checked.
 */
export function serviceWrites(
  source: string,
  prefix: string,
): ServiceWrite[] {
  const blocks = source.matchAll(
    new RegExp(
      `\\.from\\(\\s*"(${prefix}_\\w+)"\\s*\\)\\s*\\n?\\s*\\.(insert|update)\\(\\{([^{}]*)\\}\\)`,
      "g",
    ),
  );

  return [...blocks].map(
    ([, table, operation, body]) => ({
      table,
      operation,
      columns: columnsIn(body),
    }),
  );
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
