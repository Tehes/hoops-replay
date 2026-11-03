import { getPlayerRole } from "./replay-profiles.js";
import { isInOffensiveLane } from "./replay-rules.js";

const STEP = 0.1;

function distance(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function interpolate(a, b, fraction) {
	return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
}

function segmentDistance(point, from, to) {
	const length = distance(from, to);
	const fraction = Math.max(
		0,
		Math.min(1, ((point.x - from.x) * (to.x - from.x) + (point.y - from.y) * (to.y - from.y)) / (length ** 2 || 1)),
	);
	return distance(point, interpolate(from, to, fraction));
}

function inside(point, direction) {
	return point.x >= 2 && point.x <= 92 && point.y >= 3 && point.y <= 47 &&
		(point.x - 47) * direction >= 5;
}

// WABC Level 1, Team 2.1.4–2.1.5 and 2.2: compare actions and defensive answers together.
export function getOffensiveActions(context) {
	const {
		positions,
		lineup,
		matchups,
		owner,
		shooter,
		assister,
		hoop,
		direction,
		finish,
		available,
		protectedIds,
		players,
		movingFinish,
	} = context;
	if (!owner || available < 2 || protectedIds.includes(owner) || protectedIds.includes(shooter)) {
		return [];
	}
	const defenderIds = Object.keys(matchups).map(Number);
	const guardOf = (id) => defenderIds.find((defender) => matchups[defender] === id);
	const roles = Object.fromEntries(
		lineup.map((id) => [id, getPlayerRole(players.find((player) => player.id === id))]),
	);
	const free = lineup.filter((id) => !protectedIds.includes(id));
	const passers = assister ? [assister] : free.filter((id) => id !== shooter);
	const candidates = [];
	const create = (kind, participants) => ({
		kind,
		participants: [...new Set(participants)],
		phases: [],
		points: structuredClone(positions),
		holder: owner,
	});
	const move = (candidate, kind, targets, options = {}) => {
		const length = Math.max(
			0,
			...Object.entries(targets).map(([id, point]) => distance(candidate.points[id], point)),
		);
		const duration = Math.max(options.hold ?? 0.2, length * 1.5 / 10);
		candidate.phases.push({ kind, duration, targets, ...options });
		Object.entries(targets).forEach(([id, point]) => candidate.points[id] = { ...point });
	};
	const pass = (candidate, to, targets = {}) => {
		if (candidate.holder === to) {
			return;
		}
		const from = candidate.holder;
		const point = targets[to] ?? candidate.points[to];
		const duration = Math.max(
			0.35,
			distance(candidate.points[from], point) / 45,
			...Object.entries(targets).map(([id, target]) => distance(candidate.points[id], target) * 1.5 / 10),
		);
		candidate.phases.push({ kind: "pass", from, to, duration, targets });
		Object.entries(targets).forEach(([id, target]) => candidate.points[id] = { ...target });
		candidate.holder = to;
	};
	const finishPass = (candidate, passer) => {
		pass(candidate, passer);
		// Reach the recorded release area before a short, shooter's catch.
		move(candidate, "receive", { [shooter]: finish }, { hold: 0.15 });
		pass(candidate, shooter);
		candidates.push(candidate);
	};

	for (const passer of passers.filter((id) => free.includes(id))) {
		if (movingFinish) {
			continue;
		}
		const direct = create((positions[owner].y - 25) * (finish.y - 25) < 0 ? "ball-reversal" : "catch-and-shoot", [
			passer,
			shooter,
		]);
		finishPass(direct, passer);
		for (const relay of free.filter((id) => id !== shooter && id !== passer && id !== owner)) {
			const extra = create("extra-pass", [relay, passer, shooter]);
			pass(extra, relay);
			pass(extra, passer);
			finishPass(extra, passer);
		}
		// A drive is a threat toward the rim; the help decision is evaluated during simulation.
		for (const lateral of [-9, -3, 3, 9]) {
			const drive = create("drive-kick", [passer, shooter]);
			pass(drive, passer);
			const origin = drive.points[passer];
			const length = distance(origin, hoop);
			if (length < 15 || length > 35 || roles[passer].handling < 0.25) {
				continue;
			}
			const gap = { x: origin.x - direction, y: Math.max(4, Math.min(46, origin.y + Math.sign(lateral) * 6)) };
			move(drive, "attack-gap", { [passer]: gap });
			const target = interpolate(hoop, gap, 15 / distance(gap, hoop));
			target.y = Math.max(9, Math.min(41, target.y + lateral));
			move(drive, "penetrate", { [passer]: target, [shooter]: finish }, { drive: passer });
			pass(drive, shooter);
			candidates.push(drive);
		}
		// Relocation changes the receiving angle while the ball draws the defender's attention.
		for (const side of [-1, 1]) {
			const relocate = create("relocation", [passer, shooter]);
			const start = { x: finish.x - direction * 3, y: Math.max(3, Math.min(47, finish.y + side * 6)) };
			move(relocate, "lift", { [shooter]: start });
			pass(relocate, passer);
			move(relocate, "relocate", { [shooter]: finish }, { hold: 0.2 });
			pass(relocate, shooter);
			candidates.push(relocate);
		}
		for (const screener of free.filter((id) => id !== passer && id !== shooter && id !== owner)) {
			const screen = create("off-ball-screen", [passer, shooter, screener]);
			pass(screen, passer);
			let origin = screen.points[shooter];
			if (distance(origin, finish) < 4) {
				const side = finish.y < 25 ? 1 : -1;
				origin = { x: finish.x - direction * 2, y: finish.y + side * 8 };
				move(screen, "prepare-cut", { [shooter]: origin });
			}
			const middle = interpolate(origin, finish, 0.5);
			const guard = screen.points[guardOf(shooter)];
			const screenPoint = interpolate(middle, guard, Math.min(1, 2.2 / (distance(middle, guard) || 1)));
			if (distance(screenPoint, middle) < 1.7) {
				continue;
			}
			move(screen, "set-screen", { [screener]: screenPoint }, { hold: 0.35 });
			move(screen, "screen-set", {}, { hold: 0.35 });
			move(screen, "use-screen", { [shooter]: middle }, { screen: screener, user: shooter });
			move(screen, "separate", { [shooter]: finish }, { screen: screener, user: shooter });
			pass(screen, shooter);
			candidates.push(screen);
		}
	}

	// A ball screen may free the handler, the roller/popper, or a weak-side shooter through help.
	for (
		const handler of free.filter((id) =>
			(roles[id].handling >= 0.25 && id !== shooter) ||
			(id === shooter && id === owner && !assister)
		)
	) {
		for (
			const screener of free.filter((id) =>
				id !== handler && id !== owner &&
				(id !== shooter || !assister || assister === handler)
			)
		) {
			if (assister && handler !== assister && screener === shooter) {
				continue;
			}
			for (const side of [-1, 1]) {
				const kind = screener === shooter ? movingFinish ? "pick-and-roll" : "pick-and-pop" : "pick-and-roll";
				if (movingFinish && screener !== shooter && handler !== shooter) {
					continue;
				}
				const candidate = create(kind, [handler, screener, shooter]);
				pass(candidate, handler);
				const origin = candidate.points[handler];
				if (distance(origin, hoop) < 19 || distance(origin, hoop) > 35) {
					continue;
				}
				const set = { x: origin.x + direction * 2.5, y: origin.y + side * 3.5 };
				const turn = { x: origin.x - direction * 0.5, y: set.y + side * 2.5 };
				const drive = { x: Math.min(hoop.x * direction - 15, origin.x * direction + 6) * direction, y: turn.y };
				const roll = screener === shooter ? finish : {
					x: hoop.x - direction * 9,
					y: 25 + side * 9.5,
				};
				move(candidate, "set-screen", { [screener]: set }, { hold: 0.35 });
				move(candidate, "screen-set", {}, { hold: 0.35 });
				move(candidate, "turn-corner", { [handler]: turn }, { screen: screener, user: handler });
				move(candidate, "penetrate", { [handler]: handler === shooter ? finish : drive }, {
					screen: screener,
					user: handler,
					drive: handler,
				});
				if (context.rimFinish && screener === shooter) {
					const entry = interpolate(
						roll,
						candidate.points[screener],
						5 / (distance(roll, candidate.points[screener]) || 1),
					);
					move(candidate, "roll-or-pop", { [screener]: entry }, { drive: handler, finishing: shooter });
					pass(candidate, shooter, { [shooter]: finish });
				} else {
					move(candidate, "roll-or-pop", {
						[screener]: roll,
						...(shooter !== handler && shooter !== screener ? { [shooter]: finish } : {}),
					}, { drive: handler });
				}
				if (assister && candidate.holder !== assister && candidate.holder !== shooter) {
					pass(candidate, assister);
				}
				pass(candidate, shooter);
				candidates.push(candidate);
			}
		}
	}
	const responses = candidates.flatMap((candidate) =>
		candidate.phases.some((phase) => phase.screen)
			? ["trail", "switch", "drop"].map((coverage) => ({ ...candidate, coverage }))
			: [{ ...candidate, coverage: "help-and-recover" }]
	);
	const evaluated = responses.map((candidate) => evaluateAction(context, candidate))
		.filter(Boolean).sort((a, b) => Math.round((a.cost - b.cost) * 1e6));
	return evaluated;
}

export function planOffensiveAction(context) {
	const evaluated = getOffensiveActions(context);
	if (!evaluated.length) {
		return null;
	}
	// Geometry and reception quality dominate; a small preference avoids identical possessions.
	const close = evaluated.filter((candidate) => candidate.cost <= evaluated[0].cost + 1.5);
	const kinds = [...new Set(close.map((candidate) => candidate.kind))];
	const preferred = kinds[context.variation % kinds.length];
	const selected = close.find((candidate) => candidate.kind === preferred);
	return {
		...selected,
		candidates: evaluated.length,
		alternatives: evaluated.map(({ kind, coverage, cost, catchSpace, releaseSpace }) => ({
			kind,
			coverage,
			cost,
			catchSpace,
			releaseSpace,
		})),
	};
}

function evaluateAction(context, candidate) {
	const { positions, lineup, owner, shooter, assister, hoop, direction, available, protectedIds, forecast } = context;
	const matchups = { ...context.matchups };
	const total = candidate.phases.reduce((sum, phase) => sum + phase.duration, 0);
	if (total > available || candidate.participants.some((id) => protectedIds.includes(id))) {
		return null;
	}
	const points = structuredClone(positions);
	const defenderIds = Object.keys(matchups).map(Number);
	let holder = owner;
	let time = 0;
	let cost = total * 0.12;
	let helper = null;
	let helpUntil = 0;
	let screenUsed = false;
	let switched = false;
	let switchAt = null;
	let catchSpace = 0;
	let finalPasser = null;
	const samples = [];
	const phases = [];
	const passes = [];
	let travel = 0;
	const laneTime = Object.fromEntries(lineup.map((id) => [id, 0]));
	const scheduled = available - total > 0.01
		? [{ kind: "read", duration: available - total, targets: {} }, ...candidate.phases]
		: candidate.phases;
	for (const phase of scheduled) {
		if (phase.screen && candidate.coverage === "switch" && !switched) {
			const first = Number(Object.keys(matchups).find((id) => matchups[id] === phase.user));
			const second = Number(Object.keys(matchups).find((id) => matchups[id] === phase.screen));
			if (distance(points[first], points[second]) > 9) {
				return null;
			}
			matchups[first] = phase.screen;
			matchups[second] = phase.user;
			switched = true;
			switchAt = time;
		}
		const detours = {};
		const starts = structuredClone(points);
		const phaseStart = time;
		const ballFrom = phase.from ? { ...points[phase.from] } : null;
		const receiver = phase.to ? phase.targets[phase.to] ?? points[phase.to] : null;
		const ballTo = receiver ? { ...receiver } : null;
		const flightLength = phase.from ? distance(ballFrom, ballTo) : 0;
		const flightCurve = phase.from
			? [0, 2.5 * direction, -2.5 * direction].map((curve) => {
				let cost = Math.abs(curve) * 0.1;
				for (const u of [0.25, 0.5, 0.75]) {
					const point = interpolate(ballFrom, ballTo, u);
					point.x -= (ballTo.y - ballFrom.y) / (flightLength || 1) * Math.sin(u * Math.PI) * curve;
					point.y += (ballTo.x - ballFrom.x) / (flightLength || 1) * Math.sin(u * Math.PI) * curve;
					cost += defenderIds.reduce((sum, id) => sum + Math.max(0, 3 - distance(points[id], point)) ** 2, 0);
				}
				return { curve, cost };
			}).sort((a, b) => Math.round((a.cost - b.cost) * 1e6))[0].curve
			: 0;
		const releaseDelay = phase.from ? 0.01 : 0;
		if (phase.from) {
			time += releaseDelay;
			for (const id of protectedIds) {
				points[id] = { ...forecast(id, time) };
			}
			samples.push({
				time,
				positions: structuredClone(points),
				ball: { x: ballFrom.x + 1, y: ballFrom.y + 0.8, z: 0.5, owner: null, flight: true, dribble: false },
			});
		}
		const steps = Math.ceil((phase.duration - releaseDelay) / STEP);
		const dt = (phase.duration - releaseDelay) / steps;
		for (let step = 1; step <= steps; step++) {
			const u = (releaseDelay + step * dt) / phase.duration;
			const smooth = u * u * (3 - 2 * u);
			time += dt;
			for (const id of protectedIds) {
				points[id] = { ...forecast(id, time) };
			}
			for (const [id, target] of Object.entries(phase.targets)) {
				if (!inside(target, direction)) {
					return null;
				}
				points[id] = interpolate(starts[id], target, smooth);
			}
			for (const id of lineup) {
				laneTime[id] = isInOffensiveLane(points[id], direction)
					? laneTime[id] + dt * (context.clockScale ?? 1)
					: 0;
				if (laneTime[id] > 2.5) {
					return null;
				}
			}
			const ball = phase.from ? interpolate(ballFrom, ballTo, u) : points[holder];
			if (phase.from) {
				ball.x -= (ballTo.y - ballFrom.y) / (flightLength || 1) * Math.sin(u * Math.PI) * flightCurve;
				ball.y += (ballTo.x - ballFrom.x) / (flightLength || 1) * Math.sin(u * Math.PI) * flightCurve;
			}
			const drive = phase.drive &&
				distance(points[phase.drive], hoop) < (candidate.kind.startsWith("pick-and-") ? 24 : 20);
			if (drive) {
				const eligible = defenderIds.filter((id) =>
					matchups[id] !== phase.drive && !protectedIds.includes(matchups[id])
				);
				const nearest = eligible.sort((a, b) => distance(points[a], ball) - distance(points[b], ball))[0];
				if (nearest && distance(points[nearest], ball) < 15) {
					helper = nearest;
					helpUntil = time + 0.35;
				}
			}
			for (const id of defenderIds) {
				const attacker = matchups[id];
				const target = points[attacker];
				const onBall = attacker === (phase.to ?? holder);
				const length = distance(target, hoop) || 1;
				let desired = interpolate(target, hoop, (onBall ? 3.2 : 3.8) / length);
				if (!onBall) {
					desired = interpolate(
						desired,
						ball,
						Math.min(protectedIds.includes(attacker) ? 0.13 : 0.22, 6 / (distance(desired, ball) || 1)),
					);
				}
				if (
					phase.screen && candidate.coverage !== "switch" && attacker === phase.screen &&
					phase.user === holder &&
					distance(points[id], points[holder]) < 12
				) {
					helper = id;
					helpUntil = time + 0.35;
				}
				if (id === helper && time <= helpUntil) {
					desired = interpolate(ball, hoop, 2.5 / (distance(ball, hoop) || 1));
					const side = Math.sign(target.y - ball.y) || 1;
					desired.y += side * 3;
				}
				// The screener must already be stationary. The defender goes around the occupied space.
				if (candidate.coverage === "drop" && phase.screen && attacker === phase.screen) {
					desired = interpolate(points[phase.user], hoop, 0.5);
				}
				if (
					phase.screen && candidate.coverage !== "switch" && attacker === phase.user &&
					segmentDistance(points[phase.screen], points[id], desired) < 2.4
				) {
					const screen = points[phase.screen];
					const dx = desired.x - points[id].x;
					const dy = desired.y - points[id].y;
					const length = Math.hypot(dx, dy) || 1;
					const options = [-1, 1].map((side) => ({
						x: screen.x - dy / length * side * direction * 3,
						y: screen.y + dx / length * side * direction * 3,
					}));
					desired = options.sort((a, b) =>
						distance(points[id], a) + distance(a, desired) -
						distance(points[id], b) - distance(b, desired)
					)[0];
					screenUsed = true;
				}
				const separation = distance(desired, target);
				if (separation < 2.8) {
					desired = interpolate(
						target,
						separation > 0.01 ? desired : hoop,
						2.8 / (separation > 0.01 ? separation : distance(target, hoop)),
					);
				}
				if (detours[id] && distance(points[id], detours[id]) < 0.8) {
					delete detours[id];
				}
				if (!detours[id]) {
					const obstacle = lineup.find((other) =>
						!phase.targets[other] &&
						segmentDistance(points[other], points[id], desired) < 1.8
					);
					if (obstacle) {
						const center = points[obstacle];
						const length = distance(points[id], desired) || 1;
						const dx = (desired.x - points[id].x) / length;
						const dy = (desired.y - points[id].y) / length;
						const options = [-1, 1].map((side) => ({
							x: center.x - dy * side * direction * 2.8,
							y: center.y + dx * side * direction * 2.8,
						}));
						detours[id] = options.sort((a, b) =>
							distance(points[id], a) + distance(a, desired) -
							distance(points[id], b) - distance(b, desired)
						)[0];
					}
				}
				if (detours[id]) {
					desired = detours[id];
				}
				const reacting = !phase.from || matchups[id] !== phase.to || time - phaseStart > 0.18;
				const fraction = reacting
					? Math.min(1 - Math.exp(-dt / 0.3), dt * 13 / (distance(points[id], desired) || 1))
					: 0;
				points[id] = interpolate(points[id], desired, fraction);
				points[id].x = Math.max(1, Math.min(93, points[id].x));
				points[id].y = Math.max(2, Math.min(48, points[id].y));
			}
			for (const attacker of lineup) {
				for (const defender of defenderIds) {
					const clearance = Math.min(1.5, distance(positions[attacker], positions[defender]));
					if (distance(points[attacker], points[defender]) < clearance - 0.05) {
						return null;
					}
				}
			}
			for (let i = 0; i < lineup.length; i++) {
				for (let j = i + 1; j < lineup.length; j++) {
					const a = lineup[i];
					const b = lineup[j];
					const clearance = Math.min(2, distance(positions[a], positions[b]));
					if (distance(points[a], points[b]) < clearance - 0.05) {
						return null;
					}
				}
			}
			if (phase.from && u > 0.15 && u < 0.85 && defenderIds.some((id) => distance(points[id], ball) < 1.8)) {
				return null;
			}
			samples.push({
				time,
				positions: structuredClone(points),
				ball: phase.from
					? {
						x: ball.x + 1,
						y: ball.y + 0.8,
						z: 0.5 + 4 * 0.6 * u * (1 - u),
						owner: null,
						flight: true,
						dribble: false,
					}
					: { owner: holder, dribble: Boolean(phase.drive || phase.user === holder) },
			});
		}
		travel += Object.entries(phase.targets).reduce((sum, [id, point]) => sum + distance(starts[id], point), 0);
		if (phase.to) {
			holder = phase.to;
			const space = Math.min(...defenderIds.map((id) => distance(points[id], points[holder])));
			if (space < 2) {
				return null;
			}
			cost += Math.max(0, 5 - space) ** 2 * 1.5 + distance(ballFrom, ballTo) * 0.015;
			const last = samples.at(-1);
			last.ball = { owner: holder, dribble: false };
			passes.push({
				from: phase.from,
				to: holder,
				releaseAt: phaseStart + releaseDelay,
				catchAt: time,
				receivingSpace: space,
				curve: flightCurve,
			});
			if (holder === shooter) {
				catchSpace = space;
				finalPasser = phase.from;
			}
		}
		phases.push({ kind: phase.kind, start: phaseStart, end: time, screen: phase.screen, user: phase.user });
	}
	if (
		holder !== shooter || (assister && finalPasser !== assister) ||
		(candidate.kind === "drive-kick" && !helper) ||
		(candidate.kind === "off-ball-screen" && !screenUsed && !switched)
	) {
		return null;
	}
	const receivingSpace = Math.min(...defenderIds.map((id) => distance(points[id], points[shooter])));
	if (!catchSpace) {
		catchSpace = receivingSpace;
	}
	// Project the same gather and closeout used by the shot animation, including help defenders.
	const closing = structuredClone(points);
	for (const dt of [0.12, 0.25]) {
		for (const id of defenderIds) {
			const target = points[matchups[id]];
			const onBall = matchups[id] === shooter;
			let desired = interpolate(target, hoop, (onBall ? 3.2 : 3.6) / (distance(target, hoop) || 1));
			if (!onBall) {
				desired = interpolate(
					desired,
					points[shooter],
					Math.min(0.13, 6 / (distance(desired, points[shooter]) || 1)),
				);
			}
			const fraction = Math.min(1 - Math.exp(-dt / 0.3), dt * 13 / (distance(closing[id], desired) || 1));
			closing[id] = interpolate(closing[id], desired, fraction);
		}
	}
	const releaseSpace = Math.min(...defenderIds.map((id) => distance(closing[id], points[shooter])));
	cost += Math.max(0, 4 - releaseSpace) ** 2 * 2 + travel * 0.035;
	return {
		kind: candidate.kind,
		participants: candidate.participants,
		samples,
		phases,
		passes,
		duration: time,
		cost,
		catchSpace,
		releaseSpace,
		helper,
		screenUsed,
		coverage: candidate.coverage,
		matchups,
		switchAt,
		source: "schematic",
	};
}
