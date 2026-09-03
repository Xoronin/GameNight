import {
  ArrowRight,
  Brush,
  Check,
  Crown,
  Eraser,
  LoaderCircle,
  Send,
  Trophy,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import {
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { useDrawingRound } from "../../hooks/useDrawingRound";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import {
  addDrawingStroke,
  clearDrawing,
  createDrawingRound,
  createDrawingSession,
  finishDrawingGame,
  returnDrawingToLobby,
  revealDrawingRound,
  submitDrawingGuess,
} from "../../services/drawingService";
import { advanceTournament } from "../../services/roomService";
import "../../styles/drawing.css";
import type {
  DrawingPoint,
  DrawingStroke,
} from "../../types/game";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import {
  playCorrect,
  playReveal,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";

type DrawingGameProps = {
  roomCode: string;
};

const DRAWING_COLORS = [
  "#f8fafc",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#78350f",
  "#000000",
];

const DRAWING_WIDTHS = [
  { size: 3, label: "S" },
  { size: 6, label: "M" },
  { size: 10, label: "L" },
];

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  width: number,
  height: number,
) {
  if (stroke.points.length < 2) {
    return;
  }

  context.beginPath();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = stroke.lineWidth;
  context.strokeStyle = stroke.color;

  const first = stroke.points[0];

  context.moveTo(
    first.x * width,
    first.y * height,
  );

  for (
    let index = 1;
    index < stroke.points.length;
    index++
  ) {
    const point = stroke.points[index];

    context.lineTo(
      point.x * width,
      point.y * height,
    );
  }

  context.stroke();
}

function getWordPattern(
  word: string,
) {
  return word
    .split("")
    .map((character) => {
      if (character === " ") {
        return "   ";
      }

      if (
        character === "-" ||
        character === "'"
      ) {
        return character;
      }

      return "_";
    })
    .join(" ");
}

function DrawingGame({
  roomCode,
}: DrawingGameProps) {
  const navigate = useNavigate();

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const currentStrokeRef =
    useRef<DrawingPoint[]>([]);

  const lowTimeRoundIdRef =
    useRef<string | null>(
      null,
    );

  const correctGuessRoundIdRef =
    useRef<string | null>(
      null,
    );

  const revealedRoundIdRef =
    useRef<string | null>(
      null,
    );

  const [localPlayer] =
    useState<Player | null>(
      () => getPlayer(),
    );

  const [drawing, setDrawing] =
    useState(false);

  const [
    selectedColor,
    setSelectedColor,
  ] = useState(
    DRAWING_COLORS[0],
  );

  const [
    selectedWidth,
    setSelectedWidth,
  ] = useState(
    DRAWING_WIDTHS[1].size,
  );

  const [guess, setGuess] =
    useState("");

  const [working, setWorking] =
    useState(false);

  const [
    actionError,
    setActionError,
  ] = useState<string | null>(
    null,
  );

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(0);

  const {
    room,
    players,
    loading: roomLoading,
    error: roomError,
  } = useRoom(roomCode);

  const gameLanguage =
    room?.gameLanguage ?? "en";

  const gameT = (
    key: string,
  ) =>
    translate(
      gameLanguage,
      key,
    );

  const {
    session,
    round,
    word,
    strokes,
    guesses,
    loading: roundLoading,
    error: roundError,
  } = useDrawingRound(
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

  const isDrawer =
    !!round &&
    !!localPlayer &&
    round.drawerPlayerId ===
      localPlayer.id;

  const drawer =
    players.find(
      (player) =>
        player.id ===
        round?.drawerPlayerId,
    );

  const sortedPlayers =
    useMemo(
      () =>
        [...players].sort(
          (a, b) =>
            b.score - a.score,
        ),
      [players],
    );

  const roundsPerPlayer =
    getGameRoundCount(
      room?.gameSettings,
      "draw-guess",
    );

  const totalRounds =
    Math.max(
      players.length *
        roundsPerPlayer,
      1,
    );

  const myCorrectGuess =
    localPlayer
      ? guesses.find(
          (item) =>
            item.playerId ===
              localPlayer.id &&
            item.isCorrect,
        )
      : undefined;

  const correctGuessers =
    new Set(
      guesses
        .filter(
          (item) =>
            item.isCorrect,
        )
        .map(
          (item) =>
            item.playerId,
        ),
    );

  const eligibleGuessers =
    players.filter(
      (player) =>
        player.id !==
        round?.drawerPlayerId,
    );

  const everyoneGuessed =
    eligibleGuessers.length >
      0 &&
    eligibleGuessers.every(
      (player) =>
        correctGuessers.has(
          player.id,
        ),
    );

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
      } catch (
        caughtError
      ) {
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
    async (
      roundNumber: number,
    ) => {
      if (
        !room ||
        !isHost
      ) {
        return;
      }

      let activeSession =
        session;

      if (!activeSession) {
        activeSession =
          await createDrawingSession(
            room.id,
          );
      }

      await createDrawingRound(
        activeSession.id,
        room.id,
        roundNumber,
        players,
        getGameTimerSeconds(
          room.gameSettings,
          "draw-guess",
        ),
      );
    };

  const nextRound =
    async () => {
      if (
        !round ||
        !session ||
        !isHost
      ) {
        return;
      }

      if (
        round.roundNumber >=
        totalRounds
      ) {
        await finishDrawingGame(
          round.id,
          session.id,
        );

        return;
      }

      await startRound(
        round.roundNumber + 1,
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

      await returnDrawingToLobby(
        room.id,
      );
    };

  useEffect(() => {
    if (
      !round ||
      round.status !==
        "drawing"
    ) {
      return;
    }

    const updateTimer =
      () => {
        const remaining =
          Math.max(
            0,
            Math.ceil(
              (
                new Date(
                  round.endsAt,
                ).getTime() -
                Date.now()
              ) / 1000,
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
          isHost
        ) {
          void revealDrawingRound(
            round.id,
          );
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
  }, [
    round,
    isHost,
  ]);

  useEffect(() => {
    if (
      !round ||
      round.status !==
        "drawing" ||
      !everyoneGuessed ||
      !isHost
    ) {
      return;
    }

    void revealDrawingRound(
      round.id,
    );
  }, [
    everyoneGuessed,
    isHost,
    round,
  ]);

  useEffect(() => {
    if (
      !round ||
      !myCorrectGuess
    ) {
      return;
    }

    if (
      correctGuessRoundIdRef.current ===
      round.id
    ) {
      return;
    }

    correctGuessRoundIdRef.current =
      round.id;

    playCorrect();
  }, [round, myCorrectGuess]);

  useEffect(() => {
    if (
      !round ||
      round.status !== "reveal"
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
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const context =
      canvas.getContext(
        "2d",
      );

    if (!context) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const scale =
      window.devicePixelRatio ||
      1;

    canvas.width =
      rect.width * scale;

    canvas.height =
      rect.height * scale;

    context.setTransform(
      scale,
      0,
      0,
      scale,
      0,
      0,
    );

    context.clearRect(
      0,
      0,
      rect.width,
      rect.height,
    );

    strokes.forEach(
      (stroke) =>
        drawStroke(
          context,
          stroke,
          rect.width,
          rect.height,
        ),
    );
  }, [strokes]);

  const getPoint = (
    event:
      React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX -
          rect.left) /
        rect.width,

      y:
        (event.clientY -
          rect.top) /
        rect.height,
    };
  };

  const startDrawing = (
    event:
      React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (
      !isDrawer ||
      round?.status !==
        "drawing"
    ) {
      return;
    }

    const point =
      getPoint(event);

    if (!point) {
      return;
    }

    currentStrokeRef.current =
      [point];

    setDrawing(true);

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );
  };

  const continueDrawing = (
    event:
      React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (
      !drawing ||
      !isDrawer
    ) {
      return;
    }

    const point =
      getPoint(event);

    if (!point) {
      return;
    }

    currentStrokeRef.current.push(
      point,
    );

    const canvas =
      canvasRef.current;

    const context =
      canvas?.getContext(
        "2d",
      );

    if (
      !canvas ||
      !context
    ) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const points =
      currentStrokeRef.current;

    if (
      points.length < 2
    ) {
      return;
    }

    const previous =
      points[
        points.length - 2
      ];

    context.beginPath();
    context.strokeStyle =
      selectedColor;
    context.lineWidth =
      selectedWidth;
    context.lineCap =
      "round";

    context.moveTo(
      previous.x *
        rect.width,
      previous.y *
        rect.height,
    );

    context.lineTo(
      point.x *
        rect.width,
      point.y *
        rect.height,
    );

    context.stroke();
  };

  const stopDrawing =
    async () => {
      if (
        !drawing ||
        !round ||
        !localPlayer
      ) {
        return;
      }

      setDrawing(false);

      const points =
        currentStrokeRef.current;

      currentStrokeRef.current =
        [];

      if (
        points.length < 2
      ) {
        return;
      }

      await addDrawingStroke(
        round.id,
        localPlayer.id,
        points,
        selectedWidth,
        selectedColor,
      );
    };

  const submitGuess =
    async () => {
      if (
        !round ||
        !localPlayer ||
        isDrawer ||
        myCorrectGuess
      ) {
        return;
      }

      const cleaned =
        guess.trim();

      if (!cleaned) {
        return;
      }

      await submitDrawingGuess(
        round,
        localPlayer.id,
        cleaned,
        gameLanguage,
      );

      setGuess("");
    };

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

      return;
    }

    if (
      room?.status ===
        "playing" &&
      room.selectedGame !==
        "draw-guess"
    ) {
      navigate(
        `/game/${room.selectedGame}?room=${room.code}`,
        { replace: true },
      );

      return;
    }
  }, [
    room?.status,
    room?.selectedGame,
    room?.code,
    navigate,
  ]);

  if (
    room?.status ===
    "lobby"
  ) {
    return null;
  }

  if (
    roomLoading ||
    roundLoading
  ) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <LoaderCircle
              size={30}
            />

            <h1>
              {gameT(
                "games.drawGuess.name",
              )}
            </h1>

            <p>
              {gameT(
                "common.loading",
              )}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (
    roomError ||
    roundError ||
    !room ||
    !localPlayer
  ) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <h1>
              {gameT(
                "common.error",
              )}
            </h1>

            <p>
              {roomError ??
                roundError ??
                gameT(
                  "drawing.loadError",
                )}
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
        <div className="drawingGame">
          <section className="drawingStart">
            <div className="drawingStartIcon">
              <Brush
                size={40}
              />
            </div>

            <span className="eyebrow">
              DRAW & GUESS
            </span>

            <h1>
              {gameT(
                "drawing.startTitle",
              )}
            </h1>

            <p>
              {gameT(
                "drawing.startDescription",
              )}
            </p>

            {isHost ? (
              <button
                type="button"
                className="primaryButton drawingMainButton"
                disabled={
                  working
                }
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
                  "drawing.startGame",
                )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="drawingWaiting">
                {gameT(
                  "drawing.waitingHost",
                )}
              </div>
            )}

            {actionError && (
              <div className="drawingError">
                {actionError}
              </div>
            )}
          </section>
        </div>
        </div>
      </>
    );
  }

  if (
    round.status ===
    "finished"
  ) {
    return (
      <>
        <Header />

        <div className="page gamePage">
        <div className="drawingGame">
          <section className="drawingStart">
            <Trophy
              size={46}
            />

            <h1>
              {gameT(
                "drawing.finalScores",
              )}
            </h1>

            <div className="drawingScores">
              {sortedPlayers.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    className="drawingScoreRow"
                    key={
                      player.id
                    }
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
                type="button"
                className="primaryButton drawingMainButton"
                disabled={
                  working
                }
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
                    : `${gameT(
                        "tournament.nextGame",
                      )}: ${
                        tournament
                          .nextGameEntry
                          ? gameT(
                              tournament
                                .nextGameEntry
                                .nameKey,
                            )
                          : ""
                      }`
                  : gameT(
                      "drawing.backToLobby",
                    )}
              </button>
            ) : (
              <div className="drawingWaiting">
                {gameT(
                  "drawing.waitingHost",
                )}
              </div>
            )}
          </section>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      <div className="page gamePage drawingPlayingPage">
      <div className="drawingGame">
        <header className="drawingHeader">
          <div>
            <span className="eyebrow">
              DRAW & GUESS
            </span>

            <strong>
              {gameT(
                "drawing.round",
              )}{" "}
              {round.roundNumber}
              {" / "}
              {totalRounds}
            </strong>
          </div>

          <div className="drawingHeaderRight">
            <div className="drawingTimer">
              {secondsLeft}s
            </div>

            <div className="drawingScore">
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
          </div>
        </header>

        {actionError && (
          <div className="drawingError">
            {actionError}
          </div>
        )}

        <section className="drawingPanel">
          <div className="drawingPrompt">
            {isDrawer ? (
              <>
                <span>
                  {gameT(
                    "drawing.drawThis",
                  )}
                </span>

                <strong>
                  {word?.word ??
                    "..."}
                </strong>

                <small>
                  {word?.category}
                </small>
              </>
            ) : (
                <>
                <span>
                    {gameT(
                    "drawing.drawer",
                    )}
                </span>

                <strong>
                    {drawer?.name ?? "?"}
                </strong>

                {word && (
                    <div className="drawingWordPattern">
                    {getWordPattern(
                        word.word,
                    )}
                    </div>
                )}
                </>
            )}
          </div>

          <div className="drawingBoardWrap">
            <canvas
              ref={
                canvasRef
              }
              className={
                isDrawer
                  ? "drawingCanvas drawable"
                  : "drawingCanvas"
              }
              onPointerDown={
                startDrawing
              }
              onPointerMove={
                continueDrawing
              }
              onPointerUp={() => {
                void stopDrawing();
              }}
              onPointerCancel={() => {
                void stopDrawing();
              }}
            />

            {isDrawer &&
              round.status ===
                "drawing" && (
                <button
                  type="button"
                  className="drawingClear"
                  disabled={
                    working
                  }
                  onClick={() => {
                    void runAction(
                      () =>
                        clearDrawing(
                          round.id,
                        ),
                    );
                  }}
                >
                  <Eraser
                    size={17}
                  />

                  {gameT(
                    "drawing.clear",
                  )}
                </button>
              )}
          </div>

          {isDrawer &&
            round.status ===
              "drawing" && (
              <div className="drawingToolbar">
                <div className="drawingColors">
                  {DRAWING_COLORS.map(
                    (
                      color,
                    ) => (
                      <button
                        key={
                          color
                        }
                        type="button"
                        className={`drawingColorSwatch ${
                          selectedColor ===
                          color
                            ? "selected"
                            : ""
                        }`}
                        style={{
                          background:
                            color,
                        }}
                        aria-label={
                          color
                        }
                        onClick={() =>
                          setSelectedColor(
                            color,
                          )
                        }
                      />
                    ),
                  )}
                </div>

                <div className="drawingWidths">
                  {DRAWING_WIDTHS.map(
                    (
                      option,
                    ) => (
                      <button
                        key={
                          option.size
                        }
                        type="button"
                        className={`drawingWidthOption ${
                          selectedWidth ===
                          option.size
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedWidth(
                            option.size,
                          )
                        }
                      >
                        {
                          option.label
                        }
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

          {round.status ===
            "drawing" &&
            !isDrawer && (
              <div className="drawingGuessArea">
                {myCorrectGuess ? (
                  <div className="drawingCorrect">
                    <Check
                      size={20}
                    />

                    {gameT(
                      "drawing.correct",
                    )}

                    <strong>
                      +
                      {
                        myCorrectGuess.points
                      }
                    </strong>
                  </div>
                ) : (
                  <div className="drawingGuessInput">
                    <input
                      value={
                        guess
                      }
                      onChange={(
                        event,
                      ) =>
                        setGuess(
                          event
                            .target
                            .value,
                        )
                      }
                      onKeyDown={(
                        event,
                      ) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          void runAction(
                            submitGuess,
                          );
                        }
                      }}
                      placeholder={gameT(
                        "drawing.guessPlaceholder",
                      )}
                    />

                    <button
                      type="button"
                      className="primaryButton"
                      disabled={
                        working ||
                        !guess.trim()
                      }
                      onClick={() => {
                        void runAction(
                          submitGuess,
                        );
                      }}
                    >
                      <Send
                        size={17}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}

          <div className="drawingGuesses">
            {guesses
              .filter(
                (item) =>
                  !item.isCorrect,
              )
              .slice(-8)
              .map(
                (item) => {
                  const player =
                    players.find(
                      (
                        candidate,
                      ) =>
                        candidate.id ===
                        item.playerId,
                    );

                  return (
                    <div
                      key={item.id}
                      className="drawingGuessItem"
                    >
                      <strong>
                        {player?.name ?? "?"}
                      </strong>

                      <span>
                        {item.guess}
                      </span>
                    </div>
                  );
                },
              )}
          </div>

          {round.status ===
            "reveal" && (
              <div className="drawingReveal">
                <span>
                  {gameT(
                    "drawing.wordWas",
                  )}
                </span>

                <strong>
                  {word?.word}
                </strong>

                {isHost ? (
                  <button
                    type="button"
                    className="primaryButton drawingMainButton"
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
                    totalRounds
                      ? gameT(
                          "drawing.finishGame",
                        )
                      : gameT(
                          "drawing.nextRound",
                        )}

                    <ArrowRight
                      size={18}
                    />
                  </button>
                ) : (
                  <div className="drawingWaiting">
                    {gameT(
                      "drawing.waitingContinue",
                    )}
                  </div>
                )}
              </div>
            )}
        </section>
      </div>
      </div>
    </>
  );
}

export default DrawingGame;