import { selectMatchupJerseys } from "../js/replay-colors.js";
import { getJerseyColors, getTeamColors, TEAM_COLORS, WNBA_TEAM_COLORS } from "../js/replay-teams.js";

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function contrast(first, second) {
	const luminance = (hex) => {
		const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
			.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
		return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
	};
	const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
	return (values[0] + 0.05) / (values[1] + 0.05);
}

Deno.test("distinct primaries keep home white and away primary", () => {
	const home = { code: "OKC", home: true };
	const away = { code: "DEN", home: false };
	assert(getJerseyColors(home, away).shirt === "#ffffff", "home should remain white");
	assert(getJerseyColors(away, home).shirt === TEAM_COLORS.DEN.shirt, "away should keep primary");
});

Deno.test("similar primaries put home in primary and away in the contrasting neutral", () => {
	for (
		const [homeCode, awayCode, neutral] of [["BOS", "MIL", "#000000"], ["NYK", "PHX", "#000000"], [
			"BKN",
			"SAS",
			"#ffffff",
		]]
	) {
		const home = { code: homeCode, home: true };
		const away = { code: awayCode, home: false };
		assert(getJerseyColors(home, away).shirt === getTeamColors(home).shirt, "home must match its paint");
		assert(getJerseyColors(away, home).shirt === neutral, "away chose the wrong neutral");
	}
});

Deno.test("jerseys retain team identity and use readable primary, alternate or neutral details", () => {
	const green = { shirt: "#00471a", alternate: "#eee1c6" };
	let jerseys = selectMatchupJerseys(green, { shirt: "#008348", alternate: null });
	assert(jerseys.away.ink === "#008348", "primary should decorate white when readable");
	jerseys = selectMatchupJerseys({ shirt: "#87d5b5" }, green);
	assert(jerseys.away.shirt === "#000000", "light green paint needs black away");
	assert(jerseys.away.ink === "#eee1c6", "cream should win against black");
	jerseys = selectMatchupJerseys({ shirt: "#fdb927", alternate: null }, { shirt: "#0d2240" });
	assert(jerseys.home.ink === "#000000", "light primary on white needs neutral fallback");
	jerseys = selectMatchupJerseys({ shirt: "#ffffff" }, { shirt: "#000000", alternate: "#ffffff" });
	assert(jerseys.away.ink === "#ffffff", "primary jerseys need contrasting neutral details");
	jerseys = selectMatchupJerseys({ shirt: "#ffffff" }, { shirt: "#000000", alternate: "#eee1c6" });
	assert(jerseys.away.ink === "#eee1c6", "black primary must also use a readable alternate");
});

Deno.test("ATL at CHI prefers black with red details once the 3:1 graphic minimum is met", () => {
	const home = { code: "CHI", home: true };
	const away = { code: "ATL", home: false };
	const jersey = getJerseyColors(away, home);
	assert(jersey.shirt === "#000000", "Atlanta red is more readable on black, which passes 3:1 against Chicago red");
	assert(
		jersey.trim === TEAM_COLORS.ATL.shirt && jersey.ink === TEAM_COLORS.ATL.shirt,
		"Atlanta red should pass 4:1",
	);
	const lowContrast = selectMatchupJerseys({ shirt: "#008348" }, { shirt: "#87d5b5", alternate: null });
	assert(
		lowContrast.away.shirt === "#000000" && lowContrast.away.ink === "#87d5b5",
		"switch base to retain readable team details",
	);
});

Deno.test("DEN at PHI rejects black below 3:1, while NYK at ORL retains identity through its alternate", () => {
	const denver = getJerseyColors({ code: "DEN", home: false }, { code: "PHI", home: true });
	assert(denver.shirt === "#ffffff" && denver.ink === TEAM_COLORS.DEN.shirt, "Denver needs white with navy details");
	const newYork = getJerseyColors({ code: "NYK", home: false }, { code: "ORL", home: true });
	assert(
		newYork.shirt === "#ffffff" && newYork.ink === TEAM_COLORS.NYK.alternate,
		"New York needs white with blue details",
	);
	const fallback = selectMatchupJerseys({ shirt: "#000000" }, { shirt: "#87d5b5", alternate: null });
	assert(
		fallback.away.shirt === "#87d5b5" && fallback.away.ink === "#000000",
		"use primary if no neutral can satisfy both limits",
	);
});

Deno.test("optional alternates are explicit and league palettes remain separate", () => {
	assert(TEAM_COLORS.MIL.alternate === "#eee1c6", "Bucks must use real Cream City cream");
	assert(TEAM_COLORS.GSW.alternate === "#1d428a", "Warriors must retain their current blue Icon color");
	const brooklyn = { code: "BKN", home: true };
	const sanAntonio = { code: "SAS", home: false };
	const brooklynJersey = getJerseyColors(brooklyn, sanAntonio);
	assert(brooklynJersey.shirt === "#000000", "similar primaries should keep Brooklyn in black");
	assert(brooklynJersey.ink === TEAM_COLORS.BKN.alternate, "Brooklyn grey must participate in contrast selection");
	assert(brooklynJersey.ink !== "#000000", "Brooklyn details must remain visible");
	const home = { code: "TOR", league: "wnba", home: true };
	const away = { code: "ATL", league: "wnba", home: false };
	assert(getJerseyColors(home, away).shirt === WNBA_TEAM_COLORS.TOR.shirt, "WNBA matchup should switch");
	assert(getJerseyColors(away, home).shirt === "#ffffff", "WNBA away needs white");
});

Deno.test("the seven palette conflicts use neutral details without lowering either contrast minimum", () => {
	for (const code of ["CHI", "DET", "HOU", "ORL", "POR", "TOR"]) {
		const jersey = getJerseyColors({ code, home: false }, { code: "NYK", home: true });
		assert(
			jersey.shirt === "#000000" && jersey.trim === "#ffffff" && jersey.ink === "#ffffff",
			`${code}@NYK needs black with white details`,
		);
	}
	const chicago = getJerseyColors({ code: "CHI", league: "wnba", home: false }, {
		code: "SEA",
		league: "wnba",
		home: true,
	});
	assert(
		chicago.shirt === "#ffffff" && chicago.trim === "#000000" && chicago.ink === "#000000",
		"WNBA CHI@SEA needs white with black details",
	);
});

Deno.test("all matchups are deterministic, use allowed bases and preserve court palettes", () => {
	for (const [league, teams] of [["nba", TEAM_COLORS], ["wnba", WNBA_TEAM_COLORS]]) {
		const original = JSON.stringify(teams);
		assert(Object.values(teams).every((colors) => colors.alternate !== "#000000"), "black must remain implicit");
		for (const homeCode of Object.keys(teams)) {
			for (const awayCode of Object.keys(teams)) {
				if (homeCode === awayCode) {
					continue;
				}
				const home = { code: homeCode, league, home: true };
				const away = { code: awayCode, league, home: false };
				const jerseys = [getJerseyColors(home, away), getJerseyColors(away, home)];
				const matchup = `${league}/${homeCode}/${awayCode}`;
				assert(contrast(jerseys[0].shirt, jerseys[1].shirt) >= 3, `${matchup}: jersey contrast below 3:1`);
				assert(
					contrast(jerseys[1].shirt, teams[homeCode].shirt) >= 3,
					`${matchup}: away/court contrast below 3:1`,
				);
				assert(
					jerseys[0].shirt !== jerseys[1].shirt,
					`${league}/${homeCode}/${awayCode} has identical jerseys`,
				);
				for (const [index, jersey] of jerseys.entries()) {
					const team = index === 0 ? home : away;
					assert([teams[team.code].shirt, "#ffffff", "#000000"].includes(jersey.shirt), "unexpected base");
					assert(jersey.trim === jersey.ink && /^#[0-9a-f]{6}$/.test(jersey.ink), "invalid details");
					assert(contrast(jersey.ink, jersey.shirt) >= 4, `${matchup}: number contrast below 4:1`);
					const colors = [teams[team.code].shirt, teams[team.code].alternate].filter(Boolean);
					if (!colors.includes(jersey.shirt) && !colors.includes(jersey.ink)) {
						assert(index === 1, `${matchup}: only away may need the identity fallback`);
						assert(["#ffffff", "#000000"].includes(jersey.shirt), "fallback must use a neutral base");
						const feasible = [teams[team.code].shirt, "#ffffff", "#000000"].some((shirt) =>
							contrast(shirt, jerseys[0].shirt) >= 3 && contrast(shirt, teams[homeCode].shirt) >= 3 &&
							[...colors, "#ffffff", "#000000"].some((ink) =>
								(colors.includes(shirt) || colors.includes(ink)) && contrast(ink, shirt) >= 4
							)
						);
						assert(!feasible, `${matchup}: dropped team color despite a readable alternative`);
					}
					assert(
						JSON.stringify(jersey) === JSON.stringify(getJerseyColors(team, index === 0 ? away : home)),
						"unstable selection",
					);
				}
			}
		}
		assert(JSON.stringify(teams) === original, "jersey selection mutated the court palettes");
	}
});
