export type LocalizedText = {
  en: string;
  de: string;
};

export type BluffQuestion = {
  id: string;
  category: LocalizedText;
  question: LocalizedText;
  answer: LocalizedText;
};

export const bluffQuestions: BluffQuestion[] = [
  {
    id: "q1",
    category: {
      en: "Weird Facts",
      de: "Kuriose Fakten",
    },
    question: {
      en: "What is the technical term for the fear of long words?",
      de: "Wie lautet der Fachbegriff für die Angst vor langen Wörtern?",
    },
    answer: {
      en: "Hippopotomonstrosesquippedaliophobia",
      de: "Hippopotomonstrosesquippedaliophobie",
    },
  },
  {
    id: "q2",
    category: {
      en: "Science",
      de: "Wissenschaft",
    },
    question: {
      en: "What is the name of the process where plants release water vapor through their leaves?",
      de: "Wie nennt man den Vorgang, bei dem Pflanzen über ihre Blätter Wasserdampf abgeben?",
    },
    answer: {
      en: "Transpiration",
      de: "Transpiration",
    },
  },
  {
    id: "q3",
    category: {
      en: "Geography",
      de: "Geografie",
    },
    question: {
      en: "Which country has the most natural lakes in the world?",
      de: "Welches Land hat die meisten natürlichen Seen der Welt?",
    },
    answer: {
      en: "Canada",
      de: "Kanada",
    },
  },
  {
    id: "q4",
    category: {
      en: "History",
      de: "Geschichte",
    },
    question: {
      en: "What was the name of the first artificial satellite launched into space?",
      de: "Wie hieß der erste künstliche Satellit, der ins All geschossen wurde?",
    },
    answer: {
      en: "Sputnik 1",
      de: "Sputnik 1",
    },
  },
  {
    id: "q5",
    category: {
      en: "Gaming",
      de: "Gaming",
    },
    question: {
      en: "Which company originally created the video game Minecraft?",
      de: "Welches Unternehmen entwickelte ursprünglich das Videospiel Minecraft?",
    },
    answer: {
      en: "Mojang",
      de: "Mojang",
    },
  },
  {
    id: "q6",
    category: {
      en: "Movies",
      de: "Filme",
    },
    question: {
      en: "What is the fictional metal used to make Captain America's shield?",
      de: "Aus welchem fiktiven Metall besteht Captain Americas Schild?",
    },
    answer: {
      en: "Vibranium",
      de: "Vibranium",
    },
  },
  {
    id: "q7",
    category: {
      en: "Animals",
      de: "Tiere",
    },
    question: {
      en: "Which animal has fingerprints that are extremely similar to humans?",
      de: "Welches Tier hat Fingerabdrücke, die denen von Menschen extrem ähnlich sind?",
    },
    answer: {
      en: "Koala",
      de: "Koala",
    },
  },
  {
    id: "q8",
    category: {
      en: "Food",
      de: "Essen",
    },
    question: {
      en: "What ingredient gives traditional pesto its green color?",
      de: "Welche Zutat verleiht traditionellem Pesto seine grüne Farbe?",
    },
    answer: {
      en: "Basil",
      de: "Basilikum",
    },
  },
];