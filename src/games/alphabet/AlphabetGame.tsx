import {
  ArrowRight,
  CaseSensitive,
  Check,
  Crown,
  Heart,
  LoaderCircle,
  Shuffle,
  ThumbsDown,
  Trophy,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import Fireworks from "../../components/Fireworks";
import Header from "../../components/Header";
import LowTimeBanner from "../../components/LowTimeBanner";
import TurnFlash from "../../components/TurnFlash";
import {
  getGameRoundCount,
  getGameTimerSeconds,
} from "../../data/gameTimers";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import { useAlphabetRound } from "../../hooks/useAlphabetRound";
import {
  STARTING_LIVES,
  castAlphabetVote,
  createAlphabetRound,
  createAlphabetSession,
  finishAlphabetGame,
  getAlphabetTopics,
  getAlphabetUsedTopicIds,
  passAlphabetTurn,
  resolveAlphabetLetter,
  retractAlphabetVote,
  returnAlphabetRoomToLobby,
  submitAlphabetWord,
} from "../../services/alphabetService";
import { advanceTournament } from "../../services/roomService";
import type {
  AlphabetLetter,
  AlphabetTopic,
} from "../../types/game";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import "../../styles/alphabet.css";
import {
  playReveal,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";

type AlphabetGameProps = {
  roomCode: string;
};

function AlphabetGame({
  roomCode,
}: AlphabetGameProps) {
  const navigate = useNavigate();

  const [localPlayer] =
    useState<Player | null>(
      () => getPlayer(),
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
    topicMode,
    setTopicMode,
  ] = useState<
    "random" | "custom"
  >("random");

  const [
    topicDraft,
    setTopicDraft,
  ] = useState("");

  const [
    topicPool,
    setTopicPool,
  ] = useState<
    AlphabetTopic[]
  >([]);

  const [
    usedTopicIds,
    setUsedTopicIds,
  ] = useState<string[]>([]);

  const [
    randomTopic,
    setRandomTopic,
  ] =
    useState<AlphabetTopic | null>(
      null,
    );

  const [
    selectedLetterId,
    setSelectedLetterId,
  ] = useState<string | null>(
    null,
  );

  const [
    wordDraft,
    setWordDraft,
  ] = useState("");

  const [
    draftRoundId,
    setDraftRoundId,
  ] = useState<
    string | undefined
  >(undefined);

  const [
    secondsLeft,
    setSecondsLeft,
  ] = useState(0);

  const triggeredTurnRef =
    useRef<string | null>(
      null,
    );

  const lowTimeTurnRef =
    useRef<string | null>(
      null,
    );

  const revealedRoundIdRef =
    useRef<string | null>(
      null,
    );

  const {
    room,
    players,
    loading: roomLoading,
    error: roomError,
  } = useRoom(roomCode);

  const ROUNDS_PER_GAME =
    getGameRoundCount(
      room?.gameSettings,
      "alphabet",
    );

  const gameLanguage =
    room?.gameLanguage ?? "en";

  const gameT = (key: string) =>
    translate(gameLanguage, key);

  const {
    session,
    round,
    letters,
    votes,
    loading: roundLoading,
    error: roundError,
  } = useAlphabetRound(room?.id);

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

  const tournament =
    getTournamentStatus(room);

  useEffect(() => {
    let active = true;

    void getAlphabetTopics(
      gameLanguage,
    ).then((topics) => {
      if (active) {
        setTopicPool(topics);
      }
    });

    return () => {
      active = false;
    };
  }, [gameLanguage]);

  useEffect(() => {
    let active = true;

    const loadUsedTopics =
      async () => {
        if (!session?.id) {
          if (active) {
            setUsedTopicIds([]);
          }

          return;
        }

        const ids =
          await getAlphabetUsedTopicIds(
            session.id,
          );

        if (active) {
          setUsedTopicIds(ids);
        }
      };

    void loadUsedTopics();

    return () => {
      active = false;
    };
  }, [session?.id, round?.id]);

  const topicChoices = useMemo(
    () => {
      const unused =
        topicPool.filter(
          (topic) =>
            !usedTopicIds.includes(
              topic.id,
            ),
        );

      return unused.length > 0
        ? unused
        : topicPool;
    },
    [topicPool, usedTopicIds],
  );

  const rollRandomTopic = () => {
    if (
      topicChoices.length === 0
    ) {
      return;
    }

    setRandomTopic(
      topicChoices[
        Math.floor(
          Math.random() *
            topicChoices.length,
        )
      ],
    );
  };

  /*
   * Auto-roll a random topic the first time one
   * becomes available. Math.random() is impure, so
   * this has to stay an effect rather than a
   * render-time adjustment.
   */
  useEffect(() => {
    const pickInitialTopic =
      async () => {
        if (
          topicMode !==
            "random" ||
          randomTopic ||
          topicChoices.length ===
            0
        ) {
          return;
        }

        setRandomTopic(
          topicChoices[
            Math.floor(
              Math.random() *
                topicChoices.length,
            )
          ],
        );
      };

    void pickInitialTopic();
  }, [
    topicMode,
    randomTopic,
    topicChoices,
  ]);

  const selectedTopicText =
    topicMode === "random"
      ? randomTopic?.topic ?? ""
      : topicDraft;

  const selectedTopicId =
    topicMode === "random"
      ? randomTopic?.id ?? null
      : null;

  const renderTopicChooser = (
    inputId: string,
  ) => (
    <div className="alphabetTopicChooser">
      <div className="alphabetTopicModeToggle">
        <button
          type="button"
          className={
            topicMode ===
            "random"
              ? "active"
              : ""
          }
          onClick={() =>
            setTopicMode("random")
          }
        >
          {gameT(
            "alphabet.randomTopic",
          )}
        </button>

        <button
          type="button"
          className={
            topicMode === "custom"
              ? "active"
              : ""
          }
          onClick={() =>
            setTopicMode("custom")
          }
        >
          {gameT(
            "alphabet.customTopic",
          )}
        </button>
      </div>

      {topicMode === "random" ? (
        <div className="alphabetRandomTopic">
          <strong>
            {randomTopic?.topic ??
              gameT(
                "alphabet.noTopicsAvailable",
              )}
          </strong>

          <button
            type="button"
            className="secondaryButton"
            disabled={
              topicChoices.length ===
              0
            }
            onClick={
              rollRandomTopic
            }
          >
            <Shuffle
              size={16}
            />

            {gameT(
              "alphabet.reroll",
            )}
          </button>
        </div>
      ) : (
        <div className="alphabetTopicField">
          <label
            htmlFor={inputId}
          >
            {gameT(
              "alphabet.topicLabel",
            )}
          </label>

          <input
            id={inputId}
            value={topicDraft}
            onChange={(event) =>
              setTopicDraft(
                event.target
                  .value,
              )
            }
            placeholder={gameT(
              "alphabet.topicPlaceholder",
            )}
            autoComplete="off"
          />
        </div>
      )}
    </div>
  );

  const outPlayerIds =
    round?.outPlayerIds ?? [];

  const isLocalPlayerOut =
    !!localPlayer &&
    outPlayerIds.includes(
      localPlayer.id,
    );

  const pendingLetter =
    letters.find(
      (letter) =>
        letter.status ===
        "pending",
    ) ?? null;

  const currentPlayer =
    round
      ? players.find(
          (player) =>
            player.id ===
            round.currentPlayerId,
        )
      : null;

  const isMyTurn =
    !!localPlayer &&
    !pendingLetter &&
    round?.currentPlayerId ===
      localPlayer.id;

  /*
   * A new turn re-arms both alerts: the countdown restarts for the new
   * player, and the flash fires again when that player is you.
   */
  const turnKey = round
    ? `${round.id}:${
        round.currentPlayerId ?? ""
      }`
    : null;

  const myTurnKey =
    isMyTurn && turnKey ? turnKey : null;

  const myVoteOnPending =
    !!localPlayer &&
    !!pendingLetter &&
    votes.some(
      (vote) =>
        vote.letterId ===
          pendingLetter.id &&
        vote.playerId ===
          localPlayer.id,
    );

  const rejectVotesOnPending =
    pendingLetter
      ? votes.filter(
          (vote) =>
            vote.letterId ===
            pendingLetter.id,
        ).length
      : 0;

  const canVoteOnPending =
    !!localPlayer &&
    !!pendingLetter &&
    !isLocalPlayerOut &&
    pendingLetter.claimedBy !==
      localPlayer.id;

  const sortedPlayers =
    useMemo(
      () =>
        [...players].sort(
          (a, b) =>
            b.score - a.score,
        ),
      [players],
    );

  const boardCleared =
    letters.length > 0 &&
    letters.every(
      (letter) =>
        letter.status !==
        "available",
    );

  /*
   * Every letter resolved — the game's own win condition.
   * Keyed on the round so the display fires once, not on every
   * re-render or repeated realtime event.
   */
  const clearedKey =
    boardCleared && round ? round.id : null;

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
    if (
      !room ||
      !isHost ||
      !selectedTopicText.trim()
    ) {
      return;
    }

    let activeSession = session;

    if (!activeSession) {
      activeSession =
        await createAlphabetSession(
          room.id,
        );
    }

    await createAlphabetRound(
      activeSession.id,
      room.id,
      roundNumber,
      players,
      selectedTopicText,
      selectedTopicId,
      getGameTimerSeconds(
        room.gameSettings,
        "alphabet",
      ),
    );

    setTopicDraft("");
    setRandomTopic(null);
  };

  const pickLetter = (
    letter: AlphabetLetter,
  ) => {
    if (
      !isMyTurn ||
      letter.status !==
        "available" ||
      working
    ) {
      return;
    }

    setSelectedLetterId(
      letter.id,
    );
    setWordDraft("");
    setActionError(null);
  };

  const submitWord = async () => {
    if (
      !round ||
      !localPlayer ||
      !selectedLetterId
    ) {
      return;
    }

    const letter = letters.find(
      (item) =>
        item.id ===
        selectedLetterId,
    );

    if (!letter) {
      return;
    }

    await submitAlphabetWord(
      round,
      letter,
      localPlayer.id,
      wordDraft,
    );

    setSelectedLetterId(null);
    setWordDraft("");
  };

  const toggleVote = async () => {
    if (
      !round ||
      !localPlayer ||
      !pendingLetter
    ) {
      return;
    }

    if (myVoteOnPending) {
      await retractAlphabetVote(
        pendingLetter.id,
        localPlayer.id,
      );
    } else {
      await castAlphabetVote(
        round.id,
        pendingLetter.id,
        localPlayer.id,
      );
    }
  };

  const nextRound = async () => {
    if (
      !round ||
      !isHost ||
      !session
    ) {
      return;
    }

    if (
      round.roundNumber >=
      ROUNDS_PER_GAME
    ) {
      await finishAlphabetGame(
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

    await returnAlphabetRoomToLobby(
      room.id,
    );
  };

  /*
   * Clear the letter-picking draft whenever a new
   * round arrives, adjusted during render (not in
   * an effect) so it lands before this same render
   * paints a stale selection from the previous
   * round.
   */
  if (
    round?.id !== draftRoundId
  ) {
    setDraftRoundId(round?.id);
    setSelectedLetterId(null);
    setWordDraft("");
    setRandomTopic(null);
  }

  useEffect(() => {
    if (
      !round ||
      round.status !==
        "playing" ||
      !round.turnEndsAt
    ) {
      return;
    }

    const turnKey = `${round.id}:${
      pendingLetter
        ? pendingLetter.id
        : round.currentPlayerId
    }:${round.turnEndsAt}`;

    const updateTimer = () => {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (new Date(
              round.turnEndsAt as string,
            ).getTime() -
              Date.now()) /
              1000,
          ),
        );

      setSecondsLeft(remaining);

      if (
        remaining > 0 &&
        remaining <= 5 &&
        lowTimeTurnRef.current !==
          turnKey
      ) {
        lowTimeTurnRef.current =
          turnKey;

        playTick();
      }

      if (
        remaining === 0 &&
        isHost &&
        triggeredTurnRef.current !==
          turnKey
      ) {
        triggeredTurnRef.current =
          turnKey;

        if (pendingLetter) {
          void resolveAlphabetLetter(
            round,
            pendingLetter,
            players,
            rejectVotesOnPending,
            getGameTimerSeconds(
              room?.gameSettings,
              "alphabet",
            ),
          );
        } else {
          void passAlphabetTurn(
            round,
            players,
            getGameTimerSeconds(
              room?.gameSettings,
              "alphabet",
            ),
          );
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
    pendingLetter,
    rejectVotesOnPending,
    isHost,
    players,
    room?.gameSettings,
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

    playReveal();
  }, [round]);

  useEffect(() => {
    if (
      room?.status === "lobby"
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
        "alphabet"
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

  if (
    room?.status === "lobby"
  ) {
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
                "alphabet.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "alphabet.joinAgain",
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
                "alphabet.loading",
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
                "alphabet.loadError",
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
        <div className="alphabetGame">
          <section className="alphabetStart">
            <div className="alphabetHeroIcon">
              <CaseSensitive
                size={42}
              />
            </div>

            <span className="eyebrow">
              {gameT(
                "games.alphabet.name",
              ).toUpperCase()}
            </span>

            <h1>
              {gameT(
                "alphabet.startTitle",
              )}
            </h1>

            <p>
              {gameT(
                "alphabet.startDescription",
              )}
            </p>

            {isHost ? (
              <>
                {renderTopicChooser(
                  "alphabetTopic",
                )}

                <button
                  className="primaryButton alphabetMainButton"
                  type="button"
                  disabled={
                    working ||
                    !selectedTopicText.trim()
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
                    "lobby.start",
                  )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              </>
            ) : (
              <div className="alphabetWaiting">
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

  if (
    round.status === "finished"
  ) {
    return (
      <>
        <Header />

        <div className="page gamePage">
        <div className="alphabetGame">
          <section className="alphabetStart">
            <div className="alphabetHeroIcon">
              <Trophy size={42} />
            </div>

            <span className="eyebrow">
              {gameT(
                "alphabet.gameComplete",
              )}
            </span>

            <h1>
              {gameT(
                "alphabet.finalScores",
              )}
            </h1>

            <div className="alphabetScoreboard">
              {sortedPlayers.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    key={
                      player.id
                    }
                    className="alphabetScoreRow"
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
                className="primaryButton alphabetMainButton"
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
                      "alphabet.backToLobby",
                    )}

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="alphabetWaiting">
                {gameT(
                  "alphabet.waitingForHost",
                )}
              </div>
            )}
          </section>
        </div>
        </div>
      </>
    );
  }

  if (round.status === "reveal") {
    const isLastRound =
      round.roundNumber >=
      ROUNDS_PER_GAME;

    return (
      <>
        <Header />

        <div className="page gamePage">
        <div className="alphabetGame">
          <Fireworks
            triggerKey={clearedKey}
          />

          <LowTimeBanner
                      secondsLeft={secondsLeft}
                      roundKey={turnKey}
                      label={gameT(
                        "common.timeRunningOut",
                      )}
                    />

                    <TurnFlash
                      turnKey={myTurnKey}
                      label={gameT(
                        "common.yourTurn",
                      )}
                      hint={gameT(
                        "common.yourTurnHint",
                      )}
                    />

          <header className="alphabetHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.alphabet.name",
                ).toUpperCase()}
              </span>

              <strong>
                {gameT(
                  "bluff.round",
                )}{" "}
                {
                  round.roundNumber
                }{" "}
                /{" "}
                {ROUNDS_PER_GAME}
              </strong>
            </div>
          </header>

          <section className="alphabetPanel">
            <div className="alphabetTopic">
              {round.topic}
            </div>

            <h1>
              {gameT(
                "alphabet.roundComplete",
              )}
            </h1>

            <div className="alphabetGrid">
              {letters.map(
                (letter) => (
                  <div
                    key={
                      letter.id
                    }
                    className={`alphabetTile ${
                      letter.status
                    }`}
                  >
                    <strong>
                      {
                        letter.letter
                      }
                    </strong>

                    {letter.word && (
                      <span>
                        {
                          letter.word
                        }
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>

            <div className="alphabetRoundResult">
              <div className="alphabetResultIcon">
                {boardCleared ? (
                  <Check
                    size={28}
                  />
                ) : (
                  <X size={28} />
                )}
              </div>

              <div>
                <strong>
                  {boardCleared
                    ? gameT(
                        "alphabet.alphabetCleared",
                      )
                    : gameT(
                        "alphabet.everyoneOut",
                      )}
                </strong>

                <span>
                  {gameT(
                    "alphabet.allAnswersRevealed",
                  )}
                </span>
              </div>
            </div>

            {isHost ? (
              <>
                {!isLastRound &&
                  renderTopicChooser(
                    "alphabetNextTopic",
                  )}

                <button
                  className="primaryButton alphabetMainButton"
                  disabled={
                    working ||
                    (!isLastRound &&
                      !selectedTopicText.trim())
                  }
                  onClick={() => {
                    void runAction(
                      nextRound,
                    );
                  }}
                >
                  {isLastRound
                    ? gameT(
                        "alphabet.finishGame",
                      )
                    : gameT(
                        "alphabet.nextRound",
                      )}

                  <ArrowRight
                    size={18}
                  />
                </button>
              </>
            ) : (
              <div className="alphabetWaiting">
                {gameT(
                  "alphabet.waitingForHost",
                )}
              </div>
            )}
          </section>
        </div>
        </div>
      </>
    );
  }

  const myScore =
    players.find(
      (player) =>
        player.id ===
        localPlayer.id,
    )?.score ?? 0;

  return (
    <>
      <Header />

      <div className="page gamePage">
      <div className="alphabetGame">
        <LowTimeBanner
                    secondsLeft={secondsLeft}
                    roundKey={turnKey}
                    label={gameT(
                      "common.timeRunningOut",
                    )}
                  />

                  <TurnFlash
                    turnKey={myTurnKey}
                    label={gameT(
                      "common.yourTurn",
                    )}
                    hint={gameT(
                      "common.yourTurnHint",
                    )}
                  />

        <header className="alphabetHeader">
          <div>
            <span className="eyebrow">
              {gameT(
                "games.alphabet.name",
              ).toUpperCase()}
            </span>

            <strong>
              {gameT(
                "bluff.round",
              )}{" "}
              {
                round.roundNumber
              }{" "}
              /{" "}
              {ROUNDS_PER_GAME}
            </strong>
          </div>

          <div className="alphabetHeaderRight">
            <div
              className={`gameTimerBadge ${
                secondsLeft <= 10
                  ? "gameTimerBadgeLow"
                  : ""
              }`}
            >
              {secondsLeft}s
            </div>

            <div className="alphabetScore">
              <Crown size={17} />

              {myScore.toLocaleString()}
            </div>
          </div>
        </header>

        <div className="alphabetProgress">
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
          <div className="alphabetError">
            {actionError}
          </div>
        )}

        <section className="alphabetPanel">
          <div className="alphabetTopic">
            {round.topic}
          </div>

          <div className="alphabetLives">
            {players.map(
              (player) => {
                const lives =
                  round
                    .playerLives[
                    player.id
                  ] ??
                  STARTING_LIVES;

                const isOut =
                  outPlayerIds.includes(
                    player.id,
                  );

                const isCurrent =
                  player.id ===
                  round.currentPlayerId;

                return (
                  <div
                    key={
                      player.id
                    }
                    className={`alphabetLifeRow ${
                      isOut
                        ? "out"
                        : ""
                    } ${
                      isCurrent
                        ? "current"
                        : ""
                    }`}
                  >
                    <span>
                      {
                        player.name
                      }
                    </span>

                    <span className="alphabetHearts">
                      {Array.from(
                        {
                          length:
                            STARTING_LIVES,
                        },
                      ).map(
                        (
                          _,
                          index,
                        ) => (
                          <Heart
                            key={
                              index
                            }
                            size={
                              13
                            }
                            className={
                              index <
                              lives
                                ? "filled"
                                : ""
                            }
                            fill={
                              index <
                              lives
                                ? "currentColor"
                                : "none"
                            }
                          />
                        ),
                      )}
                    </span>
                  </div>
                );
              },
            )}
          </div>

          {pendingLetter ? (
            <div className="alphabetPending">
              <span>
                {
                  players.find(
                    (player) =>
                      player.id ===
                      pendingLetter.claimedBy,
                  )?.name ??
                  gameT(
                    "common.player",
                  )}{" "}
                —{" "}
                {
                  pendingLetter.letter
                }
              </span>

              <div className="alphabetPendingWord">
                {
                  pendingLetter.word
                }
              </div>

              {canVoteOnPending && (
                <button
                  type="button"
                  className={`alphabetVoteButton ${
                    myVoteOnPending
                      ? "active"
                      : ""
                  }`}
                  disabled={
                    working
                  }
                  onClick={() => {
                    void runAction(
                      toggleVote,
                    );
                  }}
                >
                  <ThumbsDown
                    size={16}
                  />

                  {gameT(
                    "alphabet.voteInvalid",
                  )}{" "}
                  (
                  {
                    rejectVotesOnPending
                  }
                  )
                </button>
              )}
            </div>
          ) : (
            <div
              className={`alphabetTurn ${
                isMyTurn
                  ? "alphabetMyTurn"
                  : ""
              }`}
            >
              {isLocalPlayerOut ? (
                gameT(
                  "alphabet.youAreOut",
                )
              ) : isMyTurn ? (
                gameT(
                  "alphabet.yourTurn",
                )
              ) : (
                <>
                  {gameT(
                    "alphabet.waitingFor",
                  )}{" "}
                  <strong>
                    {currentPlayer?.name ??
                      gameT(
                        "common.player",
                      )}
                  </strong>
                </>
              )}
            </div>
          )}

          {isMyTurn &&
            selectedLetterId && (
              <div className="alphabetComposeForm">
                <input
                  autoFocus
                  value={wordDraft}
                  onChange={(
                    event,
                  ) =>
                    setWordDraft(
                      event.target
                        .value,
                    )
                  }
                  placeholder={`${
                    letters.find(
                      (item) =>
                        item.id ===
                        selectedLetterId,
                    )?.letter ??
                    ""
                  }...`}
                  autoComplete="off"
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      void runAction(
                        submitWord,
                      );
                    }
                  }}
                />

                <button
                  className="primaryButton"
                  type="button"
                  disabled={
                    working ||
                    !wordDraft.trim()
                  }
                  onClick={() => {
                    void runAction(
                      submitWord,
                    );
                  }}
                >
                  <Check
                    size={18}
                  />
                </button>
              </div>
            )}

          <div className="alphabetGrid">
            {letters.map(
              (letter) => (
                <button
                  key={letter.id}
                  type="button"
                  disabled={
                    letter.status !==
                      "available" ||
                    !isMyTurn ||
                    working
                  }
                  className={`alphabetTile ${letter.status}`}
                  onClick={() =>
                    pickLetter(
                      letter,
                    )
                  }
                >
                  <strong>
                    {letter.letter}
                  </strong>

                  {letter.word && (
                    <span>
                      {letter.word}
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        </section>
      </div>
      </div>
    </>
  );
}

export default AlphabetGame;
