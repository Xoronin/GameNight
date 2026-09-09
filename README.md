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
