import {
  ArrowRight,
  Check,
  CircleHelp,
  Crown,
  LoaderCircle,
  LogOut,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { bluffQuestions } from "../../data/bluffQuestions";
import { useBluffRound } from "../../hooks/useBluffRound";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import {
  changeBluffRoundStatus,
  createBluffRound,
  finishBluffGame,
  returnBluffRoomToLobby,
  revealBluffRound,
  submitBluffAnswer,
  submitBluffVote,
} from "../../services/bluffService";
import "../../styles/bluff.css";
import type {
  BluffAnswer,
  BluffVote,
} from "../../types/game";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";

type BluffGameProps = {
  roomCode: string;
};

function hashString(value: string) {
  let hash = 0;

  for (
    let index = 0;
    index < value.length;
    index++
  ) {
    hash =
      (hash * 31 +
        value.charCodeAt(index)) |
      0;
  }

  return hash;
}

function calculateRoundBreakdown(
  playerId: string,
  answers: BluffAnswer[],
  votes: BluffVote[],
) {
  const correctAnswer =
    answers.find(
      (answer) => answer.isCorrect,
    );

  const playerVote =
    votes.find(
      (vote) =>
        vote.playerId === playerId,
    );

  const guessedCorrectly =
    !!correctAnswer &&
    playerVote?.answerId ===
      correctAnswer.id;

  const playerFake =
    answers.find(
      (answer) =>
        answer.playerId === playerId,
    );

  const fooledPlayers =
    playerFake
      ? votes.filter(
          (vote) =>
            vote.answerId ===
              playerFake.id &&
            vote.playerId !==
              playerId,
        ).length
      : 0;

  const correctPoints =
    guessedCorrectly ? 1000 : 0;

  const bluffPoints =
    fooledPlayers * 500;

  return {
    guessedCorrectly,
    fooledPlayers,
    correctPoints,
    bluffPoints,
    total:
      correctPoints +
      bluffPoints,
  };
}

function calculateRoundPoints(
  playerId: string,
  answers: BluffAnswer[],
  votes: BluffVote[],
) {
  return calculateRoundBreakdown(
    playerId,
    answers,
    votes,
  ).total;
}

function BluffGame({
  roomCode,
}: BluffGameProps) {
  const navigate = useNavigate();

  const [localPlayer] =
    useState<Player | null>(
      () => getPlayer(),
    );

  const [fakeAnswer, setFakeAnswer] =
    useState("");

  const [actionError, setActionError] =
    useState<string | null>(null);

  const [working, setWorking] =
    useState(false);

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
  } = useBluffRound(
    room?.id,
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

  const question =
    round
      ? bluffQuestions.find(
          (item) =>
            item.id ===
            round.questionId,
        )
      : null;

  const localizedQuestion =
    question
      ? {
          category:
            question.category[
              gameLanguage
            ],
          question:
            question.question[
              gameLanguage
            ],
          answer:
            question.answer[
              gameLanguage
            ],
        }
      : null;

  const fakeAnswers =
    answers.filter(
      (answer) =>
        !answer.isCorrect,
    );

  const myAnswer =
    localPlayer
      ? fakeAnswers.find(
          (answer) =>
            answer.playerId ===
            localPlayer.id,
        )
      : undefined;

  const myVote =
    localPlayer
      ? votes.find(
          (vote) =>
            vote.playerId ===
            localPlayer.id,
        )
      : undefined;

  const allPlayersAnswered =
    players.length > 0 &&
    fakeAnswers.length >=
      players.length;

  const allPlayersVoted =
    players.length > 0 &&
    votes.length >=
      players.length;

  const votingOptions =
    useMemo(() => {
      if (!round) {
        return [];
      }

      return [...answers].sort(
        (a, b) =>
          hashString(
            `${round.id}:${a.id}`,
          ) -
          hashString(
            `${round.id}:${b.id}`,
          ),
      );
    }, [answers, round]);

  const runAction =
    async (
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

  const startFirstRound =
    async () => {
      if (
        !room ||
        !isHost
      ) {
        return;
      }

      const firstQuestion =
        bluffQuestions[0];

      await createBluffRound(
        room.id,
        1,
        firstQuestion.id,
        firstQuestion.answer[
          gameLanguage
        ],
      );
    };

  const submitAnswer =
    async () => {
      if (
        !round ||
        !localPlayer ||
        !localizedQuestion
      ) {
        return;
      }

      const cleaned =
        fakeAnswer.trim();

      if (!cleaned) {
        return;
      }

      if (
        cleaned.toLocaleLowerCase(
          gameLanguage,
        ) ===
        localizedQuestion.answer.toLocaleLowerCase(
          gameLanguage,
        )
      ) {
        setActionError(
          gameT(
            "bluff.fakeCannotBeReal",
          ),
        );

        return;
      }

      await submitBluffAnswer(
        round.id,
        localPlayer.id,
        cleaned,
      );

      setFakeAnswer("");
    };

  const openVoting =
    async () => {
      if (
        !round ||
        !isHost ||
        !allPlayersAnswered
      ) {
        return;
      }

      await changeBluffRoundStatus(
        round.id,
        "voting",
      );
    };

  const vote =
    async (
      answerId: string,
    ) => {
      if (
        !round ||
        !localPlayer ||
        myVote
      ) {
        return;
      }

      const answer =
        answers.find(
          (item) =>
            item.id ===
            answerId,
        );

      if (
        answer?.playerId ===
        localPlayer.id
      ) {
        setActionError(
          gameT(
            "bluff.cannotVoteOwn",
          ),
        );

        return;
      }

      await submitBluffVote(
        round.id,
        localPlayer.id,
        answerId,
      );
    };

  const reveal =
    async () => {
      if (
        !round ||
        !isHost ||
        !allPlayersVoted
      ) {
        return;
      }

      await revealBluffRound(
        round,
        answers,
        votes,
      );
    };

  const nextRound =
    async () => {
      if (
        !room ||
        !round ||
        !isHost
      ) {
        return;
      }

      const nextRoundNumber =
        round.roundNumber + 1;

      if (
        nextRoundNumber >
        bluffQuestions.length
      ) {
        await finishBluffGame(
          round.id,
        );

        return;
      }

      const nextQuestion =
        bluffQuestions[
          nextRoundNumber - 1
        ];

      await createBluffRound(
        room.id,
        nextRoundNumber,
        nextQuestion.id,
        nextQuestion.answer[
          gameLanguage
        ],
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

      await returnBluffRoomToLobby(
        room.id,
      );
    };

  if (
    room?.status === "lobby"
  ) {
    navigate(
      `/lobby/${room.code}`,
      {
        replace: true,
      },
    );

    return null;
  }

  if (!localPlayer) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            {gameT(
              "lobby.noPlayerTitle",
            )}
          </h1>

          <p>
            {gameT(
              "bluff.joinAgain",
            )}
          </p>
        </div>
      </div>
    );
  }

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
              "bluff.loading",
            )}
          </h1>
        </div>
      </div>
    );
  }

  if (
    roomError ||
    roundError ||
    !room
  ) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            {gameT(
              "bluff.loadError",
            )}
          </h1>

          <p>
            {roomError ??
              roundError ??
              gameT(
                "lobby.roomNotFound",
              )}
          </p>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="page gamePage">
        <button
          className="backButton"
          onClick={() =>
            navigate(
              `/lobby/${room.code}`,
            )
          }
        >
          <LogOut
            size={18}
          />

          {gameT(
            "bluff.backToLobby",
          )}
        </button>

        <div className="bluffGame">
          <section className="bluffFinished">
            <div className="bluffFinishedIcon">
              <Sparkles
                size={38}
              />
            </div>

            <span className="eyebrow">
              BLUFF
            </span>

            <h1>
              {gameT(
                "bluff.readyRound",
              )}
            </h1>

            <p>
              {gameT(
                "bluff.readyDescription",
              )}
            </p>

            {isHost ? (
              <button
                className="primaryButton bluffMainButton"
                disabled={
                  working
                }
                onClick={() => {
                  void runAction(
                    startFirstRound,
                  );
                }}
              >
                {gameT(
                  "bluff.startFirstRound",
                )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="bluffWaiting">
                {gameT(
                  "bluff.waitingStart",
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
    const standings =
      [...players].sort(
        (a, b) =>
          b.score -
          a.score,
      );

    return (
      <div className="page gamePage">
        <div className="bluffGame">
          <section className="bluffFinished">
            <div className="bluffFinishedIcon">
              <Trophy
                size={40}
              />
            </div>

            <span className="eyebrow">
              {gameT(
                "bluff.gameComplete",
              )}
            </span>

            <h1>
              {gameT(
                "bluff.finalScores",
              )}
            </h1>

            <div className="bluffScoreboard">
              {standings.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    className="bluffScoreRow"
                    key={
                      player.id
                    }
                  >
                    <span className="scoreRank">
                      {index + 1}
                    </span>

                    <strong>
                      {
                        player.name
                      }
                    </strong>

                    <span className="scorePoints">
                      {player.score.toLocaleString()}
                    </span>
                  </div>
                ),
              )}
            </div>

            {isHost ? (
              <button
                className="primaryButton bluffMainButton"
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
                  "bluff.backToLobby",
                )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="bluffWaiting">
                {gameT(
                  "bluff.waitingHost",
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (
    !question ||
    !localizedQuestion
  ) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            {gameT(
              "bluff.questionMissing",
            )}
          </h1>
        </div>
      </div>
    );
  }

  const myRoundBreakdown =
    calculateRoundBreakdown(
      localPlayer.id,
      answers,
      votes,
    );

  const myRoundPoints =
    myRoundBreakdown.total;

  return (
    <div className="page gamePage">
      <div className="bluffGame">
        <header className="bluffGameHeader">
          <div>
            <span className="eyebrow">
              BLUFF
            </span>

            <strong>
              {gameT(
                "bluff.round",
              )}{" "}
              {round.roundNumber} /{" "}
              {
                bluffQuestions.length
              }
            </strong>
          </div>

          <div className="bluffScore">
            <Crown
              size={17}
            />

            {(
              players.find(
                (player) =>
                  player.id ===
                  localPlayer.id,
              )?.score ?? 0
            ).toLocaleString()}
          </div>
        </header>

        <div className="bluffProgress">
          <div
            className="bluffProgressFill"
            style={{
              width: `${
                (round.roundNumber /
                  bluffQuestions.length) *
                100
              }%`,
            }}
          />
        </div>

        {actionError && (
          <div className="bluffError">
            {actionError}
          </div>
        )}

        {round.status ===
          "answering" && (
          <section className="bluffPanel">
            <div className="bluffCategory">
              <CircleHelp
                size={16}
              />

              {
                localizedQuestion.category
              }
            </div>

            <h1>
              {
                localizedQuestion.question
              }
            </h1>

            {!myAnswer ? (
              <>
                <p className="bluffInstruction">
                  {gameT(
                    "bluff.fakeInstruction",
                  )}
                </p>

                <textarea
                  className="bluffAnswerInput"
                  value={
                    fakeAnswer
                  }
                  onChange={(
                    event,
                  ) =>
                    setFakeAnswer(
                      event.target
                        .value,
                    )
                  }
                  placeholder={gameT(
                    "bluff.fakePlaceholder",
                  )}
                  maxLength={80}
                  autoFocus
                />

                <div className="bluffInputFooter">
                  <span>
                    {
                      fakeAnswer.length
                    }{" "}
                    / 80
                  </span>

                  <button
                    className="primaryButton bluffMainButton"
                    disabled={
                      !fakeAnswer.trim() ||
                      working
                    }
                    onClick={() => {
                      void runAction(
                        submitAnswer,
                      );
                    }}
                  >
                    {gameT(
                      "bluff.submitAnswer",
                    )}

                    <ArrowRight
                      size={18}
                    />
                  </button>
                </div>
              </>
            ) : (
              <div className="bluffWaiting">
                <Check
                  size={22}
                />

                <div>
                  <strong>
                    {gameT(
                      "bluff.submitted",
                    )}
                  </strong>

                  <span>
                    {
                      fakeAnswers.length
                    }{" "}
                    /{" "}
                    {
                      players.length
                    }{" "}
                    {gameT(
                      "bluff.playersReady",
                    )}
                  </span>
                </div>
              </div>
            )}

            {isHost &&
              allPlayersAnswered && (
                <button
                  className="primaryButton bluffMainButton hostActionButton"
                  disabled={
                    working
                  }
                  onClick={() => {
                    void runAction(
                      openVoting,
                    );
                  }}
                >
                  {gameT(
                    "bluff.openVoting",
                  )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              )}
          </section>
        )}

        {round.status ===
          "voting" && (
          <section className="bluffPanel">
            <div className="bluffCategory">
              <Sparkles
                size={16}
              />

              {gameT(
                "bluff.findTruth",
              )}
            </div>

            <h1>
              {gameT(
                "bluff.whichReal",
              )}
            </h1>

            <p className="bluffInstruction">
              {gameT(
                "bluff.voteInstruction",
              )}
            </p>

            {!myVote ? (
              <div className="bluffOptions">
                {votingOptions.map(
                  (
                    answer,
                    index,
                  ) => {
                    const isOwn =
                      answer.playerId ===
                      localPlayer.id;

                    return (
                      <button
                        key={
                          answer.id
                        }
                        type="button"
                        className="bluffOption"
                        disabled={
                          isOwn ||
                          working
                        }
                        onClick={() => {
                          void runAction(
                            () =>
                              vote(
                                answer.id,
                              ),
                          );
                        }}
                      >
                        <span className="bluffOptionLetter">
                          {String.fromCharCode(
                            65 +
                              index,
                          )}
                        </span>

                        <span className="bluffOptionText">
                          {
                            answer.text
                          }

                          {isOwn && (
                            <small>
                              {gameT(
                                "bluff.ownAnswer",
                              )}
                            </small>
                          )}
                        </span>

                        {isOwn && (
                          <X
                            size={17}
                          />
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="bluffWaiting">
                <Check
                  size={22}
                />

                <div>
                  <strong>
                    {gameT(
                      "bluff.voteLocked",
                    )}
                  </strong>

                  <span>
                    {votes.length} /{" "}
                    {
                      players.length
                    }{" "}
                    {gameT(
                      "bluff.playersVoted",
                    )}
                  </span>
                </div>
              </div>
            )}

            {isHost &&
              allPlayersVoted && (
                <button
                  className="primaryButton bluffMainButton hostActionButton"
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
                    "bluff.revealAnswers",
                  )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              )}
          </section>
        )}

        {round.status ===
          "reveal" && (
          <section className="bluffPanel">
            <div
              className={`bluffResultBanner ${
                myRoundPoints > 0
                  ? "correct"
                  : "wrong"
              }`}
            >
              {myRoundPoints > 0 ? (
                <Check
                  size={24}
                />
              ) : (
                <X
                  size={24}
                />
              )}

              <div>
                <strong>
                  {myRoundPoints > 0
                    ? `+${myRoundPoints} ${gameT(
                        "bluff.points",
                      )}`
                    : gameT(
                        "bluff.noPoints",
                      )}
                </strong>

                <span>
                  {myRoundBreakdown.guessedCorrectly
                    ? `${gameT(
                        "bluff.correctAnswer",
                      )} +${myRoundBreakdown.correctPoints}`
                    : `${gameT(
                        "bluff.wrongAnswer",
                      )} +0`}

                  {" · "}

                  {myRoundBreakdown.fooledPlayers >
                  0
                    ? `${
                        myRoundBreakdown.fooledPlayers
                      } ${
                        myRoundBreakdown.fooledPlayers ===
                        1
                          ? gameT(
                              "bluff.playerFooled",
                            )
                          : gameT(
                              "bluff.playersFooled",
                            )
                      } +${myRoundBreakdown.bluffPoints}`
                    : `${gameT(
                        "bluff.noPlayersFooled",
                      )} +0`}
                </span>
              </div>
            </div>

            <h1>
              {gameT(
                "bluff.roundReveal",
              )}
            </h1>

            <div className="bluffRevealList">
              {votingOptions.map(
                (answer) => {
                  const author =
                    answer.playerId
                      ? players.find(
                          (
                            player,
                          ) =>
                            player.id ===
                            answer.playerId,
                        )
                      : null;

                  const answerVotes =
                    votes.filter(
                      (vote) =>
                        vote.answerId ===
                        answer.id,
                    );

                  return (
                    <div
                      key={
                        answer.id
                      }
                      className={`bluffRevealAnswer ${
                        answer.isCorrect
                          ? "correct"
                          : ""
                      }`}
                    >
                      <div>
                        <strong>
                          {
                            answer.text
                          }
                        </strong>

                        <span>
                          {answer.isCorrect
                            ? gameT(
                                "bluff.realAnswer",
                              )
                            : `${gameT(
                                "bluff.writtenBy",
                              )} ${
                                author?.name ??
                                gameT(
                                  "common.unknown",
                                )
                              }`}
                        </span>

                        {answerVotes.length >
                          0 && (
                          <span className="bluffVoters">
                            <Users
                              size={12}
                            />

                            {answerVotes
                              .map(
                                (vote) =>
                                  players.find(
                                    (
                                      player,
                                    ) =>
                                      player.id ===
                                      vote.playerId,
                                  )
                                    ?.name ??
                                  "?",
                              )
                              .join(
                                ", ",
                              )}
                          </span>
                        )}
                      </div>

                      {answer.isCorrect && (
                        <Check
                          size={20}
                        />
                      )}
                    </div>
                  );
                },
              )}
            </div>

            <div className="bluffRoundScores">
              {players
                .map(
                  (player) => ({
                    ...player,

                    roundPoints:
                      calculateRoundPoints(
                        player.id,
                        answers,
                        votes,
                      ),
                  }),
                )
                .sort(
                  (a, b) =>
                    b.roundPoints -
                    a.roundPoints,
                )
                .map(
                  (player) => (
                    <div
                      key={
                        player.id
                      }
                      className="bluffRoundScoreRow"
                    >
                      <span>
                        {
                          player.name
                        }
                      </span>

                      <strong>
                        +
                        {
                          player.roundPoints
                        }
                      </strong>
                    </div>
                  ),
                )}
            </div>

            {isHost ? (
              <button
                className="primaryButton bluffMainButton"
                disabled={
                  working
                }
                onClick={() => {
                  void runAction(
                    nextRound,
                  );
                }}
              >
                {round.roundNumber >=
                bluffQuestions.length
                  ? gameT(
                      "bluff.finishGame",
                    )
                  : gameT(
                      "bluff.nextRound",
                    )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="bluffWaiting">
                {gameT(
                  "bluff.waitingContinue",
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default BluffGame;