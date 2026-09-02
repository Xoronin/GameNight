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
  getCategoriesRoundCount,
  getCategoriesSelectedKeys,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { useCategoriesRound } from "../../hooks/useCategoriesRound";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import {
  createCategoriesRound,
  finalizeCategoriesRound,
  finishCategoriesGame,
  returnCategoriesToLobby,
  reviewCategoriesAnswer,
  setCategoriesRoundStatus,
  submitCategoriesAnswers,
} from "../../services/categoriesService";
import {
  validateCategoriesRound,
} from "../../services/categoriesRoundValidationService";
import "../../styles/categories.css";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";

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

  const {
    room,
    players,
    loading: roomLoading,
    error: roomError,
  } = useRoom(roomCode);

  const {
    round,
    answers,
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

  const hasPendingReviews =
  answers.some(
    (answer) =>
      answer.validationStatus ===
      "unknown",
  );

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
    getCategoriesRoundCount(
      room?.gameSettings,
    );

  const isLastRound =
    !!round &&
    round.roundNumber >=
      roundCount;

  const activeCategories =
    useMemo(() => {
      const selectedKeys =
        getCategoriesSelectedKeys(
          room?.gameSettings,
        );

      return classicCategories.filter(
        (category) =>
          selectedKeys.includes(
            category.key,
          ),
      );
    }, [room?.gameSettings]);

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

  const continueToNextRound =
    async () => {
      if (
        !round ||
        !room ||
        !isHost ||
        hasPendingReviews
      ) {
        return;
      }

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

      await validateCategoriesRound(
        answers,
        round.letter,
        room.gameLanguage,
      );

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
      answers,
    ],
  );

  const backToLobby =
    async () => {
      if (
        !room ||
        !round ||
        !isHost ||
        hasPendingReviews
      ) {
        return;
      }

      await finalizeCategoriesRound(
        round.id,
      );

      await returnCategoriesToLobby(
        room.id,
      );
    };
    
  const manualReview =
    async (
      answerId: string,
      accepted: boolean,
      answerText: string,
      categoryKey: string,
    ) => {
      const normalized =
        answerText
          .trim()
          .toLocaleLowerCase(
            gameLanguage,
          );

      const duplicateCount =
        answers.filter(
          (item) =>
            item.categoryKey ===
              categoryKey &&
            item.answer
              .trim()
              .toLocaleLowerCase(
                gameLanguage,
              ) === normalized,
        ).length;

      const points =
        duplicateCount > 1
          ? 5
          : 10;

      await reviewCategoriesAnswer(
        answerId,
        accepted,
        points,
      );
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
                          {gameT(
                            `categories.labels.${category.key}`,
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

              return {
                player,

                answerId:
                  answer?.id ??
                  null,

                answer:
                  answer?.answer ??
                  "",

                status:
                  answer?.validationStatus ??
                  null,

                reason:
                  answer?.validationReason ??
                  null,

                points:
                  answer?.points ??
                  0,
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
                    {gameT(
                      `categories.labels.${category.key}`,
                    )}
                  </h2>

                  {category.answers.map(
                    ({
                      player,
                      answerId,
                      answer,
                      status,
                      reason,
                      points,
                    }) => (
                      <div
                        key={
                          player.id
                        }
                        className={`categoryRevealRow ${
                          status ?? ""
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

                          {status ===
                            "valid" && (
                            <span className="validationValid">
                              ✓ +{points}
                            </span>
                          )}

                          {status ===
                            "invalid" && (
                            <span className="validationInvalid">
                              ✕ 0
                            </span>
                          )}

                          {status ===
                            "unknown" && (
                            <div className="validationReview">
                              <span
                                className="validationUnknown"
                                title={
                                  reason ??
                                  ""
                                }
                              >
                                ?{" "}
                                {gameT(
                                  "categories.review",
                                )}
                              </span>

                              {isHost &&
                                answerId && (
                                  <div className="reviewButtons">
                                    <button
                                      type="button"
                                      className="reviewAccept"
                                      disabled={
                                        working
                                      }
                                      onClick={() => {
                                        void runAction(
                                          () =>
                                            manualReview(
                                              answerId,
                                              true,
                                              answer,
                                              category.key,
                                            ),
                                        );
                                      }}
                                    >
                                      ✓{" "}
                                      {gameT(
                                        "categories.accept",
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      className="reviewReject"
                                      disabled={
                                        working
                                      }
                                      onClick={() => {
                                        void runAction(
                                          () =>
                                            manualReview(
                                              answerId,
                                              false,
                                              answer,
                                              category.key,
                                            ),
                                        );
                                      }}
                                    >
                                      ✕{" "}
                                      {gameT(
                                        "categories.reject",
                                      )}
                                    </button>
                                  </div>
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
                  working ||
                  hasPendingReviews
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