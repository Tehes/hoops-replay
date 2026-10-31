/* --------------------------------------------------------------------------------------------------
Constants
---------------------------------------------------------------------------------------------------*/

const BASE_UPSTREAM_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
	"Accept": "application/json, text/plain, */*",
	"Accept-Encoding": "gzip, deflate, br",
	"Accept-Language": "en-US,en;q=0.9",
	"Sec-CH-UA": '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
	"Sec-CH-UA-Mobile": "?0",
	"Sec-CH-UA-Platform": '"Windows"',
	"Sec-Fetch-Dest": "empty",
	"Sec-Fetch-Mode": "cors",
	"Sec-Fetch-Site": "same-site",
};

const ALLOWED_ORIGINS = new Set(["https://tehes.github.io", "http://127.0.0.1:5500"]);
const LEAGUES = {
	nba: { origin: "https://www.nba.com", cdn: "https://cdn.nba.com", leagueId: "00" },
	wnba: { origin: "https://www.wnba.com", cdn: "https://cdn.wnba.com", leagueId: "10" },
};
/* --------------------------------------------------------------------------------------------------
State
---------------------------------------------------------------------------------------------------*/

let upstreamClientPromise = null;

/* --------------------------------------------------------------------------------------------------
Upstream requests
---------------------------------------------------------------------------------------------------*/

function getUpstreamClient() {
	if (!upstreamClientPromise) {
		upstreamClientPromise = import("npm:impit@0.14.8").then(({ Impit }) => {
			return new Impit({
				browser: "chrome151",
				proxyUrl: Deno.env.get("HTTPS_PROXY") || Deno.env.get("HTTP_PROXY"),
				ignoreTlsErrors: false,
			});
		});
	}
	return upstreamClientPromise;
}

function getUpstreamHeaders(league, isStats = false) {
	const headers = {
		...BASE_UPSTREAM_HEADERS,
		"Referer": `${league.origin}/`,
		"Origin": league.origin,
	};

	if (isStats) {
		headers["Sec-Fetch-Site"] = "cross-site";
		headers["x-nba-stats-origin"] = "stats";
		headers["x-nba-stats-token"] = "true";
	}

	return headers;
}

async function fetchUpstreamResponse(url, league, isStats = false) {
	try {
		const client = await getUpstreamClient();
		const headers = getUpstreamHeaders(league, isStats);
		// Keep the user agent and client hints consistent with the TLS browser profile.
		delete headers["User-Agent"];
		delete headers["Sec-CH-UA"];
		delete headers["Sec-CH-UA-Mobile"];
		delete headers["Sec-CH-UA-Platform"];
		return await client.fetch(url, { headers });
	} catch (error) {
		console.warn("Browser HTTP client failed; using native fetch:", error);
		return fetch(url, { headers: getUpstreamHeaders(league, isStats) });
	}
}

/* --------------------------------------------------------------------------------------------------
Responses and CORS
---------------------------------------------------------------------------------------------------*/

function corsHeaders(origin) {
	const headers = new Headers({
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Vary": "Origin",
	});
	if (ALLOWED_ORIGINS.has(origin)) {
		headers.set("Access-Control-Allow-Origin", origin);
	}
	return headers;
}

function errorResponse(message, status, origin) {
	const headers = corsHeaders(origin);
	headers.set("Content-Type", "text/plain; charset=utf-8");
	headers.set("Cache-Control", "no-store");
	return new Response(message, { status, headers });
}

async function proxyWithCors(url, origin, league, isStats = false) {
	const res = await fetchUpstreamResponse(url, league, isStats);
	// Buffer before responding to avoid upstream stream failures at Deploy's HTTP/2 boundary.
	const body = await res.arrayBuffer();
	const headers = corsHeaders(origin);
	headers.set("Content-Type", res.headers.get("content-type") || "application/json; charset=utf-8");
	if (res.ok && isStats) {
		headers.set("Cache-Control", "public, max-age=3600");
	} else {
		headers.set("Cache-Control", "no-store");
	}
	return new Response(body, { status: res.status, headers });
}

/* --------------------------------------------------------------------------------------------------
Request handling
---------------------------------------------------------------------------------------------------*/

export async function handleRequest(req) {
	const url = new URL(req.url);
	const origin = req.headers.get("origin") || "";

	// --- Origin and method validation ---
	if (!ALLOWED_ORIGINS.has(origin)) {
		return errorResponse("Forbidden", 403, origin);
	}
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders(origin) });
	}
	if (req.method !== "GET") {
		const response = errorResponse("Method Not Allowed", 405, origin);
		response.headers.set("Allow", "GET, OPTIONS");
		return response;
	}

	// --- League selection ---
	const leagueId = url.searchParams.get("league") || "nba";
	const league = Object.hasOwn(LEAGUES, leagueId) ? LEAGUES[leagueId] : null;
	if (!league) {
		return errorResponse("Invalid league", 400, origin);
	}

	try {
		// --- Schedule ---
		if (url.pathname === "/schedule") {
			const regionCode = url.searchParams.get("region") === "us" ? "1" : "14";
			return await proxyWithCors(
				`${league.cdn}/static/json/staticData/scheduleLeagueV2_${regionCode}.json`,
				origin,
				league,
			);
		}

		// --- Boxscore and play-by-play ---
		const gameRoute = /^\/(boxscore|playbyplay)\/(.*)$/.exec(url.pathname);
		if (gameRoute) {
			const [, resource, gameId] = gameRoute;
			if (!/^\d{10}$/.test(gameId)) {
				return errorResponse("Invalid gameId", 400, origin);
			}
			return await proxyWithCors(
				`${league.cdn}/static/json/liveData/${resource}/${resource}_${gameId}.json`,
				origin,
				league,
			);
		}

		// --- Roster and player statistics ---
		const teamRoute = /^\/(roster|players)\/(.*)$/.exec(url.pathname);
		if (teamRoute) {
			const [, resource, teamId] = teamRoute;
			const season = url.searchParams.get("season") || "";
			if (!/^\d{10}$/.test(teamId)) {
				return errorResponse("Invalid teamId", 400, origin);
			}
			const seasonMatch = /^(\d{4})-(\d{2})$/.exec(season);
			const validSeason = leagueId === "wnba"
				? /^\d{4}$/.test(season)
				: seasonMatch && Number(seasonMatch[2]) === (Number(seasonMatch[1]) + 1) % 100;
			if (!validSeason) {
				return errorResponse(
					leagueId === "wnba"
						? "A season in YYYY format is required"
						: "A season in YYYY-YY format is required",
					400,
					origin,
				);
			}
			const params = new URLSearchParams({ LeagueID: league.leagueId, Season: season, TeamID: teamId });
			let endpoint = "commonteamroster";
			if (resource === "players") {
				const seasonType = url.searchParams.get("seasonType") || "Regular Season";
				if (!["Regular Season", "Playoffs", "Pre Season"].includes(seasonType)) {
					return errorResponse("Invalid seasonType", 400, origin);
				}
				endpoint = "teamplayerdashboard";
				const filters = {
					DateFrom: "",
					DateTo: "",
					GameSegment: "",
					ISTRound: "",
					LastNGames: "0",
					Location: "",
					MeasureType: "Base",
					Month: "0",
					OpponentTeamID: "0",
					Outcome: "",
					PORound: "0",
					PaceAdjust: "N",
					PerMode: "PerGame",
					Period: "0",
					PlusMinus: "N",
					Rank: "N",
					SeasonSegment: "",
					SeasonType: seasonType,
					ShotClockRange: "",
					VsConference: "",
					VsDivision: "",
				};
				for (const [key, value] of Object.entries(filters)) {
					params.set(key, value);
				}
			}
			return await proxyWithCors(
				`https://stats.nba.com/stats/${endpoint}?${params}`,
				origin,
				league,
				true,
			);
		}

		// --- Unknown route ---
		return errorResponse("Not Found", 404, origin);
	} catch (error) {
		console.error("[upstream error]", error);
		return errorResponse("Upstream request failed", 502, origin);
	}
}

/* --------------------------------------------------------------------------------------------------
Server initialization
---------------------------------------------------------------------------------------------------*/

if (import.meta.main) {
	Deno.serve(handleRequest);
}
