import { movePlayers } from "../js/replay-motion.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

function scenario() {
	const player = (id, x, y) => ({ id, x, y, opacity: 1, jump: 0, angle: 0 });
	return {
		action: {},
		frames: [
			{ time: 0, players: [player(1, 30, 25), player(2, 40, 15)], ball: {} },
			{ time: 2, players: [player(1, 50, 25), player(2, 40, 35)], ball: {} },
		],
		buildupMoves: [{ start: 0, end: 2 }],
	};
}

Deno.test("connecting routes anticipate crossings and remain deterministic when seeking", () => {
	const scene = scenario();
	const original = JSON.stringify(scene);
	const sample = (fraction) => movePlayers(
		scene,
		0,
		fraction,
		fraction === 1 ? scene.frames[1].players : scene.frames[0].players,
	);
	const middle = sample(0.5);
	assert(Math.hypot(middle[0].x - middle[1].x, middle[0].y - middle[1].y) > 1, "crossing bodies overlap");
	sample(0.8);
	sample(0.1);
	assert(JSON.stringify(sample(0.5)) === JSON.stringify(middle), "seeking changes routes");
	assert(JSON.stringify(scene) === original, "motion mutated event anchors");
	assert(sample(0) === scene.frames[0].players, "start anchor changed");
	assert(sample(1) === scene.frames[1].players, "endpoint interpolation was overridden");
});

Deno.test("players retain momentum at an intermediate route anchor", () => {
	const scene = scenario();
	scene.frames = [0, 1, 2].map((time) => ({
		time,
		players: [{ id: 1, x: 20 + time * 5, y: 20, opacity: 1 }],
		ball: {},
	}));
	const before = movePlayers(scene, 0, 0.999, scene.frames[0].players)[0];
	const after = movePlayers(scene, 1, 0.001, scene.frames[1].players)[0];
	assert(before.x < 25 && after.x > 25, "player stopped at the intermediate anchor");
	assert(Math.abs((25 - before.x) - (after.x - 25)) < 0.0001, "velocity jumped at the anchor");
});

Deno.test("a defender reacts later than the attacker on parallel routes", () => {
	const scene = scenario();
	scene.matchups = { 2: 1 };
	scene.frames[0].players[1] = { ...scene.frames[0].players[1], x: 34, y: 25 };
	scene.frames[1].players[1] = { ...scene.frames[1].players[1], x: 54, y: 25 };
	const moved = movePlayers(scene, 0, 0.08, scene.frames[0].players);
	assert(moved[0].x > 30, "attacker failed to start");
	assert(Math.abs(moved[1].x - 34) < 0.01, "defender started in lockstep");
});

Deno.test("perimeter players including receivers follow the arc in either court direction", () => {
	for (const hoopX of [5.25, 88.75]) {
		const scene = scenario();
		scene.hoop = { x: hoopX, y: 25 };
		scene.action.personId = 1;
		const direction = hoopX < 47 ? 1 : -1;
		const point = (angle) => ({
			id: 1, x: hoopX + direction * Math.cos(angle) * 24, y: 25 + Math.sin(angle) * 24, opacity: 1,
		});
		scene.frames[0].players = [point(-0.55)];
		scene.frames[1].players = [point(0.55)];
		for (let fraction = 0.05; fraction < 1; fraction += 0.05) {
			const player = movePlayers(scene, 0, fraction, scene.frames[0].players)[0];
			assert(Math.abs(Math.hypot(player.x - hoopX, player.y - 25) - 24) < 0.00001,
				"relocation cuts inside the three-point arc");
		}
		const middle = movePlayers(scene, 0, 0.5, scene.frames[0].players)[0];
		assert(Math.abs(middle.x - scene.frames[0].players[0].x) > 3, "route is still a straight chord");
	}
});

Deno.test("a planned reversal decelerates, then returns without overshooting the turn", () => {
	const scene = scenario();
	scene.frames = [30, 36, 31].map((x, time) => ({
		time, players: [{ id: 1, x, y: 25, opacity: 1 }], ball: {},
	}));
	const before = movePlayers(scene, 0, 0.99, scene.frames[0].players)[0];
	const after = movePlayers(scene, 1, 0.05, scene.frames[1].players)[0];
	const returning = movePlayers(scene, 1, 0.5, scene.frames[1].players)[0];
	assert(before.x <= 36 && after.x <= 36, "player overshot the reversal");
	assert(returning.x < after.x, "player did not change direction");
});


Deno.test("unobstructed travel is straight and a holding player never drifts", () => {
	const scene = scenario();
	scene.frames[0].players[1] = { ...scene.frames[0].players[1], x: 75, y: 40 };
	scene.frames[1].players[1] = { ...scene.frames[0].players[1] };
	for (let step = 0; step <= 40; step++) {
		const players = movePlayers(scene, 0, step / 40, step === 40 ? scene.frames[1].players : scene.frames[0].players);
		assert(players[0].y === 25, "clear straight route acquired lateral motion");
		assert(players[1].x === 75 && players[1].y === 40, "holding player wandered away from their spot");
	}
});

Deno.test("a planned detour has one bow without alternating lateral corrections", () => {
	const scene = scenario();
	const original = JSON.stringify(scene.frames);
	let side = 0;
	let peak = 0;
	let previousOffset = 0;
	let falling = false;
	for (let step = 1; step < 100; step++) {
		const player = movePlayers(scene, 0, step / 100, scene.frames[0].players)[1];
		const offset = player.x - 40;
		if (Math.abs(offset) > 0.001) {
			side ||= Math.sign(offset);
			assert(Math.sign(offset) === side, "detour changed sides halfway through");
		}
		if (Math.abs(offset) < previousOffset - 0.00001) {
			falling = true;
		}
		if (falling) {
			assert(Math.abs(offset) <= previousOffset + 0.00001, "detour started weaving after its peak");
		}
		peak = Math.max(peak, Math.abs(offset));
		previousOffset = Math.abs(offset);
	}
	assert(peak > 0.1, "crossing did not reserve an avoidance route");
	assert(JSON.stringify(scene.frames) === original, "route planning rewrote recorded anchors");
});

Deno.test("a deliberate cut stops at its corner without rounding into a snake", () => {
	const scene = scenario();
	scene.frames = [[20, 10], [30, 10], [30, 20]].map(([x, y], time) => ({
		time, players: [{ id: 1, x, y, opacity: 1 }], ball: {},
	}));
	for (let step = 1; step < 20; step++) {
		const before = movePlayers(scene, 0, step / 20, scene.frames[0].players)[0];
		const after = movePlayers(scene, 1, step / 20, scene.frames[1].players)[0];
		assert(before.y === 10 && after.x === 30, "cut wandered off its two deliberate legs");
	}
});

Deno.test("an obstacle cannot make a stationary player dodge out of their held spot", () => {
	const scene = scenario();
	scene.frames[0].players[1] = { ...scene.frames[0].players[1], x: 40, y: 25 };
	scene.frames[1].players[1] = { ...scene.frames[0].players[1] };
	for (let step = 1; step < 20; step++) {
		const held = movePlayers(scene, 0, step / 20, scene.frames[0].players)[1];
		assert(held.x === 40 && held.y === 25, "stationary player was pushed aside by a passing runner");
	}
});
