export const WORLD = { width: 110, height: 65, left: 8, top: 9 };
export const PLAYER_HALF_HEIGHT = 2.2;
export const PLAYER_JUMP_HEIGHT = 0.65;
export const BALL_HEIGHT_SCALE = 0.6;
export const RIM_Y = 25;
export const SHOT_MARKER_FLATTENING = 0.78;

export function getPlayerSize(pixelScale) {
	return Math.max(1, 7 / (pixelScale * 1.6));
}

export function getPlayerGeometry(position, pixelScale) {
	const size = getPlayerSize(pixelScale);
	const sin = Math.sin(position.angle);
	const cos = Math.cos(position.angle);
	const x = position.x + sin * PLAYER_HALF_HEIGHT * size;
	const y = position.y - (cos * PLAYER_HALF_HEIGHT + position.jump * PLAYER_JUMP_HEIGHT) * size;
	const halfWidth = (Math.abs(cos) * 1.45 + Math.abs(sin) * PLAYER_HALF_HEIGHT + 0.08) * size;
	const halfHeight = (Math.abs(sin) * 1.45 + Math.abs(cos) * PLAYER_HALF_HEIGHT + 0.08) * size;
	return {
		x,
		y,
		size,
		bounds: { x: x - halfWidth, y: y - halfHeight, width: halfWidth * 2, height: halfHeight * 2 },
	};
}

export function getShotMarkerGeometry(marker, pixelScale) {
	const radius = Math.max(1.1, 4 / pixelScale);
	return { x: marker.x, y: marker.y, radius, height: radius * SHOT_MARKER_FLATTENING };
}

export function getPlayerHitDistance(position, x, y, pixelScale) {
	const body = getPlayerGeometry(position, pixelScale);
	const cos = Math.cos(position.angle);
	const sin = Math.sin(position.angle);
	const localX = ((x - body.x) * cos + (y - body.y) * sin) / body.size;
	const localY = (-(x - body.x) * sin + (y - body.y) * cos) / body.size;
	return Math.hypot(Math.max(0, Math.abs(localX) - 1.45), Math.max(0, Math.abs(localY) - PLAYER_HALF_HEIGHT)) *
		body.size;
}

export function getScoreMarkerGeometry(marker, time, pixelScale) {
	const size = Math.max(1, 5 / pixelScale);
	const fontSize = 2.4 * size;
	const lineWidth = 0.65 * size;
	const y = marker.y - PLAYER_HALF_HEIGHT * 2 * getPlayerSize(pixelScale) -
		(2 + Math.min(time - marker.time, 1) * 1.3) * size;
	return {
		x: marker.x,
		y: Math.max(-WORLD.top + fontSize / 2 + lineWidth, y),
		fontSize,
		lineWidth,
	};
}

// Presentation offsets leave the recorded court coordinates and compiled ball paths untouched.
export function planBallOffsets(replay) {
	const openingTip = replay.scenes.find((scene) => scene.jumpBallPlan?.opening);
	const openingTossAt = openingTip ? openingTip.start + openingTip.jumpBallPlan.tossAt : -1;
	let anchor = { time: 0, x: 0, y: 0, z: 0 };
	const pending = [];
	for (const scene of replay.scenes) {
		scene.ballOffsets = [];
		const initialOffset = { x: anchor.x, y: anchor.y, z: anchor.z };
		for (const frame of scene.frames) {
			const ball = frame.ball;
			const key = { time: frame.time };
			scene.ballOffsets.push(key);
			const time = scene.start + frame.time;
			const owner = ball.owner && frame.players.find((player) => player.id === ball.owner);
			const atRim = Math.min(Math.abs(ball.x - 5.25), Math.abs(ball.x - 88.75)) < 1e-8 &&
				Math.abs(ball.y - 25) < 1e-8;
			const atBoard = scene.bankAt !== undefined && Math.abs(frame.time - scene.bankAt) < 1e-8;
			const jumpBall = scene.jumpBallPlan;
			const atTip = jumpBall && Math.abs(frame.time - jumpBall.tipAt) < 1e-8;
			let offset = null;
			if (owner) {
				const body = getPlayerGeometry(owner, Infinity);
				offset = { x: body.x - owner.x, y: body.y - owner.y, z: owner.jump * 1.4 };
			} else if (atTip) {
				const top = Math.min(
					...frame.players.filter((player) =>
						player.id === jumpBall.winnerId || player.id === jumpBall.loserId
					).map((player) => getPlayerGeometry(player, Infinity).bounds.y),
				);
				offset = { x: 0, y: top - ball.y - 0.8, z: ball.z };
			} else if (time <= openingTossAt) {
				offset = { x: 0, y: -PLAYER_HALF_HEIGHT, z: 0 };
			} else if (jumpBall && frame.time <= jumpBall.tossAt) {
				const fraction = frame.time / jumpBall.tossAt;
				offset = {
					x: initialOffset.x * (1 - fraction),
					y: initialOffset.y + (-PLAYER_HALF_HEIGHT - initialOffset.y) * fraction,
					z: initialOffset.z * (1 - fraction),
				};
			} else if (atRim) {
				// z=1 is the flight's rim contact; a made basket then switches to z=0 at the same point.
				offset = { x: 0, y: 0, z: Math.min(1, ball.z) };
			} else if (ball.z === 0 || atBoard) {
				offset = { x: 0, y: 0, z: 0 };
			}
			if (offset === null) {
				pending.push({ time, key });
				continue;
			}
			for (const point of pending) {
				const fraction = (point.time - anchor.time) / (time - anchor.time || 1);
				for (const axis of ["x", "y", "z"]) {
					point.key[axis] = anchor[axis] + (offset[axis] - anchor[axis]) * fraction;
				}
			}
			pending.length = 0;
			Object.assign(key, offset);
			anchor = { time, ...offset };
		}
	}
	for (const point of pending) {
		Object.assign(point.key, { x: anchor.x, y: anchor.y, z: anchor.z });
	}
}

export function getBallGeometry(frame, pixelScale) {
	const { ball, scene } = frame;
	const local = frame.time - scene.start;
	let index = 0;
	while (index < scene.frames.length - 2 && scene.frames[index + 1].time <= local + 1e-9) {
		index++;
	}
	const from = scene.frames[index];
	const to = scene.frames[index + 1] || from;
	const fraction = Math.max(0, Math.min(1, (local - from.time) / (to.time - from.time || 1)));
	const flight = to.ball.flight && !to.ball.owner;
	const progress = flight ? fraction : fraction * fraction * (3 - 2 * fraction);
	const start = scene.ballOffsets[index];
	const end = scene.ballOffsets[index + 1] || start;
	const offset = {};
	for (const axis of ["x", "y", "z"]) {
		offset[axis] = start[axis] + (end[axis] - start[axis]) * progress;
	}
	const size = getPlayerSize(pixelScale);
	if (from.ball.owner && from.ball.owner === to.ball.owner) {
		const owner = frame.players.find((player) => player.id === from.ball.owner);
		const body = getPlayerGeometry(owner, pixelScale);
		offset.x = (body.x - owner.x) / size;
		offset.y = (body.y - owner.y) / size;
		offset.z = owner.jump * 1.4;
	}
	const dribble = !flight && ball.owner && ball.dribble ? Math.abs(Math.sin(frame.time * 12)) * 0.4 : 0;
	return {
		x: ball.x + offset.x * size,
		y: ball.y - ball.z * BALL_HEIGHT_SCALE + offset.y * size + offset.z * BALL_HEIGHT_SCALE - dribble,
		radius: Math.max(0.65, 3.2 / pixelScale),
		groundX: ball.x + offset.x * size,
		groundY: ball.y,
		index,
		fraction,
	};
}
