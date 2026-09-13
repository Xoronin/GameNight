import {
  ArrowRight,
  Crown,
  LoaderCircle,
  Ruler,
  Trophy,
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
import {
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { translate } from "../../i18n/i18n";
import { phaseVariants } from "../../lib/motion";
import { useAutoReveal } from "../../hooks/useAutoReveal";
import { useRoom } from "../../hooks/useRoom";
import { useScaleRound } from "../../hooks/useScaleRound";
import {
  closestGuess,
  createScaleRound,
  createScaleSession,
  finishScaleGame,
  nameOf,
  returnScaleRoomToLobby,
  revealScaleRound,
  submitScaleGuess,
  trueRatio,
} from "../../services/scaleService";
import { advanceTournament } from "../../services/roomService";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import {
  playCorrect,
  playIncorrect,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";
import { silhouettes } from "../../data/scaleSilhouettes";
import Silhouette from "./Silhouette";
import { useScaleDrag } from "./useScaleDrag";
import "../../styles/scale.css";

/* How tall the reference stands before anything is scaled to fit. */
const REFERENCE_PX = 150;

/* The stage never grows past this, so a huge guess shrinks the pair. */
const STAGE_PX = 300;

/*
 * Taken off the measured stage before fitting: the widest the CSS gap
 * between the two figures can get, so they never touch.
 */
const GAP_PX = 72;

/** A height in metres, written the way a person would say it. */
function metres(value: number): string {
  return value >= 10
    ? `${Math.round(value)} m`
    : value >= 1
      ? `${value.toFixed(2).replace(/\.?0+$/, "")} m`
      : `${Math.round(value * 100)} cm`;
}

type ScaleGameProps = {
  roomCode: string;
};

function ScaleGame({
  roomCode,
}: ScaleGameProps) {
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

  const stageRef =
    useRef<HTMLDivElement>(null);

  const [stageWidth, setStageWidth] =
    useState(0);

  const timedOutRoundRef =
    useRef<string | null>(null);

  const lowTimeRoundRef =
    useRef<string | null>(null);

  const soundedRoundRef =
    useRef<string | null>(null);

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
    objects,
    reference,
    mystery,
    guesses,
    loading: roundLoading,
    error: roundError,
  } = useScaleRound(room?.id);

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

  const tournament =
    getTournamentStatus(room);

  const ROUNDS_PER_GAME =
    getGameRoundCount(
      room?.gameSettings,
      "scale",
    );

  const turnSeconds =
    getGameTimerSeconds(
      room?.gameSettings,
      "scale",
    );

  const revealed =
    round?.status === "reveal";

  const myGuess = useMemo(
    () =>
      localPlayer
        ? (guesses.find(
            (guess) =>
              guess.playerId ===
              localPlayer.id,
          ) ?? null)
        : null,
    [guesses, localPlayer],
  );

  const everyoneGuessed =
    players.length > 0 &&
    guesses.length >= players.length;

  const {
    trackRef,
    position: dragPosition,
    ratio: dragRatio,
    dragging,
    handleProps,
  } = useScaleDrag({
    initial: 1,
    disabled: !!myGuess || revealed,
  });

  /*
   * Reset the handle for each new round. Adjusted during render rather
   * than in an effect, so the previous round's ratio is never briefly
   * shown under the new pair.
   */
  const [
    lastRoundId,
    setLastRoundId,
  ] = useState<string | null>(null);

  if (
    round &&
    round.id !== lastRoundId
  ) {
    setLastRoundId(round.id);
  }

  const answer =
    reference && mystery
      ? trueRatio(reference, mystery)
      : 1;

  /*
   * What ratio the mystery is drawn at: the player's own guess while they
   * are still setting it, and the truth once the round is revealed.
   */
  const shownRatio = revealed
    ? answer
    : (myGuess?.ratio ?? dragRatio);

  /*
   * Both have to share a stage, and both are scaled by the same factor —
   * their relative height is the answer, so shrinking one to fit would
   * change it.
   *
   * Height is the obvious constraint, and when the mystery is many times
   * the reference the pair shrinks together, which is the point: the
   * reference visibly getting smaller is what says "much bigger" without
   * a number. Width is the less obvious one. A double-decker bus is two
   * and a half times as wide as it is tall, so at a fixed height it is
   * wider than a phone long before it is taller than the stage.
   */
  const aspectOf = (
    shapeKey: string | undefined,
  ) =>
    (shapeKey
      ? silhouettes[shapeKey]?.width
      : undefined) ?? 100;

  const widthAtFullSize =
    (aspectOf(reference?.shapeKey) /
      100) *
      REFERENCE_PX +
    (aspectOf(mystery?.shapeKey) /
      100) *
      REFERENCE_PX *
      shownRatio;

  const fit = Math.min(
    1,
    STAGE_PX /
      Math.max(
        REFERENCE_PX,
        REFERENCE_PX * shownRatio,
      ),
    stageWidth > 0
      ? Math.max(
          0.05,
          (stageWidth - GAP_PX) /
            widthAtFullSize,
        )
      : 1,
  );

  const referencePx =
    REFERENCE_PX * fit;

  const mysteryPx =
    REFERENCE_PX * shownRatio * fit;

  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => b.score - a.score,
      ),
    [players],
  );

  const nameFor = useCallback(
    (playerId: string) =>
      players.find(
        (player) =>
          player.id === playerId,
      )?.name ?? "",
    [players],
  );

  const best = useMemo(
    () => closestGuess(guesses),
    [guesses],
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

    const activeSession =
      session ??
      (await createScaleSession(
        room.id,
      ));

    const created =
      await createScaleRound(
        activeSession.id,
        room.id,
        roundNumber,
        objects,
        turnSeconds,
      );

    if (!created) {
      throw new Error(
        gameT("scale.cannotStart"),
      );
    }
  };

  const lockIn = async () => {
    if (
      !round ||
      !localPlayer ||
      !reference ||
      !mystery ||
      myGuess ||
      round.status !== "guessing"
    ) {
      return;
    }

    await submitScaleGuess(
      round,
      localPlayer.id,
      dragRatio,
      reference,
      mystery,
    );
  };

  const reveal = useCallback(
    async () => {
      if (!round || !isHost) {
        return;
      }

      await revealScaleRound(
        round.id,
      );
    },
    [round, isHost],
  );

  useAutoReveal({
    roundId: round?.id ?? null,
    ready:
      round?.status === "guessing" &&
      everyoneGuessed,
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

      await finishScaleGame(
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

    await returnScaleRoomToLobby(
      room.id,
    );
  };

  /* The stage's own width drives the width half of the fit above. */
  useEffect(() => {
    const element = stageRef.current;

    if (!element) {
      return;
    }

    const observer =
      new ResizeObserver(
        (entries) => {
          setStageWidth(
            entries[0]?.contentRect
              .width ?? 0,
          );
        },
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [round?.id]);

  useEffect(() => {
    if (
      !round ||
      round.status !== "guessing" ||
      !round.endsAt
    ) {
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(
            round.endsAt!,
          ).getTime() -
            Date.now()) /
            1000,
        ),
      );

      setSecondsLeft(remaining);

      if (
        remaining > 0 &&
        remaining <= 5 &&
        lowTimeRoundRef.current !==
          round.id
      ) {
        lowTimeRoundRef.current =
          round.id;

        playTick();
      }

      if (
        remaining === 0 &&
        isHost &&
        timedOutRoundRef.current !==
          round.id
      ) {
        timedOutRoundRef.current =
          round.id;

        void reveal();
      }
    };

    tick();

    const timer = window.setInterval(
      tick,
      400,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [round, isHost, reveal]);

  useEffect(() => {
    if (
      !round ||
      !revealed ||
      soundedRoundRef.current ===
        round.id
    ) {
      return;
    }

    soundedRoundRef.current =
      round.id;

    if ((myGuess?.points ?? 0) >= 500) {
      playCorrect();
    } else if (myGuess) {
      playIncorrect();
    }
  }, [round, revealed, myGuess]);

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
      room.selectedGame !== "scale"
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
                "scale.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "scale.joinAgain",
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
              {gameT("scale.loading")}
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
                "scale.loadError",
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
          <div className="scaleGame">
            <section className="scaleStart">
              <div className="scaleHeroIcon">
                <Ruler size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "games.scale.name",
                ).toUpperCase()}
              </span>

              <h1>
                {gameT(
                  "scale.startTitle",
                )}
              </h1>

              <p>
                {gameT(
                  "scale.startDescription",
                )}
              </p>

              {isHost ? (
                <>
                  {actionError && (
                    <div className="scaleError">
                      {actionError}
                    </div>
                  )}

                  <button
                    className="primaryButton scaleMainButton"
                    type="button"
                    disabled={
                      working ||
                      objects.length <
                        2
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
                <div className="scaleWaiting">
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
          <div className="scaleGame">
            <section className="scaleStart">
              <div className="scaleHeroIcon">
                <Trophy size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "scale.gameComplete",
                )}
              </span>

              <h1>
                {gameT(
                  "scale.finalScores",
                )}
              </h1>

              <div className="scaleScoreboard">
                {sortedPlayers.map(
                  (player, index) => (
                    <div
                      key={player.id}
                      className="scaleScoreRow"
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
                  className="primaryButton scaleMainButton"
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
                        "scale.backToLobby",
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

  if (!reference || !mystery) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <h1>
              {gameT(
                "scale.pairMissing",
              )}
            </h1>
          </div>
        </div>
      </>
    );
  }

  const referenceName = nameOf(
    reference,
    gameLanguage,
  );

  const mysteryName = nameOf(
    mystery,
    gameLanguage,
  );

  return (
    <>
      <Header />

      <div className="page gamePage">
        <div className="scaleGame">
          <LowTimeBanner
            secondsLeft={secondsLeft}
            roundKey={round.id}
            label={gameT(
              "common.timeRunningOut",
            )}
          />

          <header className="scaleHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.scale.name",
                ).toUpperCase()}
              </span>

              <strong>
                {gameT("bluff.round")}{" "}
                {round.roundNumber} /{" "}
                {ROUNDS_PER_GAME}
              </strong>
            </div>

            <div className="scaleHeaderRight">
              {!revealed && (
                <div
                  className={`gameTimerBadge ${
                    secondsLeft <= 5
                      ? "gameTimerBadgeLow"
                      : ""
                  }`}
                >
                  {secondsLeft}s
                </div>
              )}

              <div className="scaleScore">
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
            <div className="scaleError">
              {actionError}
            </div>
          )}

          <section className="scalePanel">
            <AnimatePresence mode="wait">
              <motion.p
                key={round.id}
                className="scaleTask"
                variants={phaseVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {gameT(
                  "scale.taskBefore",
                )}{" "}
                <strong>
                  {mysteryName}
                </strong>{" "}
                {gameT(
                  "scale.taskAfter",
                )}{" "}
                <strong>
                  {referenceName}
                </strong>
                .
              </motion.p>
            </AnimatePresence>

            {/*
              The stage. Both silhouettes stand on one ground line, so the
              only thing to compare is their heights.
            */}
            <div
              className={`scaleStage ${
                revealed
                  ? "isRevealed"
                  : ""
              }`}
              ref={stageRef}
              style={
                {
                  "--stage": `${STAGE_PX}px`,
                } as CSSProperties
              }
            >
              <div className="scaleFigure">
                <Silhouette
                  shapeKey={
                    reference.shapeKey
                  }
                  height={referencePx}
                  className="scaleShape isReference"
                />

                <span className="scaleFigureName">
                  {referenceName}
                  {revealed && (
                    <b>
                      {metres(
                        reference.heightM,
                      )}
                    </b>
                  )}
                </span>
              </div>

              <div
                className="scaleFigure isMystery"
                ref={trackRef}
              >
                {/*
                  Where everyone landed, drawn only once the answer is
                  out — before that it would be a leaderboard of hints.
                */}
                {revealed &&
                  [...guesses]
                    .sort(
                      (a, b) =>
                        a.ratio -
                        b.ratio,
                    )
                    .map(
                      (
                        guess,
                        index,
                      ) => {
                        const px =
                          REFERENCE_PX *
                          guess.ratio *
                          fit;

                        if (
                          px >
                          STAGE_PX
                        ) {
                          return null;
                        }

                        return (
                          <span
                            key={
                              guess.id
                            }
                            className={`scaleGhost ${
                              guess.playerId ===
                              localPlayer.id
                                ? "isMine"
                                : ""
                            }`}
                            style={
                              {
                                bottom: `${px}px`,
                                "--ghostIndex":
                                  index %
                                  3,
                              } as CSSProperties
                            }
                          >
                            {nameFor(
                              guess.playerId,
                            )}
                          </span>
                        );
                      },
                    )}

                <Silhouette
                  shapeKey={
                    mystery.shapeKey
                  }
                  height={mysteryPx}
                  className={`scaleShape isMystery ${
                    revealed
                      ? "isRevealed"
                      : ""
                  }`}
                />

                {!revealed &&
                  !myGuess && (
                    <button
                      type="button"
                      className={`scaleHandle ${
                        dragging
                          ? "isDragging"
                          : ""
                      }`}
                      style={{
                        bottom: `${mysteryPx}px`,
                      }}
                      role="slider"
                      aria-label={gameT(
                        "scale.handleLabel",
                      )}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(
                        dragPosition *
                          100,
                      )}
                      aria-valuetext={gameT(
                        dragRatio > 1.1
                          ? "scale.tallerThan"
                          : dragRatio <
                              0.9
                            ? "scale.shorterThan"
                            : "scale.aboutTheSame",
                      )}
                      {...handleProps}
                    />
                  )}

                <span className="scaleFigureName">
                  {mysteryName}
                  {revealed && (
                    <b>
                      {metres(
                        mystery.heightM,
                      )}
                    </b>
                  )}
                </span>
              </div>
            </div>

            {!revealed &&
              (myGuess ? (
                <div className="scaleWaiting">
                  {gameT(
                    "scale.locked",
                  )}{" "}
                  {guesses.length} /{" "}
                  {players.length}
                </div>
              ) : (
                <button
                  className="primaryButton scaleMainButton"
                  type="button"
                  disabled={working}
                  onClick={() => {
                    void runAction(
                      lockIn,
                    );
                  }}
                >
                  {gameT(
                    "scale.lockIn",
                  )}
                </button>
              ))}

            {revealed && (
              <div className="scaleResults">
                {myGuess ? (
                  <div
                    className={`scaleResult ${
                      myGuess.points >=
                      500
                        ? "good"
                        : ""
                    }`}
                  >
                    {gameT(
                      myGuess.points >=
                        700
                        ? "scale.veryClose"
                        : myGuess.points >=
                            300
                          ? "scale.notBad"
                          : "scale.wayOff",
                    )}

                    <b>
                      +
                      {myGuess.points.toLocaleString()}
                    </b>
                  </div>
                ) : (
                  <div className="scaleWaiting">
                    {gameT(
                      "scale.noGuess",
                    )}
                  </div>
                )}

                {best &&
                  guesses.length >
                    1 && (
                    <div className="scaleClosest">
                      {gameT(
                        "scale.closest",
                      )}{" "}
                      <strong>
                        {nameFor(
                          best.playerId,
                        )}
                      </strong>
                    </div>
                  )}
              </div>
            )}
          </section>

          {revealed && isHost && (
            <button
              className="primaryButton scaleMainButton"
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
                    "scale.seeResults",
                  )
                : gameT(
                    "scale.nextRound",
                  )}

              <ArrowRight size={18} />
            </button>
          )}

          {revealed && !isHost && (
            <div className="scaleWaiting">
              {gameT(
                "scale.waitingForHost",
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ScaleGame;
