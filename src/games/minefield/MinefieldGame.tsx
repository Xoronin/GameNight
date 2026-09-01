import {
  ArrowRight,
  Bomb,
  Check,
  Crown,
  LoaderCircle,
  ShieldQuestion,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { translate } from "../../i18n/i18n";
import { useRoom } from "../../hooks/useRoom";
import { useMinefieldRound } from "../../hooks/useMinefieldRound";
import {
  type MinefieldDifficulty,
  createMinefieldSession,
  createMinefieldRound,
  finishMinefieldGame,
  getMinefieldUsedQuestionIds,
  pickMinefieldTile,
  returnMinefieldRoomToLobby,
} from "../../services/minefieldService";
import type {
  MinefieldTile,
} from "../../types/game";
import type { Player } from "../../types/player";
import { getPlayer } from "../../utils/gameUtils";
import "../../styles/minefield.css";

const ROUNDS_PER_GAME = 6;

type MinefieldGameProps = {
  roomCode: string;
};


function MinefieldGame({
  roomCode,
}: MinefieldGameProps) {
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
    difficulty,
    setDifficulty,
    ] =
    useState<MinefieldDifficulty>(
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
    question,
    tiles,
    loading: roundLoading,
    error: roundError,
  } = useMinefieldRound(
    room?.id,
    gameLanguage,
  );

  const isHost =
    !!room &&
    !!localPlayer &&
    room.hostPlayerId ===
      localPlayer.id;

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
    round?.currentPlayerId ===
      localPlayer.id;

  const correctTiles =
    tiles.filter(
      (tile) => tile.isCorrect,
    );

  const foundCorrect =
    correctTiles.filter(
      (tile) => tile.revealed,
    ).length;

  const allCorrectFound =
    correctTiles.length > 0 &&
    foundCorrect ===
      correctTiles.length;

  const sortedPlayers =
    useMemo(
      () =>
        [...players].sort(
          (a, b) =>
            b.score - a.score,
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
          : "Something went wrong.",
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
            await createMinefieldSession(
            room.id,
            difficulty,
            );
        }

        const usedIds =
        await getMinefieldUsedQuestionIds(
            activeSession.id,
        );

        await createMinefieldRound(
        activeSession.id,
        room.id,
        roundNumber,
        players,
        usedIds,
        room.gameLanguage,
        activeSession.difficulty,
        );
    };

  const handleTile =
    async (
      tile: MinefieldTile,
    ) => {
      if (
        !round ||
        !localPlayer ||
        !isMyTurn ||
        tile.revealed ||
        working
      ) {
        return;
      }

      await pickMinefieldTile(
        round,
        tile,
        players,
        localPlayer.id,
      );
    };

  const nextRound =
    async () => {
      if (
        !round ||
        !isHost
      ) {
        return;
      }
    if (
    round.roundNumber >=
    ROUNDS_PER_GAME
    ) {
    if (!session) {
        return;
    }

    await finishMinefieldGame(
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

      await returnMinefieldRoomToLobby(
        room.id,
      );
    };

  if (
    room?.status === "lobby"
  ) {
    navigate(
      `/lobby/${room.code}`,
      {
        replace: true,
      },
    );

    return null;
  }

  if (!localPlayer) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            {gameT("minefield.noPlayerTitle")}
          </h1>

          <p>
            {gameT("minefield.joinAgain")}
          </p>
        </div>
      </div>
    );
  }

  if (
    roomLoading ||
    roundLoading
  ) {
    return (
      <div className="page">
        <div className="centerCard">
          <LoaderCircle
            size={30}
          />

          <h1>
            {gameT("minefield.loading")}
          </h1>
        </div>
      </div>
    );
  }

  if (
    roomError ||
    roundError ||
    !room
  ) {
    return (
      <div className="page">
        <div className="centerCard">
          <h1>
            {gameT("minefield.loadError")}
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
        <div className="minefieldGame">
          <section className="minefieldStart">
            <div className="minefieldHeroIcon">
              <Bomb size={42} />
            </div>

            <span className="eyebrow">
              {gameT("games.minefield.name").toUpperCase()}
            </span>

            <h1>
              {gameT("minefield.startTitle")}
            </h1>

            <p>
              {gameT("minefield.startDescription")}
            </p>

            {isHost ? (
              <>
                <div className="minefieldDifficulty">
                  <label htmlFor="minefieldDifficulty">
                    {gameT("minefield.difficulty")}
                  </label>

                  <select
                    id="minefieldDifficulty"
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(
                        event.target.value as MinefieldDifficulty,
                      )
                    }
                  >
                    <option value="mixed">
                      {gameT("minefield.difficultyMixed")}
                    </option>

                    <option value="easy">
                      {gameT("minefield.difficultyEasy")}
                    </option>

                    <option value="medium">
                      {gameT("minefield.difficultyMedium")}
                    </option>

                    <option value="hard">
                      {gameT("minefield.difficultyHard")}
                    </option>
                  </select>
                </div>

                <button
                  className="primaryButton minefieldMainButton"
                  type="button"
                  disabled={working}
                  onClick={() => {
                    void runAction(() => startRound(1));
                  }}
                >
                  {gameT("lobby.start")}

                  <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <div className="minefieldWaiting">
                {gameT("bluff.waitingHost")}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (
    round.status ===
    "finished"
  ) {
    return (
      <div className="page gamePage">
        <div className="minefieldGame">
          <section className="minefieldStart">
            <div className="minefieldHeroIcon">
              <Trophy size={42} />
            </div>

            <span className="eyebrow">
              GAME COMPLETE
            </span>

            <h1>
              Final scores
            </h1>

            <div className="minefieldScoreboard">
              {sortedPlayers.map(
                (
                  player,
                  index,
                ) => (
                  <div
                    key={
                      player.id
                    }
                    className="minefieldScoreRow"
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
                className="primaryButton minefieldMainButton"
                disabled={working}
                onClick={() => {
                  void runAction(
                    backToLobby,
                  );
                }}
              >
                Back to lobby

                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <div className="minefieldWaiting">
                Waiting for host...
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
          <h1>
            Question missing
          </h1>
        </div>
      </div>
    );
  }

  const roundComplete =
    round.status ===
      "reveal" ||
    allCorrectFound;

  return (
    <div className="page gamePage">
      <div className="minefieldGame">
        <header className="minefieldHeader">
          <div>
            <span className="eyebrow">
              {gameT(
                "games.minefield.name",
              ).toUpperCase()}
            </span>

            <strong>
              {gameT("bluff.round")} {" "}
              {round.roundNumber} /{" "}
              {ROUNDS_PER_GAME}
            </strong>
          </div>

          <div className="minefieldScore">
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

        <div className="minefieldProgress">
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
          <div className="minefieldError">
            {actionError}
          </div>
        )}

        <section className="minefieldPanel">
          <div className="minefieldCategory">
            <ShieldQuestion
              size={17}
            />

            {question.category}
          </div>

          <h1>
            {question.question}
          </h1>

          {!roundComplete && (
            <>
              <div
                className={`minefieldTurn ${
                  isMyTurn
                    ? "minefieldMyTurn"
                    : ""
                }`}
              >
                {isMyTurn ? (
                  <>
                    <Sparkles
                      size={18}
                    />

                    {gameT(
                      "minefield.yourTurn",
                    )}
                  </>
                ) : (
                  <>
                    {gameT(
                      "minefield.waitingFor",
                    )}{" "}
                    <strong>
                      {currentPlayer?.name ??
                        gameT("common.player")}
                    </strong>
                  </>
                )}
              </div>

              <div className="minefieldFound">
                <Check size={17} />

                {foundCorrect} /{" "}
                {
                  correctTiles.length
                }{" "}
                {gameT(
                  "minefield.correctAnswersFound",
                )}
              </div>
            </>
          )}

          <div className="minefieldGrid">
            {shuffleStable(
              tiles,
              round.id,
            ).map((tile) => {
              const revealed =
                tile.revealed;

              return (
                <button
                  key={tile.id}
                  type="button"
                  disabled={
                    revealed ||
                    !isMyTurn ||
                    working ||
                    roundComplete
                  }
                  className={[
                    "minefieldTile",
                    revealed &&
                    tile.isCorrect
                      ? "safe"
                      : "",
                    revealed &&
                    !tile.isCorrect
                      ? "mine"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    void runAction(
                      () =>
                        handleTile(
                          tile,
                        ),
                    );
                  }}
                >
                  <span>
                    {tile.text}
                  </span>

                  {revealed &&
                    tile.isCorrect && (
                      <Check
                        size={22}
                      />
                    )}

                  {revealed &&
                    !tile.isCorrect && (
                      <Bomb
                        size={22}
                      />
                    )}
                </button>
              );
            })}
          </div>

          {roundComplete && (
            <div className="minefieldRoundResult">
              <div className="minefieldResultIcon">
                {allCorrectFound ? (
                  <Check
                    size={28}
                  />
                ) : (
                  <X size={28} />
                )}
              </div>

              <div>
                <strong>
                  {allCorrectFound
                    ? gameT(
                        "minefield.minefieldCleared",
                      )
                    : gameT(
                        "minefield.roundComplete",
                      )}
                </strong>

                <span>
                  {gameT(
                    "minefield.allAnswersRevealed",
                  )}
                </span>
              </div>
            </div>
          )}

          {roundComplete &&
            isHost && (
              <button
                className="primaryButton minefieldMainButton"
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
                      "minefield.finishGame",
                    )
                  : gameT(
                      "minefield.nextRound",
                    )}

                <ArrowRight
                  size={18}
                />
              </button>
            )}

          {roundComplete &&
            !isHost && (
              <div className="minefieldWaiting">
                {gameT(
                  "minefield.waitingForHost",
                )}
              </div>
            )}
        </section>
      </div>
    </div>
  );
}

function shuffleStable<T extends { id: string }>(
  items: T[],
  seed: string,
) {
  return [...items].sort(
    (a, b) =>
      hash(`${seed}:${a.id}`) -
      hash(`${seed}:${b.id}`),
  );
}

function hash(value: string) {
  let result = 0;

  for (
    let i = 0;
    i < value.length;
    i++
  ) {
    result =
      (result * 31 +
        value.charCodeAt(i)) |
      0;
  }

  return result;
}

export default MinefieldGame;