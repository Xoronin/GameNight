import {
  LogOut,
  User,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { signOut } from "../services/authService";
import "../styles/profileButton.css";

function ProfileButton() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const {
    user,
    profile,
    loading,
  } = useAuth();

  const [open, setOpen] =
    useState(false);

  if (loading) {
    return (
      <div className="profileButton profileButtonPlaceholder" />
    );
  }

  if (!user) {
    return (
      <button
        className="profileButton profileLoginButton"
        onClick={() =>
          navigate("/login")
        }
        type="button"
        aria-label={t(
          "auth.signIn",
        )}
      >
        <User size={16} />

        <span className="profileButtonText">
          {t("auth.signIn")}
        </span>
      </button>
    );
  }

  const displayName =
    profile?.displayName ||
    profile?.username ||
    t("common.player");

  const initial = displayName
    .charAt(0)
    .toUpperCase();

  const handleSignOut =
    async () => {
      setOpen(false);

      try {
        await signOut();
      } catch (caughtError) {
        console.error(
          "Could not sign out:",
          caughtError,
        );
      }

      navigate("/");
    };

  return (
    <div className="profileMenu">
      <button
        className="profileButton profileAvatarButton"
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
        type="button"
      >
        <span className="profileAvatar">
          {initial}
        </span>

        <span className="profileButtonText">
          {displayName}
        </span>
      </button>

      {open && (
        <>
          <div
            className="profileMenuBackdrop"
            onClick={() =>
              setOpen(false)
            }
          />

          <div className="profileMenuDropdown">
            <div className="profileMenuName">
              <span className="profileAvatar">
                {initial}
              </span>

              <strong>
                {displayName}
              </strong>
            </div>

            <button
              type="button"
              className="profileMenuSignOut"
              onClick={() => {
                void handleSignOut();
              }}
            >
              <LogOut size={15} />

              {t("common.logout")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfileButton;
