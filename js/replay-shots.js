export function getShotStyle(action) {
	const subtype = (action.subType || "").toLowerCase();
	const description = (action.descriptor || "").toLowerCase().replaceAll("-", " ");
	const heave = action.actionType === "heave";
	const family = heave
		? "heave"
		: subtype === "dunk"
		? "dunk"
		: subtype === "layup"
		? "layup"
		: subtype === "hook"
		? "hook"
		: "jump";
	return {
		family,
		alleyOop: description.includes("alley oop"),
		tip: description.includes("tip"),
		putback: description.includes("putback"),
		reverse: description.includes("reverse"),
		fingerRoll: description.includes("finger roll"),
		floating: description.includes("floating"),
		bank: description.includes("bank"),
		running: description.includes("running"),
		driving: description.includes("driving"),
		cutting: description.includes("cutting"),
		pullup: description.includes("pullup"),
		stepBack: description.includes("step back"),
		fadeaway: description.includes("fadeaway"),
		turnaround: description.includes("turnaround"),
	};
}

// Sample each flight ahead of playback so seeking preserves exactly the same trajectory.
export function flyBall(state, record, target, height, duration, curve = 0, move = null) {
	const holder = state.positions[state.ball.owner];
	const origin = holder ? { x: holder.x + 1, y: holder.y + 0.8, z: 0.5 + holder.jump * 1.4 } : { ...state.ball };
	const dx = target.x - origin.x;
	const dy = target.y - origin.y;
	const length = Math.hypot(dx, dy) || 1;
	const steps = Math.max(4, Math.ceil(duration / 0.1));
	for (let i = 1; i <= steps; i++) {
		const fraction = i / steps;
		if (move) {
			move(fraction);
		}
		const bend = Math.sin(fraction * Math.PI) * curve;
		state.ball = {
			x: origin.x + dx * fraction - dy / length * bend,
			y: origin.y + dy * fraction + dx / length * bend,
			z: origin.z + ((target.z ?? 1) - origin.z) * fraction + 4 * height * fraction * (1 - fraction),
			owner: null,
			dribble: false,
			flight: true,
		};
		record(duration / steps);
	}
}

export function getDriveStart(scene, shot, hoop, direction) {
	const style = scene.shotStyle;
	const guard = ["PG", "SG", "G", "G-F"].includes(scene.shooterPosition);
	const rimFinish = style.family === "layup" || style.family === "dunk";
	if (!guard || scene.immediateReboundFinish || style.tip || style.putback || style.cutting || style.alleyOop ||
		style.stepBack || style.fadeaway || style.family === "heave" ||
		(!style.driving && !(rimFinish && !scene.action.assistPersonId)) ||
		Math.hypot(shot.x - hoop.x, shot.y - hoop.y) > 18) {
		return null;
	}
	const side = Math.sign(shot.y - hoop.y) || (scene.action.actionNumber % 2 ? 1 : -1);
	const lateral = Math.max(-17, Math.min(17, (shot.y - hoop.y) * 1.5 + side * 8));
	const radius = scene.threePointRadius + 1.5;
	return {
		x: hoop.x - direction * Math.sqrt(radius ** 2 - lateral ** 2),
		y: hoop.y + lateral,
	};
}

export function getShotEntry(scene, shot, hoop, direction) {
	const action = scene.action;
	const style = scene.shotStyle;
	const driveStart = getDriveStart(scene, shot, hoop, direction);
	if (driveStart) {
		return driveStart;
	}
	const side = Math.sign(shot.y - hoop.y) || (action.actionNumber % 2 ? 1 : -1);
	const rimFinish = style.family === "dunk" || style.family === "layup";
	const approachLength = style.running ? 12 : style.driving || style.cutting || style.pullup ? 7 : rimFinish ? 4 : 0;
	const entry = {
		x: Math.max(2, Math.min(92, shot.x - direction * approachLength)),
		y: Math.max(3, Math.min(47, shot.y + (style.cutting ? side * 7 : side * 2))),
	};
	if (style.stepBack || style.fadeaway) {
		entry.x = shot.x + direction * (style.stepBack ? 3.8 : 1.5);
		entry.y = shot.y;
	}
	if (style.reverse) {
		entry.x = hoop.x - direction * 4;
		entry.y = hoop.y - side * 6;
	}
	if ((shot.x - 47) * direction < 0) {
		// A step-back entry must not establish frontcourt possession before a backcourt release.
		entry.x = direction === 1 ? Math.min(entry.x, 46) : Math.max(entry.x, 48);
	}
	return entry;
}

export function animateShot(state, scene, shot, hoop, direction, record, contacts, matchups) {
	scene.approachAt = scene.frames.at(-1).time;
	const action = scene.action;
	const style = scene.shotStyle;
	const shooter = state.positions[action.personId];
	const side = Math.sign(shot.y - hoop.y) || (action.actionNumber % 2 ? 1 : -1);
	const direct = style.tip || style.putback;
	const rimFinish = style.family === "dunk" || style.family === "layup";
	const approachLength = style.running ? 12 : style.driving || style.cutting || style.pullup ? 7 : rimFinish ? 4 : 0;
	let entry = getShotEntry(scene, shot, hoop, direction);
	if (style.family === "heave") {
		Object.assign(shooter, entry);
		if (state.ball.owner !== action.personId) {
			record(0.2);
			const passer = state.positions[state.ball.owner];
			const distance = Math.hypot(passer.x - shooter.x, passer.y - shooter.y);
			flyBall(state, record, { x: shooter.x + 1, y: shooter.y + 0.8, z: 0.5 }, 0.6, 0.35 + distance / 60);
		}
		state.ball.owner = action.personId;
		state.ball.dribble = style.running;
		record(0.1);
		Object.assign(shooter, shot);
		record(style.running ? 0.4 : 0.15);
	} else if (direct) {
		// Tip-ins and putbacks use the ball already secured in the preceding rebound scene.
		Object.assign(shooter, shot);
		state.ball.owner = action.personId;
		state.ball.dribble = false;
		record(style.tip ? 0.18 : 0.3);
	} else if (style.alleyOop) {
		const passer = action.assistPersonId || state.lineups[action.teamId].find((id) => id !== action.personId);
		state.ball.owner = passer;
		state.ball.dribble = false;
		Object.assign(shooter, entry);
		record(0.45);
		const start = { ...shooter };
		scene.lobStart = scene.frames.at(-1).time;
		flyBall(state, record, { x: shot.x, y: shot.y, z: 4.3 }, 7, 0.95, side * 1.2, (fraction) => {
			shooter.x = start.x + (shot.x - start.x) * fraction;
			shooter.y = start.y + (shot.y - start.y) * fraction;
			shooter.jump = Math.max(0, (fraction - 0.5) * 4);
			shooter.angle = direction * 0.15;
		});
		scene.catchAt = scene.frames.at(-1).time;
		state.ball.owner = action.personId;
		state.ball.dribble = false;
		record(0.12);
	} else if (style.cutting && action.assistPersonId) {
		state.ball.owner = action.assistPersonId;
		state.ball.dribble = false;
		Object.assign(shooter, entry);
		record(0.35);
		Object.assign(shooter, { x: (entry.x + shot.x) / 2, y: (entry.y + shot.y) / 2, angle: direction * 0.18 });
		record(0.3);
		Object.assign(shooter, shot);
		record(0.3);
		state.ball.owner = action.personId;
		record(0.3);
	} else {
		Object.assign(shooter, entry);
		if (action.assistPersonId && !approachLength && !style.stepBack && !style.fadeaway) {
			state.ball.owner = action.assistPersonId;
			state.ball.dribble = false;
			record(0.4);
			Object.assign(shooter, shot);
			record(0.35);
		} else {
			record(0.35);
			if (action.assistPersonId) {
				state.ball.owner = action.assistPersonId;
				record(0.3);
			}
		}
		state.ball.owner = action.personId;
		state.ball.dribble = !style.cutting && Boolean(approachLength || style.stepBack);
		record(0.32);
		if (scene.driveStart) {
			const from = { ...shooter };
			const gather = style.reverse
				? { x: hoop.x - direction * 4, y: hoop.y - side * 6 }
				: { x: shot.x - direction * 4, y: shot.y + side * 2 };
			const distance = Math.hypot(gather.x - from.x, gather.y - from.y);
			const duration = Math.max(0.8, distance / 12);
			const steps = Math.ceil(duration / 0.1);
			scene.driveAt = scene.frames.at(-1).time;
			state.ball.dribble = true;
			for (let i = 1; i <= steps; i++) {
				const fraction = i / steps;
				shooter.x = from.x + (gather.x - from.x) * fraction;
				shooter.y = from.y + (gather.y - from.y) * fraction;
				shooter.angle = direction * 0.16;
				record(duration / steps);
			}
			scene.gatherAt = scene.frames.at(-1).time;
			entry = gather;
		}
		if (style.reverse) {
			Object.assign(shooter, { x: hoop.x + direction * 0.8, y: hoop.y - side * 3, angle: -side * 0.3 });
			record(style.running ? 0.3 : 0.4);
			Object.assign(shooter, { x: hoop.x + direction * 0.8, y: hoop.y + side * 2, angle: side * 0.3 });
			record(0.3);
		} else if (approachLength) {
			shooter.x = (entry.x + shot.x) / 2;
			shooter.y = (entry.y + shot.y) / 2;
			shooter.angle = direction * (style.running ? 0.2 : 0.1);
			record(style.running ? 0.3 : 0.4);
		}
		if (style.stepBack || style.fadeaway) {
			for (const [defender, attacker] of Object.entries(matchups)) {
				if (attacker === action.personId) {
					contacts.add(Number(defender));
				}
			}
		}
		Object.assign(shooter, shot);
		record(style.stepBack ? 0.42 : style.running ? 0.28 : 0.38);
		state.ball.dribble = false;
		if (style.pullup || (!rimFinish && !style.stepBack && !style.fadeaway)) {
			record(style.pullup ? 0.28 : 0.15);
		}
	}
	state.ball.dribble = false;
	if (style.turnaround) {
		shooter.angle = side * 1.5;
		record(0.2);
		shooter.angle = side * 0.35;
		record(0.2);
	}
	shooter.jump = style.family === "dunk" ? 2.5 : style.tip ? 1.7 : style.family === "layup" ? 1.2 : 1.5;
	shooter.angle = style.family === "hook" ? side * 0.9 : style.fadeaway ? -direction * 0.28 : direction * 0.12;
	if (style.fingerRoll) {
		shooter.angle = -side * 0.35;
	}
	record(style.tip ? 0.12 : 0.25);
	scene.releaseAt = scene.frames.at(-1).time;
	if (action.blockPersonId) {
		const blocker = state.positions[action.blockPersonId];
		contacts.add(action.blockPersonId);
		Object.assign(blocker, { x: shot.x + direction * 1.5, y: shot.y - 1.5, jump: 2, angle: -direction * 0.2 });
		flyBall(state, record, { x: shot.x + direction * 1.5, y: shot.y - 0.3, z: 3 }, 0.5, 0.24);
		return;
	}
	if (style.family === "dunk") {
		Object.assign(shooter, { x: hoop.x - direction * 0.8, y: hoop.y + side * 0.7 });
		record(style.tip ? 0.12 : 0.22);
		state.ball = { x: hoop.x, y: hoop.y, z: 6, owner: null, dribble: false, flight: true };
		record(0.15);
		flyBall(state, record, { ...hoop, z: 1 }, 0, 0.2);
	} else {
		const distance = Math.hypot(shot.x - hoop.x, shot.y - hoop.y);
		const height = style.family === "heave"
			? 13
			: style.floating
			? 9
			: style.family === "hook"
			? 7
			: style.fingerRoll
			? 4
			: style.family === "layup"
			? 2.5
			: 5 + distance * 0.1;
		const duration = style.family === "heave" ? 1.35 : style.tip ? 0.24 : rimFinish ? 0.5 : 0.7 + distance * 0.008;
		if (style.family === "hook") {
			state.ball = { x: shooter.x, y: shooter.y + side * 1.8, z: 3.5, owner: null, dribble: false };
		}
		const start = { ...shooter };
		const land = (fraction) => {
			shooter.jump = start.jump * (1 - fraction);
			if (style.fadeaway) {
				shooter.x = start.x - direction * 1.6 * fraction;
			} else if (style.running && !style.pullup) {
				shooter.x = start.x + direction * 1.6 * fraction;
			}
		};
		if (style.bank) {
			const board = { x: direction === 1 ? 90 : 4, y: 25 + side * 1.2, z: 2.5 };
			flyBall(state, record, board, height, duration, 0, land);
			scene.bankAt = scene.frames.at(-1).time;
			flyBall(state, record, { ...hoop, z: 1 }, 0.4, 0.24);
		} else {
			flyBall(
				state,
				record,
				{ ...hoop, z: 1 },
				height,
				duration,
				style.family === "hook" ? side * 3 : style.reverse ? -side * 1.5 : 0,
				land,
			);
		}
	}
}

export function landPlayers(state) {
	for (const position of Object.values(state.positions)) {
		position.jump = 0;
		position.angle = 0;
	}
}
