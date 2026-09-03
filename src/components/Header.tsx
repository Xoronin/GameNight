import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
import LanguageSwitcher from "./LanguageSwitcher";
import ProfileButton from "./ProfileButton";
import SoundToggle from "./SoundToggle";
import "../styles/header.css";

type HeaderProps = {
  children?: ReactNode;
};

function Header({
  children,
}: HeaderProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <header className="header">
      <div className="headerInner">
        <button
          className="brand brandButton"
          onClick={() =>
            navigate("/")
          }
          type="button"
        >
          <img
            className="brandDice"
            src="/favicon.svg"
            alt=""
            width={42}
            height={42}
          />

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
          {children}

          <SoundToggle />

          <LanguageSwitcher />

          <ProfileButton />
        </div>
      </div>
    </header>
  );
}

export default Header;
