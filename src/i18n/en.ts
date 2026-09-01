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
    badge: "PARTY GAMES FOR EVERYONE",
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
    review: "Review",
    accept: "Accept",
    reject: "Reject",

    labels: {
      city: "City",
      country: "Country",
      river: "River",
      animal: "Animal",
      name: "Name",
      profession: "Profession",
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
  },
  gamePage: {
    noRoomSelected: "No room selected",
    joinRoomFirst: "Create or join a room first.",
    bluffNeedsRoom:
        "Bluff is a multiplayer game. Create or join a room first.",
    unknownGame: "Unknown Game",
    notImplemented:
        "This game has not been implemented yet.",
    },
};

export default en;