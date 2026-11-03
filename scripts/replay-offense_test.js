import { getOffensiveActions, planOffensiveAction } from "../js/replay-offense.js";
import { compileReplay, getReplayFrame } from "../js/replay-engine.js";
import { getPassCost } from "../js/replay-passing.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

const situations = [
	{
		kind: "pick-and-roll",
		slots: [[62.3, 23.6], [73.3, 6], [67.3, 43], [78.6, 12.1], [81.1, 34.6]],
		shooter: 1,
		finish: [64.6, 31.5],
		variation: 0,
		movingFinish: true,
	},
	{
		kind: "drive-kick",
		slots: [[65.6, 25], [74.9, 10.8], [73.3, 38.1], [83.3, 12.2], [83.9, 37.3]],
		shooter: 3,
		finish: [71, 42.6],
		variation: 26,
	},
	{
		kind: "relocation",
		slots: [[65.4, 28.7], [68.2, 5], [73.4, 41.5], [82, 14.5], [83.4, 36]],
		shooter: 4,
		finish: [63.9, 22.2],
		variation: 2,
	},
	{
		kind: "pick-and-pop",
		slots: [[63.9, 29.7], [67.4, 10.6], [71.9, 41.6], [80.1, 15.5], [81.5, 36.4]],
		shooter: 3,
		finish: [67.5, 38.1],
		variation: 47,
	},
	{
		kind: "off-ball-screen",
		slots: [[64.4, 24.7], [71.2, 7.3], [69, 44.4], [83.3, 15.4], [82.6, 36.9]],
		shooter: 2,
		finish: [74.8, 4.2],
		variation: 320,
	},
];

function context(situation, direction = 1) {
	const point = ([x, y]) => ({ x: direction === 1 ? x : 94 - x, y });
	const positions = Object.fromEntries(situation.slots.flatMap(([x, y], i) => [
		[i + 1, point([x, y])],
		[i + 6, point([x + 3.6, y + (25 - y) * 0.09])],
	]));
	return {
		positions,
		lineup: [1, 2, 3, 4, 5],
		matchups: { 6: 1, 7: 2, 8: 3, 9: 4, 10: 5 },
		owner: 1,
		shooter: situation.shooter,
		assister: situation.shooter === 1 ? 0 : 1,
		hoop: point([88.75, 25]),
		direction,
		finish: point(situation.finish),
		available: 9,
		protectedIds: [],
		players: ["PG", "SG", "SF", "PF", "C", "PG", "SG", "SF", "PF", "C"]
			.map((position, i) => ({ id: i + 1, position })),
		movingFinish: Boolean(situation.movingFinish),
		variation: situation.variation,
		forecast: (id) => positions[id],
	};
}

Deno.test("offensive actions can create drive, relocation and screening opportunities in both directions", () => {
	for (const situation of situations) {
		for (const direction of [1, -1]) {
			const input = context(situation, direction);
			const plan = planOffensiveAction(input);
			assert(
				plan && plan.alternatives.some((candidate) => candidate.kind === situation.kind),
				`${situation.kind} has no feasible action in direction ${direction}`,
			);
			assert(plan.duration <= input.available + 1e-8, "action exceeded the possession budget");
			assert(plan.source === "schematic", "invented movement was treated as recorded evidence");
			assert(plan.samples.at(-1).ball.owner === input.shooter, "action lost the recorded shooter");
			if (input.assister) {
				assert(
					plan.passes.at(-1).from === input.assister && plan.passes.at(-1).to === input.shooter,
					"an extra pass changed the recorded assist",
				);
			}
		}
	}
});

Deno.test("screening reserves a stationary set before use and a switch preserves one-to-one assignments", () => {
	const input = context(situations[4]);
	const plan = getOffensiveActions(input).find((candidate) => candidate.kind === "off-ball-screen");
	assert(plan?.kind === "off-ball-screen", "screen opportunity was lost");
	const set = plan.phases.find((phase) => phase.kind === "screen-set");
	const use = plan.phases.find((phase) => phase.screen);
	assert(set && use && set.end <= use.start && set.end - set.start >= 0.3, "the cutter used a moving screen");
	const screener = use.screen;
	const samples = plan.samples.filter((sample) => sample.time >= set.start && sample.time <= use.end);
	assert(
		samples.every((sample) =>
			Math.hypot(
				sample.positions[screener].x - samples[0].positions[screener].x,
				sample.positions[screener].y - samples[0].positions[screener].y,
			) < 0.01
		),
		"screener moved during use",
	);
	assert(new Set(Object.values(plan.matchups)).size === 5, "switch duplicated a defensive assignment");
	if (plan.coverage === "switch") {
		assert(
			plan.switchAt >= set.end &&
				Object.keys(plan.matchups).filter((id) => plan.matchups[id] !== input.matchups[id]).length === 2,
			"switch did not exchange the two involved defenders",
		);
	}
});

Deno.test("drive-and-kick creates a receiving window through help rather than removing the defender", () => {
	const input = context(situations[1]);
	const plan = getOffensiveActions(input).find((candidate) => candidate.kind === "drive-kick");
	assert(plan?.kind === "drive-kick" && plan.helper, "no help-driven kickout was created");
	assert(plan.catchSpace > 5 && plan.releaseSpace > 3.5, "help did not produce a usable shot window");
	let previous = { time: 0, positions: input.positions };
	for (const sample of plan.samples) {
		for (const [id, point] of Object.entries(sample.positions)) {
			const speed = Math.hypot(point.x - previous.positions[id].x, point.y - previous.positions[id].y) /
				(sample.time - previous.time);
			assert(speed <= 13.01, "a player teleported to manufacture the advantage");
		}
		previous = sample;
	}
});

Deno.test("a rolling center receives the recorded assist in motion near the rim", () => {
	for (const direction of [1, -1]) {
		const input = context({
			slots: [[61.8, 20.9], [69.8, 8.6], [73.4, 41.6], [79, 12.7], [83, 33.3]],
			shooter: 5,
			finish: [86, 25],
			variation: 5,
			movingFinish: true,
		}, direction);
		const plan = getOffensiveActions({ ...input, available: 14, rimFinish: true })
			.find((candidate) => candidate.kind === "pick-and-roll");
		assert(plan, "no reachable roll was offered to the center");
		const pass = plan.passes.at(-1);
		assert(pass.from === 1 && pass.to === 5, "roll changed the recorded assist");
		const before = plan.samples.find((sample) => sample.time >= pass.releaseAt);
		const caught = plan.samples.at(-1);
		assert(
			Math.hypot(before.positions[5].x - caught.positions[5].x, before.positions[5].y - caught.positions[5].y) >
				3,
			"roller waited at the rim for the entire pass",
		);
		assert(
			Math.hypot(caught.positions[5].x - input.finish.x, caught.positions[5].y - input.finish.y) < 1e-6,
			"roll missed the recorded finish",
		);
	}
});

Deno.test("plans preserve inputs and are deterministic under mirroring and reverse seeking", () => {
	for (const situation of situations) {
		const input = context(situation);
		const original = JSON.stringify(input);
		const first = planOffensiveAction(input);
		assert(JSON.stringify(first) === JSON.stringify(planOffensiveAction(input)), "planning was not deterministic");
		assert(JSON.stringify(input) === original, "planning mutated its inputs");
		const mirrored = planOffensiveAction(context(situation, -1));
		assert(
			first.kind === mirrored.kind && Math.abs(first.catchSpace - mirrored.catchSpace) < 1e-6,
			`court direction changed ${situation.kind}: ${first.kind} / ${mirrored.kind}, ${first.catchSpace} / ${mirrored.catchSpace}`,
		);
	}
});

Deno.test("tight clocks and reserved participants decline extra choreography", () => {
	const input = context(situations[1]);
	assert(planOffensiveAction({ ...input, available: 0.5 }) === null, "action ignored a tight clock");
	assert(
		planOffensiveAction({ ...input, protectedIds: [input.shooter] }) === null,
		"action interrupted a reserved shooter",
	);
	assert(
		planOffensiveAction({ ...input, protectedIds: [input.owner] }) === null,
		"action interrupted a reserved handler",
	);
});

Deno.test("optional passes reject smothered receivers and favor a clear receiving window", () => {
	const from = { x: 60, y: 10 };
	const to = { x: 75, y: 10 };
	assert(
		getPassCost(from, to, [{ x: 75, y: 11 }]) === Infinity,
		"a smothered receiver remained an optional pass target",
	);
	assert(
		getPassCost(from, to, [{ x: 78, y: 10 }]) > getPassCost(from, to, [{ x: 82, y: 10 }]),
		"receiving pressure was not considered",
	);
});

function game(result = "Made", clock = "PT11M36S", qualifiers = []) {
	return {
		gameId: "0022600007",
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
		actions: [{
			actionType: "3pt",
			subType: "Jump Shot",
			teamId: 1,
			personId: 2,
			assistPersonId: 1,
			period: 1,
			clock,
			scoreHome: result === "Made" ? "3" : "0",
			scoreAway: "0",
			qualifiers,
			isFieldGoal: 1,
			x: 65,
			y: 15,
			side: "right",
			shotResult: result,
			actionNumber: 1,
			orderNumber: 1,
		}],
	};
}

Deno.test("compiled offensive plans keep the recorded pass, shot anchor, score and seeking stable", () => {
	for (const result of ["Made", "Missed"]) {
		const data = game(result);
		const original = JSON.stringify(data);
		const replay = compileReplay(data);
		const scene = replay.scenes[0];
		assert(scene.offensivePlan && scene.preparedCatch, "joint action was not integrated into shot preparation");
		const last = scene.offensivePlan.passes.at(-1);
		const middle = getReplayFrame(
			replay,
			scene.start + scene.offensivePlan.startAt + (last.releaseAt + last.catchAt) / 2,
		);
		assert(!middle.ball.owner && middle.ball.z > 0.5, "final assist did not have a visible ball flight");
		const caught = getReplayFrame(replay, scene.start + scene.catchAt);
		const release = getReplayFrame(replay, scene.start + scene.releaseAt);
		const shooter = release.players.find((player) => player.id === 2);
		assert(caught.ball.owner === 2 && scene.catchAt < scene.releaseAt, "shot began before a controlled catch");
		assert(Math.hypot(shooter.x - 65 * 0.94, shooter.y - 15 * 0.5) < 1e-6, "recorded release location changed");
		getReplayFrame(replay, scene.start + scene.eventAt);
		getReplayFrame(replay, scene.start);
		assert(
			JSON.stringify(caught) === JSON.stringify(getReplayFrame(replay, scene.start + scene.catchAt)),
			"reverse seeking changed the catch",
		);
		assert(JSON.stringify(data) === original, "compilation changed the source events");
		assert(replay.finalScore[1] === (result === "Made" ? 3 : 0), "shot planning changed the score");
	}
});

Deno.test("transition and special shot evidence retain their own choreography", () => {
	for (
		const overrides of [{ blockPersonId: 6 }, { descriptor: "step back" }, { descriptor: "pullup" }, {
			descriptor: "putback",
		}]
	) {
		const data = game();
		Object.assign(data.actions[0], overrides);
		const scene = compileReplay(data).scenes[0];
		assert(!scene.offensivePlan, "optional halfcourt action replaced a protected finish");
	}
});
