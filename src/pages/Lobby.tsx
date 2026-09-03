import {
  Check,
  ChevronRight,
  Copy,
  Crown,
  LogOut,
  Plus,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import Header from "../components/Header";
import SoundToggle from "../components/SoundToggle";
import {
  GAME_ROUND_COUNT_OPTIONS,
  GAME_TIMER_OPTIONS,
  getCategoriesCustom,
  getCategoriesSelectedKeys,
  getGameRoundCount,
  getGameTimerSeconds,
  withCategoriesCustom,
  withCategoriesSelectedKeys,
  withGameRoundCount,
  withGameTimerSeconds,
} from "../data/gameTimers";
import type { TimedGameId } from "../data/gameTimers";
import { classicCategories } from "../data/categoryPacks";
import {
  gameLibrary,
  getGameLibraryEntry,
} from "../data/gameLibrary";
import { useLanguage } from "../hooks/useLanguage";
import { useRoom } from "../hooks/useRoom";
import {
  exitTournament,
  leaveRoom,
  startGame,
  startTournament,
  updateGameSettings,
  updateSelectedGame,
} from "../services/roomService";
import "../styles/lobby.css";
import type { Player } from "../types/player";
import {
  clearPlayer,
  getPlayer,
} from "../utils/gameUtils";
import { updateGameLanguage } from "../services/roomService";

const timerLabelKeys: Record<
  TimedGameId,
  string
> = {
  bluff: "bluff.timerLabel",
  categories: "categories.timerLabel",
  minefield: "minefield.timerLabel",
  "draw-guess": "drawing.timerLabel",
  "higher-lower":
    "higherLower.timerLabel",
  trivia: "trivia.timerLabel",
};

function isTimedGame(
  gameId: string,
): gameId is TimedGameId {
  return (
    gameId in timerLabelKeys
  );
}

const roundCountLabelKeys: Record<
  TimedGameId,
  string
> = {
  bluff: "lobby.roundCountLabel",
  categories:
    "lobby.roundCountLabel",
  minefield:
    "lobby.roundCountLabel",
  "draw-guess":
    "drawing.roundsPerPlayerLabel",
  "higher-lower":
    "lobby.roundCountLabel",
  trivia:
    "lobby.roundCountLabel",
};

const games = gameLibrary;

const soloLobbyGames = games.filter(
  (game) => game.group === "solo",
);

const teamLobbyGames = games.filter(
  (game) => game.group === "team",
);

const playableGames = games.filter(
  (game) => !game.comingSoon,
);

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

  const [
    newCategoryName,
    setNewCategoryName,
  ] = useState("");

  const [lobbyMode, setLobbyMode] =
    useState<
      "single" | "tournament"
    >("single");

  const [
    tournamentSelection,
    setTournamentSelection,
  ] = useState<string[]>([]);

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

  const toggleTournamentGame = (
    gameId: string,
  ) => {
    setTournamentSelection(
      (current) =>
        current.includes(gameId)
          ? current.filter(
              (id) => id !== gameId,
            )
          : [...current, gameId],
    );
  };

  const handleStartTournament =
    async () => {
      if (
        !room ||
        !isHost ||
        tournamentSelection.length <
          2
      ) {
        return;
      }

      try {
        await startTournament(
          room.id,
          tournamentSelection,
        );
      } catch (caughtError) {
        console.error(
          "Could not start tournament:",
          caughtError,
        );
      }
    };

  const handleExitTournament =
    async () => {
      if (!room || !isHost) {
        return;
      }

      try {
        await exitTournament(
          room.id,
        );
      } catch (caughtError) {
        console.error(
          "Could not exit tournament:",
          caughtError,
        );
      }
    };

  const addCustomCategory =
    async () => {
      if (
        !room ||
        !isHost
      ) {
        return;
      }

      const trimmed =
        newCategoryName.trim();

      if (!trimmed) {
        return;
      }

      const key = `custom-${crypto
        .randomUUID()
        .slice(0, 8)}`;

      const custom =
        getCategoriesCustom(
          room.gameSettings,
        );

      const selectedKeys =
        getCategoriesSelectedKeys(
          room.gameSettings,
        );

      let nextSettings =
        withCategoriesCustom(
          room.gameSettings,
          [
            ...custom,
            {
              key,
              label: trimmed,
            },
          ],
        );

      nextSettings =
        withCategoriesSelectedKeys(
          nextSettings,
          [
            ...selectedKeys,
            key,
          ],
        );

      setNewCategoryName("");

      try {
        await updateGameSettings(
          room.id,
          nextSettings,
        );
      } catch (caughtError) {
        console.error(
          "Could not add category:",
          caughtError,
        );
      }
    };

  const removeCustomCategory =
    async (key: string) => {
      if (
        !room ||
        !isHost
      ) {
        return;
      }

      const custom =
        getCategoriesCustom(
          room.gameSettings,
        );

      const selectedKeys =
        getCategoriesSelectedKeys(
          room.gameSettings,
        ).filter(
          (item) =>
            item !== key,
        );

      let nextSettings =
        withCategoriesCustom(
          room.gameSettings,
          custom.filter(
            (item) =>
              item.key !== key,
          ),
        );

      nextSettings =
        withCategoriesSelectedKeys(
          nextSettings,
          selectedKeys,
        );

      try {
        await updateGameSettings(
          room.id,
          nextSettings,
        );
      } catch (caughtError) {
        console.error(
          "Could not remove category:",
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
      <>
        <Header />

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
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />

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
      </>
    );
  }

  if (error || !room) {
    return (
      <>
        <Header />

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
      </>
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

  const tournamentFinished =
    !!room.tournamentGames &&
    room.tournamentGames.length >
      0 &&
    room.tournamentIndex >=
      room.tournamentGames.length;

  if (tournamentFinished) {
    const sortedPlayers = [
      ...players,
    ].sort(
      (a, b) => b.score - a.score,
    );

    return (
      <>
        <Header />

        <div className="page">
        <div className="centerCard tournamentResults">
          <Trophy size={40} />

          <span className="eyebrow">
            {t(
              "tournament.complete",
            )}
          </span>

          <h1>
            {t(
              "tournament.finalStandings",
            )}
          </h1>

          <div className="tournamentScoreboard">
            {sortedPlayers.map(
              (player, index) => (
                <div
                  key={player.id}
                  className="tournamentScoreRow"
                >
                  <span>
                    {index + 1}
                  </span>

                  <strong>
                    {player.name}
                  </strong>

                  <b>
                    {player.score.toLocaleString()}
                  </b>
                </div>
              ),
            )}
          </div>

          <div className="tournamentGamesPlayed">
            <span>
              {t(
                "tournament.gamesPlayed",
              )}
            </span>

            <div className="tournamentGameChips">
              {room.tournamentGames!.map(
                (gameId) => {
                  const entry =
                    getGameLibraryEntry(
                      gameId,
                    );

                  if (!entry) {
                    return null;
                  }

                  return (
                    <span
                      key={
                        gameId
                      }
                      className={`tournamentGameChip ${entry.className}`}
                    >
                      {entry.icon}

                      {t(
                        entry.nameKey,
                      )}
                    </span>
                  );
                },
              )}
            </div>
          </div>

          {isHost ? (
            <button
              className="primaryButton formButton"
              onClick={() => {
                void handleExitTournament();
              }}
            >
              {t(
                "tournament.returnToLobby",
              )}
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
      </>
    );
  }

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

  const renderLobbyGameOption = (
    game: (typeof games)[number],
  ) => {
    if (game.comingSoon) {
      return (
        <div
          key={game.id}
          className={`lobbyGameOption comingSoon ${game.className}`}
        >
          <div className="lobbyGameIcon">
            {game.icon}
          </div>

          <div className="lobbyGameText">
            <strong>
              {t(game.nameKey)}
            </strong>

            <span>
              {t(
                game.descriptionKey,
              )}
            </span>
          </div>

          <div className="comingSoonTag">
            {t("home.comingSoon")}
          </div>
        </div>
      );
    }

    return (
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
          void selectGame(game.id);
        }}
        disabled={!isHost}
        type="button"
      >
        <div className="lobbyGameIcon">
          {game.icon}
        </div>

        <div className="lobbyGameText">
          <strong>
            {t(game.nameKey)}
          </strong>

          <span>
            {t(game.descriptionKey)}
          </span>
        </div>

        {room.selectedGame ===
        game.id ? (
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
    );
  };

  const renderGameSettings = (
    gameId: TimedGameId,
  ) => (
    <>
      <div className="gameTimerSetting">
        <span>
          {t(
            timerLabelKeys[gameId],
          )}
        </span>

        <select
          value={getGameTimerSeconds(
            room.gameSettings,
            gameId,
          )}
          disabled={!isHost}
          onChange={(event) => {
            void updateGameSettings(
              room.id,
              withGameTimerSeconds(
                room.gameSettings,
                gameId,
                Number(
                  event.target
                    .value,
                ),
              ),
            );
          }}
        >
          {GAME_TIMER_OPTIONS[
            gameId
          ].map((seconds) => (
            <option
              key={seconds}
              value={seconds}
            >
              {seconds}{" "}
              {t("lobby.seconds")}
            </option>
          ))}
        </select>
      </div>

      <div className="gameTimerSetting">
        <span>
          {t(
            roundCountLabelKeys[
              gameId
            ],
          )}
        </span>

        <select
          value={getGameRoundCount(
            room.gameSettings,
            gameId,
          )}
          disabled={!isHost}
          onChange={(event) => {
            void updateGameSettings(
              room.id,
              withGameRoundCount(
                room.gameSettings,
                gameId,
                Number(
                  event.target
                    .value,
                ),
              ),
            );
          }}
        >
          {GAME_ROUND_COUNT_OPTIONS[
            gameId
          ].map((count) => (
            <option
              key={count}
              value={count}
            >
              {count}{" "}
              {t(
                "categories.rounds",
              )}
            </option>
          ))}
        </select>
      </div>

      {gameId === "categories" && (
        <div className="categorySettingList">
          <span>
            {t(
              "categories.categoriesLabel",
            )}
          </span>

          {classicCategories.map(
            (category) => {
              const selectedKeys =
                getCategoriesSelectedKeys(
                  room.gameSettings,
                );

              const checked =
                selectedKeys.includes(
                  category.key,
                );

              return (
                <label
                  key={
                    category.key
                  }
                  className="categorySettingOption"
                >
                  <input
                    type="checkbox"
                    checked={
                      checked
                    }
                    disabled={
                      !isHost
                    }
                    onChange={(
                      event,
                    ) => {
                      const next =
                        event
                          .target
                          .checked
                          ? [
                              ...selectedKeys,
                              category.key,
                            ]
                          : selectedKeys.filter(
                              (
                                key,
                              ) =>
                                key !==
                                category.key,
                            );

                      if (
                        next.length ===
                        0
                      ) {
                        return;
                      }

                      void updateGameSettings(
                        room.id,
                        withCategoriesSelectedKeys(
                          room.gameSettings,
                          next,
                        ),
                      );
                    }}
                  />

                  {t(
                    `categories.labels.${category.key}`,
                  )}
                </label>
              );
            },
          )}

          {getCategoriesCustom(
            room.gameSettings,
          ).map((category) => {
            const selectedKeys =
              getCategoriesSelectedKeys(
                room.gameSettings,
              );

            const checked =
              selectedKeys.includes(
                category.key,
              );

            return (
              <div
                key={category.key}
                className="categorySettingOption customCategoryOption"
              >
                <label>
                  <input
                    type="checkbox"
                    checked={
                      checked
                    }
                    disabled={
                      !isHost
                    }
                    onChange={(
                      event,
                    ) => {
                      const next =
                        event
                          .target
                          .checked
                          ? [
                              ...selectedKeys,
                              category.key,
                            ]
                          : selectedKeys.filter(
                              (
                                key,
                              ) =>
                                key !==
                                category.key,
                            );

                      if (
                        next.length ===
                        0
                      ) {
                        return;
                      }

                      void updateGameSettings(
                        room.id,
                        withCategoriesSelectedKeys(
                          room.gameSettings,
                          next,
                        ),
                      );
                    }}
                  />

                  {category.label}
                </label>

                {isHost && (
                  <button
                    type="button"
                    className="removeCategoryButton"
                    aria-label={t(
                      "categories.removeCategory",
                    )}
                    onClick={() => {
                      void removeCustomCategory(
                        category.key,
                      );
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {isHost && (
            <div className="addCategoryRow">
              <input
                type="text"
                className="addCategoryInput"
                value={
                  newCategoryName
                }
                maxLength={30}
                placeholder={t(
                  "categories.addCustomCategoryPlaceholder",
                )}
                onChange={(
                  event,
                ) =>
                  setNewCategoryName(
                    event.target
                      .value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    void addCustomCategory();
                  }
                }}
              />

              <button
                type="button"
                className="addCategoryButton"
                disabled={
                  !newCategoryName.trim()
                }
                onClick={() => {
                  void addCustomCategory();
                }}
              >
                <Plus size={15} />

                {t(
                  "categories.addCustomCategory",
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <Header />

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

        <div className="lobbyTopBarRight">
          <div className="roomTopInfo">
            {t("common.room")}
            <strong>
              {room.code}
            </strong>
          </div>

          <SoundToggle />
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

        <div
          className={`lobbyColumns ${
            (lobbyMode === "single" &&
              isTimedGame(
                room.selectedGame,
              )) ||
            (lobbyMode ===
              "tournament" &&
              tournamentSelection.length >
                0)
              ? "withSettings"
              : ""
          }`}
        >
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

            <div className="lobbyPanelBody">
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

                    <span className="playerScore">
                      {player.score.toLocaleString()}
                    </span>

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

            {isHost && (
              <div className="lobbyModeToggle">
                <button
                  type="button"
                  className={
                    lobbyMode ===
                    "single"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setLobbyMode(
                      "single",
                    )
                  }
                >
                  {t(
                    "tournament.modeSingle",
                  )}
                </button>

                <button
                  type="button"
                  className={
                    lobbyMode ===
                    "tournament"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setLobbyMode(
                      "tournament",
                    )
                  }
                >
                  <Trophy
                    size={14}
                  />

                  {t(
                    "tournament.modeTournament",
                  )}
                </button>
              </div>
            )}

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

            <div className="lobbyPanelBody">
            {(!isHost ||
              lobbyMode ===
                "single") && (
              <>
                <span className="lobbyGameGroupLabel">
                  {t(
                    "home.groupSolo",
                  )}
                </span>

                <div className="lobbyGameList">
                  {soloLobbyGames.map(
                    renderLobbyGameOption,
                  )}
                </div>

                <span className="lobbyGameGroupLabel">
                  {t(
                    "home.groupTeam",
                  )}
                </span>

                <div className="lobbyGameList">
                  {teamLobbyGames.map(
                    renderLobbyGameOption,
                  )}
                </div>
              </>
            )}

            {isHost &&
              lobbyMode ===
                "tournament" && (
                <>
                  <span className="lobbyGameGroupLabel">
                    {t(
                      "tournament.selectGames",
                    )}
                  </span>

                  <p className="tournamentHint">
                    {t(
                      "tournament.selectGamesHint",
                    )}
                  </p>

                  <div className="lobbyGameList">
                    {playableGames.map(
                      (game) => {
                        const checked =
                          tournamentSelection.includes(
                            game.id,
                          );

                        return (
                          <label
                            key={
                              game.id
                            }
                            className={`lobbyGameOption tournamentPickOption ${
                              game.className
                            } ${
                              checked
                                ? "selected"
                                : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={
                                checked
                              }
                              onChange={() =>
                                toggleTournamentGame(
                                  game.id,
                                )
                              }
                            />

                            <div className="lobbyGameIcon">
                              {
                                game.icon
                              }
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

                            {checked && (
                              <div className="selectedIndicator">
                                <Check
                                  size={
                                    16
                                  }
                                />
                              </div>
                            )}
                          </label>
                        );
                      },
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {lobbyMode === "single" &&
            isTimedGame(
              room.selectedGame,
            ) && (
              <section className="lobbyPanel gameSettingsPanel">
                <div className="panelTitle">
                  <div>
                    <span className="eyebrow">
                      SETTINGS
                    </span>

                    <h2>
                      <Settings
                        size={19}
                      />

                      {t(
                        "lobby.gameSettings",
                      )}
                    </h2>
                  </div>
                </div>

                <div className="lobbyPanelBody">
                  {renderGameSettings(
                    room.selectedGame,
                  )}
                </div>
              </section>
            )}

          {isHost &&
            lobbyMode ===
              "tournament" &&
            tournamentSelection.length >
              0 && (
              <section className="lobbyPanel gameSettingsPanel tournamentSettingsPanel">
                <div className="panelTitle">
                  <div>
                    <span className="eyebrow">
                      SETTINGS
                    </span>

                    <h2>
                      <Settings
                        size={19}
                      />

                      {t(
                        "lobby.gameSettings",
                      )}
                    </h2>
                  </div>
                </div>

                <div className="lobbyPanelBody">
                  {tournamentSelection.map(
                    (gameId) => {
                      if (
                        !isTimedGame(
                          gameId,
                        )
                      ) {
                        return null;
                      }

                      const entry =
                        getGameLibraryEntry(
                          gameId,
                        );

                      return (
                        <div
                          key={
                            gameId
                          }
                          className="tournamentGameSettingsBlock"
                        >
                          <h3>
                            {entry?.icon}

                            {entry
                              ? t(
                                  entry.nameKey,
                                )
                              : gameId}
                          </h3>

                          {renderGameSettings(
                            gameId,
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            )}
        </div>

        {isHost ? (
          lobbyMode ===
          "tournament" ? (
            <>
              <button
                className="primaryButton largeButton startGameButton"
                disabled={
                  tournamentSelection.length <
                  2
                }
                onClick={() => {
                  void handleStartTournament();
                }}
              >
                <Trophy
                  size={18}
                />

                {t(
                  "tournament.startTournament",
                )}

                {tournamentSelection.length >
                  0 &&
                  ` (${tournamentSelection.length} ${t("tournament.gameCount")})`}

                <ChevronRight
                  size={20}
                />
              </button>

              {tournamentSelection.length <
                2 && (
                <p className="tournamentHint tournamentHintCentered">
                  {t(
                    "tournament.selectGamesHint",
                  )}
                </p>
              )}
            </>
          ) : (
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
          )
        ) : (
          <div className="waitingHost">
            {t(
              "lobby.waitingHost",
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
}

export default Lobby;