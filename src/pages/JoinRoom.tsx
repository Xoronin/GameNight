import {
  ArrowLeft,
  LogIn,
  User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { joinRoom } from "../services/roomService";
import "../styles/lobby.css";
import {
  createPlayer,
  savePlayer,
} from "../utils/gameUtils";

function JoinRoom() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const {
    user,
    profile,
    loading: authLoading,
  } = useAuth();

  const [guestName, setGuestName] =
    useState("");

  const [roomCode, setRoomCode] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [joining, setJoining] =
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

    const cleanedCode =
      roomCode.trim().toUpperCase();

    if (
      !playerName ||
      !cleanedCode ||
      joining ||
      authLoading
    ) {
      return;
    }

    try {
      setJoining(true);
      setError(null);

      const player = createPlayer(
        playerName,
        false,
        user?.id,
      );

      await joinRoom(
        cleanedCode,
        player,
      );

      savePlayer(player);

      navigate(
        `/lobby/${cleanedCode}`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("joinRoom.error"),
      );
    } finally {
      setJoining(false);
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
          {t("joinRoom.badge")}
        </span>

        <h1>{t("joinRoom.title")}</h1>

        {isLoggedIn ? (
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
                  "joinRoom.joiningWithProfile",
                )}
              </span>
            </div>
          </div>
        ) : (
          <p>
            {t(
              "joinRoom.description",
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
                htmlFor="join-name"
              >
                {t("createRoom.yourName")}
              </label>

              <input
                id="join-name"
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

          <label
            className="inputLabel"
            htmlFor="room-code"
          >
            {t("joinRoom.roomCode")}
          </label>

          <input
            id="room-code"
            className="roomInput"
            value={roomCode}
            onChange={(event) =>
              setRoomCode(
                event.target.value
                  .toUpperCase(),
              )
            }
            placeholder="ABCD"
            maxLength={6}
            autoFocus={isLoggedIn}
          />

          {error && (
            <div className="formError">
              {error}
            </div>
          )}

          <button
            className="primaryButton formButton"
            type="submit"
            disabled={
              joining ||
              authLoading ||
              !roomCode.trim() ||
              (!isLoggedIn &&
                !guestName.trim()) ||
              (isLoggedIn &&
                !profileName)
            }
          >
            {!joining && (
              <LogIn size={18} />
            )}

            {joining
              ? t("joinRoom.joining")
              : t("joinRoom.join")}
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
              "joinRoom.signInHint",
            )}
          </button>
        )}
      </div>
      </div>
    </>
  );
}

export default JoinRoom;