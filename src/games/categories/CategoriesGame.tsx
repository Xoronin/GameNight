import {
  ArrowRight,
  Check,
  Crown,
  ListChecks,
  LoaderCircle,
  Trophy,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  categoryLetters,
  classicCategories,
} from "../../data/categoryPacks";
import {
  getCategoriesCustom,
  getCategoriesSelectedKeys,
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import {
  computeAnswerPoints,
} from "./categoriesScoring";
import { useCategoriesRound } from "../../hooks/useCategoriesRound";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import {
  castCategoriesVote,
  createCategoriesRound,
  finalizeCategoriesRound,
  finishCategoriesGame,
  returnCategoriesToLobby,
  retractCategoriesVote,
  setCategoriesAnswerPoints,
  setCategoriesRoundStatus,
  submitCategoriesAnswers,
} from "../../services/categoriesService";
import "../../styles/categories.css";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import {
  playReveal,
  playTick,
} from "../../utils/sounds";

type CategoriesGameProps = {
  roomCode: string;
};

function pickLetter() {
  return categoryLetters[
    Math.floor(
      Math.random() *
        categoryLetters.length,
    )
  ];
}

function CategoriesGame({
  roomCode,
}: CategoriesGameProps) {
  const navigate = useNavigate();

  const [localPlayer] =
    useState<Player | null>(
      () => getPlayer(),
    );

  const [values, setValues] =
    useState<Record<string, string>>({});

  const [working, setWorking] =
    useState(false);

  const [
    actionError,
    setActionError,
  ] = useState<string | null>(null);

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(0);

  const triggeredRoundIdRef =
    useRef<string | null>(
      null,
    );

  const lowTimeRoundIdRef =
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

  const {
    round,
    answers,
    votes,
    loading: roundLoading,
    error: roundError,
  } = useCategoriesRound(
    room?.id,
  );

  /*
   * Reset draft answers whenever a new
   * round arrives, for every client (not
   * just the host, who already clears
   * `values` locally when starting the
   * round). Adjusted during render rather
   * than in an effect so it lands before
   * this same render paints stale drafts
   * from the previous round.
   */
  const [
    valuesRoundId,
    setValuesRoundId,
  ] = useState<
    string | undefined
  >(undefined);

  if (round?.id !== valuesRoundId) {
    setValuesRoundId(round?.id);
    setValues({});
  }

  const gameLanguage =
    room?.gameLanguage ?? "en";

  const gameT = (
    key: string,
  ) =>
    translate(
      gameLanguage,
      key,
    );

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

  const myAnswers =
    localPlayer
      ? answers.filter(
          (answer) =>
            answer.playerId ===
            localPlayer.id,
        )
      : [];

  const submitted =
    myAnswers.length > 0;

  const submittedPlayerIds =
    useMemo(
      () =>
        new Set(
          answers.map(
            (answer) =>
              answer.playerId,
          ),
        ),
      [answers],
    );

  const allSubmitted =
    players.length > 0 &&
    submittedPlayerIds.size >=
      players.length;

  const roundCount =
    getGameRoundCount(
      room?.gameSettings,
      "categories",
    );

  const isLastRound =
    !!round &&
    round.roundNumber >=
      roundCount;

  const customCategories =
    useMemo(
      () =>
        getCategoriesCustom(
          room?.gameSettings,
        ),
      [room?.gameSettings],
    );

  const activeCategories =
    useMemo(() => {
      const selectedKeys =
        getCategoriesSelectedKeys(
          room?.gameSettings,
        );

      const allCategories = [
        ...classicCategories,
        ...customCategories,
      ];

      return allCategories.filter(
        (category) =>
          selectedKeys.includes(
            category.key,
          ),
      );
    }, [
      room?.gameSettings,
      customCategories,
    ]);

  const categoryLabel = (
    key: string,
  ) => {
    const custom =
      customCategories.find(
        (category) =>
          category.key === key,
      );

    return custom
      ? custom.label
      : gameT(
          `categories.labels.${key}`,
        );
  };

  const sortedPlayers =
    useMemo(
      () =>
        [...players].sort(
          (a, b) =>
            b.score - a.score,
        ),
      [players],
    );

  const myScore =
    players.find(
      (player) =>
        player.id ===
        localPlayer?.id,
    )?.score ?? 0;

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

  const startRound =
    async () => {
      if (
        !room ||
        !isHost
      ) {
        return;
      }

      const nextRoundNumber =
        round
          ? round.roundNumber + 1
          : 1;

      await createCategoriesRound(
        room.id,
        nextRoundNumber,
        pickLetter(),
        getGameTimerSeconds(
          room.gameSettings,
          "categories",
        ),
      );

      setValues({});
    };

  /*
   * Answer points are computed live from votes for
   * display, but the finalize RPC only sums the
   * `points` column already stored in the database
   * — so the final, vote-adjusted value has to be
   * written back right before finalizing.
   */
  const syncFinalPoints =
    async () => {
      if (!round) {
        return;
      }

      const playerCount =
        players.length;

      const updates = answers
        .map((answer) => {
          const rejectVotes =
            votes.filter(
              (vote) =>
                vote.answerId ===
                answer.id,
            ).length;

          const finalPoints =
            computeAnswerPoints(
              answer,
              answers,
              round.letter,
              gameLanguage,
              rejectVotes,
              playerCount,
            );

          if (
            finalPoints ===
            answer.points
          ) {
            return null;
          }

          return {
            id: answer.id,
            points: finalPoints,
          };
        })
        .filter(
          (
            update,
          ): update is {
            id: string;
            points: number;
          } => update !== null,
        );

      await Promise.all(
        updates.map((update) =>
          setCategoriesAnswerPoints(
            update.id,
            update.points,
          ),
        ),
      );
    };

  const continueToNextRound =
    async () => {
      if (
        !round ||
        !room ||
        !isHost
      ) {
        return;
      }

      await syncFinalPoints();

      if (isLastRound) {
        await finishCategoriesGame(
          round.id,
        );

        return;
      }

      await finalizeCategoriesRound(
        round.id,
      );

      await createCategoriesRound(
        room.id,
        round.roundNumber + 1,
        pickLetter(),
        getGameTimerSeconds(
          room.gameSettings,
          "categories",
        ),
      );

      setValues({});
    };

  const submit =
    async () => {
      if (
        !round ||
        !localPlayer
      ) {
        return;
      }

      await submitCategoriesAnswers(
        round.id,
        localPlayer.id,
        values,
      );
    };

  const reveal = useCallback(
    async (
      force = false,
    ) => {
      if (
        !round ||
        !room ||
        !isHost ||
        (!force &&
          !allSubmitted)
      ) {
        return;
      }

      await setCategoriesRoundStatus(
        round.id,
        "reveal",
      );
    },
    [
      round,
      room,
      isHost,
      allSubmitted,
    ],
  );

  const backToLobby =
    async () => {
      if (
        !room ||
        !round ||
        !isHost
      ) {
        return;
      }

      await syncFinalPoints();

      await finalizeCategoriesRound(
        round.id,
      );

      await returnCategoriesToLobby(
        room.id,
      );
    };

  const toggleVote =
    async (
      answerId: string,
      alreadyVoted: boolean,
    ) => {
      if (
        !round ||
        !localPlayer
      ) {
        return;
      }

      if (alreadyVoted) {
        await retractCategoriesVote(
          answerId,
          localPlayer.id,
        );
      } else {
        await castCategoriesVote(
          round.id,
          answerId,
          localPlayer.id,
        );
      }
    };

  useEffect(() => {
    if (
      !round ||
      round.status !==
        "answering"
    ) {
      return;
    }

    const updateTimer =
      () => {
        const remaining =
          Math.max(
            0,
            Math.ceil(
              (new Date(
                round.endsAt,
              ).getTime() -
                Date.now()) /
                1000,
            ),
          );

        setSecondsLeft(
          remaining,
        );

        if (
          remaining > 0 &&
          remaining <= 5 &&
          lowTimeRoundIdRef.current !==
            round.id
        ) {
          lowTimeRoundIdRef.current =
            round.id;

          playTick();
        }

        if (
          remaining === 0 &&
          isHost &&
          triggeredRoundIdRef.current !==
            round.id
        ) {
          triggeredRoundIdRef.current =
            round.id;

          void reveal(true);
        }
      };

    updateTimer();

    const timer =
      window.setInterval(
        updateTimer,
        500,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [round, isHost, reveal]);

  useEffect(() => {
    if (
      !round ||
      round.status !==
        "reveal"
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
      room?.status ===
      "lobby"
    ) {
      navigate(
        `/lobby/${room.code}`,
        {
          replace: true,
        },
      );
    }
  }, [
    room?.status,
    room?.code,
    navigate,
  ]);

  if (
    roomLoading ||
    roundLoading
  ) {
    return (
      <div className="page">
        <div className="centerCard">
          <LoaderCircle
            size={28}
          />

          <h1>
            {gameT(
              "categories.loading",
            )}
          </h1>
        </div>
      </div>
    );
  }

  if (
    roomError ||
    roundError ||
    !room ||
    !localPlayer
  ) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            {gameT(
              "categories.loadError",
            )}
          </h1>

          <p>
            {roomError ??
              roundError ??
              gameT(
                "categories.playerRoomMissing",
              )}
          </p>
        </div>
      </div>
    );
  }

  if (
    room.status ===
    "lobby"
  ) {
    return null;
  }

  if (!round) {
    return (
      <div className="page gamePage">
        <div className="categoriesGame">
          <section className="categoriesStart">
            <div className="categoriesStartIcon">
              <ListChecks
                size={38}
              />
            </div>

            <span className="eyebrow">
              {gameT(
                "categories.name",
              ).toUpperCase()}
            </span>

            <h1>
              {gameT(
                "categories.startTitle",
              )}
            </h1>

            <p>
              {gameT(
                "categories.startDescription",
              )}
            </p>

            {isHost ? (
              <button
                className="primaryButton categoriesMainButton"
                disabled={
                  working
                }
                onClick={() => {
                  void runAction(
                    startRound,
                  );
                }}
              >
                {gameT(
                  "categories.startRound",
                )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="categoriesWaiting">
                {gameT(
                  "categories.waitingHost",
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (
    round.status ===
    "finished"
  ) {
    return (
      <div className="page gamePage">
        <div className="categoriesGame">
          <section className="categoriesStart">
            <div className="categoriesStartIcon">
              <Trophy
                size={38}
              />
            </div>

            <span className="eyebrow">
              {gameT(
                "categories.gameComplete",
              )}
            </span>

            <h1>
              {gameT(
                "categories.finalScores",
              )}
            </h1>

            <div className="categoriesScoreboard">
              {sortedPlayers.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    key={
                      player.id
                    }
                    className="categoriesScoreRow"
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
                className="primaryButton categoriesMainButton"
                disabled={
                  working
                }
                onClick={() => {
                  void runAction(
                    async () => {
                      if (
                        !room
                      ) {
                        return;
                      }

                      await returnCategoriesToLobby(
                        room.id,
                      );
                    },
                  );
                }}
              >
                {gameT(
                  "categories.backToLobby",
                )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="categoriesWaiting">
                {gameT(
                  "categories.waitingHost",
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (
    round.status ===
    "answering"
  ) {
    return (
      <div className="page gamePage">
        <div className="categoriesGame">
          <header className="categoriesHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "categories.name",
                ).toUpperCase()}
              </span>

              <strong>
                {gameT(
                  "categories.round",
                )}{" "}
                {
                  round.roundNumber
                }{" "}
                /{" "}
                {roundCount}
              </strong>
            </div>

            <div className="categoriesHeaderRight">
              <div
                className={`gameTimerBadge ${
                  secondsLeft <=
                  10
                    ? "gameTimerBadgeLow"
                    : ""
                }`}
              >
                {secondsLeft}s
              </div>

              <div className="categoriesScore">
                <Crown
                  size={17}
                />

                {myScore.toLocaleString()}
              </div>

              <div className="letterBadge">
                {round.letter}
              </div>
            </div>
          </header>

          {actionError && (
            <div className="formError">
              {actionError}
            </div>
          )}

          <section className="categoriesPanel">
            <h1>
              {gameT(
                "categories.letter",
              )}{" "}

              <span>
                {round.letter}
              </span>
            </h1>

            {!submitted ? (
              <>
                <p>
                  {gameT(
                    "categories.everyAnswerMustStart",
                  )}{" "}

                  <strong>
                    {round.letter}
                  </strong>
                  .
                </p>

                <div className="categoryInputs">
                  {activeCategories.map(
                    (
                      category,
                    ) => (
                      <label
                        key={
                          category.key
                        }
                      >
                        <span>
                          {categoryLabel(
                            category.key,
                          )}
                        </span>

                        <input
                          value={
                            values[
                              category.key
                            ] ?? ""
                          }
                          onChange={(
                            event,
                          ) =>
                            setValues(
                              (
                                current,
                              ) => ({
                                ...current,

                                [category.key]:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                          placeholder={`${round.letter}...`}
                          autoComplete="off"
                        />
                      </label>
                    ),
                  )}
                </div>

                <button
                  className="primaryButton categoriesMainButton"
                  disabled={
                    working ||
                    Object.values(
                      values,
                    ).every(
                      (value) =>
                        !value.trim(),
                    )
                  }
                  onClick={() => {
                    void runAction(
                      submit,
                    );
                  }}
                >
                  {gameT(
                    "categories.submitAnswers",
                  )}

                  <Check
                    size={18}
                  />
                </button>
              </>
            ) : (
              <div className="categoriesWaiting">
                <Check
                  size={22}
                />

                <div>
                  <strong>
                    {gameT(
                      "categories.answersSubmitted",
                    )}
                  </strong>

                  <span>
                    {
                      submittedPlayerIds.size
                    }{" "}
                    /{" "}
                    {
                      players.length
                    }{" "}
                    {gameT(
                      "categories.playersReady",
                    )}
                  </span>
                </div>
              </div>
            )}

            {isHost &&
              (allSubmitted ? (
                <button
                  className="primaryButton categoriesMainButton hostActionButton"
                  disabled={
                    working
                  }
                  onClick={() => {
                    void runAction(
                      () =>
                        reveal(true),
                    );
                  }}
                >
                  {gameT(
                    "categories.revealAnswers",
                  )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              ) : (
                <button
                  className="secondaryButton categoriesEndEarlyButton"
                  type="button"
                  disabled={
                    working
                  }
                  onClick={() => {
                    void runAction(
                      () =>
                        reveal(true),
                    );
                  }}
                >
                  {gameT(
                    "categories.endRoundEarly",
                  )}
                </button>
              ))}
          </section>
        </div>
      </div>
    );
  }

  const grouped =
    activeCategories.map(
      (category) => ({
        ...category,

        answers:
          players.map(
            (player) => {
              const answer =
                answers.find(
                  (item) =>
                    item.playerId ===
                      player.id &&
                    item.categoryKey ===
                      category.key,
                );

              if (!answer) {
                return {
                  player,
                  answerId: null,
                  answer: "",
                  valid: false,
                  points: 0,
                  rejectVotes: 0,
                  myVote: false,
                };
              }

              const rejectVotes =
                votes.filter(
                  (vote) =>
                    vote.answerId ===
                    answer.id,
                ).length;

              const points =
                computeAnswerPoints(
                  answer,
                  answers,
                  round.letter,
                  gameLanguage,
                  rejectVotes,
                  players.length,
                );

              const myVote =
                !!localPlayer &&
                votes.some(
                  (vote) =>
                    vote.answerId ===
                      answer.id &&
                    vote.playerId ===
                      localPlayer.id,
                );

              return {
                player,
                answerId: answer.id,
                answer: answer.answer,
                valid: points > 0,
                points,
                rejectVotes,
                myVote,
              };
            },
          ),
      }),
    );

  return (
    <div className="page gamePage">
      <div className="categoriesGame">
        <header className="categoriesHeader">
          <div>
            <span className="eyebrow">
              {gameT(
                "categories.name",
              ).toUpperCase()}
            </span>

            <strong>
              {gameT(
                "categories.round",
              )}{" "}
              {
                round.roundNumber
              }{" "}
              /{" "}
              {roundCount}
            </strong>
          </div>

          <div className="categoriesHeaderRight">
            <div className="categoriesScore">
              <Crown
                size={17}
              />

              {myScore.toLocaleString()}
            </div>

            <div className="letterBadge">
              {round.letter}
            </div>
          </div>
        </header>

        {actionError && (
          <div className="formError">
            {actionError}
          </div>
        )}

        <section className="categoriesPanel">
          <h1>
            {gameT(
              "categories.roundReveal",
            )}
          </h1>

          <div className="categoriesReveal">
            {grouped.map(
              (category) => (
                <div
                  className="categoryRevealBlock"
                  key={
                    category.key
                  }
                >
                  <h2>
                    {categoryLabel(
                      category.key,
                    )}
                  </h2>

                  {category.answers.map(
                    ({
                      player,
                      answerId,
                      answer,
                      valid,
                      points,
                      rejectVotes,
                      myVote,
                    }) => (
                      <div
                        key={
                          player.id
                        }
                        className={`categoryRevealRow ${
                          answer
                            ? valid
                              ? "valid"
                              : "invalid"
                            : ""
                        }`}
                      >
                        <span>
                          {
                            player.name
                          }
                        </span>

                        <div className="categoryRevealAnswer">
                          <strong>
                            {answer ||
                              "—"}
                          </strong>

                          {answer && (
                            <div className="voteControls">
                              {valid ? (
                                <span className="validationValid">
                                  ✓ +{points}
                                </span>
                              ) : (
                                <span className="validationInvalid">
                                  ✕ 0
                                </span>
                              )}

                              {answerId &&
                                player.id !==
                                  localPlayer.id && (
                                  <button
                                    type="button"
                                    className={`voteButton ${
                                      myVote
                                        ? "active"
                                        : ""
                                    }`}
                                    disabled={
                                      working
                                    }
                                    title={gameT(
                                      "categories.voteInvalid",
                                    )}
                                    onClick={() => {
                                      void runAction(
                                        () =>
                                          toggleVote(
                                            answerId,
                                            myVote,
                                          ),
                                      );
                                    }}
                                  >
                                    👎{" "}
                                    {
                                      rejectVotes
                                    }
                                  </button>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ),
            )}
          </div>

          {isHost ? (
            <div className="categoriesActions">
              <button
                className="secondaryButton"
                disabled={
                  working
                }
                onClick={() => {
                  void runAction(
                    backToLobby,
                  );
                }}
              >
                {gameT(
                  "categories.backToLobby",
                )}
              </button>

              <button
                className="primaryButton categoriesMainButton"
                disabled={
                  working
                }
                onClick={() => {
                  void runAction(
                    continueToNextRound,
                  );
                }}
              >
                {isLastRound
                  ? gameT(
                      "categories.finishGame",
                    )
                  : gameT(
                      "categories.nextRound",
                    )}

                <ArrowRight
                  size={18}
                />
              </button>
            </div>
          ) : (
            <div className="categoriesWaiting">
              <Users
                size={22}
              />

              {gameT(
                "categories.waitingHost",
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CategoriesGame;