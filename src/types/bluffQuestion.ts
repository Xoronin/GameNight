export type GameLanguage =
  | "en"
  | "de";

export type BluffQuestion = {
  id: string;

  category: {
    en: string;
    de: string;
  };

  question: {
    en: string;
    de: string;
  };

  answer: {
    en: string;
    de: string;
  };

  difficulty: string;
};