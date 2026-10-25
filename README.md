# Hoops Replay

![Hoops Replay demo](img/demo.png)

Watch completed NBA games play out as little jerseys move around a basketball court. Hoops Replay
uses real play-by-play events and available shot coordinates to create a schematic replay of the game.

**This is a very early prototype.** Expect bugs, odd movements, and games that cannot be loaded yet.
The player movements are schematic estimates, not a reconstruction from tracking data.

---

## Try It Out

Open [TOR at WAS in Hoops Replay](https://tehes.github.io/hoops-replay/?game=0022600097)
to try a completed game directly in your browser.

Without a Game ID in the URL, the app opens the bundled DEN–OKC example.

---

## Features

- **Full-court replay:** Follow both teams as numbered jerseys on a court with the home team's logo and colors.
- **Play-by-play display:** See the score, game clock, player photos, and original event descriptions.
- **Different shot animations:** Dunks, layups, jump shots, and other finishes have different movements and ball flights.
- **Shot markers:** Made shots appear as green dots; misses appear as red crosses. Markers fade with replay time.
- **Playback controls:** Pause, change speed, scrub the timeline, or jump between quarters and possessions.
- **Load other games:** Use a completed NBA game's ID in the URL to request its replay.

---

## How to Use

1. Open a replay and press **Play**.
2. Use the speed selector to slow down or speed up playback.
3. Drag the timeline to any point, select a quarter, or use the previous/next buttons to move between possessions.
4. Tap or click a jersey to show the player's name.

On a keyboard, **Space** toggles playback and the **left/right arrow keys** move between possessions.
Pressing Play at the end restarts the replay.

### Load Another Game

1. Open a completed game's match page on [NBA.com](https://www.nba.com/games).
2. Find the ten-digit number in the match URL. For example:

   ```text
   https://www.nba.com/game/phi-vs-nyk-0022600002
                                    ^^^^^^^^^^
                                    Game ID
   ```

3. Copy `0022600002`, including the leading zeros.
4. In the Hoops Replay link, replace the number after `?game=` with that Game ID:
   [https://tehes.github.io/hoops-replay/?game=0022600002](https://tehes.github.io/hoops-replay/?game=0022600002)

The replay loads the game directly. No download or command-line import is needed.
If your link already contains a `game` value, replace it rather than adding a second one.

### Jump to an Action

Add `&action=ACTION_NUMBER` to a game link to open the replay paused at that event, for example:
[DEN at OKC, action 17](https://tehes.github.io/hoops-replay/?game=0022600007&action=17).
Press **Play** to continue from there.

The number is the event's `actionNumber` from the NBA play-by-play data (also stored in local
`data/replay-<gameId>.json` snapshots). It is an event ID, not its position in the event list,
a quarter, or a replay timestamp. Include `game` when sharing links to identify the correct game.
For the bundled default game, `?action=17` works without a `game` parameter.

Events combined into one replay scene, such as a shot and its block or simultaneous substitutions,
jump to the same scene's event time; the display shows the main event's description.
An invalid or unknown action number leaves the replay at the beginning and logs a console warning.

---

## How It Works & Limitations

Play-by-play supplies the events, their order, scores, and involved players. Recorded shot coordinates
anchor field goals; boxscore data supplies players and starting lineups. The replay adds schematic
formations, defensive matchups, passes, rebounds, and running paths to connect the events.

- **Schematic movement:** Player locations between recorded events are estimates. The replay does
  not show the ten players' actual positions or claim to reproduce specific plays without evidence.
- **Completed games only:** There is no live replay mode. A game must have compatible, consistent
  play-by-play and boxscore feeds. Invalid or unsupported games show an error instead of a substitute game.
- **Team colors:** Court colors and uniforms use fixed team palettes, not the game's actual court
  design or uniform selection.
- **Network access:** Loading a game by ID and displaying NBA player photos require a connection.
  There is no Service Worker or offline caching.
- **Overtime:** Five-minute overtime periods and quarter controls are implemented and covered by
  synthetic tests; a real overtime game has not yet been verified.

---

## For Developers

Built with vanilla HTML, CSS, and JavaScript modules. No dependencies, frameworks, or build step.
Deno is used for the optional import and verification tools; the frontend runs in the browser.

### Run Locally

Serve the repository with a static server, for example:

```sh
python3 -m http.server 5500 --bind 127.0.0.1
```

Open [http://127.0.0.1:5500/](http://127.0.0.1:5500/).
Use this exact origin for loading games by ID: the backend allows `127.0.0.1:5500`.
Other ports and `localhost` are different origins. Opening `index.html` directly will not load modules and data correctly.

### Project Structure

```text
├── index.html               # Court, scoreboard, and playback controls
├── css/style.css            # Base styles and replay layout
├── js/
│   ├── app.js               # Application entry point, rendering, and playback
│   ├── replay-engine.js     # Scenes, lineups, possession, and movement planning
│   ├── replay-shots.js      # Shot profiles and ball trajectories
│   ├── replay-teams.js      # Team names and color palettes
│   ├── replay-data.js       # Feed loading and normalization
│   └── replay-validation.js # Shared replay checks
├── data/                    # Reference snapshots and archived raw feeds
├── scripts/                 # Deno import and verification tools
├── img/                     # Demo image and local team logos
└── icons/                   # Application icon
```

All runtime paths are relative, including under a GitHub Pages repository path.
Umami page-view tracking is limited to `tehes.github.io`; localhost previews are excluded.

### Import a Regression Fixture

The optional importer archives a completed game for repeatable local checks. Replace `GAME_ID`
with its ten-digit ID:

```sh
deno run --allow-net=nba-spielplan.tehes.deno.net --allow-read --allow-write=data scripts/import-game.js GAME_ID
```

It saves the raw feeds under `data/raw/` and writes a playable `data/replay-GAME_ID.json` only after
validation succeeds. Existing files are preserved unless `--overwrite` is explicitly passed.
Loading `?game=GAME_ID` still requests backend data, even when a local fixture exists.

### Development Checks

```sh
deno fmt --check js/ scripts/ css/style.css index.html
deno check js/*.js scripts/*.js
deno lint js/ scripts/
deno test --allow-read=data scripts/replay-data_test.js
deno run --allow-read=data scripts/audit-replays.js
git diff --check
```

The audit discovers all local replay snapshots and checks scores, lineups, ball ownership, coordinates,
interpolation, and shot behavior. Raw archives are excluded.

For a browser check, load a game, play and pause, scrub across halftime, and seek to the final score.
Check the controls and court on both mobile and desktop widths.

---

## License & Credits

The code is source-available under the MIT License with the Commons Clause condition.
See [LICENSE.txt](LICENSE.txt) for the terms.

NBA game data, team names, logos, and player photos belong to their respective owners. Player photos
load from the NBA CDN; team logos are stored locally. Hoops Replay is an independent, unofficial project.
