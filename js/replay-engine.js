import { animateShot, flyBall, getShotStyle, landPlayers } from "./replay-shots.js";

const SLOT_ORDER = ["PG", "SG", "SF", "PF", "C"];
const FALLBACK_SPACING = [[62, 25], [70, 10], [73, 40], [79, 17], [83, 31]];

export function clockSeconds(clock) {
	const match = clock.match(/^PT(?:(\d+)M)?([\d.]+)S$/);
	return Number(match[1] || 0) * 60 + Number(match[2]);
}

function otherTeam(data, teamId) {
	return data.teams.find((team) => team.id !== teamId).id;
}

function attackDirection(data, teamId, period) {
	const homeId = data.teams.find((team) => team.home).id;
	return (teamId === homeId) === (period <= 2) ? 1 : -1;
}

function eventOffense(scene, fallback, data) {
	const action = scene.action;
	if (["2pt", "3pt", "heave", "freethrow", "turnover"].includes(scene.kind)) {
		return action.teamId;
	}
	if (scene.kind === "foul") {
		if (action.subType === "offensive") {
			return action.teamId;
		}
		return action.possession || fallback || otherTeam(data, action.teamId);
	}
	return fallback;
}

function buildScenes(actions) {
	const scenes = [];
	const consumed = new Set();
	const ordered = actions.slice().sort((a, b) => a.orderNumber - b.orderNumber);
	ordered.forEach((action, index) => {
		if (consumed.has(index)) {
			return;
		}
		const scene = { kind: action.actionType, action, related: [], participants: [] };
		if (scene.kind === "substitution") {
			for (let i = index; i < ordered.length; i++) {
				const next = ordered[i];
				if (
					next.actionType !== "substitution" || next.period !== action.period || next.clock !== action.clock
				) {
					break;
				}
				scene.related.push(next);
				consumed.add(i);
			}
		} else {
			for (let i = index + 1; i < ordered.length; i++) {
				const next = ordered[i];
				if (next.period !== action.period || next.clock !== action.clock) {
					break;
				}
				const linkedBlock = next.actionType === "block" && next.personId === action.blockPersonId;
				const linkedSteal = next.actionType === "steal" && next.personId === action.stealPersonId;
				const linkedTurnover = scene.kind === "foul" && action.subType === "offensive" &&
					next.actionType === "turnover" && next.personId === action.personId;
				if (linkedBlock || linkedSteal || linkedTurnover) {
					scene.related.push(next);
					consumed.add(i);
				}
			}
		}
		scene.participants = [
			...new Set([
				action.personId,
				action.assistPersonId,
				action.blockPersonId,
				action.stealPersonId,
				action.foulDrawnPersonId,
				action.jumpBallWonPersonId,
				action.jumpBallLostPersonId,
				action.jumpBallRecoverdPersonId,
				...scene.related.map((item) => item.personId),
			].filter(Boolean)),
		];
		scenes.push(scene);
	});
	return scenes;
}

// Future contacts constrain the formation before the corresponding action happens.
function planMatchups(scenes, index, offense, state, data) {
	const attack = state.lineups[offense];
	const defense = state.lineups[otherTeam(data, offense)];
	const assignments = {};
	const assigned = new Set();
	const contacts = [];
	let rebounderId = null;
	for (let i = index; i < scenes.length; i++) {
		const scene = scenes[i];
		const action = scene.action;
		if (scene.kind === "rebound" && action.teamId !== offense) {
			rebounderId = defense.includes(action.personId) ? action.personId : null;
		}
		if (
			(scene.kind === "rebound" && action.teamId !== offense) ||
			(scene.kind === "period" && action.subType === "end") ||
			eventOffense(scene, offense, data) !== offense
		) {
			break;
		}
		let attacker;
		let defender;
		if (action.blockPersonId) {
			attacker = action.personId;
			defender = action.blockPersonId;
		} else if (scene.kind === "foul") {
			attacker = action.subType === "offensive" ? action.personId : action.foulDrawnPersonId;
			defender = action.subType === "offensive" ? action.foulDrawnPersonId : action.personId;
		} else if (action.stealPersonId) {
			attacker = action.personId;
			defender = action.stealPersonId;
		}
		if (
			attack.includes(attacker) && defense.includes(defender) && !assignments[defender] && !assigned.has(attacker)
		) {
			assignments[defender] = attacker;
			assigned.add(attacker);
			contacts.push({ defender, attacker, actionNumber: action.actionNumber });
		}
		if (scene.kind === "turnover" || (["2pt", "3pt"].includes(scene.kind) && action.shotResult === "Made")) {
			break;
		}
	}
	let reboundMatchup = null;
	if (rebounderId) {
		const constrained = assignments[rebounderId] !== undefined;
		if (!constrained) {
			const available = attack.filter((id) => !assigned.has(id));
			const direction = attackDirection(data, offense, scenes[index].action.period);
			const points = attack.map((id, slot) =>
				state.formation?.offense === offense && state.formation.period === scenes[index].action.period
					? state.formation.slots[slot]
					: [direction === 1 ? state.positions[id].x : 94 - state.positions[id].x, state.positions[id].y]
			);
			const nearest = available.reduce((best, id) => {
				const point = points[attack.indexOf(id)];
				const other = points[attack.indexOf(best)];
				return Math.hypot(point[0] - 88.75, point[1] - 25) <
						Math.hypot(other[0] - 88.75, other[1] - 25)
					? id
					: best;
			});
			assignments[rebounderId] = nearest;
			assigned.add(nearest);
		}
		reboundMatchup = { defender: rebounderId, attacker: assignments[rebounderId], constrained };
	}
	defense.forEach((id, slot) => {
		if (!assignments[id]) {
			const attacker = !assigned.has(attack[slot]) ? attack[slot] : attack.find((item) => !assigned.has(item));
			assignments[id] = attacker;
			assigned.add(attacker);
		}
	});
	return { assignments, contacts, reboundMatchup };
}

// Search open court space while retaining the previous side and a short route there.
function findOpenSpace(origin, occupied, lane = null, interior = false, guard = false) {
	const score = ([x, y]) => {
		let cost = Math.hypot(x - origin[0], y - origin[1]) ** 2 * 0.045;
		for (const [otherX, otherY] of occupied) {
			cost += Math.max(0, 13 - Math.hypot(x - otherX, y - otherY)) ** 2 * 4;
		}
		if (lane) {
			const [[fromX, fromY], [toX, toY]] = lane;
			const dx = toX - fromX;
			const dy = toY - fromY;
			const fraction = Math.max(0, Math.min(1, ((x - fromX) * dx + (y - fromY) * dy) / (dx * dx + dy * dy || 1)));
			cost += Math.max(0, 7 - Math.hypot(x - fromX - dx * fraction, y - fromY - dy * fraction)) ** 2 * 3;
		}
		return cost;
	};
	let best = origin.slice();
	let bestScore = interior && Math.hypot(best[0] - 88.75, best[1] - 25) > 12 ? Infinity : score(best);
	for (let x = 58; x <= 88; x += 5) {
		for (let y = 5; y <= 45; y += 5) {
			if ((interior && Math.hypot(x - 88.75, y - 25) > 12) || (guard && x > 68)) {
				continue;
			}
			const candidate = [x, y];
			const cost = score(candidate);
			if (cost < bestScore) {
				best = candidate;
				bestScore = cost;
			}
		}
	}
	return best;
}

function planFormation(replay, index, offense, direction, lineup, state) {
	let evidence = null;
	let evidenceIndex = -1;
	for (let i = index; i < replay.scenes.length; i++) {
		const candidate = replay.scenes[i];
		if (
			candidate.action.period !== replay.scenes[index].action.period ||
			(candidate.kind === "rebound" && candidate.action.teamId !== offense) ||
			(["2pt", "3pt", "turnover", "freethrow"].includes(candidate.kind) && candidate.action.teamId !== offense)
		) {
			break;
		}
		if (["2pt", "3pt"].includes(candidate.kind)) {
			evidence = candidate.action;
			evidenceIndex = i;
			break;
		}
		if (candidate.kind === "turnover") {
			break;
		}
	}
	const carried = lineup.map((id) => {
		const position = state.positions[id];
		return [direction === 1 ? position.x : 94 - position.x, position.y];
	});
	const center = carried.reduce((sum, [x]) => sum + x, 0) / carried.length;
	const advance = Math.max(0, 71 - center);
	const slots = state.formation
		? carried.map(([x, y]) => [Math.max(55, Math.min(89, x + advance)), Math.max(4, Math.min(46, y))])
		: FALLBACK_SPACING.map((point) => point.slice());
	const origins = slots.map((point) => point.slice());
	const shooterSlot = evidence ? lineup.indexOf(evidence.personId) : -1;
	const assistSlot = evidence ? lineup.indexOf(evidence.assistPersonId) : -1;
	const style = evidence && getShotStyle(evidence);
	const shot = evidence
		? { x: direction === 1 ? evidence.x * 0.94 : 94 - evidence.x * 0.94, y: evidence.y * 0.5 }
		: null;
	let interiorSlot = -1;
	// Plan only the space needed by the recorded finish; no template implies a real set play.
	if (shot) {
		const side = Math.sign(shot.y - 25) || 1;
		if (shooterSlot >= 0) {
			const approach = style.running
				? 12
				: style.driving || style.cutting || style.pullup || style.alleyOop
				? 7
				: style.family === "layup" || style.family === "dunk"
				? 4
				: 0;
			slots[shooterSlot] = [Math.max(54, Math.min(89, shot.x - approach)), Math.max(4, Math.min(46, shot.y))];
		}
		if (assistSlot >= 0 && assistSlot !== shooterSlot) {
			const [x, y] = origins[assistSlot];
			const dx = x - shot.x;
			const dy = y - shot.y;
			const distance = Math.hypot(dx, dy);
			const length = Math.max(11, Math.min(19, distance));
			slots[assistSlot] = [
				Math.max(56, Math.min(84, shot.x + (distance > 0.1 ? dx / distance : -1) * length)),
				Math.max(5, Math.min(45, shot.y + (distance > 0.1 ? dy / distance : -side * 0.5) * length)),
			];
		}
		const rebound = replay.scenes[evidenceIndex + 1];
		const rebounderSlot = rebound?.kind === "rebound" && rebound.action.teamId === offense
			? lineup.indexOf(rebound.action.personId)
			: -1;
		const available = lineup.map((_, slot) => slot).filter((slot) => slot !== shooterSlot && slot !== assistSlot);
		interiorSlot = available.includes(rebounderSlot)
			? rebounderSlot
			: available.reduce((best, slot) =>
				Math.hypot(slots[slot][0] - 88.75, slots[slot][1] - 25) <
						Math.hypot(slots[best][0] - 88.75, slots[best][1] - 25)
					? slot
					: best
			);
		if (Math.hypot(slots[interiorSlot][0] - 88.75, slots[interiorSlot][1] - 25) > 12) {
			slots[interiorSlot] = [81 + (slots[interiorSlot][0] - 81) * 0.2, 25 - side * 7];
		}
		if (style.driving || style.cutting || style.running || style.family === "layup" || style.alleyOop) {
			const entry = shooterSlot >= 0 ? slots[shooterSlot] : [shot.x - 7, shot.y];
			const dx = shot.x - entry[0];
			const dy = shot.y - entry[1];
			const length = Math.hypot(dx, dy) || 1;
			for (const slot of available) {
				const [x, y] = slots[slot];
				const fraction = Math.max(0, Math.min(1, ((x - entry[0]) * dx + (y - entry[1]) * dy) / length ** 2));
				const nearest = [entry[0] + dx * fraction, entry[1] + dy * fraction];
				if (Math.hypot(x - nearest[0], y - nearest[1]) < 5) {
					slots[slot] = [x, Math.max(4, Math.min(46, nearest[1] + (y < nearest[1] ? -6 : 6)))];
				}
			}
		}
	}
	if (shooterSlot !== 0 && assistSlot !== 0 && interiorSlot !== 0) {
		slots[0] = [Math.min(67, slots[0][0]), Math.max(13, Math.min(37, slots[0][1]))];
	}
	const priority = [...new Set([shooterSlot, assistSlot, interiorSlot, 0, 1, 2, 3, 4].filter((slot) => slot >= 0))];
	// Resolve local overlaps, giving the shooter and passer priority.
	for (let pass = 0; pass < 3; pass++) {
		for (let i = 1; i < priority.length; i++) {
			const slot = priority[i];
			for (let j = 0; j < i; j++) {
				const other = slots[priority[j]];
				const dx = slots[slot][0] - other[0];
				const dy = slots[slot][1] - other[1];
				const distance = Math.hypot(dx, dy);
				if (distance < 6) {
					const angle = distance > 0.1 ? Math.atan2(dy, dx) : slot % 2 ? Math.PI / 2 : -Math.PI / 2;
					slots[slot] = [
						Math.max(54, Math.min(89, other[0] + Math.cos(angle) * 6)),
						Math.max(4, Math.min(46, other[1] + Math.sin(angle) * 6)),
					];
				}
			}
		}
	}
	const lane = shot ? [assistSlot >= 0 ? slots[assistSlot] : slots[shooterSlot], [shot.x, shot.y]] : null;
	// Reserve actual participants first, then use the width and depth for the other three players.
	for (let pass = 0; pass < 2; pass++) {
		for (const slot of priority) {
			if (slot === shooterSlot || slot === assistSlot) {
				continue;
			}
			const occupied = slots.filter((_, other) => other !== slot);
			slots[slot] = findOpenSpace(
				slots[slot],
				occupied,
				lane,
				slot === interiorSlot,
				slot === 0 && slot !== interiorSlot,
			);
		}
	}
	const formation = {
		id: replay.formations.length,
		offense,
		period: replay.scenes[index].action.period,
		kind: evidence ? "event-spacing" : state.formation ? "continuity" : "fallback",
		evidenceActionNumber: evidence?.actionNumber ?? null,
		shooterId: evidence?.personId ?? null,
		assistId: evidence?.assistPersonId ?? null,
		interiorId: interiorSlot >= 0 ? lineup[interiorSlot] : null,
		interiorSlot,
		origins,
		slots,
	};
	replay.formations.push(formation);
	return formation;
}

function placeFormation(state, offense, direction, matchups, data, destinations) {
	state.lineups[offense].forEach((id, slot) => {
		const [x, y] = destinations[slot];
		Object.assign(state.positions[id], { x: direction === 1 ? x : 94 - x, y });
	});
	state.lineups[otherTeam(data, offense)].forEach((id) => {
		const target = state.positions[matchups[id]];
		Object.assign(state.positions[id], {
			x: target.x + direction * 3.6,
			y: target.y + (25 - target.y) * 0.09,
		});
	});
}

function snapshot(state, time) {
	const owner = state.ball.owner && state.positions[state.ball.owner];
	return {
		time,
		players: state.players.map((player) => ({ id: player.id, ...state.positions[player.id] })),
		ball: owner
			? {
				...state.ball,
				x: owner.x + 1,
				y: owner.y + 0.8,
				z: 0.5 + owner.jump * 1.4,
			}
			: { ...state.ball },
		score: state.score.slice(),
		possession: state.possession,
	};
}

function addMarker(replay, scene, time, kind, position, value = "", duration = null) {
	replay.markers.push({
		time: scene.start + time,
		end: scene.start + time + (duration ?? (kind === "made" || kind === "miss" ? 4.2 : 1.7)),
		kind,
		x: position.x,
		y: position.y,
		teamId: scene.action.teamId,
		value,
	});
}

function setScore(state, action) {
	state.score = [Number(action.scoreAway), Number(action.scoreHome)];
}

function releaseBall(state) {
	const owner = state.positions[state.ball.owner];
	if (owner) {
		state.ball = { x: owner.x + 1, y: owner.y + 0.8, z: 0, owner: null };
	} else {
		state.ball.owner = null;
	}
}

function prepareAttack(state, scene, offense, direction, matchups, record, data, replay, index) {
	const lineup = state.lineups[offense];
	const pg = lineup[0];
	const changed = state.possession !== offense;
	// A made basket can be followed by an and-one or a retained-possession penalty.
	if (state.restart === "baseline" && !changed) {
		state.restart = null;
	}
	const restart = state.restart;
	const carrier = state.ball.owner;
	const origin = carrier ? { ...state.positions[carrier] } : { ...state.ball };
	scene.attackTeam = offense;
	const newAttack = !state.formation || state.formation.offense !== offense ||
		state.formation.period !== scene.action.period || state.needsAdvance || restart === "baseline";
	if (newAttack) {
		state.formation = planFormation(replay, index, offense, direction, lineup, state);
		const plan = planMatchups(replay.scenes, index, offense, state, data);
		state.matchups = { ...plan.assignments };
		state.formation.initialMatchups = plan.assignments;
		state.formation.contactMatchups = plan.contacts;
		state.formation.reboundMatchup = plan.reboundMatchup;
	}
	Object.assign(matchups, state.matchups);
	scene.matchups = { ...matchups };
	scene.matchupPlanId = state.formation.id;
	scene.formation = state.formation;
	if (!restart && !changed && !state.needsAdvance && carrier) {
		return;
	}
	const destinations = newAttack ? state.formation.slots : lineup.map((id) => {
		const position = state.positions[id];
		return [direction === 1 ? position.x : 94 - position.x, position.y];
	});
	scene.spacingDestinations = destinations;
	scene.spacingSource = newAttack ? "planned" : "current";
	state.possession = offense;
	state.ball.dribble = true;
	placeFormation(state, offense, direction, matchups, data, destinations);
	const destination = { ...state.positions[pg] };
	if (restart || changed || !state.ball.owner) {
		const inbounder = lineup[4];
		if (restart) {
			Object.assign(
				state.positions[inbounder],
				restart === "baseline" ? { x: direction === 1 ? -1.5 : 95.5, y: 30 } : { x: 47, y: 51.5 },
			);
			Object.assign(
				state.positions[pg],
				restart === "baseline" ? { x: direction === 1 ? 15 : 79, y: 28 } : { x: 47, y: 40 },
			);
			state.ball.owner = inbounder;
			record(0.85);
			state.ball.owner = pg;
			record(0.45);
			const [x, y] = destinations[4];
			Object.assign(state.positions[inbounder], { x: direction === 1 ? x : 94 - x, y });
			Object.assign(state.positions[pg], { x: 47, y: 28 });
			record(0.6);
			Object.assign(state.positions[pg], destination);
			record(0.6);
		} else {
			state.ball.owner = pg;
			record(changed ? 1.5 : 0.85);
		}
	} else {
		// A named rebounder or stealer keeps the ball until the schematic outlet pass.
		Object.assign(state.positions[carrier], origin);
		Object.assign(state.positions[pg], { x: Math.max(12, Math.min(82, origin.x + direction * 6)), y: 25 });
		record(0.3);
		if (carrier !== pg) {
			state.ball.owner = pg;
			record(0.4);
		}
		if ((direction === 1 && state.positions[pg].x < 47) || (direction === -1 && state.positions[pg].x > 47)) {
			Object.assign(state.positions[pg], { x: 47, y: 25 });
			record(0.7);
		}
		placeFormation(state, offense, direction, matchups, data, destinations);
		record(0.7);
	}
	state.restart = null;
	state.needsAdvance = false;
}

function prepareReboundFormation(state, scene, rebounderId, hoop, record, data) {
	if (
		[scene.action.personId, scene.action.assistPersonId, scene.action.blockPersonId, state.ball.owner].includes(
			rebounderId,
		)
	) {
		return;
	}
	const team = data.teams.find((item) => state.lineups[item.id].includes(rebounderId));
	if (team.id !== scene.attackTeam) {
		return;
	}
	const candidates = state.lineups[team.id].filter((id) =>
		![scene.action.personId, scene.action.assistPersonId, scene.action.blockPersonId, state.ball.owner].includes(id)
	);
	const closest = candidates.sort((a, b) =>
		Math.hypot(state.positions[a].x - hoop.x, state.positions[a].y - hoop.y) -
		Math.hypot(state.positions[b].x - hoop.x, state.positions[b].y - hoop.y)
	)[0];
	if (
		closest === rebounderId ||
		Math.hypot(state.positions[closest].x - hoop.x, state.positions[closest].y - hoop.y) >=
			Math.hypot(state.positions[rebounderId].x - hoop.x, state.positions[rebounderId].y - hoop.y) - 0.01
	) {
		return;
	}
	const from = { ...state.positions[rebounderId] };
	const inside = { ...state.positions[closest] };
	const start = scene.frames.at(-1).time;
	// Rotate two off-ball roles during the buildup, without revealing the later catch point.
	for (const fraction of [0.5, 1]) {
		Object.assign(state.positions[rebounderId], {
			x: from.x + (inside.x - from.x) * fraction,
			y: from.y + (inside.y - from.y) * fraction,
		});
		Object.assign(state.positions[closest], {
			x: inside.x + (from.x - inside.x) * fraction,
			y: inside.y + (from.y - inside.y) * fraction,
		});
		record(0.5);
	}
	scene.reboundRotation = { rebounderId, partnerId: closest, start, end: scene.frames.at(-1).time };
}

function prepareRebound(replay, scene, index, state) {
	const previous = replay.scenes[index - 1];
	const id = scene.action.personId;
	if (
		!id || !previous || !["2pt", "3pt", "heave", "freethrow"].includes(previous.kind) ||
		previous.action.shotResult === "Made" || previous.technical
	) {
		return;
	}
	const reactionAt = previous.action.personId === id
		? previous.eventAt
		: previous.releaseAt + (previous.eventAt - previous.releaseAt) * 0.75;
	const startFrame = previous.frames.find((frame) => frame.time >= reactionAt);
	const start = startFrame.time;
	const end = previous.frames.at(-1).time;
	const origin = startFrame.players.find((player) => player.id === id);
	const target = { x: state.ball.x, y: state.ball.y };
	// React late in the shot flight instead of anticipating the result at release.
	for (const frame of previous.frames) {
		if (frame.time <= start) {
			continue;
		}
		const fraction = Math.min(1, (frame.time - start) / (end - start));
		const smooth = fraction * fraction * (3 - 2 * fraction);
		const player = frame.players.find((player) => player.id === id);
		player.x = origin.x + (target.x - origin.x) * smooth;
		player.y = origin.y + (target.y - origin.y) * smooth;
	}
	Object.assign(state.positions[id], target);
	scene.reboundApproach = { sceneIndex: index - 1, start, end, playerId: id, target };
}

function compileScene(replay, scene, index, state, data) {
	const action = scene.action;
	const offense = eventOffense(scene, state.possession, data);
	const direction = attackDirection(data, offense, action.period);
	const hoop = { x: direction === 1 ? 88.75 : 5.25, y: 25 };
	const matchups = {};
	const nextScene = replay.scenes[index + 1];
	const namedRebound = nextScene?.kind === "rebound" && nextScene.action.personId;
	if (scene.kind === "rebound") {
		prepareRebound(replay, scene, index, state);
	}
	let time = 0;
	let followAttackers = false;
	const spacingMoves = [];
	const contacts = new Set();
	const record = (delay) => {
		if (scene.releaseAt === undefined) {
			for (const move of spacingMoves) {
				const position = state.positions[move.id];
				const distance = Math.hypot(move.x - position.x, move.y - position.y);
				const fraction = distance > 0 ? Math.min(1, delay * 5 / distance) : 0;
				position.x += (move.x - position.x) * fraction;
				position.y += (move.y - position.y) * fraction;
			}
		}
		if (followAttackers) {
			for (const [defender, attacker] of Object.entries(matchups)) {
				if (!contacts.has(Number(defender))) {
					const target = state.positions[attacker];
					Object.assign(state.positions[defender], {
						x: Math.max(1, Math.min(93, target.x + direction * 3.6)),
						y: target.y + (25 - target.y) * 0.09,
					});
				}
			}
		}
		time += delay;
		scene.frames.push(snapshot(state, time));
	};
	record(0);
	if (["2pt", "3pt", "heave"].includes(scene.kind)) {
		followAttackers = true;
		scene.shotStyle = getShotStyle(action);
		if (state.restart || state.possession !== offense) {
			replay.attacks.push(scene.start);
		}
		const distance = action.shotDistance || 45;
		const shot = scene.kind === "heave"
			? { x: Math.max(1, Math.min(93, hoop.x - direction * distance)), y: 25 }
			: { x: action.x * 0.94, y: action.y * 0.5 };
		scene.hoop = hoop;
		scene.shotPoint = shot;
		if (scene.kind === "heave") {
			Object.assign(matchups, planMatchups(replay.scenes, index, offense, state, data).assignments);
			// A last-second heave starts in the backcourt, without a complete half-court setup.
			state.possession = offense;
			if (state.restart) {
				const inbounder = state.lineups[offense].find((id) => id !== action.personId);
				Object.assign(state.positions[inbounder], { x: direction === 1 ? -1.5 : 95.5, y: 30 });
				state.ball.owner = inbounder;
				record(0.5);
			}
			state.restart = null;
			state.needsAdvance = false;
		} else {
			prepareAttack(state, scene, offense, direction, matchups, record, data, replay, index);
		}
		if (namedRebound && scene.kind !== "heave") {
			prepareReboundFormation(state, scene, namedRebound, hoop, record, data);
		}
		if (scene.kind !== "heave" && !scene.shotStyle.tip && !scene.shotStyle.putback) {
			const lineup = state.lineups[offense];
			const points = lineup.map((id) => {
				const position = state.positions[id];
				return [direction === 1 ? position.x : 94 - position.x, position.y];
			});
			const finish = [direction === 1 ? shot.x : 94 - shot.x, shot.y];
			const passerSlot = lineup.indexOf(action.assistPersonId);
			const lane = [passerSlot >= 0 ? points[passerSlot] : points[lineup.indexOf(action.personId)], finish];
			lineup.forEach((id, slot) => {
				if (
					id === action.personId || id === action.assistPersonId || id === state.ball.owner ||
					slot === scene.formation.interiorSlot
				) {
					return;
				}
				const occupied = points.filter((_, other) => other !== slot).concat([finish]);
				const target = findOpenSpace(points[slot], occupied, lane, false, slot === 0);
				const distance = Math.hypot(target[0] - points[slot][0], target[1] - points[slot][1]);
				if (distance < 2) {
					return;
				}
				// A small pre-release adjustment, never a new route during the shot or rebound.
				const fraction = Math.min(1, 6 / distance);
				const x = points[slot][0] + (target[0] - points[slot][0]) * fraction;
				const y = points[slot][1] + (target[1] - points[slot][1]) * fraction;
				spacingMoves.push({ id, x: direction === 1 ? x : 94 - x, y });
				points[slot] = [x, y];
			});
		}
		scene.spacingMoves = spacingMoves;
		animateShot(state, scene, shot, hoop, direction, record, contacts, matchups);
		if (action.blockPersonId) {
			addMarker(replay, scene, time, "block", state.positions[action.blockPersonId]);
		}
		scene.eventAt = time;
		const made = action.shotResult === "Made";
		addMarker(replay, scene, time, made ? "made" : "miss", shot, made ? `+${scene.kind === "3pt" ? 3 : 2}` : "");
		if (made) {
			setScore(state, action);
			state.restart = "baseline";
			state.ball = { ...hoop, z: 0, owner: null };
		} else {
			const reboundPoint = {
				x: action.blockPersonId
					? Math.max(1, Math.min(93, shot.x + direction * 3))
					: hoop.x - direction * (2 + action.actionNumber % 4),
				y: action.blockPersonId ? Math.max(1, Math.min(49, shot.y + 4)) : 20 + action.actionNumber % 11,
				z: 0,
				owner: null,
			};
			if (namedRebound) {
				flyBall(state, record, { ...reboundPoint, z: 3.1 }, 1.8, 0.5);
			} else {
				state.ball = reboundPoint;
			}
		}
		record(0.01);
		landPlayers(state);
		record(0.22);
		record(!made && namedRebound ? 0.08 : 0.65);
	} else if (scene.kind === "rebound") {
		const defensive = action.subType === "defensive";
		if (action.personId) {
			const rebounder = state.positions[action.personId];
			if (!scene.reboundApproach) {
				Object.assign(rebounder, { x: state.ball.x, y: state.ball.y });
				record(0.55);
			}
			rebounder.jump = 1;
			record(0.22);
			flyBall(state, record, { x: rebounder.x + 1, y: rebounder.y + 0.8, z: 1.9 }, 0.15, 0.18);
			state.ball.owner = action.personId;
			state.ball.dribble = false;
			record(0.01);
			scene.catchAt = time;
			addMarker(replay, scene, time, "rebound", state.positions[action.personId]);
		} else {
			// Team rebounds identify possession, not an individual ball winner.
			state.ball.owner = null;
			state.restart = "sideline";
			record(0.45);
			addMarker(replay, scene, time, "rebound", state.ball);
		}
		scene.eventAt = time;
		state.possession = action.teamId;
		if (defensive) {
			state.needsAdvance = true;
			replay.attacks.push(scene.start + time);
		}
		const next = replay.scenes[index + 1]?.action;
		const nextStyle = next && ["2pt", "3pt"].includes(next.actionType) ? getShotStyle(next) : null;
		if (action.personId && !(next?.personId === action.personId && (nextStyle?.tip || nextStyle?.putback))) {
			state.positions[action.personId].jump = 0;
		}
		record(0.35);
	} else if (scene.kind === "freethrow") {
		const technical = action.descriptor === "technical" || action.qualifiers?.includes("technical");
		const retainedPossession = state.possession;
		const previousPositions = technical
			? Object.fromEntries(Object.entries(state.positions).map(([id, position]) => [id, { ...position }]))
			: null;
		scene.technical = technical;
		state.possession = action.teamId;
		state.restart = null;
		const shooter = state.positions[action.personId];
		Object.assign(shooter, { x: direction === 1 ? 75 : 19, y: 25 });
		let slot = 0;
		for (const player of state.players) {
			if (state.positions[player.id].opacity && player.id !== action.personId) {
				const x = technical ? 29 + slot % 2 * 3 : 7.5 + Math.floor(slot / 2) * 4;
				Object.assign(state.positions[player.id], {
					x: direction === 1 ? 94 - x : x,
					y: technical ? 5 + slot * 4.8 : slot % 2 ? 35 : 15,
				});
				slot++;
			}
		}
		state.ball.owner = action.personId;
		state.ball.dribble = false;
		record(0.75);
		if (technical) {
			addMarker(replay, scene, time, "technical", shooter, "", 0.65);
		}
		scene.releaseAt = time;
		flyBall(state, record, { ...hoop, z: 1 }, 6, 0.8);
		scene.eventAt = time;
		const made = action.shotResult === "Made";
		setScore(state, action);
		addMarker(replay, scene, time, made ? "made" : "miss", shooter, made ? "+1" : "");
		const sequence = action.subType.match(/(\d) of (\d)/);
		const final = !sequence || sequence[1] === sequence[2];
		if (technical) {
			state.possession = retainedPossession;
			state.restart = "sideline";
		} else if (final && made) {
			state.restart = "baseline";
		} else if (!final) {
			state.ball.owner = action.personId;
		} else if (!made) {
			const reboundPoint = { x: state.ball.x - direction * 3, y: 28, z: 3.1 };
			if (namedRebound) {
				flyBall(state, record, reboundPoint, 1.8, 0.5);
			} else {
				state.ball.x = reboundPoint.x;
				state.ball.y = reboundPoint.y;
			}
		}
		record(0.01);
		if (technical) {
			state.positions = previousPositions;
		}
		record(0.65);
	} else if (scene.kind === "foul" || scene.kind === "turnover" || scene.kind === "steal") {
		const offensive = scene.kind === "foul" && action.subType === "offensive";
		const onBall = scene.kind === "turnover" || offensive ||
			["shooting", "take", "transition take"].includes(action.descriptor);
		if (onBall) {
			followAttackers = true;
			prepareAttack(state, scene, offense, direction, matchups, record, data, replay, index);
			state.ball.owner = (scene.kind === "foul" && !offensive ? action.foulDrawnPersonId : action.personId) ||
				state.ball.owner || state.lineups[offense][0];
			record(0.4);
		}
		const victim = state.positions[action.foulDrawnPersonId];
		const actor = state.positions[action.personId];
		if (scene.kind === "foul" && victim && actor && action.descriptor === "charge") {
			contacts.add(action.foulDrawnPersonId);
			Object.assign(actor, { x: victim.x - direction * 1.4, y: victim.y });
			record(0.3);
			actor.x -= direction * 1.8;
			actor.angle = -direction * 0.35;
			victim.x += direction;
			record(0.25);
		} else if (scene.kind === "foul" && victim && actor) {
			contacts.add(action.personId);
			Object.assign(actor, { x: victim.x + direction * 1.8, y: victim.y - 0.5 });
			if (action.descriptor === "shooting") {
				victim.jump = 1.2;
				actor.jump = 0.6;
			} else if (action.descriptor === "loose ball") {
				releaseBall(state);
				state.ball.x = (actor.x + victim.x) / 2;
				state.ball.y = victim.y + 1.2;
				state.ball.z = 0;
			}
			actor.angle = direction * 0.2;
			record(0.4);
		}
		if (action.subType === "technical" && actor) {
			actor.angle = 0.3;
			record(0.18);
			actor.angle = -0.3;
			record(0.18);
		}
		if (action.subType === "shot clock") {
			state.ball.dribble = false;
			record(0.6);
		} else if (action.subType === "traveling" && actor) {
			state.ball.dribble = false;
			actor.x += direction * 0.8;
			actor.angle = 0.15;
			record(0.18);
			actor.x += direction * 0.8;
			actor.angle = -0.15;
			record(0.18);
		} else if (action.subType === "offensive goaltending" && actor) {
			Object.assign(actor, { x: hoop.x - direction, y: 25, jump: 1.6 });
			state.ball = { ...hoop, z: 3, owner: null };
			record(0.4);
		}
		scene.eventAt = time;
		const markerKind = action.subType === "technical"
			? "technical"
			: action.subType === "shot clock"
			? "shot-clock"
			: action.subType === "traveling"
			? "violation"
			: scene.kind === "foul"
			? "foul"
			: "turnover";
		addMarker(replay, scene, time, markerKind, victim || actor || state.ball);
		if (action.stealPersonId || scene.kind === "steal") {
			const stealer = action.stealPersonId || action.personId;
			contacts.add(stealer);
			const losing = state.positions[state.ball.owner];
			if (losing) {
				const receiver = state.positions[state.lineups[offense].find((id) => id !== state.ball.owner)];
				Object.assign(state.positions[stealer], {
					x: action.subType === "bad pass" ? (losing.x + receiver.x) / 2 : losing.x + direction * 2.5,
					y: action.subType === "bad pass" ? (losing.y + receiver.y) / 2 : losing.y + 1.5,
				});
			}
			const target = state.positions[stealer];
			flyBall(
				state,
				record,
				{ x: target.x + 1, y: target.y + 0.8, z: 0.5 },
				action.subType === "bad pass" ? 1 : 0.2,
				0.4,
			);
			state.ball.owner = stealer;
			state.possession = otherTeam(data, offense);
			state.restart = null;
			state.needsAdvance = true;
			addMarker(replay, scene, time, "steal", state.positions[stealer]);
			replay.attacks.push(scene.start + time);
		} else if (scene.kind === "turnover" || offensive) {
			releaseBall(state);
			if (action.subType === "out-of-bounds") {
				flyBall(
					state,
					record,
					{
						x: Math.max(2, Math.min(92, state.ball.x + direction * 3)),
						y: state.ball.y < 25 ? -1 : 51,
						z: 0,
					},
					action.descriptor === "bad pass" ? 1.2 : 0.1,
					0.45,
				);
			} else if (action.subType === "lost ball") {
				flyBall(state, record, { x: state.ball.x + direction * 3, y: state.ball.y + 2, z: 0 }, 0.2, 0.3);
			}
			state.possession = otherTeam(data, offense);
			state.restart = "sideline";
			replay.attacks.push(scene.start + time);
		} else if (scene.kind === "foul") {
			releaseBall(state);
			state.restart = "sideline";
		}
		landPlayers(state);
		record(0.7);
	} else if (scene.kind === "substitution") {
		for (const team of data.teams) {
			const outs = scene.related.filter((a) => a.teamId === team.id && a.subType === "out");
			const ins = scene.related.filter((a) => a.teamId === team.id && a.subType === "in");
			outs.forEach((out, i) => {
				const incoming = ins[i];
				const lineup = state.lineups[team.id];
				const slot = lineup.indexOf(out.personId);
				const previous = { ...state.positions[out.personId] };
				Object.assign(state.positions[out.personId], { x: 43 + i * 3, y: 52 });
				Object.assign(state.positions[incoming.personId], { x: 43 + i * 3, y: 55, opacity: 0 });
				scene.swaps.push({ out: out.personId, in: incoming.personId, slot, teamId: team.id, previous });
				lineup[slot] = incoming.personId;
				if (state.matchups) {
					if (state.matchups[out.personId] !== undefined) {
						state.matchups[incoming.personId] = state.matchups[out.personId];
						delete state.matchups[out.personId];
					}
					for (const defender of Object.keys(state.matchups)) {
						if (state.matchups[defender] === out.personId) {
							state.matchups[defender] = incoming.personId;
						}
					}
				}
				if (state.ball.owner === out.personId) {
					state.ball = { x: previous.x + 1, y: previous.y + 0.8, z: 0.5, owner: null, dribble: false };
					state.restart = "sideline";
				}
			});
		}
		record(0.65);
		scene.eventAt = time;
		addMarker(replay, scene, time, "substitution", { x: 47, y: 51 });
		for (const swap of scene.swaps) {
			state.positions[swap.out].opacity = 0;
			Object.assign(state.positions[swap.in], { x: 47, y: 52, opacity: 1 });
		}
		record(0.35);
		for (const swap of scene.swaps) {
			Object.assign(state.positions[swap.in], { ...swap.previous, opacity: 1 });
		}
		record(0.7);
	} else if (scene.kind === "jumpball") {
		const center = action.descriptor === "heldball"
			? { x: Math.max(6, Math.min(88, state.ball.x)), y: Math.max(6, Math.min(44, state.ball.y)) }
			: { x: 47, y: 25 };
		Object.assign(state.positions[action.jumpBallWonPersonId], { x: center.x - 2, y: center.y });
		Object.assign(state.positions[action.jumpBallLostPersonId], { x: center.x + 2, y: center.y });
		state.ball = { ...center, z: 5, owner: null };
		record(0.6);
		addMarker(replay, scene, time, "jumpball", center);
		state.ball.z = 1;
		record(0.4);
		scene.eventAt = time;
		state.ball.owner = action.jumpBallRecoverdPersonId;
		state.possession = action.teamId;
		state.restart = null;
		state.needsAdvance = true;
		replay.attacks.push(scene.start);
		record(0.5);
	} else {
		scene.eventAt = 0.3;
		if (scene.kind === "period") {
			const periodLabel = action.period > 4 ? `OT${action.period - 4}` : `Q${action.period}`;
			scene.banner = action.subType === "end" ? `${periodLabel} · 0:00` : periodLabel;
			if (action.subType === "start" && action.period > 1) {
				state.restart = "sideline";
			}
		} else if (scene.kind === "game") {
			scene.banner = "FINAL";
			setScore(state, action);
		} else {
			const kind = scene.kind === "timeout" && action.subType === "challenge" ? "challenge" : scene.kind;
			addMarker(replay, scene, 0.3, kind, state.positions[action.personId] || { x: 47, y: 25 });
			if (scene.kind === "violation" && action.subType === "kicked ball") {
				releaseBall(state);
				flyBall(state, record, { x: state.ball.x + 2, y: state.ball.y + 3, z: 0 }, 0.3, 0.35);
				state.restart = "sideline";
			}
		}
		record(scene.kind === "timeout" ? 1.4 : 0.9);
	}
	if (scene.eventAt === undefined) {
		scene.eventAt = Math.max(0.01, time - 0.4);
	}
	scene.end = Number((scene.start + time).toFixed(3));
	scene.lineups = Object.fromEntries(Object.entries(state.lineups).map(([id, lineup]) => [id, lineup.slice()]));
}

export function compileReplay(data) {
	if (data.teams?.length !== 2 || !data.actions?.length) {
		throw new Error("Missing replay teams or actions.");
	}
	const players = data.teams.flatMap((team) => team.players.map((player) => ({ ...player, teamId: team.id })));
	const playerIds = new Set(players.map((player) => player.id));
	for (const action of data.actions) {
		if (action.personId && !playerIds.has(action.personId)) {
			throw new Error(`Unknown replay player: ${action.personId}`);
		}
		if (action.isFieldGoal && (!Number.isFinite(action.x) || !Number.isFinite(action.y))) {
			throw new Error(`Missing shot coordinates: ${action.actionNumber}`);
		}
	}
	const lineups = Object.fromEntries(
		data.teams.map((team) => [
			team.id,
			team.players.filter((player) => player.starter)
				.sort((a, b) => SLOT_ORDER.indexOf(a.position) - SLOT_ORDER.indexOf(b.position)).map((player) =>
					player.id
				),
		]),
	);
	if (Object.values(lineups).some((lineup) => lineup.length !== 5)) {
		throw new Error("Replay requires five starters per team.");
	}
	const state = {
		players,
		lineups,
		positions: Object.fromEntries(
			players.map((player) => [player.id, { x: 47, y: 54, opacity: 0, angle: 0, jump: 0 }]),
		),
		ball: { x: 47, y: 25, z: 0, owner: null },
		score: [0, 0],
		possession: data.teams.find((team) => team.home).id,
		restart: null,
		needsAdvance: false,
		formation: null,
		matchups: null,
	};
	for (const team of data.teams) {
		lineups[team.id].forEach((id, slot) => {
			state.positions[id] = {
				x: team.home ? 42 : 52,
				y: [10, 18, 32, 40, 25][slot],
				opacity: 1,
				angle: 0,
				jump: 0,
			};
		});
	}
	const tip = data.actions.find((action) => action.actionType === "jumpball");
	Object.assign(state.positions[tip.jumpBallWonPersonId], { x: 45, y: 25 });
	Object.assign(state.positions[tip.jumpBallLostPersonId], { x: 49, y: 25 });
	for (const id of Object.values(lineups).flat()) {
		if (id !== tip.jumpBallWonPersonId && id !== tip.jumpBallLostPersonId && state.positions[id].y === 25) {
			state.positions[id].y = 37;
		}
	}
	const replay = {
		scenes: buildScenes(data.actions),
		formations: [],
		markers: [],
		attacks: [0],
		quarters: [],
		players,
		duration: 0,
	};
	replay.scenes.forEach((scene, index) => {
		const previous = replay.scenes[index - 1];
		scene.start = replay.duration;
		scene.frames = [];
		scene.swaps = [];
		scene.clockTo = clockSeconds(scene.action.clock);
		scene.clockFrom = previous?.action.period === scene.action.period
			? previous.clockTo
			: scene.action.period > 4
			? 300
			: 720;
		if (scene.kind === "period" && scene.action.subType === "start") {
			replay.quarters.push({ period: scene.action.period, time: scene.start });
		}
		compileScene(replay, scene, index, state, data);
		replay.duration = scene.end;
	});
	replay.attacks = [...new Set(replay.attacks)].sort((a, b) => a - b);
	replay.finalScore = state.score;
	return replay;
}

export function getReplayFrame(replay, time) {
	const bounded = Math.max(0, Math.min(time, replay.duration));
	let low = 0;
	let high = replay.scenes.length - 1;
	while (low < high) {
		const middle = Math.floor((low + high) / 2);
		if (replay.scenes[middle].end <= bounded) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	const scene = replay.scenes[low];
	const local = bounded - scene.start;
	const frames = scene.frames;
	let frameIndex = 0;
	while (frameIndex < frames.length - 2 && frames[frameIndex + 1].time <= local) {
		frameIndex++;
	}
	const from = frames[frameIndex];
	const to = frames[frameIndex + 1] || from;
	const fraction = Math.max(0, Math.min(1, (local - from.time) / (to.time - from.time || 1)));
	const smooth = fraction * fraction * (3 - 2 * fraction);
	const mix = (a, b) => a + (b - a) * smooth;
	const ballFraction = to.ball.flight && !to.ball.owner ? fraction : smooth;
	const mixBall = (a, b) => a + (b - a) * ballFraction;
	const players = from.players.map((player, i) => ({
		id: player.id,
		x: mix(player.x, to.players[i].x),
		y: mix(player.y, to.players[i].y),
		opacity: mix(player.opacity, to.players[i].opacity),
		angle: mix(player.angle, to.players[i].angle),
		jump: mix(player.jump, to.players[i].jump),
	}));
	return {
		scene,
		time: bounded,
		players,
		ball: {
			x: mixBall(from.ball.x, to.ball.x),
			y: mixBall(from.ball.y, to.ball.y),
			z: mixBall(from.ball.z, to.ball.z),
			dribble: from.ball.dribble,
			owner: fraction === 1 ? to.ball.owner : from.ball.owner,
		},
		score: fraction === 1 ? to.score : from.score,
		possession: fraction === 1 ? to.possession : from.possession,
		period: scene.action.period,
		clock: scene.clockFrom + (scene.clockTo - scene.clockFrom) * Math.min(1, local / (scene.eventAt || 1)),
		participants: local >= scene.eventAt - 1.5 ? scene.participants : [],
		markers: replay.markers.filter((marker) => marker.time <= bounded && marker.end > bounded),
		banner: scene.banner && local > 0.15 ? scene.banner : "",
	};
}
