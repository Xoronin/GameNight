import { ArrowLeft } from "lucide-react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import BluffGame from "../games/bluff/BluffGame";
import CategoriesGame from "../games/categories/CategoriesGame";
import HigherLowerGame from "../games/higher-lower/HigherLowerGame";
import MinefieldGame from "../games/minefield/MinefieldGame";
import { useLanguage } from "../hooks/useLanguage";

const gameNameKeys: Record<
  string,
  string
> = {
  bluff: "games.bluff.name",
  minefield:
    "games.minefield.name",
  "higher-lower":
    "games.higherLower.name",
  trivia: "games.trivia.name",
  categories:
    "games.categories.name",
  "draw-guess":
    "games.drawGuess.name",
};

function GamePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { gameId } =
    useParams();

  const [searchParams] =
    useSearchParams();

  const roomCode =
    searchParams.get("room");

  const multiplayerGames =
    ["bluff", "categories", "minefield", "higher-lower"];

  if (
    gameId &&
    multiplayerGames.includes(
      gameId,
    )
  ) {
    if (!roomCode) {
      return (
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

          <div className="centerCard">
            <h1>
              {t(
                "gamePage.noRoomSelected",
              )}
            </h1>

            <p>
              {t(
                "gamePage.joinRoomFirst",
              )}
            </p>

            <button
              className="primaryButton formButton"
              type="button"
              onClick={() =>
                navigate("/")
              }
            >
              {t("common.home")}
            </button>
          </div>
        </div>
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
      "higher-lower"
    ) {
      return (
        <HigherLowerGame
          roomCode={roomCode}
        />
      );
    }
  }

  const gameNameKey =
    gameNameKeys[
      gameId ?? ""
    ];

  const gameName =
    gameNameKey
      ? t(gameNameKey)
      : t(
          "gamePage.unknownGame",
        );

  return (
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
          {gameName}
        </h1>

        <p>
          {t(
            "gamePage.notImplemented",
          )}
        </p>
      </div>
    </div>
  );
}

export default GamePage;