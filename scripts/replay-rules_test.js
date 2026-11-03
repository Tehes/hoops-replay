import { compileReplay, getReplayFrame } from "../js/replay-engine.js";
import { getSceneBonus, planGameStates, planTeamFouls } from "../js/replay-rules.js";
import { getPlayerGeometry } from "../js/replay-presentation.js";

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

Deno.test("team rebounds connect a schematic out ball to the same inbound spot", () => {
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
			assert(thrower.x === plan.point.x && thrower.y === plan.point.y, "inbound moved to another boundary");
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
