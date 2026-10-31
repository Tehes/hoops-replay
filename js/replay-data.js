import { getTeamColors } from "./replay-teams.js";
import { getLeague } from "./replay-leagues.js";

export const API_BASE = "https://hoops-replay.tehes.deno.net";

function normalizeTeam(team, home, league) {
	if (!getTeamColors({ code: team.teamTricode, league }) || !Array.isArray(team.players)) {
		throw new Error(`Unsupported team or missing roster: ${team.teamTricode}`);
	}
	const players = team.players.map((player) => ({
		id: player.personId,
		name: player.name,
		number: player.jerseyNum,
		position: player.position || "",
		boxscorePosition: player.position || "",
		positionSource: player.position ? "boxscore" : null,
		starter: player.starter === "1",
		minutes: player.statistics?.minutes || "PT00M00.00S",
	}));
	const starters = players.filter((player) => player.starter);
	if (starters.length !== 5) {
		throw new Error(`${team.teamTricode}: expected five starters.`);
	}
	return {
		id: team.teamId,
		league,
		code: team.teamTricode,
		name: team.teamName,
		home,
		score: team.score,
		players,
	};
}

export async function loadRosterPositions(data, loadFeed) {
	const teams = await Promise.all(data.teams.map(async (team) => {
		const params = new URLSearchParams({ season: data.season, league: data.league });
		const path = `roster/${team.id}?${params}`;
		try {
			const roster = await loadFeed(path);
			const rows = roster.resultSets?.find((set) => set.name === "CommonTeamRoster");
			if (
				!Array.isArray(rows?.headers) || !Array.isArray(rows.rowSet) ||
				!rows.headers.includes("PLAYER_ID") || !rows.headers.includes("POSITION")
			) {
				throw new Error("Missing roster player IDs or positions.");
			}
			const idIndex = rows.headers.indexOf("PLAYER_ID");
			const positionIndex = rows.headers.indexOf("POSITION");
			const heightIndex = rows.headers.indexOf("HEIGHT");
			const weightIndex = rows.headers.indexOf("WEIGHT");
			const positions = new Map();
			for (const row of rows.rowSet) {
				if (!Number.isInteger(row[idIndex]) || typeof row[positionIndex] !== "string") {
					throw new Error("Invalid roster player ID or position.");
				}
				const height = typeof row[heightIndex] === "string" ? /^(\d)-(\d{1,2})$/.exec(row[heightIndex]) : null;
				const weight = Number(row[weightIndex]);
				positions.set(row[idIndex], {
					position: row[positionIndex],
					heightCm: height && Number(height[2]) < 12
						? (Number(height[1]) * 12 + Number(height[2])) * 2.54
						: null,
					weightKg: Number.isFinite(weight) && weight > 0 ? weight * 0.45359237 : null,
				});
			}
			return {
				...team,
				rosterSource: `${API_BASE}/${path}`,
				players: team.players.map((player) =>
					positions.has(player.id)
						? {
							...player,
							...positions.get(player.id),
							position: positions.get(player.id).position || player.position,
							positionSource: positions.get(player.id).position ? "roster" : player.positionSource,
						}
						: player
				),
			};
		} catch (error) {
			console.warn(`${team.code}: roster unavailable; retaining recorded boxscore positions.`, error);
			return team;
		}
	}));
	return { ...data, teams };
}

export async function loadPlayerStatistics(data, loadFeed) {
	const seasonType = data.gameId[2] === "1" ? "Pre Season" : data.gameId[2] === "4" ? "Playoffs" : "Regular Season";
	const teams = await Promise.all(data.teams.map(async (team) => {
		const params = new URLSearchParams({ season: data.season, league: data.league, seasonType });
		const path = `players/${team.id}?${params}`;
		try {
			const feed = await loadFeed(path);
			const rows = feed.resultSets?.find((set) => set.name === "PlayersSeasonTotals");
			const fields = {
				id: "PLAYER_ID",
				games: "GP",
				fieldGoalAttempts: "FGA",
				threePointAttempts: "FG3A",
				threePointPercentage: "FG3_PCT",
				assists: "AST",
				rebounds: "REB",
			};
			if (
				!Array.isArray(rows?.headers) || !Array.isArray(rows.rowSet) ||
				Object.values(fields).some((field) => !rows.headers.includes(field))
			) {
				throw new Error("Missing player statistics fields.");
			}
			const statistics = new Map();
			for (const row of rows.rowSet) {
				const stats = Object.fromEntries(
					Object.entries(fields).map(([key, field]) => [key, row[rows.headers.indexOf(field)]]),
				);
				if (
					!Object.values(stats).every((value) => Number.isFinite(value) && value >= 0) ||
					!Number.isInteger(stats.id) || stats.threePointAttempts > stats.fieldGoalAttempts ||
					stats.threePointPercentage > 1
				) {
					throw new Error("Invalid player statistics.");
				}
				statistics.set(stats.id, stats);
			}
			return {
				...team,
				statisticsSource: `${API_BASE}/${path}`,
				players: team.players.map((player) =>
					statistics.has(player.id) ? { ...player, seasonStatistics: statistics.get(player.id) } : player
				),
			};
		} catch (error) {
			console.warn(`${team.code}: player statistics unavailable; retaining roster-based roles.`, error);
			return team;
		}
	}));
	return { ...data, teams };
}

function normalizeShotCoordinates(action) {
	if (
		!action.isFieldGoal || !["left", "right"].includes(action.side) ||
		!Number.isFinite(action.x) || !Number.isFinite(action.y) || !Number.isFinite(action.shotDistance)
	) {
		return action;
	}
	const hoopX = action.side === "left" ? 5.25 : 88.75;
	const distance = Math.hypot(action.x * 0.94 - hoopX, action.y * 0.5 - 25);
	// Allow rounding in the feed's distance, but reject contradictory geometry.
	if (Math.abs(distance - action.shotDistance) <= 1) {
		return action;
	}
	const mirroredDistance = Math.hypot((100 - action.x) * 0.94 - hoopX, action.y * 0.5 - 25);
	// Correct only a mirrored longitudinal coordinate corroborated by the recorded distance and basket.
	if (Math.abs(mirroredDistance - action.shotDistance) <= 1) {
		return { ...action, x: 100 - action.x, sourceX: action.x, coordinateCorrection: "mirrored-x" };
	}
	throw new Error(`Shot coordinates contradict the recorded distance: ${action.actionNumber}`);
}

export function normalizeGame(gameId, boxscore, playByPlay) {
	const game = boxscore.game;
	if (game?.gameId !== gameId || playByPlay.game?.gameId !== gameId) {
		throw new Error("Feed game IDs do not match the requested game.");
	}
	if (game.gameStatus !== 3) {
		throw new Error("Only completed games can be replayed.");
	}
	if (!Array.isArray(playByPlay.game.actions) || !playByPlay.game.actions.length) {
		throw new Error("Missing play-by-play actions.");
	}
	const date = new Date(game.gameTimeUTC);
	if (!Number.isFinite(date.getTime())) {
		throw new Error("Missing or invalid game date.");
	}
	const year = date.getUTCFullYear() - (date.getUTCMonth() < 6 ? 1 : 0);
	const league = getLeague(gameId).id;
	const query = league === "wnba" ? "?league=wnba" : "";
	return {
		gameId,
		league,
		date: game.gameTimeUTC,
		arena: game.arena?.arenaName || "",
		season: league === "wnba" ? String(date.getUTCFullYear()) : `${year}-${String(year + 1).slice(-2)}`,
		sources: {
			playByPlay: `${API_BASE}/playbyplay/${gameId}${query}`,
			boxscore: `${API_BASE}/boxscore/${gameId}${query}`,
			captured: new Date().toISOString(),
		},
		teams: [normalizeTeam(game.awayTeam, false, league), normalizeTeam(game.homeTeam, true, league)],
		actions: playByPlay.game.actions.map(normalizeShotCoordinates),
	};
}

export async function loadRecentGameIds() {
	const schedules = await Promise.all(["nba", "wnba"].map(async (league) => {
		const response = await fetch(`${API_BASE}/schedule?league=${league}`);
		if (!response.ok) {
			throw new Error(`${league.toUpperCase()} schedule: HTTP ${response.status}`);
		}
		const schedule = await response.json();
		const dates = schedule.leagueSchedule?.gameDates;
		if (!Array.isArray(dates) || dates.some((date) => !Array.isArray(date.games))) {
			throw new Error(`${league.toUpperCase()} schedule: missing games.`);
		}
		return dates.flatMap((date) => date.games).filter((game) => {
			// Regular season, playoffs, play-in and cup finals; exclude preseason and exhibitions.
			const eligible = league === "nba" ? /^00[2456]\d{7}$/ : /^10[245]\d{7}$/;
			return game.gameStatus === 3 && eligible.test(game.gameId) &&
				Number.isFinite(Date.parse(game.gameDateTimeUTC));
		});
	}));
	const games = schedules.flat().sort((a, b) =>
		Date.parse(b.gameDateTimeUTC) - Date.parse(a.gameDateTimeUTC) || b.gameId.localeCompare(a.gameId)
	);
	const ids = [...new Set(games.map((game) => game.gameId))].slice(0, 3);
	if (!ids.length) {
		throw new Error("No completed NBA or WNBA games available.");
	}
	return ids;
}

export async function loadReplayData(gameId) {
	const league = getLeague(gameId).id;
	const query = league === "wnba" ? "?league=wnba" : "";
	const loadFeed = async (path) => {
		let response;
		try {
			response = await fetch(`${API_BASE}/${path}`);
		} catch (error) {
			console.warn(`Replay ${path} request failed:`, error);
			throw new Error(
				`${league.toUpperCase()} data could not be reached. Check the connection and the backend CORS permission for this site's origin.`,
			);
		}
		if (!response.ok) {
			throw new Error(`${league.toUpperCase()} ${path}: HTTP ${response.status}`);
		}
		return await response.json();
	};
	const feeds = await Promise.all(
		["boxscore", "playbyplay"].map((endpoint) => loadFeed(`${endpoint}/${gameId}${query}`)),
	);
	return loadPlayerStatistics(
		await loadRosterPositions(normalizeGame(gameId, feeds[0], feeds[1]), loadFeed),
		loadFeed,
	);
}
