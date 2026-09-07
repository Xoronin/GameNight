import {
  ArrowRight,
  Check,
  Crown,
  Heart,
  History,
  LoaderCircle,
  Plus,
  Shuffle,
  Trophy,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import {
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import { useTimelineRound } from "../../hooks/useTimelineRound";
import {
  STARTING_LIVES,
  createTimelineRound,
  createTimelineSession,
  finishTimelineGame,
  getTimelineCategories,
  getTimelineUsedCategoryIds,
  passTimelineTurn,
  placeTimelineItem,
  returnTimelineRoomToLobby,
} from "../../services/timelineService";
import { advanceTournament } from "../../services/roomService";
import type {
  TimelineCategory,
  TimelineItem,
} from "../../types/game";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import "../../styles/timeline.css";
import {
  playReveal,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";

type TimelineGameProps = {
  roomCode: string;
};

function TimelineGame({
  roomCode,
}: TimelineGameProps) {
  const navigate = useNavigate();

  const [localPlayer] =
    useState<Player | null>(
      () => getPlayer(),
    );

  const [working, setWorking] =
    useState(false);

  const [
    actionError,
    setActionError,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState<string | null>(
    null,
  );

  const [
    categories,
    setCategories,
  ] = useState<
    TimelineCategory[]
  >([]);

  const [
    usedCategoryIds,
    setUsedCategoryIds,
  ] = useState<string[]>([]);

  const [
    draftRoundId,
    setDraftRoundId,
  ] = useState<
    string | undefined
  >(undefined);

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(0);

  const triggeredTurnRef =
    useRef<string | null>(
      null,
    );

  const lowTimeTurnRef =
    useRef<string | null>(
      null,
    );

  const revealedRoundIdRef =
    useRef<string | null>(
      null,
    );

  const {
    room,
    players,
    loading: roomLoading,
    error: roomError,
  } = useRoom(roomCode);

  const ROUNDS_PER_GAME =
    getGameRoundCount(
      room?.gameSettings,
      "timeline",
    );

  const gameLanguage =
    room?.gameLanguage ?? "en";

  const gameT = (key: string) =>
    translate(gameLanguage, key);

  const {
    session,
    round,
    items,
    placements,
    loading: roundLoading,
    error: roundError,
  } = useTimelineRound(
    room?.id,
    gameLanguage,
  );

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

  const tournament =
    getTournamentStatus(room);

  useEffect(() => {
    let active = true;

    void getTimelineCategories(
      gameLanguage,
    ).then((loaded) => {
      if (active) {
        setCategories(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [gameLanguage]);

  useEffect(() => {
    let active = true;

    const loadUsedCategories =
      async () => {
        if (!session?.id) {
          if (active) {
            setUsedCategoryIds(
              [],
            );
          }

          return;
        }

        const ids =
          await getTimelineUsedCategoryIds(
            session.id,
          );

        if (active) {
          setUsedCategoryIds(
            ids,
          );
        }
      };

    void loadUsedCategories();

    return () => {
      active = false;
    };
  }, [session?.id, round?.id]);

  const categoryChoices = useMemo(
    () => {
      const unused =
        categories.filter(
          (category) =>
            !usedCategoryIds.includes(
              category.id,
            ),
        );

      return unused.length > 0
        ? unused
        : categories;
    },
    [
      categories,
      usedCategoryIds,
    ],
  );

  const timelineCategoryChoices =
    categoryChoices.filter(
      (category) =>
        category.categoryType ===
        "timeline",
    );

  const rankingCategoryChoices =
    categoryChoices.filter(
      (category) =>
        category.categoryType ===
        "ranking",
    );

  /*
   * Auto-roll a random category the first
   * time one becomes available. Math.random()
   * is impure, so this has to stay an effect
   * rather than a render-time adjustment.
   */
  useEffect(() => {
    const pickInitialCategory =
      async () => {
        if (
          selectedCategoryId ||
          categoryChoices.length ===
            0
        ) {
          return;
        }

        setSelectedCategoryId(
          categoryChoices[
            Math.floor(
              Math.random() *
                categoryChoices.length,
            )
          ].id,
        );
      };

    void pickInitialCategory();
  }, [
    selectedCategoryId,
    categoryChoices,
  ]);

  const rollRandomCategory =
    () => {
      if (
        categoryChoices.length ===
        0
      ) {
        return;
      }

      setSelectedCategoryId(
        categoryChoices[
          Math.floor(
            Math.random() *
              categoryChoices.length,
          )
        ].id,
      );
    };

  const currentCategory =
    round
      ? categories.find(
          (category) =>
            category.id ===
            round.categoryId,
        ) ?? null
      : null;

  const outPlayerIds =
    round?.outPlayerIds ?? [];

  const isLocalPlayerOut =
    !!localPlayer &&
    outPlayerIds.includes(
      localPlayer.id,
    );

  const currentItem =
    round?.currentItemId
      ? items.find(
          (item) =>
            item.id ===
            round.currentItemId,
        ) ?? null
      : null;

  const currentPlayer =
    round
      ? players.find(
          (player) =>
            player.id ===
            round.currentPlayerId,
        )
      : null;

  const isMyTurn =
    !!localPlayer &&
    round?.currentPlayerId ===
      localPlayer.id;

  const boardItemsAscending =
    useMemo(() => {
      const itemsById = new Map(
        items.map((item) => [
          item.id,
          item,
        ]),
      );

      return placements
        .map((placement) =>
          itemsById.get(
            placement.itemId,
          ),
        )
        .filter(
          (
            item,
          ): item is TimelineItem =>
            !!item,
        )
        .sort(
          (a, b) =>
            a.value - b.value,
        );
    }, [placements, items]);

  const displayBoardItems =
    currentCategory?.sortDirection ===
    "desc"
      ? [
          ...boardItemsAscending,
        ].reverse()
      : boardItemsAscending;

  const poolExhausted =
    items.length > 0 &&
    !!round &&
    round.usedItemIds.length >=
      items.length;

  const sortedPlayers =
    useMemo(
      () =>
        [...players].sort(
          (a, b) =>
            b.score - a.score,
        ),
      [players],
    );

  const runAction = async (
    action: () => Promise<void>,
  ) => {
    if (working) {
      return;
    }

    try {
      setWorking(true);
      setActionError(null);

      await action();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : gameT(
              "common.genericError",
            ),
      );
    } finally {
      setWorking(false);
    }
  };

  const startRound = async (
    roundNumber: number,
  ) => {
    if (
      !room ||
      !isHost ||
      !selectedCategoryId
    ) {
      return;
    }

    let activeSession = session;

    if (!activeSession) {
      activeSession =
        await createTimelineSession(
          room.id,
        );
    }

    await createTimelineRound(
      activeSession.id,
      room.id,
      roundNumber,
      players,
      selectedCategoryId,
      getGameTimerSeconds(
        room.gameSettings,
        "timeline",
      ),
    );

    setSelectedCategoryId(null);
  };

  const placeItem = async (
    displayGapIndex: number,
  ) => {
    if (
      !round ||
      !localPlayer ||
      !currentItem
    ) {
      return;
    }

    const gapIndex =
      currentCategory?.sortDirection ===
      "desc"
        ? boardItemsAscending.length -
          displayGapIndex
        : displayGapIndex;

    await placeTimelineItem(
      round,
      gapIndex,
      boardItemsAscending,
      currentItem,
      localPlayer.id,
      players,
      items,
      getGameTimerSeconds(
        room?.gameSettings,
        "timeline",
      ),
    );
  };

  const nextRound = async () => {
    if (
      !round ||
      !isHost ||
      !session
    ) {
      return;
    }

    if (
      round.roundNumber >=
      ROUNDS_PER_GAME
    ) {
      await finishTimelineGame(
        round.id,
        session.id,
      );

      return;
    }

    await startRound(
      round.roundNumber + 1,
    );
  };

  const backToLobby = async () => {
    if (!room || !isHost) {
      return;
    }

    await returnTimelineRoomToLobby(
      room.id,
    );
  };

  if (
    round?.id !== draftRoundId
  ) {
    setDraftRoundId(round?.id);
    setSelectedCategoryId(null);
  }

  useEffect(() => {
    if (
      !round ||
      round.status !==
        "playing" ||
      !round.turnEndsAt
    ) {
      return;
    }

    const turnKey = `${round.id}:${round.currentItemId}:${round.turnEndsAt}`;

    const updateTimer = () => {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (new Date(
              round.turnEndsAt as string,
            ).getTime() -
              Date.now()) /
              1000,
          ),
        );

      setSecondsLeft(remaining);

      if (
        remaining > 0 &&
        remaining <= 5 &&
        lowTimeTurnRef.current !==
          turnKey
      ) {
        lowTimeTurnRef.current =
          turnKey;

        playTick();
      }

      if (
        remaining === 0 &&
        isHost &&
        triggeredTurnRef.current !==
          turnKey
      ) {
        triggeredTurnRef.current =
          turnKey;

        void passTimelineTurn(
          round,
          items,
          players,
          getGameTimerSeconds(
            room?.gameSettings,
            "timeline",
          ),
        );
      }
    };

    updateTimer();

    const timer =
      window.setInterval(
        updateTimer,
        500,
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    round,
    items,
    isHost,
    players,
    room?.gameSettings,
  ]);

  useEffect(() => {
    if (
      !round ||
      round.status !== "reveal"
    ) {
      return;
    }

    if (
      revealedRoundIdRef.current ===
      round.id
    ) {
      return;
    }

    revealedRoundIdRef.current =
      round.id;

    playReveal();
  }, [round]);

  useEffect(() => {
    if (
      room?.status === "lobby"
    ) {
      navigate(
        `/lobby/${room.code}`,
        {
          replace: true,
        },
      );

      return;
    }

    if (
      room?.status ===
        "playing" &&
      room.selectedGame !==
        "timeline"
    ) {
      navigate(
        `/game/${room.selectedGame}?room=${room.code}`,
        { replace: true },
      );
    }
  }, [
    room?.status,
    room?.selectedGame,
    room?.code,
    navigate,
  ]);

  const renderCategoryChooser = (
    selectId: string,
  ) => (
    <div className="timelineCategoryField">
      <label htmlFor={selectId}>
        {gameT(
          "timeline.categoryLabel",
        )}
      </label>

      <div className="timelineCategoryRow">
        <select
          id={selectId}
          value={
            selectedCategoryId ??
            ""
          }
          onChange={(event) =>
            setSelectedCategoryId(
              event.target
                .value || null,
            )
          }
        >
          <option
            value=""
            disabled
          >
            {gameT(
              "timeline.chooseCategory",
            )}
          </option>

          {timelineCategoryChoices.length >
            0 && (
            <optgroup
              label={gameT(
                "timeline.timelineCategories",
              )}
            >
              {timelineCategoryChoices.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )}
            </optgroup>
          )}

          {rankingCategoryChoices.length >
            0 && (
            <optgroup
              label={gameT(
                "timeline.rankingCategories",
              )}
            >
              {rankingCategoryChoices.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )}
            </optgroup>
          )}
        </select>

        <button
          type="button"
          className="secondaryButton"
          disabled={
            categoryChoices.length ===
            0
          }
          onClick={
            rollRandomCategory
          }
        >
          <Shuffle size={16} />

          {gameT(
            "timeline.randomCategory",
          )}
        </button>
      </div>
    </div>
  );

  const renderBoard = (
    interactive: boolean,
  ) => (
    <div className="timelineBoard">
      {interactive && (
        <button
          type="button"
          className="timelineGap"
          disabled={working}
          onClick={() => {
            void runAction(() =>
              placeItem(0),
            );
          }}
        >
          <Plus size={16} />
        </button>
      )}

      {displayBoardItems.map(
        (item, index) => (
          <div
            key={item.id}
            className="timelineTileGroup"
          >
            <div className="timelineTile">
              <strong>
                {item.name}
              </strong>

              <span>
                {item.valueLabel}
              </span>
            </div>

            {interactive && (
              <button
                type="button"
                className="timelineGap"
                disabled={
                  working
                }
                onClick={() => {
                  void runAction(
                    () =>
                      placeItem(
                        index + 1,
                      ),
                  );
                }}
              >
                <Plus
                  size={16}
                />
              </button>
            )}
          </div>
        ),
      )}
    </div>
  );

  if (
    room?.status === "lobby"
  ) {
    return null;
  }

  if (!localPlayer) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <h1>
              {gameT(
                "timeline.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "timeline.joinAgain",
              )}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (
    roomLoading ||
    roundLoading
  ) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <LoaderCircle
              size={30}
            />

            <h1>
              {gameT(
                "timeline.loading",
              )}
            </h1>
          </div>
        </div>
      </>
    );
  }

  if (
    roomError ||
    roundError ||
    !room
  ) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <h1>
              {gameT(
                "timeline.loadError",
              )}
            </h1>

            <p>
              {roomError ??
                roundError}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!round) {
    return (
      <>
        <Header />

        <div className="page gamePage">
        <div className="timelineGame">
          <section className="timelineStart">
            <div className="timelineHeroIcon">
              <History
                size={42}
              />
            </div>

            <span className="eyebrow">
              {gameT(
                "games.timeline.name",
              ).toUpperCase()}
            </span>

            <h1>
              {gameT(
                "timeline.startTitle",
              )}
            </h1>

            <p>
              {gameT(
                "timeline.startDescription",
              )}
            </p>

            {isHost ? (
              <>
                {renderCategoryChooser(
                  "timelineCategory",
                )}

                <button
                  className="primaryButton timelineMainButton"
                  type="button"
                  disabled={
                    working ||
                    !selectedCategoryId
                  }
                  onClick={() => {
                    void runAction(
                      () =>
                        startRound(
                          1,
                        ),
                    );
                  }}
                >
                  {gameT(
                    "lobby.start",
                  )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              </>
            ) : (
              <div className="timelineWaiting">
                {gameT(
                  "bluff.waitingHost",
                )}
              </div>
            )}
          </section>
        </div>
        </div>
      </>
    );
  }

  if (
    round.status === "finished"
  ) {
    return (
      <>
        <Header />

        <div className="page gamePage">
        <div className="timelineGame">
          <section className="timelineStart">
            <div className="timelineHeroIcon">
              <Trophy size={42} />
            </div>

            <span className="eyebrow">
              {gameT(
                "timeline.gameComplete",
              )}
            </span>

            <h1>
              {gameT(
                "timeline.finalScores",
              )}
            </h1>

            <div className="timelineScoreboard">
              {sortedPlayers.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    key={
                      player.id
                    }
                    className="timelineScoreRow"
                  >
                    <span>
                      {index + 1}
                    </span>

                    <strong>
                      {
                        player.name
                      }
                    </strong>

                    <b>
                      {player.score.toLocaleString()}
                    </b>
                  </div>
                ),
              )}
            </div>

            {isHost ? (
              <button
                className="primaryButton timelineMainButton"
                disabled={working}
                onClick={() => {
                  void runAction(
                    async () => {
                      if (
                        tournament.isTournament &&
                        room
                      ) {
                        await advanceTournament(
                          room,
                        );
                      } else {
                        await backToLobby();
                      }
                    },
                  );
                }}
              >
                {tournament.isTournament
                  ? tournament.isLastGame
                    ? gameT(
                        "tournament.viewResults",
                      )
                    : `${gameT(
                        "tournament.nextGame",
                      )}: ${
                        tournament
                          .nextGameEntry
                          ? gameT(
                              tournament
                                .nextGameEntry
                                .nameKey,
                            )
                          : ""
                      }`
                  : gameT(
                      "timeline.backToLobby",
                    )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="timelineWaiting">
                {gameT(
                  "timeline.waitingForHost",
                )}
              </div>
            )}
          </section>
        </div>
        </div>
      </>
    );
  }

  if (round.status === "reveal") {
    const isLastRound =
      round.roundNumber >=
      ROUNDS_PER_GAME;

    return (
      <>
        <Header />

        <div className="page gamePage">
        <div className="timelineGame">
          <header className="timelineHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.timeline.name",
                ).toUpperCase()}
              </span>

              <strong>
                {gameT(
                  "bluff.round",
                )}{" "}
                {
                  round.roundNumber
                }{" "}
                /{" "}
                {ROUNDS_PER_GAME}
              </strong>
            </div>
          </header>

          <section className="timelinePanel">
            <div className="timelineCategoryBadge">
              {currentCategory?.name}
            </div>

            <h1>
              {gameT(
                "timeline.roundComplete",
              )}
            </h1>

            {renderBoard(false)}

            <div className="timelineRoundResult">
              <div className="timelineResultIcon">
                {poolExhausted ? (
                  <Check
                    size={28}
                  />
                ) : (
                  <X size={28} />
                )}
              </div>

              <div>
                <strong>
                  {poolExhausted
                    ? gameT(
                        "timeline.categoryComplete",
                      )
                    : gameT(
                        "timeline.everyoneOut",
                      )}
                </strong>

                <span>
                  {gameT(
                    "timeline.allItemsRevealed",
                  )}
                </span>
              </div>
            </div>

            {isHost ? (
              <>
                {!isLastRound &&
                  renderCategoryChooser(
                    "timelineNextCategory",
                  )}

                <button
                  className="primaryButton timelineMainButton"
                  disabled={
                    working ||
                    (!isLastRound &&
                      !selectedCategoryId)
                  }
                  onClick={() => {
                    void runAction(
                      nextRound,
                    );
                  }}
                >
                  {isLastRound
                    ? gameT(
                        "timeline.finishGame",
                      )
                    : gameT(
                        "timeline.nextRound",
                      )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              </>
            ) : (
              <div className="timelineWaiting">
                {gameT(
                  "timeline.waitingForHost",
                )}
              </div>
            )}
          </section>
        </div>
        </div>
      </>
    );
  }

  const myScore =
    players.find(
      (player) =>
        player.id ===
        localPlayer.id,
    )?.score ?? 0;

  return (
    <>
      <Header />

      <div className="page gamePage">
      <div className="timelineGame">
        <header className="timelineHeader">
          <div>
            <span className="eyebrow">
              {gameT(
                "games.timeline.name",
              ).toUpperCase()}
            </span>

            <strong>
              {gameT(
                "bluff.round",
              )}{" "}
              {
                round.roundNumber
              }{" "}
              /{" "}
              {ROUNDS_PER_GAME}
            </strong>
          </div>

          <div className="timelineHeaderRight">
            <div
              className={`gameTimerBadge ${
                secondsLeft <= 10
                  ? "gameTimerBadgeLow"
                  : ""
              }`}
            >
              {secondsLeft}s
            </div>

            <div className="timelineScore">
              <Crown size={17} />

              {myScore.toLocaleString()}
            </div>
          </div>
        </header>

        <div className="timelineProgress">
          <div
            style={{
              width: `${
                (round.roundNumber /
                  ROUNDS_PER_GAME) *
                100
              }%`,
            }}
          />
        </div>

        {actionError && (
          <div className="timelineError">
            {actionError}
          </div>
        )}

        <section className="timelinePanel">
          <div className="timelineCategoryBadge">
            {currentCategory?.name}

            {currentCategory?.unit && (
              <span>
                {" "}
                (
                {
                  currentCategory.unit
                }
                )
              </span>
            )}
          </div>

          <div className="timelineLives">
            {players.map(
              (player) => {
                const lives =
                  round
                    .playerLives[
                    player.id
                  ] ??
                  STARTING_LIVES;

                const isOut =
                  outPlayerIds.includes(
                    player.id,
                  );

                const isCurrent =
                  player.id ===
                  round.currentPlayerId;

                return (
                  <div
                    key={
                      player.id
                    }
                    className={`timelineLifeRow ${
                      isOut
                        ? "out"
                        : ""
                    } ${
                      isCurrent
                        ? "current"
                        : ""
                    }`}
                  >
                    <span>
                      {
                        player.name
                      }
                    </span>

                    <span className="timelineHearts">
                      {Array.from(
                        {
                          length:
                            STARTING_LIVES,
                        },
                      ).map(
                        (
                          _,
                          index,
                        ) => (
                          <Heart
                            key={
                              index
                            }
                            size={
                              13
                            }
                            className={
                              index <
                              lives
                                ? "filled"
                                : ""
                            }
                            fill={
                              index <
                              lives
                                ? "currentColor"
                                : "none"
                            }
                          />
                        ),
                      )}
                    </span>
                  </div>
                );
              },
            )}
          </div>

          <div
            className={`timelineTurn ${
              isMyTurn
                ? "timelineMyTurn"
                : ""
            }`}
          >
            {isLocalPlayerOut ? (
              gameT(
                "timeline.youAreOut",
              )
            ) : isMyTurn ? (
              gameT(
                "timeline.yourTurn",
              )
            ) : (
              <>
                {gameT(
                  "timeline.waitingFor",
                )}{" "}
                <strong>
                  {currentPlayer?.name ??
                    gameT(
                      "common.player",
                    )}
                </strong>
              </>
            )}
          </div>

          {currentItem && (
            <div className="timelineMysteryItem">
              <span>
                {gameT(
                  "timeline.placeThis",
                )}
              </span>

              <strong>
                {currentItem.name}
              </strong>
            </div>
          )}

          {renderBoard(
            isMyTurn && !working,
          )}
        </section>
      </div>
      </div>
    </>
  );
}

export default TimelineGame;
