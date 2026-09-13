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

## Music Timeline and Spotify

Music Timeline plays a song and asks the player whose turn it is to slot it
into their own timeline by release year. Only the **host** signs in to
Spotify: their browser becomes the playback device, so it is the speaker
for the room and nobody else sees a Spotify prompt.

The game is playable without any of this. With no Spotify connection it
shows the song's title and artist instead of playing it, and the round
becomes "when did this come out?" rather than "name the year of this".

### What the host needs

- **Spotify Premium.** The Web Playback SDK refuses to create a device on a
  free account. The game detects that and falls back to no audio.
- A modern browser tab that stays open — that tab *is* the speaker.

### Setting up the Spotify app

1. Create an app at <https://developer.spotify.com/dashboard>.
2. Add a redirect URI of `https://<your-domain>/spotify-callback`, plus
   `http://127.0.0.1:5173/spotify-callback` if you want it working locally.
3. Enable the **Web Playback SDK** for the app.
4. Copy the client id into `VITE_SPOTIFY_CLIENT_ID` on the Vercel project
   and in `.env.local`.

There is no client secret. The app uses Authorization Code with PKCE, which
is the flow designed for a client that cannot keep one, so the client id is
the only value involved and it is public by design.

While the Spotify app is in development mode its dashboard has a user list,
and **only the accounts on that list can sign in**. Add every host who will
run a room. Lifting that limit needs a quota-extension request to Spotify.

### Why the years are ours

`music_songs.release_year` is curated in the migration rather than read
from any API. Streaming metadata dates a track to whichever release the
catalogue is currently serving, so a 1975 song on a 2011 remaster reports
2011 — which in a game scored entirely on the year would mark a correct
placement wrong. The recording itself is looked up at play time from the
title and artist; `spotify_track_id` is there to pin a song whose search
lands on the wrong version, and is null until somebody needs it.
