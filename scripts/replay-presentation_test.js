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

Deno.test("dribbles touch the floor and return to the hand across scene boundaries and display sizes", () => {
	const p = player(1, 40, 25);
	const key = (time, dribble = true) => ({ time, players: [p], ball: { ...heldBall(p), dribble } });
	const first = { start: 10, frames: [key(0), key(0.3)] };
	const second = { start: 10.3, frames: [key(0), key(0.38, false), key(0.8, false)] };
	const source = JSON.stringify([first.frames, second.frames]);
	planBallOffsets({ scenes: [first, second] });
	for (const pixels of [2, 4, 12]) {
		const hand = atKey(first, 0, pixels);
		const contact = getBallGeometry({ ...key(0), scene: second, time: 10.34 }, pixels);
		near(contact.y + contact.radius, contact.groundY, "ball does not meet its floor shadow");
		assert(contact.y > hand.y + 1, "dribble has no visible descent");
		assert(Math.abs(contact.x - hand.x) < (contact.y - hand.y) * 0.25, "dribble angles too far sideways");
		assert(contact.shadowHeight < hand.shadowHeight, "shadow does not tighten on contact");
		near(atKey(first, 1, pixels).y, atKey(second, 0, pixels).y, "dribble resets at scene boundary");
		near(atKey(second, 1, pixels).y, hand.y, "ball is not gathered at hand height");
		atKey(second, 2, pixels);
		near(getBallGeometry({ ...key(0), scene: second, time: 10.34 }, pixels).y, contact.y, "seeking changes bounce");
	}
	assert(JSON.stringify([first.frames, second.frames]) === source, "dribble changes compiled ball paths");
});

Deno.test("the slight dribble lean follows horizontal travel and stays vertical at rest", () => {
	for (const direction of [-1, 0, 1]) {
		const key = (time, x) => {
			const p = player(1, x, 25);
			return { time, players: [p], ball: { ...heldBall(p), dribble: true } };
		};
		const scene = { start: 0, frames: [key(0, 40), key(0.68, 40 + direction * 2)] };
		planBallOffsets({ scenes: [scene] });
		for (const pixels of [2, 4, 12]) {
			const frame = { ...key(0.34, 40 + direction), scene };
			const ball = getBallGeometry(frame, pixels);
			const bodyX = getPlayerGeometry(frame.players[0], pixels).x;
			const handX = bodyX + (direction || 1);
			assert(Math.sign(ball.x - bodyX) === (direction || 1), "ball is led on the wrong body side");
			assert(Math.sign(ball.x - handX) === direction, "dribble leans against the movement direction");
			near(ball.groundX, ball.x, "shadow does not follow the mirrored dribble");
			near(ball.y + ball.radius, ball.groundY, "mirrored dribble misses the floor");
		}
	}
});

Deno.test("left-hand projection survives a scene boundary, a stop and the following pass", () => {
	const key = (time, x, dribble) => {
		const p = player(1, x, 25);
		return { time, players: [p], ball: { ...heldBall(p), dribble } };
	};
	const first = { start: 0, frames: [key(0, 40, true), key(0.68, 38, false)] };
	const second = {
		start: 0.68,
		frames: [
			key(0, 38, false), key(0.3, 38, false),
			{ time: 0.6, players: [player(1, 38, 25)], ball: { x: 30, y: 25, z: 2, flight: true, owner: null } },
			key(0.9, 20, false),
		],
	};
	planBallOffsets({ scenes: [first, second] });
	for (const pixels of [2, 4, 12]) {
		near(atKey(first, 1, pixels).x, 37, "gather switches back to the right hand");
		near(atKey(second, 0, pixels).x, 37, "scene boundary resets the hand");
		near(atKey(second, 1, pixels).x, 37, "stopping resets the hand");
		const release = getBallGeometry({ ...second.frames[1], scene: second, time: second.start + 0.3 + 1e-8 }, pixels);
		assert(Math.abs(release.x - 37) < 1e-6, "pass jumps from the left hand to the right");
		atKey(second, 3, pixels);
		near(atKey(first, 0, pixels).x, 39, "reverse seeking changes the selected hand");
	}
});

Deno.test("dribble gathers before a flight and does not bounce during a jump or a brief hold", () => {
	const p = player(1, 40, 25);
	for (
		const ending of [
			{ players: [p], ball: { x: 50, y: 25, z: 4, flight: true, owner: null } },
			{ players: [{ ...p, jump: 1 }], ball: { ...heldBall({ ...p, jump: 1 }), dribble: true } },
		]
	) {
		const scene = {
			start: 0,
			frames: [0, 0.68].map((time) => ({ time, players: [p], ball: { ...heldBall(p), dribble: true } })),
		};
		scene.frames.push({ time: 1, ...ending });
		planBallOffsets({ scenes: [scene] });
		near(atKey(scene, 1, 8).y, atKey(scene, 0, 8).y, "release starts below the hand");
		assert(scene.ballDribbles[1] === null, "flight or jump keeps a dribble cycle");
	}
	const brief = {
		start: 0,
		frames: [0, 0.1].map((time) => ({ time, players: [p], ball: { ...heldBall(p), dribble: true } })),
	};
	planBallOffsets({ scenes: [brief] });
	near(
		getBallGeometry({ ...brief.frames[0], scene: brief, time: 0.05 }, 8).y,
		atKey(brief, 0, 8).y,
		"brief hold creates a frantic bounce",
	);
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
