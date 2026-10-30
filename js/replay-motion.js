const ROUTES = new WeakMap();

// Carry speed through aligned waypoints, but brake before a cut, reversal or hold.
function anchorSpeed(frames, index, playerIndex) {
	if (index <= 0 || index >= frames.length - 1) {
		return 0;
	}
	const before = frames[index - 1];
	const current = frames[index];
	const after = frames[index + 1];
	const a = current.players[playerIndex];
	const dx0 = a.x - before.players[playerIndex].x;
	const dy0 = a.y - before.players[playerIndex].y;
	const dx1 = after.players[playerIndex].x - a.x;
	const dy1 = after.players[playerIndex].y - a.y;
	const d0 = Math.hypot(dx0, dy0);
	const d1 = Math.hypot(dx1, dy1);
	if (d0 < 0.01 || d1 < 0.01 || (dx0 * dx1 + dy0 * dy1) / (d0 * d1) < 0.85) {
		return 0;
	}
	const v0 = d0 / (current.time - before.time);
	const v1 = d1 / (after.time - current.time);
	return 2 * v0 * v1 / (v0 + v1);
}

function routePoint(route, u) {
	const { from, to } = route;
	if (route.arc) {
		const { hoop, radius, radiusEnd, angle, turn } = route.arc;
		const r = radius + (radiusEnd - radius) * u;
		return { x: hoop.x + Math.cos(angle + turn * u) * r, y: hoop.y + Math.sin(angle + turn * u) * r };
	}
	const bend = 2 * u * (1 - u) * route.bend;
	return {
		x: from.x + (to.x - from.x) * u - route.dy * bend,
		y: from.y + (to.y - from.y) * u + route.dx * bend,
	};
}

function routeProgress(route, fraction, duration) {
	const u = Math.max(0, Math.min(1, (fraction * duration - route.delay) / (duration - route.delay)));
	const active = duration - route.delay;
	const m0 = Math.min(1.5, route.speedStart * active / (route.length || 1));
	const m1 = Math.min(1.5, route.speedEnd * active / (route.length || 1));
	return (u ** 3 - 2 * u ** 2 + u) * m0 + (-2 * u ** 3 + 3 * u ** 2) + (u ** 3 - u ** 2) * m1;
}

function planRoutes(scene, index) {
	const frames = scene.frames;
	const from = frames[index];
	const to = frames[index + 1];
	const duration = to.time - from.time;
	const transition = scene.transitionRuns?.some((run) => from.time >= run.start - 1e-8 && to.time <= run.end + 1e-8);
	const priority = new Set([scene.action.personId, scene.action.assistPersonId, from.ball.owner, to.ball.owner]);
	const routes = from.players.map((player, i) => {
		const end = to.players[i];
		const length = Math.hypot(end.x - player.x, end.y - player.y);
		const defender = Object.hasOwn(scene.matchups ?? {}, player.id);
		const speedStart = anchorSpeed(frames, index, i);
		const speedEnd = anchorSpeed(frames, index + 1, i);
		const route = {
			from: player, to: end, length, bend: 0,
			dx: (end.x - player.x) / (length || 1), dy: (end.y - player.y) / (length || 1),
			speedStart, speedEnd,
			delay: speedStart > 0 || length < 0.1 ? 0 : Math.min(duration * 0.16, defender ? 0.22 : 0.04 + i % 5 * 0.025),
		};
		const hoop = scene.hoop;
		if (!transition && hoop && length >= 3) {
			const ax = player.x - hoop.x;
			const ay = player.y - hoop.y;
			const bx = end.x - hoop.x;
			const by = end.y - hoop.y;
			const radius = Math.hypot(ax, ay);
			const radiusEnd = Math.hypot(bx, by);
			const angle = Math.atan2(ay, ax);
			const turn = Math.atan2(Math.sin(Math.atan2(by, bx) - angle), Math.cos(Math.atan2(by, bx) - angle));
			const inFront = hoop.x > 47 ? ax < -3 && bx < -3 : ax > 3 && bx > 3;
			if (inFront && player.y >= 2 && player.y <= 48 && end.y >= 2 && end.y <= 48 &&
				radius >= 18 && radius <= 34 && radiusEnd >= 18 && radiusEnd <= 34 &&
				Math.abs(radiusEnd - radius) <= 8 && Math.abs(turn) >= 0.12 && Math.abs(turn) <= 1.4) {
				route.arc = { hoop, radius, radiusEnd, angle, turn };
				route.length = Math.hypot((radius + radiusEnd) / 2 * turn, radiusEnd - radius);
			}
		}
		return route;
	});
	// Reserve routes in priority order. A single planned bow replaces frame-by-frame repulsion.
	const ordered = routes.map((_, i) => i).sort((a, b) =>
		Number(priority.has(from.players[b].id)) - Number(priority.has(from.players[a].id)) || a - b
	);
	const reserved = [];
	for (const i of ordered) {
		const route = routes[i];
		if (route.length < 0.1 || route.from.opacity < 0.99 || route.to.opacity < 0.99) {
			reserved.push(i);
			continue;
		}
		const obstacles = routes.map((other, j) => j !== i && (reserved.includes(j) || other.length < 0.1) ? j : -1)
			.filter((j) => j >= 0 && routes[j].from.opacity >= 0.99 && routes[j].to.opacity >= 0.99 &&
				scene.matchups?.[route.from.id] !== routes[j].from.id &&
				scene.matchups?.[routes[j].from.id] !== route.from.id);
		const cost = () => {
			let penalty = Math.abs(route.bend) * 0.08 + route.delay * 0.4;
			for (let step = 1; step < 16; step++) {
				const fraction = step / 16;
				const point = routePoint(route, routeProgress(route, fraction, duration));
				if (point.x < Math.min(1, route.from.x, route.to.x) || point.x > Math.max(93, route.from.x, route.to.x) ||
					point.y < Math.min(2, route.from.y, route.to.y) || point.y > Math.max(48, route.from.y, route.to.y)) {
					return Infinity;
				}
				for (const j of obstacles) {
					const other = routes[j];
					const q = routePoint(other, routeProgress(other, fraction, duration));
					// Contact at recorded anchors is intentional and cannot be solved by invented motion.
					const clearance = Math.min(3, Math.hypot(route.from.x - other.from.x, route.from.y - other.from.y),
						Math.hypot(route.to.x - other.to.x, route.to.y - other.to.y));
					penalty += Math.max(0, clearance - Math.hypot(point.x - q.x, point.y - q.y)) ** 2;
				}
			}
			return penalty;
		};
		let bestCost = cost();
		let bestBend = 0;
		let bestDelay = route.delay;
		// Curves keep their geometry; conflicts on the perimeter are resolved by yielding.
		const bends = route.arc || route.speedStart || route.speedEnd
			? [0] : [0, Math.min(4, route.length * 0.35), -Math.min(4, route.length * 0.35),
				Math.min(8, route.length * 0.65), -Math.min(8, route.length * 0.65)];
		const originalDelay = route.delay;
		for (const bend of bends) {
			for (const delay of [originalDelay, Math.min(duration * 0.25, originalDelay + 0.35)]) {
				route.bend = bend;
				route.delay = delay;
				const candidate = cost();
				if (candidate < bestCost) {
					bestCost = candidate;
					bestBend = bend;
					bestDelay = delay;
				}
			}
		}
		route.bend = bestBend;
		route.delay = bestDelay;
		reserved.push(i);
	}
	return routes;
}

function moveRoutes(scene, index, fraction, players) {
	const from = scene.frames[index];
	const to = scene.frames[index + 1] ?? from;
	const duration = to.time - from.time;
	const steal = scene.stealPlan;
	if ((steal && from.time >= steal.approachAt - 1e-8 && to.time <= steal.catchAt + 1e-8) ||
		(scene.driveAt !== undefined && from.time >= scene.driveAt - 1e-8 && to.time <= scene.gatherAt + 1e-8)) {
		return players.map((player, i) => !steal || player.id === steal.stealerId ? {
			...player,
			x: from.players[i].x + (to.players[i].x - from.players[i].x) * fraction,
			y: from.players[i].y + (to.players[i].y - from.players[i].y) * fraction,
		} : player);
	}
	const connecting = duration >= 0.25 &&
		(scene.buildupMoves?.some((move) => from.time >= move.start - 1e-8 && to.time <= move.end + 1e-8) ||
			(scene.preparationAt !== undefined && from.time >= scene.preparationAt &&
				to.time <= scene.preparationAt + scene.preparationWait));
	if (!connecting || fraction === 0 || fraction === 1) {
		return players;
	}
	let intervals = ROUTES.get(scene);
	if (!intervals) {
		intervals = new Map();
		ROUTES.set(scene, intervals);
	}
	if (!intervals.has(index)) {
		intervals.set(index, planRoutes(scene, index));
	}
	return players.map((player, i) => ({
		...player,
		...routePoint(intervals.get(index)[i], routeProgress(intervals.get(index)[i], fraction, duration)),
	}));
}

export function movePlayers(scene, index, fraction, players) {
	players = moveRoutes(scene, index, fraction, players);
	const from = scene.frames[index];
	const to = scene.frames[index + 1] ?? from;
	const time = from.time + (to.time - from.time) * fraction;
	// Preserve a single speed profile across setup/catch snapshots, including the final hold.
	for (const move of [scene.reboundMove, scene.reboundRun, ...scene.laneExits ?? []]) {
		if (!move || move.startAt === null) {
			continue;
		}
		const end = move === scene.reboundMove ? scene.releaseAt : move.startAt + move.duration;
		if (time < move.startAt || time > end) {
			continue;
		}
		const u = Math.max(0, Math.min(1, (time - move.startAt) / move.duration));
		const progress = u * u * (3 - 2 * u);
		players = players.map((player) =>
			player.id === move.id
				? {
					...player,
					x: move.from.x + (move.x - move.from.x) * progress,
					y: move.from.y + (move.y - move.from.y) * progress,
				}
				: player
		);
	}
	return players;
}
