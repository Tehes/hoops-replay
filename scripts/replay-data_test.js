import { loadReplayData, normalizeGame } from "../js/replay-data.js";
import { compileReplay, getReplayFrame } from "../js/replay-engine.js";
import { checkReplay } from "../js/replay-validation.js";

const DATA = new URL("../data/", import.meta.url);

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

async function readData(file) {
	return JSON.parse(await Deno.readTextFile(new URL(file, DATA)));
}

Deno.test("default uses the local example; an explicit ID always loads both backend feeds", async () => {
	const example = await readData("replay-0022600007.json");
	const boxscore = await readData("raw/boxscore-0022600094.json");
	const playByPlay = await readData("raw/playbyplay-0022600094.json");
	const originalFetch = globalThis.fetch;
	const requests = [];
	globalThis.fetch = (url) => {
		requests.push(String(url));
		const data = String(url).includes("boxscore/")
			? boxscore
			: String(url).includes("playbyplay/")
			? playByPlay
			: example;
		return Promise.resolve(Response.json(data));
	};
	try {
		assert((await loadReplayData(null)).gameId === example.gameId, "wrong default example");
		assert(requests.length === 1 && requests[0].startsWith("./data/"), "default must stay local");
		requests.length = 0;
		const game = await loadReplayData("0022600094");
		assert(game.gameId === "0022600094", "wrong backend game");
		assert(
			requests.length === 2 && requests.every((url) => url.startsWith("https://nba-spielplan.tehes.deno.net/")),
			"explicit ID must use the backend only",
		);
		assert(checkReplay(game).errors.length === 0, "normalized backend feeds failed validation");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

Deno.test("normalization rejects unfinished games and mismatched feed IDs", async () => {
	const boxscore = await readData("raw/boxscore-0022600094.json");
	const playByPlay = await readData("raw/playbyplay-0022600094.json");
	for (const variant of ["unfinished", "wrong ID"]) {
		const changed = structuredClone(boxscore);
		if (variant === "unfinished") {
			changed.game.gameStatus = 2;
		} else {
			changed.game.gameId = "0022600007";
		}
		let rejected = false;
		try {
			normalizeGame("0022600094", changed, playByPlay);
		} catch (error) {
			rejected = variant === "unfinished" ? error.message.includes("completed") : error.message.includes("IDs");
		}
		assert(rejected, `${variant} was accepted`);
	}
});

Deno.test("HTTP failures remain errors and never load a substitute game", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = () => Promise.resolve(new Response("Unavailable", { status: 404 }));
	try {
		let rejected = false;
		try {
			await loadReplayData("0022609999");
		} catch (error) {
			rejected = error.message.includes("HTTP 404");
		}
		assert(rejected, "backend failure must not fall back to another game");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

Deno.test("known inconsistent HOU-SAS feeds still fail replay validation", async () => {
	const boxscore = await readData("raw/boxscore-0022600009.json");
	const playByPlay = await readData("raw/playbyplay-0022600009.json");
	const report = checkReplay(normalizeGame("0022600009", boxscore, playByPlay));
	assert(report.errors.length > 0, "inconsistent feeds were silently accepted");
});

Deno.test("synthetic overtime boundaries use five-minute clocks and OT labels, including multiple OT", async () => {
	const data = await readData("replay-0022600007.json");
	const end = data.actions.find((action) => action.actionType === "game");
	data.actions = data.actions.filter((action) => action.actionType !== "game");
	let orderNumber = Math.max(...data.actions.map((action) => action.orderNumber));
	let actionNumber = Math.max(...data.actions.map((action) => action.actionNumber));
	for (const period of [5, 6]) {
		for (const subType of ["start", "end"]) {
			data.actions.push({
				...end,
				actionNumber: ++actionNumber,
				orderNumber: ++orderNumber,
				actionType: "period",
				subType,
				period,
				clock: subType === "start" ? "PT05M00.00S" : "PT00M00.00S",
			});
		}
	}
	data.actions.push({ ...end, actionNumber: ++actionNumber, orderNumber: ++orderNumber, period: 6 });
	const replay = compileReplay(data);
	for (const period of [5, 6]) {
		const quarter = replay.quarters.find((quarter) => quarter.period === period);
		const frame = getReplayFrame(replay, quarter.time);
		assert(frame.clock === 300 && frame.scene.banner === `OT${period - 4}`, `incorrect OT${period - 4} start`);
		const endScene = replay.scenes.find((scene) =>
			scene.action.period === period && scene.action.subType === "end"
		);
		assert(endScene.banner === `OT${period - 4} · 0:00`, "incorrect overtime end label");
	}
	assert(checkReplay(data, replay).errors.length === 0, "synthetic overtime boundaries failed validation");
});
