import {
  ChevronRight,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "../components/LanguageSwitcher";
import SoundToggle from "../components/SoundToggle";
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
  ) => {
    if (game.comingSoon) {
      return (
        <div
          className={`gameCard comingSoonCard ${game.className}`}
          key={game.id}
        >
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
        onClick={() =>
          navigate(
            `/game/${game.id}`,
          )
        }
        type="button"
      >
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
      <header className="header">
        <button
          className="brand brandButton"
          onClick={() => navigate("/")}
          type="button"
        >
          <div className="brandDice">
            ◆
          </div>

          <div>
            <strong>
              Game Night
            </strong>

            <span>
              {t("home.madeFor")}
            </span>
          </div>
        </button>

        <div className="headerActions">
          <SoundToggle />

          <LanguageSwitcher />

          <button
            className="joinButton"
            onClick={() =>
              navigate("/join")
            }
            type="button"
          >
            <Users size={18} />

            {t("home.joinRoom")}
          </button>
        </div>
      </header>

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
              renderGameCard,
            )}
          </div>

          <h3 className="groupHeading">
            {t("home.groupTeam")}
          </h3>

          <div className="gameGrid">
            {teamGames.map(
              renderGameCard,
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;