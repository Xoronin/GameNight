import {
  ArrowRight,
  Check,
  Crown,
  Heart,
  LoaderCircle,
  Trophy,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
} from "motion/react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import LowTimeBanner from "../../components/LowTimeBanner";
import TurnFlash from "../../components/TurnFlash";
import {
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { translate } from "../../i18n/i18n";
import { phaseVariants } from "../../lib/motion";
import { useAutoReveal } from "../../hooks/useAutoReveal";
import { useFriendsRound } from "../../hooks/useFriendsRound";
import { useRoom } from "../../hooks/useRoom";
import {
  askAbout,
  createFriendsRound,
  createFriendsSession,
  finishFriendsGame,
  getFriendsUsedQuestionIds,
  returnFriendsRoomToLobby,
  revealFriendsRound,
  submitFriendsAnswer,
} from "../../services/friendsService";
import { advanceTournament } from "../../services/roomService";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import {
  playCorrect,
  playIncorrect,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";
import "../../styles/friends.css";

const OPTION_LETTERS = [
  "A",
  "B",
  "C",
  "D",
];

type KnowYourFriendsGameProps = {
  roomCode: string;
};

function KnowYourFriendsGame({
  roomCode,
}: KnowYourFriendsGameProps) {
  const navigate = useNavigate();

  const [localPlayer] =
    useState<Player | null>(() =>
      getPlayer(),
    );

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
    useRef<string | null>(null);

  const lowTimeRoundIdRef =
    useRef<string | null>(null);

  const revealedRoundIdRef =
    useRef<string | null>(null);

  /*
   * Scoring happens at the reveal, so the host must ask for it once per
   * round — the clock and the all-answered timer can otherwise both fire.
   */
  const revealSentRoundIdRef =
    useRef<string | null>(null);

  const {
    room,
    players,
    loading: roomLoading,
    error: roomError,
  } = useRoom(roomCode);

  const ROUNDS_PER_GAME =
    getGameRoundCount(
      room?.gameSettings,
      "know-your-friends",
    );

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
  } = useFriendsRound(
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

  const playerIds = useMemo(
    () => players.map((p) => p.id),
    [players],
  );

  const subject = useMemo(
    () =>
      players.find(
        (player) =>
          player.id ===
          round?.subjectPlayerId,
      ) ?? null,
    [players, round],
  );

  const isSubject =
    !!localPlayer &&
    !!round &&
    round.subjectPlayerId ===
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

  const subjectAnswer = useMemo(
    () =>
      answers.find(
        (answer) => answer.isSubject,
      ) ?? null,
    [answers],
  );

  const everyoneAnswered =
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
    if (!room || !isHost) {
      return;
    }

    let activeSession = session;

    if (!activeSession) {
      activeSession =
        await createFriendsSession(
          room.id,
        );
    }

    const usedIds =
      await getFriendsUsedQuestionIds(
        activeSession.id,
      );

    const result =
      await createFriendsRound(
        activeSession.id,
        room.id,
        roundNumber,
        usedIds,
        playerIds,
        room.gameLanguage,
        getGameTimerSeconds(
          room.gameSettings,
          "know-your-friends",
        ),
      );

    if (!result) {
      throw new Error(
        gameT(
          "knowFriends.questionsExhausted",
        ),
      );
    }
  };

  const answer = async (
    index: number,
  ) => {
    if (
      !round ||
      !localPlayer ||
      myAnswer ||
      round.status !== "answering"
    ) {
      return;
    }

    await submitFriendsAnswer(
      round,
      localPlayer.id,
      index,
    );
  };

  const reveal = useCallback(
    async (force = false) => {
      if (
        !round ||
        !isHost ||
        (!force && !everyoneAnswered) ||
        revealSentRoundIdRef.current ===
          round.id
      ) {
        return;
      }

      revealSentRoundIdRef.current =
        round.id;

      await revealFriendsRound(
        round.id,
      );
    },
    [round, isHost, everyoneAnswered],
  );

  useAutoReveal({
    roundId: round?.id ?? null,
    ready:
      round?.status ===
        "answering" &&
      everyoneAnswered,
    isHost,
    onReveal: () => {
      void reveal();
    },
  });

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

      await finishFriendsGame(
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

    await returnFriendsRoomToLobby(
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
      window.clearInterval(timer);
    };
  }, [round, isHost, reveal]);

  useEffect(() => {
    if (
      !round ||
      round.status !== "reveal" ||
      revealedRoundIdRef.current ===
        round.id
    ) {
      return;
    }

    revealedRoundIdRef.current =
      round.id;

    if (myAnswer?.isCorrect) {
      playCorrect();
    } else if (!isSubject) {
      playIncorrect();
    }
  }, [round, myAnswer, isSubject]);

  useEffect(() => {
    if (room?.status === "lobby") {
      navigate(
        `/lobby/${room.code}`,
        { replace: true },
      );

      return;
    }

    if (
      room?.status === "playing" &&
      room.selectedGame !==
        "know-your-friends"
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

  if (room?.status === "lobby") {
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
                "knowFriends.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "knowFriends.joinAgain",
              )}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (roomLoading || roundLoading) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <LoaderCircle size={30} />

            <h1>
              {gameT(
                "knowFriends.loading",
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
                "knowFriends.loadError",
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
          <div className="friendsGame">
            <section className="friendsStart">
              <div className="friendsHeroIcon">
                <Heart size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "games.knowYourFriends.name",
                ).toUpperCase()}
              </span>

              <h1>
                {gameT(
                  "knowFriends.startTitle",
                )}
              </h1>

              <p>
                {gameT(
                  "knowFriends.startDescription",
                )}
              </p>

              {isHost ? (
                <>
                  {actionError && (
                    <div className="friendsError">
                      {actionError}
                    </div>
                  )}

                  <button
                    className="primaryButton friendsMainButton"
                    type="button"
                    disabled={working}
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
                <div className="friendsWaiting">
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

  if (round.status === "finished") {
    return (
      <>
        <Header />

        <div className="page gamePage">
          <div className="friendsGame">
            <section className="friendsStart">
              <div className="friendsHeroIcon">
                <Trophy size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "knowFriends.gameComplete",
                )}
              </span>

              <h1>
                {gameT(
                  "knowFriends.finalScores",
                )}
              </h1>

              <div className="friendsScoreboard">
                {sortedPlayers.map(
                  (player, index) => (
                    <div
                      key={player.id}
                      className="friendsScoreRow"
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
                        {player.name}
                      </strong>

                      <b>
                        {player.score.toLocaleString()}
                      </b>
                    </div>
                  ),
                )}
              </div>

              {isHost && (
                <button
                  className="primaryButton friendsMainButton"
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
                      : gameT(
                          "tournament.nextGame",
                        )
                    : gameT(
                        "knowFriends.backToLobby",
                      )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              )}
            </section>
          </div>
        </div>
      </>
    );
  }

  if (!question || !subject) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <h1>
              {gameT(
                "knowFriends.questionMissing",
              )}
            </h1>
          </div>
        </div>
      </>
    );
  }

  const revealed =
    round.status === "reveal";

  const prompt = askAbout(
    question.prompt,
    isSubject
      ? gameT("knowFriends.you")
      : subject.name,
  );

  /** Who predicted each option, for the reveal. */
  const pickedBy = (index: number) =>
    answers
      .filter(
        (entry) =>
          !entry.isSubject &&
          entry.selectedIndex ===
            index,
      )
      .map(
        (entry) =>
          players.find(
            (player) =>
              player.id ===
              entry.playerId,
          )?.name ??
          gameT("common.unknown"),
      );

  return (
    <>
      <Header />

      <div className="page gamePage">
        <div className="friendsGame">
          <LowTimeBanner
            secondsLeft={secondsLeft}
            roundKey={round.id}
            label={gameT(
              "common.timeRunningOut",
            )}
          />

          {isSubject && (
            <TurnFlash
              turnKey={round.id}
              label={gameT(
                "knowFriends.yourTurn",
              )}
              hint={gameT(
                "knowFriends.yourTurnHint",
              )}
            />
          )}

          <header className="friendsHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.knowYourFriends.name",
                ).toUpperCase()}
              </span>

              <strong>
                {gameT("bluff.round")}{" "}
                {round.roundNumber} /{" "}
                {ROUNDS_PER_GAME}
              </strong>
            </div>

            <div className="friendsHeaderRight">
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

              <div className="friendsScore">
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

          <div className="friendsProgress">
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
            <div className="friendsError">
              {actionError}
            </div>
          )}

          <section className="friendsPanel">
            <div
              className={`friendsSubject ${
                isSubject
                  ? "isYou"
                  : ""
              }`}
            >
              <Heart size={15} />

              {isSubject
                ? gameT(
                    "knowFriends.aboutYou",
                  )
                : `${gameT(
                    "knowFriends.about",
                  )} ${subject.name}`}
            </div>

            <AnimatePresence mode="wait">
              <motion.h1
                key={round.id}
                className="friendsPrompt"
                variants={phaseVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {prompt}
              </motion.h1>
            </AnimatePresence>

            <p className="friendsTask">
              {isSubject
                ? gameT(
                    "knowFriends.taskSubject",
                  )
                : gameT(
                    "knowFriends.taskPredictor",
                  )}
            </p>

            <div className="friendsOptions">
              {question.options.map(
                (option, index) => {
                  const isMine =
                    myAnswer?.selectedIndex ===
                    index;

                  const isTruth =
                    subjectAnswer?.selectedIndex ===
                    index;

                  const readers =
                    revealed
                      ? pickedBy(index)
                      : [];

                  return (
                    <button
                      key={`${round.id}-${index}`}
                      type="button"
                      style={
                        {
                          "--optionIndex":
                            index,
                        } as CSSProperties
                      }
                      className={[
                        "friendsOption",
                        revealed &&
                        isTruth
                          ? "truth"
                          : "",
                        !revealed &&
                        isMine
                          ? "selected"
                          : "",
                        revealed &&
                        isMine &&
                        !isTruth
                          ? "missed"
                          : "",
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(" ")}
                      disabled={
                        !!myAnswer ||
                        revealed ||
                        working
                      }
                      onClick={() => {
                        void runAction(
                          () =>
                            answer(
                              index,
                            ),
                        );
                      }}
                    >
                      <span className="friendsOptionLetter">
                        {
                          OPTION_LETTERS[
                            index
                          ]
                        }
                      </span>

                      <span className="friendsOptionText">
                        {option}
                      </span>

                      {revealed &&
                        isTruth && (
                          <Check
                            size={18}
                          />
                        )}

                      {revealed &&
                        isMine &&
                        !isTruth && (
                          <X
                            size={18}
                          />
                        )}

                      {readers.length >
                        0 && (
                        <span className="friendsPickedBy">
                          {readers.join(
                            ", ",
                          )}
                        </span>
                      )}
                    </button>
                  );
                },
              )}
            </div>

            {!revealed && (
              <div className="friendsFound">
                {answers.length} /{" "}
                {players.length}{" "}
                {gameT(
                  "knowFriends.playersAnswered",
                )}
              </div>
            )}

            {!revealed &&
              everyoneAnswered && (
                <div className="friendsWaiting">
                  {gameT(
                    "common.revealing",
                  )}
                </div>
              )}

            {revealed && (
              <div
                className={`friendsResult ${
                  myAnswer?.isCorrect
                    ? "correct"
                    : ""
                }`}
              >
                {isSubject
                  ? `${gameT(
                      "knowFriends.readYou",
                    )} ${
                      answers.filter(
                        (entry) =>
                          entry.isCorrect,
                      ).length
                    } / ${
                      players.length - 1
                    }`
                  : myAnswer?.isCorrect
                    ? gameT(
                        "knowFriends.youKnew",
                      )
                    : gameT(
                        "knowFriends.youMissed",
                      )}

                {(myAnswer?.points ??
                  0) > 0 && (
                  <b>
                    +
                    {myAnswer!.points.toLocaleString()}
                  </b>
                )}
              </div>
            )}
          </section>

          {revealed && isHost && (
            <button
              className="primaryButton friendsMainButton"
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
                    "knowFriends.seeResults",
                  )
                : gameT(
                    "knowFriends.nextRound",
                  )}

              <ArrowRight size={18} />
            </button>
          )}

          {revealed && !isHost && (
            <div className="friendsWaiting">
              {gameT(
                "knowFriends.waitingForHost",
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default KnowYourFriendsGame;
