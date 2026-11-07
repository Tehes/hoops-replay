import { attackDirection, compileReplay, getReplayFrame } from "../js/replay-engine.js";
import { getSceneBonus, planGameStates, planTeamFouls } from "../js/replay-rules.js";
import { getPlayerGeometry } from "../js/replay-presentation.js";
import { canPassToBackcourt, getThrowInPoint } from "../js/replay-inbounds.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

function scenario(actions, league = "nba") {
	return {
		gameId: league === "nba" ? "0022600007" : "1042600304",
		teams: [1, 2].map((id) => ({
			id,
			home: id === 1,
			code: id === 1 ? "BOS" : "NYK",
			players: ["PG", "SG", "SF", "PF", "C"].map((position, slot) => ({
				id: (id - 1) * 5 + slot + 1,
				position,
				starter: true,
			})),
		})),
		actions: actions.map((action, index) => ({
			period: 1,
			clock: "PT08M00S",
			scoreHome: "0",
			scoreAway: "0",
			qualifiers: [],
			actionNumber: index + 1,
			orderNumber: index + 1,
			...action,
		})),
	};
}

function rules(actions) {
	const data = scenario(actions);
	const scenes = data.actions.map((action) => ({ action, kind: action.actionType, liveSeconds: 0 }));
	planGameStates(scenes, data);
	return scenes;
}

function throwerAt(scene) {
	const frame = scene.frames.find((frame) => frame.time === scene.inboundAt);
	assert(frame, "missing inbound");
	return frame.players.find((player) => player.id === frame.ball.owner);
}

function stopScenario(stop, league, side, extra = []) {
	const teamId = stop.actionType === "timeout" || stop.actionType === "foul" && stop.subType !== "offensive" ||
		stop.actionType === "violation" && stop.subType === "kicked ball" ? 1 : 2;
	return scenario([
		{ ...basket, side, shotResult: "Missed", clock: "PT08M10S" },
		{ actionType: "rebound", subType: "offensive", teamId: 1, personId: 2, clock: "PT08M09S" },
		{ clock: "PT08M00S", ...stop },
		...extra,
		{ ...basket, teamId, personId: teamId === 1 ? 1 : 6,
			side: teamId === 1 ? side : side === "left" ? "right" : "left", clock: "PT07M48S" },
	], league);
}

const basket = {
	actionType: "2pt",
	subType: "Jump Shot",
	teamId: 1,
	personId: 1,
	isFieldGoal: 1,
	x: 80,
	y: 50,
	side: "right",
	shotResult: "Made",
};

Deno.test("timeouts and period breaks preserve jersey centers and blend back to court foot anchors", () => {
	for (const pause of [
		{ actionType: "timeout", subType: "full", teamId: 1 },
		{ actionType: "period", subType: "end" },
	]) {
		const replay = compileReplay(scenario([
			pause,
			{ actionType: "period", subType: "start", period: 2, clock: "PT12M00S" },
		]));
		const [stop, resume] = replay.scenes;
		const waiting = getReplayFrame(replay, stop.end - 0.1);
		for (const p of waiting.players.filter((p) => p.opacity === 1)) {
			assert(p.bench === 1 && p.y === -5, "bench anchor changed");
			for (const pixels of [2, 4, 12]) {
				assert(getPlayerGeometry(p, pixels).y === -5, "bench jersey moved above its previous center");
			}
		}
		const mid = getReplayFrame(replay, resume.start + resume.returnAt / 2);
		assert(mid.players.filter((p) => p.opacity === 1).every((p) => p.bench > 0 && p.bench < 1),
			"return does not blend presentation anchors");
		const returned = getReplayFrame(replay, resume.start + resume.returnAt);
		assert(returned.players.every((p) => p.bench === 0), "bench offset persists on court");
	}
});

Deno.test("team rebounds keep the exit boundary and move baseline throwers outside the extended lane", () => {
	for (const side of ["left", "right"]) {
		for (const teamId of [1, 2]) {
			const data = scenario([
				{ ...basket, side, shotResult: "Missed" },
				{ actionType: "rebound", subType: teamId === 1 ? "offensive" : "defensive",
					teamId, qualifiers: ["team"], shotActionNumber: 1 },
				{ ...basket, side: teamId === 1 ? side : side === "left" ? "right" : "left",
					teamId, personId: teamId === 1 ? 1 : 6, clock: "PT07M48S" },
			]);
			const original = JSON.stringify(data);
			const replay = compileReplay(data);
			const shot = replay.scenes[0];
			const rebound = replay.scenes[1];
			const next = replay.scenes[2];
			const plan = rebound.assumedOutOfBounds;
			assert(plan?.source === "inferred-team-rebound", "missing explicit assumption");
			const end = rebound.frames.at(-1).ball;
			const impact = shot.frames.find((frame) => frame.time === shot.eventAt);
			const flight = shot.frames.filter((frame) => frame.time > shot.eventAt && frame.time <= shot.outAt);
			assert(flight.length >= 4 && flight.slice(0, -1).every((frame) => frame.ball.z > 0),
				"deflection landed inside before going out");
			assert(Math.hypot(flight[0].ball.x - impact.ball.x, flight[0].ball.y - impact.ball.y) < 3,
				"deflection jumped away from the rim");
			assert(rebound.frames.every((frame) => frame.ball.x === end.x && frame.ball.y === end.y),
				"rebound annotation started a second ball movement");
			assert(getReplayFrame(replay, shot.start + shot.outAt + 0.01).gameState.ballStatus === "dead",
				"out ball remained live");
			assert(end.x < 0 || end.x > 94 || end.y < 0 || end.y > 50, "ball stayed in court");
			assert(rebound.frames.every((frame) => frame.ball.owner === null), "invented a rebound catch");
			assert(next.frames[0].ball.x === end.x && next.frames[0].ball.y === end.y, "scene boundary moved ball");
			const release = next.frames.find((frame) => frame.time === next.inboundAt);
			const thrower = release.players.find((player) => player.id === release.ball.owner);
			assert(thrower.x === plan.point.x, "inbound moved to another boundary");
			assert(thrower.y < 17 || thrower.y > 33, "baseline thrower stands in the extended lane");
			assert(next.inboundPlan.origin.x === plan.point.x && next.inboundPlan.origin.y === plan.point.y,
				"legal spot replaced the actual ball exit");
			assert(next.frames.some((frame) => frame.time > next.inboundAt && frame.time < next.liveAt &&
				frame.ball.flight && frame.ball.owner === null), "missing inbound pass");
			const sample = shot.start + (shot.eventAt + shot.outAt) / 2;
			const frame = JSON.stringify(getReplayFrame(replay, sample));
			getReplayFrame(replay, replay.duration);
			assert(JSON.stringify(getReplayFrame(replay, sample)) === frame, "seeking changed assumed ball path");
			assert(JSON.stringify(data) === original, "assumption rewrote recorded data");
		}
	}
});

Deno.test("frontcourt inbounds offer an outside safety catch without changing recorded shots or immediate finishes", () => {
	for (const league of ["nba", "wnba"]) {
		for (const side of ["left", "right"]) {
			for (const immediate of [false, true]) {
				const x = side === "right" ? 94 : 6;
				const data = scenario([
					{ ...basket, side, x, shotResult: "Missed" },
					{ actionType: "rebound", subType: "offensive", teamId: 1,
						qualifiers: ["team"], shotActionNumber: 1 },
					{ ...basket, side, x: immediate ? x : 60, personId: immediate ? 1 : 2,
						actionType: immediate ? "2pt" : "3pt", clock: immediate ? "PT07M58S" : "PT07M48S" },
				], league);
				const original = JSON.stringify(data);
				const replay = compileReplay(data);
				const scene = replay.scenes[2];
				const frame = getReplayFrame(replay, scene.start + scene.liveAt);
				const receiver = frame.players.find((player) => player.id === frame.ball.owner);
				const distance = Math.hypot(receiver.x - scene.hoop.x, receiver.y - 25);
				assert(immediate ? distance < 8 && !scene.inboundReception : distance >= 12 && scene.inboundReception,
					"inbound ignored the distinction between a safety catch and an immediate recorded finish");
				assert(Number.isFinite(scene.releaseAt) && scene.action.personId === (immediate ? 1 : 2) &&
					scene.shotPoint.x === data.actions[2].x * 0.94 && scene.shotPoint.y === data.actions[2].y * 0.5,
					"inbound changed the recorded shooter or removed the shot");
				const sample = JSON.stringify(frame);
				getReplayFrame(replay, replay.duration);
				assert(JSON.stringify(getReplayFrame(replay, scene.start + scene.liveAt)) === sample,
					"seeking changed the inbound catch");
				assert(JSON.stringify(data) === original, "inbound planning changed source events");
			}
		}
	}
});

Deno.test("team rebound assumptions exclude catches, dead balls and recorded interruptions", () => {
	for (const variant of ["player", "deadball", "foul", "period", "freethrow"]) {
		const rebound = { actionType: "rebound", subType: "offensive", teamId: 1,
			qualifiers: variant === "deadball" ? ["team", "deadball"] : ["team"], shotActionNumber: 1 };
		if (variant === "player") {
			rebound.personId = 2;
		}
		const next = variant === "foul"
			? { actionType: "foul", subType: "personal", teamId: 2, personId: 10, foulDrawnPersonId: 1 }
			: variant === "period" ? { actionType: "period", subType: "end", clock: "PT00M00S" }
			: variant === "freethrow"
			? { actionType: "freethrow", subType: "2 of 2", teamId: 1, personId: 1, shotResult: "Made" }
			: { ...basket, clock: "PT07M48S" };
		const replay = compileReplay(scenario([{ ...basket, shotResult: "Missed" }, rebound, next]));
		assert(!replay.scenes[1].assumedOutOfBounds && !replay.scenes[2].assumedInbound,
			`${variant} incorrectly inferred an out ball`);
	}
});
const personal = {
	actionType: "foul",
	subType: "personal",
	descriptor: "shooting",
	teamId: 2,
	personId: 10,
	foulDrawnPersonId: 1,
	possession: 1,
};
const technical = { actionType: "foul", subType: "technical", teamId: 2, personId: 10, possession: 1 };
const attempt = {
	actionType: "freethrow",
	subType: "1 of 2",
	teamId: 1,
	personId: 1,
	shotResult: "Made",
};

Deno.test("inbound catches restore dribbling throughout the following live advance", () => {
	for (const league of ["nba", "wnba"]) {
		for (const side of ["left", "right"]) {
			const data = scenario([
				{ ...basket, side, x: side === "right" ? 80 : 20 },
				{ ...basket, teamId: 2, personId: 6, side: side === "left" ? "right" : "left",
					x: side === "left" ? 80 : 20, clock: "PT07M40S" },
			], league);
			const replay = compileReplay(data);
			const scene = replay.scenes[1];
			assert(scene.frames.some((frame) => frame.time > scene.inboundAt && frame.time < scene.liveAt &&
				!frame.ball.owner && frame.ball.flight && !frame.ball.dribble), "inbound pass started dribbling in flight");
			let moving = 0;
			for (const run of scene.transitionRuns ?? []) {
				const frames = scene.frames.filter((frame) => frame.time >= run.start && frame.time <= run.end);
				for (let i = 1; i < frames.length; i++) {
					const from = frames[i - 1];
					const to = frames[i];
					if (from.ball.owner !== run.ballHandler || to.ball.owner !== run.ballHandler ||
						Math.hypot(to.ball.x - from.ball.x, to.ball.y - from.ball.y) < 1) {
						continue;
					}
					assert(from.ball.dribble && to.ball.dribble, "inbound receiver carried the ball during the live advance");
					moving++;
				}
			}
			assert(moving > 0, "scenario did not exercise a moving inbound receiver");
		}
	}
});

Deno.test("a basket requires a baseline inbound before the next recorded live interruption", () => {
	for (const league of ["nba", "wnba"]) {
		for (const period of [1, 3]) {
			for (
				const interruption of [
					{ ...technical, teamId: 1, personId: 5, possession: 2 },
					{ ...technical, teamId: 1, personId: 999, possession: 2 },
					{ actionType: "timeout", subType: "full", teamId: 2, possession: 2 },
					{ actionType: "violation", subType: "kicked ball", teamId: 1, possession: 2 },
				]
			) {
				const data = scenario([{ ...basket, period }, { ...interruption, period, clock: "PT07M45S" }], league);
				const input = JSON.stringify(data);
				const replay = compileReplay(data);
				const scene = replay.scenes[1];
				const sample = (time) => getReplayFrame(replay, scene.start + time);
				assert(
					scene.rules.before.restart === "baseline" && scene.rules.before.entitledTeam === 2,
					"basket lost the receiving team's entitlement",
				);
				assert(
					scene.inboundAt < scene.liveAt && scene.liveAt < scene.eventAt,
					"recorded interruption skipped the inbound or advance",
				);
				assert(sample(scene.inboundAt - 0.01).gameState.ballStatus === "dead", "ball live before disposal");
				const disposal = sample(scene.inboundAt);
				assert(
					disposal.gameState.ballStatus === "live" && disposal.gameState.phase === "throw-in",
					"inbound disposal did not make the ball live",
				);
				assert(disposal.clock === 480, "inbound setup consumed game-clock time");
				assert(sample(scene.liveAt).gameState.phase === "play", "catch did not start court play");
				assert(sample(scene.eventAt).gameState.ballStatus === "dead", "whistle did not stop play");
				const middle = JSON.stringify(sample((scene.liveAt + scene.eventAt) / 2));
				sample(replay.duration);
				assert(JSON.stringify(sample((scene.liveAt + scene.eventAt) / 2)) === middle, "seeking changed rules");
				assert(JSON.stringify(data) === input, "planning changed recorded events");
			}
		}
	}
});

Deno.test("a technical during free throws preserves remaining attempts across dead-ball rebounds and timeouts", () => {
	for (const result of ["Made", "Missed"]) {
		const scenes = rules([
			personal,
			attempt,
			technical,
			{ ...attempt, subType: "1 of 1", descriptor: "technical", shotResult: result, teamId: 2, personId: 6 },
			{ actionType: "rebound", subType: "offensive", qualifiers: ["team", "deadball"], teamId: 2 },
			{ actionType: "timeout", teamId: 2 },
			{ ...attempt, subType: "2 of 2", shotResult: "Missed" },
			{ actionType: "rebound", subType: "defensive", teamId: 2, personId: 10 },
		]);
		assert(scenes[0].rules.after.pendingFreeThrows.length === 3, "missing recorded penalties");
		for (const index of [3, 4, 5]) {
			const state = scenes[index].rules.after;
			assert(state.phase === "free-throws" && state.restart === null, "inserted inbound during the series");
			assert(
				state.pendingFreeThrows.length === 1 && state.pendingFreeThrows[0].attempt === 2,
				"technical lost the second regular attempt",
			);
		}
		assert(
			scenes[6].rules.after.phase === "rebound" && scenes[6].rules.after.ballStatus === "live",
			"last regular miss did not remain in play",
		);
		assert(scenes[7].rules.after.controlTeam === 2, "rebound did not establish new control");
	}
});

Deno.test("technical penalties retain the interrupted inbound, independent of the free-throw team and outcome", () => {
	for (const result of ["Made", "Missed"]) {
		const scenes = rules([
			basket,
			{ ...technical, possession: 2 },
			{ ...attempt, subType: "1 of 1", descriptor: "technical", shotResult: result },
			{ actionType: "rebound", subType: "offensive", teamId: 1, qualifiers: ["deadball", "team"] },
		]);
		for (const index of [2, 3]) {
			const state = scenes[index].rules.after;
			assert(state.entitledTeam === 2 && state.restart === "baseline", "technical replaced the original inbound");
			assert(
				state.pendingFreeThrows.length === 0 && state.ballStatus === "dead",
				"technical created a live rebound",
			);
		}
	}
});

Deno.test("and-one and final free-throw outcomes determine the next restart without a second attack", () => {
	for (const result of ["Made", "Missed"]) {
		const replay = compileReplay(scenario([
			basket,
			personal,
			{ ...attempt, subType: "1 of 1", shotResult: result },
		]));
		const [shot, foul, ft] = replay.scenes;
		assert(
			shot.rules.after.phase === "free-throws" && shot.rules.after.restart === null,
			"and-one awarded an inbound",
		);
		assert(
			foul.andOneShotIndex === 0 && !foul.rules.requiresPlay && foul.inboundAt === undefined,
			"and-one invented a new possession",
		);
		assert(ft.rules.after.phase === (result === "Made" ? "throw-in" : "rebound"), "wrong final continuation");
		assert(ft.rules.after.restart === (result === "Made" ? "baseline" : null), "wrong final restart");
	}
});

Deno.test("free-throw disposal and release distinguish regular last attempts from dead penalty attempts", () => {
	for (const variant of ["intermediate", "last", "technical", "flagrant"]) {
		const ft = {
			...attempt,
			shotResult: "Missed",
			subType: variant === "intermediate" ? "1 of 2" : "1 of 1",
			descriptor: ["technical", "flagrant"].includes(variant) ? variant : "",
		};
		const replay = compileReplay(scenario([personal, ft]));
		const scene = replay.scenes[1];
		const sample = (time) => getReplayFrame(replay, scene.start + time);
		assert(sample(scene.freeThrowAt).gameState.ballStatus === "live", "free-throw disposal must be live");
		assert(sample(scene.freeThrowAt).clock === 480, "free-throw setup consumed game time");
		assert(
			sample(scene.releaseAt + 0.1).gameState.ballStatus === (variant === "last" ? "live" : "dead"),
			"free-throw flight has wrong live/dead status",
		);
		assert(sample(scene.releaseAt + 0.1).gameState.controlTeam === null, "shot flight invented team control");
		if (variant === "flagrant") {
			assert(
				scene.rules.after.restart === "flagrant" && scene.rules.after.entitledTeam === 1,
				"flagrant miss lost retained possession",
			);
		}
	}
});

Deno.test("period restarts follow the opening possession; overtime uses a jump ball", () => {
	for (const openingTeam of [1, 2]) {
		const scenes = rules([
			{ actionType: "jumpball", teamId: openingTeam },
			...[2, 3, 4, 5, 6].map((period) => ({ actionType: "period", subType: "start", period })),
		]);
		for (const scene of scenes.slice(1)) {
			const period = scene.action.period;
			const state = scene.rules.after;
			assert(state.restart === (period > 4 ? "jump-ball" : "baseline"), "wrong period restart");
			assert(
				state.entitledTeam === (period > 4 ? null : period === 4 ? openingTeam : 3 - openingTeam),
				"period awarded possession to the wrong team",
			);
			assert(state.pendingFreeThrows.length === 0, "period retained an old penalty");
		}
	}
});

Deno.test("a standalone steal transfers control at the recorded catch without awarding an inbound", () => {
	const scenes = rules([
		{ actionType: "jumpball", teamId: 1 },
		{ actionType: "steal", teamId: 2, possession: 2, personId: 10 },
	]);
	const steal = scenes[1].rules;
	assert(steal.offense === 1 && steal.play.controlTeam === 1, "stealer controlled the preceding attack");
	assert(steal.after.controlTeam === 2 && steal.after.restart === null, "steal did not preserve live play");
});

Deno.test("bonus uses the opponent's exhausted quota, resets each period and survives reverse seeking", () => {
	for (const league of ["nba", "wnba"]) {
		const data = scenario([
			...[1, 2, 3, 4].map(() => ({ actionType: "foul", subType: "personal", teamId: 2 })),
			...[1, 2, 3, 4].map(() => ({ actionType: "foul", subType: "personal", teamId: 1 })),
			{ actionType: "period", subType: "end" },
			{ actionType: "period", subType: "start", period: 2 },
			...[1, 2, 3].map(() => ({ actionType: "foul", subType: "personal", teamId: 1, period: 5 })),
			{ actionType: "period", subType: "start", period: 6 },
		], league);
		const scenes = data.actions.map((action) => ({ action, kind: action.actionType, clockTo: 480, eventAt: 2 }));
		planTeamFouls(scenes, data);
		const bonus = (index, time = 2) => getSceneBonus(scenes[index], time, 480).join(",");
		assert(bonus(2) === "false,false", "bonus before quota was exhausted");
		assert(bonus(3, 1.99) === "false,false", "bonus anticipated the fourth foul");
		assert(bonus(3) === "true,false", "four home fouls must give away bonus");
		assert(bonus(7) === "true,true", "both teams should have bonus");
		assert(bonus(8) === "false,false", "bonus remains after period end");
		assert(bonus(9) === "false,false", "new period retained fouls");
		assert(bonus(11) === "false,false", "overtime bonus before third foul");
		assert(bonus(12) === "false,true", "overtime requires only three fouls");
		assert(bonus(13) === "false,false", "next overtime retained fouls");
		assert(bonus(3, 1) === "false,false", "reverse seeking retained later fouls");
	}
});

Deno.test("bonus counts the first team foul at 2:00 but excludes technical, offensive and double fouls", () => {
	const data = scenario([
		...["technical", "offensive", "double personal", "double technical"].map((subType) => ({
			actionType: "foul", subType, teamId: 2,
		})),
		{ actionType: "foul", subType: "personal", teamId: 2 },
		{ actionType: "foul", subType: "personal", descriptor: "loose ball", teamId: 2 },
		{ actionType: "foul", subType: "flagrant1", teamId: 1 },
		{ actionType: "game" },
	]);
	const scenes = data.actions.map((action, index) => ({
		action, kind: action.actionType, clockTo: index < 5 ? 121 : 120, eventAt: 2,
	}));
	planTeamFouls(scenes, data);
	assert(getSceneBonus(scenes[4], 2, 121).join(",") === "false,false", "excluded fouls used quota");
	assert(getSceneBonus(scenes[5], 1.99, 120).join(",") === "false,false", "late foul anticipated");
	assert(getSceneBonus(scenes[5], 2, 120).join(",") === "true,false", "2:00 foul did not exhaust late quota");
	assert(getSceneBonus(scenes[6], 2, 120).join(",") === "true,true", "flagrant did not count as team foul");
	assert(getSceneBonus(scenes[7], 2, 120).join(",") === "false,false", "bonus remains at game end");
});

Deno.test("backcourt turnovers visibly return the named ballhandler across midcourt", () => {
	for (const league of ["nba", "wnba"]) {
		for (const side of ["left", "right"]) {
			for (const personId of [1, 5]) {
				for (const restart of [true, false]) {
					const direction = side === "right" ? 1 : -1;
					const data = scenario([
						{ ...basket, teamId: restart ? 2 : 1, personId: restart ? 6 : 1,
							side: restart ? side === "right" ? "left" : "right" : side,
							clock: "PT08M10S", shotResult: restart ? "Made" : "Missed" },
						...restart ? [] : [{ actionType: "rebound", subType: "offensive", teamId: 1,
							personId: 1, clock: "PT08M09S" }],
						{ actionType: "turnover", subType: "backcourt", teamId: 1, personId, clock: "PT08M02S" },
						{ ...basket, teamId: 2, personId: 6, side: side === "right" ? "left" : "right",
							clock: "PT07M50S" },
					], league);
					const original = JSON.stringify(data);
					const replay = compileReplay(data);
					const scene = replay.scenes.find((scene) => scene.action.subType === "backcourt");
					const controlled = scene.frames.filter((frame) => frame.ball.owner === personId);
					assert(controlled.some((frame) => (frame.ball.x - 47) * direction > 0 &&
						(frame.players.find((p) => p.id === personId).x - 47) * direction > 0),
						"named player never controlled the ball in the frontcourt");
					const plan = scene.backcourtPlan;
					assert(scene.matchups[plan.defenderId] === personId, "pressure changed the defensive assignment");
					const samples = [plan.closeoutAt, plan.retreatAt, plan.repressureAt, plan.escapeAt].map((time) => {
						const frame = getReplayFrame(replay, scene.start + time);
						const actor = frame.players.find((p) => p.id === personId);
						const defender = frame.players.find((p) => p.id === plan.defenderId);
						assert(frame.ball.owner === personId && frame.ball.dribble, "pressure interrupted ball control");
						return { actor, defender, gap: Math.hypot(defender.x - actor.x, defender.y - actor.y) };
					});
					const [beforePressure, underPressure, firstRetreat, renewedPressure] = samples;
					assert(Math.abs(beforePressure.actor.x - underPressure.actor.x) < 0.01 &&
						beforePressure.gap - underPressure.gap > 2,
						"ballhandler retreated before the defender closed down the space");
					assert((underPressure.defender.x - underPressure.actor.x) * direction > 0 &&
						underPressure.gap < 3.6, "defender did not contain the forward route");
					assert((underPressure.actor.x - firstRetreat.actor.x) * direction > 1.5 &&
						firstRetreat.gap > underPressure.gap + 1,
						"retreat did not create space from the pressure");
					assert(Math.abs(firstRetreat.actor.x - renewedPressure.actor.x) < 0.01 &&
						renewedPressure.gap < firstRetreat.gap - 1,
						"second escape step lacked renewed defensive pressure");
					for (let time = plan.closeoutAt; time <= scene.eventAt; time += 0.05) {
						const frame = getReplayFrame(replay, scene.start + time);
						const actor = frame.players.find((p) => p.id === personId);
						const defender = frame.players.find((p) => p.id === plan.defenderId);
						assert(Math.hypot(defender.x - actor.x, defender.y - actor.y) >= 3,
							"pressure created a collision instead of containment");
					}
					const event = getReplayFrame(replay, scene.start + scene.eventAt);
					assert((event.ball.x - 47) * direction < 0 &&
						(event.players.find((p) => p.id === personId).x - 47) * direction < 0,
						"turnover happened away from the backcourt");
					for (let i = 1; i < scene.frames.length; i++) {
						const before = scene.frames[i - 1];
						const after = scene.frames[i];
						if (after.time > (scene.liveAt ?? 0) && after.ball.owner === personId && before.ball.owner !== personId) {
							assert(Math.hypot(after.ball.x - before.ball.x, after.ball.y - before.ball.y) < 0.1,
								"ball teleported to the violator instead of being passed");
						}
					}
					const next = replay.scenes.at(-1);
					assert(next.inboundPlan.location === "midcourt", "backcourt turnover lost its midcourt restart");
					const saved = JSON.stringify(event);
					getReplayFrame(replay, replay.duration);
					assert(JSON.stringify(getReplayFrame(replay, scene.start + scene.eventAt)) === saved,
						"seeking changed the violation");
					assert(JSON.stringify(data) === original, "choreography changed source events");
				}
			}
		}
	}
});

Deno.test("other turnovers and legal advances do not inherit backcourt pressure choreography", () => {
	for (const subType of ["traveling", "lost ball", "8-second-violation", "double dribble"]) {
		const replay = compileReplay(stopScenario({ actionType: "turnover", subType, teamId: 1, personId: 5 }, "nba", "right"));
		assert(replay.scenes.every((scene) => !scene.backcourtPlan), `${subType} inherited retreat pressure`);
	}
	const replay = compileReplay(scenario([
		{ ...basket, teamId: 2, personId: 6, side: "left", clock: "PT08M10S" },
		{ ...basket, clock: "PT08M00S" },
	]));
	assert(replay.scenes.every((scene) => !scene.backcourtPlan), "legal advance inherited retreat pressure");
});

Deno.test("inbound locations follow foul and violation classes in both leagues and directions", () => {
	const cases = [
		{ actionType: "foul", subType: "personal", teamId: 2, personId: 10, foulDrawnPersonId: 1 },
		{ actionType: "foul", subType: "offensive", teamId: 1, personId: 1, foulDrawnPersonId: 10 },
		...["traveling", "double dribble", "shot clock", "backcourt", "8-second", "8-second-violation", "3-second",
			"3-second-violation", "discontinued dribble", "offensive-kicked-ball", "basket-from-below",
			"offensive goaltending", "5-second back to basket"].map((subType) =>
			({ actionType: "turnover", subType, teamId: 1, personId: 1 })),
		{ actionType: "violation", subType: "kicked ball", teamId: 2, personId: 10 },
	];
	for (const league of ["nba", "wnba"]) {
		for (const side of ["left", "right"]) {
			for (const stop of cases) {
				const data = stopScenario({ ...stop, x: side === "right" ? 90 : 10, y: 20 }, league, side);
				const original = JSON.stringify(data);
				const replay = compileReplay(data);
				const next = replay.scenes.at(-1);
				const thrower = throwerAt(next);
				const sourceDirection = side === "right" ? 1 : -1;
				const newDirection = attackDirection(data, next.attackTeam, 1);
				const midcourt = ["backcourt", "8-second", "8-second-violation"].includes(stop.subType);
				const x = midcourt ? league === "wnba" ? 47 - newDirection * 1.5 : 47
					: sourceDirection === 1 ? 75 : 19;
				assert(thrower.x === x && thrower.y === -1.5, `${league}/${side}/${stop.subType}: wrong spot`);
				assert(next.inboundPlan.originSource === "recorded", "ignored source coordinates");
				const catchFrame = getReplayFrame(replay, next.start + next.liveAt);
				const receiver = catchFrame.players.find((player) => player.id === catchFrame.ball.owner);
				if (!next.inboundPlan.canPassBackcourt) {
					assert((receiver.x - 47) * newDirection > 0, "illegal initial backcourt pass");
				}
				assert(getReplayFrame(replay, next.start + next.inboundAt).clock === next.clockFrom,
					"inbound consumed game time");
				const frame = JSON.stringify(catchFrame);
				getReplayFrame(replay, replay.duration);
				assert(JSON.stringify(getReplayFrame(replay, next.start + next.liveAt)) === frame, "seeking moved the catch");
				assert(JSON.stringify(data) === original, "inbound mutated data");
			}
		}
	}
});

Deno.test("a schematic bad-pass exit determines the next inbound across a timeout and technical", () => {
	for (const side of ["left", "right"]) {
		for (const interrupted of [false, true]) {
			const extra = interrupted ? [
				{ ...technical, teamId: 1, possession: 2 },
				{ ...attempt, descriptor: "technical", subType: "1 of 1", shotResult: "Missed", teamId: 2, personId: 6 },
				{ actionType: "timeout", teamId: 2 },
			] : [];
			const data = stopScenario({ actionType: "turnover", subType: "out-of-bounds", descriptor: "bad pass",
				teamId: 1, personId: 1 }, "nba", side, extra);
			const replay = compileReplay(data);
			const stop = replay.scenes[2];
			const exit = stop.frames.at(-1).ball;
			const next = replay.scenes.at(-1);
			const thrower = throwerAt(next);
			assert(next.inboundPlan.origin.x === exit.x && next.inboundPlan.origin.y === exit.y,
				"penalty or timeout replaced the exit origin");
			if (exit.y < 0 || exit.y > 50) {
				assert(thrower.y === (exit.y < 0 ? -1.5 : 51.5) && Math.abs(thrower.x - exit.x) < 0.001,
					"sideline exit changed side or longitudinal position");
			} else {
				assert(thrower.x === (exit.x < 0 ? -1.5 : 95.5), "baseline exit changed boundary");
				assert(thrower.y < 17 || thrower.y > 33, "baseline inbound inside extended lane");
			}
		}
	}
});

Deno.test("baseline exits exclude the extended lane while scoring restarts retain endline privileges", () => {
	for (const x of [-1, 95]) {
		for (const y of [5, 17, 22, 25, 33, 45]) {
			const point = getThrowInPoint({ location: "boundary" }, { x, y }, 1, "nba");
			assert(point.x === (x < 0 ? -1.5 : 95.5), "changed exit boundary");
			assert(point.y < 17 || point.y > 33, "throw-in inside extended lane");
			assert(y >= 17 && y <= 33 || point.y === y, "moved already legal baseline spot");
		}
	}
	const replay = compileReplay(scenario([basket, { ...basket, teamId: 2, personId: 6,
		side: "left", clock: "PT07M48S" }]));
	assert(throwerAt(replay.scenes[1]).x === 95.5 && replay.scenes[1].inboundPlan.freeBaseline,
		"scoring restart lost baseline privileges");
});

Deno.test("retained foul penalties preserve the foul location through misses and an inserted technical", () => {
	for (const descriptor of ["flagrant-type-1", "punching", "clear path", "transition take", "away from play"]) {
		for (const side of ["left", "right"]) {
			for (const result of ["Made", "Missed"]) {
				const data = stopScenario({ actionType: "foul", subType: "personal", descriptor,
					teamId: 2, personId: 10, foulDrawnPersonId: 1, x: side === "right" ? 65 : 35, y: 20 },
					"nba", side, [
						{ ...technical, teamId: 2, possession: 1 },
						{ ...attempt, descriptor: "technical", subType: "1 of 1" },
						{ ...attempt, subType: "1 of 1", shotResult: result },
					]);
				const replay = compileReplay(data);
				const ft = replay.scenes[5];
				assert(ft.rules.freeThrow.retained && !ft.rules.freeThrow.live && ft.freeThrowMoves.length === 0,
					`${descriptor}: special penalty became live`);
				const next = replay.scenes.at(-1);
				const thrower = throwerAt(next);
				const fixed = ["flagrant-type-1", "punching"].includes(descriptor);
				const x = fixed ? side === "right" ? 75 : 19 : (side === "right" ? 65 : 35) * 0.94;
				assert(thrower.x === x && thrower.y === (fixed ? 51.5 : -1.5), `${descriptor}: penalty lost original location`);
				assert(next.rules.before.entitledTeam === 1, "special penalty changed entitled team");
			}
		}
	}
});

Deno.test("throw-in violations change entitlement at the original spot without starting live play", () => {
	for (const subType of ["5-second inbound", "5-second-violation", "out-of-bounds"]) {
		const replay = compileReplay(scenario([
			basket,
			{ actionType: "turnover", subType, teamId: 2, personId: 6, qualifiers: ["untouched"] },
			{ ...basket, clock: "PT07M48S" },
		]));
		assert(!replay.scenes[1].rules.requiresPlay, "throw-in violation started live play");
		const next = replay.scenes[2];
		assert(throwerAt(next).x === 95.5 && !next.inboundPlan.freeBaseline, "did not retain designated spot");
		assert(next.rules.before.entitledTeam === 1, "violation retained possession");
	}
});

Deno.test("kicks during throw-ins preserve the spot but live kicks use the new interruption", () => {
	for (const live of [false, true]) {
		const replay = compileReplay(scenario([
			basket,
			{ actionType: "violation", subType: "kicked ball", teamId: 1, personId: 1, possession: 2,
				x: 60, y: 20, clock: live ? "PT07M59S" : "PT08M00S" },
			{ ...basket, teamId: 2, personId: 6, side: "left", clock: "PT07M48S" },
		]));
		const next = replay.scenes[2];
		const thrower = throwerAt(next);
		assert(live ? thrower.x === 56.4 && thrower.y === -1.5
			: thrower.x === 95.5 && next.inboundPlan.freeBaseline, "kick used the wrong interruption");
	}
});

Deno.test("offensive last-free-throw violations use that basket's free-throw-line sideline", () => {
	for (const side of ["left", "right"]) {
		for (const result of ["Made", "Missed"]) {
			const replay = compileReplay(scenario([
				{ ...basket, side, shotResult: "Missed" },
				{ ...attempt, subType: "1 of 1", shotResult: result },
				{ actionType: "violation", subType: "lane", teamId: 1, personId: 1 },
				{ ...basket, teamId: 2, personId: 6, side: side === "right" ? "left" : "right", clock: "PT07M48S" },
			]));
			assert(throwerAt(replay.scenes[3]).x === (side === "right" ? 75 : 19), "wrong basket after lane violation");
			assert(replay.scenes[3].rules.before.entitledTeam === 2, "lane violation did not award opponent");
		}
	}
});

Deno.test("late timeout advance is optional and requires the team's eligible backcourt possession", () => {
	for (const league of ["nba", "wnba"]) {
		for (const side of ["left", "right"]) {
			for (const variant of ["eligible", "too-early", "neutral", "opponent", "challenge", "backcourt-shot"]) {
				const data = scenario([
					{ ...basket, side, period: 4, clock: variant === "too-early" ? "PT02M01S" : "PT01M00S" },
					{ actionType: "timeout", teamId: variant === "neutral" ? 0 : variant === "opponent" ? 1 : 2,
						subType: variant === "challenge" ? "challenge" : "full",
						period: 4, clock: variant === "too-early" ? "PT02M01S" : "PT01M00S" },
					{ ...basket, period: 4, clock: "PT00M55S", teamId: 2, personId: 6,
						side: side === "right" ? "left" : "right",
						x: variant === "backcourt-shot" ? side === "right" ? 80 : 20 : side === "right" ? 20 : 80 },
				], league);
				const replay = compileReplay(data);
				const timeout = replay.scenes[1];
				const chosen = variant === "eligible";
				assert(timeout.timeoutAdvance.chosen === chosen, `${league}/${variant}: wrong advance decision`);
				const next = replay.scenes[2];
				const thrower = throwerAt(next);
				assert(chosen ? thrower.x === (side === "right" ? 28 : 66)
					: thrower.x === (side === "right" ? 95.5 : -1.5), "wrong timeout inbound spot");
				assert(timeout.timeoutAdvance.source === "schematic-choice", "advance presented as recorded choice");
			}
		}
	}
});

Deno.test("timeout after a live advance requires a second charged timeout to advance again", () => {
	const replay = compileReplay(scenario([
		{ ...basket, period: 4, clock: "PT01M10S", shotResult: "Missed" },
		{ actionType: "rebound", subType: "defensive", teamId: 2, personId: 10, period: 4, clock: "PT01M09S" },
		{ actionType: "timeout", teamId: 2, period: 4, clock: "PT01M08S", x: 85, y: 20 },
		{ actionType: "timeout", teamId: 2, period: 4, clock: "PT01M08S" },
		{ ...basket, teamId: 2, personId: 6, side: "left", x: 20, period: 4, clock: "PT01M00S" },
	]));
	assert(!replay.scenes[2].timeoutAdvance.eligible && replay.scenes[3].timeoutAdvance.chosen,
		"did not distinguish the first timeout after advancing from the second");
	assert(throwerAt(replay.scenes[4]).x === 28, "second timeout did not use the frontcourt hash mark");
});

Deno.test("same-clock backcourt recoveries permit timeout advance while frontcourt recoveries do not", () => {
	for (const side of ["left", "right"]) {
		for (const frontcourt of [false, true]) {
			const data = scenario([
				{ ...basket, side, period: 5, clock: "PT01M00S", shotResult: "Missed" },
				{ actionType: "rebound", subType: "defensive", teamId: 2, personId: 10, period: 5, clock: "PT01M00S" },
				{ actionType: "timeout", teamId: 2, period: 5, clock: "PT01M00S",
					x: frontcourt ? side === "right" ? 20 : 80 : side === "right" ? 80 : 20, y: 20 },
				{ ...basket, teamId: 2, personId: 6, side: side === "right" ? "left" : "right",
					x: side === "right" ? 20 : 80, period: 5, clock: "PT00M55S" },
			]);
			const replay = compileReplay(data);
			assert(replay.scenes[2].timeoutAdvance.chosen === !frontcourt, "wrong recovery-based timeout eligibility");
		}
	}
});

Deno.test("ordinary live timeouts use the nearest unrestricted sideline and survive another dead timeout", () => {
	const replay = compileReplay(stopScenario({ actionType: "timeout", teamId: 1, x: 90, y: 20 }, "nba", "right", [
		{ actionType: "timeout", teamId: 1 },
	]));
	const next = replay.scenes.at(-1);
	assert(throwerAt(next).x === 84.6 && throwerAt(next).y === -1.5, "timeout was clamped like a personal foul");
});

Deno.test("away-from-play penalties before a throw-in retain that spot and its endline privileges", () => {
	const replay = compileReplay(scenario([
		basket,
		{ actionType: "foul", subType: "personal", descriptor: "away from play", teamId: 1, personId: 1, possession: 2 },
		{ ...attempt, teamId: 2, personId: 6, subType: "1 of 1", shotResult: "Missed" },
		{ ...basket, teamId: 2, personId: 6, side: "left", clock: "PT07M48S" },
	]));
	const next = replay.scenes[3];
	assert(next.inboundPlan.freeBaseline && throwerAt(next).x === 95.5, "away-from-play penalty lost original privileges");
});

Deno.test("intermediate and defensive free-throw violations do not award an offensive lane-violation inbound", () => {
	for (const intermediate of [false, true]) {
		const scenes = rules([
			{ ...attempt, subType: intermediate ? "1 of 2" : "1 of 1", shotResult: "Made" },
			{ actionType: "violation", subType: "lane", teamId: intermediate ? 1 : 2 },
			...(intermediate ? [{ ...attempt, subType: "2 of 2", shotResult: "Made" }] : []),
		]);
		assert(scenes[1].rules.after.throwIn === scenes[0].rules.after.throwIn, "wrongly awarded a new throw-in");
	}
});

Deno.test("a recorded LaneViolation turnover overrides an incomplete free-throw label without a phantom live attack", () => {
	const replay = compileReplay(scenario([
		{ ...attempt, subType: "1 of 2", shotResult: "Made" },
		{ actionType: "turnover", subType: "LaneViolation", teamId: 1, personId: 2 },
		{ ...basket, teamId: 2, personId: 6, side: "left", clock: "PT07M48S" },
	]));
	assert(!replay.scenes[1].rules.requiresPlay, "lane turnover invented a live ball before the violation");
	assert(throwerAt(replay.scenes[2]).x === 75, "recorded lane turnover ignored the free-throw-line spot");
});

Deno.test("double-lane violations use the recorded jump-ball continuation and preserve intermediate attempts otherwise", () => {
	const last = rules([
		{ ...attempt, subType: "1 of 1", shotResult: "Missed" },
		{ actionType: "violation", subType: "double lane", teamId: 1 },
		{ actionType: "jumpball", teamId: 2 },
	]);
	assert(last[1].rules.after.phase === "jump-ball" && last[1].rules.after.restart === "jump-ball",
		"double lane awarded an inbound");
	const intermediate = rules([
		{ ...attempt, subType: "1 of 2" },
		{ actionType: "violation", subType: "double lane", teamId: 1 },
		{ ...attempt, subType: "2 of 2" },
	]);
	assert(intermediate[1].rules.after.pendingFreeThrows.length === 1 && intermediate[1].rules.after.restart === null,
		"intermediate double lane removed the remaining free throw");
});

Deno.test("team five-second turnovers retain the pending inbound despite a differing feed clock", () => {
	const replay = compileReplay(scenario([
		basket,
		{ actionType: "timeout", teamId: 2, clock: "PT07M59S" },
		{ actionType: "turnover", subType: "5-second-violation", teamId: 2, qualifiers: ["team"], clock: "PT07M57S" },
		{ ...basket, clock: "PT07M48S" },
	]));
	assert(replay.scenes[2].failedInboundPlan && !replay.scenes[2].rules.requiresPlay, "lost the pending throw-in context");
	assert(throwerAt(replay.scenes[3]).x === replay.scenes[2].failedInboundPlan.point.x, "changed original inbound boundary");
});

Deno.test("timeout advancement after a turnover uses the newly entitled team's frontcourt", () => {
	const replay = compileReplay(scenario([
		{ ...basket, period: 4, clock: "PT01M10S", shotResult: "Missed" },
		{ actionType: "turnover", subType: "shot clock", teamId: 1, personId: 1, period: 4, clock: "PT01M00S", x: 90, y: 20 },
		{ actionType: "timeout", teamId: 2, period: 4, clock: "PT01M00S" },
		{ ...basket, teamId: 2, personId: 6, side: "left", x: 20, period: 4, clock: "PT00M55S" },
	]));
	assert(replay.scenes[2].timeoutAdvance.chosen && throwerAt(replay.scenes[3]).x === 28,
		"advanced toward the turnover team's basket instead of the entitled team's basket");
});

Deno.test("a violation at an advanced throw-in retains its physical spot and resets the new team's timeout eligibility", () => {
	for (const anotherTimeout of [false, true]) {
		const replay = compileReplay(scenario([
			{ ...basket, period: 4, clock: "PT01M00S" },
			{ actionType: "timeout", teamId: 2, period: 4, clock: "PT01M00S" },
			{ actionType: "turnover", subType: "inbound", teamId: 2, period: 4, clock: "PT01M00S" },
			...(anotherTimeout ? [{ actionType: "timeout", teamId: 1, period: 4, clock: "PT01M00S" }] : []),
			{ ...basket, period: 4, clock: "PT00M55S" },
		]));
		const next = replay.scenes.at(-1);
		assert(throwerAt(next).x === (anotherTimeout ? 66 : 28),
			`lost original spot or new advance option (${anotherTimeout}): ${JSON.stringify(next.inboundPlan)}`);
		if (anotherTimeout) {
			assert(replay.scenes[3].timeoutAdvance.chosen, "new entitlement was treated as an old team's second timeout");
		}
	}
});

Deno.test("inbound pass direction respects league-specific midcourt and late-game exceptions", () => {
	for (const direction of [-1, 1]) {
		assert(!canPassToBackcourt({ location: "midcourt" }, { x: 47 }, direction, "nba", 3, 60),
			"ordinary NBA midcourt inbound allowed backcourt");
		assert(canPassToBackcourt({ location: "midcourt" }, { x: 47 - direction * 1.5 }, direction, "wnba", 3, 60),
			"WNBA backcourt inbound lost pass freedom");
		assert(canPassToBackcourt({ location: "sideline" }, { x: 47 + direction * 20 }, direction, "nba", 4, 120),
			"last-two-minutes exception missing");
		assert(!canPassToBackcourt({ location: "sideline" }, { x: 47 + direction * 20 }, direction, "nba", 4, 121),
			"last-two-minutes exception started early");
	}
});

Deno.test("compiled replay changes bonus at the foul anchor and keeps it off through the final scene", () => {
	const data = scenario([
		...[1, 2, 3, 4].map(() => ({ ...personal, descriptor: "", clock: "PT03M00S" })),
		{ actionType: "period", subType: "end", clock: "PT00M00S" },
		{ actionType: "game", subType: "end", clock: "PT00M00S" },
	]);
	const replay = compileReplay(data);
	const foul = replay.scenes[3];
	const before = foul.start + foul.eventAt - 0.001;
	const after = foul.start + foul.eventAt + 0.001;
	assert(getReplayFrame(replay, before).bonus.join(",") === "false,false", "compiled bonus anticipated foul");
	assert(getReplayFrame(replay, after).bonus.join(",") === "true,false", "compiled bonus missed foul");
	const end = replay.scenes.at(-1);
	assert(getReplayFrame(replay, end.start).bonus.join(",") === "false,false", "final scene restored bonus");
	assert(getReplayFrame(replay, replay.duration).bonus.join(",") === "false,false", "final retained bonus");
	assert(getReplayFrame(replay, before).bonus.join(",") === "false,false", "seeking backwards retained bonus");
});
