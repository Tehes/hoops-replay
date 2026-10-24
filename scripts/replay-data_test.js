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

Deno.test("formation lookahead stops before an offensive substitution introduces the later shooter", async () => {
	const data = await readData("replay-0022600007.json");
	const [away, home] = data.teams;
	const victim = home.players.find((player) => player.starter);
	const outgoing = home.players.filter((player) => player.starter).at(-1);
	const incoming = home.players.find((player) => !player.starter);
	const defender = away.players.find((player) => player.starter);
	const tip = data.actions.find((action) => action.actionType === "jumpball");
	away.score = 0;
	home.score = 1;
	const common = { period: 1, clock: "PT08M44.00S", scoreAway: "0", scoreHome: "1" };
	data.actions = [
		{ actionType: "period", subType: "start", clock: "PT12M00.00S", scoreHome: "0" },
		{ ...tip, scoreAway: "0", scoreHome: "0", teamId: home.id, jumpBallRecoverdPersonId: victim.id },
		{
			actionType: "foul",
			subType: "personal",
			descriptor: "shooting",
			teamId: away.id,
			personId: defender.id,
			foulDrawnPersonId: victim.id,
			possession: home.id,
			scoreHome: "0",
		},
		{ actionType: "freethrow", subType: "1 of 2", teamId: home.id, personId: victim.id, shotResult: "Made" },
		{ actionType: "substitution", subType: "out", teamId: home.id, personId: outgoing.id },
		{ actionType: "substitution", subType: "in", teamId: home.id, personId: incoming.id },
		{ actionType: "freethrow", subType: "2 of 2", teamId: home.id, personId: victim.id, shotResult: "Missed" },
		{ actionType: "rebound", subType: "offensive", teamId: home.id, personId: victim.id },
		{
			actionType: "3pt",
			subType: "Jump Shot",
			teamId: home.id,
			personId: incoming.id,
			x: 75,
			y: 20,
			isFieldGoal: 1,
			shotResult: "Missed",
			clock: "PT08M39.00S",
		},
		{ actionType: "game", subType: "end", clock: "PT00M00.00S" },
	].map((action, index) => ({ ...common, ...action, actionNumber: index + 1, orderNumber: index + 1 }));
	const replay = compileReplay(data);
	const foul = replay.scenes.find((scene) => scene.kind === "foul");
	const shot = replay.scenes.find((scene) => scene.kind === "3pt");
	assert(foul.formation.evidenceActionNumber === null, "pre-substitution formation used a later lineup's finish");
	assert(!foul.lineups[home.id].includes(incoming.id), "substitute appeared before the substitution");
	assert(
		shot.lineups[home.id].includes(incoming.id) && !shot.lineups[home.id].includes(outgoing.id),
		"later shot did not use the updated lineup",
	);
	assert(checkReplay(data, replay).errors.length === 0, "substitution scenario failed replay validation");
});
