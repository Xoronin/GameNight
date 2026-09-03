import {
  ArrowLeft,
  ArrowRight,
  ListChecks,
  Users,
} from "lucide-react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import Header from "../components/Header";
import BluffGame from "../games/bluff/BluffGame";
import CategoriesGame from "../games/categories/CategoriesGame";
import DrawingGame from "../games/draw-guess/DrawingGame";
import HigherLowerGame from "../games/higher-lower/HigherLowerGame";
import MinefieldGame from "../games/minefield/MinefieldGame";
import TriviaGame from "../games/trivia/TriviaGame";
import { getGameLibraryEntry } from "../data/gameLibrary";
import { gameRules } from "../data/gameRules";
import { useLanguage } from "../hooks/useLanguage";
import "../styles/gamePreview.css";

const multiplayerGames = [
  "bluff",
  "categories",
  "minefield",
  "draw-guess",
  "higher-lower",
  "trivia",
];

function GamePage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const { gameId } =
    useParams();

  const [searchParams] =
    useSearchParams();

  const roomCode =
    searchParams.get("room");

  if (
    gameId &&
    multiplayerGames.includes(
      gameId,
    )
  ) {
    if (!roomCode) {
      const game =
        getGameLibraryEntry(
          gameId,
        );

      const rules =
        gameRules[gameId];

      return (
        <>
          <Header />

          <div className="page">
          <button
            className="backButton"
            type="button"
            onClick={() =>
              navigate("/")
            }
          >
            <ArrowLeft
              size={18}
            />

            {t("common.home")}
          </button>

          <div className="gamePreview">
            <div
              className={`gamePreviewIcon ${
                game?.className ??
                ""
              }`}
            >
              {game?.icon ?? (
                <ListChecks />
              )}
            </div>

            <span className="eyebrow">
              {game
                ? t(
                    game.nameKey,
                  ).toUpperCase()
                : t(
                    "gamePage.unknownGame",
                  ).toUpperCase()}
            </span>

            <h1>
              {game
                ? t(
                    game.nameKey,
                  )
                : t(
                    "gamePage.unknownGame",
                  )}
            </h1>

            <p>
              {game
                ? t(
                    game.descriptionKey,
                  )
                : t(
                    "gamePage.joinRoomFirst",
                  )}
            </p>

            {game && (
              <div className="gamePreviewMeta">
                <Users
                  size={16}
                />

                {game.players}{" "}
                {t(
                  "common.players",
                )}
              </div>
            )}

            {rules && (
              <div className="gamePreviewRules">
                <h2>
                  {t(
                    "gamePage.howToPlay",
                  )}
                </h2>

                <ol>
                  {rules[
                    language
                  ].map(
                    (
                      step,
                      index,
                    ) => (
                      <li
                        key={
                          index
                        }
                      >
                        {step}
                      </li>
                    ),
                  )}
                </ol>
              </div>
            )}

            <div className="gamePreviewActions">
              <button
                className="primaryButton"
                type="button"
                onClick={() =>
                  navigate(
                    game
                      ? `/create?game=${game.id}`
                      : "/create",
                  )
                }
              >
                {t(
                  "home.createRoom",
                )}

                <ArrowRight
                  size={18}
                />
              </button>

              <button
                className="secondaryButton"
                type="button"
                onClick={() =>
                  navigate(
                    "/join",
                  )
                }
              >
                {t(
                  "home.joinRoom",
                )}
              </button>
            </div>
          </div>
          </div>
        </>
      );
    }

    if (
      gameId === "bluff"
    ) {
      return (
        <BluffGame
          roomCode={roomCode}
        />
      );
    }

    if (
      gameId ===
      "categories"
    ) {
      return (
        <CategoriesGame
          roomCode={roomCode}
        />
      );
    }

    if (
      gameId ===
      "minefield"
    ) {
      return (
        <MinefieldGame
          roomCode={roomCode}
        />
      );
    }

    if (
      gameId ===
      "draw-guess"
    ) {
      return (
        <DrawingGame
          roomCode={roomCode}
        />
      );
    }

    if (
      gameId ===
      "higher-lower"
    ) {
      return (
        <HigherLowerGame
          roomCode={roomCode}
        />
      );
    }

    if (
      gameId === "trivia"
    ) {
      return (
        <TriviaGame
          roomCode={roomCode}
        />
      );
    }
  }

  return (
    <>
      <Header />

      <div className="page">
      <button
        className="backButton"
        type="button"
        onClick={() =>
          navigate(-1)
        }
      >
        <ArrowLeft
          size={18}
        />

        {t("common.back")}
      </button>

      <div className="centerCard">
        <span className="eyebrow">
          GAME
        </span>

        <h1>
          {t(
            "gamePage.unknownGame",
          )}
        </h1>

        <p>
          {t(
            "gamePage.notImplemented",
          )}
        </p>
      </div>
      </div>
    </>
  );
}

export default GamePage;
