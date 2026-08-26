import {
    Bomb,
    Brain,
    Brush,
    ChevronRight,
    ListChecks,
    MessageSquareQuote,
    TrendingUp,
    Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

const games = [
    {
        id: "bluff",
        name: "Bluff",
        description:
            "Invent a convincing fake answer and trick your friends into choosing it.",
        players: "3–10",
        icon: <MessageSquareQuote />,
        className: "purple",
    },
    {
        id: "minefield",
        name: "Minefield",
        description:
            "Find all the correct answers. Pick the wrong tile and you could be out.",
        players: "2–10",
        icon: <Bomb />,
        className: "red",
    },
    {
        id: "higher-lower",
        name: "Higher / Lower",
        description:
            "Compare facts, numbers and records. How long can you keep your streak?",
        players: "2–10",
        icon: <TrendingUp />,
        className: "green",
    },
    {
        id: "trivia",
        name: "Trivia",
        description:
            "Battle your friends across movies, gaming, science, geography and more.",
        players: "2–12",
        icon: <Brain />,
        className: "blue",
    },
    {
        id: "categories",
        name: "Categories",
        description:
            "Our take on Stadt, Land, Fluss with classic, party and custom categories.",
        players: "2–12",
        icon: <ListChecks />,
        className: "orange",
    },
    {
        id: "draw-guess",
        name: "Draw & Guess",
        description:
            "Draw the secret word while everyone else races to figure it out.",
        players: "3–12",
        icon: <Brush />,
        className: "pink",
    },
];

function Home() {
    const navigate = useNavigate();

    return (
        <div className="app">
            <header className="header">
                <button
                    className="brand brandButton"
                    onClick={() => navigate("/")}
                >
                    <div className="brandDice">◆</div>

                    <div>
                        <strong>Game Night</strong>
                        <span>Play together.</span>
                    </div>
                </button>

                <button
                    className="joinButton"
                    onClick={() => navigate("/join")}
                >
                    <Users size={18} />
                    Join Room
                </button>
            </header>

            <main>
                <section className="hero">
                    <div className="heroBadge">
                        🎲 PARTY GAMES FOR EVERYONE
                    </div>

                    <h1>
                        Pick a game.
                        <br />
                        <span>Beat your friends.</span>
                    </h1>

                    <p>
                        Quick party games for your next game night. Grab some friends,
                        choose a game and start playing.
                    </p>

                    <div className="heroActions">
                        <button
                            className="primaryButton"
                            onClick={() => navigate("/create")}
                        >
                            Create Room
                            <ChevronRight size={20} />
                        </button>

                        <button
                            className="secondaryButton"
                            onClick={() => navigate("/join")}
                        >
                            Enter Room Code
                        </button>
                    </div>
                </section>

                <section className="library">
                    <div className="sectionHeading">
                        <div>
                            <span className="eyebrow">GAME LIBRARY</span>
                            <h2>Choose your game</h2>
                        </div>

                        <span className="gameCount">
                            {games.length} games
                        </span>
                    </div>

                    <div className="gameGrid">
                        {games.map((game) => (
                            <button
                                className={`gameCard ${game.className}`}
                                key={game.id}
                                onClick={() => navigate(`/game/${game.id}`)}
                            >
                                <div className="cardTop">
                                    <div className="gameIcon">{game.icon}</div>

                                    <span className="players">
                                        <Users size={15} />
                                        {game.players}
                                    </span>
                                </div>

                                <div className="cardContent">
                                    <h3>{game.name}</h3>
                                    <p>{game.description}</p>
                                </div>

                                <div className="play">
                                    View Game
                                    <ChevronRight size={18} />
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Home;