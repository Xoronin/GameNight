import {
  describe,
  expect,
  it,
} from "vitest";
import { joinUrlFor } from "./invite";

/*
 * The invite link is the whole point of sharing: if the code does not
 * survive the round trip into the join screen, the person opening it is
 * back to typing it in by hand.
 */

const ORIGIN =
  "https://gamenight.example";

describe("joinUrlFor", () => {
  it("puts the code where the join screen reads it", () => {
    const url = new URL(
      joinUrlFor("WXYZ", ORIGIN),
    );

    expect(url.pathname).toBe(
      "/join",
    );

    expect(
      url.searchParams.get("code"),
    ).toBe("WXYZ");
  });

  it("normalises what the caller passes", () => {
    expect(
      new URL(
        joinUrlFor(
          "  wxyz ",
          ORIGIN,
        ),
      ).searchParams.get("code"),
    ).toBe("WXYZ");
  });

  it("stays on the origin it was given", () => {
    for (const origin of [
      ORIGIN,
      "http://localhost:5173",
      "https://preview-1.vercel.app",
    ]) {
      expect(
        joinUrlFor(
          "WXYZ",
          origin,
        ).startsWith(
          `${origin}/join`,
        ),
      ).toBe(true);
    }
  });

  /*
   * Codes come from a fixed alphabet today, but a link that breaks on an
   * unexpected character would break silently and only for some rooms.
   */
  it("escapes anything that would break the query", () => {
    const url = new URL(
      joinUrlFor(
        "A&B=C",
        ORIGIN,
      ),
    );

    expect(
      url.searchParams.get("code"),
    ).toBe("A&B=C");
  });
});
