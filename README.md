# GameNight

A multiplayer party-game web app: create a room, share the code, play
together on your phones. React + Vite + TypeScript on Supabase, deployed on
Vercel. Every game is bilingual (English and German).

## Running it locally

```bash
npm install
npm run dev
```

The app needs a Supabase project. Copy `.env.example` to `.env.local` and
fill in the two values from your project's API settings — the app throws at
startup without them, rather than failing later with a confusing error.

```bash
cp .env.example .env.local
```

Apply the migrations in `supabase/migrations/` to that project, in
filename order.

## Checks

```bash
npm run lint    # eslint
npm test        # vitest
npm run build   # tsc -b, then the production bundle
```

`npm run build` is what typechecks the project — `npm run lint` does not.
CI (`.github/workflows/ci.yml`) runs all three on every push and pull
request.

## Getting people into a room

The lobby offers three ways in, because different situations want different
ones: the bare code to read aloud, a share link that opens the join screen
with the code already filled in, and a QR code for when everyone is in the
same room holding phones. The QR encoder is loaded only when someone opens
it, so it costs nothing on first paint.

## Losing the connection

Supabase rejoins a dropped channel by itself, but nothing replays what
changed while it was gone — a phone locked mid-game would come back to a
board frozen two rounds earlier, looking identical to a game where nobody
had answered yet.

`src/lib/realtime.ts` tracks the connection and hands out a generation
number that every subscribing hook keeps in its effect dependencies.
Bumping it re-subscribes and refetches, which is what recovering from a gap
requires. A recovery is triggered by a channel that errors and comes back,
by the network returning, or by the tab waking after more than ten seconds
in the background. While any of that is unresolved a banner says so, so
"is it frozen?" has an answer on screen.

## In-app feedback

The Feedback button in the header files a GitHub issue from inside the app,
so a player who hits a bug does not have to leave the game to report it.
The report carries the screen they were on, with the room code stripped
out — the issue is public, and a code in it would let anyone join.

It needs one environment variable on the Vercel project:

| Variable | Required | What it does |
| --- | --- | --- |
| `GITHUB_TOKEN` | yes | A fine-grained personal access token with **Issues: Read and write** on this repository. Without it the endpoint returns 503 and the form says feedback is not set up. |
| `GITHUB_REPO` | no | `owner/repo` to file into. Defaults to `Xoronin/GameNight`. |
| `FEEDBACK_DISABLED` | no | Set to any value to turn the endpoint off without a deploy. |

Issues are labelled `feedback` plus `bug` or `enhancement`. Create the
`feedback` label if you want the grouping — the endpoint drops it rather
than losing the report when it does not exist.

The endpoint is public, as it must be for guests to use it. It caps message
length and thins out bursts from one address, but that is best-effort:
serverless instances do not share memory. If it ever attracts spam,
`FEEDBACK_DISABLED` turns it off immediately.
