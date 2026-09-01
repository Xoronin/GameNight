import de from "./de";
import en from "./en";

export type Language = "en" | "de";

export const translations = {
  en,
  de,
};

export type TranslationKey = string;

export function translate(
  language: Language,
  key: TranslationKey,
): string {
  const parts = key.split(".");

  let current: unknown =
    translations[language];

  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(part in current)
    ) {
      return key;
    }

    current = (
      current as Record<string, unknown>
    )[part];
  }

  return typeof current === "string"
    ? current
    : key;
}