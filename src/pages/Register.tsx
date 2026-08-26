import { ArrowLeft, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp } from "../services/authService";
import "../styles/auth.css";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(false);
  const [success, setSuccess] =
    useState(false);

  const submit = async () => {
    if (
      !username.trim() ||
      !email.trim() ||
      password.length < 6
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await signUp(
        email,
        password,
        username,
      );

      setSuccess(true);
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

  if (success) {
    return (
      <div className="page">
        <div className="authCard">
          <span className="eyebrow">
            ACCOUNT CREATED
          </span>

          <h1>Check your email</h1>

          <p>
            Supabase may require email
            confirmation before you can sign in.
          </p>

          <button
            className="primaryButton authSubmitButton"
            onClick={() => navigate("/login")}
          >
            Go to Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <button
        className="backButton"
        onClick={() => navigate("/")}
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
          Your account keeps your name and future
          game stats persistent.
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
                setUsername(event.target.value)
              }
              placeholder="Merlin"
              maxLength={20}
              autoComplete="username"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="At least 6 characters"
              autoComplete="new-password"
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
              !email.trim() ||
              password.length < 6
            }
            type="submit"
          >
            {!loading && <UserPlus size={18} />}

            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <button
          className="authSwitchButton"
          onClick={() => navigate("/login")}
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}

export default Register;