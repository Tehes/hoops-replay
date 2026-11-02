import {
	BALL_HEIGHT_SCALE,
	getBallGeometry,
	getPlayerGeometry,
	getPlayerHitDistance,
	getScoreMarkerGeometry,
	getShotMarkerGeometry,
	planBallOffsets,
	PLAYER_HALF_HEIGHT,
	PLAYER_JUMP_HEIGHT,
	RIM_Y,
	WORLD,
} from "../js/replay-presentation.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

function near(a, b, message) {
	assert(Math.abs(a - b) < 1e-8, `${message}: ${a} versus ${b}`);
}

function player(id, x, y, angle = 0, jump = 0) {
	return { id, x, y, angle, jump, opacity: 1 };
}

function heldBall(owner) {
	return { x: owner.x + 1, y: owner.y + 0.8, z: 0.5 + owner.jump * 1.4, owner: owner.id, dribble: false };
}

function atKey(scene, index, pixelScale) {
	const key = scene.frames[index];
	return getBallGeometry({ ...key, scene, time: scene.start + key.time }, pixelScale);
}

Deno.test("jersey foot anchor, rotated bounds and hit area agree across sizes and jumps", () => {
	for (const pixels of [2, 4, 12]) {
		for (const angle of [-0.9, 0, 0.6]) {
			for (const jump of [0, 1.5]) {
				const p = player(1, 40, 25, angle, jump);
				const body = getPlayerGeometry(p, pixels);
				near(body.x - Math.sin(angle) * PLAYER_HALF_HEIGHT * body.size, p.x, "foot x");
				near(
					body.y + Math.cos(angle) * PLAYER_HALF_HEIGHT * body.size,
					p.y - jump * PLAYER_JUMP_HEIGHT * body.size,
					"foot y",
				);
				for (const x of [-1.4, 1.4]) {
					for (const y of [-PLAYER_HALF_HEIGHT, PLAYER_HALF_HEIGHT]) {
						const px = body.x + (x * Math.cos(angle) - y * Math.sin(angle)) * body.size;
						const py = body.y + (x * Math.sin(angle) + y * Math.cos(angle)) * body.size;
						assert(
							px >= body.bounds.x && px <= body.bounds.x + body.bounds.width &&
								py >= body.bounds.y && py <= body.bounds.y + body.bounds.height,
							"bounds lost a corner",
						);
						near(getPlayerHitDistance(p, px, py, pixels), 0, "visible jersey corner is not clickable");
					}
				}
				assert(getPlayerHitDistance(p, body.x + 20, body.y, pixels) > 1, "empty court selects a jersey");
			}
		}
	}
});

Deno.test("floor markers retain their center and score labels clear the foot-anchored jersey", () => {
	for (const pixels of [2, 4, 12]) {
		const marker = { x: 40, y: 25, time: 2 };
		const ground = getShotMarkerGeometry(marker, pixels);
		near(ground.x, marker.x, "ground marker x");
		near(ground.y, marker.y, "ground marker y");
		near(ground.height / ground.radius, 0.78, "ground marker flattening");
		const score = getScoreMarkerGeometry(marker, 2.5, pixels);
		const body = getPlayerGeometry(player(1, 40, 25), pixels);
		assert(score.y + score.fontSize / 2 + score.lineWidth < body.bounds.y, "score label overlaps jersey");
		const corner = getScoreMarkerGeometry({ ...marker, y: 0.5 }, 3, pixels);
		assert(corner.y - corner.fontSize / 2 - corner.lineWidth >= -WORLD.top, "score clipped at top edge");
	}
});

Deno.test("held ball follows torso rotation and jump while its shadow stays on the floor below it", () => {
	for (const pixels of [2, 4, 12]) {
		for (const angle of [-0.9, 0, 0.6]) {
			for (const jump of [0, 1.5]) {
				const p = player(1, 40, 25, angle, jump);
				const scene = { start: 0, frames: [0, 1].map((time) => ({ time, players: [p], ball: heldBall(p) })) };
				const source = JSON.stringify(scene.frames);
				planBallOffsets({ scenes: [scene] });
				const ball = atKey(scene, 0, pixels);
				const body = getPlayerGeometry(p, pixels);
				near(ball.x, body.x + 1, "ball beside torso");
				near(ball.y, body.y + 0.8 - 0.5 * BALL_HEIGHT_SCALE, "ball at hand height");
				near(ball.groundX, ball.x, "ball shadow x");
				near(ball.groundY, scene.frames[0].ball.y, "ball shadow y");
				assert(JSON.stringify(scene.frames) === source, "projection mutated source snapshots");
			}
		}
	}
});

Deno.test("pass, rim, board and floor anchors use one projection without moving the source path", () => {
	const a = player(1, 40, 15, -0.3);
	const b = player(2, 60, 35, 0.6, 1);
	const players = [a, b];
	const scene = {
		start: 10,
		bankAt: 4,
		frames: [
			{ time: 0, players, ball: heldBall(a) },
			{ time: 1, players, ball: { x: 50, y: 25, z: 4, flight: true, owner: null } },
			{ time: 2, players, ball: heldBall(b) },
			{ time: 3, players, ball: { x: 88.75, y: 25, z: 1, flight: true, owner: null } },
			{ time: 4, players, ball: { x: 90, y: 26.2, z: 2.5, flight: true, owner: null } },
			{ time: 5, players, ball: { x: 80, y: 30, z: 0, owner: null } },
		],
	};
	const source = JSON.stringify(scene.frames);
	planBallOffsets({ scenes: [scene] });
	for (const pixels of [2, 4, 12]) {
		const rim = atKey(scene, 3, pixels);
		near(rim.x, 88.75, "rim x");
		near(rim.y, RIM_Y, "rim height");
		near(atKey(scene, 4, pixels).y, 26.2 - 2.5 * BALL_HEIGHT_SCALE, "board contact");
		near(atKey(scene, 5, pixels).y, 30, "floor contact");
		const middle = atKey(scene, 1, pixels);
		assert(Number.isFinite(middle.x) && Number.isFinite(middle.y), "pass lost projection");
		atKey(scene, 5, pixels);
		assert(JSON.stringify(atKey(scene, 1, pixels)) === JSON.stringify(middle), "seeking changes projection");
	}
	assert(JSON.stringify(scene.frames) === source, "flight projection changed source anchors");
});

Deno.test("jump-ball toss starts in the official's hand and clears jumpers before a hand-height catch", () => {
	const jumpers = [player(1, 45, 25, 0, 1), player(2, 49, 25, 0, 0.8)];
	const receiver = player(3, 35, 20);
	const players = [...jumpers, receiver];
	const scene = {
		start: 0,
		jumpBallPlan: { opening: true, winnerId: 1, loserId: 2, tossAt: 0, tipAt: 1, catchAt: 2 },
		frames: [
			{ time: 0, players, ball: { x: 47, y: 25, z: 0, owner: null } },
			{ time: 1, players, ball: { x: 47, y: 25, z: 4.2, owner: null, flight: true } },
			{ time: 2, players, ball: heldBall(receiver) },
		],
	};
	planBallOffsets({ scenes: [scene] });
	for (const pixels of [2, 4, 12]) {
		assert(atKey(scene, 0, pixels).y < 25, "toss starts on floor");
		const tip = atKey(scene, 1, pixels);
		assert(
			tip.y + tip.radius < Math.min(...jumpers.map((p) => getPlayerGeometry(p, pixels).bounds.y)),
			"tip is below jumping jerseys",
		);
		near(atKey(scene, 2, pixels).y, getPlayerGeometry(receiver, pixels).y + 0.5, "catch height");
	}
});

Deno.test("a later jump ball lifts from the preceding dead-ball position without a scene-boundary jump", () => {
	const players = [player(1, 73, 25, 0, 1), player(2, 77, 25, 0, 0.8), player(3, 65, 20)];
	const floor = { x: 84.75, y: 25, z: 0, owner: null };
	const previous = { start: 0, frames: [0, 1].map((time) => ({ time, players, ball: floor })) };
	const tip = {
		start: 1,
		jumpBallPlan: { opening: false, winnerId: 1, loserId: 2, tossAt: 1, tipAt: 2, catchAt: 3 },
		frames: [
			{ time: 0, players, ball: floor },
			{ time: 1, players, ball: { x: 75, y: 25, z: 0, owner: null } },
			{ time: 2, players, ball: { x: 75, y: 25, z: 4.2, owner: null, flight: true } },
			{ time: 3, players, ball: heldBall(players[2]) },
		],
	};
	planBallOffsets({ scenes: [previous, tip] });
	near(atKey(previous, 1, 8).y, atKey(tip, 0, 8).y, "jump-ball preparation teleports the ball upward");
	assert(atKey(tip, 1, 8).y < 25, "official did not raise the ball for the toss");
});

Deno.test("made shots stay centered in either rim through the z=1 to z=0 event transition", () => {
	for (const hoopX of [5.25, 88.75]) {
		const shooter = player(1, 40, 15, 0.12, 1.5);
		const players = [shooter];
		const scene = {
			start: 0,
			frames: [
				{ time: 0, players, ball: heldBall(shooter) },
				{ time: 1, players, ball: { x: hoopX, y: RIM_Y, z: 1, owner: null, flight: true } },
				{ time: 1.01, players, ball: { x: hoopX, y: RIM_Y, z: 0, owner: null } },
				{ time: 1.5, players, ball: { x: hoopX, y: RIM_Y, z: 0, owner: null } },
			],
		};
		planBallOffsets({ scenes: [scene] });
		for (const pixels of [2, 4, 12]) {
			for (const time of [1, 1.001, 1.005, 1.009, 1.01, 1.1]) {
				const fraction = Math.min(1, (time - 1) / 0.01);
				const smooth = fraction * fraction * (3 - 2 * fraction);
				const ball = getBallGeometry({
					scene, time, players,
					ball: { x: hoopX, y: RIM_Y, z: 1 - smooth, owner: null },
				}, pixels);
				near(ball.x, hoopX, "ball missed rim horizontally");
				near(ball.y, RIM_Y, "ball moved below rim immediately after a make");
			}
		}
	}
});
