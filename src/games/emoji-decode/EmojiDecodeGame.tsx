import {
  ArrowRight,
  Check,
  Crown,
  LoaderCircle,
  Send,
  Smile,
  Trophy,
  X,
} from "lucide-react";
import type {
  CSSProperties,
  FormEvent,
} from "react";
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
import {
  getEmojiCategories,
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { translate } from "../../i18n/i18n";
import { phaseVariants } from "../../lib/motion";
import { useAutoReveal } from "../../hooks/useAutoReveal";
import { useEmojiRound } from "../../hooks/useEmojiRound";
import { useRoom } from "../../hooks/useRoom";
import {
  createEmojiRound,
  createEmojiSession,
  finishEmojiGame,
  getEmojiUsedPuzzleIds,
  returnEmojiRoomToLobby,
  revealEmojiRound,
  submitEmojiGuess,
} from "../../services/emojiService";
import { advanceTournament } from "../../services/roomService";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import {
  playCorrect,
  playIncorrect,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";
import "../../styles/emoji.css";

/** Wrong tries kept on screen, so nobody retypes the same miss. */
const MISSES_SHOWN = 4;

type EmojiDecodeGameProps = {
  roomCode: string;
};

function EmojiDecodeGame({
  roomCode,
}: EmojiDecodeGameProps) {
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

  const [guess, setGuess] =
    useState("");

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

  const inputRef =
    useRef<HTMLInputElement>(null);

  const {
    room,
    players,
    loading: roomLoading,
    error: roomError,
  } = useRoom(roomCode);

  const ROUNDS_PER_GAME =
    getGameRoundCount(
      room?.gameSettings,
      "emoji-decode",
    );

  const gameLanguage =
    room?.gameLanguage ?? "en";

  const gameT = (key: string) =>
    translate(gameLanguage, key);

  const {
    session,
    round,
    puzzle,
    guesses,
    loading: roundLoading,
    error: roundError,
  } = useEmojiRound(
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

  const solves = useMemo(
    () =>
      guesses.filter(
        (entry) => entry.isCorrect,
      ),
    [guesses],
  );

  const mySolve = useMemo(
    () =>
      localPlayer
        ? solves.find(
            (entry) =>
              entry.playerId ===
              localPlayer.id,
          ) ?? null
        : null,
    [solves, localPlayer],
  );

  const myMisses = useMemo(
    () =>
      localPlayer
        ? guesses
            .filter(
              (entry) =>
                entry.playerId ===
                  localPlayer.id &&
                !entry.isCorrect,
            )
            .slice(-MISSES_SHOWN)
        : [],
    [guesses, localPlayer],
  );

  const everyoneSolved =
    players.length > 0 &&
    solves.length >= players.length;

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
        await createEmojiSession(
          room.id,
        );
    }

    const usedIds =
      await getEmojiUsedPuzzleIds(
        activeSession.id,
      );

    const result =
      await createEmojiRound(
        activeSession.id,
        room.id,
        roundNumber,
        usedIds,
        room.gameLanguage,
        getGameTimerSeconds(
          room.gameSettings,
          "emoji-decode",
        ),
        getEmojiCategories(
          room.gameSettings,
        ),
      );

    if (!result) {
      throw new Error(
        gameT(
          "emojiDecode.puzzlesExhausted",
        ),
      );
    }
  };

  const sendGuess = async () => {
    if (
      !round ||
      !localPlayer ||
      !puzzle ||
      mySolve ||
      round.status !== "answering"
    ) {
      return;
    }

    const attempt = guess.trim();

    if (attempt.length === 0) {
      return;
    }

    const correct =
      await submitEmojiGuess(
        round,
        localPlayer.id,
        attempt,
        puzzle,
      );

    setGuess("");

    if (correct) {
      playCorrect();
    } else {
      playIncorrect();
    }

    inputRef.current?.focus();
  };

  const reveal = useCallback(
    async (force = false) => {
      if (
        !round ||
        !isHost ||
        (!force && !everyoneSolved)
      ) {
        return;
      }

      await revealEmojiRound(
        round.id,
      );
    },
    [round, isHost, everyoneSolved],
  );

  useAutoReveal({
    roundId: round?.id ?? null,
    ready:
      round?.status ===
        "answering" &&
      everyoneSolved,
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

      await finishEmojiGame(
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

    await returnEmojiRoomToLobby(
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

  /* A fresh round means a fresh box. */
  const [
    lastRoundId,
    setLastRoundId,
  ] = useState<string | null>(null);

  if (
    round?.id &&
    round.id !== lastRoundId
  ) {
    setLastRoundId(round.id);
    setGuess("");
  }

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

    /* A solve already played its own sound as it landed. */
    if (!mySolve) {
      playIncorrect();
    }
  }, [round, mySolve]);

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
        "emoji-decode"
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
                "emojiDecode.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "emojiDecode.joinAgain",
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
                "emojiDecode.loading",
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
                "emojiDecode.loadError",
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
          <div className="emojiGame">
            <section className="emojiStart">
              <div className="emojiHeroIcon">
                <Smile size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "games.emojiDecode.name",
                ).toUpperCase()}
              </span>

              <h1>
                {gameT(
                  "emojiDecode.startTitle",
                )}
              </h1>

              <p>
                {gameT(
                  "emojiDecode.startDescription",
                )}
              </p>

              {isHost ? (
                <>
                  {actionError && (
                    <div className="emojiError">
                      {actionError}
                    </div>
                  )}

                  <button
                    className="primaryButton emojiMainButton"
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
                <div className="emojiWaiting">
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
          <div className="emojiGame">
            <section className="emojiStart">
              <div className="emojiHeroIcon">
                <Trophy size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "emojiDecode.gameComplete",
                )}
              </span>

              <h1>
                {gameT(
                  "emojiDecode.finalScores",
                )}
              </h1>

              <div className="emojiScoreboard">
                {sortedPlayers.map(
                  (player, index) => (
                    <div
                      key={player.id}
                      className="emojiScoreRow"
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
                  className="primaryButton emojiMainButton"
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
                        "emojiDecode.backToLobby",
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

  if (!puzzle) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <h1>
              {gameT(
                "emojiDecode.puzzleMissing",
              )}
            </h1>
          </div>
        </div>
      </>
    );
  }

  const revealed =
    round.status === "reveal";

  const playerName = (
    playerId: string,
  ) =>
    players.find(
      (player) =>
        player.id === playerId,
    )?.name ??
    gameT("common.unknown");

  return (
    <>
      <Header />

      <div className="page gamePage">
        <div className="emojiGame">
          <LowTimeBanner
            secondsLeft={secondsLeft}
            roundKey={round.id}
            label={gameT(
              "common.timeRunningOut",
            )}
          />

          <header className="emojiHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.emojiDecode.name",
                ).toUpperCase()}
              </span>

              <strong>
                {gameT("bluff.round")}{" "}
                {round.roundNumber} /{" "}
                {ROUNDS_PER_GAME}
              </strong>
            </div>

            <div className="emojiHeaderRight">
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

              <div className="emojiScore">
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

          <div className="emojiProgress">
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
            <div className="emojiError">
              {actionError}
            </div>
          )}

          <section className="emojiPanel">
            <div className="emojiCategory">
              {puzzle.category}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={round.id}
                className="emojiPuzzle"
                variants={phaseVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {puzzle.emojis}
              </motion.div>
            </AnimatePresence>

            {revealed ? (
              <div className="emojiReveal">
                <span className="emojiRevealLabel">
                  {gameT(
                    "emojiDecode.answerWas",
                  )}
                </span>

                <strong className="emojiAnswer">
                  {puzzle.answer}
                </strong>

                <div className="emojiSolvers">
                  {solves.length ===
                  0 ? (
                    <div className="emojiNoSolvers">
                      {gameT(
                        "emojiDecode.nobodyGotIt",
                      )}
                    </div>
                  ) : (
                    solves.map(
                      (
                        solve,
                        index,
                      ) => (
                        <div
                          key={solve.id}
                          className="emojiSolverRow"
                          style={
                            {
                              "--rowIndex":
                                index,
                            } as CSSProperties
                          }
                        >
                          <span className="emojiSolverPlace">
                            {index + 1}
                          </span>

                          <strong>
                            {playerName(
                              solve.playerId,
                            )}
                          </strong>

                          <b>
                            +
                            {solve.points.toLocaleString()}
                          </b>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            ) : mySolve ? (
              <div className="emojiSolved">
                <Check size={20} />

                {gameT(
                  "emojiDecode.youGotIt",
                )}

                <b>
                  +
                  {mySolve.points.toLocaleString()}
                </b>
              </div>
            ) : (
              <form
                className="emojiForm"
                onSubmit={(
                  event: FormEvent,
                ) => {
                  event.preventDefault();

                  void runAction(
                    sendGuess,
                  );
                }}
              >
                <input
                  ref={inputRef}
                  className="emojiInput"
                  value={guess}
                  onChange={(event) =>
                    setGuess(
                      event.target
                        .value,
                    )
                  }
                  placeholder={gameT(
                    "emojiDecode.placeholder",
                  )}
                  maxLength={80}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={working}
                  aria-label={gameT(
                    "emojiDecode.placeholder",
                  )}
                />

                <button
                  className="primaryButton emojiSendButton"
                  type="submit"
                  disabled={
                    working ||
                    guess.trim()
                      .length === 0
                  }
                  aria-label={gameT(
                    "emojiDecode.guess",
                  )}
                >
                  <Send size={18} />
                </button>
              </form>
            )}

            {!revealed &&
              myMisses.length > 0 && (
                <div className="emojiMisses">
                  {myMisses.map(
                    (miss) => (
                      <span
                        key={miss.id}
                        className="emojiMiss"
                      >
                        <X size={13} />

                        <span className="emojiMissText">
                          {miss.guess}
                        </span>
                      </span>
                    ),
                  )}
                </div>
              )}

            {!revealed && (
              <div className="emojiFound">
                {solves.length} /{" "}
                {players.length}{" "}
                {gameT(
                  "emojiDecode.playersSolved",
                )}
              </div>
            )}

            {!revealed &&
              everyoneSolved && (
                <div className="emojiWaiting">
                  {gameT(
                    "common.revealing",
                  )}
                </div>
              )}
          </section>

          {revealed && isHost && (
            <button
              className="primaryButton emojiMainButton"
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
                    "emojiDecode.seeResults",
                  )
                : gameT(
                    "emojiDecode.nextRound",
                  )}

              <ArrowRight size={18} />
            </button>
          )}

          {revealed && !isHost && (
            <div className="emojiWaiting">
              {gameT(
                "emojiDecode.waitingForHost",
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default EmojiDecodeGame;
