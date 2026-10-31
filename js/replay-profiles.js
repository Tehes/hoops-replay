// WABC Level 1, Team 2.1.1/2.1.3: roles support spacing, not fixed player locations.
const POSITION_ROLES = {
	PG: [1, 0, 0],
	SG: [1, 0, 0],
	G: [1, 0, 0],
	SF: [0, 1, 0],
	PF: [0, 0.7, 0.3],
	F: [0, 1, 0],
	C: [0, 0, 1],
};

export function getPlayerRole(player) {
	const parts = player.position.split("-");
	const primary = POSITION_ROLES[parts[0]] ?? [0, 0, 0];
	const secondary = POSITION_ROLES[parts[1]];
	const [guard, forward, center] = primary.map((value, index) =>
		secondary ? value * 0.7 + secondary[index] * 0.3 : value
	);
	const stats = player.seasonStatistics;
	const attempts = stats ? stats.games * stats.fieldGoalAttempts : 0;
	// Shrink small samples; two-point attempts do not distinguish drives from post-ups or midrange shots.
	const confidence = attempts / (attempts + 100);
	const threePointShare = stats?.fieldGoalAttempts > 0 ? stats.threePointAttempts / stats.fieldGoalAttempts : 0;
	const accuracy = stats?.threePointPercentage ?? 0;
	const shooting = threePointShare * confidence * (0.75 + accuracy * 0.25);
	const assists = stats ? stats.assists / (stats.assists + 4) * confidence : 0;
	return {
		guard,
		forward,
		center,
		perimeter: Math.min(1, guard + forward * 0.65 + shooting * 1.8),
		interior: (center + forward * 0.25) * (1 - shooting),
		handling: guard + forward * 0.3 + assists * 0.4,
		shooting,
		confidence,
	};
}

export function getInteriorScore(player, teammates) {
	const role = getPlayerRole(player);
	const heights = teammates.map((other) => other.heightCm).filter((value) => value !== null && value !== undefined);
	const weights = teammates.map((other) => other.weightKg).filter((value) => value !== null && value !== undefined);
	const height = player.heightCm && heights.length > 1
		? (player.heightCm - heights.reduce((sum, value) => sum + value, 0) / heights.length) / 50
		: 0;
	const weight = player.weightKg && weights.length > 1
		? (player.weightKg - weights.reduce((sum, value) => sum + value, 0) / weights.length) / 150
		: 0;
	return role.interior + Math.max(-0.2, Math.min(0.2, height + weight));
}

export function getMatchupCost(defender, attacker) {
	const defense = getPlayerRole(defender);
	const offense = getPlayerRole(attacker);
	const height = defender.heightCm && attacker.heightCm ? Math.abs(defender.heightCm - attacker.heightCm) / 15 : 0;
	const weight = defender.weightKg && attacker.weightKg ? Math.abs(defender.weightKg - attacker.weightKg) / 25 : 0;
	return Math.abs(defense.guard - offense.guard) + Math.abs(defense.center - offense.center) +
		Math.abs(defense.perimeter - offense.perimeter) * 0.5 +
		Math.abs(defense.handling - offense.handling) * 0.25 + height + weight * 0.5;
}
