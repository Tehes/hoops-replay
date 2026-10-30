import { API_BASE, normalizeGame } from "../js/replay-data.js";
import { getLeague } from "../js/replay-leagues.js";

const responses = new Map();
const request = globalThis.fetch;

export async function loadFeed(path) {
	if (!responses.has(path)) {
		responses.set(
			path,
			(async () => {
				const response = await request(`${API_BASE}/${path}`, {
					headers: { Origin: "http://127.0.0.1:5500" },
				});
				if (!response.ok) {
					throw new Error(`${path}: HTTP ${response.status}`);
				}
				return await response.json();
			})(),
		);
	}
	// Callers may alter scenarios without changing another run's input.
	return structuredClone(await responses.get(path));
}

export async function loadGame(gameId) {
	if (typeof gameId !== "string" || !/^\d{10}$/.test(gameId)) {
		throw new Error(`Invalid game ID: ${gameId}`);
	}
	const query = getLeague(gameId).id === "wnba" ? "?league=wnba" : "";
	const [boxscore, playByPlay] = await Promise.all([
		loadFeed(`boxscore/${gameId}${query}`),
		loadFeed(`playbyplay/${gameId}${query}`),
	]);
	return normalizeGame(gameId, boxscore, playByPlay);
}

export async function selectGames(league, limit) {
	const path = `schedule?league=${league}`;
	const schedule = await loadFeed(path);
	const dates = schedule.leagueSchedule?.gameDates;
	if (!Array.isArray(dates) || dates.some((date) => !Array.isArray(date.games))) {
		throw new Error(`${path}: missing schedule games`);
	}
	const games = new Map();
	for (const game of dates.flatMap((date) => date.games)) {
		if (game.gameStatus !== 3) {
			continue;
		}
		if (typeof game.gameId !== "string" || !/^\d{10}$/.test(game.gameId) || getLeague(game.gameId).id !== league) {
			throw new Error(`${path}: invalid completed game ID`);
		}
		if (!Number.isFinite(Date.parse(game.gameDateTimeUTC))) {
			throw new Error(`${path}: invalid date for ${game.gameId}`);
		}
		games.set(game.gameId, game);
	}
	const ordered = [...games.values()].sort((a, b) =>
		Date.parse(a.gameDateTimeUTC) - Date.parse(b.gameDateTimeUTC) || a.gameId.localeCompare(b.gameId)
	);
	// Spread a bounded sample across the available season, including its endpoints.
	const selected = limit > 0 && ordered.length > limit
		? Array.from(
			{ length: limit },
			(_, index) =>
				ordered[limit === 1 ? ordered.length - 1 : Math.round(index * (ordered.length - 1) / (limit - 1))],
		)
		: ordered;
	return {
		league,
		season: schedule.leagueSchedule.seasonYear ?? schedule.meta?.seasonYear ?? null,
		source: `${API_BASE}/${path}`,
		completed: ordered.length,
		gameIds: selected.map((game) => game.gameId),
	};
}
