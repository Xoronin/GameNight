import {
  ArrowRight,
  Crown,
  Heart,
  LoaderCircle,
  Send,
  Trophy,
  Type,
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
import TurnFlash from "../../components/TurnFlash";
import {
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { translate } from "../../i18n/i18n";
import { phaseVariants } from "../../lib/motion";
import { useRoom } from "../../hooks/useRoom";
import { useSyllableRound } from "../../hooks/useSyllableRound";
import {
  STARTING_LIVES,
  createSyllableRound,
  createSyllableSession,
  finishSyllableGame,
  returnSyllableRoomToLobby,
  submitSyllableWord,
  timeOutSyllableTurn,
} from "../../services/syllableService";
import type { SubmitResult } from "../../services/syllableService";
import { advanceTournament } from "../../services/roomService";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import {
  playCorrect,
  playIncorrect,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";
import "../../styles/syllable.css";

/** Translation key for each way a word can be turned down. */
const REJECTION_KEYS: Record<
  Exclude<SubmitResult, "solved">,
  string
> = {
  missing_fragment:
    "syllableRush.missingFragment",
  already_used:
    "syllableRush.alreadyUsed",
  unknown_word:
    "syllableRush.unknownWord",
  not_your_turn:
    "syllableRush.notYourTurn",
};

type SyllableRushGameProps = {
  roomCode: string;
};

function SyllableRushGame({
  roomCode,
}: SyllableRushGameProps) {
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

  const [word, setWord] =
    useState("");

  /** The last thing the dictionary or the fragment said no to. */
  const [
    rejection,
    setRejection,
  ] = useState<string | null>(null);

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(0);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const timedOutTurnRef =
    useRef<string | null>(null);

  const lowTimeTurnRef =
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
      "syllable-rush",
    );

  const gameLanguage =
    room?.gameLanguage ?? "en";

  const gameT = (key: string) =>
    translate(gameLanguage, key);

  const {
    session,
    round,
    prompt,
    prompts,
    standings,
    turns,
    loading: roundLoading,
    error: roundError,
  } = useSyllableRound(
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

  const startSeconds =
    getGameTimerSeconds(
      room?.gameSettings,
      "syllable-rush",
    );

  const isMyTurn =
    !!localPlayer &&
    !!round &&
    round.status === "playing" &&
    round.currentPlayerId ===
      localPlayer.id;

  /** Identifies one turn, for the flash and the clock guards. */
  const turnKey = round
    ? `${round.id}-${round.turnNumber}`
    : null;

  /*
   * A fresh fragment deserves a fresh box. Adjusted during render rather
   * than in an effect, so the previous player's word is never briefly
   * visible under the new fragment.
   */
  const [
    lastTurnKey,
    setLastTurnKey,
  ] = useState<string | null>(null);

  if (turnKey !== lastTurnKey) {
    setLastTurnKey(turnKey);
    setWord("");
    setRejection(null);
  }

  const currentName = useMemo(
    () =>
      players.find(
        (player) =>
          player.id ===
          round?.currentPlayerId,
      )?.name ?? "",
    [players, round],
  );

  /*
   * Read out of gameT once rather than called inside the callback, which
   * would otherwise take a dependency on a function rebuilt every render.
   */
  const unknownName = gameT(
    "common.unknown",
  );

  const nameFor = useCallback(
    (playerId: string) =>
      players.find(
        (player) =>
          player.id === playerId,
      )?.name ?? unknownName,
    [players, unknownName],
  );

  const winner = useMemo(() => {
    const alive =
      standings.filter(
        (entry) => !entry.isOut,
      );

    return alive.length === 1
      ? alive[0]!
      : null;
  }, [standings]);

  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => b.score - a.score,
      ),
    [players],
  );

  /** Most recent first, and only the handful that fit. */
  const recentTurns = useMemo(
    () => [...turns].reverse().slice(0, 6),
    [turns],
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
        await createSyllableSession(
          room.id,
        );
    }

    const created =
      await createSyllableRound(
        activeSession.id,
        room.id,
        roundNumber,
        players.map(
          (player) => player.id,
        ),
        prompts,
        startSeconds,
      );

    if (!created) {
      throw new Error(
        gameT(
          "syllableRush.cannotStart",
        ),
      );
    }
  };

  const sendWord = async () => {
    if (
      !round ||
      !localPlayer ||
      !prompt ||
      !isMyTurn
    ) {
      return;
    }

    const result =
      await submitSyllableWord(
        round,
        localPlayer.id,
        word,
        prompt.fragment,
        gameLanguage,
        prompts,
        standings,
        startSeconds,
      );

    if (result === "solved") {
      setWord("");
      setRejection(null);

      playCorrect();

      return;
    }

    setRejection(
      REJECTION_KEYS[result],
    );

    playIncorrect();
  };

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

      await finishSyllableGame(
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

    await returnSyllableRoomToLobby(
      room.id,
    );
  };

  /*
   * The clock. Only the host acts on it running out, so a laggy phone
   * cannot take somebody's life early.
   */
  useEffect(() => {
    if (
      !round ||
      round.status !== "playing" ||
      !round.turnEndsAt ||
      !prompt
    ) {
      return;
    }

    const key = `${round.id}-${round.turnNumber}`;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(
            round.turnEndsAt!,
          ).getTime() -
            Date.now()) /
            1000,
        ),
      );

      setSecondsLeft(remaining);

      if (
        remaining > 0 &&
        remaining <= 3 &&
        lowTimeTurnRef.current !== key
      ) {
        lowTimeTurnRef.current = key;

        playTick();
      }

      if (
        remaining === 0 &&
        isHost &&
        timedOutTurnRef.current !== key
      ) {
        timedOutTurnRef.current = key;

        void timeOutSyllableTurn(
          round,
          prompt.fragment,
          prompts,
          standings,
          startSeconds,
        ).catch(() => {
          /* The next tick tries again. */
          timedOutTurnRef.current =
            null;
        });
      }
    };

    tick();

    const timer = window.setInterval(
      tick,
      250,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    round,
    prompt,
    prompts,
    standings,
    startSeconds,
    isHost,
  ]);

  useEffect(() => {
    if (isMyTurn) {
      inputRef.current?.focus();
    }
  }, [isMyTurn, turnKey]);

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
        "syllable-rush"
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
                "syllableRush.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "syllableRush.joinAgain",
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
                "syllableRush.loading",
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
                "syllableRush.loadError",
              )}
            </h1>

            <p>
              {roomError ?? roundError}
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
          <div className="syllableGame">
            <section className="syllableStart">
              <div className="syllableHeroIcon">
                <Type size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "games.syllableRush.name",
                ).toUpperCase()}
              </span>

              <h1>
                {gameT(
                  "syllableRush.startTitle",
                )}
              </h1>

              <p>
                {gameT(
                  "syllableRush.startDescription",
                )}
              </p>

              {isHost ? (
                <>
                  {actionError && (
                    <div className="syllableError">
                      {actionError}
                    </div>
                  )}

                  <button
                    className="primaryButton syllableMainButton"
                    type="button"
                    disabled={
                      working ||
                      prompts.length ===
                        0
                    }
                    onClick={() => {
                      void runAction(
                        () =>
                          startRound(1),
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
                <div className="syllableWaiting">
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
          <div className="syllableGame">
            <section className="syllableStart">
              <div className="syllableHeroIcon">
                <Trophy size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "syllableRush.gameComplete",
                )}
              </span>

              <h1>
                {gameT(
                  "syllableRush.finalScores",
                )}
              </h1>

              <div className="syllableScoreboard">
                {sortedPlayers.map(
                  (player, index) => (
                    <div
                      key={player.id}
                      className="syllableScoreRow"
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
                  className="primaryButton syllableMainButton"
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
                        "syllableRush.backToLobby",
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

  const revealed =
    round.status === "reveal";

  const myStanding =
    standings.find(
      (entry) =>
        entry.playerId ===
        localPlayer.id,
    ) ?? null;

  return (
    <>
      <Header />

      <div className="page gamePage">
        <div className="syllableGame">
          {isMyTurn && (
            <TurnFlash
              turnKey={turnKey}
              label={gameT(
                "syllableRush.yourTurn",
              )}
              hint={gameT(
                "syllableRush.yourTurnHint",
              )}
            />
          )}

          <header className="syllableHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.syllableRush.name",
                ).toUpperCase()}
              </span>

              <strong>
                {gameT("bluff.round")}{" "}
                {round.roundNumber} /{" "}
                {ROUNDS_PER_GAME}
              </strong>
            </div>

            <div className="syllableHeaderRight">
              {!revealed && (
                <div
                  className={`gameTimerBadge ${
                    secondsLeft <= 3
                      ? "gameTimerBadgeLow"
                      : ""
                  }`}
                >
                  {secondsLeft}s
                </div>
              )}

              <div className="syllableScore">
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

          {actionError && (
            <div className="syllableError">
              {actionError}
            </div>
          )}

          <section className="syllablePanel">
            {revealed ? (
              <div className="syllableOutcome">
                <Trophy size={34} />

                <h1>
                  {winner
                    ? `${nameFor(
                        winner.playerId,
                      )} ${gameT(
                        "syllableRush.tookTheRound",
                      )}`
                    : gameT(
                        "syllableRush.nobodyLeft",
                      )}
                </h1>

                <p>
                  {turns.length}{" "}
                  {gameT(
                    "syllableRush.turnsPlayed",
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="syllableTurnOf">
                  {isMyTurn
                    ? gameT(
                        "syllableRush.yourGo",
                      )
                    : `${currentName} ${gameT(
                        "syllableRush.isUp",
                      )}`}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={turnKey}
                    className={`syllableFragment ${
                      isMyTurn
                        ? "isMine"
                        : ""
                    }`}
                    variants={
                      phaseVariants
                    }
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {prompt?.fragment.toUpperCase() ??
                      "..."}
                  </motion.div>
                </AnimatePresence>

                <div
                  className="syllableClock"
                  aria-hidden="true"
                >
                  <div
                    className={
                      secondsLeft <= 3
                        ? "isLow"
                        : ""
                    }
                    style={{
                      width: `${
                        (secondsLeft /
                          Math.max(
                            1,
                            round.turnSeconds,
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>

                {isMyTurn ? (
                  <form
                    className="syllableForm"
                    onSubmit={(
                      event: FormEvent,
                    ) => {
                      event.preventDefault();

                      void runAction(
                        sendWord,
                      );
                    }}
                  >
                    <input
                      ref={inputRef}
                      className="syllableInput"
                      value={word}
                      onChange={(
                        event,
                      ) => {
                        setWord(
                          event.target
                            .value,
                        );

                        setRejection(
                          null,
                        );
                      }}
                      placeholder={gameT(
                        "syllableRush.placeholder",
                      )}
                      maxLength={40}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      disabled={working}
                      aria-label={gameT(
                        "syllableRush.placeholder",
                      )}
                    />

                    <button
                      className="primaryButton syllableSendButton"
                      type="submit"
                      disabled={
                        working ||
                        word.trim()
                          .length === 0
                      }
                      aria-label={gameT(
                        "syllableRush.send",
                      )}
                    >
                      <Send size={18} />
                    </button>
                  </form>
                ) : (
                  <div className="syllableWaiting">
                    {gameT(
                      "syllableRush.waitingTurn",
                    )}
                  </div>
                )}

                {rejection && (
                  <div
                    className="syllableRejection"
                    role="status"
                  >
                    {gameT(rejection)}
                  </div>
                )}
              </>
            )}

            <div className="syllableSeats">
              {standings.map(
                (entry) => (
                  <div
                    key={entry.id}
                    className={[
                      "syllableSeat",
                      entry.isOut
                        ? "isOut"
                        : "",
                      entry.playerId ===
                      round.currentPlayerId
                        ? "isTurn"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="syllableSeatName">
                      {nameFor(
                        entry.playerId,
                      )}
                    </span>

                    <span className="syllableLives">
                      {Array.from({
                        length:
                          STARTING_LIVES,
                      }).map(
                        (_, index) => (
                          <Heart
                            key={index}
                            size={13}
                            className={
                              index <
                              entry.lives
                                ? "isFull"
                                : "isGone"
                            }
                          />
                        ),
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>

          {recentTurns.length > 0 && (
            <div className="syllableHistory">
              {recentTurns.map(
                (turn) => (
                  <div
                    key={turn.id}
                    className={`syllableHistoryRow ${
                      turn.outcome ===
                      "timeout"
                        ? "missed"
                        : ""
                    }`}
                  >
                    <span className="syllableHistoryName">
                      {nameFor(
                        turn.playerId,
                      )}
                    </span>

                    <span className="syllableHistoryWord">
                      {turn.word ??
                        `— ${turn.fragment.toUpperCase()}`}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {!revealed &&
            myStanding?.isOut && (
              <div className="syllableWaiting">
                {gameT(
                  "syllableRush.youAreOut",
                )}
              </div>
            )}

          {revealed && isHost && (
            <button
              className="primaryButton syllableMainButton"
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
                    "syllableRush.seeResults",
                  )
                : gameT(
                    "syllableRush.nextRound",
                  )}

              <ArrowRight size={18} />
            </button>
          )}

          {revealed && !isHost && (
            <div className="syllableWaiting">
              {gameT(
                "syllableRush.waitingForHost",
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default SyllableRushGame;
