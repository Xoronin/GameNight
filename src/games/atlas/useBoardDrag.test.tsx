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
import type { Mock } from "vitest";
import { useBoardDrag } from "./useBoardDrag";

/*
 * A dragged chip holds the pointer capture, so :hover never reaches what
 * is underneath it and the board could not show where a drop would land.
 * The highlight is driven by the same hit test as the drop, so these check
 * the two agree — a board that lights up one slot and drops on another
 * would be worse than no feedback at all.
 */

const SLOTS = ["fr", "de"];

/*
 * Typed rather than left as ReturnType<typeof vi.fn>: a bare mock is
 * "some callable", which satisfies nothing in particular, so passing one
 * where a specific signature is wanted only compiled by accident.
 */
let onDrop: Mock<
  (
    slotId: string,
    itemId: string,
  ) => void
>;

/** Stands in for the slot the pointer is over; jsdom has no hit testing. */
let underPointer: string | null =
  null;

function Board() {
  const {
    itemProps,
    slotProps,
    overSlot,
  } = useBoardDrag({
    interactive: true,
    onDrop,
  });

  const chip = itemProps("paris");

  return (
    <div>
      <button
        data-testid="chip"
        {...chip.handlers}
      >
        Paris
      </button>

      {SLOTS.map((slot) => (
        <div
          key={slot}
          data-testid={`slot-${slot}`}
          data-over={
            slotProps(slot).isOver
          }
        />
      ))}

      <span data-testid="over">
        {overSlot ?? "none"}
      </span>
    </div>
  );
}

const pointer = (
  type: string,
  x: number,
  y: number,
) =>
  new MouseEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
  });

describe("useBoardDrag drop feedback", () => {
  beforeEach(() => {
    onDrop = vi.fn();
    underPointer = null;

    /* jsdom lays nothing out, so the hit test is stubbed. */
    document.elementFromPoint = (() =>
      underPointer
        ? document.querySelector(
            `[data-slot="${underPointer}"]`,
          )
        : null) as typeof document.elementFromPoint;

    Element.prototype.setPointerCapture =
      vi.fn();
  });

  afterEach(cleanup);

  const dragTo = async (
    element: HTMLElement,
    x: number,
    y: number,
  ) => {
    await act(async () => {
      element.dispatchEvent(
        pointer("pointermove", x, y),
      );
    });
  };

  const setUp = () => {
    const view = render(<Board />);

    /* The stub looks these up, so they need the attribute. */
    for (const slot of SLOTS) {
      view
        .getByTestId(`slot-${slot}`)
        .setAttribute(
          "data-slot",
          slot,
        );
    }

    return view;
  };

  it("lights up the slot under the chip", async () => {
    const view = setUp();
    const chip =
      view.getByTestId("chip");

    await act(async () => {
      chip.dispatchEvent(
        pointer(
          "pointerdown",
          0,
          0,
        ),
      );
    });

    underPointer = "fr";
    await dragTo(chip, 60, 60);

    expect(
      view.getByTestId("over")
        .textContent,
    ).toBe("fr");

    expect(
      view
        .getByTestId("slot-fr")
        .getAttribute("data-over"),
    ).toBe("true");

    expect(
      view
        .getByTestId("slot-de")
        .getAttribute("data-over"),
    ).toBe("false");
  });

  it("follows the chip from one slot to another", async () => {
    const view = setUp();
    const chip =
      view.getByTestId("chip");

    await act(async () => {
      chip.dispatchEvent(
        pointer(
          "pointerdown",
          0,
          0,
        ),
      );
    });

    underPointer = "fr";
    await dragTo(chip, 60, 60);

    underPointer = "de";
    await dragTo(chip, 90, 90);

    expect(
      view.getByTestId("over")
        .textContent,
    ).toBe("de");
  });

  it("shows nothing over empty space", async () => {
    const view = setUp();
    const chip =
      view.getByTestId("chip");

    await act(async () => {
      chip.dispatchEvent(
        pointer(
          "pointerdown",
          0,
          0,
        ),
      );
    });

    underPointer = "fr";
    await dragTo(chip, 60, 60);

    underPointer = null;
    await dragTo(chip, 400, 400);

    expect(
      view.getByTestId("over")
        .textContent,
    ).toBe("none");
  });

  /* A press that has not travelled yet is still a tap, not a drag. */
  it("stays quiet before the drag threshold", async () => {
    const view = setUp();
    const chip =
      view.getByTestId("chip");

    await act(async () => {
      chip.dispatchEvent(
        pointer(
          "pointerdown",
          0,
          0,
        ),
      );
    });

    underPointer = "fr";
    await dragTo(chip, 2, 2);

    expect(
      view.getByTestId("over")
        .textContent,
    ).toBe("none");
  });

  /*
   * The point of the highlight: what lights up has to be what receives
   * the chip, or the feedback is a lie.
   */
  it("drops on the slot it was showing", async () => {
    const view = setUp();
    const chip =
      view.getByTestId("chip");

    await act(async () => {
      chip.dispatchEvent(
        pointer(
          "pointerdown",
          0,
          0,
        ),
      );
    });

    underPointer = "de";
    await dragTo(chip, 60, 60);

    const lit = view.getByTestId(
      "over",
    ).textContent;

    await act(async () => {
      chip.dispatchEvent(
        pointer("pointerup", 60, 60),
      );
    });

    expect(onDrop).toHaveBeenCalledWith(
      lit,
      "paris",
    );
  });

  it("clears the highlight once the chip is let go", async () => {
    const view = setUp();
    const chip =
      view.getByTestId("chip");

    await act(async () => {
      chip.dispatchEvent(
        pointer(
          "pointerdown",
          0,
          0,
        ),
      );
    });

    underPointer = "fr";
    await dragTo(chip, 60, 60);

    await act(async () => {
      chip.dispatchEvent(
        pointer("pointerup", 60, 60),
      );
    });

    expect(
      view.getByTestId("over")
        .textContent,
    ).toBe("none");
  });
});
