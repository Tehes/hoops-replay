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

The default game is DEN–OKC. The game parameter currently accepts only these two bundled snapshots.
Each data file includes source URLs. Both snapshots contain the play-by-play, player/team metadata,
and boxscore information needed by the replay. All required logos and the favicon are local.

Shot coordinates come from the recorded events. Formations, defensive matchups, passes, rebounds,
and running paths are schematic reconstructions, not tracking data. The choreography is computed
before playback. Different shot types use different approaches, player poses, and ball flights.

The prototype loads local JSON only. The existing NBA feeds can continue to run on the schedule
project's Deno Deploy backend; no backend or deployment configuration was moved or changed.
Connecting that backend and allowing a future replay domain via CORS are separate follow-up work.
No Service Worker, analytics, or placeholder API is included in this app.

## Files

- `index.html`: standalone court, scoreboard, and playback controls.
- `css/replay.css`: page layout and styling.
- `js/replay.js`: canvas rendering, data loading, and playback.
- `js/replay-engine.js`: event interpretation, formations, matchups, and scene compilation.
- `js/replay-shots.js`: shot profiles, player movement, and ball trajectories.
- `data/replay-*.json`: self-contained reference games with source attribution.
- `img/NBA/`: the four reference teams' logos.

All runtime paths are relative, including when hosted under a GitHub Pages repository path.
The entry point is index.html; the old replay.html route is no longer used.

## Controls

Play/pause, playback speed, timeline scrubbing, quarter jumps, and previous/next possession.
Space toggles playback; arrow keys move between possessions. Tap a jersey to show the player's name.
Made shots show circles and +2/+3 markers; misses show crosses. Event markers fade with replay time.

## Development checks

Deno is optional tooling for the existing format and lint configuration; it is not a browser runtime.

```sh
deno fmt --check js/replay.js js/replay-engine.js js/replay-shots.js css/replay.css index.html
deno check js/replay.js js/replay-engine.js js/replay-shots.js
deno lint js/replay.js js/replay-engine.js js/replay-shots.js
git diff --check
```

Manual verification:

1. Load both reference games and verify team logos, homecourt, and starting lineups.
2. Play, pause, scrub, change speed, and tap a jersey; paused event markers must remain frozen.
3. Check DEN–OKC Q1 8:16 (alley-oop), 7:49 (tip-in), 2:42 (reverse layup), and NYK–BOS Q2 1:24 (step-back).
4. Jump between quarters and check the basket change after halftime; check NYK–BOS Q3 0:46.1 (technical free throw).
5. Seek to the end of both games: verify the final scores, FINAL, and restart via Play. Check portrait and landscape layouts.

## License

See [LICENSE.txt](LICENSE.txt). NBA game data, team names, and logos belong to their respective owners.
This is an independent, unofficial project.
