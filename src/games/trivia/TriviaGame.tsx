import {
  ArrowRight,
  Brain,
  Check,
  Crown,
  LoaderCircle,
  ShieldQuestion,
  Trophy,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { getGameTimerSeconds } from "../../data/gameTimers";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import { useTriviaRound } from "../../hooks/useTriviaRound";
import {
  type TriviaDifficulty,
  createTriviaRound,
  createTriviaSession,
  finishTriviaGame,
  getTriviaUsedQuestionIds,
  returnTriviaRoomToLobby,
  revealTriviaRound,
  submitTriviaAnswer,
} from "../../services/triviaService";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import "../../styles/trivia.css";

const ROUNDS_PER_GAME = 8;

const OPTION_LETTERS = [
  "A",
  "B",
  "C",
  "D",
];

type TriviaGameProps = {
  roomCode: string;
};

function TriviaGame({
  roomCode,
}: TriviaGameProps) {
  const navigate = useNavigate();

  const [localPlayer] =
    useState<Player | null>(() =>
      getPlayer(),
    );

  const [working, setWorking] =
    useState(false);

  const [actionError, setActionError] =
    useState<string | null>(null);

  const [difficulty, setDifficulty] =
    useState<TriviaDifficulty>(
      "mixed",
    );

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

  const gameLanguage =
    room?.gameLanguage ?? "en";

  const gameT = (key: string) =>
    translate(gameLanguage, key);

  const {
    session,
    round,
    question,
    answers,
    loading: roundLoading,
    error: roundError,
  } = useTriviaRound(
    room?.id,
    gameLanguage,
  );

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

  const myAnswer = useMemo(
    () =>
      localPlayer
        ? answers.find(
            (answer) =>
              answer.playerId ===
              localPlayer.id,
          ) ?? null
        : null,
    [answers, localPlayer],
  );

  const allPlayersAnswered =
    players.length > 0 &&
    answers.length >= players.length;

  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => b.score - a.score,
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
          : gameT("common.genericError"),
      );
    } finally {
      setWorking(false);
    }
  };

  const startRound = async (
    roundNumber: number,
  ) => {
    if (!room || !isHost) {
      return;
    }

    let activeSession = session;

    if (!activeSession) {
      activeSession =
        await createTriviaSession(
          room.id,
          difficulty,
        );
    }

    const usedIds =
      await getTriviaUsedQuestionIds(
        activeSession.id,
      );

    const result =
      await createTriviaRound(
        activeSession.id,
        room.id,
        roundNumber,
        usedIds,
        room.gameLanguage,
        activeSession.difficulty,
        getGameTimerSeconds(
          room.gameSettings,
          "trivia",
        ),
      );

    if (!result) {
      throw new Error(
        gameT(
          "trivia.questionsExhausted",
        ),
      );
    }
  };

  const submitAnswer = async (
    index: number,
  ) => {
    if (
      !round ||
      !localPlayer ||
      !question ||
      myAnswer
    ) {
      return;
    }

    await submitTriviaAnswer(
      round,
      localPlayer.id,
      index,
      question.correctIndex,
    );
  };

  const reveal = useCallback(
    async (
      force = false,
    ) => {
      if (
        !round ||
        !isHost ||
        (!force &&
          !allPlayersAnswered)
      ) {
        return;
      }

      await revealTriviaRound(
        round.id,
      );
    },
    [
      round,
      isHost,
      allPlayersAnswered,
    ],
  );

  const nextRound = async () => {
    if (!round || !isHost) {
      return;
    }

    if (
      round.roundNumber >=
      ROUNDS_PER_GAME
    ) {
      if (!session) {
        return;
      }

      await finishTriviaGame(
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

    await returnTriviaRoomToLobby(
      room.id,
    );
  };

  useEffect(() => {
    if (
      !round ||
      round.status !== "answering"
    ) {
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(
            round.endsAt,
          ).getTime() -
            Date.now()) /
            1000,
        ),
      );

      setSecondsLeft(remaining);

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

    const timer = window.setInterval(
      updateTimer,
      500,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [round, isHost, reveal]);

  if (room?.status === "lobby") {
    navigate(`/lobby/${room.code}`, {
      replace: true,
    });

    return null;
  }

  if (!localPlayer) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            {gameT(
              "trivia.noPlayerTitle",
            )}
          </h1>

          <p>
            {gameT(
              "trivia.joinAgain",
            )}
          </p>
        </div>
      </div>
    );
  }

  if (roomLoading || roundLoading) {
    return (
      <div className="page">
        <div className="centerCard">
          <LoaderCircle size={30} />

          <h1>
            {gameT("trivia.loading")}
          </h1>
        </div>
      </div>
    );
  }

  if (roomError || roundError || !room) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            {gameT(
              "trivia.loadError",
            )}
          </h1>

          <p>
            {roomError ?? roundError}
          </p>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="page gamePage">
        <div className="triviaGame">
          <section className="triviaStart">
            <div className="triviaHeroIcon">
              <Brain size={42} />
            </div>

            <span className="eyebrow">
              {gameT(
                "games.trivia.name",
              ).toUpperCase()}
            </span>

            <h1>
              {gameT(
                "trivia.startTitle",
              )}
            </h1>

            <p>
              {gameT(
                "trivia.startDescription",
              )}
            </p>

            {isHost ? (
              <>
                <div className="triviaDifficulty">
                  <label htmlFor="triviaDifficulty">
                    {gameT(
                      "trivia.difficulty",
                    )}
                  </label>

                  <select
                    id="triviaDifficulty"
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(
                        event.target
                          .value as TriviaDifficulty,
                      )
                    }
                  >
                    <option value="mixed">
                      {gameT(
                        "trivia.difficultyMixed",
                      )}
                    </option>

                    <option value="easy">
                      {gameT(
                        "trivia.difficultyEasy",
                      )}
                    </option>

                    <option value="medium">
                      {gameT(
                        "trivia.difficultyMedium",
                      )}
                    </option>

                    <option value="hard">
                      {gameT(
                        "trivia.difficultyHard",
                      )}
                    </option>
                  </select>
                </div>

                {actionError && (
                  <div className="triviaError">
                    {actionError}
                  </div>
                )}

                <button
                  className="primaryButton triviaMainButton"
                  type="button"
                  disabled={working}
                  onClick={() => {
                    void runAction(() =>
                      startRound(1),
                    );
                  }}
                >
                  {gameT("lobby.start")}

                  <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <div className="triviaWaiting">
                {gameT("bluff.waitingHost")}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (round.status === "finished") {
    return (
      <div className="page gamePage">
        <div className="triviaGame">
          <section className="triviaStart">
            <div className="triviaHeroIcon">
              <Trophy size={42} />
            </div>

            <span className="eyebrow">
              {gameT(
                "trivia.gameComplete",
              )}
            </span>

            <h1>
              {gameT(
                "trivia.finalScores",
              )}
            </h1>

            <div className="triviaScoreboard">
              {sortedPlayers.map(
                (player, index) => (
                  <div
                    key={player.id}
                    className="triviaScoreRow"
                  >
                    <span>{index + 1}</span>

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

            {isHost ? (
              <button
                className="primaryButton triviaMainButton"
                disabled={working}
                onClick={() => {
                  void runAction(
                    backToLobby,
                  );
                }}
              >
                {gameT(
                  "trivia.backToLobby",
                )}

                <ArrowRight size={18} />
              </button>
            ) : (
              <div className="triviaWaiting">
                {gameT(
                  "trivia.waitingForHost",
                )}
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
          <LoaderCircle size={30} />

          <h1>
            {gameT(
              "trivia.questionMissing",
            )}
          </h1>
        </div>
      </div>
    );
  }

  const revealed =
    round.status === "reveal";

  return (
    <div className="page gamePage">
      <div className="triviaGame">
        <header className="triviaHeader">
          <div>
            <span className="eyebrow">
              {gameT(
                "games.trivia.name",
              ).toUpperCase()}
            </span>

            <strong>
              {gameT("bluff.round")}{" "}
              {round.roundNumber} /{" "}
              {ROUNDS_PER_GAME}
            </strong>
          </div>

          <div className="triviaHeaderRight">
            {!revealed && (
              <div
                className={`gameTimerBadge ${
                  secondsLeft <= 10
                    ? "gameTimerBadgeLow"
                    : ""
                }`}
              >
                {secondsLeft}s
              </div>
            )}

            <div className="triviaScore">
              <Crown size={17} />

              {(
                players.find(
                  (player) =>
                    player.id ===
                    localPlayer.id,
                )?.score ?? 0
              ).toLocaleString()}
            </div>
          </div>
        </header>

        <div className="triviaProgress">
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
          <div className="triviaError">
            {actionError}
          </div>
        )}

        <section className="triviaPanel">
          <div className="triviaCategory">
            <ShieldQuestion size={16} />

            {question.category}
          </div>

          <h1>{question.question}</h1>

          <div className="triviaOptions">
            {question.options.map(
              (option, index) => {
                const isMine =
                  myAnswer?.selectedIndex ===
                  index;

                const isCorrectOption =
                  index ===
                  question.correctIndex;

                const showState =
                  revealed ||
                  (myAnswer &&
                    isMine);

                return (
                  <button
                    key={index}
                    type="button"
                    className={[
                      "triviaOption",
                      revealed &&
                      isCorrectOption
                        ? "correct"
                        : "",
                      revealed &&
                      isMine &&
                      !isCorrectOption
                        ? "incorrect"
                        : "",
                      !revealed &&
                      isMine
                        ? "selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={
                      !!myAnswer ||
                      revealed ||
                      working
                    }
                    onClick={() => {
                      void runAction(() =>
                        submitAnswer(
                          index,
                        ),
                      );
                    }}
                  >
                    <span className="triviaOptionLetter">
                      {
                        OPTION_LETTERS[
                          index
                        ]
                      }
                    </span>

                    <span className="triviaOptionText">
                      {option}
                    </span>

                    {showState &&
                      revealed &&
                      isCorrectOption && (
                        <Check
                          size={18}
                        />
                      )}

                    {showState &&
                      revealed &&
                      isMine &&
                      !isCorrectOption && (
                        <X size={18} />
                      )}
                  </button>
                );
              },
            )}
          </div>

          {!revealed && (
            <>
              {myAnswer && (
                <div className="triviaLocked">
                  <Check size={16} />

                  {gameT(
                    "trivia.answerLocked",
                  )}
                </div>
              )}

              <div className="triviaFound">
                {answers.length} /{" "}
                {players.length}{" "}
                {gameT(
                  "trivia.playersAnswered",
                )}
              </div>

              {isHost && (
                <button
                  className="primaryButton triviaMainButton"
                  disabled={
                    working ||
                    !allPlayersAnswered
                  }
                  onClick={() => {
                    void runAction(() =>
                      reveal(),
                    );
                  }}
                >
                  {gameT("trivia.reveal")}

                  <ArrowRight size={18} />
                </button>
              )}

              {!isHost &&
                allPlayersAnswered && (
                  <div className="triviaWaiting">
                    {gameT(
                      "trivia.waitingForHost",
                    )}
                  </div>
                )}
            </>
          )}

          {revealed && (
            <>
              {myAnswer ? (
                <div
                  className={`triviaResultBanner ${
                    myAnswer.isCorrect
                      ? "correct"
                      : "incorrect"
                  }`}
                >
                  {myAnswer.isCorrect ? (
                    <>
                      <Check size={20} />
                      {gameT(
                        "trivia.correct",
                      )}
                      <strong>
                        +
                        {myAnswer.points}
                      </strong>
                    </>
                  ) : (
                    <>
                      <X size={20} />
                      {gameT(
                        "trivia.incorrect",
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="triviaResultBanner incorrect">
                  <X size={20} />
                  {gameT(
                    "trivia.incorrect",
                  )}
                </div>
              )}

              <div className="triviaResults">
                {sortedPlayers.map(
                  (player) => {
                    const answer =
                      answers.find(
                        (item) =>
                          item.playerId ===
                          player.id,
                      );

                    return (
                      <div
                        key={player.id}
                        className={`triviaResultRow ${
                          answer?.isCorrect
                            ? "correct"
                            : ""
                        }`}
                      >
                        <span>
                          {player.name}
                        </span>

                        {answer ? (
                          <span className="triviaResultPoints">
                            {answer.isCorrect ? (
                              <Check
                                size={16}
                              />
                            ) : (
                              <X
                                size={16}
                              />
                            )}

                            {answer.isCorrect
                              ? `+${answer.points}`
                              : ""}
                          </span>
                        ) : (
                          <span className="triviaResultPoints">
                            –
                          </span>
                        )}
                      </div>
                    );
                  },
                )}
              </div>

              {isHost ? (
                <button
                  className="primaryButton triviaMainButton"
                  disabled={working}
                  onClick={() => {
                    void runAction(
                      nextRound,
                    );
                  }}
                >
                  {round.roundNumber >=
                  ROUNDS_PER_GAME
                    ? gameT(
                        "trivia.finishGame",
                      )
                    : gameT(
                        "trivia.nextRound",
                      )}

                  <ArrowRight size={18} />
                </button>
              ) : (
                <div className="triviaWaiting">
                  {gameT(
                    "trivia.waitingForHost",
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default TriviaGame;
