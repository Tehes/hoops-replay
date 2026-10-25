import { getTeamColors } from "./replay-teams.js";
import { getLeague } from "./replay-leagues.js";

export const API_BASE = "https://nba-spielplan.tehes.deno.net";
const DEFAULT_GAME = "0022600007";
const SLOTS = ["PG", "SG", "SF", "PF", "C"];

function normalizeTeam(team, home, league) {
	if (!getTeamColors({ code: team.teamTricode, league }) || !Array.isArray(team.players)) {
		throw new Error(`Unsupported team or missing roster: ${team.teamTricode}`);
	}
	const players = team.players.map((player) => ({
		id: player.personId,
		name: player.name,
		number: player.jerseyNum,
		position: player.position || "",
		starter: player.starter === "1",
		minutes: player.statistics?.minutes || "PT00M00.00S",
	}));
	const starters = players.filter((player) => player.starter);
	if (starters.length !== 5) {
		throw new Error(`${team.teamTricode}: expected five starters.`);
	}
	const available = new Set(SLOTS);
	const unresolved = [];
	for (const player of starters) {
		if (available.has(player.position)) {
			available.delete(player.position);
		} else {
			unresolved.push(player);
		}
	}
	// A formation needs five unique slots; these are schematic roles, not tracking facts.
	for (const player of unresolved) {
		player.sourcePosition = player.position;
		player.position = available.values().next().value;
		player.positionSource = "schematic";
		available.delete(player.position);
		console.warn(`${team.teamTricode}: schematic ${player.position} slot for ${player.name}.`);
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

export async function loadReplayData(gameId) {
	if (gameId === null) {
		const response = await fetch(`./data/replay-${DEFAULT_GAME}.json`);
		if (!response.ok) {
			throw new Error(`Example replay data: HTTP ${response.status}`);
		}
		return await response.json();
	}
	const league = getLeague(gameId).id;
	const query = league === "wnba" ? "?league=wnba" : "";
	const feeds = await Promise.all(["boxscore", "playbyplay"].map(async (endpoint) => {
		let response;
		try {
			response = await fetch(`${API_BASE}/${endpoint}/${gameId}${query}`);
		} catch (error) {
			console.warn(`Replay ${endpoint} request failed:`, error);
			throw new Error(
				`${league.toUpperCase()} data could not be reached. Check the connection and the backend CORS permission for this site's origin.`,
			);
		}
		if (!response.ok) {
			throw new Error(`${league.toUpperCase()} ${endpoint}: HTTP ${response.status}`);
		}
		return await response.json();
	}));
	return normalizeGame(gameId, feeds[0], feeds[1]);
}
