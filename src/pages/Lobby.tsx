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
import { useLanguage } from "../hooks/useLanguage";
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
import { updateGameLanguage } from "../services/roomService";

const games = [
  {
    id: "bluff",
    nameKey: "games.bluff.name",
    descriptionKey:
      "games.bluff.description",
    icon: <MessageSquareQuote />,
    className: "purple",
  },
  {
    id: "minefield",
    nameKey: "games.minefield.name",
    descriptionKey:
      "games.minefield.description",
    icon: <Bomb />,
    className: "red",
  },
  {
    id: "higher-lower",
    nameKey:
      "games.higherLower.name",
    descriptionKey:
      "games.higherLower.description",
    icon: <TrendingUp />,
    className: "green",
  },
  {
    id: "trivia",
    nameKey: "games.trivia.name",
    descriptionKey:
      "games.trivia.description",
    icon: <Brain />,
    className: "blue",
  },
  {
    id: "categories",
    nameKey:
      "games.categories.name",
    descriptionKey:
      "games.categories.description",
    icon: <ListChecks />,
    className: "orange",
  },
  {
    id: "draw-guess",
    nameKey:
      "games.drawGuess.name",
    descriptionKey:
      "games.drawGuess.description",
    icon: <Brush />,
    className: "pink",
  },
];

function Lobby() {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { t } = useLanguage();

  const [localPlayer] =
    useState<Player | null>(
      () => getPlayer(),
    );

  const [copied, setCopied] =
    useState(false);

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
      room.hostPlayerId ===
      localPlayer.id;

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

  const handleLeaveRoom =
    async () => {
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
          <h1>
            {t(
              "lobby.noPlayerTitle",
            )}
          </h1>

          <p>
            {t(
              "lobby.noPlayerDescription",
            )}
          </p>

          <button
            className="primaryButton formButton"
            onClick={() =>
              navigate("/")
            }
          >
            {t("common.home")}
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
            {t("lobby.badge")}
          </span>

          <h1>
            {t("lobby.loadingRoom")}
          </h1>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="page">
        <div className="centerCard">
          <span className="eyebrow">
            {t("lobby.roomError")}
          </span>

          <h1>
            {t("lobby.roomNotFound")}
          </h1>

          <p>
            {error ??
              t(
                "lobby.roomGone",
              )}
          </p>

          <button
            className="primaryButton formButton"
            onClick={() =>
              navigate("/")
            }
          >
            {t("common.home")}
          </button>
        </div>
      </div>
    );
  }

  const isHost =
    room.hostPlayerId ===
    localPlayer.id;

  const selectedGame =
    games.find(
      (game) =>
        game.id ===
        room.selectedGame,
    );

  const handleStartGame =
    async () => {
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
          {t("lobby.leaveRoom")}
        </button>

        <div className="roomTopInfo">
          {t("common.room")}
          <strong>
            {room.code}
          </strong>
        </div>
      </div>

      <div className="lobby">
        <div className="lobbyHeader">
          <span className="eyebrow">
            {t("lobby.badge")}
          </span>

          <h1>
            {t("lobby.ready")}
          </h1>

          <p>
            {t("lobby.shareCode")}
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
              {t("lobby.copied")}
            </span>
          )}
        </div>

        <div className="lobbyColumns">
          <section className="lobbyPanel playerPanel">
            <div className="panelTitle">
              <div>
                <span className="eyebrow">
                  {t(
                    "common.players",
                  ).toUpperCase()}
                </span>

                <h2>
                  <Users size={20} />

                  {players.length}{" "}
                  {players.length === 1
                    ? t(
                        "common.player",
                      )
                    : t(
                        "common.players",
                      )}
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
                          ` (${t(
                            "common.you",
                          )})`}
                      </strong>

                      <span>
                        {player.isHost
                          ? t(
                              "common.host",
                            )
                          : t(
                              "common.player",
                            )}
                      </span>
                    </div>

                    {player.isHost && (
                      <span className="hostBadge">
                        <Crown size={14} />
                        {t(
                          "common.host",
                        )}
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
                    ? t(
                        "lobby.waitingFriends",
                      )
                    : t(
                        "lobby.playersJoining",
                      )}
                </strong>

                <span>
                  {t(
                    "lobby.anyoneWithCode",
                  )}{" "}
                  {room.code}
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
                    ? t(
                        "lobby.chooseGame",
                      )
                    : t(
                        "lobby.selectedGame",
                      )}
                </h2>
              </div>
            </div>

            <div className="gameLanguageSelector">
              <span>
                {t("lobby.gameLanguage")}
              </span>

              <div className="gameLanguageButtons">
                <button
                  type="button"
                  className={
                    room.gameLanguage === "de"
                      ? "active"
                      : ""
                  }
                  disabled={!isHost}
                  onClick={() => {
                    void updateGameLanguage(
                      room.id,
                      "de",
                    );
                  }}
                >
                  🇩🇪 {t("common.german")}
                </button>

                <button
                  type="button"
                  className={
                    room.gameLanguage === "en"
                      ? "active"
                      : ""
                  }
                  disabled={!isHost}
                  onClick={() => {
                    void updateGameLanguage(
                      room.id,
                      "en",
                    );
                  }}
                >
                  🇬🇧 {t("common.english")}
                </button>
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
                        {t(
                          game.nameKey,
                        )}
                      </strong>

                      <span>
                        {t(
                          game.descriptionKey,
                        )}
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
            {t("lobby.start")}{" "}
            {selectedGame
              ? t(
                  selectedGame.nameKey,
                )
              : ""}

            <ChevronRight
              size={20}
            />
          </button>
        ) : (
          <div className="waitingHost">
            {t(
              "lobby.waitingHost",
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Lobby;