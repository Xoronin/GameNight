import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

/*
 * Files in-app feedback as a GitHub issue.
 *
 * This runs on the server because the token that opens issues can write to
 * the repository — anything shipped to the browser is readable by anyone
 * playing, so the token can never go there.
 *
 * Setup: set GITHUB_TOKEN (a fine-grained token with Issues: read & write
 * on the repository) in the Vercel project. GITHUB_REPO is optional and
 * defaults to this repository. Setting FEEDBACK_DISABLED turns the
 * endpoint off without a deploy.
 */

const DEFAULT_REPO =
  "Xoronin/GameNight";

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;
/** Enough for a route or a game id, short enough not to be an essay. */
const MAX_CONTEXT_LENGTH = 80;
const MAX_TITLE_LENGTH = 72;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 3;

const KINDS = [
  "bug",
  "idea",
] as const;

type FeedbackKind =
  (typeof KINDS)[number];

const LABELS: Record<
  FeedbackKind,
  string
> = {
  bug: "bug",
  idea: "enhancement",
};

/*
 * Best-effort only: serverless instances come and go and each keeps its
 * own copy, so this thins out a burst rather than enforcing a quota. It is
 * here to stop an accidental double-tap turning into a dozen issues.
 */
const recentByClient = new Map<
  string,
  number[]
>();

function isRateLimited(
  client: string,
): boolean {
  const now = Date.now();

  const recent = (
    recentByClient.get(client) ?? []
  ).filter(
    (at) =>
      now - at < RATE_WINDOW_MS,
  );

  if (
    recent.length >=
    RATE_MAX_PER_WINDOW
  ) {
    recentByClient.set(
      client,
      recent,
    );

    return true;
  }

  recent.push(now);

  recentByClient.set(
    client,
    recent,
  );

  /* The map is per-instance and short-lived, but do not let it grow. */
  if (recentByClient.size > 500) {
    for (const [
      key,
      stamps,
    ] of recentByClient) {
      if (
        stamps.every(
          (at) =>
            now - at >=
            RATE_WINDOW_MS,
        )
      ) {
        recentByClient.delete(key);
      }
    }
  }

  return false;
}

/*
 * Feedback is written by players and read on GitHub, where the body is
 * rendered as Markdown. Quoting it as a code block keeps an @mention from
 * paging a stranger and a stray heading from restyling the issue, and the
 * backtick strip stops the quoting itself being escaped out of.
 */
function quote(text: string) {
  return [
    "```text",
    text.replace(/`/g, "'"),
    "```",
  ].join("\n");
}

/** Newlines survive; every other control character is dropped. */
function isPrintable(
  character: string,
) {
  const code =
    character.codePointAt(0) ?? 0;

  return (
    character === "\n" ||
    (code >= 0x20 && code !== 0x7f)
  );
}

function cleanText(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return [...value]
    .filter(isPrintable)
    .join("")
    .trim()
    .slice(0, maxLength);
}

function titleFor(
  kind: FeedbackKind,
  message: string,
) {
  const firstLine =
    message
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? message;

  const summary =
    firstLine.length >
    MAX_TITLE_LENGTH
      ? `${firstLine
          .slice(
            0,
            MAX_TITLE_LENGTH - 1,
          )
          .trimEnd()}…`
      : firstLine;

  return kind === "bug"
    ? `Bug: ${summary}`
    : `Idea: ${summary}`;
}

function bodyFor(
  message: string,
  context: Record<string, string>,
) {
  const rows = Object.entries(
    context,
  ).filter(([, value]) => value);

  return [
    quote(message),
    "",
    ...rows.map(
      ([label, value]) =>
        `**${label}:** ${value}`,
    ),
    "",
    "_Sent from the in-app feedback form._",
  ].join("\n");
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== "POST") {
    response.setHeader(
      "Allow",
      "POST",
    );

    return response
      .status(405)
      .json({
        error: "method_not_allowed",
      });
  }

  if (
    process.env.FEEDBACK_DISABLED
  ) {
    return response
      .status(503)
      .json({ error: "disabled" });
  }

  const token =
    process.env.GITHUB_TOKEN;

  if (!token) {
    /* A misconfigured deploy, not something the player did wrong. */
    console.error(
      "GITHUB_TOKEN is not set - feedback cannot be filed.",
    );

    return response
      .status(503)
      .json({
        error: "not_configured",
      });
  }

  let parsed: Record<
    string,
    unknown
  >;

  try {
    parsed =
      typeof request.body ===
      "string"
        ? (JSON.parse(
            request.body,
          ) as Record<
            string,
            unknown
          >)
        : ((request.body ??
            {}) as Record<
            string,
            unknown
          >);
  } catch {
    return response
      .status(400)
      .json({
        error: "bad_request",
      });
  }

  const kind = KINDS.includes(
    parsed.kind as FeedbackKind,
  )
    ? (parsed.kind as FeedbackKind)
    : "bug";

  const message = cleanText(
    parsed.message,
    MAX_MESSAGE_LENGTH,
  );

  if (
    message.length <
    MIN_MESSAGE_LENGTH
  ) {
    return response
      .status(400)
      .json({ error: "too_short" });
  }

  const client =
    (
      request.headers[
        "x-forwarded-for"
      ] as string | undefined
    )
      ?.split(",")[0]
      ?.trim() || "unknown";

  if (isRateLimited(client)) {
    return response
      .status(429)
      .json({
        error: "rate_limited",
      });
  }

  const repo =
    process.env.GITHUB_REPO ??
    DEFAULT_REPO;

  const body = bodyFor(message, {
    From: cleanText(
      parsed.from,
      MAX_CONTEXT_LENGTH,
    ),
    Screen: cleanText(
      parsed.route,
      MAX_CONTEXT_LENGTH,
    ),
    Game: cleanText(
      parsed.game,
      MAX_CONTEXT_LENGTH,
    ),
    Language: cleanText(
      parsed.language,
      MAX_CONTEXT_LENGTH,
    ),
  });

  const title = titleFor(
    kind,
    message,
  );

  /*
   * GitHub rejects the whole issue if any label is missing, and a repo
   * need not have a "feedback" label. Step down rather than fail: the
   * grouping label is nice to have, the report is not optional.
   */
  const labelTiers = [
    ["feedback", LABELS[kind]],
    [LABELS[kind]],
    [],
  ];

  const post = (
    payload: Record<
      string,
      unknown
    >,
  ) =>
    fetch(
      `https://api.github.com/repos/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:
            "application/vnd.github+json",
          "X-GitHub-Api-Version":
            "2022-11-28",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          payload,
        ),
      },
    );

  let created = await post({
    title,
    body,
    labels: labelTiers[0],
  });

  for (
    let tier = 1;
    tier < labelTiers.length &&
    created.status === 422;
    tier += 1
  ) {
    const labels =
      labelTiers[tier];

    created = await post(
      labels.length > 0
        ? { title, body, labels }
        : { title, body },
    );
  }

  if (!created.ok) {
    console.error(
      `GitHub rejected the issue (${created.status}): ${await created.text()}`,
    );

    return response
      .status(502)
      .json({
        error: "github_failed",
      });
  }

  const { html_url: url } =
    (await created.json()) as {
      html_url: string;
    };

  return response
    .status(201)
    .json({ url });
}
