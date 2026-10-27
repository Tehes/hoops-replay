/*
 * CHOREOGRAPHY NORTH STAR
 *
 * Goal: Turn recorded events into coherent, readable basketball possessions.
 * This is a direction for future changes, not a claim that every principle below
 * is already implemented. See PROJECT.md for the current behavior and limits.
 *
 * Evidence comes first. Preserve event order, participants, scores, recorded
 * clocks and available shot coordinates. Treat formations, matchups, passes and
 * movement between anchors as schematic choices, never as measured tracking.
 * Show specific screens, pick-and-rolls or pick-and-pops only with explicit
 * source evidence. A missing assist does not establish an isolation, and a
 * turnover alone does not establish a fast break.
 *
 * Plan connected possessions, not isolated animations:
 * - Use the possession origin, game-clock gaps, interruptions, shot descriptors
 *   and linked rebounds to choose a plausible transition or half-court buildup.
 * - Work backward from recorded finishes, but stage the approach in time.
 *   Preserve positional continuity instead of parking the next shooter at the
 *   final spot for the entire possession. Lookahead may inform positioning;
 *   stage plausible reactions instead of anticipating exact rebound or
 *   interception points.
 * - Coordinate the ball, its receiver and off-ball space. Time passes to arriving
 *   receivers; clear drive/pass corridors and fill useful vacant spots. Holding
 *   an open spot is purposeful too: do not move everyone after every pass.
 * - Keep roles useful and flexible, with recorded involvement taking priority.
 *   During a normal PG-led advance, teammates fill their spots ahead of the ball;
 *   do not manufacture a trailing big man or force an evidenced outside shooter
 *   into the paint. An inbounder or rebounder can trail until releasing the ball.
 * - Preserve defensive assignments while reacting to both the ball and danger:
 *   protect the rim in transition, shade toward help, then recover or close out
 *   after a pass. Avoid rigidly copying an attacker's path at a fixed offset.
 *
 * Prefer simple, feasible routes: straight runs, perimeter arcs and deliberate
 * cuts with acceleration and braking. Resolve crossings through planned spacing,
 * one detour or yielding, not repeated weaving or decorative motion.
 * Compare a small set of plausible sequences by continuity, travel time, spacing,
 * pass-lane clearance and unnecessary movement. When time or evidence is scarce,
 * simplify the choreography rather than forcing an elaborate sequence to fit.
 *
 * Compile every choice deterministically into the same replay timebase so play,
 * pause, speed changes and seeking agree. Game-clock gaps guide live-action
 * budgets; wall-clock timestamps must not turn stoppages into extra running time.
 *
 * Success means each movement has a readable purpose, the next action follows
 * naturally, and all recorded anchors survive.
 */

import { animateShot, flyBall, getDriveStart, getShotEntry, getShotStyle, landPlayers } from "./replay-shots.js";
import { movePlayers } from "./replay-motion.js";
import { getLeague } from "./replay-leagues.js";

const SLOT_ORDER = ["PG", "SG", "SF", "PF", "C"];
const FALLBACK_SPACING = [[62, 25], [70, 10], [73, 40], [79, 17], [83, 31]];

export function clockSeconds(clock) {
	const match = clock.match(/^PT(?:(\d+)M)?([\d.]+)S$/);
	return Number(match[1] || 0) * 60 + Number(match[2]);
}

function otherTeam(data, teamId) {
	return data.teams.find((team) => team.id !== teamId).id;
}

export function attackDirection(data, teamId, period) {
	const homeId = data.teams.find((team) => team.home).id;
	const evidence = data.actions.find((action) => action.isFieldGoal && ["left", "right"].includes(action.side));
	// The feed's basket side is independent of home/away; both teams switch at halftime.
	const homeFirstHalfDirection = evidence
		? (evidence.side === "right" ? 1 : -1) * (evidence.teamId === homeId ? 1 : -1) *
			(evidence.period <= 2 ? 1 : -1)
		: 1;
	return homeFirstHalfDirection * ((teamId === homeId) === (period <= 2) ? 1 : -1);
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
		if (scene.kind === "freethrow" && action.descriptor === "flagrant") {
			scene.flagrantFreeThrow = true;
		}
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

function linkRebounds(scenes) {
	const shotIndices = new Map(scenes.map((scene, index) => [scene.action.actionNumber, index]));
	scenes.forEach((scene, index) => {
		if (scene.kind !== "rebound") {
			return;
		}
		const shotIndex = scene.action.shotActionNumber === undefined || scene.action.shotActionNumber === null
			? index - 1
			: shotIndices.get(scene.action.shotActionNumber);
		const shot = scenes[shotIndex];
		if (
			!shot || shotIndex >= index || shot.action.period !== scene.action.period ||
			!["2pt", "3pt", "heave", "freethrow"].includes(shot.kind) ||
			shot.action.shotResult === "Made" || (shot.action.shotResult !== "Missed" && shot.kind !== "heave") ||
			shot.reboundSceneIndex !== undefined
		) {
			return;
		}
		let liveFreeThrow = true;
		if (shot.kind === "freethrow") {
			const sequence = shot.action.subType.match(/(\d) of (\d)/);
			liveFreeThrow = !shot.flagrantFreeThrow && shot.action.descriptor !== "technical" &&
				!shot.action.qualifiers?.includes("technical") &&
				(!sequence || sequence[1] === sequence[2]);
		}
		const between = scenes.slice(shotIndex + 1, index);
		if (between.some((item) => ["2pt", "3pt", "heave", "freethrow", "rebound", "period"].includes(item.kind))) {
			return;
		}
		scene.reboundShotIndex = shotIndex;
		shot.reboundSceneIndex = index;
		// Only standalone block annotations may extend the live rebound choreography.
		scene.reboundContinuous = liveFreeThrow && between.every((item) => item.kind === "block");
		shot.reboundContinuous = scene.reboundContinuous;
	});
}

function planShotClockPressure(scenes) {
	scenes.forEach((scene, index) => {
		if (scene.kind !== "turnover" || scene.action.subType !== "shot clock") {
			return;
		}
		scene.shotClockPressure = true;
		const teamId = scene.action.teamId;
		for (let i = index - 1; i >= 0; i--) {
			const previous = scenes[i];
			if (
				previous.action.period !== scene.action.period ||
				["period", "game", "jumpball", "turnover", "steal", "foul", "freethrow", "violation"]
					.includes(previous.kind)
			) {
				break;
			}
			if (previous.kind === "rebound") {
				if (previous.action.teamId !== teamId || previous.action.subType !== "offensive") {
					break;
				}
			} else if (["2pt", "3pt", "heave"].includes(previous.kind)) {
				if (previous.action.teamId !== teamId || previous.action.shotResult === "Made") {
					break;
				}
				// A late miss may precede the violation; retain it instead of inventing a fresh clock.
				previous.shotClockPressure = true;
			}
		}
	});
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
function findOpenSpace(origin, occupied, lane = null, interior = false, guard = false, backcourt = false) {
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
	const radius = Math.hypot(best[0] - 88.75, best[1] - 25);
	let bestScore = (interior && radius > 12) || (guard && radius < 22) ? Infinity : score(best);
	for (let x = backcourt ? 8 : 58; x <= (backcourt ? 43 : 88); x += 5) {
		for (let y = 5; y <= 45; y += 5) {
			if ((interior && Math.hypot(x - 88.75, y - 25) > 12) || (guard && Math.hypot(x - 88.75, y - 25) < 22)) {
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

function planContinuation(replay, scene, lineup, direction) {
	const rebound = scene.reboundContinuous ? replay.scenes[scene.reboundSceneIndex] : null;
	if (
		!["2pt", "3pt"].includes(scene.kind) || !rebound?.action.personId ||
		rebound.action.teamId !== scene.action.teamId || rebound.action.subType !== "offensive"
	) {
		return null;
	}
	let nextIndex = scene.reboundSceneIndex + 1;
	while (replay.scenes[nextIndex]?.kind === "block") {
		nextIndex++;
	}
	const next = replay.scenes[nextIndex];
	if (
		!next || !["2pt", "3pt"].includes(next.kind) || next.action.teamId !== scene.action.teamId ||
		next.action.period !== scene.action.period || !lineup.includes(next.action.personId) ||
		[lineup[0], scene.action.personId, scene.action.assistPersonId, rebound.action.personId]
			.includes(next.action.personId)
	) {
		return null;
	}
	const style = getShotStyle(scene.action);
	const nextStyle = getShotStyle(next.action);
	if (style.tip || style.putback || nextStyle.tip || nextStyle.putback) {
		return null;
	}
	const hoop = { x: direction === 1 ? 88.75 : 5.25, y: 25 };
	const shot = { x: next.action.x * 0.94, y: next.action.y * 0.5 };
	const target = getShotEntry({ action: next.action, shotStyle: nextStyle }, shot, hoop, direction);
	if ((target.x - 47) * direction < 7 || (scene.action.x * 0.94 - 47) * direction < 0) {
		return null;
	}
	return { playerId: next.action.personId, actionNumber: next.action.actionNumber, target };
}

function planFormation(replay, index, offense, direction, lineup, state) {
	let evidence = null;
	let evidenceIndex = -1;
	let foulIndex = -1;
	// The current lineup can only anchor finishes before its next substitution.
	for (let i = index; i < replay.scenes.length; i++) {
		const candidate = replay.scenes[i];
		if (
			candidate.action.period !== replay.scenes[index].action.period ||
			(candidate.kind === "substitution" && candidate.related.some((action) => action.teamId === offense)) ||
			(candidate.kind === "rebound" && candidate.action.teamId !== offense) ||
			(["2pt", "3pt", "heave", "turnover", "freethrow"].includes(candidate.kind) &&
				candidate.action.teamId !== offense)
		) {
			break;
		}
		if (
			candidate.kind === "foul" && candidate.action.descriptor === "shooting" &&
			lineup.includes(candidate.action.foulDrawnPersonId)
		) {
			foulIndex = i;
			break;
		}
		if (["2pt", "3pt", "heave"].includes(candidate.kind)) {
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
	const foul = replay.scenes[foulIndex]?.action;
	const shooterId = evidence?.personId ?? foul?.foulDrawnPersonId ?? null;
	const shooterSlot = lineup.indexOf(shooterId);
	const foulPlan = foul
		? planShootingFoul(
			replay.scenes,
			foulIndex,
			{
				x: direction === 1 ? slots[shooterSlot][0] : 94 - slots[shooterSlot][0],
				y: slots[shooterSlot][1],
			},
			{ x: direction === 1 ? 88.75 : 5.25, y: 25 },
			direction,
			replay.league.threePointRadius,
		)
		: null;
	const assistSlot = evidence ? lineup.indexOf(evidence.assistPersonId) : -1;
	const style = evidence ? getShotStyle(evidence) : foulPlan ? { driving: foulPlan.freeThrows === 2 } : null;
	const shot = evidence
		? evidence.actionType === "heave"
			? { x: Math.max(1, Math.min(93, 88.75 - (evidence.shotDistance || 45))), y: 25 }
			: { x: direction === 1 ? evidence.x * 0.94 : 94 - evidence.x * 0.94, y: evidence.y * 0.5 }
		: foulPlan
		? { x: direction === 1 ? foulPlan.point.x : 94 - foulPlan.point.x, y: foulPlan.point.y }
		: null;
	const backcourt = Boolean(shot && shot.x < 47);
	const continuation = evidence ? planContinuation(replay, replay.scenes[evidenceIndex], lineup, direction) : null;
	const continuationSlot = continuation ? lineup.indexOf(continuation.playerId) : -1;
	let interiorSlot = -1;
	// Plan only the space needed by the recorded finish; no template implies a real set play.
	if (shot && !backcourt) {
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
			if (evidence) {
				const drive = getDriveStart({
					action: evidence,
					shotStyle: style,
					shooterPosition: state.players.find((player) => player.id === shooterId).position,
					threePointRadius: replay.league.threePointRadius,
				}, { x: direction === 1 ? shot.x : 94 - shot.x, y: shot.y },
				{ x: direction === 1 ? 88.75 : 5.25, y: 25 }, direction);
				if (drive) {
					slots[shooterSlot] = [direction === 1 ? drive.x : 94 - drive.x, drive.y];
				}
			}
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
			const position = state.players.find((player) => player.id === lineup[assistSlot]).position;
			if (["PG", "SG", "G", "G-F"].includes(position) &&
				Math.hypot(slots[assistSlot][0] - 88.75, slots[assistSlot][1] - 25) < 22) {
				slots[assistSlot] = [66, Math.max(13, Math.min(37, y))];
			}
		}
		if (continuation) {
			const target = continuation.target;
			// Keep the next receiver on the useful side, with a short remaining route during this finish.
			slots[continuationSlot] = [
				Math.max(54, Math.min(89, (direction === 1 ? target.x : 94 - target.x) - 6)),
				Math.max(4, Math.min(46, target.y + (target.y < 25 ? 6 : -6))),
			];
		}
		const shotScene = replay.scenes[evidenceIndex];
		const rebound = shotScene?.reboundContinuous ? replay.scenes[shotScene.reboundSceneIndex] : null;
		const rebounderSlot = rebound?.action.teamId === offense ? lineup.indexOf(rebound.action.personId) : -1;
		const available = lineup.map((_, slot) => slot).filter((slot) =>
			slot !== shooterSlot && slot !== assistSlot && slot !== continuationSlot
		);
		const bigs = available.filter((slot) =>
			["C", "PF", "F-C", "C-F"].includes(state.players.find((player) => player.id === lineup[slot]).position)
		);
		const centers = bigs.filter((slot) =>
			["C", "C-F", "F-C"].includes(state.players.find((player) => player.id === lineup[slot]).position)
		);
		const insideCandidates = centers.length ? centers : bigs.length ? bigs : available;
		interiorSlot = insideCandidates.includes(rebounderSlot)
			? rebounderSlot
			: insideCandidates.reduce((best, slot) =>
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
	if (!shot && !backcourt) {
		const bigs = lineup.map((id, slot) => ({ slot, position: state.players.find((player) => player.id === id).position }))
			.filter(({ slot, position }) => slot !== 0 && ["C", "C-F", "F-C", "PF"].includes(position));
		const interior = bigs.find(({ position }) => ["C", "C-F", "F-C"].includes(position)) ?? bigs[0];
		if (interior) {
			interiorSlot = interior.slot;
			if (Math.hypot(slots[interiorSlot][0] - 88.75, slots[interiorSlot][1] - 25) > 12) {
				slots[interiorSlot] = [82, slots[interiorSlot][1] < 25 ? 18 : 32];
			}
		}
	}
	if (backcourt) {
		// Keep outlets spread behind half court until the recorded long-range release.
		lineup.forEach((_, slot) => {
			slots[slot] = [Math.max(8, Math.min(41, shot.x + [0, 5, 9, -7, -12][slot])), [25, 8, 42, 13, 36][slot]];
		});
		if (shooterSlot >= 0) {
			slots[shooterSlot] = [Math.max(2, shot.x - (style.running ? 12 : style.pullup ? 7 : 0)), shot.y];
		}
		if (assistSlot >= 0 && assistSlot !== shooterSlot) {
			slots[assistSlot] = [Math.max(4, Math.min(40, shot.x - 9)), shot.y < 25 ? 34 : 16];
		}
	}
	if (!backcourt && shooterSlot !== 0 && assistSlot !== 0 && interiorSlot !== 0) {
		slots[0] = [Math.min(67, slots[0][0]), Math.max(13, Math.min(37, slots[0][1]))];
	}
	const priority = [
		...new Set(
			[shooterSlot, assistSlot, continuationSlot, interiorSlot, 0, 1, 2, 3, 4].filter((slot) => slot >= 0),
		),
	];
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
						Math.max(backcourt ? 2 : 54, Math.min(backcourt ? 45 : 89, other[0] + Math.cos(angle) * 6)),
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
			if (slot === shooterSlot || slot === assistSlot || slot === continuationSlot) {
				continue;
			}
			const occupied = slots.filter((_, other) => other !== slot);
			slots[slot] = findOpenSpace(
				slots[slot],
				occupied,
				lane,
				slot === interiorSlot,
				!backcourt && slot !== interiorSlot &&
					["PG", "SG", "G", "G-F"].includes(state.players.find((player) => player.id === lineup[slot]).position),
				backcourt,
			);
		}
	}
	const formation = {
		id: replay.formations.length,
		offense,
		period: replay.scenes[index].action.period,
		kind: backcourt
			? "backcourt-spacing"
			: evidence
			? "event-spacing"
			: foul
			? "foul-spacing"
			: state.formation
			? "continuity"
			: "fallback",
		backcourt,
		evidenceActionNumber: evidence?.actionNumber ?? null,
		shooterId,
		foulActionNumber: foul?.actionNumber ?? null,
		foulPlan,
		assistId: evidence?.assistPersonId ?? null,
		interiorId: interiorSlot >= 0 ? lineup[interiorSlot] : null,
		interiorSlot,
		continuation,
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

function planAttackContext(replay, index, offense, state) {
	const scene = replay.scenes[index];
	let origin = state.restart ? "inbound" : "continuity";
	let interrupted = Boolean(state.restart);
	for (let i = index - 1; i >= 0; i--) {
		const previous = replay.scenes[i];
		if (previous.action.period !== scene.action.period ||
			["timeout", "period", "foul", "freethrow", "violation"].includes(previous.kind)) {
			interrupted = true;
			break;
		}
		if (previous.kind === "rebound") {
			origin = previous.action.teamId === offense && previous.action.subType === "offensive"
				? "second-chance" : "rebound-outlet";
			break;
		}
		if (previous.kind === "turnover" || previous.kind === "steal") {
			origin = previous.action.stealPersonId || previous.kind === "steal" ? "steal" : "inbound";
			break;
		}
		if (["2pt", "3pt", "heave", "jumpball"].includes(previous.kind)) {
			origin = previous.kind === "jumpball" ? "tip" : origin;
			break;
		}
	}
	const style = scene.shotStyle;
	const quick = scene.liveSeconds > 0 && scene.liveSeconds <= 8 && origin !== "second-chance" &&
		(!interrupted || style?.running || style?.family === "layup" || style?.family === "dunk");
	return { origin, interrupted, quick, liveSeconds: scene.liveSeconds };
}

function planReceivingEntry(state, scene, direction) {
	if (!scene.shotEntry || scene.liveSeconds < 14 || scene.immediateReboundFinish ||
		scene.formation.backcourt || scene.shotStyle.tip || scene.shotStyle.putback ||
		scene.formation.continuation?.playerId === scene.action.personId) {
		return;
	}
	const lineup = state.lineups[scene.attackTeam];
	const slot = lineup.indexOf(scene.action.personId);
	const [x, y] = scene.formation.origins[slot];
	const origin = { x: direction === 1 ? x : 94 - x, y };
	const entry = scene.shotEntry;
	const hoop = scene.hoop;
	const radius = Math.hypot(entry.x - hoop.x, entry.y - hoop.y);
	const angle = Math.atan2(entry.y - hoop.y, entry.x - hoop.x);
	const candidates = [entry, ...[-0.24, 0.24].map((turn) => ({
		x: hoop.x + Math.cos(angle + turn) * radius,
		y: hoop.y + Math.sin(angle + turn) * radius,
	})), { x: entry.x - direction * 6, y: entry.y }];
	const occupied = scene.formation.slots.filter((_, i) => i !== slot)
		.map(([x, y]) => ({ x: direction === 1 ? x : 94 - x, y }));
	const score = (point) => {
		const approach = Math.hypot(entry.x - point.x, entry.y - point.y);
		if (point.x < 2 || point.x > 92 || point.y < 3 || point.y > 47 ||
			(point.x - 47) * direction < 7 || approach > 8 || (approach > 0 && approach < 3)) {
			return Infinity;
		}
		return Math.hypot(point.x - origin.x, point.y - origin.y) + approach * 0.25 +
			occupied.reduce((sum, other) => sum + Math.max(0, 7 - Math.hypot(point.x - other.x, point.y - other.y)) ** 2, 0);
	};
	const sorted = candidates.map((point) => ({ point, cost: score(point) })).sort((a, b) => a.cost - b.cost);
	if (sorted[0].point !== entry && sorted[0].cost + 1 < score(entry)) {
		scene.stagedEntry = { ...sorted[0].point };
		scene.receivingCandidates = sorted.map(({ point, cost }) => ({ ...point, cost }));
	}
}

function reactDefense(state, scene, matchups, contacts, direction, delay) {
	const hoop = scene.hoop ?? { x: direction === 1 ? 88.75 : 5.25, y: 25 };
	const ball = state.positions[state.ball.owner] ?? state.ball;
	const driving = state.ball.dribble && Math.hypot(ball.x - hoop.x, ball.y - hoop.y) < 18;
	if (driving && !scene.helpDefender) {
		const eligible = Object.entries(matchups).filter(([id, attacker]) =>
			attacker !== state.ball.owner && !contacts.has(Number(id)) &&
			!scene.formation.contactMatchups.some((contact) => contact.defender === Number(id))
		);
		eligible.sort(([a], [b]) => Math.hypot(state.positions[a].x - ball.x, state.positions[a].y - ball.y) -
			Math.hypot(state.positions[b].x - ball.x, state.positions[b].y - ball.y));
		if (eligible.length) {
			scene.helpDefender = Number(eligible[0][0]);
		}
	}
	for (const [id, attacker] of Object.entries(matchups)) {
		if (contacts.has(Number(id))) {
			continue;
		}
		const player = state.positions[id];
		const target = state.positions[attacker];
		const onBall = attacker === state.ball.owner;
		const distance = Math.hypot(hoop.x - target.x, hoop.y - target.y) || 1;
		const reach = onBall ? 3.2 : 3.6;
		let x = target.x + (hoop.x - target.x) / distance * reach;
		let y = target.y + (hoop.y - target.y) / distance * reach;
		if (!onBall) {
			const shade = Number(id) === scene.helpDefender && driving ? 0.45 : 0.13;
			const dx = ball.x - x;
			const dy = ball.y - y;
			const scale = Math.min(shade, 6 / (Math.hypot(dx, dy) || 1));
			x += dx * scale;
			y += dy * scale;
		}
		x = Math.max(1, Math.min(93, x));
		y = Math.max(2, Math.min(48, y));
		const travel = Math.hypot(x - player.x, y - player.y);
		const fraction = Math.min(1 - Math.exp(-delay / 0.16), delay * 16 / (travel || 1));
		player.x += (x - player.x) * fraction;
		player.y += (y - player.y) * fraction;
	}
}

function advanceFormation(state, scene, offense, direction, targets, record, duration, inbounder = null) {
	const lineup = state.lineups[offense];
	const origins = Object.fromEntries(Object.entries(state.positions).map(([id, point]) => [id, { ...point }]));
	// A live foul may interrupt the advance before either team reaches its set positions.
	if (scene.kind === "foul" && scene.action.descriptor !== "shooting" && scene.liveSeconds > 0) {
		const progress = Math.min(1, scene.liveSeconds / 8);
		scene.foulAdvance = { progress, ballHandler: lineup[0] };
		for (const id of Object.values(state.lineups).flat()) {
			const fraction = id === lineup[0] ? progress : Math.min(1, progress * 1.25);
			targets[id].x = origins[id].x + (targets[id].x - origins[id].x) * fraction;
			targets[id].y = origins[id].y + (targets[id].y - origins[id].y) * fraction;
		}
	}
	const longest = Math.max(...lineup.map((id) =>
		Math.hypot(targets[id].x - origins[id].x, targets[id].y - origins[id].y)
	));
	if (longest < 24 || scene.formation.backcourt) {
		for (const id of Object.values(state.lineups).flat()) {
			Object.assign(state.positions[id], targets[id]);
		}
		record(duration);
		return;
	}
	const offBall = lineup.slice(1);
	const wings = lineup.slice(1, 4).filter((id) => id !== inbounder).slice(0, 2);
	const quick = scene.attackContext.quick;
	const variant = quick ? "quick-push" : state.restart === "baseline" && scene.liveSeconds >= 12
		? "patient-inbound" : state.needsAdvance ? "live-outlet" : "spread-inbound";
	const progressions = variant === "quick-push"
		? { wing: [0.86, 1, 1], guard: [0.6, 0.94, 1], inside: [0.8, 1, 1] }
		: variant === "patient-inbound"
		? { wing: [0.72, 1, 1], guard: [0.4, 0.78, 1], inside: [0.7, 1, 1] }
		: variant === "live-outlet"
		? { wing: [0.8, 1, 1], guard: [0.5, 0.87, 1], inside: [0.76, 1, 1] }
		: { wing: [0.76, 1, 1], guard: [0.44, 0.8, 1], inside: [0.72, 1, 1] };
	const run = {
		variant,
		start: scene.frames.at(-1).time,
		ballHandler: lineup[0],
		offBall,
		inbounder,
		wings,
		stages: [],
	};
	const total = Math.max(duration, longest / 12);
	// Retreat to protect the basket before closing out to individual assignments.
	const retreat = {};
	for (const id of Object.values(state.lineups).flat().filter((id) => !lineup.includes(id))) {
		const depth = direction === 1 ? origins[id].x : 94 - origins[id].x;
		const targetDepth = direction === 1 ? targets[id].x : 94 - targets[id].x;
		const x = Math.max(depth, Math.min(84, targetDepth + 6));
		retreat[id] = { x: direction === 1 ? x : 94 - x, y: 25 + (targets[id].y - 25) * 0.4 };
	}
	for (let stage = 0; stage < 3; stage++) {
		for (const id of Object.values(state.lineups).flat()) {
			const from = origins[id];
			const target = targets[id];
			let point;
			if (lineup.includes(id)) {
				const progress = wings.includes(id) ? progressions.wing
					: id === lineup[0] ? progressions.guard
					: progressions.inside;
				const fraction = progress[stage];
				point = { x: from.x + (target.x - from.x) * fraction, y: from.y + (target.y - from.y) * fraction };
				if (wings.includes(id) && stage === 0) {
					const targetDepth = direction === 1 ? target.x : 94 - target.x;
					const rimRun = quick && targetDepth > 78 && id === wings[0];
					const lane = rimRun ? (target.y < 25 ? 20 : 30) : target.y < 25 ? 7 : 43;
					point.y += (lane - point.y) * 0.65;
				}
			} else {
				const inside = retreat[id];
				const fraction = (quick ? [0.95, 1, 1] : [0.8, 1, 1])[stage];
				const closeout = (quick ? [0.1, 0.6, 1] : [0, 0.45, 1])[stage];
				point = {
					x: from.x + (inside.x - from.x) * fraction + (target.x - inside.x) * closeout,
					y: from.y + (inside.y - from.y) * fraction + (target.y - inside.y) * closeout,
				};
			}
			Object.assign(state.positions[id], point);
		}
		const start = scene.frames.at(-1).time;
		record(total * [0.45, 0.32, 0.23][stage]);
		run.stages.push({ start, end: scene.frames.at(-1).time, phase: stage === 0 ? "retreat" : "matchup" });
	}
	run.end = scene.frames.at(-1).time;
	scene.transitionRuns ??= [];
	scene.transitionRuns.push(run);
}

function prepareAttack(state, scene, offense, direction, matchups, record, data, replay, index) {
	const lineup = state.lineups[offense];
	const pg = lineup[0];
	const advanceScale = scene.liveSeconds > 0 ? Math.max(0.65, Math.min(1.8, scene.liveSeconds / 8)) : 1;
	const changed = state.possession !== offense;
	// A made basket can be followed by an and-one or a retained-possession penalty.
	if (state.restart === "baseline" && !changed) {
		state.restart = null;
	}
	const restart = state.restart;
	const carrier = state.ball.owner;
	const origin = carrier ? { ...state.positions[carrier] } : { ...state.ball };
	scene.attackTeam = offense;
	scene.attackContext = planAttackContext(replay, index, offense, state);
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
	planReceivingEntry(state, scene, direction);
	const entry = scene.stagedEntry ?? scene.shotEntry;
	if (!restart && !changed && !state.needsAdvance && carrier) {
		if (scene.shotEntry) {
			Object.assign(state.positions[scene.action.personId], entry);
		}
		for (const [defender, attacker] of Object.entries(matchups)) {
			const target = state.positions[attacker];
			Object.assign(state.positions[defender], {
				x: Math.max(1, Math.min(93, target.x + direction * 3.6)),
				y: target.y + (25 - target.y) * 0.09,
			});
		}
		record(0.01);
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
	const origins = Object.fromEntries(Object.entries(state.positions).map(([id, position]) => [id, { ...position }]));
	const buildup = destinations.map((point, slot) => {
		return scene.shotEntry && lineup[slot] === scene.action.personId
			? [direction === 1 ? entry.x : 94 - entry.x, entry.y]
			: point;
	});
	placeFormation(state, offense, direction, matchups, data, buildup);
	const targets = Object.fromEntries(Object.entries(state.positions).map(([id, position]) => [id, { ...position }]));
	if (restart) {
		const inboundPoint = restart === "baseline"
			? { x: direction === 1 ? -1.5 : 95.5, y: 30 }
			: restart === "flagrant"
			? { x: direction === 1 ? 75 : 19, y: 51.5 }
			: { x: state.formation.backcourt ? direction === 1 ? 34 : 60 : 47, y: 51.5 };
		const inbounder = lineup.filter((id) => id !== pg).reduce((closest, id) =>
			Math.hypot(origins[id].x - inboundPoint.x, origins[id].y - inboundPoint.y) <
					Math.hypot(origins[closest].x - inboundPoint.x, origins[closest].y - inboundPoint.y)
				? id
				: closest
		);
		// Teammates begin advancing while the nearest inbounder and the guard set up the restart.
		for (const id of Object.values(state.lineups).flat()) {
			const slot = lineup.indexOf(id);
			const fraction = restart !== "baseline" ? 0.25 : 0.4;
			state.positions[id].x = origins[id].x + (targets[id].x - origins[id].x) * fraction;
			state.positions[id].y = origins[id].y + (targets[id].y - origins[id].y) * fraction;
			if (restart === "baseline" && slot === -1) {
				state.positions[id].y += (25 - state.positions[id].y) * 0.25;
			}
		}
		Object.assign(state.positions[inbounder], inboundPoint);
		Object.assign(
			state.positions[pg],
			restart === "baseline" ? { x: direction === 1 ? 15 : 79, y: 28 } : { x: inboundPoint.x, y: 40 },
		);
		state.ball.owner = inbounder;
		record(0.85);
		state.ball.owner = pg;
		record(0.45);
		// Inbound setup takes replay time without consuming the game clock.
		scene.liveAt = scene.frames.at(-1).time;
		advanceFormation(state, scene, offense, direction, targets, record, 1.2 * advanceScale, inbounder);
	} else if (!changed && carrier && state.needsAdvance) {
		// Keep the rebounder or stealer at the catch while teammates and the outlet advance together.
		for (const id of Object.values(state.lineups).flat()) {
			const slot = lineup.indexOf(id);
			const fraction = slot === -1 ? 0.4 : 0.3;
			state.positions[id].x = origins[id].x + (targets[id].x - origins[id].x) * fraction;
			state.positions[id].y = origins[id].y + (targets[id].y - origins[id].y) * fraction;
		}
		Object.assign(state.positions[carrier], origin);
		if (carrier !== pg) {
			Object.assign(state.positions[pg], {
				x: direction === 1
					? Math.max(12, Math.min(state.formation.backcourt ? 44 : 82, origin.x + 6))
					: Math.max(state.formation.backcourt ? 50 : 12, Math.min(82, origin.x - 6)),
				y: 25,
			});
		}
		record(0.3);
		if (carrier !== pg) {
			state.ball.owner = pg;
			record(0.4);
		}
		advanceFormation(state, scene, offense, direction, targets, record, 1.1 * advanceScale);
	} else {
		state.ball.owner = pg;
		for (const id of Object.values(state.lineups).flat()) {
			Object.assign(state.positions[id], origins[id]);
		}
		if (scene.frames.at(-1).ball.owner !== pg) {
			// Establish the catch before the guard begins the advance.
			record(0.35);
		}
		advanceFormation(state, scene, offense, direction, targets, record, 0.85 * advanceScale);
	}
	state.restart = null;
	state.needsAdvance = false;
}

function preparationPosition(state, scene, id, time) {
	const arrival = scene.arrivalMove?.id === id ? scene.arrivalMove : null;
	const move = arrival ?? scene.spacingMoves?.find((move) => move.id === id && move.duration);
	if (!move) {
		return state.positions[id];
	}
	const fraction = Math.max(0, Math.min(1, (time - move.startAt) / move.duration));
	return { x: move.from.x + (move.x - move.from.x) * fraction, y: move.from.y + (move.y - move.from.y) * fraction };
}

function relocatePasser(state, scene, id, receiver, time, remaining) {
	const moves = scene.spacingMoves;
	if (!["2pt", "3pt"].includes(scene.kind) || moves.length >= 2 || remaining < 1 ||
		[scene.action.personId, scene.action.assistPersonId, scene.formation.interiorId,
			scene.continuationMove?.playerId].includes(id) || moves.some((move) => move.id === id)) {
		return;
	}
	const direction = scene.hoop?.x < 47 ? -1 : 1;
	const local = (point) => [direction === 1 ? point.x : 94 - point.x, point.y];
	const origin = state.positions[id];
	const occupied = state.lineups[scene.attackTeam].filter((other) => other !== id)
		.map((other) => local(preparationPosition(state, scene, other, time + remaining)));
	const ball = local(state.positions[receiver]);
	const finish = local(scene.shotPoint ?? state.positions[receiver]);
	const [x, y] = local(origin);
	const dx = finish[0] - ball[0];
	const dy = finish[1] - ball[1];
	const lane = [ball, finish];
	const position = state.players.find((player) => player.id === id).position;
	const target = findOpenSpace([x, y], occupied, lane, false,
		["PG", "SG", "G", "G-F"].includes(position), scene.formation.backcourt);
	const defenders = Object.keys(scene.matchups).map((id) => local(state.positions[id]));
	const score = ([px, py]) => {
		if (px < (scene.formation.backcourt ? 2 : 54) || px > (scene.formation.backcourt ? 45 : 92) || py < 3 || py > 47) {
			return Infinity;
		}
		let cost = Math.hypot(px - x, py - y) * 0.2;
		for (const [ox, oy] of occupied) {
			cost += Math.max(0, 9 - Math.hypot(px - ox, py - oy)) ** 2;
		}
		const fraction = Math.max(0, Math.min(1, ((px - ball[0]) * dx + (py - ball[1]) * dy) / (dx * dx + dy * dy || 1)));
		cost += Math.max(0, 5 - Math.hypot(px - ball[0] - dx * fraction, py - ball[1] - dy * fraction)) ** 2;
		// A passer may relocate to reopen a return lane; an already open option holds.
		const bx = px - ball[0];
		const by = py - ball[1];
		for (const [ox, oy] of defenders) {
			cost += Math.max(0, 3 - Math.hypot(px - ox, py - oy)) ** 2 * 3;
			const along = ((ox - ball[0]) * bx + (oy - ball[1]) * by) / (bx * bx + by * by || 1);
			if (along > 0.1 && along < 0.9) {
				cost += Math.max(0, 3 - Math.hypot(ox - ball[0] - bx * along, oy - ball[1] - by * along)) ** 2 * 3;
			}
		}
		return cost;
	};
	const options = [target, [x, y - 5], [x, y + 5], [x - 4, y - 3], [x - 4, y + 3]].map(([px, py]) => {
		const fraction = Math.min(1, 6 / (Math.hypot(px - x, py - y) || 1),
			remaining * 4 / (Math.hypot(px - x, py - y) || 1));
		return [x + (px - x) * fraction, y + (py - y) * fraction];
	});
	options.sort((a, b) => score(a) - score(b));
	const best = options[0];
	const distance = Math.hypot(best[0] - x, best[1] - y);
	if (distance < 2 || score(best) + 1 >= score([x, y])) {
		return;
	}
	moves.push({ id, x: direction === 1 ? best[0] : 94 - best[0], y: best[1],
		from: { ...origin }, startAt: time, duration: remaining, reason: "pass-and-space" });
}

function circulateBall(state, scene, duration, record) {
	const owner = state.ball.owner;
	const start = scene.frames.at(-1).time;
	const moving = new Set();
	if (scene.continuationMove) {
		moving.add(scene.continuationMove.playerId);
	}
	const receivers = state.lineups[scene.attackTeam].filter((id) => !moving.has(id));
	const finish = ["2pt", "3pt"].includes(scene.kind)
		? scene.action.assistPersonId || scene.action.personId
		: scene.action.personId && scene.kind === "turnover"
		? scene.action.personId
		: scene.kind === "foul"
		? owner
		: null;
	const defenders = Object.keys(scene.matchups).map((id) => state.positions[id]);
	const candidates = [];
	for (const passCount of duration >= 10 ? [2, 3] : [2]) {
		let paths = [[owner]];
		for (let step = 0; step < passCount; step++) {
			const nextPaths = [];
			for (const path of paths) {
				const at = start + duration * (step + 1) / (passCount + 1);
				const from = preparationPosition(state, scene, path.at(-1), at);
				const targets = step === passCount - 1 && finish ? [finish] : receivers.slice().sort((a, b) => {
					const first = state.positions[a];
					const second = state.positions[b];
					return Math.hypot(first.x - from.x, first.y - from.y) -
						Math.hypot(second.x - from.x, second.y - from.y);
				});
				for (const id of targets) {
					if (id === path.at(-1) || (path.includes(id) && !(step === passCount - 1 && id === finish))) {
						continue;
					}
					const to = preparationPosition(state, scene, id, at + 0.7);
					const dx = to.x - from.x;
					const dy = to.y - from.y;
					const length = Math.hypot(dx, dy);
					if (
						length < 6 || length > 32 || defenders.some((defender) => {
							const fraction = ((defender.x - from.x) * dx + (defender.y - from.y) * dy) / length ** 2;
							return fraction > 0.1 && fraction < 0.9 &&
								Math.hypot(defender.x - from.x - dx * fraction, defender.y - from.y - dy * fraction) < 2.5;
						})
					) {
						continue;
					}
					nextPaths.push([...path, id]);
				}
			}
			paths = nextPaths;
		}
		candidates.push(...paths);
	}
	const score = (path) => path.slice(1).reduce((cost, id, i) => {
		const at = start + duration * (i + 1) / path.length;
		const from = preparationPosition(state, scene, path[i], at);
		const to = preparationPosition(state, scene, id, at + 0.7);
		const distance = Math.hypot(to.x - from.x, to.y - from.y);
		const clearance = Math.min(...defenders.map((defender) => {
			const u = Math.max(0.1, Math.min(0.9,
				((defender.x - from.x) * (to.x - from.x) + (defender.y - from.y) * (to.y - from.y)) / distance ** 2));
			return Math.hypot(defender.x - from.x - (to.x - from.x) * u,
				defender.y - from.y - (to.y - from.y) * u);
		}));
		return cost + distance * 0.04 + Math.max(0, 5 - clearance) ** 2;
	}, (path.length - 1) * 0.5);
	const ranked = candidates.filter((candidate) => new Set(candidate).size >= 3)
		.map((path) => ({ path, cost: score(path) })).sort((a, b) => a.cost - b.cost);
	const path = ranked[0]?.path;
	if (!path) {
		return false;
	}
	scene.preparationChoices = { candidates: ranked.length, cost: ranked[0].cost };
	const passCount = path.length - 1;
	// Fixed flight windows make moving catch points predictable before recording frames.
	const flight = 0.85;
	const hold = (duration - passCount * (flight + 0.02)) / (passCount + 1);
	scene.preparationPasses = [];
	record(hold);
	for (let i = 0; i < passCount; i++) {
		const releaseAt = scene.frames.at(-1).time + 0.01;
		const receiver = preparationPosition(state, scene, path[i + 1], releaseAt + flight);
		releaseBall(state);
		record(0.01);
		flyBall(state, record, { x: receiver.x + 1, y: receiver.y + 0.8, z: 0.5 }, 0.6, flight);
		state.ball.owner = path[i + 1];
		state.ball.dribble = true;
		record(0.01);
		scene.preparationPasses.push({ from: path[i], to: path[i + 1], releaseAt, catchAt: scene.frames.at(-1).time });
		if (!path.slice(i + 1).includes(path[i])) {
			relocatePasser(state, scene, path[i], path[i + 1], scene.frames.at(-1).time,
				start + duration - scene.frames.at(-1).time);
		}
		record(hold);
	}
	return true;
}

function animateSteal(state, scene, stealerId, direction, record) {
	const defender = state.positions[stealerId];
	const passer = state.positions[state.ball.owner];
	const origin = passer ? { x: passer.x + 1, y: passer.y + 0.8 } : { ...state.ball };
	const intercepted = scene.action.subType === "bad pass" || scene.action.descriptor === "bad pass";
	let receiverId = null;
	let target = { x: origin.x + direction * 1.5, y: origin.y + 0.7 };
	if (intercepted) {
		const candidates = state.lineups[scene.attackTeam].filter((id) => id !== state.ball.owner).map((id) => {
			const receiver = state.positions[id];
			const dx = receiver.x + 1 - origin.x;
			const dy = receiver.y + 0.8 - origin.y;
			const length = Math.hypot(dx, dy);
			const earliest = Math.min(0.6, Math.max(0.3, 7 / (length || 1)));
			const fraction = Math.max(earliest, Math.min(0.8,
				((defender.x + 1 - origin.x) * dx + (defender.y + 0.8 - origin.y) * dy) / (length ** 2 || 1)));
			const point = { x: origin.x + dx * fraction - 1, y: origin.y + dy * fraction - 0.8 };
			return {
				id,
				point,
				length,
				cost: Math.hypot(point.x - defender.x, point.y - defender.y) * 2 +
					length * 0.1 + Math.max(0, 6 - length) * 3 + Math.max(0, length - 35),
			};
		});
		const passingLanes = candidates.filter((candidate) => candidate.length >= 12);
		const best = (passingLanes.length ? passingLanes : candidates).sort((a, b) => a.cost - b.cost)[0];
		receiverId = best.id;
		target = best.point;
	}
	target.x = Math.max(1, Math.min(93, target.x));
	target.y = Math.max(1, Math.min(49, target.y));
	const from = { x: defender.x, y: defender.y };
	const distance = Math.hypot(target.x - from.x, target.y - from.y);
	const remaining = Math.min(2.5, distance);
	const fraction = distance > 0 ? (distance - remaining) / distance : 0;
	const staging = { x: from.x + (target.x - from.x) * fraction, y: from.y + (target.y - from.y) * fraction };
	const plan = {
		kind: intercepted ? "interception" : "strip",
		stealerId,
		receiverId,
		approachAt: scene.frames.at(-1).time,
		origin,
		target: { ...target },
	};
	scene.stealPlan = plan;
	state.ball.dribble = !intercepted;
	const dx = staging.x - from.x;
	const dy = staging.y - from.y;
	const travel = Math.hypot(dx, dy);
	const passerX = origin.x - 1;
	const passerY = origin.y - 0.8;
	const nearest = Math.max(0, Math.min(1,
		((passerX - from.x) * dx + (passerY - from.y) * dy) / (travel ** 2 || 1)));
	const clearance = Math.hypot(from.x + dx * nearest - passerX, from.y + dy * nearest - passerY);
	const side = Math.sign((passerX - from.x) * -dy + (passerY - from.y) * dx) || 1;
	const normal = { x: side * dy / (travel || 1), y: -side * dx / (travel || 1) };
	let bend = nearest > 0 && nearest < 1 && clearance < 3 ? 4 : 0;
	for (const [axis, lower, upper] of [["x", 1, 93], ["y", 1, 49]]) {
		if (normal[axis] !== 0) {
			const room = normal[axis] > 0 ? upper - Math.max(from[axis], staging[axis])
				: Math.min(from[axis], staging[axis]) - lower;
			bend = Math.min(bend, Math.max(0, room / Math.abs(normal[axis])));
		}
	}
	const duration = Math.max(0.2, (travel + Math.PI * bend) / 9);
	const steps = Math.ceil(duration / 0.1);
	for (let i = 1; i <= steps; i++) {
		const progress = i / steps;
		const offset = -side * Math.sin(progress * Math.PI) * bend;
		defender.x = from.x + dx * progress - dy / (travel || 1) * offset;
		defender.y = from.y + dy * progress + dx / (travel || 1) * offset;
		record(duration / steps);
	}
	releaseBall(state);
	record(0.01);
	plan.releaseAt = scene.frames.at(-1).time;
	const ballTarget = { x: target.x + 1, y: target.y + 0.8, z: 0.5 };
	const flightTime = Math.max(0.25, Math.hypot(ballTarget.x - origin.x, ballTarget.y - origin.y) / 45, remaining / 9);
	flyBall(state, record, ballTarget, intercepted ? 0.6 : 0.15, flightTime, 0, (progress) => {
		defender.x = staging.x + (target.x - staging.x) * progress;
		defender.y = staging.y + (target.y - staging.y) * progress;
	});
	state.ball.owner = stealerId;
	state.possession = state.players.find((player) => player.id === stealerId).teamId;
	state.ball.dribble = false;
	record(0.01);
	plan.catchAt = scene.frames.at(-1).time;
}

function animateOutOfBoundsPass(state, scene, direction, record) {
	const passer = state.positions[state.ball.owner];
	const origin = { x: passer.x + 1, y: passer.y + 0.8, z: 0.5 };
	const candidates = [];
	for (const id of state.lineups[scene.attackTeam]) {
		if (id === state.ball.owner) {
			continue;
		}
		const receiver = state.positions[id];
		const dx = receiver.x + 1 - origin.x;
		const dy = receiver.y + 0.8 - origin.y;
		const distance = Math.hypot(dx, dy);
		for (const side of [-1, 1]) {
			// Miss the receiving hand laterally, then continue along the same pass line.
			const near = {
				x: receiver.x + 1 - dy / distance * side * 2.8,
				y: receiver.y + 0.8 + dx / distance * side * 2.8,
			};
			const vx = near.x - origin.x;
			const vy = near.y - origin.y;
			const scale = Math.min(
				vx > 0 ? (95 - origin.x) / vx : vx < 0 ? (-1 - origin.x) / vx : Infinity,
				vy > 0 ? (51 - origin.y) / vy : vy < 0 ? (-1 - origin.y) / vy : Infinity,
			);
			const target = { x: origin.x + vx * scale, y: origin.y + vy * scale, z: 0 };
			const length = Math.hypot(vx, vy) * scale;
			let cost = distance + (length - distance) * 0.8 + Math.max(0, distance - 32) * 3;
			if ((origin.x - 47) * direction >= 0 && (target.x - 47) * direction < 0) {
				cost += 1000;
			}
			for (const defender of Object.keys(scene.matchups)) {
				const position = state.positions[defender];
				const fraction = ((position.x - origin.x) * vx + (position.y - origin.y) * vy) / (vx * vx + vy * vy);
				if (
					fraction > 0.1 && fraction < scale &&
					Math.hypot(position.x - origin.x - vx * fraction, position.y - origin.y - vy * fraction) < 2.5
				) {
					cost += 30;
				}
			}
			candidates.push({ receiverId: id, target, cost, duration: 0.35 + length / 60 });
		}
	}
	const plan = candidates.sort((a, b) => a.cost - b.cost)[0];
	scene.missedPass = { receiverId: plan.receiverId, releaseAt: scene.frames.at(-1).time };
	state.ball.dribble = false;
	flyBall(state, record, plan.target, 0.6, plan.duration);
	scene.missedPass.outAt = scene.frames.at(-1).time;
}

function pacePreparation(state, scene, time, finishDuration, record, direction) {
	// Compress live time while preserving the minimum time needed for the recorded finish.
	const budget = scene.shotClockPressure
		? Math.min(24, scene.liveSeconds * 0.85)
		: scene.transitionRuns?.length && scene.liveSeconds >= 12
		? Math.min(14, scene.liveSeconds * 0.65)
		: Math.min(12, scene.liveSeconds * 0.5);
	const elapsed = time - (scene.liveAt ?? 0);
	scene.preparationWait = Math.max(0, budget - elapsed - finishDuration);
	if (scene.stagedEntry) {
		const player = state.positions[scene.action.personId];
		const distance = Math.hypot(scene.shotEntry.x - player.x, scene.shotEntry.y - player.y);
		const duration = Math.max(0.8, distance / 5);
		if (scene.preparationWait >= duration + 0.5) {
			scene.arrivalMove = { id: scene.action.personId, from: { ...player },
				x: scene.shotEntry.x, y: scene.shotEntry.y, duration,
				startAt: time + scene.preparationWait - duration - 0.15 };
		} else {
			Object.assign(player, scene.shotEntry);
			record(duration, true);
			time += duration;
			scene.preparationWait = Math.max(0, scene.preparationWait - duration);
			delete scene.stagedEntry;
		}
	}
	scene.preparationAt = time;
	const spacingMoves = scene.spacingMoves ?? [];
	if (scene.preparationWait >= 3) {
		spacingMoves.forEach((move, index) => {
			move.startAt = time + index / spacingMoves.length * scene.preparationWait * 0.25;
			move.duration = scene.preparationWait * 0.65;
			move.from = { ...state.positions[move.id] };
		});
	}
	if (scene.preparationWait > 0) {
		state.ball.dribble = Boolean(state.ball.owner);
		record(Math.min(0.01, scene.preparationWait));
		const remaining = Math.max(0, scene.preparationWait - 0.01);
		if (remaining < 3 || !state.ball.owner) {
			if (remaining > 0) {
				record(remaining);
			}
			return;
		}
		if (remaining >= 4 && circulateBall(state, scene, remaining, record)) {
			return;
		}
		const owner = state.ball.owner;
		const carrier = state.positions[owner];
		const origin = { ...carrier };
		const defender = Number(Object.keys(scene.matchups).find((id) => scene.matchups[id] === owner));
		const occupied = Object.entries(state.positions).filter(([id, position]) =>
			position.opacity === 1 && Number(id) !== owner && Number(id) !== defender
		).map(([, position]) => position);
		occupied.push(...spacingMoves.map((move) => ({ x: move.x, y: move.y })));
		if (scene.continuationMove) {
			occupied.push(scene.continuationMove.target);
		}
		const finish = scene.shotPoint ?? scene.formation.foulPlan?.point;
		if (finish && scene.formation.shooterId !== owner) {
			occupied.push(finish);
		}
		const side = origin.y < 25 ? 1 : -1;
		const phase = Math.min(2.5, remaining * 0.55);
		// One lateral probe creates a new passing angle; the remaining time is a read/hold.
		const target = [1, -1, 0.5, -0.5].map((scale) => ({
			x: Math.max(
				scene.formation.backcourt && direction === -1 ? 49 : direction === 1 && origin.x >= 47 ? 47 : 2,
				Math.min(
					scene.formation.backcourt && direction === 1 ? 45 : direction === -1 && origin.x <= 47 ? 47 : 92,
					origin.x - direction * 2,
				),
			),
			y: Math.max(3, Math.min(47, origin.y + side * 4 * scale)),
		})).find((point) =>
			Math.hypot(point.x - carrier.x, point.y - carrier.y) >= 1 &&
			occupied.every((other) =>
				[0.25, 0.5, 0.75, 1].every((fraction) =>
					Math.hypot(
						carrier.x + (point.x - carrier.x) * fraction - other.x,
						carrier.y + (point.y - carrier.y) * fraction - other.y,
					) >= Math.min(4, Math.hypot(carrier.x - other.x, carrier.y - other.y))
				)
			)
		);
		scene.dribbleRoute = { owner, start: time + 0.01, end: time + scene.preparationWait, points: [] };
		if (target) {
			Object.assign(carrier, target);
		}
		record(phase);
		scene.dribbleRoute.points.push({ x: carrier.x, y: carrier.y });
		record(remaining - phase);
		if (!scene.dribbleRoute.points.some((point) => Math.hypot(point.x - origin.x, point.y - origin.y) >= 1)) {
			delete scene.dribbleRoute;
		}
	}
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
		for (const [defender, attacker] of Object.entries(state.matchups)) {
			if (attacker === rebounderId || attacker === closest) {
				const target = state.positions[attacker];
				Object.assign(state.positions[defender], {
					x: Math.max(1, Math.min(93, target.x + (hoop.x > 47 ? 3.6 : -3.6))),
					y: target.y + (25 - target.y) * 0.09,
				});
			}
		}
		record(0.5);
	}
	scene.reboundRotation = { rebounderId, partnerId: closest, start, end: scene.frames.at(-1).time };
}

function prepareRebound(replay, scene, index, state) {
	const previous = replay.scenes[scene.reboundShotIndex];
	const id = scene.action.personId;
	if (!id || !scene.reboundContinuous) {
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
	for (const between of replay.scenes.slice(scene.reboundShotIndex + 1, index)) {
		for (const frame of between.frames) {
			Object.assign(frame.players.find((player) => player.id === id), target);
		}
	}
	Object.assign(state.positions[id], target);
	scene.reboundApproach = { sceneIndex: scene.reboundShotIndex, start, end, playerId: id, target };
}

function planShootingFoul(scenes, index, position, hoop, direction, threePointRadius) {
	const action = scenes[index].action;
	let freeThrows = action.qualifiers?.includes("3freethrow")
		? 3
		: action.qualifiers?.includes("2freethrow")
		? 2
		: action.qualifiers?.includes("1freethrow")
		? 1
		: null;
	if (freeThrows === null) {
		for (let i = index + 1; i < scenes.length; i++) {
			const next = scenes[i].action;
			if (next.period !== action.period || next.clock !== action.clock || next.actionType === "foul") {
				break;
			}
			if (
				next.actionType === "freethrow" && next.personId === action.foulDrawnPersonId &&
				next.descriptor !== "technical" && !next.qualifiers?.includes("technical")
			) {
				freeThrows = Number(next.subType.match(/of ([123])$/)?.[1]) || null;
				break;
			}
		}
	}
	if (freeThrows === 1) {
		for (let i = index - 1; i >= 0; i--) {
			const previous = scenes[i].action;
			if (previous.period !== action.period || previous.clock !== action.clock) {
				break;
			}
			if (
				["2pt", "3pt"].includes(previous.actionType) && previous.personId === action.foulDrawnPersonId &&
				previous.shotResult === "Made"
			) {
				return { point: { x: previous.x * 0.94, y: previous.y * 0.5 }, freeThrows };
			}
		}
	}
	if (freeThrows !== 2 && freeThrows !== 3) {
		return { point: { x: position.x, y: position.y }, freeThrows };
	}
	const y = Math.max(freeThrows === 2 ? 4 : 2, Math.min(freeThrows === 2 ? 46 : 48, position.y));
	const offsetY = Math.abs(y - hoop.y);
	// Both leagues keep the corner line 22 feet from the basket's centerline.
	const boundary = offsetY >= 22 ? 0 : Math.sqrt(threePointRadius ** 2 - offsetY ** 2);
	const depth = (hoop.x - position.x) * direction;
	const targetDepth = freeThrows === 2
		? Math.max(1, Math.min(boundary - 1.5, depth))
		: Math.max(boundary + 1.5, Math.min(32, depth));
	return { point: { x: hoop.x - direction * targetDepth, y }, freeThrows };
}

function prepareShootingFoul(state, scene, replay, index, hoop, direction, record) {
	const shooterId = scene.action.foulDrawnPersonId;
	const shooter = state.positions[shooterId];
	const plan = scene.formation.foulActionNumber === scene.action.actionNumber
		? scene.formation.foulPlan
		: planShootingFoul(replay.scenes, index, shooter, hoop, direction, replay.league.threePointRadius);
	scene.foulPoint = { ...plan.point };
	scene.foulApproachAt = scene.frames.at(-1).time;
	if (plan.freeThrows === 1) {
		// The recorded basket already contains the and-one's approach and shot.
		Object.assign(shooter, plan.point);
		state.ball.owner = shooterId;
		state.ball.dribble = false;
		record(0.4);
		return;
	}
	const driving = plan.freeThrows === 2;
	const entry = driving ? { x: plan.point.x - direction * 7, y: plan.point.y } : plan.point;
	if (state.ball.owner !== shooterId) {
		const distance = Math.hypot(entry.x - shooter.x, entry.y - shooter.y);
		Object.assign(shooter, entry);
		record(Math.max(0.25, distance / 8));
		releaseBall(state);
		record(0.01);
		scene.foulPassAt = scene.frames.at(-1).time;
		flyBall(state, record, { x: shooter.x + 1, y: shooter.y + 0.8, z: 0.5 }, 0.6, 0.45);
		state.ball.owner = shooterId;
		record(0.01);
		scene.foulCatchAt = scene.frames.at(-1).time;
	}
	state.ball.dribble = true;
	record(0.01);
	scene.foulDriveAt = scene.frames.at(-1).time;
	const distance = Math.hypot(plan.point.x - shooter.x, plan.point.y - shooter.y);
	Object.assign(shooter, plan.point);
	record(Math.max(0.3, distance / 8));
	state.ball.dribble = false;
	record(0.01);
	scene.foulGatherAt = scene.frames.at(-1).time;
	record(0.15);
}

function leaveCourt(state, data, record) {
	if (state.breakPositions) {
		record(1.4);
		return;
	}
	releaseBall(state);
	landPlayers(state);
	state.breakPositions = structuredClone(state.positions);
	for (const team of data.teams) {
		state.lineups[team.id].forEach((id, slot) => {
			Object.assign(state.positions[id], { x: (team.home ? 59 : 15) + slot * 5, y: -5 });
		});
	}
	record(2);
	record(0.8);
}

function returnToCourt(state, record) {
	for (const id of Object.values(state.lineups).flat()) {
		Object.assign(state.positions[id], state.breakPositions[id]);
	}
	state.breakPositions = null;
	record(2);
}

function compileScene(replay, scene, index, state, data) {
	const action = scene.action;
	const liveFoul = scene.kind === "foul" && action.subType !== "technical" && scene.liveSeconds > 0;
	const pendingOffense = liveFoul && state.restart === "baseline"
		? otherTeam(data, state.possession) : state.possession;
	const offense = eventOffense(scene, pendingOffense, data);
	const direction = attackDirection(data, offense, action.period);
	const hoop = { x: direction === 1 ? 88.75 : 5.25, y: 25 };
	const matchups = {};
	const rebound = scene.reboundContinuous ? replay.scenes[scene.reboundSceneIndex] : null;
	const namedRebound = rebound?.action.personId;
	if (scene.kind === "rebound") {
		prepareRebound(replay, scene, index, state);
	}
	let time = 0;
	let followAttackers = false;
	const spacingMoves = [];
	scene.spacingMoves = spacingMoves;
	const contacts = new Set();
	const record = (delay, movement = false) => {
		const arrival = scene.arrivalMove;
		if (arrival && scene.approachAt === undefined) {
			Object.assign(state.positions[arrival.id], preparationPosition(state, scene, arrival.id, time + delay));
		}
		if (scene.releaseAt === undefined) {
			for (const move of spacingMoves) {
				const position = state.positions[move.id];
				const distance = Math.hypot(move.x - position.x, move.y - position.y);
				if (move.duration) {
					const fraction = Math.max(0, Math.min(1, (time + delay - move.startAt) / move.duration));
					position.x = move.from.x + (move.x - move.from.x) * fraction;
					position.y = move.from.y + (move.y - move.from.y) * fraction;
				} else {
					const fraction = distance > 0 ? Math.min(1, delay * 5 / distance) : 0;
					position.x += (move.x - position.x) * fraction;
					position.y += (move.y - position.y) * fraction;
				}
			}
		}
		const continuation = scene.continuationMove;
		if (continuation) {
			const fraction = Math.max(0, Math.min(1, (time + delay - continuation.startAt) / continuation.duration));
			const player = state.positions[continuation.playerId];
			player.x = continuation.from.x + (continuation.target.x - continuation.from.x) * fraction;
			player.y = continuation.from.y + (continuation.target.y - continuation.from.y) * fraction;
		}
		if (followAttackers && !movement) {
			reactDefense(state, scene, matchups, contacts, direction, delay);
		}
		if (movement) {
			const previous = scene.frames.at(-1);
			let longest = 0;
			for (const player of previous.players) {
				const target = state.positions[player.id];
				if (player.opacity === 1 && target.opacity === 1) {
					longest = Math.max(longest, Math.hypot(target.x - player.x, target.y - player.y));
				}
			}
			// Reserve the finish, use available live time, and allow faster travel on short possessions.
			const budget = scene.shotClockPressure
				? Math.min(24, scene.liveSeconds * 0.85)
				: Math.min(12, scene.liveSeconds * 0.5);
			const available = Math.max(0, budget - (time - (scene.liveAt ?? 0)) - 2.5);
			delay = Math.max(delay, longest / 18, Math.min(longest / 12, available * 0.65));
			scene.buildupMoves ??= [];
			scene.buildupMoves.push({ start: time, end: time + delay });
		}
		time += delay;
		scene.frames.push(snapshot(state, time));
	};
	const recordMovement = (delay) => record(delay, true);
	record(0);
	if (
		state.breakPositions &&
		(["2pt", "3pt", "heave", "freethrow", "rebound", "foul", "turnover", "steal", "jumpball", "violation"]
			.includes(scene.kind) || (scene.kind === "period" && action.subType === "start"))
	) {
		returnToCourt(state, record);
		scene.returnAt = time;
		scene.liveAt = time;
	}
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
		scene.shooterPosition = state.players.find((player) => player.id === action.personId).position;
		scene.threePointRadius = replay.league.threePointRadius;
		const previous = replay.scenes[index - 1];
		scene.immediateReboundFinish = previous?.kind === "rebound" && previous.action.subType === "offensive" &&
			previous.action.personId === action.personId && scene.liveSeconds <= 3;
		scene.driveStart = getDriveStart(scene, shot, hoop, direction);
		if (scene.kind !== "heave" && !scene.shotStyle.tip && !scene.shotStyle.putback) {
			scene.shotEntry = getShotEntry(scene, shot, hoop, direction);
		}
		const continuation = planContinuation(replay, scene, state.lineups[offense], direction);
		prepareAttack(state, scene, offense, direction, matchups, recordMovement, data, replay, index);
		if (namedRebound && scene.kind !== "heave" && !scene.formation.backcourt) {
			prepareReboundFormation(state, scene, namedRebound, hoop, recordMovement, data);
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
					id === continuation?.playerId || slot === scene.formation.interiorSlot
				) {
					return;
				}
				// Reserve one adjustment for a useful relocation after a connecting pass.
				if (spacingMoves.length >= 1) {
					return;
				}
				const occupied = points.filter((_, other) => other !== slot).concat([finish]);
				const [[ax, ay], [bx, by]] = lane;
				const dx = bx - ax;
				const dy = by - ay;
				const u = Math.max(0, Math.min(1,
					((points[slot][0] - ax) * dx + (points[slot][1] - ay) * dy) / (dx * dx + dy * dy || 1)));
				const laneDistance = Math.hypot(points[slot][0] - ax - dx * u, points[slot][1] - ay - dy * u);
				if (laneDistance >= 6 && occupied.every(([x, y]) => Math.hypot(x - points[slot][0], y - points[slot][1]) >= 9)) {
					return;
				}
				const target = findOpenSpace(
					points[slot],
					occupied,
					lane,
					false,
					!scene.formation.backcourt &&
						["PG", "SG", "G", "G-F"].includes(state.players.find((player) => player.id === id).position),
					scene.formation.backcourt,
				);
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
		if (continuation && continuation.playerId !== state.ball.owner) {
			const from = { ...state.positions[continuation.playerId] };
			const budget = scene.shotClockPressure
				? Math.min(24, scene.liveSeconds * 0.85)
				: Math.min(12, scene.liveSeconds * 0.5);
			scene.continuationMove = {
				...continuation,
				from,
				startAt: time,
				duration: Math.max(
					2.5,
					budget - (time - (scene.liveAt ?? 0)),
					Math.hypot(continuation.target.x - from.x, continuation.target.y - from.y) / 5,
				),
			};
		}
		if (scene.kind !== "heave" && !scene.shotStyle.tip && !scene.shotStyle.putback) {
			const driveTime = scene.driveStart
				? Math.hypot(scene.driveStart.x - shot.x, scene.driveStart.y - shot.y) / 12 : 0;
			pacePreparation(state, scene, time, 2.5 + driveTime, record, direction);
		}
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
			if (state.restart !== "flagrant") {
				state.restart = "sideline";
			}
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
		} else if (final && scene.flagrantFreeThrow) {
			state.restart = "flagrant";
			state.needsAdvance = true;
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
	} else if (scene.kind === "foul" && action.subType === "technical" && !state.positions[action.personId]) {
		// Unlisted people can receive technical fouls; keep the action without inventing a court player.
		scene.eventAt = time;
		record(0.7);
	} else if (scene.kind === "foul" || scene.kind === "turnover" || scene.kind === "steal") {
		const offensive = scene.kind === "foul" && action.subType === "offensive";
		const onBall = scene.kind === "turnover" || offensive ||
			["shooting", "take", "transition take"].includes(action.descriptor);
		if (onBall || liveFoul) {
			if (liveFoul && (state.restart || state.possession !== offense || state.needsAdvance)) {
				replay.attacks.push(scene.start);
			}
			followAttackers = true;
			prepareAttack(state, scene, offense, direction, matchups, recordMovement, data, replay, index);
			pacePreparation(state, scene, time, scene.action.descriptor === "shooting" ? 2 : 0.8, record, direction);
		}
		if (onBall) {
			if (scene.kind === "foul" && action.descriptor === "shooting") {
				prepareShootingFoul(state, scene, replay, index, hoop, direction, record);
			} else {
				state.ball.owner = (scene.kind === "foul" && !offensive ? action.foulDrawnPersonId : action.personId) ||
					state.ball.owner || state.lineups[offense][0];
				record(0.4);
			}
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
		if (
			scene.kind === "turnover" && action.subType === "out-of-bounds" && action.descriptor === "bad pass" &&
			!action.stealPersonId
		) {
			animateOutOfBoundsPass(state, scene, direction, record);
		}
		if (action.stealPersonId || scene.kind === "steal") {
			const stealer = action.stealPersonId || action.personId;
			contacts.add(stealer);
			animateSteal(state, scene, stealer, direction, record);
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
			state.possession = state.players.find((player) => player.id === stealer).teamId;
			state.restart = null;
			state.needsAdvance = true;
			addMarker(replay, scene, time, "steal", state.positions[stealer]);
			replay.attacks.push(scene.start + time);
		} else if (scene.kind === "turnover" || offensive) {
			releaseBall(state);
			if (action.subType === "out-of-bounds" && !scene.missedPass) {
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
			const lineup = state.lineups[team.id];
			const previousLineup = lineup.slice();
			for (let i = 0; i < outs.length; i++) {
				lineup[lineup.indexOf(outs[i].personId)] = ins[i].personId;
			}
			// Same-clock changes may bring a player back; animate only the final slot occupants.
			previousLineup.forEach((outId, slot) => {
				const incomingId = lineup[slot];
				if (outId === incomingId) {
					return;
				}
				const previous = { ...state.positions[outId] };
				if (state.breakPositions) {
					state.breakPositions[incomingId] = { ...state.breakPositions[outId] };
				}
				Object.assign(state.positions[outId], state.breakPositions ? previous : { x: 43 + slot * 3, y: 52 });
				Object.assign(state.positions[incomingId], {
					x: state.breakPositions ? previous.x : 43 + slot * 3,
					y: state.breakPositions ? -6 : 55,
					opacity: 0,
				});
				scene.swaps.push({ out: outId, in: incomingId, slot, teamId: team.id, previous });
				if (state.matchups) {
					if (state.matchups[outId] !== undefined) {
						state.matchups[incomingId] = state.matchups[outId];
						delete state.matchups[outId];
					}
					for (const defender of Object.keys(state.matchups)) {
						if (state.matchups[defender] === outId) {
							state.matchups[defender] = incomingId;
						}
					}
				}
				if (state.ball.owner === outId) {
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
			Object.assign(
				state.positions[swap.in],
				state.breakPositions ? { ...swap.previous, opacity: 1 } : { x: 47, y: 52, opacity: 1 },
			);
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
		scene.eventAt = time + 0.3;
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
		if (scene.kind === "timeout" || (scene.kind === "period" && action.subType === "end")) {
			leaveCourt(state, data, record);
		} else {
			record(0.9);
		}
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
			const teamTechnical = action.actionType === "foul" && action.subType === "technical" &&
				data.teams.some((team) => team.id === action.teamId);
			if (!teamTechnical) {
				throw new Error(`Unknown replay player: ${action.personId}`);
			}
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
		breakPositions: null,
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
		league: getLeague(data.gameId),
		scenes: buildScenes(data.actions),
		formations: [],
		markers: [],
		attacks: [0],
		quarters: [],
		players,
		duration: 0,
	};
	linkRebounds(replay.scenes);
	planShotClockPressure(replay.scenes);
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
			: replay.league.periodSeconds;
		scene.liveSeconds = Math.max(0, scene.clockFrom - scene.clockTo);
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
	while (frameIndex < frames.length - 2 && frames[frameIndex + 1].time <= local + 1e-9) {
		frameIndex++;
	}
	const from = frames[frameIndex];
	const to = frames[frameIndex + 1] || from;
	const fraction = Math.max(0, Math.min(1, (local - from.time) / (to.time - from.time || 1)));
	const smooth = fraction * fraction * (3 - 2 * fraction);
	const mix = (a, b) => a + (b - a) * smooth;
	const ballFraction = to.ball.flight && !to.ball.owner ? fraction : smooth;
	const mixBall = (a, b) => a + (b - a) * ballFraction;
	let players = from.players.map((player, i) => ({
		id: player.id,
		x: mix(player.x, to.players[i].x),
		y: mix(player.y, to.players[i].y),
		opacity: mix(player.opacity, to.players[i].opacity),
		angle: mix(player.angle, to.players[i].angle),
		jump: mix(player.jump, to.players[i].jump),
	}));
	const originalPlayers = players;
	players = movePlayers(scene, frameIndex, fraction, players);
	const ownerIndex = from.ball.owner && from.ball.owner === to.ball.owner
		? players.findIndex((player) => player.id === from.ball.owner)
		: -1;
	const carrierOffset = ownerIndex >= 0
		? {
			x: players[ownerIndex].x - originalPlayers[ownerIndex].x,
			y: players[ownerIndex].y - originalPlayers[ownerIndex].y,
		}
		: { x: 0, y: 0 };
	return {
		scene,
		time: bounded,
		players,
		ball: {
			x: mixBall(from.ball.x, to.ball.x) + carrierOffset.x,
			y: mixBall(from.ball.y, to.ball.y) + carrierOffset.y,
			z: mixBall(from.ball.z, to.ball.z),
			dribble: from.ball.dribble,
			owner: fraction === 1 ? to.ball.owner : from.ball.owner,
		},
		score: fraction === 1 ? to.score : from.score,
		possession: fraction === 1 ? to.possession : from.possession,
		period: scene.action.period,
		clock: scene.clockFrom + (scene.clockTo - scene.clockFrom) *
				Math.max(0, Math.min(1, (local - (scene.liveAt ?? 0)) / (scene.eventAt - (scene.liveAt ?? 0) || 1))),
		participants: local >= scene.eventAt - 1.5 ? scene.participants : [],
		markers: replay.markers.filter((marker) => marker.time <= bounded && marker.end > bounded),
		banner: scene.banner && local > 0.15 ? scene.banner : "",
	};
}

