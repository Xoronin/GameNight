import { ArrowLeft } from "lucide-react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import BluffGame from "../games/bluff/BluffGame";

const gameNames: Record<string, string> = {
  bluff: "Bluff",
  minefield: "Minefield",
  "higher-lower": "Higher / Lower",
  trivia: "Trivia",
  categories: "Categories",
  "draw-guess": "Draw & Guess",
};

function GamePage() {
  const navigate = useNavigate();

  const { gameId } = useParams();

  const [searchParams] =
    useSearchParams();

  const roomCode =
    searchParams.get("room");

  if (gameId === "bluff") {
    if (!roomCode) {
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
              BLUFF
            </span>

            <h1>No room selected</h1>

            <p>
              Bluff is now a multiplayer game.
              Create or join a room first.
            </p>

            <button
              className="primaryButton formButton"
              onClick={() =>
                navigate("/")
              }
            >
              Back Home
            </button>
          </div>
        </div>
      );
    }

    return (
      <BluffGame
        roomCode={roomCode}
      />
    );
  }

  const gameName =
    gameNames[gameId ?? ""] ??
    "Unknown Game";

  return (
    <div className="page">
      <button
        className="backButton"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="centerCard">
        <span className="eyebrow">
          GAME
        </span>

        <h1>{gameName}</h1>

        <p>
          This game will be implemented
          after Bluff.
        </p>
      </div>
    </div>
  );
}

export default GamePage;