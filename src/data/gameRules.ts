export type GameRules = Record<
  string,
  { en: string[]; de: string[] }
>;

export const gameRules: GameRules = {
  bluff: {
    en: [
      "Everyone sees the same obscure trivia question.",
      "Write a believable fake answer to fool the others.",
      "Vote for the answer you think is real — you can't vote for your own.",
      "Guess correctly for +1000 points. Fool someone else for +500 each.",
    ],
    de: [
      "Alle sehen dieselbe kuriose Wissensfrage.",
      "Schreibe eine glaubwürdige falsche Antwort, um die anderen zu täuschen.",
      "Stimme für die Antwort ab, die du für echt hältst — nicht für deine eigene.",
      "Richtig geraten gibt +1000 Punkte. Jeder getäuschte Mitspieler bringt +500 Punkte.",
    ],
  },

  minefield: {
    en: [
      "A category and a board of answer tiles appear.",
      "Players take turns picking a tile they believe is correct.",
      "A correct tile is safe and passes the turn; a wrong tile is a mine and ends the round.",
      "Find every correct tile to clear the board for full points.",
    ],
    de: [
      "Eine Kategorie und ein Spielfeld mit Antwort-Kacheln erscheinen.",
      "Die Spieler wählen abwechselnd eine Kachel, die sie für richtig halten.",
      "Eine richtige Kachel ist sicher und gibt den Zug weiter; eine falsche ist eine Mine und beendet die Runde.",
      "Findet alle richtigen Kacheln, um das Feld für die volle Punktzahl zu räumen.",
    ],
  },

  "higher-lower": {
    en: [
      "See one fact with its real value, and a second, hidden fact.",
      "Guess whether the hidden one is higher or lower than the first.",
      "Faster correct guesses earn more points.",
      "The chain continues within the same category each round.",
    ],
    de: [
      "Du siehst einen Fakt mit echtem Wert und einen zweiten, verdeckten Fakt.",
      "Rate, ob der verdeckte Wert höher oder niedriger ist als der erste.",
      "Schnellere richtige Antworten bringen mehr Punkte.",
      "Die Kette läuft jede Runde innerhalb derselben Kategorie weiter.",
    ],
  },

  trivia: {
    en: [
      "Everyone answers the same multiple-choice question.",
      "Pick one of four options before the timer runs out.",
      "Correct answers score more the faster you lock them in.",
      "See how everyone else answered once the round reveals.",
    ],
    de: [
      "Alle beantworten dieselbe Multiple-Choice-Frage.",
      "Wähle eine von vier Antworten, bevor die Zeit abläuft.",
      "Je schneller die richtige Antwort abgegeben wird, desto mehr Punkte gibt es.",
      "Nach der Auflösung siehst du, wie alle anderen geantwortet haben.",
    ],
  },

  categories: {
    en: [
      "Everyone gets the same random letter.",
      "Fill in a word starting with that letter for each active category.",
      "Unique valid answers score more than answers shared with others.",
      "The host can review any answers that couldn't be auto-checked.",
    ],
    de: [
      "Alle bekommen denselben zufälligen Buchstaben.",
      "Trage für jede aktive Kategorie ein Wort ein, das mit diesem Buchstaben beginnt.",
      "Einzigartige gültige Antworten geben mehr Punkte als mehrfach genannte.",
      "Der Host kann Antworten prüfen, die nicht automatisch bewertet werden konnten.",
    ],
  },

  "draw-guess": {
    en: [
      "One player draws a secret word while everyone else watches live.",
      "Guessers see a letter pattern and type their guesses.",
      "Guess correctly for points based on how fast you were.",
      "The drawer scores too, every time someone guesses right.",
    ],
    de: [
      "Ein Spieler zeichnet einen geheimen Begriff, während alle anderen live zusehen.",
      "Ratende sehen ein Buchstabenmuster und tippen ihre Vermutungen.",
      "Richtiges Raten gibt Punkte, abhängig davon, wie schnell du warst.",
      "Der/die Zeichnende bekommt ebenfalls Punkte, sobald jemand richtig rät.",
    ],
  },
};
