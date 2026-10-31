# Hoops Replay

![Hoops Replay demo](img/demo.png)

**From play-by-play text to basketball in motion.**

Hoops Replay turns recorded NBA and WNBA game events into animated replays on a full basketball court.
Follow numbered jerseys, watch possessions unfold, and revisit individual moments—with the recorded
score, game clock and shot locations anchoring the action.

Play-by-play tells us who scored, who rebounded and when possession changed. It does not tell us where
all ten players stood or how they moved. Hoops Replay fills those gaps with plausible choreography:
spacing, passing, dribbling and defensive reactions shaped by the available game data.

**The events are recorded. The choreography between them is inferred.**

## Watch a Replay

[**Open Hoops Replay →**](https://tehes.github.io/hoops-replay/)

The app automatically loads a recent completed NBA or WNBA game. Press **Play** to start.

Hoops Replay is under active development. It uses condensed time—even at 1×—and requires compatible
game data.

## Turning Events into Possessions

A shot, a rebound and the next shot are separate entries in a text feed. Making them feel like
connected basketball takes more than moving a jersey to each event’s location.

- **Read the possession.** Possession changes, interruptions and offensive rebounds shape how the
  next action develops.
- **Give players context.** Available positions, heights, weights, shooting tendencies and assist
  profiles help choose spacing and defensive matchups.
- **Coordinate the court.** Attackers spread out and move into receiving positions while defenders
  respond to the ball and their assignments.
- **Connect the action.** Schematic passes and dribble routes lead into recorded events. Players
  can move simultaneously as a possession develops.
- **Keep the recorded anchors.** Events, involved players, scores, game-clock times and available
  shot coordinates constrain the replay.

These clues support plausible basketball movement. They cannot reveal the exact formation,
pass sequence or play that actually happened.

## What You Can Follow

- **NBA and WNBA games** with league-specific teams, court markings and period lengths.
- **Both teams on a full court**, represented by numbered jerseys in team colors.
- **The recorded game story:** score, clock, player photos and original play-by-play descriptions.
- **Different finishes**, including distinct movements and ball flights for dunks, layups and jump shots.
- **Shot results on the court:** green dots for makes and red crosses for misses.
- **Any part of the replay**, using the timeline, period selector and possession controls.

## How to Use

1. Press **Play** to start or pause.
2. Choose a playback speed: **0.5×, 1×, 1.5×, 2× or 4×**.
3. Drag the timeline to seek, select a period, or use the previous/next buttons to move between possessions.
4. Tap or click a jersey to see the player’s name.

On a keyboard, **Space** toggles playback and the **left/right arrow keys** move between possessions.
Pressing Play at the end restarts the replay.

### Load Another Game

Open a completed game on [NBA.com](https://www.nba.com/games) or
[WNBA.com](https://www.wnba.com/schedule) and copy the ten-digit Game ID from its URL,
including leading zeros.

Replace the number after `?game=` in the replay link:

[https://tehes.github.io/hoops-replay/?game=0022600002](https://tehes.github.io/hoops-replay/?game=0022600002)

### Link to a Moment

A link can open a replay paused at a specific recorded event:

[DEN at OKC, action 17](https://tehes.github.io/hoops-replay/?game=0022600007&action=17)

Add `&action=ACTION_NUMBER` to a game link, using the event’s `actionNumber` from the play-by-play data.
Press **Play** to continue, or scrub back a few seconds to watch the buildup.

## What the Replay Can—and Cannot—Show

Hoops Replay visualizes the recorded sequence of a game. It does not use player-tracking data:
formations, defensive assignments, connecting passes and movement between events are schematic estimates.

Playback condenses the game rather than reproducing its original duration. Only completed games with
compatible play-by-play and boxscore data can be loaded; there is no live mode.

Loading games and player photos requires an internet connection.

---

## Technical Reference

### Backend

`api/main.js` provides the following GET endpoints on Deno Deploy. NBA is the default;
all endpoints also accept `?league=wnba`. Profile seasons use `YYYY-YY` for NBA and `YYYY` for WNBA.

| Endpoint | Purpose | Parameters |
| --- | --- | --- |
| `/schedule` | League schedule | Optional `region=de` (default) or `region=us` for broadcast labels. |
| `/boxscore/:gameId` | Teams, players, starting lineups and game statistics | Ten-digit Game ID. |
| `/playbyplay/:gameId` | Recorded events, scores, game clocks and available shot coordinates | Ten-digit Game ID. |
| `/roster/:teamId` | League roster with player IDs, positions, heights and available weights | Required `season`. |
| `/players/:teamId` | Per-game player statistics, including shooting, assists and rebounds | Required `season`; optional `seasonType=Regular Season` (default), `Playoffs` or `Pre Season`. |

### Replay checks

Serve this directory with a local static server for browser development.
All game data comes from the server; there are no bundled games or local fallbacks.
Automatic selection tries up to three recent completed games if their feeds or replay validation fail.
A schedule failure, no eligible games, or failure of all candidates shows a loading error.
An explicit Game ID always requests that game only.

Run the server batch with Deno:

```sh
deno task audit
```

The default selects up to ten completed games per league, spread across the available NBA and WNBA
schedules, including preseason and postseason. To change the selection:

```sh
deno task audit --league=nba --limit=20
deno task audit --league=wnba --limit=0
deno task audit 0022600007 1042600304
```

`--limit=0` selects every completed game. Explicit IDs bypass schedule selection and the limit.
Games are processed sequentially, with both detail feeds fetched in parallel. Failures are reported
without replacing or skipping them silently; any failure gives exit code 1.

The JSONL output records the selected IDs, league, source, season, input hash, existing validation
results and summary. Redirect stdout to keep a report; warnings go to stderr. Game feeds are reused
in memory within a process and are never written to disk. Input hashes help identify feed changes
between runs; they do not preserve the data or provide an automatic baseline comparison.
The current audit does not establish complete rule coverage or visual basketball plausibility.

Existing individual checks can still be run; real-game inputs also come from the server:

```sh
deno task test:data
deno task test:local
```

These checks depend on server availability and current feed contents. No game-data read or write
permission is needed for development checks.
Use `deno task test` to run all existing individual checks together.

---

## License & Credits

The code is source-available under the MIT License with the Commons Clause condition.
See [LICENSE.txt](LICENSE.txt) for the terms.

NBA and WNBA game data, team names, logos, and player photos belong to their respective owners.
Player photos load from the respective league's CDN; team logos are stored locally.
Hoops Replay is an independent, unofficial project.
