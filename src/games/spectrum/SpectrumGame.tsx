import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
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
import type { CSSProperties } from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import {
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { translate } from "../../i18n/i18n";
import {
  listItemVariants,
  softSpring,
} from "../../lib/motion";
import { useRoom } from "../../hooks/useRoom";
import { useSpectrumRound } from "../../hooks/useSpectrumRound";
import {
  STARTING_LIVES,
  createSpectrumRound,
  createSpectrumSession,
  finishSpectrumGame,
  getSpectrumCategories,
  getSpectrumUsedCategoryIds,
  passSpectrumTurn,
  placeSpectrumItem,
  returnSpectrumRoomToLobby,
} from "../../services/spectrumService";
import { advanceTournament } from "../../services/roomService";
import type {
  SpectrumCategory,
  SpectrumItem,
  SpectrumPlacement,
} from "../../types/game";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import "../../styles/spectrum.css";
import {
  playReveal,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";

type SpectrumGameProps = {
  roomCode: string;
};

function SpectrumGame({
  roomCode,
}: SpectrumGameProps) {
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
    SpectrumCategory[]
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
      "spectrum",
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
  } = useSpectrumRound(
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

    void getSpectrumCategories(
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
          await getSpectrumUsedCategoryIds(
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

  const chronologicalCategoryChoices =
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

  const boardEntriesAscending =
    useMemo(() => {
      const itemsById = new Map(
        items.map((item) => [
          item.id,
          item,
        ]),
      );

      return placements
        .map((placement) => {
          const item =
            itemsById.get(
              placement.itemId,
            );

          return item
            ? {
                item,
                placement,
              }
            : null;
        })
        .filter(
          (
            entry,
          ): entry is {
            item: SpectrumItem;
            placement: SpectrumPlacement;
          } => !!entry,
        )
        .sort(
          (a, b) =>
            a.item.value -
            b.item.value,
        );
    }, [placements, items]);

  /*
   * Always top = highest value, bottom =
   * lowest — regardless of category type.
   */
  const displayBoardEntries = [
    ...boardEntriesAscending,
  ].reverse();

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
        await createSpectrumSession(
          room.id,
        );
    }

    await createSpectrumRound(
      activeSession.id,
      room.id,
      roundNumber,
      players,
      selectedCategoryId,
      getGameTimerSeconds(
        room.gameSettings,
        "spectrum",
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
      boardEntriesAscending.length -
      displayGapIndex;

    await placeSpectrumItem(
      round,
      gapIndex,
      boardEntriesAscending.map(
        (entry) => entry.item,
      ),
      currentItem,
      localPlayer.id,
      players,
      items,
      getGameTimerSeconds(
        room?.gameSettings,
        "spectrum",
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
      await finishSpectrumGame(
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

    await returnSpectrumRoomToLobby(
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

        void passSpectrumTurn(
          round,
          items,
          players,
          getGameTimerSeconds(
            room?.gameSettings,
            "spectrum",
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
        "spectrum"
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
    <div className="spectrumCategoryField">
      <label htmlFor={selectId}>
        {gameT(
          "spectrum.categoryLabel",
        )}
      </label>

      <div className="spectrumCategoryRow">
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
              "spectrum.chooseCategory",
            )}
          </option>

          {chronologicalCategoryChoices.length >
            0 && (
            <optgroup
              label={gameT(
                "spectrum.chronologicalCategories",
              )}
            >
              {chronologicalCategoryChoices.map(
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
                "spectrum.rankingCategories",
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
            "spectrum.randomCategory",
          )}
        </button>
      </div>
    </div>
  );

  const playerNameById = (
    playerId: string | null,
  ) =>
    playerId
      ? players.find(
          (player) =>
            player.id ===
            playerId,
        )?.name ?? null
      : null;

  const renderBoard = (
    interactive: boolean,
  ) => (
    <div className="spectrumBoard">
      <div className="spectrumScaleLabel spectrumScaleHigh">
        <ArrowUp size={13} />

        {gameT(
          "spectrum.highLabel",
        )}
      </div>

      <div className="spectrumBoardTrack">
        {interactive && (
          <button
            type="button"
            className="spectrumGap"
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

        {displayBoardEntries.map(
          (entry, index) => (
            <motion.div
              key={
                entry.item.id
              }
              className="spectrumTileGroup"
              layout
              variants={
                listItemVariants
              }
              initial="initial"
              animate="animate"
              exit="exit"
              transition={softSpring}
            >
              <div
                className={`spectrumTile ${entry.placement.outcome}`}
              >
                <div className="spectrumTileTop">
                  <strong>
                    {
                      entry.item
                        .name
                    }
                  </strong>

                  <span className="spectrumTileValue">
                    {
                      entry.item
                        .valueLabel
                    }
                  </span>
                </div>

                {entry.placement
                  .outcome ===
                  "correct" && (
                  <span className="spectrumTilePlacer">
                    {playerNameById(
                      entry
                        .placement
                        .placedBy,
                    ) ??
                      gameT(
                        "common.player",
                      )}
                  </span>
                )}

                {entry.placement
                  .outcome ===
                  "failed" && (
                  <span className="spectrumTilePlacer spectrumTileNoOne">
                    {gameT(
                      "spectrum.nobodyGotIt",
                    )}
                  </span>
                )}
              </div>

              {interactive && (
                <button
                  type="button"
                  className="spectrumGap"
                  disabled={
                    working
                  }
                  onClick={() => {
                    void runAction(
                      () =>
                        placeItem(
                          index +
                            1,
                        ),
                    );
                  }}
                >
                  <Plus
                    size={16}
                  />
                </button>
              )}
            </motion.div>
          ),
        )}
      </div>

      <div className="spectrumScaleLabel spectrumScaleLow">
        <ArrowDown size={13} />

        {gameT(
          "spectrum.lowLabel",
        )}
      </div>
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
                "spectrum.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "spectrum.joinAgain",
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
                "spectrum.loading",
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
                "spectrum.loadError",
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
        <div className="spectrumGame">
          <section className="spectrumStart">
            <div className="spectrumHeroIcon">
              <History
                size={42}
              />
            </div>

            <span className="eyebrow">
              {gameT(
                "games.spectrum.name",
              ).toUpperCase()}
            </span>

            <h1>
              {gameT(
                "spectrum.startTitle",
              )}
            </h1>

            <p>
              {gameT(
                "spectrum.startDescription",
              )}
            </p>

            {isHost ? (
              <>
                {renderCategoryChooser(
                  "spectrumCategory",
                )}

                <button
                  className="primaryButton spectrumMainButton"
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
              <div className="spectrumWaiting">
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
        <div className="spectrumGame">
          <section className="spectrumStart">
            <div className="spectrumHeroIcon">
              <Trophy size={42} />
            </div>

            <span className="eyebrow">
              {gameT(
                "spectrum.gameComplete",
              )}
            </span>

            <h1>
              {gameT(
                "spectrum.finalScores",
              )}
            </h1>

            <div className="spectrumScoreboard">
              {sortedPlayers.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    key={
                      player.id
                    }
                    className="spectrumScoreRow"
                    style={
                      {
                        "--rowIndex":
                          index,
                      } as CSSProperties
                    }
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
                className="primaryButton spectrumMainButton"
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
                      "spectrum.backToLobby",
                    )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="spectrumWaiting">
                {gameT(
                  "spectrum.waitingForHost",
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
        <div className="spectrumGame">
          <header className="spectrumHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.spectrum.name",
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

          <section className="spectrumPanel">
            <div className="spectrumCategoryBadge">
              {currentCategory?.name}
            </div>

            <h1>
              {gameT(
                "spectrum.roundComplete",
              )}
            </h1>

            {renderBoard(false)}

            <div className="spectrumRoundResult">
              <div className="spectrumResultIcon">
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
                        "spectrum.categoryComplete",
                      )
                    : gameT(
                        "spectrum.everyoneOut",
                      )}
                </strong>

                <span>
                  {gameT(
                    "spectrum.allItemsRevealed",
                  )}
                </span>
              </div>
            </div>

            <div className="spectrumScoreboard">
              {sortedPlayers.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    key={
                      player.id
                    }
                    className="spectrumScoreRow"
                    style={
                      {
                        "--rowIndex":
                          index,
                      } as CSSProperties
                    }
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
              <>
                {!isLastRound &&
                  renderCategoryChooser(
                    "spectrumNextCategory",
                  )}

                <button
                  className="primaryButton spectrumMainButton"
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
                        "spectrum.finishGame",
                      )
                    : gameT(
                        "spectrum.nextRound",
                      )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              </>
            ) : (
              <div className="spectrumWaiting">
                {gameT(
                  "spectrum.waitingForHost",
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
      <div className="spectrumGame">
        <header className="spectrumHeader">
          <div>
            <span className="eyebrow">
              {gameT(
                "games.spectrum.name",
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

          <div className="spectrumHeaderRight">
            <div
              className={`gameTimerBadge ${
                secondsLeft <= 10
                  ? "gameTimerBadgeLow"
                  : ""
              }`}
            >
              {secondsLeft}s
            </div>

            <div className="spectrumScore">
              <Crown size={17} />

              {myScore.toLocaleString()}
            </div>
          </div>
        </header>

        <div className="spectrumProgress">
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
          <div className="spectrumError">
            {actionError}
          </div>
        )}

        <section className="spectrumPanel">
          <div className="spectrumCategoryBadge">
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

          <div className="spectrumLives">
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
                    className={`spectrumLifeRow ${
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

                    <span className="spectrumHearts">
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
            className={`spectrumTurn ${
              isMyTurn
                ? "spectrumMyTurn"
                : ""
            }`}
          >
            {isLocalPlayerOut ? (
              gameT(
                "spectrum.youAreOut",
              )
            ) : isMyTurn ? (
              gameT(
                "spectrum.yourTurn",
              )
            ) : (
              <>
                {gameT(
                  "spectrum.waitingFor",
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
            <div className="spectrumMysteryItem">
              <span>
                {gameT(
                  "spectrum.placeThis",
                )}
              </span>

              <strong>
                {currentItem.name}
              </strong>

              {round.attemptedPlayerIds
                .length > 0 && (
                <div className="spectrumAttempted">
                  {gameT(
                    "spectrum.alreadyTried",
                  )}
                  :{" "}
                  {round.attemptedPlayerIds
                    .map(
                      (id) =>
                        playerNameById(
                          id,
                        ),
                    )
                    .filter(
                      Boolean,
                    )
                    .join(
                      ", ",
                    )}
                </div>
              )}
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

export default SpectrumGame;
