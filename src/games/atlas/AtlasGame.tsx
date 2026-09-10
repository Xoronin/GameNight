import {
  ArrowRight,
  Check,
  Crown,
  Globe2,
  LoaderCircle,
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
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import LowTimeBanner from "../../components/LowTimeBanner";
import TurnFlash from "../../components/TurnFlash";
import { getAtlasCountry } from "../../data/atlasCountries";
import { flagRegions } from "../../data/atlasFlags";
import {
  getAtlasModes,
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { useAtlasRound } from "../../hooks/useAtlasRound";
import { useAutoReveal } from "../../hooks/useAutoReveal";
import { useRoom } from "../../hooks/useRoom";
import { translate } from "../../i18n/i18n";
import {
  STARTING_LIVES,
  boardCountryIds,
  isBoardRound,
  createAtlasRound,
  createAtlasSession,
  finishAtlasGame,
  getAtlasUsedCountryIds,
  passAtlasTurn,
  placeAtlasCapital,
  returnAtlasRoomToLobby,
  revealAtlasRound,
  submitAtlasAnswer,
  turnDeadline,
} from "../../services/atlasService";
import { advanceTournament } from "../../services/roomService";
import type {
  AtlasResponse,
  AtlasRoundType,
} from "../../types/game";
import {
  answerLabel,
  boardDragKey,
  promptKeyFor,
} from "./roundText";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import {
  playCorrect,
  playIncorrect,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";
import "../../styles/atlas.css";
import CapitalMatchRound from "./rounds/CapitalMatchRound";
import MapChoiceRound from "./rounds/MapChoiceRound";
import MapPlaceRound from "./rounds/MapPlaceRound";
import ChoiceRound from "./rounds/ChoiceRound";
import FlagPaintRound from "./rounds/FlagPaintRound";

type AtlasGameProps = {
  roomCode: string;
};

function AtlasGame({
  roomCode,
}: AtlasGameProps) {
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
  ] = useState<string | null>(
    null,
  );

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(0);

  /* Working state for the current round, reset whenever it changes. */
  const [painted, setPainted] =
    useState<
      Record<string, string>
    >({});

  const [activeColor, setActiveColor] =
    useState("#d52b1e");

  const [choiceId, setChoiceId] =
    useState<string | null>(null);

  const triggeredRoundIdRef =
    useRef<string | null>(null);

  const lowTimeRoundIdRef =
    useRef<string | null>(null);

  const revealedRoundIdRef =
    useRef<string | null>(null);

  const {
    room,
    players,
    loading: roomLoading,
    error: roomError,
  } = useRoom(roomCode);

  const {
    session,
    round,
    answers,
    placements,
    loading: roundLoading,
    error: roundError,
  } = useAtlasRound(room?.id);

  /* Which round types the host turned on for this room. */
  const enabledModes = useMemo(
    () =>
      getAtlasModes(
        room?.gameSettings,
      ) as AtlasRoundType[],
    [room?.gameSettings],
  );

  const ROUNDS_PER_GAME =
    getGameRoundCount(
      room?.gameSettings,
      "atlas",
    );

  const gameLanguage =
    room?.gameLanguage ?? "en";

  const gameT = (key: string) =>
    translate(gameLanguage, key);

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

  const tournament =
    getTournamentStatus(room);

  const myAnswer = useMemo(
    () =>
      localPlayer
        ? (answers.find(
            (answer) =>
              answer.playerId ===
              localPlayer.id,
          ) ?? null)
        : null,
    [answers, localPlayer],
  );

  const allPlayersAnswered =
    players.length > 0 &&
    answers.length >=
      players.length;

  /** Countries each player solved on a match board. */
  const solvedByPlayer = useMemo(
    () => {
      const counts: Record<
        string,
        number
      > = {};

      for (const placement of placements) {
        if (placement.isCorrect) {
          counts[
            placement.placedBy
          ] =
            (counts[
              placement.placedBy
            ] ?? 0) + 1;
        }
      }

      return counts;
    },
    [placements],
  );

  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) =>
          b.score - a.score,
      ),
    [players],
  );

  const revealed =
    round?.status === "reveal";

  /*
   * The match round is turn-based: no per-player submission, no reveal
   * button, and the board is scored one placement at a time.
   */
  const isMatchRound =
    !!round &&
    isBoardRound(
      round.payload.type,
    );

  const playerIds = useMemo(
    () =>
      players.map(
        (player) => player.id,
      ),
    [players],
  );

  const myTurn =
    !!round?.currentPlayerId &&
    round.currentPlayerId ===
      localPlayer?.id;

  const turnSeconds =
    getGameTimerSeconds(
      room?.gameSettings,
      "atlas",
    );

  /*
   * A match round times out once per turn, not once per round, so the
   * "already fired" guard has to be keyed on the turn rather than on
   * the round id — otherwise only the first stalled turn would pass.
   */
  const timeoutKey = round
    ? `${round.id}:${
        round.currentPlayerId ?? ""
      }:${
        round.turnEndsAt ??
        round.endsAt
      }`
    : "";

  /*
   * Clear the in-progress answer when the round changes, so the next
   * round does not start pre-filled with the last one's work.
   *
   * Adjusted during render rather than in an effect — React's
   * documented pattern for resetting state when a value changes, and
   * the same one useAtlasRound uses. Doing it in an effect would paint
   * one frame of the previous round's answer against the new task.
   */
  const [
    answeredRoundId,
    setAnsweredRoundId,
  ] = useState<
    string | undefined
  >(undefined);

  if (round?.id !== answeredRoundId) {
    setAnsweredRoundId(round?.id);
    setPainted({});
    setChoiceId(null);
  }

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
        await createAtlasSession(
          room.id,
        );
    }

    const usedIds =
      await getAtlasUsedCountryIds(
        activeSession.id,
      );

    const result =
      await createAtlasRound(
        activeSession.id,
        room.id,
        roundNumber,
        usedIds,
        getGameTimerSeconds(
          room.gameSettings,
          "atlas",
        ),
        players.map(
          (player) => player.id,
        ),
        ROUNDS_PER_GAME,
        enabledModes,
      );

    if (!result) {
      throw new Error(
        gameT(
          "atlas.countriesExhausted",
        ),
      );
    }
  };

  /** The answer as the service expects it, or null if incomplete. */
  const buildResponse =
    (): AtlasResponse | null => {
      if (!round) {
        return null;
      }

      if (
        round.payload.type ===
        "flag_paint"
      ) {
        const country =
          getAtlasCountry(
            round.payload
              .countryId,
          );

        if (!country) {
          return null;
        }

        if (!country.flag) {
          return null;
        }

        const regions =
          flagRegions(
            country.flag,
          );

        /* Every region must be filled before this can be sent. */
        if (
          regions.some(
            (region) =>
              !painted[region.id],
          )
        ) {
          return null;
        }

        return {
          type: "flag_paint",
          regions: painted,
        };
      }

      if (
        isBoardRound(
          round.payload.type,
        )
      ) {
        /* Scored per placement as turns are taken, not on submit. */
        return null;
      }

      if (!choiceId) {
        return null;
      }

      return {
        type: "choice",
        choiceId,
      };
    };

  const response = buildResponse();

  const submit = async () => {
    if (
      !round ||
      !localPlayer ||
      myAnswer ||
      !response
    ) {
      return;
    }

    await submitAtlasAnswer(
      round,
      localPlayer.id,
      response,
    );
  };

  const placeCapital = async (
    countryId: string,
    capitalCountryId: string,
  ) => {
    if (
      !round ||
      !room ||
      !localPlayer
    ) {
      return;
    }

    await placeAtlasCapital(
      round,
      localPlayer.id,
      countryId,
      capitalCountryId,
      playerIds,
      getGameTimerSeconds(
        room.gameSettings,
        "atlas",
      ),
    );
  };

  const reveal = useCallback(
    async (force = false) => {
      if (
        !round ||
        !isHost ||
        (!force &&
          !allPlayersAnswered)
      ) {
        return;
      }

      await revealAtlasRound(
        round.id,
      );
    },
    [
      round,
      isHost,
      allPlayersAnswered,
    ],
  );

  /*
   * Board rounds run on turns rather than one answer each, so they end
   * when the board is solved or the clock runs out, not on this count.
   */
  useAutoReveal({
    roundId: round?.id ?? null,
    ready:
      round?.status ===
        "playing" &&
      !isMatchRound &&
      allPlayersAnswered,
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

      await finishAtlasGame(
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

    await returnAtlasRoomToLobby(
      room.id,
    );
  };

  useEffect(() => {
    if (
      !round ||
      round.status !== "playing"
    ) {
      return;
    }

    const updateTimer = () => {
      const deadline =
        turnDeadline(round);

      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(
            deadline,
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
          timeoutKey
      ) {
        triggeredRoundIdRef.current =
          timeoutKey;

        if (isMatchRound) {
          /*
           * Only the host fires this, so a stalled turn costs exactly
           * one life however many clients are watching the clock.
           */
          void passAtlasTurn(
            round,
            playerIds,
            turnSeconds,
          );
        } else {
          void reveal(true);
        }
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
  }, [
    round,
    isHost,
    isMatchRound,
    reveal,
    playerIds,
    turnSeconds,
    timeoutKey,
  ]);

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

    if (
      myAnswer &&
      myAnswer.correctCount ===
        myAnswer.totalCount
    ) {
      playCorrect();
    } else {
      playIncorrect();
    }
  }, [round, myAnswer]);

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
      room.selectedGame !== "atlas"
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
                "atlas.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "atlas.joinAgain",
              )}
            </p>
          </div>
        </div>
      </>
    );
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
                "atlas.loading",
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
                "atlas.loadError",
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
          <div className="atlasGame">
            <section className="atlasStart">
              <div className="atlasHeroIcon">
                <Globe2 size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "games.atlas.name",
                ).toUpperCase()}
              </span>

              <h1>
                {gameT(
                  "atlas.startTitle",
                )}
              </h1>

              <p>
                {gameT(
                  "atlas.startDescription",
                )}
              </p>

              {actionError && (
                <div className="atlasError">
                  {actionError}
                </div>
              )}

              {isHost ? (
                <button
                  className="primaryButton atlasMainButton"
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
                    "atlas.startGame",
                  )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              ) : (
                <div className="atlasWaiting">
                  {gameT(
                    "atlas.waitingHost",
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

        <div className="page">
          <div className="centerCard">
            <Trophy size={40} />

            <span className="eyebrow">
              {gameT(
                "atlas.gameComplete",
              )}
            </span>

            <h1>
              {gameT(
                "atlas.finalScores",
              )}
            </h1>

            <div className="atlasScoreboard">
              {sortedPlayers.map(
                (player, index) => (
                  <div
                    key={player.id}
                    className="atlasScoreRow"
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
                className="primaryButton atlasMainButton"
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

                        return;
                      }

                      await backToLobby();
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
                      )}: ${gameT(
                        tournament
                          .nextGameEntry
                          ?.nameKey ?? "",
                      )}`
                  : gameT(
                      "atlas.backToLobby",
                    )}

                <ArrowRight
                  size={18}
                />
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  const locked =
    !!myAnswer || revealed;

  return (
    <>
      <Header />

      <div className="page gamePage">
        <div className="atlasGame">
          <LowTimeBanner
            secondsLeft={secondsLeft}
            roundKey={timeoutKey}
            label={gameT(
              "common.timeRunningOut",
            )}
          />

          {/*
            * Only the turn-based match round has a turn to announce;
            * the other round types are answered by everyone at once.
            */}
          <TurnFlash
            turnKey={
              isMatchRound && myTurn
                ? timeoutKey
                : null
            }
            label={gameT(
              "common.yourTurn",
            )}
            hint={gameT(
              "common.yourTurnHint",
            )}
          />

          <header className="atlasHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.atlas.name",
                ).toUpperCase()}
              </span>

              <strong>
                {gameT(
                  "atlas.round",
                )}{" "}
                {round.roundNumber} /{" "}
                {ROUNDS_PER_GAME}
              </strong>
            </div>

            <div className="atlasHeaderRight">
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

              <div className="atlasScore">
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

          <div className="atlasProgress">
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
            <div className="atlasError">
              {actionError}
            </div>
          )}

          <section className="atlasPanel">
            <div className="atlasTask">
              {gameT(
                promptKeyFor(
                  round.payload,
                ),
              )}
            </div>

            {round.payload.type ===
              "flag_paint" && (
              <FlagPaintRound
                payload={
                  round.payload
                }
                language={
                  gameLanguage
                }
                painted={painted}
                activeColor={
                  activeColor
                }
                onPickColor={
                  setActiveColor
                }
                onPaintRegion={(
                  regionId,
                ) =>
                  setPainted(
                    (previous) => ({
                      ...previous,
                      [regionId]:
                        activeColor,
                    }),
                  )
                }
                onClear={() =>
                  setPainted({})
                }
                disabled={locked}
                revealed={revealed}
                compareLabel={gameT(
                  "atlas.correctFlag",
                )}
              />
            )}

            {round.payload.type ===
              "capital_match" && (
              <CapitalMatchRound
                payload={
                  round.payload
                }
                language={
                  gameLanguage
                }
                placements={
                  placements
                }
                players={players}
                currentPlayerId={
                  round.currentPlayerId
                }
                localPlayerId={
                  localPlayer.id
                }
                playerLives={
                  round.playerLives
                }
                outPlayerIds={
                  round.outPlayerIds
                }
                startingLives={
                  STARTING_LIVES
                }
                onPlace={(
                  countryId,
                  capitalCountryId,
                ) => {
                  void runAction(() =>
                    placeCapital(
                      countryId,
                      capitalCountryId,
                    ),
                  );
                }}
                disabled={working}
                revealed={revealed}
                labels={{
                  yourTurn: gameT(
                    "atlas.yourTurn",
                  ),
                  waitingFor: gameT(
                    "atlas.waitingFor",
                  ),
                  outOfLives: gameT(
                    "atlas.outOfLives",
                  ),
                  placedBy: gameT(
                    "atlas.placedBy",
                  ),
                  dragHint: gameT(
                    "atlas.dragHint",
                  ),
                }}
              />
            )}

            {round.payload.type ===
              "map_choice" && (
              <MapChoiceRound
                payload={
                  round.payload
                }
                language={
                  gameLanguage
                }
                selectedId={choiceId}
                onSelect={setChoiceId}
                disabled={locked}
                revealed={revealed}
                loadingLabel={gameT(
                  "atlas.loadingMap",
                )}
              />
            )}

            {round.payload.type ===
              "map_place" && (
              <MapPlaceRound
                payload={
                  round.payload
                }
                language={
                  gameLanguage
                }
                placements={
                  placements
                }
                players={players}
                currentPlayerId={
                  round.currentPlayerId
                }
                localPlayerId={
                  localPlayer.id
                }
                playerLives={
                  round.playerLives
                }
                outPlayerIds={
                  round.outPlayerIds
                }
                startingLives={
                  STARTING_LIVES
                }
                onPlace={(
                  countryId,
                  placedId,
                ) => {
                  void runAction(() =>
                    placeCapital(
                      countryId,
                      placedId,
                    ),
                  );
                }}
                disabled={working}
                revealed={revealed}
                labels={{
                  yourTurn: gameT(
                    "atlas.yourTurn",
                  ),
                  waitingFor: gameT(
                    "atlas.waitingFor",
                  ),
                  outOfLives: gameT(
                    "atlas.outOfLives",
                  ),
                  placedBy: gameT(
                    "atlas.placedBy",
                  ),
                  dragHint: gameT(
                    "atlas.mapDragHint",
                  ),
                  loading: gameT(
                    "atlas.loadingMap",
                  ),
                }}
              />
            )}

            {(round.payload.type ===
              "flag_choice" ||
              round.payload.type ===
                "country_from_flag" ||
              round.payload.type ===
                "capital_choice") && (
              <ChoiceRound
                payload={
                  round.payload
                }
                language={
                  gameLanguage
                }
                selectedId={
                  choiceId
                }
                onSelect={
                  setChoiceId
                }
                disabled={locked}
                revealed={revealed}
              />
            )}

            {!revealed &&
              isMatchRound && (
                <div className="atlasFound">
                  {myTurn
                    ? gameT(
                        boardDragKey(
                          round.payload,
                        ),
                      )
                    : gameT(
                        "atlas.waitYourTurn",
                      )}
                </div>
              )}

            {!revealed &&
              !isMatchRound && (
              <>
                {myAnswer ? (
                  <div className="atlasLocked">
                    <Check size={16} />

                    {gameT(
                      "atlas.answerLocked",
                    )}
                  </div>
                ) : (
                  <button
                    className="primaryButton atlasMainButton"
                    disabled={
                      working ||
                      !response
                    }
                    onClick={() => {
                      void runAction(
                        submit,
                      );
                    }}
                  >
                    {gameT(
                      "atlas.submit",
                    )}

                    <ArrowRight
                      size={18}
                    />
                  </button>
                )}

                <div className="atlasFound">
                  {answers.length} /{" "}
                  {players.length}{" "}
                  {gameT(
                    "atlas.playersAnswered",
                  )}
                </div>

                {allPlayersAnswered && (
                  <div className="atlasWaiting">
                    {gameT(
                      "common.revealing",
                    )}
                  </div>
                )}
              </>
            )}

            {revealed && (
              <>
                {isMatchRound ? (
                  <div
                    className={`atlasResultBanner ${
                      (solvedByPlayer[
                        localPlayer.id
                      ] ?? 0) > 0
                        ? "correct"
                        : "incorrect"
                    }`}
                  >
                    {gameT(
                      "atlas.youSolved",
                    )}{" "}
                    <strong>
                      {solvedByPlayer[
                        localPlayer.id
                      ] ?? 0}
                    </strong>
                  </div>
                ) : (
                  <div
                    className={`atlasResultBanner ${
                      myAnswer &&
                      myAnswer.correctCount ===
                        myAnswer.totalCount
                        ? "correct"
                        : "incorrect"
                    }`}
                  >
                    {myAnswer ? (
                      <>
                        {gameT(
                          "atlas.youScored",
                        )}{" "}
                        <strong>
                          {
                            myAnswer.correctCount
                          }{" "}
                          /{" "}
                          {
                            myAnswer.totalCount
                          }
                        </strong>

                        {myAnswer.points >
                          0 && (
                          <strong>
                            +
                            {
                              myAnswer.points
                            }
                          </strong>
                        )}
                      </>
                    ) : (
                      gameT(
                        "atlas.noAnswer",
                      )
                    )}
                  </div>
                )}

                <div className="atlasAnswerNote">
                  {!isMatchRound &&
                    gameT(
                      "atlas.correctAnswerWas",
                    )}{" "}
                  {!isMatchRound && (
                    <strong>
                      {answerLabel(
                        round.payload,
                        gameLanguage,
                      )}
                    </strong>
                  )}
                </div>

                <div className="atlasResults">
                  {sortedPlayers.map(
                    (
                      player,
                      rowIndex,
                    ) => {
                      const answer =
                        answers.find(
                          (item) =>
                            item.playerId ===
                            player.id,
                        );

                      return (
                        <div
                          key={
                            player.id
                          }
                          style={
                            {
                              "--rowIndex":
                                rowIndex,
                            } as CSSProperties
                          }
                          className={`atlasResultRow ${
                            (
                              isMatchRound
                                ? (solvedByPlayer[
                                    player.id
                                  ] ?? 0) > 0
                                : answer &&
                                  answer.correctCount ===
                                    answer.totalCount
                            )
                              ? "correct"
                              : ""
                          }`}
                        >
                          <span>
                            {
                              player.name
                            }
                          </span>

                          <span className="atlasResultTally">
                            {isMatchRound
                              ? `${
                                  solvedByPlayer[
                                    player.id
                                  ] ?? 0
                                } / ${
                                  boardCountryIds(
                                    round.payload,
                                  ).length
                                }`
                              : answer
                                ? `${answer.correctCount} / ${answer.totalCount}`
                                : gameT(
                                    "atlas.noAnswer",
                                  )}
                          </span>

                          {!isMatchRound && (
                            <span className="atlasResultPoints">
                              +
                              {answer?.points ??
                                0}
                            </span>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>

                {isHost ? (
                  <button
                    className="primaryButton atlasMainButton"
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
                          "atlas.finishGame",
                        )
                      : gameT(
                          "atlas.nextRound",
                        )}

                    <ArrowRight
                      size={18}
                    />
                  </button>
                ) : (
                  <div className="atlasWaiting">
                    {gameT(
                      "atlas.waitingForHost",
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default AtlasGame;
