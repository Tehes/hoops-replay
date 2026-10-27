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

Deno.test("distinct primaries keep home white and away primary even with low graphic contrast", () => {
	for (const [homeCode, awayCode] of [["OKC", "DEN"], ["BOS", "PHI"], ["LAL", "DAL"]]) {
		const home = { code: homeCode, home: true };
		const away = { code: awayCode, home: false };
		assert(getJerseyColors(home, away).shirt === "#ffffff", "home should remain white");
		assert(getJerseyColors(away, home).shirt === TEAM_COLORS[awayCode].shirt, "away should keep primary");
	}
	assert(contrast(TEAM_COLORS.BOS.shirt, TEAM_COLORS.PHI.shirt) < 2.5, "example must cover the removed limit");
});

Deno.test("MEM at SAC keeps home white when the schedule rejects Memphis alternate", () => {
	const home = { code: "SAC", home: true };
	const away = { code: "MEM", home: false };
	assert(
		getJerseyColors(home, away).shirt === "#ffffff",
		"Sacramento must stay white despite a hue gap below 45 degrees",
	);
	assert(getJerseyColors(away, home).shirt === TEAM_COLORS.MEM.shirt, "Memphis must keep primary blue");
	const improved = selectMatchupJerseys(TEAM_COLORS.SAC, { ...TEAM_COLORS.MEM, alternate: "#ffffff" });
	assert(
		improved.home.shirt === TEAM_COLORS.SAC.shirt,
		"an actually improving team alternate must enable the switch",
	);
});

Deno.test("similar primaries with improving alternates allow alternate, white or black away jerseys", () => {
	for (
		const [homeCode, awayCode, shirt] of [["BOS", "MIL", "#000000"], ["NYK", "PHX", TEAM_COLORS.PHX.alternate], [
			"BKN",
			"SAS",
			"#ffffff",
		]]
	) {
		const home = { code: homeCode, home: true };
		const away = { code: awayCode, home: false };
		assert(getJerseyColors(home, away).shirt === getTeamColors(home).shirt, "home must match its paint");
		assert(getJerseyColors(away, home).shirt === shirt, "away chose the wrong variant");
	}
});

Deno.test("jerseys retain team identity and use readable primary, alternate or neutral details", () => {
	const green = { shirt: "#00471a", alternate: "#eee1c6" };
	let jerseys = selectMatchupJerseys(green, { shirt: "#008348", alternate: null });
	assert(jerseys.away.ink === "#008348", "primary should decorate white when readable");
	jerseys = selectMatchupJerseys({ shirt: "#008348" }, green);
	assert(jerseys.away.shirt === "#000000", "similar green primaries can use black away");
	assert(jerseys.away.ink === "#eee1c6", "cream should win against black");
	jerseys = selectMatchupJerseys({ shirt: "#fdb927", alternate: null }, { shirt: "#0d2240" });
	assert(jerseys.home.ink === "#000000", "light primary on white needs neutral fallback");
	jerseys = selectMatchupJerseys({ shirt: "#ffffff" }, { shirt: "#000000", alternate: "#ffffff" });
	assert(jerseys.away.ink === "#ffffff", "primary jerseys need contrasting neutral details");
	jerseys = selectMatchupJerseys({ shirt: "#ffffff" }, { shirt: "#000000", alternate: "#eee1c6" });
	assert(jerseys.away.ink === "#eee1c6", "black primary must also use a readable alternate");
});

Deno.test("ATL at CHI prefers black with readable red details", () => {
	const home = { code: "CHI", home: true };
	const away = { code: "ATL", home: false };
	const jersey = getJerseyColors(away, home);
	assert(jersey.shirt === "#000000", "Atlanta red is more readable on black");
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

Deno.test("DEN at PHI uses white with navy details, while Magic and Knicks retain away primary", () => {
	const denver = getJerseyColors({ code: "DEN", home: false }, { code: "PHI", home: true });
	assert(denver.shirt === "#ffffff" && denver.ink === TEAM_COLORS.DEN.shirt, "Denver needs white with navy details");
	for (const [homeCode, awayCode] of [["ORL", "NYK"], ["NYK", "ORL"]]) {
		const home = { code: homeCode, home: true };
		const away = { code: awayCode, home: false };
		assert(getJerseyColors(home, away).shirt === "#ffffff", "distinct primaries should keep home white");
		assert(getJerseyColors(away, home).shirt === TEAM_COLORS[awayCode].shirt, "away should retain primary");
	}
	const distinct = selectMatchupJerseys({ shirt: "#000000" }, { shirt: "#87d5b5", alternate: null });
	assert(
		distinct.home.shirt === "#ffffff" && distinct.away.shirt === "#87d5b5" && distinct.away.ink === "#000000",
		"light away primary must not force a switch when primaries are distinct",
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
	assert(
		getJerseyColors(home, away).shirt === "#ffffff",
		"WNBA home should stay white without sufficient alternate improvement",
	);
	assert(getJerseyColors(away, home).shirt === WNBA_TEAM_COLORS.ATL.shirt, "WNBA away must use its league's primary");
});

Deno.test("former palette conflicts retain team colors without a fixed graphic minimum", () => {
	for (const code of ["CHI", "DET", "HOU", "POR", "TOR"]) {
		const jersey = getJerseyColors({ code, home: false }, { code: "NYK", home: true });
		const colors = TEAM_COLORS[code];
		assert(
			[colors.shirt, colors.alternate].some((color) => color === jersey.shirt || color === jersey.ink),
			`${code}@NYK should retain a team color`,
		);
	}
	const chicago = getJerseyColors({ code: "CHI", league: "wnba", home: false }, {
		code: "SEA",
		league: "wnba",
		home: true,
	});
	assert(
		chicago.shirt === WNBA_TEAM_COLORS.CHI.shirt && chicago.trim === "#000000" && chicago.ink === "#000000",
		"WNBA Chicago should retain primary with black details at Seattle",
	);
});

Deno.test("after the schedule triggers a switch, away primary is excluded even with readable numbers", () => {
	const jerseys = selectMatchupJerseys(TEAM_COLORS.CLE, TEAM_COLORS.ATL);
	assert(jerseys.home.shirt === TEAM_COLORS.CLE.shirt, "similar red hues must put home in primary");
	assert(contrast(TEAM_COLORS.ATL.shirt, "#000000") >= 4, "Atlanta primary must have readable black numbers");
	assert(
		jerseys.away.shirt === "#000000" && jerseys.away.ink === TEAM_COLORS.ATL.shirt,
		"readable numbers must not allow a primary jersey that conflicts with home paint",
	);
	const miami = selectMatchupJerseys(TEAM_COLORS.NYK, TEAM_COLORS.MIA).away;
	assert(
		miami.shirt === "#000000" && miami.ink === "#ffffff",
		"use neutral details instead of returning to a conflicting away primary",
	);
});

Deno.test("alternate jerseys must meet the schedule's chromatic and neutral improvement thresholds", () => {
	const redHome = { shirt: "#ff0000" };
	const smallRedImprovement = selectMatchupJerseys(redHome, { shirt: "#cc0000", alternate: "#cb0000" });
	assert(
		smallRedImprovement.home.shirt === "#ffffff" && smallRedImprovement.away.shirt === "#cc0000",
		"a tiny chromatic improvement must keep home white and away primary, regardless of neutral jersey options",
	);
	assert(
		selectMatchupJerseys(redHome, { shirt: "#cc0000", alternate: "#400000" }).away.shirt === "#400000",
		"a sufficient chromatic improvement should allow alternate as a jersey base",
	);
	const greyHome = { shirt: "#999999" };
	const smallGreyImprovement = selectMatchupJerseys(greyHome, { shirt: "#555555", alternate: "#545454" });
	assert(
		smallGreyImprovement.home.shirt === "#ffffff" && smallGreyImprovement.away.shirt === "#555555",
		"a tiny neutral contrast improvement must keep home white and away primary",
	);
	assert(
		selectMatchupJerseys(greyHome, { shirt: "#555555", alternate: "#333333" }).away.shirt === "#333333",
		"a sufficient neutral contrast improvement should allow alternate",
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
				assert(
					["#ffffff", teams[homeCode].shirt].includes(jerseys[0].shirt),
					"home may only wear white or primary",
				);
				assert(
					jerseys[0].shirt !== jerseys[1].shirt,
					`${league}/${homeCode}/${awayCode} has identical jerseys`,
				);
				for (const [index, jersey] of jerseys.entries()) {
					if (index === 1 && jerseys[0].shirt !== "#ffffff") {
						assert(
							jersey.shirt !== teams[awayCode].shirt,
							`${matchup}: conflicting away primary must be excluded`,
						);
					}
					const team = index === 0 ? home : away;
					assert(
						[teams[team.code].shirt, teams[team.code].alternate, "#ffffff", "#000000"].includes(
							jersey.shirt,
						),
						"unexpected base",
					);
					assert(jersey.trim === jersey.ink && /^#[0-9a-f]{6}$/.test(jersey.ink), "invalid details");
					assert(contrast(jersey.ink, jersey.shirt) >= 4, `${matchup}: number contrast below 4:1`);
					const colors = [teams[team.code].shirt, teams[team.code].alternate].filter(Boolean);
					if (!colors.includes(jersey.shirt) && !colors.includes(jersey.ink)) {
						assert(["#ffffff", "#000000"].includes(jersey.shirt), "neutral details need a neutral base");
						if (index === 0) {
							assert(jersey.shirt === "#ffffff", "home must retain primary when not wearing white");
						}
						assert(
							colors.every((color) => contrast(color, jersey.shirt) < 4),
							`${matchup}: discarded readable team details`,
						);
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
