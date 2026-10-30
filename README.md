# Hoops Replay

![Hoops Replay demo](img/demo.png)

Watch completed NBA and WNBA games play out as little jerseys move around a basketball court. Hoops Replay
uses real play-by-play events and available shot coordinates to create a schematic replay of the game.
Playback condenses the game, so even at 1× it does not run in real time.

**Hoops Replay is under active development.** Game compatibility depends on the available play-by-play
and boxscore data. Player movements are schematic estimates, not a reconstruction from tracking data.

---

## Try It Out

Open [TOR at WAS in Hoops Replay](https://tehes.github.io/hoops-replay/?game=0022600097)
to try a completed NBA game directly in your browser.
For a WNBA example, open [Golden State at Atlanta](https://tehes.github.io/hoops-replay/?game=1042600304).

Without a Game ID in the URL, the app opens the bundled DEN–OKC example.

---

## Features

- **NBA and WNBA:** League detection from the Game ID, with league-specific team names, colors, logos,
  quarter lengths (NBA: 12 minutes; WNBA: 10 minutes), and three-point lines.
- **Full-court replay:** Follow both teams as numbered jerseys on a court with the home team's logo and colors.
- **Coordinated movement:** Players spread out, cut and move into position while defenders react to the ball
  and their matchups.
- **Possession choreography:** Schematic passes and dribble routes connect recorded events, with buildup
  that adapts to possession changes, interruptions and second chances.
- **Play-by-play display:** See the score, game clock, player photos, and original event descriptions.
- **Different shot animations:** Dunks, layups, jump shots, and other finishes have different movements and ball flights.
- **Shot markers:** Made shots appear as green dots; misses appear as red crosses. Markers fade with replay time.
- **Playback controls:** Pause, change speed, scrub the timeline, or jump between quarters and possessions.
- **Load other games:** Use a completed NBA or WNBA game's ID in the URL to request its replay.

---

## How to Use

1. Open a replay and press **Play**.
2. Use the speed selector to slow down or speed up playback (0.5×, 1×, 1.5×, 2× or 4×).
3. Drag the timeline to any point, select a quarter, or use the previous/next buttons to move between possessions.
4. Tap or click a jersey to show the player's name.

On a keyboard, **Space** toggles playback and the **left/right arrow keys** move between possessions.
Pressing Play at the end restarts the replay.

### Load Another Game

1. Open a completed game's match page on [NBA.com](https://www.nba.com/games)
   or [WNBA.com](https://www.wnba.com/schedule).
2. Find the ten-digit number in the match URL. For example:

   ```text
   https://www.nba.com/game/phi-vs-nyk-0022600002
                                    ^^^^^^^^^^
                                    Game ID
   ```

3. Copy `0022600002`, including the leading zeros.
4. In the Hoops Replay link, replace the number after `?game=` with that Game ID:
   [https://tehes.github.io/hoops-replay/?game=0022600002](https://tehes.github.io/hoops-replay/?game=0022600002)

### Jump to an Action

Add `&action=ACTION_NUMBER` to a game link to open the replay paused at that event, for example:
[DEN at OKC, action 17](https://tehes.github.io/hoops-replay/?game=0022600007&action=17).
Press **Play** to continue from there.
The link starts at the event itself. Scrub back a few seconds before pressing Play to watch its buildup.

The number is the event's `actionNumber` from the NBA or WNBA play-by-play data (also stored in local
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
Defensive assignments remain stable within an attack and follow substitutions. Where suitable, the buildup
includes short dribble routes or connecting passes. These are schematic additions, not recorded pass
sequences or evidence of a specific play. For a shot directly following an offensive rebound, an eligible
next shooter can move toward the receiving position during the preceding action.

- **Schematic movement:** Player locations between recorded events are estimates. The replay does
  not show the ten players' actual positions or claim to reproduce specific plays without evidence.
- **Condensed time:** Even at 1×, playback is not real time. Gaps between recorded game-clock times guide
  the buildup, and the displayed clock reaches each recorded event time. Players can move simultaneously;
  long routes can extend a scene when the condensed budget is too short. Shot flights keep their own timing.
- **Completed games only:** There is no live replay mode. A game must have compatible, consistent
  play-by-play and boxscore feeds. Invalid or unsupported games show an error instead of a substitute game.
- **Team colors:** Jerseys adapt automatically for clear separation and readable numbers, with home normally in white.
  Colors and uniforms are schematic replay conventions.
- **Network access:** Loading a game by ID and displaying NBA or WNBA player photos require a connection.
  There is no Service Worker or offline caching.
- **Overtime:** Five-minute overtime periods and quarter controls are implemented and covered by
  synthetic tests. The archived MIN–CLE overtime game also passes data and replay validation;
  its overtime playback has not yet been visually verified.

---

## License & Credits

The code is source-available under the MIT License with the Commons Clause condition.
See [LICENSE.txt](LICENSE.txt) for the terms.

NBA and WNBA game data, team names, logos, and player photos belong to their respective owners.
Player photos load from the respective league's CDN; team logos are stored locally.
Hoops Replay is an independent, unofficial project.

