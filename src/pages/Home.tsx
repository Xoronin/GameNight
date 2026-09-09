import {
  ChevronRight,
  Users,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { gameLibrary } from "../data/gameLibrary";
import { useLanguage } from "../hooks/useLanguage";
import "../styles/home.css";

const games = gameLibrary;

const soloGames = games.filter(
  (game) => game.group === "solo",
);

const teamGames = games.filter(
  (game) => game.group === "team",
);

const playableCount = games.filter(
  (game) => !game.comingSoon,
).length;

function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const renderGameCard = (
    game: (typeof games)[number],
    index: number,
  ) => {
    const cardStyle = {
      "--cardIndex": index,
    } as CSSProperties;

    if (game.comingSoon) {
      return (
        <div
          className={`gameCard comingSoonCard ${game.className}`}
          key={game.id}
          style={cardStyle}
        >
          <span
            className="cardWatermark"
            aria-hidden
          >
            {game.icon}
          </span>

          <div className="cardTop">
            <div className="gameIcon">
              {game.icon}
            </div>

            <span className="players">
              <Users size={15} />

              {game.players}
            </span>
          </div>

          <div className="cardContent">
            <h3>
              {t(game.nameKey)}
            </h3>

            <p>
              {t(
                game.descriptionKey,
              )}
            </p>
          </div>

          <div className="comingSoonBadge">
            {t("home.comingSoon")}
          </div>
        </div>
      );
    }

    return (
      <button
        className={`gameCard ${game.className}`}
        key={game.id}
        style={cardStyle}
        onClick={() =>
          navigate(
            `/game/${game.id}`,
          )
        }
        type="button"
      >
        <span
          className="cardWatermark"
          aria-hidden
        >
          {game.icon}
        </span>

        <div className="cardTop">
          <div className="gameIcon">
            {game.icon}
          </div>

          <span className="players">
            <Users size={15} />

            {game.players}
          </span>
        </div>

        <div className="cardContent">
          <h3>
            {t(game.nameKey)}
          </h3>

          <p>
            {t(game.descriptionKey)}
          </p>
        </div>

        <div className="play">
          {t("home.viewGame")}

          <ChevronRight size={18} />
        </div>
      </button>
    );
  };

  return (
    <div className="app">
      <Header />

      <main>
        <section className="hero">
          <h1>
            {t("home.title1")}

            <br />

            <span>
              {t("home.title2")}
            </span>
          </h1>

          <p>
            {t("home.description")}
          </p>

          <div className="heroActions">
            <button
              className="primaryButton"
              onClick={() =>
                navigate("/create")
              }
              type="button"
            >
              {t("home.createRoom")}

              <ChevronRight
                size={20}
              />
            </button>

            <button
              className="secondaryButton"
              onClick={() =>
                navigate("/join")
              }
              type="button"
            >
              {t(
                "home.enterRoomCode",
              )}
            </button>
          </div>
        </section>

        <section className="library">
          <div className="sectionHeading">
            <div>
              <span className="eyebrow">
                {t("home.library")}
              </span>

              <h2>
                {t("home.chooseGame")}
              </h2>
            </div>

            <span className="gameCount">
              {playableCount}{" "}
              {t("common.games")}
            </span>
          </div>

          <h3 className="groupHeading">
            {t("home.groupSolo")}
          </h3>

          <div className="gameGrid">
            {soloGames.map(
              (game, index) =>
                renderGameCard(
                  game,
                  index,
                ),
            )}
          </div>

          <h3 className="groupHeading">
            {t("home.groupTeam")}
          </h3>

          <div className="gameGrid">
            {teamGames.map(
              (game, index) =>
                renderGameCard(
                  game,
                  index,
                ),
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;