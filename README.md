[![Hoops Replay – Court-Replay-Demo](img/demo.png)](img/demo.png)

# Hoops Replay

Schematic NBA game replays on a full basketball court, powered by play-by-play and boxscore data.
Built with vanilla HTML, CSS, and JavaScript. No dependencies or build step.

The prototype originated in [nba-spielplan](https://github.com/Tehes/nba-spielplan).
This repository is now its independent home.

Read [PROJECT.md](PROJECT.md) for the product vision, reconstruction rules, architecture, known
limits, and developer handoff. Coding rules live in [AGENTS.md](AGENTS.md).

## Run locally

Serve the repository with a static web server. For example, if Python 3 is installed:

```sh
python3 -m http.server 5500 --bind 127.0.0.1
```

Open [DEN at OKC](http://127.0.0.1:5500/) or
[NYK at BOS](http://127.0.0.1:5500/?game=0022600008).
Use exactly `127.0.0.1:5500` for backend loading: this origin is already allowed by the backend.
Other localhost ports and `localhost` are different origins. No backend/CORS configuration was changed.
Opening index.html directly from the filesystem will not load modules and data correctly.

## Reference games and data

| Game ID | Matchup | Final score |
| --- | --- | --- |
| 0022600007 | Denver at Oklahoma City | DEN 84–96 OKC |
| 0022600008 | New York at Boston | NYK 103–107 BOS |
| 0022600094 | Atlanta at Charlotte | ATL 128–81 CHA |

Without a `game` parameter, the app opens the bundled DEN–OKC example without fetching game data
from the backend. With `?game=GAME_ID`, any ten-digit NBA game ID is loaded directly from the
existing backend's boxscore and play-by-play endpoints, even if a local snapshot exists.
For example: [DAL at IND](http://127.0.0.1:5500/?game=0022600095). No import or saved replay is required.
The game must be completed and have compatible, consistent liveData feeds. Invalid IDs, unfinished
games, unavailable data, and failed replay checks show an error, without switching games.
Each data file includes source URLs. Both snapshots contain the play-by-play, player/team metadata,
and boxscore information needed by the replay. Team logos and the favicon are local; player photos load directly from the NBA CDN.

Shot coordinates come from the recorded events. Formations, defensive matchups, passes, rebounds,
and running paths are schematic reconstructions, not tracking data.
Starting positions are planned backward from the recorded finish and assist, with off-ball players
retaining their previous schematic positions where possible. The first setup uses fallback spacing;
subsequent possessions use local adjustments instead of fixed formation templates. Same-possession
restarts preserve current positions. Pick-and-roll/pop or screens require explicit source evidence.
The choreography is computed
before playback. Different shot types use different approaches, player poses, and ball flights.

The browser normalizes and validates both backend feeds before enabling playback. It computes the
choreography in memory and does not write snapshots or raw feeds. The optional command-line importer
remains available for archiving data and adding regression fixtures. Browser loading and the importer
share normalization and validation. Regulation periods use 12 minutes; overtime periods use 5 minutes,
with dynamic Q1–Q4 / OT1 / OT2 controls. OT boundaries have synthetic coverage; a real OT game has
not yet been verified. A future replay domain will need its own backend CORS permission.
No Service Worker, analytics, or placeholder API is included in this app.

## Import another completed game

Run from the repository root with Deno installed:

```sh
deno run --allow-net=nba-spielplan.tehes.deno.net --allow-read --allow-write=data scripts/import-game.js 0022600094
```

This example is already included, so the command refuses to overwrite it. Substitute another completed
NBA game ID, or add `--overwrite` to explicitly refresh an existing import. The resulting snapshot
is for the local regression audit; `?game=GAME_ID` still requests current backend data.
No frontend allowlist or additional team assets are required.

The importer saves the original responses to `data/raw/boxscore-GAME_ID.json` and
`data/raw/playbyplay-GAME_ID.json`. It checks completion, IDs, rosters, coordinates, scene scores,
ball owners, interpolation, and shot behavior before writing `data/replay-GAME_ID.json`.
Unsupported or inconsistent games remain raw data for investigation;
a successful final score alone is insufficient. A failed refresh leaves any prior replay snapshot in place.
The two older reference snapshots predate this importer and do not have raw-response archives here.

The captured HOU–SAS game `0022600009` is a known rejected example: raw feeds are included, but no
playable snapshot. Several event clocks/scores conflict with feed ordering and the compiled replay
has hidden ball owners. Do not silently repair it by sorting action IDs or bypassing validation.

Run all locally stored playable games through the shared audit after adding a fixture:

```sh
deno run --allow-read=data scripts/audit-replays.js
```

It discovers `data/replay-*.json` automatically and exits unsuccessfully on validation errors.
Raw archives are intentionally excluded. `js/replay-validation.js` supplies the same checks for the
browser, importer, and audit; `scripts/check-replay.js` re-exports it for existing CLI callers.

## Files

- `index.html`: standalone court, scoreboard, and playback controls.
- `css/replay.css`: page layout and styling.
- `js/replay.js`: canvas rendering, data loading, and playback.
- `js/replay-engine.js`: event interpretation, formations, matchups, and scene compilation.
- `js/replay-shots.js`: shot profiles, player movement, and ball trajectories.
- `js/replay-teams.js`: schematic jersey palettes for all 30 NBA teams.
- `js/replay-data.js`: shared feed normalization and browser game loading.
- `js/replay-validation.js`: shared replay integrity and animation checks.
- `data/replay-*.json`: self-contained reference games with source attribution.
- `data/raw/`: archived original responses, including a rejected import example.
- `scripts/`: Deno-only import and regression-check tools; never loaded by the browser.
- `img/NBA/`: local logos for all 30 NBA teams.
Player photos are linked directly by player ID:
`https://cdn.nba.com/headshots/nba/latest/260x190/PLAYER_ID.png`.
They are not downloaded into the repository. Unavailable photos use the local team logo.

All runtime paths are relative, including when hosted under a GitHub Pages repository path.
The entry point is index.html; the old replay.html route is no longer used.

## Controls

Play/pause, playback speed, timeline scrubbing, quarter jumps, and previous/next possession.
Space toggles playback; arrow keys move between possessions. Tap a jersey to show the player's name.
The jumbotron keeps scores and game time visible. Its lower panel shows the player's photo and the
scene's original play-by-play description at the event time for up to five replay seconds, replaced
by the next event. Pausing freezes the panel; scrubbing reconstructs it directly.
Made shots show green dots and +1/+2/+3 markers; misses show red crosses. Shot markers fade with
replay time. Other events, quarter transitions, and game end appear in the jumbotron; no event icons
or quarter/final banners cover the court.

## Development checks

Deno runs the import/audit tools and the existing format/lint checks; it is not a browser runtime.
The default example only requires a static server. Explicit game IDs also require backend access.

```sh
deno fmt --check js/ scripts/ css/replay.css index.html
deno check js/*.js scripts/*.js
deno lint js/ scripts/
deno test --allow-read=data scripts/replay-data_test.js
git diff --check
```

Manual verification:

1. Load all three reference games and verify team logos, homecourt, and starting lineups.
2. Play, pause, scrub, change speed, and tap a jersey; paused event markers must remain frozen.
3. Check DEN–OKC Q1 8:16 (alley-oop), 7:49 (tip-in), 2:42 (reverse layup), and NYK–BOS Q2 1:24 (step-back).
4. Jump between quarters and check the basket change after halftime; check NYK–BOS Q3 0:46.1 (technical free throw).
5. Seek to the end of all three games: verify the final scores, FINAL, and restart via Play. Check portrait and landscape layouts.

## License

See [LICENSE.txt](LICENSE.txt). NBA game data, team names, and logos belong to their respective owners.
This is an independent, unofficial project.
