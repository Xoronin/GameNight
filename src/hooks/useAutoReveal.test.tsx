// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  AUTO_REVEAL_DELAY_MS,
  useAutoReveal,
} from "./useAutoReveal";

/*
 * The round reveals itself once everyone has answered. Two things make
 * that easy to get wrong, and both are cheap to pin down here: it must
 * fire exactly once per round even though its caller re-renders on every
 * answer, and only the host may write.
 */

type HarnessProps = {
  roundId: string | null;
  ready: boolean;
  isHost: boolean;
  onReveal: () => void;
};

function Harness(
  props: HarnessProps,
) {
  useAutoReveal(props);

  return null;
}

describe("useAutoReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  /* Vitest globals are off, so auto-cleanup never registers. */
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  const settle = (
    ms = AUTO_REVEAL_DELAY_MS,
  ) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it("reveals once everyone has answered", () => {
    const onReveal = vi.fn();

    render(
      <Harness
        roundId="r1"
        ready
        isHost
        onReveal={onReveal}
      />,
    );

    expect(
      onReveal,
    ).not.toHaveBeenCalled();

    settle();

    expect(
      onReveal,
    ).toHaveBeenCalledTimes(1);
  });

  it("waits while players are still answering", () => {
    const onReveal = vi.fn();

    render(
      <Harness
        roundId="r1"
        ready={false}
        isHost
        onReveal={onReveal}
      />,
    );

    settle(10_000);

    expect(
      onReveal,
    ).not.toHaveBeenCalled();
  });

  it("only writes from the host", () => {
    const onReveal = vi.fn();

    render(
      <Harness
        roundId="r1"
        ready
        isHost={false}
        onReveal={onReveal}
      />,
    );

    settle();

    expect(
      onReveal,
    ).not.toHaveBeenCalled();
  });

  /*
   * The caller passes an inline arrow, so every re-render hands the hook a
   * new callback. Were the timer keyed on that callback, each re-render
   * would restart the countdown and a round with players still trickling
   * in would never reach the reveal at all — so no extra time is allowed
   * here beyond the one delay.
   */
  it("is not re-armed by its caller re-rendering", () => {
    const onReveal = vi.fn();

    const steps = 5;

    const { rerender } = render(
      <Harness
        roundId="r1"
        ready
        isHost
        onReveal={() => onReveal()}
      />,
    );

    for (
      let step = 0;
      step < steps;
      step += 1
    ) {
      act(() => {
        vi.advanceTimersByTime(
          AUTO_REVEAL_DELAY_MS /
            steps,
        );
      });

      rerender(
        <Harness
          roundId="r1"
          ready
          isHost
          onReveal={() =>
            onReveal()
          }
        />,
      );
    }

    expect(
      onReveal,
    ).toHaveBeenCalledTimes(1);
  });

  it("reveals each round exactly once", () => {
    const onReveal = vi.fn();

    const { rerender } = render(
      <Harness
        roundId="r1"
        ready
        isHost
        onReveal={onReveal}
      />,
    );

    settle();

    /* A late answer arriving after the write must not reveal twice. */
    rerender(
      <Harness
        roundId="r1"
        ready
        isHost
        onReveal={onReveal}
      />,
    );

    settle();

    expect(
      onReveal,
    ).toHaveBeenCalledTimes(1);

    rerender(
      <Harness
        roundId="r2"
        ready
        isHost
        onReveal={onReveal}
      />,
    );

    settle();

    expect(
      onReveal,
    ).toHaveBeenCalledTimes(2);
  });
});
