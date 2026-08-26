import { ArrowLeft, LogIn } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "../services/authService";
import "../styles/auth.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await signIn(email, password);

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
        onClick={() => navigate("/")}
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
          Sign in to keep your profile and stats
          across devices.
        </p>

        <form
          className="authForm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
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
              !email.trim() ||
              !password
            }
            type="submit"
          >
            {!loading && <LogIn size={18} />}

            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <button
          className="authSwitchButton"
          onClick={() => navigate("/register")}
        >
          No account yet? Create one
        </button>
      </div>
    </div>
  );
}

export default Login;