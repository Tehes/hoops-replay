import { planPassConnection } from "../js/replay-passing.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

function scenario(mirrored = false) {
	const point = (x, y) => ({ x: mirrored ? 94 - x : x, y });
	return {
		positions: { 1: point(65, 8), 2: point(60, 25), 3: point(65, 42), 4: point(85, 25) },
		defenders: [point(69, 8), point(56, 25), point(69, 42), point(89, 25)],
	};
}

Deno.test("a long covered-side connection swings through a reachable intermediate teammate in either direction", () => {
	for (const mirrored of [false, true]) {
		const { positions, defenders } = scenario(mirrored);
		const plan = planPassConnection(1, 3, [1, 2, 3, 4], positions, defenders, 2);
		assert(plan?.path.join() === "1,2,3", "long pass skipped the useful perimeter station");
		assert(plan.duration <= 2, "swing exceeded the available time");
		assert(plan.durations.every((duration) => duration >= 0.35), "passes became rushed flicks");
	}
});

Deno.test("a free weak-side receiver retains the direct skip pass despite an intermediate teammate", () => {
	const { positions, defenders } = scenario();
	defenders[2].x = 75;
	assert(
		planPassConnection(1, 3, [1, 2, 3, 4], positions, defenders, 2) === null,
		"an open skip pass was replaced by an unnecessary relay",
	);
});

Deno.test("short connections, occupied relay lanes, unavailable stations and tight clocks do not add passes", () => {
	const { positions, defenders } = scenario();
	assert(
		planPassConnection(1, 2, [1, 2, 3, 4], positions, defenders, 2) === null,
		"a short connection added an intermediate pass",
	);
	assert(
		planPassConnection(1, 3, [1, 2, 3, 4], positions, defenders, 0.7) === null,
		"extra passes ignored the available time",
	);
	assert(
		planPassConnection(1, 3, [1, 3, 4], positions, defenders, 2) === null,
		"an unavailable relay received the ball",
	);
	defenders.push({ x: 62.5, y: 16.5 });
	assert(
		planPassConnection(1, 3, [1, 2, 3, 4], positions, defenders, 2) === null,
		"relay pass crossed an occupied passing lane",
	);
});

Deno.test("pass selection is deterministic and preserves its positional inputs", () => {
	const { positions, defenders } = scenario();
	const input = JSON.stringify({ positions, defenders });
	const first = JSON.stringify(planPassConnection(1, 3, [1, 2, 3, 4], positions, defenders, 2));
	assert(
		JSON.stringify(planPassConnection(1, 3, [1, 2, 3, 4], positions, defenders, 2)) === first,
		"identical pass decisions changed",
	);
	assert(JSON.stringify({ positions, defenders }) === input, "pass selection moved players");
});
