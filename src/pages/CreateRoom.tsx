import {
  ArrowLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { useState } from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import Header from "../components/Header";
import { getGameLibraryEntry } from "../data/gameLibrary";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { createRoom } from "../services/roomService";
import "../styles/lobby.css";
import {
  createPlayer,
  createRoomCode,
  savePlayer,
} from "../utils/gameUtils";

function CreateRoom() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [searchParams] =
    useSearchParams();

  const preselectedGameId =
    searchParams.get("game") ??
    undefined;

  const preselectedGame =
    getGameLibraryEntry(
      preselectedGameId,
    );

  const {
    user,
    profile,
    loading: authLoading,
  } = useAuth();

  const [guestName, setGuestName] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [creating, setCreating] =
    useState(false);

  const profileName =
    profile?.displayName ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "";

  const isLoggedIn = !!user;

  const submit = async () => {
    const playerName = isLoggedIn
      ? profileName
      : guestName.trim();

    if (
      !playerName ||
      creating ||
      authLoading
    ) {
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const player = createPlayer(
        playerName,
        true,
        user?.id,
      );

      const roomCode =
        createRoomCode();

      await createRoom(
        roomCode,
        player,
        preselectedGame?.id,
      );

      savePlayer(player);

      navigate(
        `/lobby/${roomCode}`,
      );
    } catch (caughtError) {
      console.error(
        "CREATE ROOM ERROR:",
        caughtError,
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("createRoom.error"),
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Header />

      <div className="page">
      <button
        className="backButton"
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={18} />
        {t("common.home")}
      </button>

      <div className="centerCard">
        <span className="eyebrow">
          {t("createRoom.badge")}
        </span>

        <h1>
          {isLoggedIn
            ? t(
                "createRoom.titleLoggedIn",
              )
            : t(
                "createRoom.titleGuest",
              )}
        </h1>

        {preselectedGame && (
          <div className="preselectedGameHint">
            {t(
              "createRoom.startingWith",
            )}{" "}
            <strong>
              {t(
                preselectedGame.nameKey,
              )}
            </strong>
          </div>
        )}

        {isLoggedIn ? (
          <>
            <p>
              {t(
                "createRoom.loggedInDescription",
              )}
            </p>

            <div className="accountIdentity">
              <div className="accountIdentityAvatar">
                {profileName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {profileName}
                </strong>

                <span>
                  {t(
                    "createRoom.signedIn",
                  )}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p>
            {t(
              "createRoom.guestDescription",
            )}
          </p>
        )}

        <form
          className="joinForm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {!isLoggedIn && (
            <>
              <label
                className="inputLabel"
                htmlFor="player-name"
              >
                {t("createRoom.yourName")}
              </label>

              <input
                id="player-name"
                className="normalInput"
                value={guestName}
                onChange={(event) =>
                  setGuestName(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "createRoom.yourName",
                )}
                maxLength={20}
                autoFocus
              />
            </>
          )}

          {error && (
            <div className="formError">
              {error}
            </div>
          )}

          <button
            className="primaryButton formButton"
            type="submit"
            disabled={
              creating ||
              authLoading ||
              (!isLoggedIn &&
                !guestName.trim()) ||
              (isLoggedIn &&
                !profileName)
            }
          >
            {creating
              ? t(
                  "createRoom.creating",
                )
              : t(
                  "createRoom.create",
                )}

            {!creating && (
              <ChevronRight
                size={19}
              />
            )}
          </button>
        </form>

        {!isLoggedIn && (
          <button
            className="accountHintButton"
            onClick={() =>
              navigate("/login")
            }
            type="button"
          >
            <User size={15} />
            {t(
              "createRoom.signInHint",
            )}
          </button>
        )}
      </div>
      </div>
    </>
  );
}

export default CreateRoom;