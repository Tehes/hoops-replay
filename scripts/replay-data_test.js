import { loadReplayData, normalizeGame } from "../js/replay-data.js";
import { attackDirection, clockSeconds, compileReplay, getReplayFrame } from "../js/replay-engine.js";
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
	for (const file of ["replay-0022600007.json", "replay-0022600008.json", "replay-0022600094.json"]) {
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
				const outside = Math.abs(victim.y - 25) > 22 || Math.hypot(victim.x - hoopX, victim.y - 25) > 23.75;
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
