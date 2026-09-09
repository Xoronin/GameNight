import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import handler from "./feedback.ts";

/*
 * The endpoint holds a token that can write to the repository and turns
 * text typed by anyone into a public issue, so what it accepts and what it
 * forwards are both worth pinning down.
 */

type Sent = {
  status: number;
  body: unknown;
};

function fakeResponse() {
  const sent: Sent = {
    status: 0,
    body: undefined,
  };

  const response = {
    setHeader: vi.fn(),
    status(code: number) {
      sent.status = code;

      return response;
    },
    json(body: unknown) {
      sent.body = body;

      return response;
    },
  };

  return { response, sent };
}

const request = (
  body: unknown,
  headers: Record<
    string,
    string
  > = {},
) =>
  ({
    method: "POST",
    body,
    headers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

/*
 * The rate limiter is module state shared by every test in this file, so
 * each call comes from its own address unless a test is exercising it.
 */
let nextClient = 0;

const freshClient = () => {
  nextClient += 1;

  return {
    "x-forwarded-for": `198.51.100.${nextClient}`,
  };
};

/** Runs the handler with a stubbed GitHub and returns what it posted. */
async function call(
  body: unknown,
  headers: Record<
    string,
    string
  > = freshClient(),
) {
  const { response, sent } =
    fakeResponse();

  await handler(
    request(body, headers),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response as any,
  );

  const fetchMock = global
    .fetch as ReturnType<
    typeof vi.fn
  >;

  const posted =
    fetchMock.mock.calls.length >
    0
      ? JSON.parse(
          fetchMock.mock
            .calls[0][1]
            .body as string,
        )
      : null;

  return { sent, posted };
}

describe("feedback endpoint", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN =
      "test-token";

    delete process.env
      .FEEDBACK_DISABLED;

    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          html_url:
            "https://github.com/o/r/issues/1",
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("files an issue and returns its link", async () => {
    const { sent, posted } =
      await call({
        kind: "idea",
        message:
          "A dark mode would be lovely",
      });

    expect(sent.status).toBe(201);

    expect(sent.body).toEqual({
      url: "https://github.com/o/r/issues/1",
    });

    expect(posted.title).toBe(
      "Idea: A dark mode would be lovely",
    );

    expect(posted.labels).toEqual(
      ["feedback", "enhancement"],
    );
  });

  /*
   * An issue body is Markdown. Unquoted, "@someone" in a bug report pages
   * a stranger every time it is filed.
   */
  it("quotes the message so it cannot mention or format", async () => {
    const { posted } = await call({
      kind: "bug",
      message:
        "@octocat # not a heading",
    });

    expect(posted.body).toContain(
      "```text\n@octocat # not a heading\n```",
    );
  });

  it("cannot be escaped with backticks of its own", async () => {
    const { posted } = await call({
      kind: "bug",
      message:
        "``` @octocat ``` still quoted",
    });

    const fences = posted.body
      .split("\n")
      .filter(
        (line: string) =>
          line.startsWith("```"),
      );

    expect(fences).toHaveLength(2);
  });

  it("turns away a message too short to act on", async () => {
    const { sent } = await call({
      kind: "bug",
      message: "broken",
    });

    expect(sent.status).toBe(400);

    expect(
      global.fetch,
    ).not.toHaveBeenCalled();
  });

  it("caps a very long message", async () => {
    const { posted } = await call({
      kind: "bug",
      message: "x".repeat(9000),
    });

    expect(
      posted.body.length,
    ).toBeLessThan(2400);
  });

  it("thins out a burst from one client", async () => {
    const headers = {
      "x-forwarded-for":
        "203.0.113.7",
    };

    const statuses: number[] = [];

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      const { response, sent } =
        fakeResponse();

      await handler(
        request(
          {
            kind: "bug",
            message: `report number ${attempt}`,
          },
          headers,
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response as any,
      );

      statuses.push(sent.status);
    }

    expect(
      statuses.filter(
        (status) => status === 201,
      ),
    ).toHaveLength(3);

    expect(
      statuses.filter(
        (status) => status === 429,
      ),
    ).toHaveLength(2);
  });

  /*
   * A repository need not have a "feedback" label, and GitHub rejects the
   * whole issue over one missing name. The kind label is worth keeping, so
   * the retry drops the grouping label first rather than all of them.
   */
  it("keeps the kind label when the repository lacks the feedback one", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => "no label",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          html_url:
            "https://github.com/o/r/issues/2",
        }),
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchMock as any;

    const { response, sent } =
      fakeResponse();

    await handler(
      request(
        {
          kind: "bug",
          message:
            "the map does not load",
        },
        {
          "x-forwarded-for":
            "203.0.113.8",
        },
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response as any,
    );

    expect(sent.status).toBe(201);

    const retried = JSON.parse(
      fetchMock.mock.calls[1][1]
        .body as string,
    );

    expect(retried.labels).toEqual(
      ["bug"],
    );
  });

  it("gives up the labels entirely rather than the report", async () => {
    const rejectLabels = {
      ok: false,
      status: 422,
      text: async () => "no label",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        rejectLabels,
      )
      .mockResolvedValueOnce(
        rejectLabels,
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          html_url:
            "https://github.com/o/r/issues/3",
        }),
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = fetchMock as any;

    const { response, sent } =
      fakeResponse();

    await handler(
      request(
        {
          kind: "bug",
          message:
            "the timer never starts",
        },
        freshClient(),
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response as any,
    );

    expect(sent.status).toBe(201);

    const last = JSON.parse(
      fetchMock.mock.calls[2][1]
        .body as string,
    );

    expect(
      last.labels,
    ).toBeUndefined();

    expect(last.title).toBeTruthy();
  });

  it("says so when the deployment has no token", async () => {
    delete process.env
      .GITHUB_TOKEN;

    vi.spyOn(
      console,
      "error",
    ).mockImplementation(
      () => undefined,
    );

    const { sent } = await call({
      kind: "bug",
      message:
        "something is broken here",
    });

    expect(sent.status).toBe(503);

    expect(sent.body).toEqual({
      error: "not_configured",
    });
  });

  it("refuses anything but POST", async () => {
    const { response, sent } =
      fakeResponse();

    await handler(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { method: "GET", headers: {} } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response as any,
    );

    expect(sent.status).toBe(405);
  });
});
