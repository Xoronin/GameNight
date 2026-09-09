import {
  describe,
  expect,
  it,
} from "vitest";
import { redactRoute } from "./feedbackService";

/*
 * Feedback becomes a public GitHub issue. The room code is the only thing
 * standing between a stranger and a game in progress, so it must never
 * ride along in the screen the report came from.
 */

describe("redactRoute", () => {
  it("strips the room code from a lobby route", () => {
    expect(
      redactRoute("/lobby/WXYZ"),
    ).toBe("/lobby/:roomCode");
  });

  it("strips it from a nested lobby route", () => {
    expect(
      redactRoute(
        "/lobby/WXYZ/settings",
      ),
    ).toBe(
      "/lobby/:roomCode/settings",
    );
  });

  it("drops the query string and hash", () => {
    expect(
      redactRoute(
        "/lobby/WXYZ?code=WXYZ#top",
      ),
    ).toBe("/lobby/:roomCode");

    expect(
      redactRoute(
        "/join?code=WXYZ",
      ),
    ).toBe("/join");
  });

  it("keeps routes that carry no room code", () => {
    for (const route of [
      "/",
      "/join",
      "/create",
      "/game/trivia",
      "/game/atlas",
    ]) {
      expect(
        redactRoute(route),
      ).toBe(route);
    }
  });

  it("leaves no four-character code anywhere in the result", () => {
    const codes = [
      "WXYZ",
      "AB12",
      "7QK4",
    ];

    for (const code of codes) {
      const route = redactRoute(
        `/lobby/${code}?code=${code}`,
      );

      expect(route).not.toContain(
        code,
      );
    }
  });
});
