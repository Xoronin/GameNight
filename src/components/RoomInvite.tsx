import {
  useEffect,
  useState,
} from "react";
import {
  Check,
  Link as LinkIcon,
  QrCode,
  Share2,
} from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { joinUrlFor } from "../utils/invite";
import "../styles/invite.css";

/*
 * Getting friends into a room used to mean reading four characters aloud
 * and hoping. A link puts them straight on the join screen with the code
 * already filled in, and the QR covers the case everyone is in the same
 * room holding phones.
 */

type RoomInviteProps = {
  roomCode: string;
};

type Copied =
  | "code"
  | "link"
  | null;

function RoomInvite({
  roomCode,
}: RoomInviteProps) {
  const { t } = useLanguage();

  const [copied, setCopied] =
    useState<Copied>(null);

  const [showQr, setShowQr] =
    useState(false);

  const [qrSvg, setQrSvg] =
    useState<string | null>(null);

  const joinUrl =
    joinUrlFor(roomCode);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer =
      window.setTimeout(
        () => setCopied(null),
        1600,
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  /*
   * The encoder is a chunk of its own, fetched only when someone actually
   * opens the QR — most rooms are shared with the link instead.
   */
  useEffect(() => {
    if (!showQr) {
      return;
    }

    let cancelled = false;

    const draw = async () => {
      try {
        const { toString } =
          await import("qrcode");

        const svg = await toString(
          joinUrl,
          {
            type: "svg",
            margin: 1,
            color: {
              dark: "#12131c",
              light: "#ffffff",
            },
          },
        );

        if (!cancelled) {
          setQrSvg(svg);
        }
      } catch (caught) {
        console.error(
          "Could not draw the room QR code:",
          caught,
        );
      }
    };

    void draw();

    return () => {
      cancelled = true;
    };
  }, [showQr, joinUrl]);

  const copy = async (
    what: Copied,
    value: string,
  ) => {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopied(what);
    } catch {
      setCopied(null);
    }
  };

  /*
   * On a phone the share sheet reaches the group chat everyone is already
   * in, which is where the invite actually wants to go. Desktop browsers
   * mostly lack it, so the copy button carries those.
   */
  const share = async () => {
    if (!navigator.share) {
      void copy("link", joinUrl);

      return;
    }

    try {
      await navigator.share({
        title: "Game Night",
        text: t(
          "lobby.shareMessage",
        ),
        url: joinUrl,
      });
    } catch {
      /* Dismissing the sheet is not an error worth reporting. */
    }
  };

  return (
    <div className="roomInvite">
      <button
        className="roomCodeButton"
        onClick={() => {
          void copy(
            "code",
            roomCode,
          );
        }}
        type="button"
        aria-label={t(
          "lobby.copyCode",
        )}
      >
        {roomCode}

        {copied === "code" ? (
          <Check size={17} />
        ) : (
          <LinkIcon size={17} />
        )}
      </button>

      <div className="inviteActions">
        <button
          type="button"
          className="inviteButton"
          onClick={() => {
            void share();
          }}
        >
          <Share2 size={16} />

          {t("lobby.shareLink")}
        </button>

        <button
          type="button"
          className="inviteButton"
          aria-expanded={showQr}
          onClick={() =>
            setShowQr(
              (open) => !open,
            )
          }
        >
          <QrCode size={16} />

          {t("lobby.showQr")}
        </button>
      </div>

      {copied && (
        <span className="copyMessage">
          {t(
            copied === "code"
              ? "lobby.copied"
              : "lobby.linkCopied",
          )}
        </span>
      )}

      {showQr && (
        <div className="inviteQr">
          {qrSvg ? (
            <div
              className="inviteQrCode"
              /*
               * The markup is generated locally by the encoder from a URL
               * this app built — no player input reaches it.
               */
              dangerouslySetInnerHTML={{
                __html: qrSvg,
              }}
            />
          ) : (
            <div className="inviteQrLoading">
              {t(
                "common.loading",
              )}
            </div>
          )}

          <span className="inviteQrHint">
            {t("lobby.qrHint")}
          </span>
        </div>
      )}
    </div>
  );
}

export default RoomInvite;
