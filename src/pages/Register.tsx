import {
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp } from "../services/authService";
import "../styles/auth.css";

function Register() {
  const navigate = useNavigate();

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
        "Passwords do not match.",
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
          : "Could not create account.",
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
        onClick={() =>
          navigate("/")
        }
      >
        <ArrowLeft size={18} />
        Home
      </button>

      <div className="authCard">
        <span className="eyebrow">
          CREATE ACCOUNT
        </span>

        <h1>Join Game Night</h1>

        <p>
          Pick a unique username and
          password. No email required.
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
              maxLength={20}
              autoComplete="username"
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
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </label>

          <label>
            Confirm password

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </label>

          {!passwordsMatch && (
            <div className="formError">
              Passwords do not match.
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
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <button
          className="authSwitchButton"
          onClick={() =>
            navigate("/login")
          }
          type="button"
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}

export default Register;