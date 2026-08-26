# Create folders
$folders = @(
    "src/components",
    "src/games",
    "src/games/bluff",
    "src/games/minefield",
    "src/games/higher-lower",
    "src/games/trivia",
    "src/games/categories",
    "src/games/draw-guess",
    "src/pages",
    "src/data",
    "src/types",
    "src/hooks",
    "src/utils"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}

# Create files
$files = @(
    "src/components/GameCard.tsx",
    "src/components/Header.tsx",
    "src/components/PlayerSetup.tsx",

    "src/games/bluff/BluffGame.tsx",
    "src/games/minefield/MinefieldGame.tsx",
    "src/games/higher-lower/HigherLowerGame.tsx",
    "src/games/trivia/TriviaGame.tsx",
    "src/games/categories/CategoriesGame.tsx",
    "src/games/draw-guess/DrawGuessGame.tsx",

    "src/pages/Home.tsx",
    "src/pages/GamePage.tsx",
    "src/pages/Lobby.tsx",
    "src/pages/JoinRoom.tsx",

    "src/data/games.ts",

    "src/types/game.ts",
    "src/types/player.ts",

    "src/hooks/useGame.ts",

    "src/utils/gameUtils.ts"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
    }
}

Write-Host ""
Write-Host "Game Night structure created!"
Write-Host ""
tree src /F