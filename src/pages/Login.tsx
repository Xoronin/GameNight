import {
  ArrowLeft,
  LogIn,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useLanguage } from "../hooks/useLanguage";
import { signIn } from "../services/authService";
import "../styles/auth.css";

function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const submit = async () => {
    if (
      !username.trim() ||
      !password ||
      loading
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await signIn(
        username,
        password,
      );

      navigate("/");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("auth.signInError"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="page">
      <button
        className="backButton"
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={18} />
        {t("common.home")}
      </button>

      <div className="authCard">
        <span className="eyebrow">
          {t("auth.welcomeBack")}
        </span>

        <h1>{t("auth.signIn")}</h1>

        <p>
          {t("auth.signInDescription")}
        </p>

        <form
          className="authForm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label>
            {t("auth.username")}

            <input
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value,
                )
              }
              placeholder="Merlin"
              autoComplete="username"
              maxLength={20}
              autoFocus
            />
          </label>

          <label>
            {t("auth.password")}

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder={t(
                "auth.passwordPlaceholder",
              )}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="formError">
              {error}
            </div>
          )}

          <button
            className="primaryButton authSubmitButton"
            disabled={
              loading ||
              !username.trim() ||
              !password
            }
            type="submit"
          >
            {!loading && (
              <LogIn size={18} />
            )}

            {loading
              ? t("auth.signingIn")
              : t("auth.signIn")}
          </button>
        </form>

        <button
          className="authSwitchButton"
          onClick={() =>
            navigate("/register")
          }
          type="button"
        >
          {t("auth.noAccount")}
        </button>
      </div>
      </div>
    </>
  );
}

export default Login;