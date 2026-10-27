// Preserve event anchors while giving connecting routes individual timing and momentum.
function tangent(frames, index, playerIndex, axis) {
	if (index <= 0 || index >= frames.length - 1) {
		return 0;
	}
	const before = frames[index - 1];
	const current = frames[index];
	const after = frames[index + 1];
	const a = (current.players[playerIndex][axis] - before.players[playerIndex][axis]) /
		(current.time - before.time || 1);
	const b = (after.players[playerIndex][axis] - current.players[playerIndex][axis]) /
		(after.time - current.time || 1);
	// Stop at reversals and holds; the harmonic mean prevents overshooting anchors.
	return a * b > 0 ? 2 * a * b / (a + b) : 0;
}

function curveCoordinate(start, end, velocityStart, velocityEnd, u, duration) {
	const delta = end - start;
	const limit = 2 * Math.abs(delta);
	const m0 = Math.sign(velocityStart) === Math.sign(delta)
		? Math.sign(delta) * Math.min(limit, Math.abs(velocityStart) * duration) : 0;
	const m1 = Math.sign(velocityEnd) === Math.sign(delta)
		? Math.sign(delta) * Math.min(limit, Math.abs(velocityEnd) * duration) : 0;
	return (2 * u ** 3 - 3 * u ** 2 + 1) * start + (u ** 3 - 2 * u ** 2 + u) * m0 +
		(-2 * u ** 3 + 3 * u ** 2) * end + (u ** 3 - u ** 2) * m1;
}

export function movePlayers(scene, index, fraction, players) {
	const frames = scene.frames;
	const from = frames[index];
	const to = frames[index + 1] ?? from;
	const duration = to.time - from.time;
	const local = from.time + fraction * duration;
	if (scene.driveAt !== undefined && from.time >= scene.driveAt - 1e-8 && to.time <= scene.gatherAt + 1e-8) {
		// Drive samples already encode continuous travel; avoid stopping at every sampled frame.
		return players.map((player, i) => ({
			...player,
			x: from.players[i].x + (to.players[i].x - from.players[i].x) * fraction,
			y: from.players[i].y + (to.players[i].y - from.players[i].y) * fraction,
		}));
	}
	const connecting = duration >= 0.25 &&
		(scene.buildupMoves?.some((move) => from.time >= move.start - 1e-8 && to.time <= move.end + 1e-8) ||
			(scene.preparationAt !== undefined && from.time >= scene.preparationAt &&
				to.time <= scene.preparationAt + scene.preparationWait));
	if (!connecting || fraction === 0 || fraction === 1) {
		return players;
	}
	const transition = scene.transitionRuns?.find((run) => from.time >= run.start - 1e-8 && to.time <= run.end + 1e-8);
	const protectedIds = new Set([scene.action.personId, scene.action.assistPersonId, from.ball.owner, to.ball.owner]);
	const evaluate = (i, progress) => {
		const start = from.players[i];
		const end = to.players[i];
		const defender = Object.hasOwn(scene.matchups ?? {}, start.id);
		const stationaryStart = Math.hypot(tangent(frames, index, i, "x"), tangent(frames, index, i, "y")) < 0.01;
		const stationaryEnd = Math.hypot(tangent(frames, index + 1, i, "x"), tangent(frames, index + 1, i, "y")) < 0.01;
		const delay = stationaryStart ? Math.min(0.22, duration * 0.16) * (defender ? 1 : 0.2 + (i % 5) * 0.12) : 0;
		const early = stationaryEnd && !protectedIds.has(start.id) ? Math.min(0.15, duration * 0.1) * (i % 3) / 2 : 0;
		const active = duration - delay - early;
		const u = Math.max(0, Math.min(1, (progress * duration - delay) / active));
		const result = {};
		for (const axis of ["x", "y"]) {
			const m0 = tangent(frames, index, i, axis) * active;
			const m1 = tangent(frames, index + 1, i, axis) * active;
			result[axis] = (2 * u ** 3 - 3 * u ** 2 + 1) * start[axis] +
				(u ** 3 - 2 * u ** 2 + u) * m0 + (-2 * u ** 3 + 3 * u ** 2) * end[axis] +
				(u ** 3 - u ** 2) * m1;
		}
		// On long advances wings fill wide lanes; interior players trail toward the paint.
		const distance = Math.hypot(end.x - start.x, end.y - start.y);
		if (distance > 22 && !protectedIds.has(start.id)) {
			const lane = end.y < 25 ? 9 : 41;
			result.y += Math.max(-5, Math.min(5, lane - result.y)) * 16 * u ** 2 * (1 - u) ** 2;
		}
		if (!transition && scene.hoop && distance >= 3) {
			const hoop = scene.hoop;
			const ax = start.x - hoop.x;
			const ay = start.y - hoop.y;
			const bx = end.x - hoop.x;
			const by = end.y - hoop.y;
			const r0 = Math.hypot(ax, ay);
			const r1 = Math.hypot(bx, by);
			const angle0 = Math.atan2(ay, ax);
			const angle1 = Math.atan2(by, bx);
			const turn = Math.atan2(Math.sin(angle1 - angle0), Math.cos(angle1 - angle0));
			const inFront = hoop.x > 47 ? ax < -3 && bx < -3 : ax > 3 && bx > 3;
			const onCourt = start.y >= 2 && start.y <= 48 && end.y >= 2 && end.y <= 48;
			// Relocate around the basket, rather than cutting the chord through the paint.
			// Include receivers and ball handlers: protection reserves event anchors, not straight routes.
			if (inFront && onCourt && r0 >= 18 && r0 <= 34 && r1 >= 18 && r1 <= 34 &&
				Math.abs(r1 - r0) <= 8 && Math.abs(turn) >= 0.12 && Math.abs(turn) <= 1.4) {
				const vx0 = tangent(frames, index, i, "x");
				const vy0 = tangent(frames, index, i, "y");
				const vx1 = tangent(frames, index + 1, i, "x");
				const vy1 = tangent(frames, index + 1, i, "y");
				const radius = curveCoordinate(r0, r1,
					(ax * vx0 + ay * vy0) / r0, (bx * vx1 + by * vy1) / r1, u, active);
				const angle = curveCoordinate(angle0, angle0 + turn,
					(ax * vy0 - ay * vx0) / r0 ** 2, (bx * vy1 - by * vx1) / r1 ** 2, u, active);
				result.x = hoop.x + Math.cos(angle) * radius;
				result.y = Math.max(2, Math.min(48, hoop.y + Math.sin(angle) * radius));
			} else if (distance <= 22 && r0 < 13 && r1 < 13 && !protectedIds.has(start.id) && !defender) {
				// Short interior relocations leave room in the middle of the driving lane.
				result.y += (result.y < 25 ? -1 : 1) * 16 * u ** 2 * (1 - u) ** 2;
			}
		}
		return { ...players[i], ...result };
	};
	const moving = players.map((_, i) => evaluate(i, fraction));
	// Follow the attacker's recent movement, with endpoint correction for the planned matchup.
	const weight = 16 * fraction ** 2 * (1 - fraction) ** 2;
	for (const [defenderId, attackerId] of Object.entries(scene.matchups ?? {})) {
		const d = moving.findIndex((player) => player.id === Number(defenderId));
		const a = moving.findIndex((player) => player.id === attackerId);
		if (transition || d < 0 || a < 0 || protectedIds.has(Number(defenderId))) {
			continue;
		}
		const recent = evaluate(a, Math.max(0, fraction - Math.min(0.16, duration * 0.12) / duration));
		const begin = from.players[d];
		const end = to.players[d];
		for (const axis of ["x", "y"]) {
			const offset = (begin[axis] - from.players[a][axis]) * (1 - fraction) +
				(end[axis] - to.players[a][axis]) * fraction;
			const correction = Math.max(-2, Math.min(2, recent[axis] + offset - moving[d][axis]));
			moving[d][axis] += correction * weight * 0.65;
		}
	}
	const future = players.map((_, i) => evaluate(i, Math.min(1, fraction + 0.18 / duration)));
	const ramp = Math.min(1, (local - from.time) / 0.22, (to.time - local) / 0.22);
	const envelope = ramp * ramp * (3 - 2 * ramp);
	for (let i = 0; i < moving.length; i++) {
		if (moving[i].opacity < 0.99 || protectedIds.has(moving[i].id)) {
			continue;
		}
		let offsetX = 0;
		let offsetY = 0;
		for (let j = 0; j < moving.length; j++) {
			if (i === j || moving[j].opacity < 0.99) {
				continue;
			}
			const dx = future[i].x - future[j].x;
			const dy = future[i].y - future[j].y;
			const distance = Math.min(Math.hypot(dx, dy),
				Math.hypot(moving[i].x - moving[j].x, moving[i].y - moving[j].y));
			if (distance >= 3.2) {
				continue;
			}
			const vx = to.players[i].x - from.players[i].x;
			const vy = to.players[i].y - from.players[i].y;
			const length = Math.hypot(vx, vy);
			// Give way sideways rather than pushing a player backwards along the route.
			const side = Math.sign((from.players[i].x - from.players[j].x) * -vy +
				(from.players[i].y - from.players[j].y) * vx) || (moving[i].id < moving[j].id ? -1 : 1);
			const strength = (3.2 - distance) * (protectedIds.has(moving[j].id) ? 1 : 0.5);
			offsetX += (length > 0.1 ? -vy / length * side : dx / (distance || 1)) * strength;
			offsetY += (length > 0.1 ? vx / length * side : dy / (distance || 1)) * strength;
		}
		const scale = Math.min(1, 2 / (Math.hypot(offsetX, offsetY) || 1)) * envelope ** 2;
		moving[i].x += offsetX * scale;
		moving[i].y += offsetY * scale;
		// Keep sidelines valid, including genuine inbound positions outside the court.
		for (const [axis, lower, upper] of [["x", 1, 93], ["y", 2, 48]]) {
			moving[i][axis] = Math.max(
				Math.min(lower, from.players[i][axis], to.players[i][axis]),
				Math.min(Math.max(upper, from.players[i][axis], to.players[i][axis]), moving[i][axis]),
			);
		}
	}
	return moving;
}
