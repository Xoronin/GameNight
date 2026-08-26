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
import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import {
  leaveRoom,
  startGame,
  updateSelectedGame,
} from "../services/roomService";
import "../styles/lobby.css";
import type { Player } from "../types/player";
import {
  clearPlayer,
  getPlayer,
} from "../utils/gameUtils";

const games = [
  {
    id: "bluff",
    name: "Bluff",
    description:
      "Write fake answers and fool your friends.",
    icon: <MessageSquareQuote />,
    className: "purple",
  },
  {
    id: "minefield",
    name: "Minefield",
    description:
      "Find the correct answers without getting eliminated.",
    icon: <Bomb />,
    className: "red",
  },
  {
    id: "higher-lower",
    name: "Higher / Lower",
    description:
      "Compare facts and keep your streak alive.",
    icon: <TrendingUp />,
    className: "green",
  },
  {
    id: "trivia",
    name: "Trivia",
    description:
      "Compete across different quiz categories.",
    icon: <Brain />,
    className: "blue",
  },
  {
    id: "categories",
    name: "Categories",
    description:
      "Our version of Stadt, Land, Fluss.",
    icon: <ListChecks />,
    className: "orange",
  },
  {
    id: "draw-guess",
    name: "Draw & Guess",
    description:
      "Draw secret words while your friends guess.",
    icon: <Brush />,
    className: "pink",
  },
];

function Lobby() {
  const navigate = useNavigate();
  const { roomCode } = useParams();

  const [localPlayer] = useState<Player | null>(
    () => getPlayer(),
  );

  const [copied, setCopied] = useState(false);

  const {
    room,
    players,
    loading,
    error,
  } = useRoom(roomCode);

  useEffect(() => {
    if (
      room?.status !== "playing" ||
      !room.selectedGame
    ) {
      return;
    }

    navigate(
      `/game/${room.selectedGame}?room=${room.code}`,
    );
  }, [
    room?.status,
    room?.selectedGame,
    room?.code,
    navigate,
  ]);

  const copyRoomCode = async () => {
    if (!roomCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        roomCode,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  const selectGame = async (
    gameId: string,
  ) => {
    if (
      !room ||
      !localPlayer
    ) {
      return;
    }

    const isHost =
      room.hostPlayerId === localPlayer.id;

    if (!isHost) {
      return;
    }

    try {
      await updateSelectedGame(
        room.id,
        gameId,
      );
    } catch (caughtError) {
      console.error(
        "Could not select game:",
        caughtError,
      );
    }
  };

  const handleLeaveRoom = async () => {
    try {
      if (localPlayer) {
        await leaveRoom(
          localPlayer.id,
        );
      }
    } catch (caughtError) {
      console.error(
        "Could not leave room:",
        caughtError,
      );
    }

    clearPlayer();
    navigate("/");
  };

  if (!localPlayer) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>No player found</h1>

          <p>
            Please create or join a room first.
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

  if (loading) {
    return (
      <div className="page">
        <div className="centerCard">
          <span className="eyebrow">
            GAME LOBBY
          </span>

          <h1>Loading room...</h1>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="page">
        <div className="centerCard">
          <span className="eyebrow">
            ROOM ERROR
          </span>

          <h1>Room not found</h1>

          <p>
            {error ??
              "This room no longer exists."}
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

  const isHost =
    room.hostPlayerId ===
    localPlayer.id;

  const handleStartGame = async () => {
    if (!isHost) {
      return;
    }

    try {
      await startGame(
        room.id,
        room.selectedGame,
      );
    } catch (caughtError) {
      console.error(
        "Could not start game:",
        caughtError,
      );
    }
  };

  return (
    <div className="page lobbyPage">
      <div className="lobbyTopBar">
        <button
          className="backButton"
          onClick={() => {
            void handleLeaveRoom();
          }}
        >
          <LogOut size={18} />
          Leave room
        </button>

        <div className="roomTopInfo">
          Room
          <strong>
            {room.code}
          </strong>
        </div>
      </div>

      <div className="lobby">
        <div className="lobbyHeader">
          <span className="eyebrow">
            GAME LOBBY
          </span>

          <h1>Ready to play?</h1>

          <p>
            Share this room code with your friends.
          </p>

          <button
            className="roomCodeButton"
            onClick={() => {
              void copyRoomCode();
            }}
            type="button"
          >
            {room.code}

            {copied ? (
              <Check size={17} />
            ) : (
              <Copy size={17} />
            )}
          </button>

          {copied && (
            <span className="copyMessage">
              Copied!
            </span>
          )}
        </div>

        <div className="lobbyColumns">
          <section className="lobbyPanel playerPanel">
            <div className="panelTitle">
              <div>
                <span className="eyebrow">
                  PLAYERS
                </span>

                <h2>
                  <Users size={20} />

                  {players.length}{" "}
                  {players.length === 1
                    ? "Player"
                    : "Players"}
                </h2>
              </div>
            </div>

            <div className="playerList">
              {players.map(
                (player) => (
                  <div
                    className="playerRow"
                    key={player.id}
                  >
                    <div className="playerAvatar">
                      {player.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="playerDetails">
                      <strong>
                        {player.name}
                        {player.id ===
                          localPlayer.id &&
                          " (You)"}
                      </strong>

                      <span>
                        {player.isHost
                          ? "Host"
                          : "Player"}
                      </span>
                    </div>

                    {player.isHost && (
                      <span className="hostBadge">
                        <Crown size={14} />
                        Host
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>

            <div className="waitingBox">
              <Users size={22} />

              <div>
                <strong>
                  {players.length <= 1
                    ? "Waiting for friends"
                    : "Players are joining"}
                </strong>

                <span>
                  Anyone with room code{" "}
                  {room.code} can join this
                  lobby.
                </span>
              </div>
            </div>
          </section>

          <section className="lobbyPanel gameSelectPanel">
            <div className="panelTitle">
              <div>
                <span className="eyebrow">
                  GAME
                </span>

                <h2>
                  {isHost
                    ? "Choose a game"
                    : "Selected game"}
                </h2>
              </div>
            </div>

            <div className="lobbyGameList">
              {games.map(
                (game) => (
                  <button
                    key={game.id}
                    className={`lobbyGameOption ${
                      game.className
                    } ${
                      room.selectedGame ===
                      game.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => {
                      void selectGame(
                        game.id,
                      );
                    }}
                    disabled={!isHost}
                    type="button"
                  >
                    <div className="lobbyGameIcon">
                      {game.icon}
                    </div>

                    <div className="lobbyGameText">
                      <strong>
                        {game.name}
                      </strong>

                      <span>
                        {
                          game.description
                        }
                      </span>
                    </div>

                    {room.selectedGame ===
                    game.id ? (
                      <div className="selectedIndicator">
                        <Check
                          size={16}
                        />
                      </div>
                    ) : (
                      <ChevronRight
                        className="gameChevron"
                        size={18}
                      />
                    )}
                  </button>
                ),
              )}
            </div>
          </section>
        </div>

        {isHost ? (
          <button
            className="primaryButton largeButton startGameButton"
            onClick={() => {
              void handleStartGame();
            }}
          >
            Start{" "}
            {
              games.find(
                (game) =>
                  game.id ===
                  room.selectedGame,
              )?.name
            }

            <ChevronRight
              size={20}
            />
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