import {
  ArrowLeft,
  LogIn,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinRoom } from "../services/roomService";
import "../styles/lobby.css";
import {
  createPlayer,
  savePlayer,
} from "../utils/gameUtils";

function JoinRoom() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [joining, setJoining] =
    useState(false);

  const submit = async () => {
    const cleanedName = name.trim();
    const cleanedCode =
      roomCode.trim().toUpperCase();

    if (
      !cleanedName ||
      !cleanedCode ||
      joining
    ) {
      return;
    }

    try {
      setJoining(true);
      setError(null);

      const player =
        createPlayer(cleanedName, false);

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
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={18} />
        Home
      </button>

      <div className="centerCard">
        <span className="eyebrow">
          JOIN A GAME
        </span>

        <h1>Join a room</h1>

        <p>
          Enter your name and the room code shown
          on the host's screen.
        </p>

        <form
          className="joinForm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label
            className="inputLabel"
            htmlFor="join-name"
          >
            Your name
          </label>

          <input
            id="join-name"
            className="normalInput"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Your name"
            maxLength={20}
            autoFocus
          />

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
                event.target.value.toUpperCase(),
              )
            }
            placeholder="ABCD"
            maxLength={6}
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
              !name.trim() ||
              !roomCode.trim() ||
              joining
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
      </div>
    </div>
  );
}

export default JoinRoom;