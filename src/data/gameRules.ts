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
      "A correct tile is safe and passes the turn; a wrong tile is a mine and knocks you out of the round.",
      "The last player left keeps playing solo for a bonus — clear every tile for full points.",
    ],
    de: [
      "Eine Kategorie und ein Spielfeld mit Antwort-Kacheln erscheinen.",
      "Die Spieler wählen abwechselnd eine Kachel, die sie für richtig halten.",
      "Eine richtige Kachel ist sicher und gibt den Zug weiter; eine falsche ist eine Mine und wirft dich aus der Runde.",
      "Der letzte verbliebene Spieler spielt allein weiter und bekommt einen Bonus — räumt alle Kacheln für die volle Punktzahl.",
    ],
  },

  alphabet: {
    en: [
      "The host picks a topic and a shared A–Z board appears.",
      "On your turn, pick any free letter and type a word from the topic that starts with it.",
      "Everyone else can vote your word down — majority rejection or running out of time costs you a life.",
      "3 lives each. Clear the whole alphabet before everyone busts.",
    ],
    de: [
      "Der Host wählt ein Thema, dann erscheint ein gemeinsames A-Z-Feld.",
      "Wenn du dran bist, wähle einen freien Buchstaben und tippe ein passendes Wort zum Thema ein.",
      "Alle anderen können dein Wort ablehnen — eine Mehrheit dagegen oder abgelaufene Zeit kostet ein Leben.",
      "Jeder hat 3 Leben. Räumt das ganze Alphabet, bevor alle ausgeschieden sind.",
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

  atlas: {
    en: [
      "Every round asks a different kind of geography question.",
      "Paint a country's flag, pick the right flag, name the country, or choose the capital.",
      "Matching rounds ask you to drag each capital onto the country it belongs to.",
      "Painting and matching score partial credit; answer fully correct and fast for the speed bonus.",
    ],
    de: [
      "Jede Runde stellt eine andere Art von Geografie-Frage.",
      "Male die Flagge eines Landes aus, wähle die richtige Flagge, nenne das Land oder die Hauptstadt.",
      "In Zuordnungsrunden ziehst du jede Hauptstadt auf das passende Land.",
      "Malen und Zuordnen geben Teilpunkte; wer komplett richtig und schnell antwortet, bekommt den Zeitbonus.",
    ],
  },

  spectrum: {
    en: [
      "The host picks a category — a timeline of dates or a ranking by some number.",
      "On your turn, you're shown one mystery item and the board built so far, high at the top and low at the bottom.",
      "Slot it into the gap where you think it belongs.",
      "Right and it joins the board with your name on it; wrong (or too slow) costs one of your 3 lives and passes the same item to the next player.",
      "If everyone fails it, it's revealed grayed out and nobody scores it.",
    ],
    de: [
      "Der Host wählt eine Kategorie — eine Zeitleiste nach Datum oder eine Rangliste nach einer Zahl.",
      "Wenn du dran bist, siehst du einen mysteriösen Eintrag und das bisherige Spielfeld — oben hoch, unten niedrig.",
      "Ordne ihn an der Stelle ein, an der er deiner Meinung nach hingehört.",
      "Richtig eingeordnet kommt er mit deinem Namen aufs Feld; falsch (oder zu langsam) kostet eines deiner 3 Leben und gibt denselben Eintrag an den nächsten Spieler weiter.",
      "Scheitern alle daran, wird er ausgegraut aufgedeckt und niemand bekommt Punkte.",
    ],
  },

  "know-your-friends": {
    en: [
      "Every round is about one player, and the turn passes around the table.",
      "That player answers a question about themselves; everyone else predicts what they picked.",
      "All of it happens in the same window — their answer is simply hidden until the reveal.",
      "A correct prediction is +500. The player being guessed earns +150 for every person who read them right.",
    ],
    de: [
      "In jeder Runde geht es um einen Spieler, und es wird reihum gewechselt.",
      "Diese Person beantwortet eine Frage über sich selbst, alle anderen sagen voraus, was sie gewählt hat.",
      "Alles passiert im selben Zeitfenster — ihre Antwort bleibt bis zur Auflösung einfach verborgen.",
      "Eine richtige Vorhersage bringt +500. Die Person, um die es geht, bekommt +150 für jeden, der sie richtig eingeschätzt hat.",
    ],
  },
};
