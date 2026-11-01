import { loadLockerVisionUniforms } from "../api/main.js";

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
