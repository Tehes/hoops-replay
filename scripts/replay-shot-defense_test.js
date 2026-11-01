import { compileReplay, getReplayFrame } from "../js/replay-engine.js";

function scenario(result, number, descriptor = "", blockPersonId = 0, overrides = {}) {
	const teams = [1, 2].map((id) => ({
		id, home: id === 1, code: id === 1 ? "BOS" : "NYK",
		players: ["PG", "SG", "SF", "PF", "C"].map((position, slot) => ({
			id: (id - 1) * 5 + slot + 1, position, starter: true,
		})),
	}));
	const action = {
		actionType: "3pt", subType: "Jump Shot", teamId: 1, personId: 2, assistPersonId: 1,
		period: 1, clock: "PT08M00S", scoreHome: "3", scoreAway: "0", qualifiers: [],
		isFieldGoal: 1, x: 65, y: 15, side: "right", shotResult: result,
		actionNumber: number, orderNumber: 1, descriptor, blockPersonId,
	};
	return compileReplay({ gameId: "0022600007", teams, actions: [{ ...action, ...overrides }] });
}

Deno.test("shot result weights defensive help without excluding either outcome or overriding recorded blocks", () => {
	for (const [result, number, expected] of [["Made", 1, true], ["Made", 4, false],
		["Missed", 1, false], ["Missed", 4, true]]) {
		const replay = scenario(result, number);
		const scene = replay.scenes[0];
		if (scene.shotHelp !== expected || !Number.isFinite(scene.releaseAt)) {
			throw new Error(`unexpected shot plan: ${result} ${number}`);
		}
		const frame = getReplayFrame(replay, scene.start + scene.releaseAt);
		if (!frame.players.every((player) => Number.isFinite(player.x) && Number.isFinite(player.y))) {
			throw new Error("shot plan produced invalid player positions");
		}
	}
	for (const replay of [scenario("Made", 1, "step back"), scenario("Missed", 4, "", 6)]) {
		if (replay.scenes[0].shotHelp) {
			throw new Error("shot help replaced a distinct shot or recorded block");
		}
	}
});

Deno.test("a shot-clock turnover applies ball pressure without inventing a steal", () => {
	const replay = scenario("", 1, "", 0, {
		actionType: "turnover", subType: "shot clock", isFieldGoal: 0, assistPersonId: 0,
	});
	const scene = replay.scenes[0];
	if (scene.kind !== "turnover" || scene.stealPlan || scene.action.stealPersonId ||
		!Number.isFinite(scene.eventAt)) {
		throw new Error("shot-clock pressure changed the recorded turnover");
	}
});

Deno.test("shot-clock display follows game time, expires at the event and survives seeking", () => {
	const replay = scenario("", 1, "", 0, {
		actionType: "turnover", subType: "shot clock", isFieldGoal: 0, assistPersonId: 0,
		clock: "PT11M36S",
	});
	const scene = replay.scenes[0];
	const liveAt = scene.liveAt ?? 0;
	const atRemaining = (seconds) => getReplayFrame(
		replay,
		scene.start + liveAt + (scene.eventAt - liveAt) * (1 - seconds / scene.liveSeconds),
	);
	for (const [remaining, expected] of [[4, null], [2.8, 3], [1.8, 2], [0.8, 1], [0, 0], [2.8, 3]]) {
		if (atRemaining(remaining).shotClock !== expected) {
			throw new Error(`unexpected countdown at ${remaining} game seconds remaining`);
		}
	}
	if (getReplayFrame(replay, scene.start + scene.eventAt + 0.61).shotClock !== null) {
		throw new Error("countdown hid the turnover description after expiration");
	}
	for (const overrides of [{ clock: "PT11M58S" }, { subType: "lost ball" }]) {
		const other = scenario("", 1, "", 0, {
			actionType: "turnover", subType: "shot clock", isFieldGoal: 0, assistPersonId: 0,
			...overrides,
		});
		const event = other.scenes[0];
		if (getReplayFrame(other, event.start + event.eventAt - 0.1).shotClock !== null) {
			throw new Error("countdown invented a lead-in or an unrecorded expiration");
		}
	}
});

Deno.test("ball-oriented help changes the shooter's defender before a catch", () => {
	const helped = scenario("Made", 1);
	const covered = scenario("Missed", 1);
	const distance = (replay) => {
		const scene = replay.scenes[0];
		const defenderId = Number(Object.keys(scene.matchups).find((id) => scene.matchups[id] === 2));
		const frame = getReplayFrame(replay, scene.start + scene.approachAt);
		const shooter = frame.players.find((player) => player.id === 2);
		const defender = frame.players.find((player) => player.id === defenderId);
		return Math.hypot(shooter.x - defender.x, shooter.y - defender.y);
	};
	if (distance(helped) <= distance(covered) + 1) {
		throw new Error(`help did not create space before the catch: ${distance(helped)} / ${distance(covered)}`);
	}
});

Deno.test("the recorded assister passes to the shooter while the defender closes out", () => {
	const replay = scenario("Made", 1);
	const scene = replay.scenes[0];
	const at = (time) => getReplayFrame(replay, scene.start + time);
	const before = at(scene.shotPassAt);
	const middle = at((scene.shotPassAt + scene.catchAt) / 2);
	const caught = at(scene.catchAt);
	const defenderId = Number(Object.keys(scene.matchups).find((id) => scene.matchups[id] === 2));
	const distance = (frame) => {
		const shooter = frame.players.find((player) => player.id === 2);
		const defender = frame.players.find((player) => player.id === defenderId);
		return Math.hypot(shooter.x - defender.x, shooter.y - defender.y);
	};
	if (middle.ball.owner || middle.ball.z <= 0.5 || caught.ball.owner !== 2 ||
		distance(caught) >= distance(before) || scene.catchAt >= scene.releaseAt) {
		throw new Error(`pass, catch, closeout and shot did not occur in order: ${JSON.stringify({
			middle: middle.ball, caught: caught.ball, beforeDistance: distance(before), catchDistance: distance(caught),
			catchAt: scene.catchAt, releaseAt: scene.releaseAt,
		})}`);
	}
});
