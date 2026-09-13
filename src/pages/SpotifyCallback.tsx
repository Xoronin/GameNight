import {
  LoaderCircle,
  Music2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import Header from "../components/Header";
import { useLanguage } from "../hooks/useLanguage";
import {
  completeSpotifyLogin,
  consumeReturnTo,
} from "../lib/spotifyAuth";

/*
 * Where Spotify sends the host back after they approve the room. The whole
 * page exists to trade the code for a token and then get out of the way,
 * so it puts them straight back into the game they left.
 */

function SpotifyCallback() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [searchParams] =
    useSearchParams();

  const [error, setError] =
    useState<string | null>(null);

  /*
   * The code is single-use, so a second attempt at it always fails. React
   * runs effects twice in development, which is exactly that second
   * attempt — this makes sure only the first one is real.
   */
  const claimedRef =
    useRef(false);

  useEffect(() => {
    if (claimedRef.current) {
      return;
    }

    claimedRef.current = true;

    const denied =
      searchParams.get("error");

    const code =
      searchParams.get("code");

    const finish = async () => {
      if (denied || !code) {
        setError(
          denied === "access_denied"
            ? t(
                "music.connectDeclined",
              )
            : t("music.connectFailed"),
        );

        return;
      }

      try {
        await completeSpotifyLogin(
          code,
        );

        navigate(consumeReturnTo(), {
          replace: true,
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : t("music.connectFailed"),
        );
      }
    };

    void finish();
  }, [searchParams, navigate, t]);

  return (
    <>
      <Header />

      <div className="page">
        <div className="centerCard">
          {error ? (
            <>
              <Music2 size={30} />

              <h1>
                {t(
                  "music.connectFailedTitle",
                )}
              </h1>

              <p>{error}</p>

              <button
                className="primaryButton"
                type="button"
                onClick={() =>
                  navigate("/", {
                    replace: true,
                  })
                }
              >
                {t("common.home")}
              </button>
            </>
          ) : (
            <>
              <LoaderCircle
                size={30}
              />

              <h1>
                {t(
                  "music.connecting",
                )}
              </h1>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default SpotifyCallback;
