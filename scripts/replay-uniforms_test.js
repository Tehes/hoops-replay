import { loadLockerVisionUniforms } from "../api/main.js";
import { loadGameUniforms } from "../js/replay-data.js";
import { getJerseyColors } from "../js/replay-teams.js";

// Color fields from the NBA and WNBA LockerVision detail responses; unrelated content omitted.
const NBA_GAME = {
	gameId: "0022600110",
	homeTeamUniform: {
		teamId: 1610612743,
		edition_Name: "Icon Edition",
		bG_Color: "#0a2240",
		text_Color: "#ffffff",
	},
	awayTeamUniform: {
		teamId: 1610612740,
		edition_Name: "Association Edition",
		bG_Color: "#ffffff",
		text_Color: "#000000",
	},
};
const WNBA_GAME = {
	gameId: "1022600001",
	homeTeamUniform: {
		teamId: 1611661313,
		edition_Name: "Court Origins Edition",
		bG_Color: "#000000",
		text_Color: "#ffffff",
	},
	awayTeamUniform: {
		teamId: 1611661323,
		edition_Name: "Heroine Edition",
		bG_Color: "#ffffff",
		text_Color: "#000000",
	},
};

Deno.test("frontend matches LockerVision by game, league and both team identities before selecting colors", async () => {
	for (const [league, data, codes] of [["nba", NBA_GAME, ["DEN", "NOP"]], ["wnba", WNBA_GAME, ["NYL", "CON"]]]) {
		const game = {
			gameId: data.gameId,
			league,
			teams: [
				{ id: data.awayTeamUniform.teamId, code: codes[1], home: false, league },
				{ id: data.homeTeamUniform.teamId, code: codes[0], home: true, league },
			],
		};
		const payload = await loadLockerVisionUniforms(data.gameId, league, () => Promise.resolve(Response.json(data)));
		const uniforms = await loadGameUniforms(game, (url) => {
			const expected = `https://hoops-replay.tehes.deno.net/uniforms/${data.gameId}${
				league === "wnba" ? "?league=wnba" : ""
			}`;
			if (url !== expected) {
				throw new Error(`Wrong frontend uniform URL: ${url}`);
			}
			return Promise.resolve(Response.json(payload));
		});
		if (!uniforms) {
			throw new Error("Available, matching uniforms were rejected");
		}
		for (const [index, team] of game.teams.entries()) {
			const uniform = uniforms[team.home ? "home" : "away"];
			const jersey = getJerseyColors(team, game.teams[1 - index], uniform);
			if (jersey.shirt !== uniform.shirt || jersey.trim !== jersey.ink) {
				throw new Error("LockerVision colors were replaced by schematic matchup colors");
			}
		}
	}
});

Deno.test("frontend preserves both existing jerseys on absent, failed, partial or mismatched LockerVision data", async () => {
	const game = {
		gameId: NBA_GAME.gameId,
		league: "nba",
		teams: [
			{ id: 1610612740, code: "NOP", home: false },
			{ id: 1610612743, code: "DEN", home: true },
		],
	};
	const valid = await loadLockerVisionUniforms(game.gameId, "nba", () => Promise.resolve(Response.json(NBA_GAME)));
	const invalid = [
		{ ...valid, gameId: "0022500110" },
		{ ...valid, league: "wnba" },
		{ ...valid, source: "other" },
		{ ...valid, home: valid.away, away: valid.home },
		{ ...valid, away: null },
		{ ...valid, away: { ...valid.away, shirt: "#fff" } },
		null,
	];
	const fetchers = [
		() => Promise.resolve(new Response(null, { status: 204 })),
		() => Promise.resolve(new Response("Unavailable", { status: 502 })),
		() => Promise.resolve(new Response("not JSON")),
		() => Promise.reject(new Error("Connection failed")),
		...invalid.map((body) => () => Promise.resolve(Response.json(body))),
	];
	const warn = console.warn;
	let warnings = 0;
	console.warn = () => warnings++;
	try {
		for (const fetchResponse of fetchers) {
			const uniforms = await loadGameUniforms(game, fetchResponse);
			if (uniforms !== null) {
				throw new Error("Unavailable or mismatched uniforms must reject the whole pair");
			}
			for (const [index, team] of game.teams.entries()) {
				const opponent = game.teams[1 - index];
				const actual = getJerseyColors(team, opponent, uniforms?.[team.home ? "home" : "away"]);
				if (JSON.stringify(actual) !== JSON.stringify(getJerseyColors(team, opponent))) {
					throw new Error("Optional uniform failure changed the existing fallback palette");
				}
			}
		}
		if (warnings !== fetchers.length - 1) {
			throw new Error("Failures must be logged; a normal no-data response needs no warning");
		}
	} finally {
		console.warn = warn;
	}
});

Deno.test("LockerVision uses league-specific hosts and a freshly generated UTC website header", async () => {
	for (const [league, data] of [["nba", NBA_GAME], ["wnba", WNBA_GAME]]) {
		const before = new Date().toISOString().slice(0, 10).split("-").reverse().join("/");
		let decodedHeader;
		const result = await loadLockerVisionUniforms(data.gameId, league, (url, upstream, isStats, headers) => {
			const origin = `https://lockervision.${league}.com`;
			if (
				url !== `${origin}/api/GetUniformDetails?game_Id=${data.gameId}` || upstream.origin !== origin ||
				isStats || headers.Referer !== `${origin}/` || headers["Sec-Fetch-Site"] !== "same-origin" ||
				headers["X-Requested-With"] !== "XMLHttpRequest"
			) {
				throw new Error("Wrong LockerVision origin, route or website headers");
			}
			decodedHeader = atob(headers.refHeader);
			return Promise.resolve(new Response(JSON.stringify(data)));
		});
		const after = new Date().toISOString().slice(0, 10).split("-").reverse().join("/");
		if (![before, after].some((date) => decodedHeader === `71a3fa62-64c0-4edf-ad80-60e0772a7474_${date}`)) {
			throw new Error("Website header must use the current UTC date");
		}
		if (
			result.gameId !== data.gameId || result.league !== league || result.source !== "lockervision" ||
			result.home.teamId !== data.homeTeamUniform.teamId || result.away.teamId !== data.awayTeamUniform.teamId ||
			result.home.edition !== data.homeTeamUniform.edition_Name ||
			result.home.shirt !== data.homeTeamUniform.bG_Color ||
			result.home.ink !== data.homeTeamUniform.text_Color ||
			result.away.shirt !== data.awayTeamUniform.bG_Color || result.away.ink !== data.awayTeamUniform.text_Color
		) {
			throw new Error("Game identity or uniform colors were lost during normalization");
		}
	}
});

Deno.test("LockerVision normalizes HEX casing without fabricating trim or fallback colors", async () => {
	const data = structuredClone(NBA_GAME);
	data.homeTeamUniform.bG_Color = "#0A2240";
	data.homeTeamUniform.edition_Name = null;
	const result = await loadLockerVisionUniforms(
		data.gameId,
		"nba",
		() => Promise.resolve(new Response(JSON.stringify(data))),
	);
	if (result.home.shirt !== "#0a2240" || result.home.edition !== null || "trim" in result.home) {
		throw new Error("Uniform normalization must preserve only supplied information");
	}
});

Deno.test("LockerVision missing games and incomplete uniforms return no data for the existing color fallback", async () => {
	const missing = { gameId: null, homeTeamUniform: { teamId: 0 }, awayTeamUniform: { teamId: 0 } };
	const incomplete = [null, { ...NBA_GAME.homeTeamUniform, bG_Color: null }, {
		...NBA_GAME.homeTeamUniform,
		text_Color: "#fff",
	}, { ...NBA_GAME.homeTeamUniform, teamId: "1610612743" }];
	const bodies = [null, missing, ...incomplete.map((homeTeamUniform) => ({ ...NBA_GAME, homeTeamUniform }))];
	for (
		const response of [
			new Response(null, { status: 204 }),
			new Response(null, { status: 404 }),
			...bodies.map((body) => new Response(JSON.stringify(body))),
		]
	) {
		const result = await loadLockerVisionUniforms(NBA_GAME.gameId, "nba", () => Promise.resolve(response));
		if (result !== null) {
			throw new Error("Unavailable uniforms must not produce a partial or invented palette");
		}
	}
});

Deno.test("LockerVision rejects incorrect game identity, duplicate teams and invalid upstream responses", async () => {
	const bodies = [
		{ ...NBA_GAME, gameId: "0022500110" },
		{},
		{ ...NBA_GAME, awayTeamUniform: NBA_GAME.homeTeamUniform },
	];
	const fetchers = [
		...bodies.map((body) => () => Promise.resolve(new Response(JSON.stringify(body)))),
		() => Promise.resolve(new Response("not JSON")),
		() => Promise.resolve(new Response("Unauthorized client", { status: 401 })),
		() => Promise.resolve(new Response("Unavailable", { status: 503 })),
		() => Promise.reject(new Error("Network failure")),
	];
	for (const fetchResponse of fetchers) {
		let rejected = false;
		try {
			await loadLockerVisionUniforms(NBA_GAME.gameId, "nba", fetchResponse);
		} catch {
			rejected = true;
		}
		if (!rejected) {
			throw new Error("Upstream errors must remain distinguishable from missing uniform data");
		}
	}
});
