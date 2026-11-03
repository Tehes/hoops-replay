// NBA/WNBA Rules 5, 6, 8, 10 and 12. Locations use feet on a 94 by 50 foot court.
const VIOLATION_TYPES = {
	"3-second-violation": "3-second",
	"8-second-violation": "8-second",
	"5-second-violation": "5-second",
	laneviolation: "lane",
	"lane violation": "lane",
	"discontinued dribble": "discontinue dribble",
	"offensive-kicked-ball": "offensive kicked ball",
	"basket-from-below": "basket from below",
};

export function getViolationType(action) {
	const subtype = (action.subType || "").toLowerCase();
	return VIOLATION_TYPES[subtype] || subtype;
}

export function getRetainedPenalty(action) {
	const kind = `${action.subType || ""} ${action.descriptor || ""}`.toLowerCase().replaceAll("-", " ");
	if (kind.includes("flagrant") || kind.includes("punching")) {
		return "free-throw-line";
	}
	if (kind.includes("clear path")) {
		return "sideline";
	}
	if (kind.includes("transition take") || kind.includes("away from play") || kind.includes("away from the play")) {
		return "sideline-limited";
	}
	return null;
}

export function getViolationLocation(action) {
	const subtype = getViolationType(action);
	if (["backcourt", "8-second", "8 second", "eight seconds"].includes(subtype)) {
		return "midcourt";
	}
	if (["3-second", "3 second", "offensive 3 seconds", "offensive goaltending", "offensive basket interference",
		"5-second", "5-second back to the basket", "5-second back to basket", "free throw", "lane",
		"basket from below"].includes(subtype)) {
		return "free-throw-line";
	}
	if (["traveling", "double dribble", "discontinue dribble", "palming", "shot clock", "kicked ball", "punched ball",
		"offensive kicked ball", "illegal assist", "swinging elbows", "offensive out-of-bounds",
		"offensive screen out-of-bounds"].includes(subtype)) {
		return subtype === "illegal assist" ? "free-throw-line" : "sideline-limited";
	}
	return null;
}

export function createThrowIn(scene, index, offense, teamId, restart) {
	const action = scene.action;
	const subtype = getViolationType(action);
	const penalty = getRetainedPenalty(action);
	let location = penalty || "sideline-limited";
	let basketTeam = offense;
	let freeBaseline = false;
	if (restart === "baseline") {
		location = "baseline";
		basketTeam = teamId;
		freeBaseline = true;
	} else if (restart === "flagrant" || restart === "free-throw-line") {
		location = "free-throw-line";
		basketTeam = teamId;
	} else if (scene.kind === "foul") {
		location = action.descriptor === "defensive-3-second" ? "free-throw-line"
			: penalty || (subtype === "technical" ? "sideline" : "sideline-limited");
		if (penalty === "free-throw-line") {
			basketTeam = teamId;
		}
	} else if (scene.kind === "timeout") {
		location = "sideline";
	} else if (scene.kind === "rebound" || subtype === "out-of-bounds" || subtype === "offensive out-of-bounds") {
		location = subtype === "offensive out-of-bounds" ? "sideline-limited" : "boundary";
	} else if (getViolationLocation(action)) {
		location = getViolationLocation(action);
		if (location === "midcourt") {
			basketTeam = teamId;
		}
		if (isFreeThrowViolation(action)) {
			basketTeam = action.teamId;
		}
	}
	return { sourceIndex: index, location, basketTeam, freeBaseline, retained: Boolean(penalty),
		reason: `${scene.kind}/${subtype}` };
}

export function isThrowInViolation(action) {
	return ["5-second", "5-second inbound", "5-second inbound violation", "inbound", "inbound violation"].includes(getViolationType(action)) ||
		(action.subType === "out-of-bounds" && action.qualifiers?.includes("untouched"));
}

export function isFreeThrowViolation(action) {
	return ["lane", "free throw"].includes(getViolationType(action));
}

// A baseline exit and the legal throw-in spot can differ: the extended lane is excluded.
export function getThrowInPoint(plan, origin, direction, league) {
	const side = origin.y < 25 ? -1.5 : 51.5;
	if (plan.location === "baseline") {
		return { x: direction === 1 ? -1.5 : 95.5, y: plan.freeBaseline ? 30 : 34.5 };
	}
	if (plan.location === "free-throw-line") {
		return { x: direction === 1 ? 75 : 19, y: plan.retained ? 51.5 : side };
	}
	if (plan.location === "midcourt") {
		return { x: league === "wnba" ? 47 - direction * 1.5 : 47, y: side };
	}
	if (plan.location === "advanced") {
		return { x: direction === 1 ? 66 : 28, y: side };
	}
	if (plan.location === "boundary") {
		const baseline = Math.min(Math.abs(origin.x), Math.abs(94 - origin.x));
		const sideline = Math.min(Math.abs(origin.y), Math.abs(50 - origin.y));
		if (baseline < sideline) {
			const y = Math.max(2, Math.min(48, origin.y));
			return { x: origin.x < 47 ? -1.5 : 95.5,
				y: y >= 17 && y <= 33 ? y < 25 ? 15.5 : 34.5 : y };
		}
		return { x: Math.max(2, Math.min(92, origin.x)), y: side };
	}
	return { x: plan.location === "sideline-limited"
		? Math.max(19, Math.min(75, origin.x)) : Math.max(2, Math.min(92, origin.x)), y: side };
}

export function canPassToBackcourt(plan, point, direction, league, period, clock) {
	return (point.x - 47) * direction < 0 || plan.location === "advanced" ||
		(league === "wnba" && plan.location === "midcourt") || (period >= 4 && clock <= 120);
}
