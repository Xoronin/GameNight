export type FeedbackKind =
  | "bug"
  | "idea";

export type FeedbackInput = {
  kind: FeedbackKind;
  message: string;
  /** Display name, when the player has one. Never an email address. */
  from?: string;
  route: string;
  game?: string;
  language: string;
};

/*
 * The lobby route carries the room code, and the issue this ends up in is
 * readable by anyone — a code in there is an open invitation to join the
 * room. Report the shape of the screen instead, and drop the query string
 * rather than guess what a future one might carry.
 */
export function redactRoute(
  pathname: string,
): string {
  const [path] =
    pathname.split(/[?#]/);

  return path.replace(
    /^\/lobby\/[^/]+/,
    "/lobby/:roomCode",
  );
}

/** Maps the endpoint's error codes onto translation keys. */
const ERROR_KEYS: Record<
  string,
  string
> = {
  too_short:
    "feedback.errorTooShort",
  rate_limited:
    "feedback.errorRateLimited",
  disabled:
    "feedback.errorUnavailable",
  not_configured:
    "feedback.errorUnavailable",
};

export class FeedbackError extends Error {
  /* Carries the translation key so the caller renders it in-language. */
  readonly translationKey: string;

  constructor(
    translationKey: string,
  ) {
    super(translationKey);

    this.name = "FeedbackError";
    this.translationKey =
      translationKey;
  }
}

/** Files the feedback and returns the URL of the issue it created. */
export async function sendFeedback(
  input: FeedbackInput,
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(
      "/api/feedback",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          input,
        ),
      },
    );
  } catch {
    throw new FeedbackError(
      "feedback.errorNetwork",
    );
  }

  if (!response.ok) {
    const { error } =
      ((await response
        .json()
        .catch(() => ({}))) as {
        error?: string;
      }) ?? {};

    throw new FeedbackError(
      ERROR_KEYS[error ?? ""] ??
        "feedback.errorFailed",
    );
  }

  const { url } =
    (await response.json()) as {
      url: string;
    };

  return url;
}
