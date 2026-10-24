import { checkReplay } from "./check-replay.js";
import { API_BASE, normalizeGame } from "../js/replay-data.js";

const ROOT = new URL("../data/", import.meta.url);

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
	data.sources.rawPlayByPlay = `raw/playbyplay-${gameId}.json`;
	data.sources.rawBoxscore = `raw/boxscore-${gameId}.json`;
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
