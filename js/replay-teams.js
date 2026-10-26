import { selectMatchupJerseys } from "./replay-colors.js";

// Replay alternates follow the schedule palette; adjust visually per matchup (see PROJECT.md).
// Primary colors and logos: Tehes/nba-spielplan, commit 610e3d6.
export const TEAM_COLORS = {
	ATL: { shirt: "#e03a3e", alternate: null, trim: "#c1d32f", ink: "#ffffff" },
	BKN: { shirt: "#000000", alternate: "#777d84", trim: "#ffffff", ink: "#ffffff" },
	BOS: { shirt: "#008348", alternate: "#ba9653", trim: "#ffffff", ink: "#ffffff" },
	CHA: { shirt: "#00788c", alternate: "#1d1160", trim: "#1d1160", ink: "#ffffff" },
	CHI: { shirt: "#cd1f43", alternate: null, trim: "#000000", ink: "#ffffff" },
	CLE: { shirt: "#860038", alternate: null, trim: "#fdbb30", ink: "#ffffff" },
	DAL: { shirt: "#0064b1", alternate: "#bbc4ca", trim: "#b8c4ca", ink: "#ffffff" },
	DEN: { shirt: "#0d2240", alternate: "#8b2332", trim: "#fec524", ink: "#ffffff" },
	DET: { shirt: "#c8102e", alternate: "#1d428a", trim: "#1d42ba", ink: "#ffffff" },
	GSW: { shirt: "#fdb927", alternate: "#1d428a", trim: "#1d428a", ink: "#101820" },
	HOU: { shirt: "#ce0e2d", alternate: null, trim: "#000000", ink: "#ffffff" },
	IND: { shirt: "#0c2340", alternate: "#fdbb30", trim: "#fdbb30", ink: "#ffffff" },
	LAC: { shirt: "#12173f", alternate: "#c8102e", trim: "#c8102e", ink: "#ffffff" },
	LAL: { shirt: "#542c81", alternate: "#fab624", trim: "#fdb927", ink: "#ffffff" },
	MEM: { shirt: "#5d76a9", alternate: "#12173f", trim: "#12173f", ink: "#ffffff" },
	MIA: { shirt: "#961a31", alternate: null, trim: "#f9a01b", ink: "#ffffff" },
	MIL: { shirt: "#00471a", alternate: "#eee1c6", trim: "#eee1c6", ink: "#ffffff" },
	MIN: { shirt: "#1d428a", alternate: "#c1c6c8", trim: "#78be20", ink: "#ffffff" },
	NOP: { shirt: "#0a2240", alternate: "#ce0e2d", trim: "#0c2340", ink: "#ffffff" },
	NYK: { shirt: "#f58426", alternate: "#1d428a", trim: "#f58426", ink: "#101820" },
	OKC: { shirt: "#ee3c33", alternate: "#057dc1", trim: "#007ac1", ink: "#ffffff" },
	ORL: { shirt: "#0050b5", alternate: null, trim: "#c4ced4", ink: "#ffffff" },
	PHI: { shirt: "#1d428a", alternate: "#c8102e", trim: "#ed174c", ink: "#ffffff" },
	PHX: { shirt: "#e46025", alternate: "#1d1160", trim: "#1d1160", ink: "#ffffff" },
	POR: { shirt: "#cf0a2c", alternate: null, trim: "#000000", ink: "#ffffff" },
	SAC: { shirt: "#592d81", alternate: "#707272", trim: "#63727a", ink: "#ffffff" },
	SAS: { shirt: "#000000", alternate: "#c2ccd2", trim: "#000000", ink: "#ffffff" },
	TOR: { shirt: "#bc2126", alternate: null, trim: "#000000", ink: "#ffffff" },
	UTA: { shirt: "#4e008e", alternate: "#79a3dc", trim: "#002b5c", ink: "#ffffff" },
	WAS: { shirt: "#002b5c", alternate: "#e21936", trim: "#e31837", ink: "#ffffff" },
};

export const TEAM_NAMES = {
	ATL: "Atlanta Hawks",
	BKN: "Brooklyn Nets",
	BOS: "Boston Celtics",
	CHA: "Charlotte Hornets",
	CHI: "Chicago Bulls",
	CLE: "Cleveland Cavaliers",
	DAL: "Dallas Mavericks",
	DEN: "Denver Nuggets",
	DET: "Detroit Pistons",
	GSW: "Golden State Warriors",
	HOU: "Houston Rockets",
	IND: "Indiana Pacers",
	LAC: "LA Clippers",
	LAL: "Los Angeles Lakers",
	MEM: "Memphis Grizzlies",
	MIA: "Miami Heat",
	MIL: "Milwaukee Bucks",
	MIN: "Minnesota Timberwolves",
	NOP: "New Orleans Pelicans",
	NYK: "New York Knicks",
	OKC: "Oklahoma City Thunder",
	ORL: "Orlando Magic",
	PHI: "Philadelphia 76ers",
	PHX: "Phoenix Suns",
	POR: "Portland Trail Blazers",
	SAC: "Sacramento Kings",
	SAS: "San Antonio Spurs",
	TOR: "Toronto Raptors",
	UTA: "Utah Jazz",
	WAS: "Washington Wizards",
};

export const WNBA_TEAM_COLORS = {
	ATL: { shirt: "#e3173e", alternate: "#4891ce", trim: "#4891ce", ink: "#ffffff" },
	CHI: { shirt: "#4d90cd", alternate: "#ffd520", trim: "#ffd520", ink: "#101820" },
	CON: { shirt: "#f05023", alternate: "#0a2240", trim: "#0a2240", ink: "#101820" },
	DAL: { shirt: "#c4d600", alternate: "#002b5c", trim: "#002b5c", ink: "#101820" },
	GSV: { shirt: "#b896d4", alternate: null, trim: "#000000", ink: "#101820" },
	IND: { shirt: "#e2293a", alternate: "#20305d", trim: "#20305d", ink: "#ffffff" },
	LAS: { shirt: "#552583", alternate: "#fdb927", trim: "#fdb927", ink: "#ffffff" },
	LVA: { shirt: "#000000", alternate: "#a7a8aa", trim: "#a7a8aa", ink: "#ffffff" },
	MIN: { shirt: "#315c98", alternate: "#9c9e9f", trim: "#9c9e9f", ink: "#ffffff" },
	NYL: { shirt: "#87d5b5", alternate: null, trim: "#100f0d", ink: "#101820" },
	PDX: { shirt: "#010101", alternate: "#c8102e", trim: "#c8102e", ink: "#ffffff" },
	PHX: { shirt: "#fa4b0a", alternate: "#3c286e", trim: "#3c286e", ink: "#101820" },
	SEA: { shirt: "#2c5235", alternate: "#fee11a", trim: "#fee11a", ink: "#ffffff" },
	TOR: { shirt: "#441e36", alternate: "#b8ccea", trim: "#441e36", ink: "#ffffff" },
	WAS: { shirt: "#002b5c", alternate: "#c4ced4", trim: "#c4ced4", ink: "#ffffff" },
};

export const WNBA_TEAM_NAMES = {
	ATL: "Atlanta Dream",
	CHI: "Chicago Sky",
	CON: "Connecticut Sun",
	DAL: "Dallas Wings",
	GSV: "Golden State Valkyries",
	IND: "Indiana Fever",
	LAS: "Los Angeles Sparks",
	LVA: "Las Vegas Aces",
	MIN: "Minnesota Lynx",
	NYL: "New York Liberty",
	PDX: "Portland Fire",
	PHX: "Phoenix Mercury",
	SEA: "Seattle Storm",
	TOR: "Toronto Tempo",
	WAS: "Washington Mystics",
};

export function getTeamColors(team) {
	return (team.league === "wnba" ? WNBA_TEAM_COLORS : TEAM_COLORS)[team.code];
}

export function getTeamName(team) {
	return (team.league === "wnba" ? WNBA_TEAM_NAMES : TEAM_NAMES)[team.code];
}

export function getTeamLogo(team) {
	return `./img/${team.league === "wnba" ? "WNBA" : "NBA"}/${team.code}.svg`;
}

export function getJerseyColors(team, opponent) {
	const colors = getTeamColors(team);
	const other = getTeamColors(opponent);
	const jerseys = team.home ? selectMatchupJerseys(colors, other) : selectMatchupJerseys(other, colors);
	return team.home ? jerseys.home : jerseys.away;
}
