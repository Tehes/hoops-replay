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
python3 -m http.server 5501 --bind 127.0.0.1
```

Open [DEN at OKC](http://127.0.0.1:5501/) or
[NYK at BOS](http://127.0.0.1:5501/?game=0022600008).
Port 5501 allows the schedule project to keep running on port 5500.
Opening index.html directly from the filesystem will not load modules and data correctly.

## Reference games and data

| Game ID | Matchup | Final score |
| --- | --- | --- |
| 0022600007 | Denver at Oklahoma City | DEN 84–96 OKC |
| 0022600008 | New York at Boston | NYK 103–107 BOS |
| 0022600094 | Atlanta at Charlotte | ATL 128–81 CHA |

The default game is DEN–OKC. Any ten-digit `?game=GAME_ID` loads the corresponding local snapshot.
An invalid ID or a missing snapshot shows a loading error; it does not silently switch games.
Each data file includes source URLs. Both snapshots contain the play-by-play, player/team metadata,
and boxscore information needed by the replay. All required logos and the favicon are local.

Shot coordinates come from the recorded events. Formations, defensive matchups, passes, rebounds,
and running paths are schematic reconstructions, not tracking data. The choreography is computed
before playback. Different shot types use different approaches, player poses, and ball flights.

The browser loads local JSON only. The command-line importer downloads the NBA feeds from the
schedule project's existing Deno Deploy backend. No backend or deployment configuration was changed.
Direct browser loading from that backend and allowing a future replay domain via CORS are separate
follow-up work. The importer already downloads both feeds and produces local snapshots.
No Service Worker, analytics, or placeholder API is included in this app.

## Import another completed game

Run from the repository root with Deno installed:

```sh
deno run --allow-net=nba-spielplan.tehes.deno.net --allow-read --allow-write=data scripts/import-game.js 0022600094
```

This example is already included, so the command refuses to overwrite it. Substitute another completed
NBA game ID, or add `--overwrite` to explicitly refresh an existing import. Then open
`http://127.0.0.1:5501/?game=GAME_ID`. No frontend allowlist or additional team assets are required.

The importer saves the original responses to `data/raw/boxscore-GAME_ID.json` and
`data/raw/playbyplay-GAME_ID.json`. It checks completion, IDs, rosters, coordinates, scene scores,
ball owners, interpolation, and shot behavior before writing `data/replay-GAME_ID.json`.
Overtime is currently rejected. Unsupported or inconsistent games remain raw data for investigation;
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
Raw archives are intentionally excluded. `scripts/check-replay.js` supplies the same checks for
both the importer and the audit, so new imports must pass the same regression criteria.

## Files

- `index.html`: standalone court, scoreboard, and playback controls.
- `css/replay.css`: page layout and styling.
- `js/replay.js`: canvas rendering, data loading, and playback.
- `js/replay-engine.js`: event interpretation, formations, matchups, and scene compilation.
- `js/replay-shots.js`: shot profiles, player movement, and ball trajectories.
- `js/replay-teams.js`: schematic jersey palettes for all 30 NBA teams.
- `data/replay-*.json`: self-contained reference games with source attribution.
- `data/raw/`: archived original responses, including a rejected import example.
- `scripts/`: Deno-only import and regression-check tools; never loaded by the browser.
- `img/NBA/`: local logos for all 30 NBA teams.

All runtime paths are relative, including when hosted under a GitHub Pages repository path.
The entry point is index.html; the old replay.html route is no longer used.

## Controls

Play/pause, playback speed, timeline scrubbing, quarter jumps, and previous/next possession.
Space toggles playback; arrow keys move between possessions. Tap a jersey to show the player's name.
Made shots show circles and +2/+3 markers; misses show crosses. Event markers fade with replay time.

## Development checks

Deno runs the import/audit tools and the existing format/lint checks; it is not a browser runtime.
Playing an already stored snapshot only requires a static server.

```sh
deno fmt --check js/replay.js js/replay-engine.js js/replay-shots.js js/replay-teams.js scripts/ css/replay.css index.html
deno check js/replay.js js/replay-engine.js js/replay-shots.js js/replay-teams.js scripts/*.js
deno lint js/replay.js js/replay-engine.js js/replay-shots.js js/replay-teams.js scripts/
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
