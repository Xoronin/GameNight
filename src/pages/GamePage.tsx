import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
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

    if (gameId === "bluff") {
        return (
            <div className="page gamePage">
                <button
                    className="backButton"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={18} />
                    Back to Lobby
                </button>

                <BluffGame />
            </div>
        );
    }

    const gameName =
        gameNames[gameId ?? ""] ?? "Unknown Game";

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
                <span className="eyebrow">GAME</span>

                <h1>{gameName}</h1>

                <p>
                    This game will be implemented after Bluff.
                </p>
            </div>
        </div>
    );
}

export default GamePage;