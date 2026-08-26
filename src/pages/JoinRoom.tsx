import {
  ArrowLeft,
  LogIn,
  User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { joinRoom } from "../services/roomService";
import "../styles/lobby.css";
import {
  createPlayer,
  savePlayer,
} from "../utils/gameUtils";

function JoinRoom() {
  const navigate = useNavigate();

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
          : "Could not join room.",
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="page">
      <button
        className="backButton"
        onClick={() =>
          navigate("/")
        }
      >
        <ArrowLeft size={18} />
        Home
      </button>

      <div className="centerCard">
        <span className="eyebrow">
          JOIN A GAME
        </span>

        <h1>Join a room</h1>

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
                Joining with your profile
              </span>
            </div>
          </div>
        ) : (
          <p>
            Enter your name and the room
            code shown on the host's
            screen.
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
                Your name
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
                placeholder="Your name"
                maxLength={20}
                autoFocus
              />
            </>
          )}

          <label
            className="inputLabel"
            htmlFor="room-code"
          >
            Room code
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
              ? "Joining..."
              : "Join Room"}
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
            Sign in to use your profile
          </button>
        )}
      </div>
    </div>
  );
}

export default JoinRoom;