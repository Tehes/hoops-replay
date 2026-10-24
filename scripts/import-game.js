import { checkReplay } from "./check-replay.js";
import { TEAM_COLORS } from "../js/replay-teams.js";

const API_BASE = "https://nba-spielplan.tehes.deno.net";
const ROOT = new URL("../data/", import.meta.url);
const SLOTS = ["PG", "SG", "SF", "PF", "C"];

async function fetchFeed(path) {
	// This backend checks Origin for server-side clients as well as browsers.
	const response = await fetch(`${API_BASE}/${path}`, {
		headers: { Origin: "http://127.0.0.1:5500" },
	});
	if (!response.ok) {
		throw new Error(`${path}: HTTP ${response.status}`);
	}
	return await response.json();
}

function normalizeTeam(team, home) {
	if (!TEAM_COLORS[team.teamTricode] || !Array.isArray(team.players)) {
		throw new Error(`Unsupported team or missing roster: ${team.teamTricode}`);
	}
	const players = team.players.map((player) => ({
		id: player.personId,
		name: player.name,
		number: player.jerseyNum,
		position: player.position || "",
		starter: player.starter === "1",
		minutes: player.statistics?.minutes || "PT00M00.00S",
	}));
	const starters = players.filter((player) => player.starter);
	if (starters.length !== 5) {
		throw new Error(`${team.teamTricode}: expected five starters.`);
	}
	const available = new Set(SLOTS);
	const unresolved = [];
	for (const player of starters) {
		if (available.has(player.position)) {
			available.delete(player.position);
		} else {
			unresolved.push(player);
		}
	}
	// A formation needs five unique slots; these are schematic roles, not tracking facts.
	for (const player of unresolved) {
		player.sourcePosition = player.position;
		player.position = available.values().next().value;
		player.positionSource = "schematic";
		available.delete(player.position);
		console.warn(`${team.teamTricode}: schematic ${player.position} slot for ${player.name}.`);
	}
	return {
		id: team.teamId,
		code: team.teamTricode,
		name: team.teamName,
		home,
		score: team.score,
		players,
	};
}

function normalizeGame(gameId, boxscore, playByPlay) {
	const game = boxscore.game;
	if (game?.gameId !== gameId || playByPlay.game?.gameId !== gameId) {
		throw new Error("Feed game IDs do not match the requested game.");
	}
	if (game.gameStatus !== 3) {
		throw new Error("Only completed games can be imported.");
	}
	if (game.period > 4) {
		throw new Error("Overtime is not supported by the replay yet. Raw feeds were saved.");
	}
	if (!Array.isArray(playByPlay.game.actions) || !playByPlay.game.actions.length) {
		throw new Error("Missing play-by-play actions.");
	}
	const date = new Date(game.gameTimeUTC);
	if (!Number.isFinite(date.getTime())) {
		throw new Error("Missing or invalid game date.");
	}
	const year = date.getUTCFullYear() - (date.getUTCMonth() < 6 ? 1 : 0);
	return {
		gameId,
		date: game.gameTimeUTC,
		arena: game.arena?.arenaName || "",
		season: `${year}-${String(year + 1).slice(-2)}`,
		sources: {
			playByPlay: `${API_BASE}/playbyplay/${gameId}`,
			boxscore: `${API_BASE}/boxscore/${gameId}`,
			captured: new Date().toISOString(),
			rawPlayByPlay: `raw/playbyplay-${gameId}.json`,
			rawBoxscore: `raw/boxscore-${gameId}.json`,
		},
		teams: [normalizeTeam(game.awayTeam, false), normalizeTeam(game.homeTeam, true)],
		actions: playByPlay.game.actions,
	};
}

async function init() {
	const [gameId, ...options] = Deno.args;
	if (!/^\d{10}$/.test(gameId || "") || options.some((option) => option !== "--overwrite")) {
		throw new Error(
			"Usage: deno run --allow-net --allow-read --allow-write scripts/import-game.js GAME_ID [--overwrite]",
		);
	}
	const overwrite = options.includes("--overwrite");
	const target = new URL(`replay-${gameId}.json`, ROOT);
	const rawBoxscore = new URL(`raw/boxscore-${gameId}.json`, ROOT);
	const rawPlayByPlay = new URL(`raw/playbyplay-${gameId}.json`, ROOT);
	if (!overwrite) {
		for (const file of [target, rawBoxscore, rawPlayByPlay]) {
			try {
				await Deno.stat(file);
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) {
					continue;
				}
				throw error;
			}
			throw new Error(`${file.pathname} already exists. Use --overwrite to replace it.`);
		}
	}
	const [boxscore, playByPlay] = await Promise.all([
		fetchFeed(`boxscore/${gameId}`),
		fetchFeed(`playbyplay/${gameId}`),
	]);
	await Deno.mkdir(new URL("raw/", ROOT), { recursive: true });
	const writeOptions = { createNew: !overwrite };
	await Deno.writeTextFile(rawBoxscore, `${JSON.stringify(boxscore, null, 4)}\n`, writeOptions);
	await Deno.writeTextFile(rawPlayByPlay, `${JSON.stringify(playByPlay, null, 4)}\n`, writeOptions);
	const data = normalizeGame(gameId, boxscore, playByPlay);
	const report = checkReplay(data);
	if (report.errors.length) {
		throw new Error(
			`Replay validation failed (${report.errors.length}): ${
				report.errors.slice(0, 8).join(", ")
			}. Raw feeds were saved.`,
		);
	}
	const expectedScore = data.teams.map((team) => team.score);
	await Deno.writeTextFile(target, `${JSON.stringify(data, null, 4)}\n`, writeOptions);
	console.log(
		`Imported ${gameId}: ${data.teams.map((team) => team.code).join(" @ ")}, ${
			expectedScore.join(":")
		}, ${data.actions.length} actions, ${report.scenes} scenes.`,
	);
	console.log(`Open /?game=${gameId}`);
}

init().catch((error) => {
	console.error(`Import failed: ${error.message}`);
	Deno.exitCode = 1;
});
