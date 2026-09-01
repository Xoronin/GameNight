import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  translate,
} from "../i18n/i18n";
import type {
  Language,
} from "../i18n/i18n";

const LANGUAGE_KEY =
  "game-night-language";

function getInitialLanguage(): Language {
  const saved =
    localStorage.getItem(
      LANGUAGE_KEY,
    );

  if (
    saved === "de" ||
    saved === "en"
  ) {
    return saved;
  }

  const browserLanguage =
    navigator.language
      .toLowerCase();

  return browserLanguage.startsWith(
    "de",
  )
    ? "de"
    : "en";
}

export function useLanguage() {
  const [language, setLanguageState] =
    useState<Language>(
      getInitialLanguage,
    );

  useEffect(() => {
    document.documentElement.lang =
      language;

    localStorage.setItem(
      LANGUAGE_KEY,
      language,
    );
  }, [language]);

  const setLanguage = useCallback(
    (nextLanguage: Language) => {
      setLanguageState(
        nextLanguage,
      );

      window.dispatchEvent(
        new CustomEvent(
          "game-night-language-change",
          {
            detail: nextLanguage,
          },
        ),
      );
    },
    [],
  );

  useEffect(() => {
    const listener = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<Language>;

      setLanguageState(
        customEvent.detail,
      );
    };

    window.addEventListener(
      "game-night-language-change",
      listener,
    );

    return () => {
      window.removeEventListener(
        "game-night-language-change",
        listener,
      );
    };
  }, []);

  const t = useCallback(
    (key: string) =>
      translate(language, key),
    [language],
  );

  return {
    language,
    setLanguage,
    t,
  };
}