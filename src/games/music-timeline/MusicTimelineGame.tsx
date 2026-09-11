import {
  ArrowRight,
  Check,
  Crown,
  LoaderCircle,
  Music2,
  Pause,
  Play,
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
import {
  getTrack,
  searchTrack,
} from "../../lib/spotifyApi";
import {
  beginSpotifyLogin,
  getSpotifyToken,
} from "../../lib/spotifyAuth";
import { useMusicRound } from "../../hooks/useMusicRound";
import { useRoom } from "../../hooks/useRoom";
import { useSpotifyHost } from "../../hooks/useSpotifyHost";
import {
  createMusicRound,
  createMusicSession,
  dealStarterCards,
  finishMusicGame,
  gameWinner,
  nextMusicRound,
  placeMusicCard,
  returnMusicRoomToLobby,
  slotBounds,
  timelineFor,
} from "../../services/musicService";
import { advanceTournament } from "../../services/roomService";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import {
  playCorrect,
  playIncorrect,
  playTick,
} from "../../utils/sounds";
import { getTournamentStatus } from "../../utils/tournament";
import "../../styles/music.css";

type MusicTimelineGameProps = {
  roomCode: string;
};

function MusicTimelineGame({
  roomCode,
}: MusicTimelineGameProps) {
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

  const [playing, setPlaying] =
    useState(false);

  const timedOutRoundRef =
    useRef<string | null>(null);

  const lowTimeRoundRef =
    useRef<string | null>(null);

  const loadedTrackRoundRef =
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
    songsById,
    pool,
    cards,
    placement,
    loading: roundLoading,
    error: roundError,
  } = useMusicRound(
    room?.id,
    gameLanguage,
  );

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

  const spotify =
    useSpotifyHost(isHost);

  const tournament =
    getTournamentStatus(room);

  const turnSeconds =
    getGameTimerSeconds(
      room?.gameSettings,
      "music-timeline",
    );

  /* The lobby's round count is this game's finish line, in cards. */
  const targetCards =
    getGameRoundCount(
      room?.gameSettings,
      "music-timeline",
    );

  const playerIds = useMemo(
    () => players.map((p) => p.id),
    [players],
  );

  const song = round
    ? (songsById.get(
        round.songId,
      ) ?? null)
    : null;

  const isMyTurn =
    !!localPlayer &&
    !!round &&
    round.status === "placing" &&
    round.currentPlayerId ===
      localPlayer.id;

  const turnPlayerId =
    round?.currentPlayerId ?? null;

  /* The timeline being played into, which is the turn player's own. */
  const timeline = useMemo(
    () =>
      timelineFor(
        cards.filter(
          (card) =>
            card.playerId ===
            turnPlayerId,
        ),
        songsById,
      ),
    [cards, songsById, turnPlayerId],
  );

  const revealed =
    round?.status === "reveal";

  const winnerId = useMemo(
    () =>
      gameWinner(cards, targetCards),
    [cards, targetCards],
  );

  const nameFor = useCallback(
    (playerId: string | null) =>
      players.find(
        (player) =>
          player.id === playerId,
      )?.name ?? "",
    [players],
  );

  const cardCounts = useMemo(() => {
    const counts = new Map<
      string,
      number
    >();

    for (const card of cards) {
      counts.set(
        card.playerId,
        (counts.get(card.playerId) ??
          0) + 1,
      );
    }

    return counts;
  }, [cards]);

  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) =>
          (cardCounts.get(b.id) ?? 0) -
            (cardCounts.get(a.id) ??
              0) ||
          b.score - a.score,
      ),
    [players, cardCounts],
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

  const startGame = async () => {
    if (!room || !isHost) {
      return;
    }

    const activeSession =
      session ??
      (await createMusicSession(
        room.id,
      ));

    await dealStarterCards(
      activeSession.id,
      playerIds,
      pool,
    );

    const created =
      await createMusicRound(
        activeSession.id,
        room.id,
        1,
        playerIds,
        pool,
        turnSeconds,
      );

    if (!created) {
      throw new Error(
        gameT("music.cannotStart"),
      );
    }
  };

  const place = useCallback(
    async (slotIndex: number) => {
      if (
        !round ||
        !song ||
        !localPlayer ||
        round.currentPlayerId !==
          localPlayer.id ||
        round.status !== "placing"
      ) {
        return;
      }

      const correct =
        await placeMusicCard(
          round,
          localPlayer.id,
          slotIndex,
          timeline,
          song,
        );

      if (correct) {
        playCorrect();
      } else {
        playIncorrect();
      }
    },
    [
      round,
      song,
      localPlayer,
      timeline,
    ],
  );

  const advance = async () => {
    if (!round || !isHost) {
      return;
    }

    if (winnerId || !session) {
      if (session) {
        await finishMusicGame(
          round.id,
          session.id,
        );
      }

      return;
    }

    await nextMusicRound(
      round,
      playerIds,
      pool,
      turnSeconds,
    );
  };

  const backToLobby = async () => {
    if (!room || !isHost) {
      return;
    }

    await returnMusicRoomToLobby(
      room.id,
    );
  };

  /*
   * The host's browser is the speaker. It resolves the recording once per
   * round and starts it; nobody else loads Spotify at all.
   */
  useEffect(() => {
    if (
      !isHost ||
      !round ||
      !song ||
      round.status !== "placing" ||
      !spotify.canPlay ||
      loadedTrackRoundRef.current ===
        round.id
    ) {
      return;
    }

    loadedTrackRoundRef.current =
      round.id;

    const start = async () => {
      const token =
        await getSpotifyToken();

      if (!token) {
        return;
      }

      const track =
        song.spotifyTrackId
          ? await getTrack(
              token,
              song.spotifyTrackId,
            )
          : await searchTrack(
              token,
              song.title,
              song.artist,
            );

      if (!track) {
        return;
      }

      /*
       * Start a little way in. The opening seconds of a track are often
       * silence or an intro that gives nothing away.
       */
      const offset = Math.min(
        30_000,
        Math.floor(
          track.durationMs * 0.25,
        ),
      );

      const started =
        await spotify.play(
          track.uri,
          offset,
        );

      setPlaying(started);
    };

    void start().catch(() => {
      /* Silence here is the fallback: the round plays without audio. */
    });
  }, [isHost, round, song, spotify]);

  /* Stop the music the moment the answer is on screen. */
  useEffect(() => {
    if (
      !isHost ||
      !revealed ||
      !spotify.canPlay
    ) {
      return;
    }

    void spotify.pause();
  }, [isHost, revealed, spotify]);

  useEffect(() => {
    if (
      !round ||
      round.status !== "placing" ||
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

      /*
       * The player on turn settles their own timeout, so the placement is
       * written by the browser that owns the turn rather than racing the
       * host for it.
       */
      if (
        remaining === 0 &&
        isMyTurn &&
        timedOutRoundRef.current !==
          round.id
      ) {
        timedOutRoundRef.current =
          round.id;

        void place(-1);
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
  }, [round, isMyTurn, place]);

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
        "music-timeline"
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
                "music.noPlayerTitle",
              )}
            </h1>

            <p>
              {gameT(
                "music.joinAgain",
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
              {gameT("music.loading")}
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
                "music.loadError",
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

  const spotifyPanel = isHost ? (
    <div
      className={`musicSpotify status-${spotify.status}`}
    >
      <Music2 size={16} />

      <span className="musicSpotifyText">
        {gameT(
          `music.spotify.${spotify.status}`,
        )}
      </span>

      {spotify.status ===
        "disconnected" && (
        <button
          className="musicSpotifyButton"
          type="button"
          onClick={() => {
            void beginSpotifyLogin(
              `${window.location.pathname}${window.location.search}`,
            ).catch(
              (caught: unknown) => {
                setActionError(
                  caught instanceof
                    Error
                    ? caught.message
                    : null,
                );
              },
            );
          }}
        >
          {gameT("music.connect")}
        </button>
      )}

      {(spotify.status === "error" ||
        spotify.status ===
          "no_premium") && (
        <button
          className="musicSpotifyButton"
          type="button"
          onClick={spotify.retry}
        >
          {gameT("music.tryAgain")}
        </button>
      )}

      {spotify.status === "ready" && (
        <button
          className="musicSpotifyButton"
          type="button"
          onClick={spotify.disconnect}
        >
          {gameT("music.disconnect")}
        </button>
      )}
    </div>
  ) : null;

  if (!round) {
    return (
      <>
        <Header />

        <div className="page gamePage">
          <div className="musicGame">
            <section className="musicStart">
              <div className="musicHeroIcon">
                <Music2 size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "games.musicTimeline.name",
                ).toUpperCase()}
              </span>

              <h1>
                {gameT(
                  "music.startTitle",
                )}
              </h1>

              <p>
                {gameT(
                  "music.startDescription",
                )}
              </p>

              {spotifyPanel}

              {isHost ? (
                <>
                  {actionError && (
                    <div className="musicError">
                      {actionError}
                    </div>
                  )}

                  <button
                    className="primaryButton musicMainButton"
                    type="button"
                    disabled={
                      working ||
                      pool.length === 0
                    }
                    onClick={() => {
                      void runAction(
                        startGame,
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
                <div className="musicWaiting">
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
          <div className="musicGame">
            <section className="musicStart">
              <div className="musicHeroIcon">
                <Trophy size={42} />
              </div>

              <span className="eyebrow">
                {gameT(
                  "music.gameComplete",
                )}
              </span>

              <h1>
                {gameT(
                  "music.finalScores",
                )}
              </h1>

              <div className="musicScoreboard">
                {sortedPlayers.map(
                  (player, index) => (
                    <div
                      key={player.id}
                      className="musicScoreRow"
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

                      <em>
                        {cardCounts.get(
                          player.id,
                        ) ?? 0}{" "}
                        {gameT(
                          "music.cards",
                        )}
                      </em>

                      <b>
                        {player.score.toLocaleString()}
                      </b>
                    </div>
                  ),
                )}
              </div>

              {isHost && (
                <button
                  className="primaryButton musicMainButton"
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
                        "music.backToLobby",
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

  if (!song) {
    return (
      <>
        <Header />

        <div className="page">
          <div className="centerCard">
            <h1>
              {gameT(
                "music.songMissing",
              )}
            </h1>
          </div>
        </div>
      </>
    );
  }

  /*
   * With audio the song is a mystery and the year is the whole puzzle.
   * Without it there is nothing to go on, so the title is shown instead
   * and the game becomes "when was this released" — still playable.
   */
  const hidden =
    spotify.canPlay && !revealed;

  const myCards =
    cardCounts.get(localPlayer.id) ??
    0;

  return (
    <>
      <Header />

      <div className="page gamePage">
        <div className="musicGame">
          <LowTimeBanner
            secondsLeft={secondsLeft}
            roundKey={round.id}
            label={gameT(
              "common.timeRunningOut",
            )}
          />

          {isMyTurn && (
            <TurnFlash
              turnKey={round.id}
              label={gameT(
                "music.yourTurn",
              )}
              hint={gameT(
                "music.yourTurnHint",
              )}
            />
          )}

          <header className="musicHeader">
            <div>
              <span className="eyebrow">
                {gameT(
                  "games.musicTimeline.name",
                ).toUpperCase()}
              </span>

              <strong>
                {myCards} /{" "}
                {targetCards}{" "}
                {gameT("music.cards")}
              </strong>
            </div>

            <div className="musicHeaderRight">
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

              <div className="musicScore">
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

          {spotifyPanel}

          {actionError && (
            <div className="musicError">
              {actionError}
            </div>
          )}

          <section className="musicPanel">
            <div className="musicTurnOf">
              {isMyTurn
                ? gameT("music.yourGo")
                : `${nameFor(
                    turnPlayerId,
                  )} ${gameT(
                    "music.isPlacing",
                  )}`}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={round.id}
                className={`musicCard ${
                  revealed
                    ? "isRevealed"
                    : ""
                }`}
                variants={phaseVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {hidden ? (
                  <>
                    <Music2 size={34} />

                    <span className="musicCardHint">
                      {gameT(
                        "music.listening",
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <strong className="musicCardTitle">
                      {song.title}
                    </strong>

                    <span className="musicCardArtist">
                      {song.artist}
                    </span>
                  </>
                )}

                {revealed && (
                  <span className="musicCardYear">
                    {song.releaseYear}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>

            {isHost &&
              spotify.canPlay &&
              !revealed && (
                <button
                  className="musicPlayButton"
                  type="button"
                  onClick={() => {
                    if (playing) {
                      void spotify.pause();

                      setPlaying(false);
                    } else {
                      loadedTrackRoundRef.current =
                        null;

                      setPlaying(true);
                    }
                  }}
                >
                  {playing ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}

                  {gameT(
                    playing
                      ? "music.pause"
                      : "music.replay",
                  )}
                </button>
              )}

            {revealed && placement && (
              <div
                className={`musicResult ${
                  placement.isCorrect
                    ? "correct"
                    : ""
                }`}
              >
                {placement.isCorrect ? (
                  <Check size={18} />
                ) : (
                  <X size={18} />
                )}

                {placement.isCorrect
                  ? `${nameFor(
                      placement.playerId,
                    )} ${gameT(
                      "music.gotIt",
                    )}`
                  : `${nameFor(
                      placement.playerId,
                    )} ${gameT(
                      "music.missedIt",
                    )}`}

                {placement.points >
                  0 && (
                  <b>
                    +
                    {placement.points.toLocaleString()}
                  </b>
                )}
              </div>
            )}

            <div className="musicTimeline">
              <span className="musicTimelineOwner">
                {isMyTurn
                  ? gameT(
                      "music.yourTimeline",
                    )
                  : `${gameT(
                      "music.timelineOf",
                    )} ${nameFor(
                      turnPlayerId,
                    )}`}
              </span>

              {Array.from({
                length:
                  timeline.length + 1,
              }).map((_, slotIndex) => {
                const {
                  after,
                  before,
                } = slotBounds(
                  timeline,
                  slotIndex,
                );

                const label =
                  after === null
                    ? `${gameT(
                        "music.before",
                      )} ${before}`
                    : before === null
                      ? `${gameT(
                          "music.after",
                        )} ${after}`
                      : `${after} – ${before}`;

                const chosen =
                  revealed &&
                  placement?.slotIndex ===
                    slotIndex;

                return (
                  <div
                    key={`slot-${slotIndex}`}
                    className="musicSlotRow"
                  >
                    <button
                      type="button"
                      className={[
                        "musicSlot",
                        chosen
                          ? placement?.isCorrect
                            ? "chosenRight"
                            : "chosenWrong"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={
                        !isMyTurn ||
                        working ||
                        revealed
                      }
                      onClick={() => {
                        void runAction(
                          () =>
                            place(
                              slotIndex,
                            ),
                        );
                      }}
                    >
                      {label}
                    </button>

                    {slotIndex <
                      timeline.length && (
                      <div className="musicTimelineCard">
                        <b>
                          {
                            timeline[
                              slotIndex
                            ]!.releaseYear
                          }
                        </b>

                        <span className="musicTimelineTitle">
                          {
                            timeline[
                              slotIndex
                            ]!.title
                          }
                        </span>

                        <span className="musicTimelineArtist">
                          {
                            timeline[
                              slotIndex
                            ]!.artist
                          }
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="musicStandings">
            {sortedPlayers.map(
              (player) => (
                <div
                  key={player.id}
                  className={`musicStandingRow ${
                    player.id ===
                    turnPlayerId
                      ? "isTurn"
                      : ""
                  }`}
                >
                  <span className="musicStandingName">
                    {player.name}
                  </span>

                  <b>
                    {cardCounts.get(
                      player.id,
                    ) ?? 0}
                  </b>
                </div>
              ),
            )}
          </div>

          {revealed && isHost && (
            <button
              className="primaryButton musicMainButton"
              disabled={working}
              onClick={() => {
                void runAction(advance);
              }}
            >
              {winnerId
                ? gameT(
                    "music.seeResults",
                  )
                : gameT(
                    "music.nextRound",
                  )}

              <ArrowRight size={18} />
            </button>
          )}

          {revealed && !isHost && (
            <div className="musicWaiting">
              {gameT(
                "music.waitingForHost",
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default MusicTimelineGame;
