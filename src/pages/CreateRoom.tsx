import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../services/roomService";
import "../styles/lobby.css";
import {
  createPlayer,
  createRoomCode,
  savePlayer,
} from "../utils/gameUtils";

function CreateRoom() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    const cleanedName = name.trim();

    if (!cleanedName || creating) {
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const player = createPlayer(cleanedName, true);
      const roomCode = createRoomCode();

      console.log("CreateRoom page: creating", roomCode);

      await createRoom(roomCode, player);

      console.log("CreateRoom page: room successfully created");

      savePlayer(player);

      navigate(`/lobby/${roomCode}`);
    } catch (caughtError) {
      console.error("CREATE ROOM ERROR:", caughtError);

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
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={18} />
        Home
      </button>

      <div className="centerCard">
        <span className="eyebrow">CREATE ROOM</span>

        <h1>Who's playing?</h1>

        <p>
          Enter your name. You'll become the host of the new room.
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
            htmlFor="player-name"
          >
            Your name
          </label>

          <input
            id="player-name"
            className="normalInput"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Your name"
            maxLength={20}
            autoFocus
          />

          {error && (
            <div className="formError">
              {error}
            </div>
          )}

          <button
            className="primaryButton formButton"
            type="submit"
            disabled={!name.trim() || creating}
          >
            {creating ? "Creating..." : "Create Room"}

            {!creating && (
              <ChevronRight size={19} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateRoom;