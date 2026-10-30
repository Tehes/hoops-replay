// NBA/WNBA Rule 10, Section VI. Positions represent bodies, not tracked feet.
export function isInOffensiveLane(point, direction) {
	const x = direction === 1 ? point.x : 94 - point.x;
	return x >= 75 && x <= 98 && point.y >= 17 && point.y <= 33;
}

export function getLaneWaitingPoint(point, direction) {
	if (!isInOffensiveLane(point, direction)) {
		return point;
	}
	return [
		{ x: direction === 1 ? 73.5 : 20.5, y: point.y },
		{ x: point.x, y: 15.5 },
		{ x: point.x, y: 34.5 },
	].sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
}
