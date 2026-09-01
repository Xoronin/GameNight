import {
  ArrowRight,
  Check,
  ListChecks,
  LoaderCircle,
  Users,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  categoryLetters,
  classicCategories,
} from "../../data/categoryPacks";
import { useCategoriesRound } from "../../hooks/useCategoriesRound";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import {
  createCategoriesRound,
  returnCategoriesToLobby,
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
   * The complete game UI uses the
   * room language.
   */
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

  const reveal =
    async () => {
      if (
        !round ||
        !room ||
        !isHost ||
        !allSubmitted
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
    };

  const backToLobby =
    async () => {
      if (
        !room ||
        !isHost
      ) {
        return;
      }

      await returnCategoriesToLobby(
        room.id,
      );
    };

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
    navigate(
      `/lobby/${room.code}`,
      {
        replace: true,
      },
    );

    return null;
  }

  /*
   * WAITING FOR FIRST ROUND
   */
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

  /*
   * ANSWERING
   */
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
                }
              </strong>
            </div>

            <div className="letterBadge">
              {round.letter}
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
                  {classicCategories.map(
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
              allSubmitted && (
                <button
                  className="primaryButton categoriesMainButton hostActionButton"
                  disabled={
                    working
                  }
                  onClick={() => {
                    void runAction(
                      reveal,
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
              )}
          </section>
        </div>
      </div>
    );
  }

  /*
   * REVEAL
   */
  const grouped =
    classicCategories.map(
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
              }
            </strong>
          </div>

          <div className="letterBadge">
            {round.letter}
          </div>
        </header>

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
                    startRound,
                  );
                }}
              >
                {gameT(
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