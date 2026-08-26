import {
  ArrowLeft,
  LogIn,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "../services/authService";
import "../styles/auth.css";

function Login() {
  const navigate = useNavigate();

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
          : "Could not sign in.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <button
        className="backButton"
        onClick={() =>
          navigate("/")
        }
      >
        <ArrowLeft size={18} />
        Home
      </button>

      <div className="authCard">
        <span className="eyebrow">
          WELCOME BACK
        </span>

        <h1>Sign in</h1>

        <p>
          Sign in with your Game Night
          username and password.
        </p>

        <form
          className="authForm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label>
            Username

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
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Your password"
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
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        <button
          className="authSwitchButton"
          onClick={() =>
            navigate("/register")
          }
          type="button"
        >
          No account yet? Create one
        </button>
      </div>
    </div>
  );
}

export default Login;