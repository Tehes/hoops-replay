import { createThrowIn, getRetainedPenalty, getViolationLocation, getViolationType, isFreeThrowViolation, isThrowInViolation } from "./replay-inbounds.js";

// NBA/WNBA Rule 10, Section VI. Positions represent bodies, not tracked feet.
export function isInOffensiveLane(point, direction) {
	const x = direction === 1 ? point.x : 94 - point.x;
	return x >= 75 && x <= 98 && point.y >= 17 && point.y <= 33;
}

export function getLaneWaitingPoint(point, direction, origin = point) {
	if (!isInOffensiveLane(point, direction)) {
		return point;
	}
	return [
		{ x: direction === 1 ? 73.5 : 20.5, y: point.y },
		{ x: point.x, y: 15.5 },
		{ x: point.x, y: 34.5 },
	].sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))[0];
}

// NBA/WNBA Rule 12B, Sections V–VIII: the next common foul incurs the penalty once the quota is used.
export function planTeamFouls(scenes, data) {
	let period = null;
	let totals;
	for (const scene of scenes) {
		const action = scene.action;
		if (action.period !== period) {
			period = action.period;
			totals = data.teams.map(() => ({ total: 0, lastTwo: 0 }));
		}
		const before = totals;
		const personal = scene.kind === "foul" &&
			!["technical", "double technical", "double personal", "offensive"].includes(action.subType);
		const offensiveFlagrant = scene.kind === "foul" && action.subType === "offensive" &&
			["flagrant", "flagrant 1", "flagrant 2", "punching"].includes(action.descriptor);
		if (personal || offensiveFlagrant) {
			totals = totals.map((count, index) => data.teams[index].id === action.teamId
				? { total: count.total + 1, lastTwo: count.lastTwo + (scene.clockTo <= 120 ? 1 : 0) }
				: count);
		}
		if (scene.kind === "game" || (scene.kind === "period" && action.subType === "end")) {
			totals = data.teams.map(() => ({ total: 0, lastTwo: 0 }));
		}
		scene.teamFouls = { before, after: totals };
	}
}

export function getSceneBonus(scene, time, clock) {
	const occurred = time + 1e-9 >= scene.eventAt;
	const counts = occurred ? scene.teamFouls.after : scene.teamFouls.before;
	const quota = scene.action.period > 4 ? 3 : 4;
	return [counts[1], counts[0]].map((count) => count.total >= quota || (clock <= 120 && count.lastTwo >= 1));
}

// NBA/WNBA Rules 6 and 9, and Rule 12A, Section V: resolve continuations before animation.
function continuation(phase, teamId = null, restart = null) {
	return {
		ballStatus: ["play", "rebound", "loose-ball"].includes(phase) ? "live" : "dead",
		phase,
		entitledTeam: teamId,
		controlTeam: phase === "play" ? teamId : null,
		restart,
		throwIn: null,
	};
}

function freeThrow(action) {
	const sequence = action.subType.match(/(\d) of (\d)/);
	return {
		actionNumber: action.actionNumber,
		teamId: action.teamId,
		shooterId: action.personId,
		attempt: sequence ? Number(sequence[1]) : 1,
		total: sequence ? Number(sequence[2]) : 1,
		technical: action.descriptor === "technical" || Boolean(action.qualifiers?.includes("technical")),
		retained: Boolean(getRetainedPenalty(action)),
	};
}

function upcomingFreeThrows(scenes, index) {
	const action = scenes[index].action;
	const attempts = [];
	for (let i = index + 1; i < scenes.length; i++) {
		const next = scenes[i];
		if (
			next.action.period !== action.period || next.action.clock !== action.clock ||
			["2pt", "3pt", "heave", "turnover", "jumpball", "period", "game"].includes(next.kind)
		) {
			break;
		}
		if (next.kind === "freethrow") {
			attempts.push(freeThrow(next.action));
		}
	}
	return attempts;
}

export function planGameStates(scenes, data) {
	const opponent = (teamId) => data.teams.find((team) => team.id !== teamId).id;
	const openingTeam = scenes.find((scene) => scene.kind === "jumpball")?.action.teamId ?? null;
	let state = { ...continuation("jump-ball", null, "jump-ball"), pendingFreeThrows: [], resume: null };
	for (const [index, scene] of scenes.entries()) {
		const action = scene.action;
		const violationType = getViolationType(action);
		const defensiveThreeSeconds = scene.kind === "foul" && action.subType === "technical" &&
			action.descriptor === "defensive-3-second";
		const before = state;
		let offense = before.entitledTeam;
		if (["2pt", "3pt", "heave", "freethrow", "turnover", "jumpball"].includes(scene.kind)) {
			offense = action.teamId;
		} else if (scene.kind === "foul") {
			offense = action.subType === "offensive"
				? action.teamId
				: action.possession || before.entitledTeam || opponent(action.teamId);
		} else if (scene.kind === "steal") {
			offense = before.controlTeam ?? before.entitledTeam ?? opponent(action.teamId);
		} else if (action.possession) {
			offense = action.possession;
		}
		const throwInViolation = before.phase === "throw-in" && isThrowInViolation(action) &&
			(scene.liveSeconds === 0 || action.qualifiers?.includes("team"));
		const freeThrowViolation = isFreeThrowViolation(action) || violationType === "double lane";
		const requiresPlay = !throwInViolation && !freeThrowViolation &&
			(["2pt", "3pt", "heave", "turnover", "steal"].includes(scene.kind) ||
			(scene.kind === "foul" && action.descriptor === "shooting" && scene.andOneShotIndex === undefined &&
				before.pendingFreeThrows.length === 0) ||
			(scene.liveSeconds > 0 && ["foul", "violation", "timeout"].includes(scene.kind) &&
				scene.andOneShotIndex === undefined && before.pendingFreeThrows.length === 0));
		const play = { ...continuation("play", offense), pendingFreeThrows: [], resume: null };
		let after = requiresPlay ? play : before;
		let attempt = null;
		if (["2pt", "3pt", "heave"].includes(scene.kind)) {
			after = {
				...play,
				...continuation(
					action.shotResult === "Made" ? "throw-in" : "rebound",
					action.shotResult === "Made" ? opponent(action.teamId) : null,
					action.shotResult === "Made" ? "baseline" : null,
				),
			};
			if (scene.andOneFoul) {
				after = {
					...after,
					...continuation("free-throws", action.teamId),
					pendingFreeThrows: upcomingFreeThrows(scenes, index),
					resume: null,
				};
			}
		} else if (scene.kind === "foul") {
			const attempts = upcomingFreeThrows(scenes, index);
			const technical = action.subType === "technical";
			const interrupted = requiresPlay
				? continuation("throw-in", offense, defensiveThreeSeconds ? "free-throw-line" : "sideline")
				: before.resume ||
					(before.phase === "play" || before.phase === "rebound"
						? continuation("throw-in", offense, defensiveThreeSeconds ? "free-throw-line" : "sideline")
						: before);
			const restart = continuation(
				"throw-in",
				action.subType === "offensive" ? opponent(action.teamId) : offense,
				getRetainedPenalty(action) === "free-throw-line" ? "flagrant" : "foul",
			);
			if (getRetainedPenalty(action) && !requiresPlay && before.phase === "throw-in" &&
				getRetainedPenalty(action) === "sideline-limited") {
				restart.throwIn = { ...before.throwIn, retained: true };
			}
			after = {
				...after,
				...continuation(
					attempts.length ? "free-throws" : technical ? interrupted.phase : "throw-in",
					attempts[0]?.teamId ?? (technical ? interrupted.entitledTeam : restart.entitledTeam),
					attempts.length ? null : technical ? interrupted.restart : restart.restart,
				),
				throwIn: attempts.length ? null : technical ? interrupted.throwIn : restart.throwIn,
				pendingFreeThrows: attempts,
				resume: attempts.length ? technical ? interrupted : restart : null,
			};
		} else if (scene.kind === "freethrow") {
			attempt = freeThrow(action);
			attempt.retained ||= !attempt.technical && Boolean(before.resume?.throwIn?.retained);
			const pending = upcomingFreeThrows(scenes, index);
			attempt.live = attempt.attempt === attempt.total && !attempt.technical && !attempt.retained &&
				pending.length === 0;
			let resume = before.resume || continuation("throw-in", before.entitledTeam ?? action.teamId, "sideline");
			if (!attempt.technical && attempt.attempt === attempt.total) {
				if (attempt.retained) {
					resume = before.resume?.throwIn?.retained ? before.resume : continuation("throw-in", action.teamId,
						getRetainedPenalty(action) === "free-throw-line" ? "flagrant" : "foul");
				} else {
					resume = action.shotResult === "Made"
						? continuation("throw-in", opponent(action.teamId), "baseline") : continuation("rebound");
				}
			}
			after = {
				...(pending.length ? continuation("free-throws", pending[0].teamId) : resume),
				pendingFreeThrows: pending,
				resume: pending.length ? resume : null,
			};
		} else if (scene.kind === "rebound") {
			if (before.ballStatus !== "dead") {
				const caught = Boolean(action.personId) && !action.qualifiers?.includes("deadball");
				after = {
					...before,
					...continuation(caught ? "play" : "throw-in", action.teamId, caught ? null : "sideline"),
				};
			}
		} else if (scene.kind === "turnover" && isFreeThrowViolation(action)) {
			after = { ...continuation("throw-in", opponent(action.teamId), "sideline"), pendingFreeThrows: [], resume: null };
		} else if (scene.kind === "turnover" || scene.kind === "steal") {
			const stolen = Boolean(action.stealPersonId) || scene.kind === "steal";
			after = {
				...play,
				...continuation(
					stolen ? "play" : "throw-in",
					stolen && scene.kind === "steal" ? action.teamId : opponent(offense),
					stolen ? null : "sideline",
				),
			};
			if (scene.looseBallFoulIndex !== undefined) {
				after = { ...play, ...continuation("loose-ball") };
			} else if (!requiresPlay && before.throwIn && isThrowInViolation(action)) {
				after.throwIn = { ...before.throwIn, freeBaseline: false, reason: `turnover/${violationType}` };
			}
		} else if (scene.kind === "jumpball") {
			after = play;
		} else if (scene.kind === "timeout") {
			after = {
				...after,
				...(requiresPlay || before.ballStatus === "live" ? continuation("throw-in", offense, "sideline") : {}),
			};
			if (!requiresPlay && before.phase === "throw-in") {
				after = { ...after, throwIn: { ...before.throwIn, sourceIndex: index,
					original: before.throwIn, reason: `timeout/${action.subType || ""}` } };
			}
		} else if (scene.kind === "violation" && ["kicked ball", "punched ball"].includes(violationType)) {
			const team = action.possession || (action.teamId === offense ? opponent(offense) : offense);
			after = { ...after, ...continuation("throw-in", team, (!requiresPlay && before.restart) || "sideline") };
			if (!requiresPlay && before.phase === "throw-in") {
				after.throwIn = before.throwIn;
			}
		} else if (scene.kind === "violation" && isFreeThrowViolation(action)) {
			const shot = scenes.slice(0, index).findLast((item) => item.kind === "freethrow");
			if (shot?.action.period === action.period && shot.action.clock === action.clock &&
				shot.rules.freeThrow.live && action.teamId === shot.action.teamId) {
				after = { ...continuation("throw-in", opponent(action.teamId), "sideline"), pendingFreeThrows: [], resume: null };
			}
		} else if (scene.kind === "violation" && violationType === "double lane") {
			const next = scenes.slice(index + 1).find((item) => !["timeout", "substitution", "rebound"].includes(item.kind));
			if ((next?.kind === "jumpball" && next.action.period === action.period && next.action.clock === action.clock) ||
				(before.pendingFreeThrows.length === 0 && before.phase === "rebound")) {
				after = { ...continuation("jump-ball", null, "jump-ball"), pendingFreeThrows: [], resume: null };
			}
		} else if (scene.kind === "violation" && (throwInViolation || getViolationLocation(action))) {
			after = { ...continuation("throw-in", opponent(action.teamId), "sideline"), pendingFreeThrows: [], resume: null };
			if (throwInViolation) {
				after.throwIn = { ...before.throwIn, freeBaseline: false, reason: `violation/${violationType}` };
			}
		} else if (scene.kind === "period") {
			const start = action.subType === "start";
			const jump = action.period === 1 || action.period > 4;
			const team = openingTeam === null ? null : action.period === 4 ? openingTeam : opponent(openingTeam);
			after = {
				...continuation(
					start ? jump ? "jump-ball" : "throw-in" : "period-end",
					start && !jump ? team : null,
					start ? jump ? "jump-ball" : "baseline" : null,
				),
				pendingFreeThrows: [],
				resume: null,
			};
		} else if (scene.kind === "game") {
			after = { ...continuation("game-end"), pendingFreeThrows: [], resume: null };
		}
		if (after.phase === "throw-in" && !after.throwIn) {
			after = { ...after, throwIn: createThrowIn(scene, index, offense, after.entitledTeam, after.restart) };
		}
		if (after.resume?.phase === "throw-in" && !after.resume.throwIn) {
			after = { ...after, resume: { ...after.resume,
				throwIn: createThrowIn(scene, index, offense, after.resume.entitledTeam, after.resume.restart) } };
		}
		const buildupRestart = before.restart === "jump-ball" ||
			(before.restart === "baseline" && before.entitledTeam !== offense) ? null : before.restart;
		scene.rules = {
			before,
			play,
			after,
			offense,
			requiresPlay,
			buildupRestart,
			freeThrow: attempt,
			defensiveThreeSeconds,
			throwInViolation,
		};
		state = after;
	}
}

// Body-center distances approximate arm's length; individual feet and guarding poses are not tracked.
export function isDefensiveLaneCountActive(frame, defenderId, direction) {
	const scene = frame.scene;
	const offense = scene.attackTeam;
	const player = frame.players.find((player) => player.id === defenderId);
	if (
		frame.gameState.ballStatus !== "live" || frame.gameState.phase !== "play" ||
		frame.gameState.controlTeam !== offense || (frame.ball.x - 47) * direction <= 0 ||
		!isInOffensiveLane(player, direction)
	) {
		return false;
	}
	const attackers = frame.players.filter((player) => scene.lineups[offense].includes(player.id));
	if (attackers.some((other) => Math.hypot(player.x - other.x, player.y - other.y) <= 4.5)) {
		return false;
	}
	const owner = attackers.find((player) => player.id === frame.ball.owner);
	if (owner && (owner.x - 47) * direction <= 0) {
		return false;
	}
	if (owner && scene.matchups[defenderId] === owner.id) {
		return frame.players.some((other) =>
			Number(other.id) !== defenderId &&
			Object.hasOwn(scene.matchups, other.id) && Math.hypot(other.x - owner.x, other.y - owner.y) <= 4.5
		);
	}
	return true;
}

export function scheduleGameStates(scene) {
	scene.ruleTimeline = [];
	if (scene.rules.requiresPlay) {
		if (scene.inboundAt !== undefined) {
			scene.ruleTimeline.push({
				time: scene.inboundAt,
				state: {
					...scene.rules.play,
					phase: "throw-in",
					controlTeam: null,
				},
			});
		}
		scene.ruleTimeline.push({ time: scene.liveAt ?? scene.returnAt ?? 0, state: scene.rules.play });
	}
	if (scene.kind === "freethrow") {
		scene.ruleTimeline.push({
			time: scene.freeThrowAt,
			state: {
				...scene.rules.before,
				ballStatus: "live",
				phase: "free-throw",
				entitledTeam: scene.action.teamId,
				controlTeam: null,
				restart: null,
			},
		});
		scene.ruleTimeline.push({
			time: scene.releaseAt,
			state: {
				...scene.rules.before,
				ballStatus: scene.rules.freeThrow.live ? "live" : "dead",
				phase: "free-throw-flight",
				entitledTeam: null,
				controlTeam: null,
				restart: null,
			},
		});
	} else if (scene.kind === "jumpball") {
		scene.ruleTimeline.push({
			time: scene.jumpBallPlan.tossAt,
			state: {
				...scene.rules.before,
				ballStatus: "live",
				phase: "jump-ball",
				restart: null,
			},
		});
	} else if (["2pt", "3pt", "heave"].includes(scene.kind)) {
		scene.ruleTimeline.push({
			time: scene.releaseAt,
			state: {
				...scene.rules.play,
				phase: "shot",
				entitledTeam: null,
				controlTeam: null,
			},
		});
	}
	scene.ruleTimeline.push({ time: scene.eventAt, state: scene.rules.after });
	if (scene.outAt !== undefined) {
		scene.ruleTimeline.push({ time: scene.outAt,
			state: { ...scene.rules.after, ...continuation("throw-in", scene.assumedOutOfBounds.teamId, "sideline") } });
	}
}

export function getSceneGameState(scene, time) {
	let state = scene.rules.before;
	for (const entry of scene.ruleTimeline) {
		if (entry.time > time + 1e-9) {
			break;
		}
		state = entry.state;
	}
	return state;
}
