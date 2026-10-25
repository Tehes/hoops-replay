export const TEAM_COLORS = {
	ATL: { shirt: "#e03a3e", trim: "#c1d32f", ink: "#ffffff" },
	BKN: { shirt: "#000000", trim: "#ffffff", ink: "#ffffff" },
	BOS: { shirt: "#007a33", trim: "#ffffff", ink: "#ffffff" },
	CHA: { shirt: "#00788c", trim: "#1d1160", ink: "#ffffff" },
	CHI: { shirt: "#ce1141", trim: "#000000", ink: "#ffffff" },
	CLE: { shirt: "#860038", trim: "#fdbb30", ink: "#ffffff" },
	DAL: { shirt: "#0053bc", trim: "#b8c4ca", ink: "#ffffff" },
	DEN: { shirt: "#0e2240", trim: "#fec524", ink: "#ffffff" },
	DET: { shirt: "#c8102e", trim: "#1d42ba", ink: "#ffffff" },
	GSW: { shirt: "#ffc72c", trim: "#1d428a", ink: "#101820" },
	HOU: { shirt: "#ce1141", trim: "#000000", ink: "#ffffff" },
	IND: { shirt: "#002d62", trim: "#fdbb30", ink: "#ffffff" },
	LAC: { shirt: "#12173f", trim: "#c8102e", ink: "#ffffff" },
	LAL: { shirt: "#552583", trim: "#fdb927", ink: "#ffffff" },
	MEM: { shirt: "#5d76a9", trim: "#12173f", ink: "#ffffff" },
	MIA: { shirt: "#98002e", trim: "#f9a01b", ink: "#ffffff" },
	MIL: { shirt: "#00471b", trim: "#eee1c6", ink: "#ffffff" },
	MIN: { shirt: "#0c2340", trim: "#78be20", ink: "#ffffff" },
	NOP: { shirt: "#85714d", trim: "#0c2340", ink: "#ffffff" },
	NYK: { shirt: "#006bb6", trim: "#f58426", ink: "#ffffff" },
	OKC: { shirt: "#ef3b24", trim: "#007ac1", ink: "#ffffff" },
	ORL: { shirt: "#0077c0", trim: "#c4ced4", ink: "#ffffff" },
	PHI: { shirt: "#006bb6", trim: "#ed174c", ink: "#ffffff" },
	PHX: { shirt: "#e56020", trim: "#1d1160", ink: "#ffffff" },
	POR: { shirt: "#e03a3e", trim: "#000000", ink: "#ffffff" },
	SAC: { shirt: "#5a2d81", trim: "#63727a", ink: "#ffffff" },
	SAS: { shirt: "#c4ced4", trim: "#000000", ink: "#101820" },
	TOR: { shirt: "#ce1141", trim: "#000000", ink: "#ffffff" },
	UTA: { shirt: "#f9a01b", trim: "#002b5c", ink: "#101820" },
	WAS: { shirt: "#002b5c", trim: "#e31837", ink: "#ffffff" },
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
	ATL: { shirt: "#e3173e", trim: "#4891ce", ink: "#ffffff" },
	CHI: { shirt: "#4d90cd", trim: "#ffd520", ink: "#101820" },
	CON: { shirt: "#f05023", trim: "#0a2240", ink: "#101820" },
	DAL: { shirt: "#c4d600", trim: "#002b5c", ink: "#101820" },
	GSV: { shirt: "#b896d4", trim: "#000000", ink: "#101820" },
	IND: { shirt: "#e2293a", trim: "#20305d", ink: "#ffffff" },
	LAS: { shirt: "#552583", trim: "#fdb927", ink: "#ffffff" },
	LVA: { shirt: "#000000", trim: "#a7a8aa", ink: "#ffffff" },
	MIN: { shirt: "#315c98", trim: "#9c9e9f", ink: "#ffffff" },
	NYL: { shirt: "#87d5b5", trim: "#100f0d", ink: "#101820" },
	PDX: { shirt: "#010101", trim: "#c8102e", ink: "#ffffff" },
	PHX: { shirt: "#fa4b0a", trim: "#3c286e", ink: "#101820" },
	SEA: { shirt: "#2c5235", trim: "#fee11a", ink: "#ffffff" },
	TOR: { shirt: "#b8ccea", trim: "#441e36", ink: "#101820" },
	WAS: { shirt: "#002b5c", trim: "#c4ced4", ink: "#ffffff" },
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

export function getJerseyColors(team) {
	const colors = getTeamColors(team);
	if (team.home) {
		return { shirt: "#ffffff", trim: colors.shirt, ink: colors.shirt };
	}
	return colors;
}
