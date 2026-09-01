import { Languages } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import "../styles/language.css";

function LanguageSwitcher() {
  const {
    language,
    setLanguage,
  } = useLanguage();

  return (
    <div className="languageSwitcher">
      <Languages size={16} />

      <button
        type="button"
        className={
          language === "de"
            ? "active"
            : ""
        }
        onClick={() =>
          setLanguage("de")
        }
      >
        DE
      </button>

      <span>/</span>

      <button
        type="button"
        className={
          language === "en"
            ? "active"
            : ""
        }
        onClick={() =>
          setLanguage("en")
        }
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;