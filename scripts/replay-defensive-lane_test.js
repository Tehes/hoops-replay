import { attackDirection, compileReplay, getReplayFrame } from "../js/replay-engine.js";
import { isDefensiveLaneCountActive, isInOffensiveLane } from "../js/replay-rules.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

function scenario(league, side, seconds, defenderId) {
	const common = { period: 1, clock: "PT08M00S", scoreHome: "2", scoreAway: "0", qualifiers: [] };
	const clock = `PT07M${60 - seconds}S`;
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
		actions: [
			{
				actionType: "2pt",
				subType: "Jump Shot",
				teamId: 1,
				personId: 1,
				isFieldGoal: 1,
				x: side === "right" ? 80 : 20,
				y: 50,
				side,
				shotResult: "Made",
			},
			{
				actionType: "foul",
				subType: "technical",
				descriptor: "defensive-3-second",
				teamId: 1,
				personId: defenderId,
				possession: 2,
				clock,
			},
			{
				actionType: "freethrow",
				subType: "1 of 1",
				descriptor: "technical",
				teamId: 2,
				personId: 6,
				clock,
				shotResult: "Missed",
			},
			{ actionType: "rebound", subType: "offensive", teamId: 2, clock, qualifiers: ["deadball", "team"] },
			{
				actionType: "2pt",
				subType: "Jump Shot",
				teamId: 2,
				personId: 6,
				clock: `PT07M${55 - seconds}S`,
				isFieldGoal: 1,
				x: side === "right" ? 20 : 80,
				y: 50,
				side: side === "right" ? "left" : "right",
				shotResult: "Missed",
			},
		].map((action, index) => ({ ...common, ...action, actionNumber: index + 1, orderNumber: index + 1 })),
	};
}

function assertHelpCause(replay, scene, direction) {
	const plan = scene.defensiveThreeSeconds;
	const at = (time) => getReplayFrame(replay, scene.start + time);
	const person = (frame, id) => frame.players.find((player) => player.id === id);
	const hoop = { x: direction === 1 ? 88.75 : 5.25, y: 25 };
	if (plan.kind === "missed-follow") {
		const position = plan.phases.find((phase) => phase.kind === "weak-side-position");
		const guarded = at(position.end);
		const helper = person(guarded, plan.playerId);
		const opponent = person(guarded, plan.opponentId);
		assert((opponent.y - 25) * (guarded.ball.y - 25) < 0, "help is not on the weak side");
		assert(Math.hypot(helper.x - opponent.x, helper.y - opponent.y) <= 4.5, "initial help abandoned the matchup");
		const relocation = plan.phases.find((phase) => phase.kind === "receiver-relocates");
		const moved = at(relocation.end);
		const receiver = person(moved, plan.opponentId);
		assert(Math.hypot(receiver.x - opponent.x, receiver.y - opponent.y) >= 4, "no offensive relocation");
		const late = person(moved, plan.playerId);
		assert(Math.hypot(late.x - helper.x, late.y - helper.y) < 0.001, "helper moved into the lane independently");
	} else {
		const help = plan.phases.find((phase) => phase.kind === "penetration-and-help");
		const before = at(help.start);
		const after = at(help.end);
		const driverBefore = person(before, plan.driverId);
		const driver = person(after, plan.driverId);
		const helper = person(after, plan.playerId);
		assert((person(before, plan.playerId).x - driverBefore.x) * direction > 0,
			"help did not start from the basket side of the ball");
		assert((driver.x - driverBefore.x) * direction >= 3, "helper moved without penetration");
		assert(
			after.ball.owner === plan.driverId && Math.hypot(driver.x - hoop.x, driver.y - hoop.y) < 18,
			"no controlled threat near the basket",
		);
		assert(
			(helper.x - driver.x) * direction > 0 && (hoop.x - helper.x) * direction > 0,
			"help did not come between ball and basket",
		);
		const retreat = plan.phases.find((phase) => phase.kind === "retreat-and-recover");
		const recovered = at(retreat.end);
		const away = person(recovered, plan.driverId);
		assert(
			Math.hypot(away.x - hoop.x, away.y - hoop.y) > Math.hypot(driver.x - hoop.x, driver.y - hoop.y) + 3,
			"no retreat cue for recovery",
		);
		const late = person(recovered, plan.playerId);
		assert(
			Math.hypot(late.x - helper.x, late.y - helper.y) < 0.001,
			"helper recovered before the recorded mistake",
		);
		if (plan.kind === "pass-and-help") {
			assert(
				plan.phases[0].kind === "pass" && plan.phases[0].to === plan.driverId,
				"original on-ball defender was reassigned without a pass",
			);
		}
	}
}

Deno.test("recorded defensive lane violations constrain existing advances in both leagues and directions", () => {
	const kinds = new Set();
	for (const league of ["nba", "wnba"]) {
		for (const side of ["left", "right"]) {
			for (const seconds of [8, 17]) {
				for (const defenderId of [1, 5]) {
					const data = scenario(league, side, seconds, defenderId);
					const source = JSON.stringify(data);
					const replay = compileReplay(data);
					const scene = replay.scenes[1];
					const plan = scene.defensiveThreeSeconds;
					const direction = attackDirection(data, 2, 1);
					assert(plan && plan.failureAt >= plan.settledAt, "failure precedes its basketball context");
					assertHelpCause(replay, scene, direction);
					assert(
						scene.inboundAt < scene.liveAt && scene.liveAt < plan.settledAt,
						"missing inbound or advance",
					);
					kinds.add(plan.kind);
					let previous = null;
					let count = 0;
					for (let local = plan.settledAt; local < scene.eventAt; local += 0.02) {
						const frame = getReplayFrame(replay, scene.start + local);
						const active = isDefensiveLaneCountActive(frame, defenderId, direction);
						count = active && previous?.active ? count + previous.frame.clock - frame.clock : 0;
						const player = frame.players.find((player) => player.id === defenderId);
						if (previous) {
							const before = previous.frame.players.find((player) => player.id === defenderId);
							assert(
								Math.hypot(player.x - before.x, player.y - before.y) <= 14 * 0.02 + 0.001,
								"defender jumped into the paint",
							);
						}
						previous = { frame, active };
					}
					assert(count > 3 && count < 5, `invalid continuous game-time stay: ${count}`);
					const before = getReplayFrame(replay, scene.start + scene.eventAt - 0.00001);
					const actor = before.players.find((player) => player.id === defenderId);
					assert(
						isInOffensiveLane(actor, direction) && before.gameState.controlTeam === 2,
						"wrong lane or control",
					);
					assert(
						before.players.filter((player) => scene.lineups[2].includes(player.id)).every((player) =>
							Math.hypot(actor.x - player.x, actor.y - player.y) > 4.5
						),
						"defender is actively guarding",
					);
					const whistle = getReplayFrame(replay, scene.start + scene.eventAt);
					assert(
						whistle.gameState.ballStatus === "dead" && whistle.gameState.pendingFreeThrows.length === 1,
						"whistle lost the technical penalty",
					);
					const next = replay.scenes[4];
					const inbound = getReplayFrame(replay, next.start + next.inboundAt);
					const thrower = inbound.players.find((player) => player.id === inbound.ball.owner);
					assert(
						thrower.x === (direction === 1 ? 75 : 19) &&
							thrower.y === (actor.y < 25 ? -1.5 : 51.5),
						"wrong retained-possession inbound",
					);
					const time = scene.start + (plan.phases[0].start + plan.phases[0].end) / 2;
					const frame = JSON.stringify(getReplayFrame(replay, time));
					getReplayFrame(replay, replay.duration);
					assert(JSON.stringify(getReplayFrame(replay, time)) === frame, "seeking changed the lane entry");
					assert(JSON.stringify(data) === source, "planning changed source events");
				}
			}
		}
	}
	assert(kinds.has("pass-and-help") && kinds.has("help-and-recover"), "missing distinct ball-control contexts");
});

Deno.test("defensive lane counting respects control, frontcourt, shooting, guarding and leaving the lane", () => {
	const base = {
		scene: { attackTeam: 1, lineups: { 1: [1, 4], 2: [2, 3] }, matchups: { 2: 4, 3: 1 } },
		gameState: { ballStatus: "live", phase: "play", controlTeam: 1 },
		ball: { owner: 1, x: 66, y: 15 },
		players: [{ id: 1, x: 65, y: 15 }, { id: 4, x: 65, y: 40 }, { id: 2, x: 84, y: 25 }, { id: 3, x: 68, y: 15 }],
	};
	assert(isDefensiveLaneCountActive(base, 2, 1), "unguarded defender did not count");
	for (
		const change of [
			(frame) => frame.gameState.ballStatus = "dead",
			(frame) => frame.gameState.controlTeam = null,
			(frame) => frame.gameState.phase = "shot",
			(frame) => frame.ball.x = 20,
			(frame) => frame.players[0].x = 45,
			(frame) => Object.assign(frame.players[1], { x: 84, y: 26 }),
			(frame) => frame.players[2].y = 34,
			(frame) => {
				frame.scene.matchups[2] = 1;
				frame.players[3].x = 80;
			},
		]
	) {
		const frame = structuredClone(base);
		change(frame);
		assert(!isDefensiveLaneCountActive(frame, 2, 1), "rule exception did not suspend the count");
	}
	const covered = structuredClone(base);
	covered.scene.matchups[2] = 1;
	assert(isDefensiveLaneCountActive(covered, 2, 1), "another active ball defender must end the guarding exemption");
});

Deno.test("ordinary technicals and insufficient game time do not manufacture a defensive lane stay", () => {
	for (const variant of ["ordinary", "short"]) {
		const data = scenario("nba", "right", variant === "short" ? 4 : 17, 5);
		if (variant === "ordinary") {
			data.actions[1].descriptor = "technical";
		}
		const scene = compileReplay(data).scenes[1];
		assert(!scene.defensiveThreeSeconds, "invented a lane stay without sufficient recorded evidence or time");
		assert(scene.action.clock === data.actions[1].clock, "changed recorded game time");
	}
});
