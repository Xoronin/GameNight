import {
    Bomb,
    Brain,
    Brush,
    Check,
    ChevronRight,
    Copy,
    Crown,
    ListChecks,
    LogOut,
    MessageSquareQuote,
    TrendingUp,
    Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Player } from "../types/player";
import { clearPlayer, getPlayer } from "../utils/gameUtils";
import "../styles/lobby.css";

const games = [
    {
        id: "bluff",
        name: "Bluff",
        description: "Write fake answers and fool your friends.",
        icon: <MessageSquareQuote />,
        className: "purple",
    },
    {
        id: "minefield",
        name: "Minefield",
        description: "Find the correct answers without getting eliminated.",
        icon: <Bomb />,
        className: "red",
    },
    {
        id: "higher-lower",
        name: "Higher / Lower",
        description: "Compare facts and keep your streak alive.",
        icon: <TrendingUp />,
        className: "green",
    },
    {
        id: "trivia",
        name: "Trivia",
        description: "Compete across different quiz categories.",
        icon: <Brain />,
        className: "blue",
    },
    {
        id: "categories",
        name: "Categories",
        description: "Our version of Stadt, Land, Fluss.",
        icon: <ListChecks />,
        className: "orange",
    },
    {
        id: "draw-guess",
        name: "Draw & Guess",
        description: "Draw secret words while your friends guess.",
        icon: <Brush />,
        className: "pink",
    },
];

function Lobby() {
    const navigate = useNavigate();
    const { roomCode } = useParams();

    const [selectedGame, setSelectedGame] = useState("bluff");
    const [copied, setCopied] = useState(false);

    const [player] = useState<Player | null>(() => getPlayer());

    const copyRoomCode = async () => {
        if (!roomCode) return;

        try {
            await navigator.clipboard.writeText(roomCode);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 1500);
        } catch {
            // Clipboard may be unavailable on some browsers.
        }
    };

    const leaveLobby = () => {
        clearPlayer();
        navigate("/");
    };

    const startGame = () => {
        navigate(`/game/${selectedGame}`);
    };

    if (!player) {
        return (
            <div className="page">
                <div className="centerCard">
                    <h1>No player found</h1>
                    <p>Please create or join a room first.</p>

                    <button
                        className="primaryButton formButton"
                        onClick={() => navigate("/")}
                    >
                        Back Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page lobbyPage">
            <div className="lobbyTopBar">
                <button className="backButton" onClick={leaveLobby}>
                    <LogOut size={18} />
                    Leave room
                </button>

                <div className="roomTopInfo">
                    Room
                    <strong>{roomCode}</strong>
                </div>
            </div>

            <div className="lobby">
                <div className="lobbyHeader">
                    <span className="eyebrow">GAME LOBBY</span>

                    <h1>Ready to play?</h1>

                    <p>
                        Share this room code with your friends.
                    </p>

                    <button
                        className="roomCodeButton"
                        onClick={copyRoomCode}
                        type="button"
                    >
                        {roomCode}

                        {copied ? (
                            <Check size={17} />
                        ) : (
                            <Copy size={17} />
                        )}
                    </button>

                    {copied && (
                        <span className="copyMessage">Copied!</span>
                    )}
                </div>

                <div className="lobbyColumns">
                    <section className="lobbyPanel playerPanel">
                        <div className="panelTitle">
                            <div>
                                <span className="eyebrow">PLAYERS</span>
                                <h2>
                                    <Users size={20} />
                                    1 Player
                                </h2>
                            </div>
                        </div>

                        <div className="playerList">
                            <div className="playerRow">
                                <div className="playerAvatar">
                                    {player.name.charAt(0).toUpperCase()}
                                </div>

                                <div className="playerDetails">
                                    <strong>{player.name}</strong>

                                    <span>
                                        {player.isHost ? "Host" : "Player"}
                                    </span>
                                </div>

                                {player.isHost && (
                                    <span className="hostBadge">
                                        <Crown size={14} />
                                        Host
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="waitingBox">
                            <Users size={22} />

                            <div>
                                <strong>Waiting for friends</strong>

                                <span>
                                    Online multiplayer will sync players here once we
                                    connect the backend.
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="lobbyPanel gameSelectPanel">
                        <div className="panelTitle">
                            <div>
                                <span className="eyebrow">GAME</span>
                                <h2>Choose a game</h2>
                            </div>
                        </div>

                        <div className="lobbyGameList">
                            {games.map((game) => (
                                <button
                                    key={game.id}
                                    className={`lobbyGameOption ${game.className} ${selectedGame === game.id ? "selected" : ""
                                        }`}
                                    onClick={() => setSelectedGame(game.id)}
                                    type="button"
                                >
                                    <div className="lobbyGameIcon">
                                        {game.icon}
                                    </div>

                                    <div className="lobbyGameText">
                                        <strong>{game.name}</strong>
                                        <span>{game.description}</span>
                                    </div>

                                    {selectedGame === game.id ? (
                                        <div className="selectedIndicator">
                                            <Check size={16} />
                                        </div>
                                    ) : (
                                        <ChevronRight
                                            className="gameChevron"
                                            size={18}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {player.isHost ? (
                    <button
                        className="primaryButton largeButton startGameButton"
                        onClick={startGame}
                    >
                        Start {games.find((g) => g.id === selectedGame)?.name}
                        <ChevronRight size={20} />
                    </button>
                ) : (
                    <div className="waitingHost">
                        Waiting for the host to start the game...
                    </div>
                )}
            </div>
        </div>
    );
}

export default Lobby;