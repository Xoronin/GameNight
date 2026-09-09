// @vitest-environment jsdom
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/*
 * The module holds one connection state for the whole app, so each test
 * imports it fresh rather than inheriting the last test's history.
 */
async function load() {
  vi.resetModules();

  return import("./realtime");
}

const hide = () => {
  vi.spyOn(
    document,
    "visibilityState",
    "get",
  ).mockReturnValue("hidden");

  document.dispatchEvent(
    new Event("visibilitychange"),
  );
};

const show = () => {
  vi.spyOn(
    document,
    "visibilityState",
    "get",
  ).mockReturnValue("visible");

  document.dispatchEvent(
    new Event("visibilitychange"),
  );
};

describe("connection recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("starts live and stays put while channels subscribe", async () => {
    const {
      getConnection,
      reportChannelStatus,
    } = await load();

    reportChannelStatus(
      "SUBSCRIBED",
    );

    expect(
      getConnection(),
    ).toEqual({
      status: "live",
      generation: 0,
    });
  });

  it("reports a dropped channel and refetches when it returns", async () => {
    const {
      getConnection,
      reportChannelStatus,
    } = await load();

    reportChannelStatus(
      "CHANNEL_ERROR",
    );

    expect(
      getConnection().status,
    ).toBe("reconnecting");

    reportChannelStatus(
      "SUBSCRIBED",
    );

    expect(
      getConnection(),
    ).toEqual({
      status: "live",
      generation: 1,
    });
  });

  /*
   * Every hook has its own channel, so a real drop reports several errors.
   * Coming back should cost one round of refetches, not one per channel.
   */
  it("refetches once when several channels drop together", async () => {
    const {
      getConnection,
      reportChannelStatus,
    } = await load();

    for (
      let channel = 0;
      channel < 4;
      channel += 1
    ) {
      reportChannelStatus(
        "TIMED_OUT",
      );
    }

    for (
      let channel = 0;
      channel < 4;
      channel += 1
    ) {
      reportChannelStatus(
        "SUBSCRIBED",
      );
    }

    expect(
      getConnection().generation,
    ).toBe(1);
  });

  it("goes offline with the network and refetches when it returns", async () => {
    const {
      getConnection,
      subscribeToConnection,
    } = await load();

    const seen = vi.fn();
    subscribeToConnection(seen);

    window.dispatchEvent(
      new Event("offline"),
    );

    expect(
      getConnection().status,
    ).toBe("offline");

    window.dispatchEvent(
      new Event("online"),
    );

    expect(
      getConnection(),
    ).toEqual({
      status: "live",
      generation: 1,
    });

    expect(seen).toHaveBeenCalled();
  });

  /*
   * A phone locked mid-game suspends the socket without ever reporting an
   * error, so the trip back through the background is its own signal.
   */
  it("refetches after a long spell in the background", async () => {
    vi.useFakeTimers();

    const { getConnection } =
      await load();

    hide();

    vi.advanceTimersByTime(
      30_000,
    );

    show();

    expect(
      getConnection().generation,
    ).toBe(1);
  });

  it("ignores a glance at another tab", async () => {
    vi.useFakeTimers();

    const { getConnection } =
      await load();

    hide();

    vi.advanceTimersByTime(1_000);

    show();

    expect(
      getConnection().generation,
    ).toBe(0);
  });

  it("stays offline when the tab wakes with no network", async () => {
    vi.useFakeTimers();

    const { getConnection } =
      await load();

    vi.spyOn(
      navigator,
      "onLine",
      "get",
    ).mockReturnValue(false);

    hide();

    vi.advanceTimersByTime(
      30_000,
    );

    show();

    expect(
      getConnection(),
    ).toEqual({
      status: "offline",
      generation: 0,
    });
  });
});
