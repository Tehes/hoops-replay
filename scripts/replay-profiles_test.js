import { getInteriorScore, getMatchupCost, getPlayerRole } from "../js/replay-profiles.js";
import { getDriveStart } from "../js/replay-shots.js";
import { loadPlayerStatistics, loadRosterPositions } from "../js/replay-data.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

Deno.test("roster measurements use explicit units and preserve absent WNBA weights", async () => {
	const data = {
		league: "wnba",
		season: "2026",
		teams: [{
			id: 1,
			code: "ATL",
			players: [
				{ id: 10, position: "F-G", positionSource: "boxscore" },
				{ id: 11, position: "G", positionSource: "boxscore" },
			],
		}],
	};
	const original = JSON.stringify(data);
	const result = await loadRosterPositions(data, () =>
		Promise.resolve({
			resultSets: [{
				name: "CommonTeamRoster",
				headers: ["PLAYER_ID", "POSITION", "HEIGHT", "WEIGHT"],
				rowSet: [[10, "F-G", "6-4", "140"], [11, "G", "5-9", null]],
			}],
		}));
	const [forward, guard] = result.teams[0].players;
	assert(
		Math.abs(forward.heightCm - 193.04) < 0.001 && Math.abs(forward.weightKg - 63.503) < 0.001,
		"roster measurements have the wrong units",
	);
	assert(guard.weightKg === null && guard.heightCm > 175, "missing weight was filled with an estimate");
	assert(original === JSON.stringify(data), "profile loading mutated input");
});

Deno.test("player statistics use game season type and join by player ID without adding participants", async () => {
	for (
		const [gameId, seasonType] of [["0012600001", "Pre Season"], ["0022600001", "Regular Season"], [
			"1042600304",
			"Playoffs",
		]]
	) {
		const data = {
			gameId,
			league: gameId.startsWith("1") ? "wnba" : "nba",
			season: gameId.startsWith("1") ? "2026" : "2026-27",
			teams: [{ id: 1, code: "ATL", players: [{ id: 10 }, { id: 11 }] }],
		};
		const original = JSON.stringify(data);
		const result = await loadPlayerStatistics(data, (path) => {
			const params = new URL(`https://example.org/${path}`).searchParams;
			assert(
				params.get("seasonType") === seasonType && params.get("season") === data.season &&
					params.get("league") === data.league,
				"statistics loaded for the wrong competition",
			);
			return Promise.resolve({
				resultSets: [{
					name: "PlayersSeasonTotals",
					headers: ["PLAYER_ID", "GP", "FGA", "FG3A", "FG3_PCT", "AST", "REB"],
					rowSet: [[10, 20, 12, 5, 0.4, 3, 6], [99, 1, 1, 1, 1, 0, 0]],
				}],
			});
		});
		assert(
			result.teams[0].players.length === 2 && result.teams[0].players[0].seasonStatistics.games === 20,
			"statistics changed game participants or lost the sample size",
		);
		assert(!result.teams[0].players[1].seasonStatistics, "missing statistics were invented");
		assert(original === JSON.stringify(data), "statistics loading mutated input");
		const fallback = await loadPlayerStatistics(data, () => Promise.resolve({ resultSets: [] }));
		assert(JSON.stringify(fallback) === original, "malformed statistics changed the game data");
	}
});

Deno.test("hybrid roles retain both components and their primary weighting", () => {
	const fg = getPlayerRole({ position: "F-G" });
	const gf = getPlayerRole({ position: "G-F" });
	const fc = getPlayerRole({ position: "F-C" });
	const cf = getPlayerRole({ position: "C-F" });
	assert(fg.forward > fg.guard && fg.guard > 0, "forward-guard lost its secondary guard role");
	assert(gf.guard > gf.forward && gf.forward > 0, "guard-forward lost its secondary forward role");
	assert(fc.forward > fc.center && cf.center > cf.forward, "post hybrids lost primary weighting");
	assert(fg.perimeter > 0.6 && gf.perimeter > 0.6, "wing hybrids cannot prepare on the perimeter");
	assert(cf.interior > fc.interior, "center-forward has no stronger interior prior");
	const unknown = getPlayerRole({ position: "" });
	assert(unknown.guard === 0 && unknown.center === 0 && unknown.perimeter === 0, "missing position invented a role");
});

Deno.test("body measurements resolve similar interior roles without inventing missing measurements", () => {
	const smaller = { position: "F-C", heightCm: 193, weightKg: 88 };
	const larger = { position: "F-C", heightCm: 208, weightKg: 112 };
	assert(
		getInteriorScore(larger, [smaller, larger]) > getInteriorScore(smaller, [smaller, larger]),
		"active lineup size did not inform the interior role",
	);
	const unknown = { position: "F-C" };
	assert(
		getInteriorScore(unknown, [unknown, larger]) === getPlayerRole(unknown).interior,
		"missing body measurements were estimated",
	);
	assert(getMatchupCost(larger, larger) < getMatchupCost(smaller, larger), "size mismatch was ignored");
});

Deno.test("shooting tendency needs attempt volume as well as accuracy and respects sample size", () => {
	const stats = { games: 50, fieldGoalAttempts: 10, threePointAttempts: 6, threePointPercentage: 0.4, assists: 2 };
	const stretch = getPlayerRole({ position: "C", seasonStatistics: stats });
	const rare = getPlayerRole({
		position: "C",
		seasonStatistics: { ...stats, threePointAttempts: 0.2, threePointPercentage: 1 },
	});
	const small = getPlayerRole({ position: "C", seasonStatistics: { ...stats, games: 1 } });
	assert(stretch.perimeter >= 0.6 && stretch.interior < rare.interior, "established stretch profile stayed inside");
	assert(rare.perimeter < 0.6, "a high percentage on rare attempts invented a stretch player");
	assert(small.perimeter < 0.6 && small.confidence < stretch.confidence, "small sample was treated as established");
	assert(!Object.hasOwn(stretch, "driveFrequency"), "base shooting statistics invented recorded drives");
});

Deno.test("forward-guards can prepare recorded drives while a recorded outside shot stays outside", () => {
	const scene = {
		shooterPosition: "F-G",
		shotStyle: { family: "layup", driving: true },
		action: { actionNumber: 1 },
		threePointRadius: 23.75,
	};
	for (const direction of [-1, 1]) {
		const hoop = { x: direction === 1 ? 88.75 : 5.25, y: 25 };
		const entry = getDriveStart(scene, { x: hoop.x - direction * 3, y: 25 }, hoop, direction);
		assert(
			entry && Math.hypot(entry.x - hoop.x, entry.y - hoop.y) > 23.75,
			"wing hybrid has no outside drive entry",
		);
		assert(
			getDriveStart(
				{ ...scene, shotStyle: { family: "jump" } },
				{ x: hoop.x - direction * 25, y: 25 },
				hoop,
				direction,
			) === null,
			"role overrode the recorded outside finish",
		);
	}
});
