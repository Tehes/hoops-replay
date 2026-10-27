import { loadReplayData, normalizeGame } from "../js/replay-data.js";
import { attackDirection, clockSeconds, compileReplay, getReplayFrame } from "../js/replay-engine.js";
import { checkReplay } from "../js/replay-validation.js";
import { getTeamColors, getTeamLogo, getTeamName } from "../js/replay-teams.js";

const DATA = new URL("../data/", import.meta.url);

Deno.test("recorded BKN-CLE flagrant penalties lead to a free-throw-line sideline inbound", async () => {
	const data = await readData("replay-0022600105.json");
	const replay = compileReplay(data);
	const penalties = replay.scenes.filter((scene) =>
		scene.kind === "freethrow" && scene.action.descriptor === "flagrant"
	);
	assert(penalties.length > 0, "fixture has no flagrant free throws");
	for (const penalty of penalties) {
		assert(penalty.flagrantFreeThrow, "recorded penalty was not recognized");
		const index = replay.scenes.indexOf(penalty);
		const next = replay.scenes.slice(index + 1).find((scene) =>
			["freethrow", "2pt", "3pt", "heave", "turnover", "foul"].includes(scene.kind)
		);
		if (next.kind === "freethrow") {
			continue;
		}
		const direction = attackDirection(data, penalty.action.teamId, penalty.action.period);
		assert(
			next.frames.some((frame) => {
				const owner = frame.players.find((player) => player.id === frame.ball.owner);
				return owner?.x === (direction === 1 ? 75 : 19) && owner.y === 51.5 && frame.time < next.liveAt;
			}),
			"recorded penalty skipped the required inbound",
		);
	}
	assert(checkReplay(data, replay).errors.length === 0, "recorded flagrant replay failed validation");
});

Deno.test("Flagrant 1 free throws retain possession and restart at the free-throw line extended", async () => {
	for (const period of [1, 3]) {
		for (const made of [true, false]) {
			for (const flagrant of [true, false]) {
				const data = await readData("replay-0022600007.json");
				const [away, home] = data.teams;
				const shooter = home.players.find((player) => player.starter);
				const defender = away.players.find((player) => player.starter);
				const tip = data.actions.find((action) => action.actionType === "jumpball");
				const common = { period, clock: "PT08M44.00S", scoreAway: "0", scoreHome: "0" };
				data.actions = [
					{ ...tip, teamId: home.id, jumpBallRecoverdPersonId: shooter.id },
					{
						actionType: "foul",
						subType: "personal",
						descriptor: flagrant ? "flagrant-type-1" : "shooting",
						teamId: away.id,
						personId: defender.id,
						foulDrawnPersonId: shooter.id,
						possession: home.id,
						qualifiers: ["2freethrow"],
					},
					{
						actionType: "freethrow",
						subType: "1 of 2",
						descriptor: flagrant ? "flagrant" : "",
						teamId: home.id,
						personId: shooter.id,
						shotResult: "Made",
					},
					{ actionType: "timeout", subType: "full", teamId: home.id },
					{
						actionType: "freethrow",
						subType: "2 of 2",
						descriptor: flagrant ? "flagrant" : "",
						teamId: home.id,
						personId: shooter.id,
						shotResult: made ? "Made" : "Missed",
					},
					...(!made ? [{ actionType: "rebound", subType: "offensive", teamId: home.id }] : []),
					{
						actionType: "2pt",
						subType: "Jump Shot",
						teamId: home.id,
						personId: shooter.id,
						isFieldGoal: 1,
						x: 75,
						y: 40,
						shotResult: "Made",
						clock: "PT08M30.00S",
					},
				].map((action, index) => ({
					...common,
					...action,
					period,
					actionNumber: index + 1,
					orderNumber: index + 1,
				}));
				const original = JSON.stringify(data);
				const replay = compileReplay(data);
				const throws = replay.scenes.filter((scene) => scene.kind === "freethrow");
				assert(throws.every((scene) => !!scene.flagrantFreeThrow === flagrant), "incorrect penalty linkage");
				const shot = replay.scenes.at(-1);
				const direction = attackDirection(data, home.id, period);
				const inbound = shot.frames.find((frame) => {
					const owner = frame.players.find((player) => player.id === frame.ball.owner);
					return owner?.x === (direction === 1 ? 75 : 19) && owner.y === 51.5;
				});
				assert(!!inbound === flagrant, "missing or spurious free-throw-line sideline inbound");
				if (flagrant) {
					assert(shot.lineups[home.id].includes(inbound.ball.owner), "wrong team inbounding");
					assert(inbound.time < shot.liveAt, "inbound must precede the live clock");
					const at = shot.start + inbound.time;
					const frame = getReplayFrame(replay, at);
					getReplayFrame(replay, replay.duration);
					assert(
						JSON.stringify(getReplayFrame(replay, at)) === JSON.stringify(frame),
						"seeking changed inbound",
					);
				}
				assert(JSON.stringify(data) === original, "source data changed");
			}
		}
	}
});

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

Deno.test("WNBA feeds use their league, teams, season and ten-minute quarters", async () => {
	const boxscore = await readData("raw/boxscore-1042600304.json");
	const playByPlay = await readData("raw/playbyplay-1042600304.json");
	const original = JSON.stringify([boxscore, playByPlay]);
	const originalFetch = globalThis.fetch;
	const requests = [];
	globalThis.fetch = (url) => {
		requests.push(String(url));
		return Promise.resolve(Response.json(String(url).includes("boxscore/") ? boxscore : playByPlay));
	};
	try {
		const data = await loadReplayData("1042600304");
		assert(
			requests.length === 2 && requests.every((url) => url.endsWith("/1042600304?league=wnba")),
			"wrong league endpoint",
		);
		assert(data.league === "wnba" && data.season === "2026", "wrong WNBA season");
		assert(data.sources.boxscore === requests[0] && data.sources.playByPlay === requests[1], "wrong source URLs");
		const atlanta = data.teams.find((team) => team.code === "ATL");
		assert(getTeamName(atlanta) === "Atlanta Dream", "WNBA team became an NBA team");
		assert(getTeamName({ code: "ATL" }) === "Atlanta Hawks", "old NBA snapshots lost their team");
		assert(getTeamColors(atlanta).shirt === "#e3173e", "wrong WNBA palette");
		assert(getTeamLogo(atlanta) === "./img/WNBA/ATL.svg", "wrong WNBA logo");
		assert(getTeamLogo({ code: "ATL" }) === "./img/NBA/ATL.svg", "wrong NBA logo");
		const replay = compileReplay(data);
		for (const quarter of replay.quarters) {
			const frame = getReplayFrame(replay, quarter.time);
			assert(frame.clock === 600, "WNBA quarter did not start at 10:00");
			const next = replay.scenes.find((scene) => scene.action.period === quarter.period && scene.clockTo < 600);
			assert(next.clockFrom === 600, "first live gap added two NBA minutes");
		}
		const end = getReplayFrame(replay, replay.duration);
		assert(JSON.stringify(end.score) === "[67,62]", "wrong WNBA final score");
		const at = replay.duration / 2;
		const middle = JSON.stringify(getReplayFrame(replay, at));
		getReplayFrame(replay, 0);
		assert(JSON.stringify(getReplayFrame(replay, at)) === middle, "WNBA seeking changed state");
		assert(checkReplay(data, replay).errors.length === 0, "WNBA game failed validation");
		assert(JSON.stringify([boxscore, playByPlay]) === original, "normalization mutated WNBA feeds");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

Deno.test("shot geometry is checked consistently across positions and basket sides", async () => {
	const boxscore = await readData("raw/boxscore-0022600094.json");
	const playByPlay = await readData("raw/playbyplay-0022600094.json");
	const shot = playByPlay.game.actions.find((action) => action.isFieldGoal);
	for (const side of ["left", "right"]) {
		for (const [x, y] of [[8, 5], [20, 50], [30, 90], [75, 40]]) {
			const validX = side === "left" ? x : 100 - x;
			const hoopX = side === "left" ? 5.25 : 88.75;
			const distance = Math.hypot(validX * 0.94 - hoopX, y * 0.5 - 25);
			for (const mirrored of [false, true]) {
				Object.assign(shot, { x: mirrored ? 100 - validX : validX, y, side, shotDistance: distance });
				const original = JSON.stringify(playByPlay);
				const data = normalizeGame(boxscore.game.gameId, boxscore, playByPlay);
				const normalized = data.actions.find((action) => action.actionNumber === shot.actionNumber);
				assert(Math.abs(normalized.x - validX) < 0.00001 && normalized.y === y, "wrong geometry");
				assert(Boolean(normalized.coordinateCorrection) === mirrored, "consistent shot was changed");
				assert(!mirrored || normalized.sourceX === shot.x, "missing original coordinate");
				assert(JSON.stringify(playByPlay) === original, "raw feed was mutated");
			}
		}
	}
	shot.shotDistance = 40;
	let rejected = false;
	try {
		normalizeGame(boxscore.game.gameId, boxscore, playByPlay);
	} catch (error) {
		rejected = error.message.includes("coordinates contradict");
	}
	assert(rejected, "contradictory geometry was accepted");
	shot.shotDistance = null;
	const data = normalizeGame(boxscore.game.gameId, boxscore, playByPlay);
	assert(
		data.actions.find((action) => action.actionNumber === shot.actionNumber).x === shot.x,
		"missing distance caused a guessed correction",
	);
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

Deno.test("unlisted people in technical fouls remain team events without changing court state", async () => {
	const data = await readData("replay-0022600007.json");
	const previous = data.actions.find((action) => action.actionType === "rebound" && action.personId);
	const action = {
		actionNumber: 10000,
		orderNumber: previous.orderNumber + 0.1,
		period: previous.period,
		clock: previous.clock,
		scoreAway: previous.scoreAway,
		scoreHome: previous.scoreHome,
		actionType: "foul",
		subType: "technical",
		teamId: data.teams[0].id,
		personId: 204005,
		description: "S. Kerr technical technical FOUL (1 Tech)",
	};
	data.actions.push(action);
	const original = JSON.stringify(data);
	const replay = compileReplay(data);
	const scene = replay.scenes.find((scene) => scene.action.actionNumber === action.actionNumber);
	const before = replay.scenes[replay.scenes.indexOf(scene) - 1].frames.at(-1);
	assert(!replay.players.some((player) => player.id === action.personId), "invented a court player");
	assert(scene.action.description === action.description && scene.action.teamId === action.teamId, "lost team event");
	for (const frame of scene.frames) {
		assert(JSON.stringify(frame.players) === JSON.stringify(before.players), "team foul moved players");
		assert(JSON.stringify(frame.ball) === JSON.stringify(before.ball), "team foul changed the ball");
		assert(frame.possession === before.possession, "team foul changed possession");
	}
	const time = scene.start + scene.eventAt;
	const first = getReplayFrame(replay, time);
	getReplayFrame(replay, replay.duration);
	assert(JSON.stringify(getReplayFrame(replay, time)) === JSON.stringify(first), "team foul seeking changed");
	assert(JSON.stringify(data) === original, "source action was mutated");
	assert(checkReplay(data, replay).errors.length === 0, "team foul failed replay validation");
	for (const variant of ["personal", "shot", "substitution", "unknown team"]) {
		Object.assign(action, { actionType: "foul", subType: "technical", teamId: data.teams[0].id });
		if (variant === "personal") {
			action.subType = "personal";
		} else if (variant === "unknown team") {
			action.teamId = -1;
		} else {
			action.actionType = variant === "shot" ? "2pt" : "substitution";
		}
		let rejected = false;
		try {
			compileReplay(data);
		} catch (error) {
			rejected = error.message === "Unknown replay player: 204005";
		}
		assert(rejected, `${variant} incorrectly used the team fallback`);
	}
});

Deno.test("synthetic overtime boundaries use five-minute clocks and OT labels, including multiple OT", async () => {
	for (const file of ["replay-0022600007.json", "replay-1042600304.json"]) {
		const data = await readData(file);
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
	}
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

Deno.test("same-clock substitution chains display only the final lineup while preserving all actions", async () => {
	const data = await readData("replay-0022600007.json");
	const [away, home] = data.teams;
	const returning = home.players.filter((player) => player.starter).at(-1);
	const temporary = home.players.find((player) => !player.starter);
	const outgoing = away.players.filter((player) => player.starter).at(-1);
	const incoming = away.players.find((player) => !player.starter);
	data.actions = data.actions.slice(0, 3);
	const last = data.actions.at(-1);
	away.score = Number(last.scoreAway);
	home.score = Number(last.scoreHome);
	let actionNumber = Math.max(...data.actions.map((action) => action.actionNumber));
	let orderNumber = Math.max(...data.actions.map((action) => action.orderNumber));
	for (
		const [teamId, personId, subType] of [
			[home.id, returning.id, "out"],
			[home.id, temporary.id, "in"],
			[away.id, outgoing.id, "out"],
			[away.id, incoming.id, "in"],
			[home.id, temporary.id, "out"],
			[home.id, returning.id, "in"],
		]
	) {
		data.actions.push({
			actionNumber: ++actionNumber,
			orderNumber: ++orderNumber,
			actionType: "substitution",
			subType,
			teamId,
			personId,
			period: last.period,
			clock: last.clock,
			scoreAway: last.scoreAway,
			scoreHome: last.scoreHome,
		});
	}
	const replay = compileReplay(data);
	const scene = replay.scenes.at(-1);
	const finalFrame = getReplayFrame(replay, replay.duration);
	assert(scene.related.length === 6, "grouped feed actions were lost");
	assert(
		finalFrame.players.filter((player) => player.opacity === 1).length === 10,
		"final frame must show exactly ten players",
	);
	assert(
		finalFrame.players.find((player) => player.id === temporary.id).opacity === 0,
		"temporary substitute remained visible",
	);
	assert(
		finalFrame.players.find((player) => player.id === returning.id).opacity === 1,
		"returning player disappeared",
	);
	assert(
		scene.lineups[away.id].includes(incoming.id) && !scene.lineups[away.id].includes(outgoing.id),
		"other team's actual change was lost",
	);
	assert(checkReplay(data, replay).errors.length === 0, "substitution chain failed replay validation");
});

Deno.test("recorded shot sides determine baskets for both teams before and after halftime", async () => {
	const data = await readData("replay-0022600007.json");
	for (const action of data.actions) {
		if (action.isFieldGoal) {
			action.x = 100 - action.x;
			action.side = action.side === "right" ? "left" : "right";
		}
	}
	const replay = compileReplay(data);
	for (const scene of replay.scenes.filter((scene) => scene.action.isFieldGoal)) {
		const expectedHoop = scene.action.side === "left" ? 5.25 : 88.75;
		assert(scene.hoop.x === expectedHoop, `shot ${scene.action.actionNumber} targets the wrong basket`);
		assert(
			Math.abs(scene.shotPoint.x - scene.action.x * 0.94) < 0.00001 &&
				Math.abs(scene.shotPoint.y - scene.action.y * 0.5) < 0.00001,
			"recorded shot coordinates were changed",
		);
		const frame = getReplayFrame(replay, scene.start + scene.releaseAt);
		assert(frame.scene === scene, "seeking lost the shot scene");
	}
	for (const scene of replay.scenes.filter((scene) => scene.kind === "freethrow")) {
		const home = data.teams.find((team) => team.home);
		const shootsLeft = (scene.action.teamId === home.id) === (scene.action.period <= 2);
		const release = scene.frames.find((frame) => Math.abs(frame.time - scene.releaseAt) < 0.00001);
		const shooter = release.players.find((player) => player.id === scene.action.personId);
		assert(shooter.x === (shootsLeft ? 19 : 75), "free throw uses the wrong side");
	}
	assert(checkReplay(data, replay).errors.length === 0, "reversed basket replay failed validation");
});

Deno.test("explicit rebound links and missing-field fallback preserve all reference choreography", async () => {
	for (const id of ["0022600007", "0022600008", "0022600094"]) {
		const data = await readData(`replay-${id}.json`);
		const explicit = compileReplay(structuredClone(data));
		for (const action of data.actions) {
			delete action.shotActionNumber;
		}
		const fallback = compileReplay(data);
		explicit.scenes.forEach((scene, index) => {
			assert(
				JSON.stringify(scene.frames) === JSON.stringify(fallback.scenes[index].frames),
				"choreography changed",
			);
			if (scene.kind === "rebound") {
				assert(
					explicit.scenes[scene.reboundShotIndex]?.action.actionNumber === scene.action.shotActionNumber,
					"rebound did not resolve its explicit shot ID",
				);
			}
		});
		assert(explicit.duration === fallback.duration, "reference timing changed");
	}
});

Deno.test("an intervening standalone block retains the approach, free ball and continuous seeking", async () => {
	const data = await readData("replay-0022600007.json");
	const baseline = compileReplay(data);
	const original = baseline.scenes.find((scene) =>
		scene.reboundApproach &&
		baseline.scenes[scene.reboundApproach.sceneIndex].action.blockPersonId
	);
	const shot = baseline.scenes[original.reboundApproach.sceneIndex];
	const block = data.actions.find((action) =>
		action.actionType === "block" && action.personId === shot.action.blockPersonId &&
		action.clock === shot.action.clock && action.period === shot.action.period
	);
	// A separate clock prevents buildScenes from merging this block annotation into the shot.
	const shotAction = data.actions.find((action) => action.actionNumber === shot.action.actionNumber);
	shotAction.clock = `PT${clockSeconds(block.clock) + 0.01}S`;
	const replay = compileReplay(data);
	const rebound = replay.scenes.find((scene) => scene.action.actionNumber === original.action.actionNumber);
	assert(rebound.reboundApproach, "explicit link lost the early rebound approach");
	const linkedShot = replay.scenes[rebound.reboundShotIndex];
	assert(linkedShot.action.actionNumber === shot.action.actionNumber, "wrong linked shot");
	const between = replay.scenes.slice(rebound.reboundShotIndex + 1, replay.scenes.indexOf(rebound));
	assert(between.length === 1 && between[0].kind === "block", "fixture block was merged");
	const id = rebound.action.personId;
	const target = rebound.reboundApproach.target;
	for (const scene of [...between, rebound]) {
		const frame = getReplayFrame(replay, scene.start);
		const player = frame.players.find((player) => player.id === id);
		assert(Math.hypot(player.x - target.x, player.y - target.y) < 0.00001, "rebounder jumps at scene boundary");
		assert(frame.ball.owner === null, "ball acquired before the catch");
	}
	assert(checkReplay(data, replay).errors.length === 0, "standalone block failed replay validation");
});

Deno.test("interruptions retain the shot link without rewriting timeout, foul or substitution choreography", async () => {
	for (const kind of ["timeout", "foul", "substitution"]) {
		const data = await readData("replay-0022600007.json");
		const baseline = compileReplay(data);
		const original = baseline.scenes.find((scene) => scene.reboundApproach);
		const shot = baseline.scenes[original.reboundShotIndex];
		data.actions = data.actions.filter((action) => action.orderNumber <= original.action.orderNumber);
		const reboundAction = data.actions.find((action) => action.actionNumber === original.action.actionNumber);
		const team = data.teams.find((team) => team.id === reboundAction.teamId);
		const common = {
			period: reboundAction.period,
			clock: reboundAction.clock,
			scoreAway: reboundAction.scoreAway,
			scoreHome: reboundAction.scoreHome,
			teamId: team.id,
		};
		const order = Math.max(...data.actions.filter((action) => action !== reboundAction).map((a) => a.orderNumber));
		const actionNumber = Math.max(...data.actions.map((action) => action.actionNumber)) + 1;
		if (kind === "substitution") {
			const incoming = team.players.find((player) => !player.starter);
			data.actions.push(
				{
					...common,
					actionType: kind,
					subType: "out",
					personId: reboundAction.personId,
					actionNumber,
					orderNumber: order + 0.1,
				},
				{
					...common,
					actionType: kind,
					subType: "in",
					personId: incoming.id,
					actionNumber: actionNumber + 1,
					orderNumber: order + 0.2,
				},
			);
			reboundAction.personId = incoming.id;
		} else {
			data.actions.push({
				...common,
				actionType: kind,
				subType: kind === "foul" ? "personal" : "full",
				descriptor: "loose ball",
				personId: reboundAction.personId,
				actionNumber,
				orderNumber: order + 0.1,
			});
		}
		data.teams.forEach((team, index) => team.score = Number(index ? common.scoreHome : common.scoreAway));
		const replay = compileReplay(data);
		const rebound = replay.scenes.at(-1);
		assert(
			replay.scenes[rebound.reboundShotIndex].action.actionNumber === shot.action.actionNumber,
			"lost shot link",
		);
		assert(!rebound.reboundApproach, `${kind} was overwritten by an early approach`);
		assert(!replay.scenes[rebound.reboundShotIndex].reboundContinuous, "interrupted ball flight planned");
		assert(checkReplay(data, replay).errors.length === 0, `${kind} scenario failed replay validation`);
		const frame = getReplayFrame(replay, rebound.start + rebound.catchAt);
		assert(frame.ball.owner === reboundAction.personId, "wrong catcher after interruption");
	}
});

Deno.test("invalid explicit references never fall back to an unrelated adjacent shot", async () => {
	for (const reference of ["unknown", "future", "made", "earlier miss"]) {
		const data = await readData("replay-0022600007.json");
		const baseline = compileReplay(data);
		const original = baseline.scenes.find((scene, index) => scene.reboundApproach && index > 30);
		const action = data.actions.find((action) => action.actionNumber === original.action.actionNumber);
		const shotIndex = original.reboundShotIndex;
		const target = reference === "future"
			? baseline.scenes.slice(shotIndex + 2).find((scene) => scene.action.isFieldGoal)
			: baseline.scenes.slice(0, shotIndex).find((scene) =>
				scene.action.isFieldGoal &&
				(reference === "made" ? scene.action.shotResult === "Made" : scene.action.shotResult === "Missed")
			);
		action.shotActionNumber = reference === "unknown" ? 999999 : target.action.actionNumber;
		const replay = compileReplay(data);
		const rebound = replay.scenes.find((scene) => scene.action.actionNumber === action.actionNumber);
		assert(rebound.reboundShotIndex === undefined && !rebound.reboundApproach, `${reference} link accepted`);
		assert(!replay.scenes[shotIndex].reboundContinuous, "adjacent shot incorrectly used the rejected rebound");
		assert(checkReplay(data, replay).errors.length === 0, "rejected link damaged normal rebound handling");
	}
});

Deno.test("timeouts and period breaks clear the court, preserve bench substitutions and return the current lineup", async () => {
	for (const file of ["replay-0022600007.json", "replay-0022600008.json", "replay-0022600094.json"]) {
		const data = await readData(file);
		const replay = compileReplay(data);
		let waiting = false;
		let benchSwaps = 0;
		let returns = 0;
		for (const scene of replay.scenes) {
			if (scene.returnAt !== undefined) {
				assert(waiting, "return without an interruption");
				const frame = getReplayFrame(replay, scene.start + scene.returnAt);
				for (const id of Object.values(scene.lineups).flat()) {
					const player = frame.players.find((player) => player.id === id);
					assert(player.opacity === 1 && player.y >= 0 && player.y <= 52, "active player did not return");
				}
				const start = getReplayFrame(replay, scene.start);
				assert(
					start.players.filter((player) => player.opacity === 1).every((player) => player.y < 0),
					"return did not start at the bench",
				);
				waiting = false;
				returns++;
			}
			if (scene.kind === "timeout" || (scene.kind === "period" && scene.action.subType === "end")) {
				waiting = true;
			}
			if (waiting) {
				const frame = getReplayFrame(replay, scene.end - 0.1);
				assert(frame.players.filter((player) => player.opacity === 1).length === 10, "lost active players");
				assert(
					frame.players.filter((player) => player.opacity > 0).every((player) => player.y < 0),
					"players entered the court during the break",
				);
				assert(frame.ball.owner === null, "player took the ball to the bench");
				if (scene.kind === "substitution") {
					benchSwaps++;
					for (const swap of scene.swaps) {
						assert(
							frame.players.find((p) => p.id === swap.out).opacity === 0,
							"outgoing player stayed visible",
						);
						assert(frame.players.find((p) => p.id === swap.in).opacity === 1, "incoming player missing");
					}
				}
			}
		}
		assert(returns > 4 && benchSwaps > 0, "fixture did not cover timeouts, quarters, halftime and bench swaps");
		assert(checkReplay(data, replay).errors.length === 0, "break choreography failed replay validation");
	}
});

Deno.test("shooting fouls respect two-point and three-point territory in both directions", async () => {
	for (
		const file of [
			"replay-0022600007.json",
			"replay-0022600008.json",
			"replay-0022600094.json",
			"replay-1042600304.json",
		]
	) {
		const data = await readData(file);
		for (const reverse of [false, true]) {
			const changed = structuredClone(data);
			if (reverse) {
				for (const action of changed.actions) {
					if (action.isFieldGoal) {
						action.x = 100 - action.x;
						action.side = action.side === "left" ? "right" : "left";
					}
				}
			}
			const replay = compileReplay(changed);
			for (const scene of replay.scenes.filter((item) => item.action.descriptor === "shooting")) {
				const action = scene.action;
				const frame = getReplayFrame(replay, scene.start + scene.eventAt);
				const victim = frame.players.find((player) => player.id === action.foulDrawnPersonId);
				const offense = changed.teams.find((team) => team.id !== action.teamId).id;
				const direction = attackDirection(changed, offense, action.period);
				const hoopX = direction === 1 ? 88.75 : 5.25;
				const outside = Math.abs(victim.y - 25) > 22 ||
					Math.hypot(victim.x - hoopX, victim.y - 25) > replay.league.threePointRadius;
				if (action.qualifiers.includes("2freethrow") || action.qualifiers.includes("3freethrow")) {
					assert(
						outside === action.qualifiers.includes("3freethrow"),
						`${file} foul ${action.actionNumber} wrong territory`,
					);
					assert(
						(hoopX - victim.x) * direction > 0 && (victim.x - 47) * direction > 0,
						"foul outside attacking half",
					);
				} else if (action.qualifiers.includes("1freethrow")) {
					const shot = replay.scenes.slice(0, replay.scenes.indexOf(scene)).findLast((item) =>
						item.action.period === action.period && item.action.clock === action.clock &&
						item.action.personId === action.foulDrawnPersonId && item.action.shotResult === "Made" &&
						["2pt", "3pt"].includes(item.kind)
					);
					assert(
						shot && Math.hypot(victim.x - shot.shotPoint.x, victim.y - shot.shotPoint.y) < 0.001,
						"and-one lost recorded shot location",
					);
				}
				assert(
					frame.ball.owner === action.foulDrawnPersonId && victim.jump > 0,
					"shooting foul lost shooter or ball",
				);
			}
		}
	}
});

Deno.test("shooting foul territory can use the following free-throw sequence without qualifiers", async () => {
	const data = await readData("replay-0022600094.json");
	for (const action of data.actions) {
		if (action.actionType === "foul" && action.descriptor === "shooting") {
			delete action.qualifiers;
		}
	}
	const replay = compileReplay(data);
	const foul = replay.scenes.find((scene) => scene.action.actionNumber === 495);
	const victim = getReplayFrame(replay, foul.start + foul.eventAt).players.find((player) =>
		player.id === foul.action.foulDrawnPersonId
	);
	const hoopX = attackDirection(data, data.teams[0].id, foul.action.period) === 1 ? 88.75 : 5.25;
	assert(
		Math.abs(victim.y - 25) > 22 || Math.hypot(victim.x - hoopX, victim.y - 25) > 23.75,
		"three-shot foul stayed inside arc",
	);
});

Deno.test("shooting foul positioning respects the straight corner three-point line", async () => {
	for (const direction of [-1, 1]) {
		for (const freeThrows of [2, 3]) {
			const data = await readData("replay-0022600007.json");
			const [away, home] = data.teams;
			const shooter = home.players.find((player) => player.starter);
			const defender = away.players.find((player) => player.starter);
			const tip = data.actions.find((action) => action.actionType === "jumpball");
			const hoopX = direction === 1 ? 88.75 : 5.25;
			data.actions = [
				{ ...tip, teamId: home.id, jumpBallRecoverdPersonId: shooter.id },
				{
					actionType: "3pt",
					subType: "Jump Shot",
					personId: shooter.id,
					teamId: home.id,
					isFieldGoal: 1,
					shotResult: "Made",
					x: (hoopX - direction * 6) / 0.94,
					y: 4,
					side: direction === 1 ? "right" : "left",
				},
				{
					actionType: "foul",
					subType: "personal",
					descriptor: "shooting",
					personId: defender.id,
					teamId: away.id,
					possession: home.id,
					foulDrawnPersonId: shooter.id,
					qualifiers: [`${freeThrows}freethrow`],
				},
			].map((action, index) => ({
				...action,
				period: 1,
				clock: "PT10M00.00S",
				scoreAway: "0",
				scoreHome: "3",
				actionNumber: index + 1,
				orderNumber: index + 1,
			}));
			const replay = compileReplay(data);
			const foul = replay.scenes.at(-1);
			const victim = getReplayFrame(replay, foul.start + foul.eventAt).players.find((player) =>
				player.id === shooter.id
			);
			assert(
				(Math.abs(victim.y - 25) > 22) === (freeThrows === 3),
				"corner foul is on the wrong side of the straight line",
			);
		}
	}
});

Deno.test("shooting foul formations reserve the finish and complete passes and drives before contact", async () => {
	let passes = 0;
	let drives = 0;
	let planned = 0;
	for (const file of ["replay-0022600007.json", "replay-0022600008.json", "replay-0022600094.json"]) {
		const data = await readData(file);
		const replay = compileReplay(data);
		for (const scene of replay.scenes.filter((item) => item.action.descriptor === "shooting")) {
			const shooterId = scene.action.foulDrawnPersonId;
			if (scene.action.qualifiers.includes("1freethrow")) {
				assert(
					scene.foulPassAt === undefined && scene.foulDriveAt === undefined,
					"and-one repeated its approach",
				);
				continue;
			}
			const at = (time) => getReplayFrame(replay, scene.start + time);
			const playerAt = (time) => at(time).players.find((player) => player.id === shooterId);
			if (scene.formation.foulActionNumber === scene.action.actionNumber) {
				planned++;
				assert(
					scene.formation.shooterId === shooterId && scene.formation.evidenceActionNumber === null,
					"foul used a later field goal as its anchor",
				);
				assert(
					JSON.stringify(scene.foulPoint) === JSON.stringify(scene.formation.foulPlan.point),
					"foul changed its planned finish",
				);
				const slot = scene.lineups[scene.attackTeam].indexOf(shooterId);
				const [x, y] = scene.formation.slots[slot];
				const direction = attackDirection(data, scene.attackTeam, scene.action.period);
				assert(
					Math.abs(y - scene.foulPoint.y) < 0.001 &&
						Math.abs((direction === 1 ? x : 94 - x) - scene.foulPoint.x) <= 7.001,
					"formation did not reserve the approach",
				);
			}
			if (scene.foulPassAt !== undefined) {
				passes++;
				const midPass = at((scene.foulPassAt + scene.foulCatchAt) / 2);
				assert(midPass.ball.owner === null && midPass.ball.z > 0.5, "pass did not travel as a free ball");
				assert(at(scene.foulCatchAt).ball.owner === shooterId, "pass was not caught before the drive");
			}
			const start = playerAt(scene.foulDriveAt);
			const gather = playerAt(scene.foulGatherAt);
			const contact = playerAt(scene.eventAt);
			const distance = Math.hypot(gather.x - start.x, gather.y - start.y);
			assert(distance <= (scene.foulGatherAt - scene.foulDriveAt) * 8 + 0.001, "foul approach moved too fast");
			if (distance > 1) {
				drives++;
				const middle = at((scene.foulDriveAt + scene.foulGatherAt) / 2);
				assert(
					middle.ball.owner === shooterId && middle.ball.dribble,
					"approach did not keep the dribbling shooter",
				);
			}
			assert(gather.jump === 0 && contact.jump > 0, "shooting pose started before the gather");
			assert(
				Math.hypot(contact.x - gather.x, contact.y - gather.y) < 0.001,
				"contact still relocated the shooter",
			);
		}
	}
	assert(planned > 0 && passes > 0 && drives > 0, "fixtures did not exercise formations, passes and drives");
});

Deno.test("game-clock gaps pace existing buildup without stretching shots or adding actions", async () => {
	const source = await readData("replay-0022600007.json");
	const ordered = source.actions.slice().sort((a, b) => a.orderNumber - b.orderNumber);
	const shotIndex = ordered.findIndex((action) => action.isFieldGoal);
	const variants = [];
	for (const seconds of [4, 12, 22]) {
		const data = structuredClone(source);
		data.actions = ordered.slice(0, shotIndex + 1).map((action, index) => ({
			...action,
			clock: `PT${index === shotIndex ? 720 - seconds : 720}S`,
		}));
		const replay = compileReplay(data);
		const shot = replay.scenes.at(-1);
		variants.push({ replay, shot });
		assert(shot.liveSeconds === seconds, "wrong elapsed game time");
		assert(replay.scenes.length === variants[0].replay.scenes.length, "pacing invented an event");
		assert(
			Math.abs(getReplayFrame(replay, shot.start + shot.eventAt).clock - (720 - seconds)) < 0.02,
			"game clock did not reach the recorded time at the event",
		);
		const marker = replay.markers.find((item) => ["made", "miss"].includes(item.kind));
		assert(Math.abs(marker.time - shot.start - shot.eventAt) < 0.00001, "shot marker detached from event");
	}
	const [short, medium, long] = variants.map((item) => item.shot);
	assert(short.eventAt < medium.eventAt && medium.eventAt < long.eventAt, "attack rhythms did not differ");
	assert(short.preparationWait === 0 && long.preparationWait > 0, "preparation ignored available time");
	assert(long.eventAt < long.liveSeconds, "long buildup was not compressed");
	for (const { shot } of variants) {
		assert(
			Math.abs((shot.eventAt - shot.releaseAt) - (short.eventAt - short.releaseAt)) < 0.00001,
			"pacing stretched the shot flight",
		);
		assert(
			JSON.stringify(shot.frames.at(-1).score) === JSON.stringify(short.frames.at(-1).score),
			"pacing changed the score",
		);
	}
});

Deno.test("stopped clocks and court returns retain animation time without consuming live time", async () => {
	const data = await readData("replay-0022600007.json");
	const replay = compileReplay(data);
	let inbounds = 0;
	let returns = 0;
	let stopped = 0;
	for (const scene of replay.scenes) {
		if (scene.liveAt > 0) {
			const frame = getReplayFrame(replay, scene.start + scene.liveAt * 0.5);
			assert(frame.clock === scene.clockFrom, "clock ran during return or inbound setup");
			if (scene.returnAt) {
				returns++;
			} else {
				inbounds++;
			}
		}
		if (scene.clockFrom === scene.clockTo) {
			assert(scene.liveSeconds === 0 && !scene.preparationWait, "stopped clock created a buildup budget");
			assert(scene.end > scene.start, "same-clock event lost its animation");
			const frame = getReplayFrame(replay, scene.start + (scene.end - scene.start) * 0.5);
			assert(frame.clock === scene.clockTo, "same-clock event advanced the clock");
			stopped++;
		}
	}
	assert(inbounds > 0 && returns > 0 && stopped > 0, "missing stopped-clock coverage");
});

Deno.test("shot-clock violations prolong the buildup, including a late miss before an offensive rebound", async () => {
	let longAttacks = 0;
	let lateMisses = 0;
	for (const id of ["0022600008", "0022600094", "0022600105"]) {
		const data = await readData(`replay-${id}.json`);
		const replay = compileReplay(data);
		const ordinary = structuredClone(data);
		for (const action of ordinary.actions) {
			if (action.actionType === "turnover" && action.subType === "shot clock") {
				action.subType = "lost ball";
			}
		}
		const baseline = compileReplay(ordinary);
		for (const [index, scene] of replay.scenes.entries()) {
			if (scene.kind !== "turnover" || scene.action.subType !== "shot clock") {
				continue;
			}
			assert(scene.shotClockPressure, "shot-clock violation did not constrain planning");
			assert(scene.preparationWait >= baseline.scenes[index].preparationWait, "buildup was shortened");
			const marker = replay.markers.find((item) => item.kind === "shot-clock" && item.time >= scene.start);
			assert(Math.abs(marker.time - scene.start - scene.eventAt) < 0.00001, "violation marker moved");
			const after = scene.frames.at(-1);
			assert(after.ball.owner === null, "ball remained owned after expiration");
			assert(after.possession !== scene.action.teamId, "violation did not change possession");
			if (scene.liveSeconds >= 24) {
				assert(scene.preparationWait > baseline.scenes[index].preparationWait, "buildup was not prolonged");
				assert(scene.eventAt - (scene.liveAt ?? 0) >= 20, "full-clock attack was rushed");
				longAttacks++;
			} else if (scene.liveSeconds <= 3) {
				const rebound = replay.scenes[index - 1];
				const shot = replay.scenes[rebound.reboundShotIndex];
				assert(rebound.action.subType === "offensive" && shot.shotClockPressure, "late miss was ignored");
				assert(
					shot.eventAt - (shot.liveAt ?? 0) >= Math.min(24, shot.liveSeconds * 0.85) - 1.5 &&
						shot.eventAt - (shot.liveAt ?? 0) >=
							baseline.scenes[rebound.reboundShotIndex].eventAt -
								(baseline.scenes[rebound.reboundShotIndex].liveAt ?? 0),
					"movement and preparation did not cover the late miss's shot-clock budget",
				);
				assert(scene.eventAt - (scene.liveAt ?? 0) < 6, "invented a fresh long attack after the miss");
				assert(
					Math.abs(
						(shot.eventAt - shot.releaseAt) -
							(baseline.scenes[rebound.reboundShotIndex].eventAt -
								baseline.scenes[rebound.reboundShotIndex].releaseAt),
					) < 0.00001,
					"shot-clock planning stretched the missed shot's flight",
				);
				lateMisses++;
			}
		}
		assert(checkReplay(data, replay).errors.length === 0, "shot-clock pacing failed validation");
	}
	assert(longAttacks === 4 && lateMisses === 3, "missing shot-clock scenarios");
});

Deno.test("shot-clock lookahead stops at possession changes and does not invent time at a stopped clock", async () => {
	const data = await readData("replay-0022600008.json");
	const original = compileReplay(data);
	const index = original.scenes.findIndex((scene) => scene.action.subType === "shot clock");
	const violation = original.scenes[index];
	const previous = original.scenes[index - 1];
	assert(previous.action.subType === "defensive", "fixture needs a new possession");
	assert(!original.scenes[index - 2].shotClockPressure, "lookahead crossed a possession change");
	const changed = data.actions.find((action) => action.actionNumber === violation.action.actionNumber);
	changed.clock = previous.action.clock;
	const replay = compileReplay(data);
	const sameClock = replay.scenes[index];
	assert(sameClock.preparationWait === 0, "violation invented elapsed time at a stopped clock");
	assert(
		getReplayFrame(replay, sameClock.start + sameClock.eventAt).clock === sameClock.clockTo,
		"violation changed the recorded clock",
	);
});

Deno.test("long preparations move the ball carrier with their defender and preserve seeking and possession", async () => {
	let routes = 0;
	let spacing = 0;
	for (const id of ["0022600007", "0022600008", "0022600094", "0022600105"]) {
		const data = await readData(`replay-${id}.json`);
		const replay = compileReplay(data);
		for (const scene of replay.scenes) {
			const route = scene.dribbleRoute;
			if (!route) {
				continue;
			}
			const start = getReplayFrame(replay, scene.start + route.start);
			const carrier = start.players.find((player) => player.id === route.owner);
			const direction = attackDirection(data, scene.attackTeam, scene.action.period);
			const defender = Number(Object.keys(scene.matchups).find((key) => scene.matchups[key] === route.owner));
			let distance = 0;
			let previous = carrier;
			for (let i = 1; i <= 12; i++) {
				const time = scene.start + route.start + (route.end - route.start) * i / 12;
				const frame = getReplayFrame(replay, time);
				const player = frame.players.find((item) => item.id === route.owner);
				const opponent = frame.players.find((item) => item.id === defender);
				assert(frame.ball.owner === route.owner && frame.ball.dribble, "preparation lost dribbling possession");
				assert(
					Math.hypot(frame.ball.x - player.x - 1, frame.ball.y - player.y - 0.8) < 0.00001,
					"ball detached from moving carrier",
				);
				assert(player.x >= 2 && player.x <= 92 && player.y >= 3 && player.y <= 47, "dribble left the court");
				if ((carrier.x - 47) * direction >= 0) {
					assert((player.x - 47) * direction >= 0, "preparation returned to the backcourt");
				}
				assert(Math.hypot(opponent.x - player.x, opponent.y - player.y) < 4.5, "defender stopped following");
				distance += Math.hypot(player.x - previous.x, player.y - previous.y);
				previous = player;
				assert(
					Math.hypot(player.x - carrier.x, player.y - carrier.y) <= 8,
					"preparation invented a long dribble route",
				);
			}
			assert(distance >= 1, "long preparation remained stationary");
			const middle = scene.start + (route.start + route.end) / 2;
			const firstSeek = getReplayFrame(replay, middle);
			getReplayFrame(replay, replay.duration);
			assert(
				JSON.stringify(getReplayFrame(replay, middle)) === JSON.stringify(firstSeek),
				"seeking changed preparation movement",
			);
			for (const move of scene.spacingMoves ?? []) {
				if (!move.duration) {
					continue;
				}
				const halfway = getReplayFrame(replay, scene.start + move.startAt + move.duration / 2);
				const player = halfway.players.find((item) => item.id === move.id);
				assert(
					Math.hypot(player.x - move.from.x, player.y - move.from.y) > 0.1 &&
						Math.hypot(player.x - move.x, player.y - move.y) > 0.1,
					"off-ball adjustment was not distributed over preparation",
				);
				spacing++;
			}
			routes++;
		}
	}
	// Travel now consumes the preparation budget before optional stationary dribble routes.
	assert(routes > 50 && spacing > 0, "missing preparation movement coverage");
});

Deno.test("schematic circulation has free pass flights, visible catches and the recorded finish recipient", async () => {
	let sequences = 0;
	let assists = 0;
	let shotClocks = 0;
	for (const id of ["0022600007", "0022600008", "0022600094", "0022600105"]) {
		const data = await readData(`replay-${id}.json`);
		const actions = JSON.stringify(data.actions);
		const replay = compileReplay(data);
		assert(JSON.stringify(data.actions) === actions, "circulation changed source events or statistics");
		for (const scene of replay.scenes) {
			const passes = scene.preparationPasses;
			if (!passes) {
				continue;
			}
			assert(!scene.dribbleRoute, "circulation added time on top of the dribble route");
			assert(passes.length >= 2 && passes.length <= 3, "unbounded circulation");
			assert(new Set(passes.flatMap((pass) => [pass.from, pass.to])).size >= 3, "mechanical two-player pingpong");
			const start = getReplayFrame(replay, scene.start + scene.preparationAt + 0.02);
			for (const pass of passes) {
				assert(
					scene.lineups[scene.attackTeam].includes(pass.from) &&
						scene.lineups[scene.attackTeam].includes(pass.to),
					"pass involved an inactive player or opponent",
				);
				const middle = scene.start + (pass.releaseAt + pass.catchAt) / 2;
				const flight = getReplayFrame(replay, middle);
				assert(flight.ball.owner === null && flight.ball.z > 0.5, "pass did not travel through the air");
				assert(
					JSON.stringify(flight.score) === JSON.stringify(start.score),
					"connection pass changed the score",
				);
				const caught = getReplayFrame(replay, scene.start + pass.catchAt);
				const receiver = caught.players.find((player) => player.id === pass.to);
				assert(caught.ball.owner === pass.to, "pass was not caught by its recipient");
				assert(
					Math.hypot(caught.ball.x - receiver.x - 1, caught.ball.y - receiver.y - 0.8) < 0.00001,
					"pass arrived away from the recipient",
				);
				assert(
					pass.catchAt <= scene.preparationAt + scene.preparationWait + 0.00001,
					"pass exceeded time budget",
				);
				getReplayFrame(replay, replay.duration);
				assert(
					JSON.stringify(getReplayFrame(replay, middle)) === JSON.stringify(flight),
					"pass seeking changed",
				);
			}
			if (["2pt", "3pt"].includes(scene.kind)) {
				const finish = scene.action.assistPersonId || scene.action.personId;
				assert(passes.at(-1).to === finish, "circulation did not reach the recorded finish recipient");
				assert(
					getReplayFrame(replay, scene.start + scene.approachAt).ball.owner === finish,
					"finish began without the expected ball owner",
				);
				if (scene.action.assistPersonId) {
					assists++;
				}
			}
			if (scene.action.subType === "shot clock") {
				shotClocks++;
			}
			sequences++;
		}
		assert(checkReplay(data, replay).errors.length === 0, "circulation failed replay validation");
	}
	assert(sequences > 0 && assists > 0 && shotClocks === 4, "missing circulation scenarios");
});

Deno.test("backcourt finishes keep inbound, outlet, circulation and shot approach behind half court", async () => {
	const source = await readData("replay-0022600007.json");
	for (const period of [1, 3]) {
		for (const restart of ["baseline", "rebound", "sideline"]) {
			for (const descriptor of ["runningpullup", "stepback"]) {
				const data = structuredClone(source);
				const [away, home] = data.teams;
				const starters = home.players.filter((player) => player.starter);
				const shooter = starters[1].id;
				const passer = starters[2].id;
				const opponent = away.players.find((player) => player.starter).id;
				const direction = attackDirection({ ...data, actions: [] }, home.id, period);
				const common = { period, scoreAway: "0", scoreHome: "0", clock: "PT01M00.00S" };
				const tip = source.actions.find((action) => action.actionType === "jumpball");
				data.actions = [
					{ actionType: "period", subType: "start", clock: "PT12M00.00S" },
					{ ...tip, period, clock: common.clock, teamId: away.id, jumpBallRecoverdPersonId: opponent },
					{
						actionType: "2pt",
						subType: "Jump Shot",
						teamId: away.id,
						personId: opponent,
						x: direction === 1 ? 12 : 88,
						y: 50,
						isFieldGoal: 1,
						shotResult: restart === "rebound" ? "Missed" : "Made",
					},
					...(restart === "rebound"
						? [{ actionType: "rebound", subType: "defensive", teamId: home.id, personId: passer }]
						: restart === "sideline"
						? [{ actionType: "violation", subType: "kicked ball", teamId: away.id, personId: opponent }]
						: []),
					{
						actionType: "3pt",
						subType: "Jump Shot",
						descriptor,
						teamId: home.id,
						personId: shooter,
						assistPersonId: descriptor === "runningpullup" ? passer : undefined,
						x: direction === 1 ? 48 : 52,
						y: 38,
						isFieldGoal: 1,
						shotResult: "Missed",
						clock: "PT00M36.00S",
					},
					{ actionType: "game", subType: "end", clock: "PT00M00.00S" },
				].map((action, index) => ({ ...common, ...action, actionNumber: index + 1, orderNumber: index + 1 }));
				const original = JSON.stringify(data);
				const replay = compileReplay(data);
				const scene = replay.scenes.find((item) => item.kind === "3pt");
				assert(scene.formation.backcourt, "backcourt shot used a frontcourt setup");
				assert(scene.preparationWait > 0, "fixture did not exercise preparation");
				for (let t = scene.liveAt ?? 0; t <= scene.releaseAt; t += 0.05) {
					const frame = getReplayFrame(replay, scene.start + t);
					assert((frame.ball.x - 47) * direction < 0, `ball crossed half court before release: ${restart}`);
					for (const player of frame.players.filter((item) => scene.lineups[home.id].includes(item.id))) {
						assert((player.x - 47) * direction < 0, "attacker crossed half court before release");
					}
				}
				const release = scene.frames.find((frame) => Math.abs(frame.time - scene.releaseAt) < 0.00001);
				const player = release.players.find((item) => item.id === shooter);
				assert(Math.abs(player.x - scene.action.x * 0.94) < 0.00001, "recorded release was moved");
				assert(Math.abs(player.y - scene.action.y * 0.5) < 0.00001, "recorded release y was moved");
				assert(
					scene.frames.some((frame) => frame.time > scene.releaseAt && (frame.ball.x - 47) * direction > 0),
					"shot never flew into the frontcourt",
				);
				const at = scene.start + scene.approachAt;
				const frame = getReplayFrame(replay, at);
				getReplayFrame(replay, replay.duration);
				assert(
					JSON.stringify(getReplayFrame(replay, at)) === JSON.stringify(frame),
					"seeking changed backcourt setup",
				);
				assert(JSON.stringify(data) === original, "backcourt planning mutated source data");
			}
		}
	}
});

Deno.test("bad passes out of bounds narrowly miss an active teammate before crossing the boundary", async () => {
	let passes = 0;
	const directions = new Set();
	const sidelines = new Set();
	for (const id of ["0022600007", "0022600008", "0022600094", "0022600105"]) {
		const data = await readData(`replay-${id}.json`);
		const original = JSON.stringify(data);
		const replay = compileReplay(data);
		for (const scene of replay.scenes) {
			const expected = scene.kind === "turnover" && scene.action.subType === "out-of-bounds" &&
				scene.action.descriptor === "bad pass" && !scene.action.stealPersonId;
			assert(Boolean(scene.missedPass) === expected, "missed-pass choreography applied to the wrong event");
			if (!expected) {
				continue;
			}
			const plan = scene.missedPass;
			const release = scene.frames.find((frame) => frame.time === plan.releaseAt);
			const end = scene.frames.find((frame) => frame.time === plan.outAt);
			assert(release.ball.owner === scene.action.personId, "recorded passer did not release the ball");
			assert(
				plan.receiverId !== scene.action.personId && scene.lineups[scene.attackTeam].includes(plan.receiverId),
				"missing active receiving teammate",
			);
			const receiver = release.players.find((player) => player.id === plan.receiverId);
			const dx = end.ball.x - release.ball.x;
			const dy = end.ball.y - release.ball.y;
			const fraction = ((receiver.x + 1 - release.ball.x) * dx + (receiver.y + 0.8 - release.ball.y) * dy) /
				(dx * dx + dy * dy);
			const miss = Math.hypot(
				receiver.x + 1 - release.ball.x - dx * fraction,
				receiver.y + 0.8 - release.ball.y - dy * fraction,
			);
			assert(fraction > 0 && fraction < 1, "ball went out before reaching the receiving station");
			assert(miss >= 2 && miss <= 3, "ball did not narrowly miss the receiving hand");
			assert(end.ball.x < 0 || end.ball.x > 94 || end.ball.y < 0 || end.ball.y > 50, "pass stayed in bounds");
			assert(scene.eventAt === plan.outAt, "turnover was displayed before the pass went out");
			const direction = attackDirection(data, scene.attackTeam, scene.action.period);
			directions.add(direction);
			sidelines.add(end.ball.y < 0 ? "top" : end.ball.y > 50 ? "bottom" : "baseline");
			for (const frame of scene.frames.filter((item) => item.time > plan.releaseAt && item.time <= plan.outAt)) {
				assert(frame.ball.owner === null, "receiver caught the bad pass");
				const progress = ((frame.ball.x - release.ball.x) * dx + (frame.ball.y - release.ball.y) * dy) /
					(dx * dx + dy * dy);
				assert(
					Math.hypot(
						frame.ball.x - release.ball.x - dx * progress,
						frame.ball.y - release.ball.y - dy * progress,
					) < 0.00001,
					"ball changed direction after missing",
				);
				if ((release.ball.x - 47) * direction >= 0) {
					assert((frame.ball.x - 47) * direction >= 0, "bad pass returned to the backcourt");
				}
			}
			const at = scene.start + plan.releaseAt + (plan.outAt - plan.releaseAt) * fraction;
			const frame = getReplayFrame(replay, at);
			getReplayFrame(replay, replay.duration);
			assert(
				JSON.stringify(getReplayFrame(replay, at)) === JSON.stringify(frame),
				"seeking changed the missed pass",
			);
			passes++;
		}
		assert(JSON.stringify(data) === original, "missed-pass choreography mutated source events");
	}
	assert(passes >= 15 && directions.size === 2 && sidelines.size >= 2, "missing bad-pass coverage");
});

Deno.test("buildup overlaps player travel, bounds speed and positions the shooter before the finish", async () => {
	let simultaneous = 0;
	for (const id of ["0022600007", "0022600008", "0022600094", "0022600105"]) {
		const data = await readData(`replay-${id}.json`);
		const original = JSON.stringify(data);
		const replay = compileReplay(data);
		for (const scene of replay.scenes) {
			for (const move of scene.buildupMoves ?? []) {
				const from = scene.frames.find((frame) => frame.time === move.start);
				const to = scene.frames.find((frame) => frame.time === move.end);
				let moving = 0;
				for (const player of from.players) {
					const target = to.players.find((item) => item.id === player.id);
					if (player.opacity !== 1 || target.opacity !== 1) {
						continue;
					}
					const distance = Math.hypot(target.x - player.x, target.y - player.y);
					assert(distance <= (move.end - move.start) * 18 + 0.00001, "buildup still rushes a long route");
					if (distance > 6) {
						moving++;
						const middle = getReplayFrame(replay, scene.start + (move.start + move.end) / 2);
						const traveler = middle.players.find((item) => item.id === player.id);
						// Individual starts and reaction delays no longer imply equal midpoint progress.
						assert(
							Math.hypot(traveler.x - player.x, traveler.y - player.y) > 0.25 &&
								Math.hypot(traveler.x - target.x, traveler.y - target.y) > 0.25,
							"player did not travel during the shared interval",
						);
					}
				}
				if (moving >= 3) {
					simultaneous++;
				}
			}
			if (scene.shotEntry) {
				const ready = scene.frames.find((frame) => frame.time === scene.preparationAt);
				const shooter = ready.players.find((player) => player.id === scene.action.personId);
				assert(
					Math.hypot(shooter.x - scene.shotEntry.x, shooter.y - scene.shotEntry.y) < 0.00001,
					"shooter waited until the finish to approach the receiving position",
				);
			}
		}
		if (id === "0022600007") {
			for (const action of [95, 566]) {
				const scene = replay.scenes.find((item) => item.action.actionNumber === action);
				const before = scene.frames.find((frame) => frame.time === scene.approachAt);
				const after = scene.frames.find((frame) => frame.time > scene.approachAt);
				const from = before.players.find((player) => player.id === scene.action.personId);
				const to = after.players.find((player) => player.id === scene.action.personId);
				assert(Math.hypot(to.x - from.x, to.y - from.y) < 8, "finish still contains a late long sprint");
			}
		}
		const time = replay.scenes.find((scene) => scene.buildupMoves?.length).start + 0.1;
		const frame = getReplayFrame(replay, time);
		getReplayFrame(replay, replay.duration);
		assert(JSON.stringify(getReplayFrame(replay, time)) === JSON.stringify(frame), "travel seeking changed");
		assert(JSON.stringify(data) === original, "movement changed source data");
	}
	assert(simultaneous > 200, "buildup did not overlap multiple player routes");
});

Deno.test("next receivers move during the preceding shot without anticipating its rebound", async () => {
	let moves = 0;
	for (const id of ["0022600007", "0022600008", "0022600094", "0022600105"]) {
		const data = await readData(`replay-${id}.json`);
		const original = JSON.stringify(data);
		const replay = compileReplay(data);
		for (const scene of replay.scenes) {
			const move = scene.continuationMove;
			if (!move) {
				continue;
			}
			const rebound = replay.scenes[scene.reboundSceneIndex];
			const next = replay.scenes.find((item) => item.action.actionNumber === move.actionNumber);
			assert(rebound.action.subType === "offensive", "receiver planning crossed a possession change");
			assert(next.action.personId === move.playerId, "route is not backed by the next shooter");
			assert(
				![scene.action.personId, scene.action.assistPersonId, rebound.action.personId].includes(move.playerId),
				"receiver planning moved a current participant or the rebounder",
			);
			const frames = scene.frames.filter((frame) => frame.time >= move.startAt);
			let distance = 0;
			for (let i = 1; i < frames.length; i++) {
				const previous = frames[i - 1].players.find((player) => player.id === move.playerId);
				const current = frames[i].players.find((player) => player.id === move.playerId);
				const step = Math.hypot(current.x - previous.x, current.y - previous.y);
				assert(step <= (frames[i].time - frames[i - 1].time) * 5 + 0.00001, "receiver route rushed");
				assert(frames[i].ball.owner !== move.playerId, "moving receiver took the ball before the rebound");
				const defenderId = Number(
					Object.keys(scene.matchups).find((id) => scene.matchups[id] === move.playerId),
				);
				const defender = frames[i].players.find((player) => player.id === defenderId);
				assert(
					Math.hypot(defender.x - current.x, defender.y - current.y) < 4.5,
					"receiver lost their defender",
				);
				distance += step;
			}
			assert(distance > 0.1, "receiver did not move during the preceding action");
			const arrival = scene.frames.at(-1).players.find((player) => player.id === move.playerId);
			const retained = rebound.frames.at(-1).players.find((player) => player.id === move.playerId);
			const following = next.frames[0].players.find((player) => player.id === move.playerId);
			assert(
				Math.hypot(arrival.x - retained.x, arrival.y - retained.y) < 0.00001 &&
					Math.hypot(arrival.x - following.x, arrival.y - following.y) < 0.00001,
				"receiver position jumped across the rebound",
			);
			const time = scene.start + (move.startAt + scene.frames.at(-1).time) / 2;
			const frame = getReplayFrame(replay, time);
			getReplayFrame(replay, replay.duration);
			assert(JSON.stringify(getReplayFrame(replay, time)) === JSON.stringify(frame), "receiver seeking changed");
			moves++;
		}
		if (id === "0022600007") {
			const shot = replay.scenes.find((scene) => scene.action.actionNumber === 40);
			const next = replay.scenes.find((scene) => scene.action.actionNumber === 43);
			const move = shot.continuationMove;
			assert(move?.playerId === next.action.personId, "Johnson's second-chance shot was not anticipated");
			const release = shot.frames.find((frame) => frame.time === shot.releaseAt)
				.players.find((player) => player.id === move.playerId);
			assert(Math.hypot(release.x - move.from.x, release.y - move.from.y) > 1, "Johnson started too late");
			const ready = next.frames[0].players.find((player) => player.id === move.playerId);
			assert(
				Math.hypot(ready.x - next.shotEntry.x, ready.y - next.shotEntry.y) < 1,
				"Johnson still needs the long cross-court route after Gordon's rebound",
			);
		}
		assert(JSON.stringify(data) === original, "receiver planning changed recorded data");
		assert(checkReplay(data, replay).errors.length === 0, "receiver planning failed replay validation");
	}
	assert(moves > 10, "missing real second-chance sequences");
});

Deno.test("receiver lookahead stops at interruptions, lineup changes and possession boundaries", async () => {
	const source = await readData("replay-0022600007.json");
	for (
		const boundary of ["timeout", "foul", "turnover", "substitution", "period", "defensive rebound", "made shot"]
	) {
		const data = structuredClone(source);
		const next = data.actions.find((action) => action.actionNumber === 43);
		data.actions = data.actions.filter((action) => action.orderNumber <= next.orderNumber);
		const shot = data.actions.find((action) => action.actionNumber === 40);
		const rebound = data.actions.find((action) => action.actionNumber === 41);
		const team = data.teams.find((item) => item.id === shot.teamId);
		if (boundary === "period") {
			next.period++;
		} else if (boundary === "defensive rebound") {
			const opponent = data.teams.find((item) => item.id !== team.id);
			Object.assign(rebound, {
				subType: "defensive",
				teamId: opponent.id,
				personId: opponent.players.find((player) => player.starter).id,
			});
		} else if (boundary === "made shot") {
			shot.shotResult = "Made";
		} else {
			const event = {
				...rebound,
				actionNumber: 900000,
				orderNumber: (rebound.orderNumber + next.orderNumber) / 2,
				actionType: boundary,
				subType: "",
			};
			if (boundary === "substitution") {
				const replacement = team.players.find((player) => !player.starter);
				event.personId = next.personId;
				event.subType = "out";
				data.actions.push({
					...event,
					actionNumber: event.actionNumber + 1,
					orderNumber: event.orderNumber + 1,
					subType: "in",
					personId: replacement.id,
				});
				next.personId = replacement.id;
			}
			data.actions.push(event);
		}
		const replay = compileReplay(data);
		const first = replay.scenes.find((scene) => scene.action.actionNumber === 40);
		assert(!first.continuationMove && !first.formation.continuation, `lookahead crossed ${boundary}`);
	}
});

Deno.test("transitions stagger wings, guard and trailer, then establish defensive matchups", async () => {
	const variants = new Set();
	const directions = new Set();
	let staggered = 0;
	let retreats = 0;
	for (const game of ["0022600007", "1042600304"]) {
		const data = await readData(`replay-${game}.json`);
		const source = JSON.stringify(data);
		const replay = compileReplay(data);
		for (const scene of replay.scenes) {
			for (const run of scene.transitionRuns ?? []) {
				variants.add(run.variant);
				directions.add(attackDirection(data, scene.attackTeam, scene.action.period));
				const from = scene.frames.find((frame) => frame.time === run.start);
				const first = scene.frames.find((frame) => frame.time === run.stages[0].end);
				const end = scene.frames.find((frame) => frame.time === run.end);
				const progress = (id) => {
					const a = from.players.find((player) => player.id === id);
					const b = end.players.find((player) => player.id === id);
					const p = first.players.find((player) => player.id === id);
					return Math.abs(b.x - a.x) > 6 ? (p.x - a.x) / (b.x - a.x) : null;
				};
				const guard = progress(run.ballHandler);
				const trailer = progress(run.trailer);
				for (const wing of run.wings) {
					const lead = progress(wing);
					if (lead !== null && guard !== null && trailer !== null) {
						assert(lead > guard && guard > trailer, "transition still moves the lineup in parallel");
						staggered++;
					}
				}
				const defenders = Object.keys(scene.matchups).map(Number);
				const spread = (frame) => {
					const ys = defenders.map((id) => frame.players.find((player) => player.id === id).y);
					return Math.max(...ys) - Math.min(...ys);
				};
				if (spread(first) + 3 < spread(end)) {
					retreats++;
				}
				for (const [defender, attacker] of Object.entries(scene.matchups)) {
					const d = end.players.find((player) => player.id === Number(defender));
					const a = end.players.find((player) => player.id === attacker);
					assert(Math.hypot(d.x - a.x, d.y - a.y) < 4.5, "defender never established the planned matchup");
				}
				for (const fraction of [0.2, 0.5, 0.8]) {
					const time = scene.start + run.start + (run.end - run.start) * fraction;
					const frame = getReplayFrame(replay, time);
					const owner = frame.players.find((player) => player.id === frame.ball.owner);
					assert(owner && Math.hypot(frame.ball.x - owner.x - 1, frame.ball.y - owner.y - 0.8) < 0.00001,
						"held ball detached during the staggered transition");
					getReplayFrame(replay, replay.duration);
					assert(JSON.stringify(getReplayFrame(replay, time)) === JSON.stringify(frame), "seeking changed the transition");
				}
			}
		}
		assert(JSON.stringify(data) === source, "transition planning changed recorded events");
	}
	assert(staggered > 50 && retreats > 50, "insufficient staggered advance and retreat coverage");
	assert(variants.size === 4 && directions.size === 2, "missing situational variants or a court direction");
});
