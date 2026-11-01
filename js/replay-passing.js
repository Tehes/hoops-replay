export function getPassCost(from, to, defenders) {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy);
	if (length < 6) {
		return Infinity;
	}
	let clearance = Infinity;
	let receivingSpace = Infinity;
	for (const defender of defenders) {
		const along = ((defender.x - from.x) * dx + (defender.y - from.y) * dy) / length ** 2;
		const u = Math.max(0.1, Math.min(0.9, along));
		const distance = Math.hypot(defender.x - from.x - dx * u, defender.y - from.y - dy * u);
		if (along > 0.1 && along < 0.9 && distance < 2.5) {
			return Infinity;
		}
		clearance = Math.min(clearance, distance);
		receivingSpace = Math.min(receivingSpace, Math.hypot(defender.x - to.x, defender.y - to.y));
	}
	// A clear weak-side catch can justify skipping the intermediate stations.
	const openSkip = (from.y - 25) * (to.y - 25) < 0 && Math.abs(dy) >= 20 && receivingSpace >= 6;
	return 0.5 + length * 0.04 + (openSkip ? 0 : Math.max(0, length - 20) ** 2 * 0.025) +
		Math.max(0, 5 - clearance) ** 2 + Math.max(0, 5 - receivingSpace) ** 2 * 0.2;
}

export function planPassConnection(fromId, toId, receivers, positions, defenders, available) {
	const from = positions[fromId];
	const to = positions[toId];
	const length = Math.hypot(to.x - from.x, to.y - from.y);
	if (length <= 24) {
		return null;
	}
	const directCost = getPassCost(from, to, defenders);
	let best = null;
	for (const id of receivers) {
		if (id === fromId || id === toId) {
			continue;
		}
		const relay = positions[id];
		const first = Math.hypot(relay.x - from.x, relay.y - from.y);
		const second = Math.hypot(to.x - relay.x, to.y - relay.y);
		if (Math.max(first, second) > length * 0.8 || first + second > length * 1.45) {
			continue;
		}
		const durations = [Math.max(0.35, first / 45), Math.max(0.35, second / 45)];
		const duration = durations[0] + durations[1] + 0.34;
		const cost = getPassCost(from, relay, defenders) + getPassCost(relay, to, defenders);
		if (duration <= available && cost + 0.75 < directCost && (!best || cost < best.cost)) {
			best = { path: [fromId, id, toId], durations, duration, cost };
		}
	}
	return best;
}
