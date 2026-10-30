import { checkReplay } from "./check-replay.js";
import { loadGame, selectGames } from "./replay-source.js";
import { compileReplay } from "../js/replay-engine.js";
import { getLeague } from "../js/replay-leagues.js";

async function init() {
	let league = "all";
	let limit = 10;
	const requestedIds = [];
	for (const argument of Deno.args) {
		if (/^--league=(nba|wnba|all)$/.test(argument)) {
			league = argument.slice("--league=".length);
		} else if (/^--limit=\d+$/.test(argument) && Number.isSafeInteger(Number(argument.slice("--limit=".length)))) {
			limit = Number(argument.slice("--limit=".length));
		} else if (/^\d{10}$/.test(argument)) {
			requestedIds.push(argument);
		} else {
			throw new Error(
				"Usage: audit-replays.js [--league=nba|wnba|all] [--limit=10] [GAME_ID ...]; limit=0 selects all.",
			);
		}
	}
	const leagues = league === "all" ? ["nba", "wnba"] : [league];
	if (requestedIds.some((id) => !leagues.includes(getLeague(id).id))) {
		throw new Error("Requested game IDs do not match --league.");
	}
	const gameIds = new Set(requestedIds);
	let errorCount = 0;
	let failedGames = 0;
	if (!gameIds.size) {
		for (const leagueId of leagues) {
			try {
				const selection = await selectGames(leagueId, limit);
				console.log(JSON.stringify({ type: "selection", ...selection }));
				selection.gameIds.forEach((id) => gameIds.add(id));
			} catch (error) {
				errorCount++;
				console.log(
					JSON.stringify({ type: "error", league: leagueId, stage: "schedule", error: error.message }),
				);
			}
		}
	}
	if (!gameIds.size && !errorCount) {
		errorCount++;
		console.log(JSON.stringify({ type: "error", stage: "selection", error: "No completed games selected." }));
	}
	console.log(JSON.stringify({ type: "batch", captured: new Date().toISOString(), gameIds: [...gameIds] }));
	let frames = 0;
	let passedGames = 0;
	const profiles = new Set();
	for (const id of gameIds) {
		let stage = "data";
		let inputHash = null;
		try {
			const data = await loadGame(id);
			const input = JSON.stringify({ ...data, sources: { ...data.sources, captured: undefined } });
			const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
			inputHash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
			stage = "compile";
			const replay = compileReplay(data);
			stage = "validation";
			const result = checkReplay(data, replay);
			frames += result.frames;
			errorCount += result.errors.length;
			if (result.errors.length) {
				failedGames++;
			} else {
				passedGames++;
			}
			result.profiles.forEach((profile) => profiles.add(profile));
			console.log(JSON.stringify({
				type: "game",
				league: getLeague(id).id,
				inputHash,
				...result,
				profiles: result.profiles.length,
			}));
		} catch (error) {
			failedGames++;
			errorCount++;
			console.log(
				JSON.stringify({ type: "error", id, league: getLeague(id).id, inputHash, stage, error: error.message }),
			);
		}
	}
	console.log(
		JSON.stringify({
			type: "summary",
			games: gameIds.size,
			passedGames,
			failedGames,
			frames,
			profiles: profiles.size,
			errorCount,
		}),
	);
	if (errorCount) {
		Deno.exitCode = 1;
	}
}

init().catch((error) => {
	console.error(error);
	Deno.exitCode = 1;
});
