import {
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import { signUp } from "../services/authService";
import "../styles/auth.css";

function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const submit = async () => {
    const cleanedUsername =
      username.trim();

    if (
      !cleanedUsername ||
      !password ||
      !confirmPassword ||
      loading
    ) {
      return;
    }

    if (password !== confirmPassword) {
      setError(
        t("auth.passwordsDontMatch"),
      );

      return;
    }

    try {
      setLoading(true);
      setError(null);

      await signUp(
        cleanedUsername,
        password,
      );

      navigate("/");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("auth.createAccountError"),
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch =
    !confirmPassword ||
    password === confirmPassword;

  return (
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
          {t("auth.createAccountBadge")}
        </span>

        <h1>
          {t("auth.createAccountTitle")}
        </h1>

        <p>
          {t("auth.createAccountDescription")}
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
              maxLength={20}
              autoComplete="username"
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
                "auth.newPasswordPlaceholder",
              )}
              autoComplete="new-password"
            />
          </label>

          <label>
            {t("auth.confirmPassword")}

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder={t(
                "auth.repeatPasswordPlaceholder",
              )}
              autoComplete="new-password"
            />
          </label>

          {!passwordsMatch && (
            <div className="formError">
              {t("auth.passwordsDontMatch")}
            </div>
          )}

          {error && (
            <div className="formError">
              {error}
            </div>
          )}

          <button
            className="primaryButton authSubmitButton"
            disabled={
              loading ||
              username.trim().length < 3 ||
              password.length < 6 ||
              confirmPassword.length < 6 ||
              password !== confirmPassword
            }
            type="submit"
          >
            {!loading && (
              <UserPlus size={18} />
            )}

            {loading
              ? t("auth.creatingAccount")
              : t("auth.createAccount")}
          </button>
        </form>

        <button
          className="authSwitchButton"
          onClick={() =>
            navigate("/login")
          }
          type="button"
        >
          {t("auth.alreadyAccount")}
        </button>
      </div>
    </div>
  );
}

export default Register;