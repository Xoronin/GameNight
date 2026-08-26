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
  const correctAnswer = answers.find(
    (answer) => answer.isCorrect,
  );

  const playerVote = votes.find(
    (vote) => vote.playerId === playerId,
  );

  const guessedCorrectly =
    !!correctAnswer &&
    playerVote?.answerId === correctAnswer.id;

  const playerFake = answers.find(
    (answer) => answer.playerId === playerId,
  );

  const fooledPlayers = playerFake
    ? votes.filter(
        (vote) =>
          vote.answerId === playerFake.id &&
          vote.playerId !== playerId,
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
    total: correctPoints + bluffPoints,
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
  } = useBluffRound(room?.id);

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
    votes.length >= players.length;

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
          : "Something went wrong.",
      );
    } finally {
      setWorking(false);
    }
  };

  const startFirstRound = async () => {
    if (!room || !isHost) {
      return;
    }

    const firstQuestion =
      bluffQuestions[0];

    await createBluffRound(
      room.id,
      1,
      firstQuestion.id,
      firstQuestion.answer,
    );
  };

  const submitAnswer = async () => {
    if (
      !round ||
      !localPlayer ||
      !question
    ) {
      return;
    }

    const cleaned =
      fakeAnswer.trim();

    if (!cleaned) {
      return;
    }

    if (
      cleaned.toLowerCase() ===
      question.answer.toLowerCase()
    ) {
      setActionError(
        "Your fake answer cannot be the real answer.",
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

  const openVoting = async () => {
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

  const vote = async (
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
          item.id === answerId,
      );

    if (
      answer?.playerId ===
      localPlayer.id
    ) {
      setActionError(
        "You cannot vote for your own fake answer.",
      );

      return;
    }

    await submitBluffVote(
      round.id,
      localPlayer.id,
      answerId,
    );
  };

  const reveal = async () => {
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

  const nextRound = async () => {
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
      nextQuestion.answer,
    );
  };

  const backToLobby =
    async () => {
      if (!room || !isHost) {
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
          <h1>No player found</h1>

          <p>
            Please join the room again.
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

          <h1>Loading Bluff...</h1>
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
            Could not load Bluff
          </h1>

          <p>
            {roomError ??
              roundError ??
              "Room not found."}
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
          <LogOut size={18} />
          Lobby
        </button>

        <div className="bluffGame">
          <section className="bluffFinished">
            <div className="bluffFinishedIcon">
              <Sparkles size={38} />
            </div>

            <span className="eyebrow">
              BLUFF
            </span>

            <h1>
              Ready for round 1?
            </h1>

            <p>
              Everyone will receive the
              same question and invent a
              believable fake answer.
            </p>

            {isHost ? (
              <button
                className="primaryButton bluffMainButton"
                disabled={working}
                onClick={() => {
                  void runAction(
                    startFirstRound,
                  );
                }}
              >
                Start First Round
                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="bluffWaiting">
                Waiting for the host to
                start the first round...
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (
    round.status === "finished"
  ) {
    const standings = [
      ...players,
    ].sort(
      (a, b) =>
        b.score - a.score,
    );

    return (
      <div className="page gamePage">
        <div className="bluffGame">
          <section className="bluffFinished">
            <div className="bluffFinishedIcon">
              <Trophy size={40} />
            </div>

            <span className="eyebrow">
              GAME COMPLETE
            </span>

            <h1>
              Final scores
            </h1>

            <div className="bluffScoreboard">
              {standings.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    className="bluffScoreRow"
                    key={player.id}
                  >
                    <span className="scoreRank">
                      {index + 1}
                    </span>

                    <strong>
                      {player.name}
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
                disabled={working}
                onClick={() => {
                  void runAction(
                    backToLobby,
                  );
                }}
              >
                Back to Lobby
                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="bluffWaiting">
                Waiting for the host...
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            Question missing
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
              Round{" "}
              {round.roundNumber} /{" "}
              {
                bluffQuestions.length
              }
            </strong>
          </div>

          <div className="bluffScore">
            <Crown size={17} />

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

              {question.category}
            </div>

            <h1>
              {question.question}
            </h1>

            {!myAnswer ? (
              <>
                <p className="bluffInstruction">
                  Write a believable
                  fake answer. Try to
                  fool the other
                  players.
                </p>

                <textarea
                  className="bluffAnswerInput"
                  value={fakeAnswer}
                  onChange={(
                    event,
                  ) =>
                    setFakeAnswer(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Enter your fake answer..."
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
                    Submit Answer
                    <ArrowRight
                      size={18}
                    />
                  </button>
                </div>
              </>
            ) : (
              <div className="bluffWaiting">
                <Check size={22} />

                <div>
                  <strong>
                    Answer submitted
                  </strong>

                  <span>
                    {
                      fakeAnswers.length
                    }{" "}
                    /{" "}
                    {players.length}{" "}
                    players ready
                  </span>
                </div>
              </div>
            )}

            {isHost &&
              allPlayersAnswered && (
                <button
                  className="primaryButton bluffMainButton hostActionButton"
                  disabled={working}
                  onClick={() => {
                    void runAction(
                      openVoting,
                    );
                  }}
                >
                  Open Voting
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
              Find the truth
            </div>

            <h1>
              Which answer is real?
            </h1>

            <p className="bluffInstruction">
              Choose carefully. You
              cannot vote for your own
              fake answer.
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
                              Your
                              answer
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
                <Check size={22} />

                <div>
                  <strong>
                    Vote locked in
                  </strong>

                  <span>
                    {votes.length} /{" "}
                    {players.length}{" "}
                    players voted
                  </span>
                </div>
              </div>
            )}

            {isHost &&
              allPlayersVoted && (
                <button
                  className="primaryButton bluffMainButton hostActionButton"
                  disabled={working}
                  onClick={() => {
                    void runAction(
                      reveal,
                    );
                  }}
                >
                  Reveal Answers
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
              {myRoundPoints >
              0 ? (
                <Check size={24} />
              ) : (
                <X size={24} />
              )}

                <div>
                <strong>
                    {myRoundPoints > 0
                    ? `+${myRoundPoints} points`
                    : "No points this round"}
                </strong>

                <span>
                    {myRoundBreakdown.guessedCorrectly
                    ? `Correct answer +${myRoundBreakdown.correctPoints}`
                    : "Wrong answer +0"}

                    {" · "}

                    {myRoundBreakdown.fooledPlayers > 0
                    ? `${myRoundBreakdown.fooledPlayers} ${
                        myRoundBreakdown.fooledPlayers === 1
                            ? "player"
                            : "players"
                        } fooled +${myRoundBreakdown.bluffPoints}`
                    : "No players fooled +0"}
                </span>
                </div>
            </div>

            <h1>
              Round reveal
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
                            ? "Real answer"
                            : `Written by ${
                                author?.name ??
                                "Unknown"
                              }`}
                        </span>

                        {answerVotes.length >
                          0 && (
                          <span className="bluffVoters">
                            <Users
                              size={
                                12
                              }
                            />

                            {answerVotes
                              .map(
                                (
                                  vote,
                                ) =>
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
                disabled={working}
                onClick={() => {
                  void runAction(
                    nextRound,
                  );
                }}
              >
                {round.roundNumber >=
                bluffQuestions.length
                  ? "Finish Game"
                  : "Next Round"}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="bluffWaiting">
                Waiting for the host
                to continue...
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default BluffGame;