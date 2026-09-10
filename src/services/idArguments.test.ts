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
 * Catches an id being passed where a different id was expected.
 *
 * Emoji Decode shipped unable to start: the hook called
 * getLatestEmojiRound(lastSessionId), but that function took what it
 * called roomId and filtered on room_id, so the query asked for a round
 * whose room is a session — always nothing, so the round never appeared
 * and the game sat on its start screen forever.
 *
 * Every id in this codebase is a string, so nothing in the type system
 * objects. This compares the *name* of the argument against the name of
 * the parameter, which is the only signal there is short of branding the
 * types.
 */

const KINDS = [
  "room",
  "session",
  "round",
  "player",
  "puzzle",
  "question",
  "item",
  "topic",
];

/** Which id an identifier looks like, or null when it says nothing. */
function kindOf(
  identifier: string,
): string | null {
  const name = identifier
    .toLowerCase()
    .replace(/[?.]/g, "");

  const matches = KINDS.filter(
    (kind) => name.includes(kind),
  );

  /* "roomOrSession" says nothing useful; only a single reading counts. */
  return matches.length === 1
    ? matches[0]!
    : null;
}

/** The argument list of a call, respecting nested parentheses. */
function argumentsOf(
  source: string,
  callStart: number,
): string[] | null {
  let depth = 0;
  let index = callStart;

  for (
    ;
    index < source.length;
    index += 1
  ) {
    const char = source[index];

    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;

      if (depth === 0) {
        break;
      }
    }
  }

  if (depth !== 0) {
    return null;
  }

  const inner = source.slice(
    callStart + 1,
    index,
  );

  /* Anything with its own call or object literal is out of scope. */
  if (/[(){}[\]]/.test(inner)) {
    return null;
  }

  return inner
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function sourceFiles(
  directory: string,
  suffixes: string[],
): string[] {
  return readdirSync(directory, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      return sourceFiles(
        path,
        suffixes,
      );
    }

    return suffixes.some((suffix) =>
      entry.name.endsWith(suffix),
    ) && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

/** Exported service functions, mapped to their parameter names. */
function serviceSignatures(): Record<
  string,
  string[]
> {
  const signatures: Record<
    string,
    string[]
  > = {};

  for (const file of sourceFiles(
    "src/services",
    [".ts"],
  )) {
    const source = readFileSync(
      file,
      "utf8",
    );

    for (const match of source.matchAll(
      /export async function (\w+)\(([^)]*)\)/g,
    )) {
      signatures[match[1]!] =
        match[2]!
          .split(",")
          .map((part) =>
            part
              .trim()
              .split(":")[0]!
              .trim(),
          )
          .filter(Boolean);
    }
  }

  return signatures;
}

describe("id arguments match their parameters", () => {
  const signatures =
    serviceSignatures();

  const callers = [
    ...sourceFiles("src/hooks", [
      ".ts",
    ]),
    ...sourceFiles("src/games", [
      ".tsx",
    ]),
    ...sourceFiles("src/pages", [
      ".tsx",
    ]),
  ];

  it("has something to check", () => {
    expect(
      Object.keys(signatures)
        .length,
    ).toBeGreaterThan(50);

    expect(
      callers.length,
    ).toBeGreaterThan(15);
  });

  it("never passes one kind of id where another is expected", () => {
    const problems: string[] = [];

    for (const file of callers) {
      const source = readFileSync(
        file,
        "utf8",
      );

      for (const [
        name,
        parameters,
      ] of Object.entries(
        signatures,
      )) {
        const call = new RegExp(
          `\\b${name}\\s*\\(`,
          "g",
        );

        for (const match of source.matchAll(
          call,
        )) {
          const args = argumentsOf(
            source,
            match.index +
              match[0].length -
              1,
          );

          if (!args) {
            continue;
          }

          args.forEach(
            (argument, position) => {
              const expected =
                kindOf(
                  parameters[
                    position
                  ] ?? "",
                );

              const actual =
                kindOf(argument);

              if (
                expected &&
                actual &&
                expected !== actual
              ) {
                problems.push(
                  `${file}: ${name}(...) argument ${position + 1} is "${argument}" but the parameter is "${parameters[position]}"`,
                );
              }
            },
          );
        }
      }
    }

    expect(
      problems,
      `\n${problems.join("\n")}\n`,
    ).toEqual([]);
  });
});
