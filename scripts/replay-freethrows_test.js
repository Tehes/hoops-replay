import { attackDirection, compileReplay, getReplayFrame } from "../js/replay-engine.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

function scenario(period, result, subType = "2 of 2", descriptor = "", rebounderId = 10) {
	const teams = [1, 2].map((id) => ({
		id,
		home: id === 1,
		code: id === 1 ? "BOS" : "NYK",
		players: ["PG", "SG", "SF", "PF", "C"].map((position, slot) => ({
			id: (id - 1) * 5 + slot + 1,
			position,
			starter: true,
		})),
	}));
	const common = { period, clock: "PT08M00.00S", scoreHome: "0", scoreAway: "0", qualifiers: [] };
	return {
		gameId: "0022600007",
		league: "nba",
		teams,
		actions: [
			{
				...common,
				actionNumber: 1,
				orderNumber: 1,
				actionType: "freethrow",
				subType,
				descriptor,
				teamId: 1,
				personId: 1,
				shotResult: result,
			},
			...(result === "Missed"
				? [{
					...common,
					actionNumber: 2,
					orderNumber: 2,
					actionType: "rebound",
					subType: rebounderId <= 5 ? "offensive" : "defensive",
					teamId: rebounderId <= 5 ? 1 : 2,
					personId: rebounderId,
					shotActionNumber: 1,
				}]
				: []),
		],
	};
}

Deno.test("free throws use legal lane teams and release-timed box outs in both directions", () => {
	for (const period of [1, 3]) {
		for (const result of ["Made", "Missed"]) {
			const data = scenario(period, result);
			const replay = compileReplay(data);
			const shot = replay.scenes[0];
			const direction = attackDirection(data, 1, period);
			const sample = (time) => getReplayFrame(replay, shot.start + time);
			const release = sample(shot.releaseAt);
			const lane = shot.freeThrowLane;
			assert(lane.length === 5 && new Set(lane).size === 5, "lane has missing or duplicate players");
			assert(lane.slice(0, 2).every((id) => id > 5), "defenders must occupy the nearest spaces");
			assert(lane.slice(2, 4).every((id) => id <= 5), "attackers must occupy the adjacent spaces");
			assert(lane[4] > 5, "third space must belong to a defender");
			for (const player of release.players.filter((player) => player.id !== 1 && !lane.includes(player.id))) {
				const depth = direction === 1 ? player.x : 94 - player.x;
				assert(
					depth < 75 && Math.hypot(depth - 88.75, player.y - 25) > 23.75,
					"perimeter player is inside the arc or below the free-throw line",
				);
			}
			for (const time of [shot.releaseAt, shot.releaseAt + 0.2, shot.eventAt]) {
				const frame = sample(time);
				const shooter = frame.players.find((player) => player.id === 1);
				assert(shooter.x === (direction === 1 ? 75 : 19), "shooter crossed the line before rim contact");
				for (const id of lane) {
					const player = frame.players.find((player) => player.id === id);
					const initial = release.players.find((player) => player.id === id);
					const travel = Math.hypot(player.x - initial.x, player.y - initial.y);
					assert(
						time > shot.releaseAt ? travel > 0.1 : travel < 0.00001,
						"box out started before release or failed to engage",
					);
				}
			}
			const outcome = sample(shot.eventAt);
			for (let side = 0; side < 2; side++) {
				const defender = outcome.players.find((player) => player.id === lane[side]);
				const attacker = outcome.players.find((player) => player.id === lane[side + 2]);
				assert((defender.x - attacker.x) * direction > 2, "defender lost inside position during box out");
				assert(Math.hypot(defender.x - attacker.x, defender.y - attacker.y) > 2, "box out overlaps bodies");
			}
			const middle = JSON.stringify(sample(shot.releaseAt + 0.37));
			sample(replay.duration);
			sample(0);
			assert(JSON.stringify(sample(shot.releaseAt + 0.37)) === middle, "seeking changes box outs");
		}
	}
});

Deno.test("last missed free throws keep the ball free until the recorded rebound catch", () => {
	for (const period of [1, 3]) {
		for (const rebounderId of [1, 3, 5, 6, 10, 0]) {
			const replay = compileReplay(scenario(period, "Missed", "2 of 2", "", rebounderId));
			const [shot, rebound] = replay.scenes;
			if (!rebounderId) {
				assert(!rebound.reboundApproach, "team rebound invented a catcher");
				continue;
			}
			assert(rebound.reboundApproach, "live rebound lost its approach");
			assert(shot.reboundRun.startAt >= shot.eventAt, "catch route anticipated the bounce");
			assert(
				1.5 *
						Math.hypot(
							shot.reboundRun.x - shot.reboundRun.from.x,
							shot.reboundRun.y - shot.reboundRun.from.y,
						) / shot.reboundRun.duration <= 14.001,
				"catch route exceeds the travel limit",
			);
			const loose = getReplayFrame(replay, shot.start + shot.eventAt + 0.1);
			assert(loose.ball.owner === null, "ball assigned before the catch");
			const caught = getReplayFrame(replay, rebound.start + rebound.catchAt + 0.02);
			assert(caught.ball.owner === rebounderId, "wrong rebound winner");
			for (const player of shot.frames.at(-1).players) {
				const next = rebound.frames[0].players.find((other) => other.id === player.id);
				assert(
					Math.hypot(next.x - player.x, next.y - player.y) < 0.00001,
					"player teleported between miss and rebound",
				);
			}
		}
	}
});

Deno.test("intermediate and special free throws do not trigger live box outs", () => {
	for (
		const [subType, descriptor] of [["1 of 2", ""], ["1 of 3", ""], ["1 of 1", "technical"], ["2 of 2", "flagrant"]]
	) {
		const replay = compileReplay(scenario(1, "Missed", subType, descriptor));
		const shot = replay.scenes[0];
		assert(shot.freeThrowMoves.length === 0, "dead free throw triggered box outs");
		assert(!replay.scenes[1].reboundApproach, "dead free throw triggered a catch route");
		assert(shot.freeThrowLane.length === (descriptor ? 0 : 5), "incorrect special free-throw lineup");
	}
});

Deno.test("lane places stay stable across a series and both leagues use the same release constraints", () => {
	for (const league of ["nba", "wnba"]) {
		const data = scenario(1, "Missed");
		data.league = league;
		data.gameId = league === "nba" ? "0022600007" : "1042600304";
		const final = data.actions[0];
		data.actions.unshift({ ...final, actionNumber: 0, orderNumber: 0, subType: "1 of 2", shotResult: "Made" });
		const replay = compileReplay(data);
		const [first, last] = replay.scenes;
		assert(
			JSON.stringify(first.freeThrowLane) === JSON.stringify(last.freeThrowLane),
			"later rebound winner changed the lane order between throws",
		);
		const before = getReplayFrame(replay, last.start + last.releaseAt);
		const after = getReplayFrame(replay, last.start + last.releaseAt + 0.3);
		assert(
			before.players.find((player) => player.id === 1).x === after.players.find((player) => player.id === 1).x,
			"shooter moved before rim contact",
		);
		assert(last.freeThrowMoves.every((move) => move.startAt >= last.releaseAt), "box out precedes release");
	}
});
