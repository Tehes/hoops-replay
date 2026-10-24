import { animateShot, flyBall, getShotStyle, landPlayers } from "./replay-shots.js";

const SLOT_ORDER = ["PG", "SG", "SF", "PF", "C"];
const FORMATION = [[63, 25], [72, 8], [74, 42], [80, 17], [82, 32]];

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
	for (let i = index; i < scenes.length; i++) {
		const scene = scenes[i];
		const action = scene.action;
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
		}
		if (scene.kind === "turnover" || (["2pt", "3pt"].includes(scene.kind) && action.shotResult === "Made")) {
			break;
		}
	}
	defense.forEach((id, slot) => {
		if (!assignments[id]) {
			const attacker = !assigned.has(attack[slot]) ? attack[slot] : attack.find((item) => !assigned.has(item));
			assignments[id] = attacker;
			assigned.add(attacker);
		}
	});
	return assignments;
}

function placeFormation(state, offense, direction, matchups, data) {
	state.lineups[offense].forEach((id, slot) => {
		const [x, y] = FORMATION[slot];
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
		end: scene.start + time + (duration ?? (kind === "made" || kind === "miss" ? 2.1 : 1.7)),
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

function prepareAttack(state, scene, offense, direction, matchups, record, data) {
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
	if (!restart && !changed && !state.needsAdvance && carrier) {
		return;
	}
	state.possession = offense;
	state.ball.dribble = true;
	placeFormation(state, offense, direction, matchups, data);
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
			const [x, y] = FORMATION[4];
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
		placeFormation(state, offense, direction, matchups, data);
		record(0.7);
	}
	state.restart = null;
	state.needsAdvance = false;
}

function compileScene(replay, scene, index, state, data) {
	const action = scene.action;
	const offense = eventOffense(scene, state.possession, data);
	const direction = attackDirection(data, offense, action.period);
	const hoop = { x: direction === 1 ? 88.75 : 5.25, y: 25 };
	const matchups = planMatchups(replay.scenes, index, offense, state, data);
	let time = 0;
	let followAttackers = false;
	const contacts = new Set();
	const record = (delay) => {
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
			prepareAttack(state, scene, offense, direction, matchups, record, data);
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
			state.ball = {
				x: action.blockPersonId
					? Math.max(1, Math.min(93, shot.x + direction * 3))
					: hoop.x - direction * (2 + action.actionNumber % 4),
				y: action.blockPersonId ? Math.max(1, Math.min(49, shot.y + 4)) : 20 + action.actionNumber % 11,
				z: 0,
				owner: null,
			};
		}
		record(0.01);
		landPlayers(state);
		record(0.22);
		record(0.65);
	} else if (scene.kind === "rebound") {
		const defensive = action.subType === "defensive";
		if (action.personId) {
			Object.assign(state.positions[action.personId], { x: state.ball.x, y: state.ball.y });
			record(0.55);
			state.positions[action.personId].jump = 0.8;
			state.ball.owner = action.personId;
			state.ball.dribble = false;
			record(0.18);
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
			state.ball.x -= direction * 3;
			state.ball.y = 28;
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
			prepareAttack(state, scene, offense, direction, matchups, record, data);
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
			scene.banner = action.subType === "end" ? `Q${action.period} · 0:00` : `Q${action.period}`;
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
	const replay = { scenes: buildScenes(data.actions), markers: [], attacks: [0], quarters: [], players, duration: 0 };
	replay.scenes.forEach((scene, index) => {
		const previous = replay.scenes[index - 1];
		scene.start = replay.duration;
		scene.frames = [];
		scene.swaps = [];
		scene.clockTo = clockSeconds(scene.action.clock);
		scene.clockFrom = previous?.action.period === scene.action.period ? previous.clockTo : 720;
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
