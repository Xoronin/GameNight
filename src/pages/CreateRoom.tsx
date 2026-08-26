import {
  ArrowLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createRoom } from "../services/roomService";
import "../styles/lobby.css";
import {
  createPlayer,
  createRoomCode,
  savePlayer,
} from "../utils/gameUtils";

function CreateRoom() {
  const navigate = useNavigate();

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
          : "Could not create room.",
      );
    } finally {
      setCreating(false);
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
          CREATE ROOM
        </span>

        <h1>
          {isLoggedIn
            ? "Create a room"
            : "Who's playing?"}
        </h1>

        {isLoggedIn ? (
          <>
            <p>
              You'll create the room as
              your Game Night profile.
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
                  Signed in
                </span>
              </div>
            </div>
          </>
        ) : (
          <p>
            Enter your name. You'll
            become the host of the new
            room.
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
                Your name
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
                placeholder="Your name"
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
              ? "Creating..."
              : "Create Room"}

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
            Sign in to keep your profile
          </button>
        )}
      </div>
    </div>
  );
}

export default CreateRoom;