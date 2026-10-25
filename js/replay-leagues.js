const LEAGUES = {
	nba: { id: "nba", periodSeconds: 720, threePointRadius: 23.75 },
	wnba: { id: "wnba", periodSeconds: 600, threePointRadius: 22 + 1.75 / 12 },
};

export function getLeague(gameId) {
	return LEAGUES[gameId.startsWith("10") ? "wnba" : "nba"];
}
