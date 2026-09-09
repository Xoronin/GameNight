// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import RoomInvite from "./RoomInvite";

/*
 * The invite is how anyone else gets into the room, so the three ways out
 * of it — the code, the link, the QR — all need to carry the same room.
 */

const CODE = "WXYZ";

const writeText =
  vi.fn<
    (text: string) => Promise<void>
  >();

/* Vitest globals are off, so Testing Library's auto-cleanup never runs. */
afterEach(cleanup);

beforeEach(() => {
  vi.restoreAllMocks();

  writeText.mockClear();

  Object.defineProperty(
    navigator,
    "clipboard",
    {
      value: { writeText },
      configurable: true,
    },
  );
});

const click = async (
  element: HTMLElement,
) => {
  await act(async () => {
    element.click();
  });
};

describe("RoomInvite", () => {
  it("copies the bare code", async () => {
    render(
      <RoomInvite
        roomCode={CODE}
      />,
    );

    await click(
      screen.getByRole("button", {
        name: /copy the room code/i,
      }),
    );

    expect(
      writeText,
    ).toHaveBeenCalledWith(CODE);
  });

  /*
   * Desktop browsers mostly have no share sheet, and falling back to
   * nothing would make the button look broken.
   */
  it("copies the join link when there is no share sheet", async () => {
    Object.defineProperty(
      navigator,
      "share",
      {
        value: undefined,
        configurable: true,
      },
    );

    render(
      <RoomInvite
        roomCode={CODE}
      />,
    );

    await click(
      screen.getByRole("button", {
        name: /share link/i,
      }),
    );

    expect(writeText).toHaveBeenCalledTimes(
      1,
    );

    const url = new URL(
      writeText.mock
        .calls[0]![0],
    );

    expect(url.pathname).toBe(
      "/join",
    );

    expect(
      url.searchParams.get("code"),
    ).toBe(CODE);
  });

  it("hands the link to the share sheet when there is one", async () => {
    const share =
      vi.fn<
        (
          data: ShareData,
        ) => Promise<void>
      >();

    Object.defineProperty(
      navigator,
      "share",
      {
        value: share,
        configurable: true,
      },
    );

    render(
      <RoomInvite
        roomCode={CODE}
      />,
    );

    await click(
      screen.getByRole("button", {
        name: /share link/i,
      }),
    );

    expect(share).toHaveBeenCalled();

    expect(
      share.mock.calls[0]![0].url,
    ).toContain(`code=${CODE}`);

    /* The sheet took it; nothing should land on the clipboard too. */
    expect(
      writeText,
    ).not.toHaveBeenCalled();
  });

  it("draws a QR of the same link, only once asked", async () => {
    const { container } = render(
      <RoomInvite
        roomCode={CODE}
      />,
    );

    expect(
      container.querySelector(
        ".inviteQr",
      ),
    ).toBeNull();

    await click(
      screen.getByRole("button", {
        name: /qr code/i,
      }),
    );

    await waitFor(() => {
      expect(
        container.querySelector(
          ".inviteQrCode svg",
        ),
      ).not.toBeNull();
    });
  });
});
