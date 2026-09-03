const en = {
  common: {
    home: "Home",
    back: "Back",
    loading: "Loading...",
    error: "Error",
    player: "Player",
    players: "Players",
    host: "Host",
    you: "You",
    room: "Room",
    language: "Language",
    german: "German",
    english: "English",
    continue: "Continue",
    submit: "Submit",
    cancel: "Cancel",
    logout: "Sign out",
    games: "games",
    genericError: "Something went wrong.",
    unknown: "Unknown", 
  },

  home: {
    title1: "Pick a game.",
    title2: "Beat your friends.",
    description:
      "Quick party games for your next game night. Grab some friends, choose a game and start playing.",
    createRoom: "Create Room",
    joinRoom: "Join Room",
    enterRoomCode: "Enter Room Code",
    library: "GAME LIBRARY",
    chooseGame: "Choose your game",
    viewGame: "View Game",
    madeFor: "Made for game nights 🎲",
    groupSolo: "Individual / Free-for-All",
    groupTeam: "Team Games",
    comingSoon: "Coming soon",
  },

  games: {
    bluff: {
      name: "Bluff",
      description:
        "Invent convincing fake answers and fool your friends.",
    },

    minefield: {
      name: "Minefield",
      description:
        "Find the correct answers without getting eliminated.",
    },

    higherLower: {
      name: "Higher / Lower",
      description:
        "Compare facts, numbers and records.",
    },

    trivia: {
      name: "Trivia",
      description:
        "Compete across different quiz categories.",
    },

    categories: {
      name: "Categories",
      description:
        "Our version of Stadt, Land, Fluss.",
    },

    drawGuess: {
      name: "Draw & Guess",
      description:
        "Draw secret words while your friends guess.",
    },

    codewords: {
      name: "Codewords",
      description:
        "Two teams race to identify their words from one-word clues before hitting the wrong one.",
    },

    riskIt: {
      name: "Risk It",
      description:
        "Bid on how many correct answers you can name, then back it up before the timer runs out.",
    },

    forbiddenWords: {
      name: "Forbidden Words",
      description:
        "Get your team to guess the word without saying any of the obvious ones.",
    },

    emojiDecode: {
      name: "Emoji Decode",
      description:
        "Race to decode a movie, game or phrase from nothing but emojis.",
    },

    syllableRush: {
      name: "Syllable Rush",
      description:
        "Find a word containing the given syllable before the shrinking timer runs out.",
    },

    knowYourFriends: {
      name: "Know Your Friends",
      description:
        "Predict how a player secretly answered a personal question.",
    },

    knowTheirRanking: {
      name: "Know Their Ranking",
      description:
        "Reconstruct another player's secret ranking of a set of options.",
    },

    timeline: {
      name: "Timeline",
      description:
        "Slot a new card into a growing timeline or ranking — three wrong guesses and you're out.",
    },

    soundGuess: {
      name: "Sound Guess",
      description:
        "Identify a sound from an ever-lengthening clip — the faster you guess, the more it's worth.",
    },

    reverseQuiz: {
      name: "Reverse Quiz",
      description:
        "Everyone sees the answer and invents a fake question — spot the real one among the fakes.",
    },

    zoomedIn: {
      name: "Zoomed In",
      description:
        "Guess the extremely zoomed-in image before it zooms out any further.",
    },

    musicTimeline: {
      name: "Music Timeline",
      description:
        "Place a mystery song correctly into your chronological music timeline.",
    },

    matchUp: {
      name: "Match Up",
      description:
        "Take turns matching pairs from two shuffled lists — a wrong match costs you a life.",
    },
  },

  auth: {
    welcomeBack: "WELCOME BACK",
    signIn: "Sign in",
    signInDescription:
      "Sign in with your Game Night username and password.",
    username: "Username",
    password: "Password",
    confirmPassword: "Confirm password",
    createAccount: "Create Account",
    createAccountBadge: "CREATE ACCOUNT",
    createAccountTitle: "Join Game Night",
    createAccountDescription:
      "Pick a unique username and password. No email required.",
    noAccount: "No account yet? Create one",
    alreadyAccount: "Already have an account? Sign in",
    signingIn: "Signing in...",
    creatingAccount: "Creating account...",
    passwordsDontMatch: "Passwords do not match.",
    signInError: "Could not sign in.",
    createAccountError: "Could not create account.",
    passwordPlaceholder: "Your password",
    newPasswordPlaceholder: "At least 6 characters",
    repeatPasswordPlaceholder: "Repeat your password",
  },

  createRoom: {
    badge: "CREATE ROOM",
    titleLoggedIn: "Create a room",
    titleGuest: "Who's playing?",
    loggedInDescription:
      "You'll create the room as your Game Night profile.",
    guestDescription:
      "Enter your name. You'll become the host of the new room.",
    yourName: "Your name",
    signedIn: "Signed in",
    creating: "Creating...",
    create: "Create Room",
    signInHint: "Sign in to keep your profile",
    error: "Could not create room.",
    startingWith: "Starting with",
  },

  joinRoom: {
    badge: "JOIN A GAME",
    title: "Join a room",
    description:
      "Enter your name and the room code shown on the host's screen.",
    joiningWithProfile: "Joining with your profile",
    roomCode: "Room code",
    joining: "Joining...",
    join: "Join Room",
    signInHint: "Sign in to use your profile",
    error: "Could not join room.",
  },

  lobby: {
    badge: "GAME LOBBY",
    ready: "Ready to play?",
    shareCode: "Share this room code with your friends.",
    copied: "Copied!",
    waitingFriends: "Waiting for friends",
    playersJoining: "Players are joining",
    anyoneWithCode: "Anyone with this room code can join this lobby.",
    chooseGame: "Choose a game",
    selectedGame: "Selected game",
    waitingHost: "Waiting for the host to start the game...",
    start: "Start",
    leaveRoom: "Leave room",
    gameLanguage: "Game language",
    noPlayerTitle: "No player found",
    noPlayerDescription: "Please create or join a room first.",
    loadingRoom: "Loading room...",
    roomError: "ROOM ERROR",
    roomNotFound: "Room not found",
    roomGone: "This room no longer exists.",
    gameSettings: "Game settings",
    seconds: "seconds",
    roundCountLabel: "Number of rounds",
  },

  bluff: {
    readyRound: "Ready for round 1?",
    readyDescription:
      "Everyone gets the same question and writes a believable fake answer.",
    startFirstRound: "Start First Round",
    waitingHost: "Waiting for the host...",
    round: "Round",
    fakeInstruction:
      "Write a believable fake answer. Try to fool the other players.",
    fakePlaceholder: "Enter your fake answer...",
    submitAnswer: "Submit Answer",
    submitted: "Answer submitted",
    playersReady: "players ready",
    openVoting: "Open Voting",
    findTruth: "Find the truth",
    whichReal: "Which answer is real?",
    voteInstruction:
      "Choose carefully. You cannot vote for your own fake answer.",
    ownAnswer: "Your answer",
    voteLocked: "Vote locked in",
    playersVoted: "players voted",
    revealAnswers: "Reveal Answers",
    realAnswer: "Real answer",
    writtenBy: "Written by",
    noPoints: "No points this round",
    correctAnswer: "Correct answer",
    noPlayersFooled: "No players fooled",
    playerFooled: "player fooled",
    playersFooled: "players fooled",
    nextRound: "Next Round",
    finishGame: "Finish Game",
    finalScores: "Final scores",
    gameComplete: "GAME COMPLETE",
    backToLobby: "Back to Lobby",
    loading: "Loading Bluff...",
    loadError: "Could not load Bluff",
    joinAgain: "Please join the room again.",
    questionMissing: "Question missing",
    waitingStart:
    "Waiting for the host to start the first round...",
    waitingContinue:
    "Waiting for the host to continue...",
    fakeCannotBeReal:
    "Your fake answer cannot be the real answer.",
    cannotVoteOwn:
    "You cannot vote for your own fake answer.",
    roundReveal: "Round reveal",
    points: "points",
    wrongAnswer: "Wrong answer",
    noQuestions: "There are currently no active Bluff questions.",
    timerLabel: "Answer time",
  },

  categories: {
    name: "Categories",
    startTitle: "Stadt, Land, Fluss",
    startDescription:
      "Everyone gets the same letter and categories.",
    startRound: "Start Round",
    letter: "Letter",
    everyAnswerMustStart: "Every answer must start with",
    submitAnswers: "Submit Answers",
    answersSubmitted: "Answers submitted",
    playersReady: "players ready",
    revealAnswers: "Reveal Answers",
    endRoundEarly: "End round now",
    roundReveal: "Round reveal",
    nextRound: "Next Round",
    backToLobby: "Back to Lobby",
    loading: "Loading Categories...",
    loadError: "Could not load game",
    playerRoomMissing:
    "Player or room missing.",
    waitingHost:
    "Waiting for the host...",
    round: "Round",
    timerLabel: "Answer time",
    roundCountLabel: "Number of rounds",
    rounds: "rounds",
    categoriesLabel: "Categories in play",
    finalScores: "Final scores",
    gameComplete: "GAME COMPLETE",
    finishGame: "Finish game",
    score: "Score",
    voteInvalid: "Doesn't count",
    addCustomCategoryPlaceholder:
      "New category name...",
    addCustomCategory: "Add",
    removeCategory: "Remove category",

    labels: {
      city: "City",
      country: "Country",
      river: "River",
      animal: "Animal",
      name: "Name",
      profession: "Profession",
      plant: "Plant",
      food: "Food",
      color: "Color",
      sport: "Sport",
      movie: "Movie",
      brand: "Brand",
      bodyPart: "Body part",
      thing: "Thing",
    },
  },

  minefield: {
    startTitle: "Find the safe answers",
    startDescription:
      "Pick answers that fit the category. A wrong answer is a mine.",
    difficulty: "Difficulty",
    difficultyMixed: "Mixed",
    difficultyEasy: "Easy",
    difficultyMedium: "Medium",
    difficultyHard: "Hard",
    yourTurn: "Your turn — choose a tile",
    waitingFor: "Waiting for",
    correctAnswersFound: "correct answers found",
    minefieldCleared: "Minefield cleared!",
    roundComplete: "Round complete",
    allAnswersRevealed: "All answers are now revealed.",
    nextRound: "Next round",
    finishGame: "Finish game",
    waitingForHost: "Waiting for the host to continue...",
    loading: "Loading Minefield...",
    loadError: "Could not load Minefield",
    joinAgain: "Join the room again.",
    noPlayerTitle: "No player found",
    questionMissing: "Question missing",
    timerLabel: "Turn time",
  },

  higherLower: {
    loading: "Loading Higher / Lower...",
    loadError: "Could not load Higher / Lower",
    noPlayerTitle: "No player found",
    joinAgain: "Join the room again.",
    startTitle: "Higher or Lower?",
    startDescription:
      "Compare facts and numbers. Guess whether the next one is higher or lower.",
    difficulty: "Difficulty",
    difficultyMixed: "Mixed",
    difficultyEasy: "Easy",
    difficultyMedium: "Medium",
    difficultyHard: "Hard",
    current: "Current",
    next: "Next",
    guessHigher: "Higher",
    guessLower: "Lower",
    guessLocked: "Guess locked in",
    playersGuessed: "players guessed",
    reveal: "Reveal",
    itemsMissing: "Items missing",
    itemsExhausted:
      "No more items available for this game.",
    nextRound: "Next round",
    finishGame: "Finish game",
    gameComplete: "GAME COMPLETE",
    finalScores: "Final scores",
    backToLobby: "Back to lobby",
    waitingForHost: "Waiting for the host to continue...",
    timerLabel: "Guess time",
  },

  trivia: {
    loading: "Loading Trivia...",
    loadError: "Could not load Trivia",
    noPlayerTitle: "No player found",
    joinAgain: "Join the room again.",
    startTitle: "Quiz time!",
    startDescription:
      "Answer multiple-choice questions across different categories. Fastest correct answers score the most.",
    difficulty: "Difficulty",
    difficultyMixed: "Mixed",
    difficultyEasy: "Easy",
    difficultyMedium: "Medium",
    difficultyHard: "Hard",
    answerLocked: "Answer locked in",
    playersAnswered: "players answered",
    noAnswer: "No answer",
    reveal: "Reveal",
    correct: "Correct!",
    incorrect: "Incorrect",
    questionMissing: "Question missing",
    questionsExhausted:
      "No more questions available for this game.",
    nextRound: "Next round",
    finishGame: "Finish game",
    gameComplete: "GAME COMPLETE",
    finalScores: "Final scores",
    backToLobby: "Back to lobby",
    waitingForHost: "Waiting for the host to continue...",
    timerLabel: "Answer time",
  },

  drawing: {
    loading: "Loading Draw & Guess...",
    loadError: "Could not load Draw & Guess.",
    startTitle: "Draw it. Guess it.",
    startDescription:
      "One player draws a secret word while everyone else tries to guess it as quickly as possible.",
    startGame: "Start game",
    waitingHost: "Waiting for the host...",
    round: "Round",
    drawThis: "Draw this",
    drawer: "Drawing",
    clear: "Clear",
    guessPlaceholder: "Enter your guess...",
    correct: "Correct!",
    wordWas: "The word was",
    nextRound: "Next round",
    finishGame: "Finish game",
    finalScores: "Final scores",
    backToLobby: "Back to lobby",
    waitingContinue: "Waiting for the host to continue...",
    timerLabel: "Drawing time",
    roundsPerPlayerLabel: "Rounds per player",
  },

  gamePage: {
    noRoomSelected: "No room selected",
    joinRoomFirst: "Create or join a room first.",
    bluffNeedsRoom:
        "Bluff is a multiplayer game. Create or join a room first.",
    unknownGame: "Unknown Game",
    notImplemented:
        "This game has not been implemented yet.",
    howToPlay: "How to play",
    },
};

export default en;