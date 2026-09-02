import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  LoaderCircle,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import { useHigherLowerRound } from "../../hooks/useHigherLowerRound";
import {
  type HigherLowerDifficulty,
  createHigherLowerRound,
  createHigherLowerSession,
  finishHigherLowerGame,
  getHigherLowerUsedItemIds,
  returnHigherLowerRoomToLobby,
  revealHigherLowerRound,
  submitHigherLowerGuess,
} from "../../services/higherLowerService";
import type { HigherLowerRound } from "../../types/game";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import "../../styles/higherLower.css";

const ROUNDS_PER_GAME = 8;

type HigherLowerGameProps = {
  roomCode: string;
};

function HigherLowerGame({
  roomCode,
}: HigherLowerGameProps) {
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
    useState<HigherLowerDifficulty>(
      "mixed",
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
    currentItem,
    nextItem,
    guesses,
    loading: roundLoading,
    error: roundError,
  } = useHigherLowerRound(
    room?.id,
    gameLanguage,
  );

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

  const myGuess = useMemo(
    () =>
      localPlayer
        ? guesses.find(
            (guess) =>
              guess.playerId ===
              localPlayer.id,
          ) ?? null
        : null,
    [guesses, localPlayer],
  );

  const allPlayersGuessed =
    players.length > 0 &&
    guesses.length >= players.length;

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
    previousRound: HigherLowerRound | null,
  ) => {
    if (!room || !isHost) {
      return;
    }

    let activeSession = session;

    if (!activeSession) {
      activeSession =
        await createHigherLowerSession(
          room.id,
          difficulty,
        );
    }

    const usedIds =
      await getHigherLowerUsedItemIds(
        activeSession.id,
      );

    const result =
      await createHigherLowerRound(
        activeSession.id,
        room.id,
        roundNumber,
        previousRound,
        usedIds,
        room.gameLanguage,
        activeSession.difficulty,
      );

    if (!result) {
      throw new Error(
        gameT("higherLower.itemsExhausted"),
      );
    }
  };

  const submitGuess = async (
    guess: "higher" | "lower",
  ) => {
    if (
      !round ||
      !localPlayer ||
      myGuess
    ) {
      return;
    }

    await submitHigherLowerGuess(
      round,
      localPlayer.id,
      guess,
    );
  };

  const reveal = async () => {
    if (
      !round ||
      !isHost ||
      !currentItem ||
      !nextItem ||
      !allPlayersGuessed
    ) {
      return;
    }

    await revealHigherLowerRound(
      round,
      currentItem,
      nextItem,
      guesses,
    );
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

      await finishHigherLowerGame(
        round.id,
        session.id,
      );

      return;
    }

    await startRound(
      round.roundNumber + 1,
      round,
    );
  };

  const backToLobby = async () => {
    if (!room || !isHost) {
      return;
    }

    await returnHigherLowerRoomToLobby(
      room.id,
    );
  };

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
              "higherLower.noPlayerTitle",
            )}
          </h1>

          <p>
            {gameT(
              "higherLower.joinAgain",
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
            {gameT("higherLower.loading")}
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
              "higherLower.loadError",
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
        <div className="higherLowerGame">
          <section className="higherLowerStart">
            <div className="higherLowerHeroIcon">
              <TrendingUp size={42} />
            </div>

            <span className="eyebrow">
              {gameT(
                "games.higherLower.name",
              ).toUpperCase()}
            </span>

            <h1>
              {gameT(
                "higherLower.startTitle",
              )}
            </h1>

            <p>
              {gameT(
                "higherLower.startDescription",
              )}
            </p>

            {isHost ? (
              <>
                <div className="higherLowerDifficulty">
                  <label htmlFor="higherLowerDifficulty">
                    {gameT(
                      "higherLower.difficulty",
                    )}
                  </label>

                  <select
                    id="higherLowerDifficulty"
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(
                        event.target
                          .value as HigherLowerDifficulty,
                      )
                    }
                  >
                    <option value="mixed">
                      {gameT(
                        "higherLower.difficultyMixed",
                      )}
                    </option>

                    <option value="easy">
                      {gameT(
                        "higherLower.difficultyEasy",
                      )}
                    </option>

                    <option value="medium">
                      {gameT(
                        "higherLower.difficultyMedium",
                      )}
                    </option>

                    <option value="hard">
                      {gameT(
                        "higherLower.difficultyHard",
                      )}
                    </option>
                  </select>
                </div>

                {actionError && (
                  <div className="higherLowerError">
                    {actionError}
                  </div>
                )}

                <button
                  className="primaryButton higherLowerMainButton"
                  type="button"
                  disabled={working}
                  onClick={() => {
                    void runAction(() =>
                      startRound(1, null),
                    );
                  }}
                >
                  {gameT("lobby.start")}

                  <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <div className="higherLowerWaiting">
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
        <div className="higherLowerGame">
          <section className="higherLowerStart">
            <div className="higherLowerHeroIcon">
              <Trophy size={42} />
            </div>

            <span className="eyebrow">
              {gameT(
                "higherLower.gameComplete",
              )}
            </span>

            <h1>
              {gameT(
                "higherLower.finalScores",
              )}
            </h1>

            <div className="higherLowerScoreboard">
              {sortedPlayers.map(
                (player, index) => (
                  <div
                    key={player.id}
                    className="higherLowerScoreRow"
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
                className="primaryButton higherLowerMainButton"
                disabled={working}
                onClick={() => {
                  void runAction(
                    backToLobby,
                  );
                }}
              >
                {gameT(
                  "higherLower.backToLobby",
                )}

                <ArrowRight size={18} />
              </button>
            ) : (
              <div className="higherLowerWaiting">
                {gameT(
                  "higherLower.waitingForHost",
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (!currentItem || !nextItem) {
    return (
      <div className="page">
        <div className="centerCard">
          <LoaderCircle size={30} />

          <h1>
            {gameT(
              "higherLower.itemsMissing",
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
      <div className="higherLowerGame">
        <header className="higherLowerHeader">
          <div>
            <span className="eyebrow">
              {gameT(
                "games.higherLower.name",
              ).toUpperCase()}
            </span>

            <strong>
              {gameT("bluff.round")}{" "}
              {round.roundNumber} /{" "}
              {ROUNDS_PER_GAME}
            </strong>
          </div>

          <div className="higherLowerScore">
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

        <div className="higherLowerProgress">
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
          <div className="higherLowerError">
            {actionError}
          </div>
        )}

        <section className="higherLowerPanel">
          <div className="higherLowerCompare">
            <div className="higherLowerCard">
              {currentItem.category && (
                <span className="higherLowerBadge">
                  {currentItem.category}
                </span>
              )}

              <span className="higherLowerLabel">
                {gameT(
                  "higherLower.current",
                )}
              </span>

              <h2>
                {currentItem.label}
              </h2>

              <div className="higherLowerValue">
                {currentItem.value.toLocaleString(
                  gameLanguage,
                )}

                {currentItem.unit && (
                  <span>
                    {" "}
                    {currentItem.unit}
                  </span>
                )}
              </div>
            </div>

            <div className="higherLowerVs">
              <TrendingUp size={22} />
            </div>

            <div className="higherLowerCard">
              {nextItem.category && (
                <span className="higherLowerBadge">
                  {nextItem.category}
                </span>
              )}

              <span className="higherLowerLabel">
                {gameT("higherLower.next")}
              </span>

              <h2>{nextItem.label}</h2>

              <div className="higherLowerValue">
                {revealed ? (
                  <>
                    {nextItem.value.toLocaleString(
                      gameLanguage,
                    )}

                    {nextItem.unit && (
                      <span>
                        {" "}
                        {nextItem.unit}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="higherLowerHidden">
                    ???
                  </span>
                )}
              </div>
            </div>
          </div>

          {!revealed && (
            <>
              <div className="higherLowerGuessButtons">
                <button
                  type="button"
                  className={`higherLowerGuessButton ${
                    myGuess?.guess ===
                    "higher"
                      ? "selected"
                      : ""
                  }`}
                  disabled={
                    !!myGuess || working
                  }
                  onClick={() => {
                    void runAction(() =>
                      submitGuess(
                        "higher",
                      ),
                    );
                  }}
                >
                  <ChevronUp size={22} />

                  {gameT(
                    "higherLower.guessHigher",
                  )}
                </button>

                <button
                  type="button"
                  className={`higherLowerGuessButton ${
                    myGuess?.guess ===
                    "lower"
                      ? "selected"
                      : ""
                  }`}
                  disabled={
                    !!myGuess || working
                  }
                  onClick={() => {
                    void runAction(() =>
                      submitGuess(
                        "lower",
                      ),
                    );
                  }}
                >
                  <ChevronDown size={22} />

                  {gameT(
                    "higherLower.guessLower",
                  )}
                </button>
              </div>

              {myGuess && (
                <div className="higherLowerLocked">
                  <Check size={16} />

                  {gameT(
                    "higherLower.guessLocked",
                  )}
                </div>
              )}

              <div className="higherLowerFound">
                {guesses.length} /{" "}
                {players.length}{" "}
                {gameT(
                  "higherLower.playersGuessed",
                )}
              </div>

              {isHost && (
                <button
                  className="primaryButton higherLowerMainButton"
                  disabled={
                    working ||
                    !allPlayersGuessed
                  }
                  onClick={() => {
                    void runAction(reveal);
                  }}
                >
                  {gameT(
                    "higherLower.reveal",
                  )}

                  <ArrowRight size={18} />
                </button>
              )}

              {!isHost &&
                allPlayersGuessed && (
                  <div className="higherLowerWaiting">
                    {gameT(
                      "higherLower.waitingForHost",
                    )}
                  </div>
                )}
            </>
          )}

          {revealed && (
            <div className="higherLowerResults">
              {sortedPlayers.map(
                (player) => {
                  const guess =
                    guesses.find(
                      (item) =>
                        item.playerId ===
                        player.id,
                    );

                  return (
                    <div
                      key={player.id}
                      className={`higherLowerResultRow ${
                        guess?.isCorrect
                          ? "correct"
                          : ""
                      }`}
                    >
                      <span>
                        {player.name}
                      </span>

                      {guess ? (
                        <span className="higherLowerResultGuess">
                          {guess.guess ===
                          "higher" ? (
                            <ChevronUp
                              size={16}
                            />
                          ) : (
                            <ChevronDown
                              size={16}
                            />
                          )}

                          {guess.isCorrect ? (
                            <Check
                              size={16}
                            />
                          ) : (
                            <X size={16} />
                          )}
                        </span>
                      ) : (
                        <span className="higherLowerResultGuess">
                          –
                        </span>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}

          {revealed && isHost && (
            <button
              className="primaryButton higherLowerMainButton"
              disabled={working}
              onClick={() => {
                void runAction(nextRound);
              }}
            >
              {round.roundNumber >=
              ROUNDS_PER_GAME
                ? gameT(
                    "higherLower.finishGame",
                  )
                : gameT(
                    "higherLower.nextRound",
                  )}

              <ArrowRight size={18} />
            </button>
          )}

          {revealed && !isHost && (
            <div className="higherLowerWaiting">
              {gameT(
                "higherLower.waitingForHost",
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default HigherLowerGame;
