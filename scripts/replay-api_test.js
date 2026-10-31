import { handleRequest } from "../api/main.js";

Deno.test("API rejects missing and foreign origins without reflecting them", async () => {
	for (const origin of ["", "https://example.org"]) {
		const response = await handleRequest(
			new Request("http://localhost/schedule", {
				headers: origin ? { Origin: origin } : {},
			}),
		);
		if (response.status !== 403 || response.headers.has("Access-Control-Allow-Origin")) {
			throw new Error("Untrusted origins must be rejected");
		}
	}
});

Deno.test("API accepts preflight and rejects writes for an allowed origin", async () => {
	for (const [method, status] of [["OPTIONS", 204], ["POST", 405]]) {
		const response = await handleRequest(
			new Request("http://localhost/schedule", {
				method,
				headers: { Origin: "http://127.0.0.1:5500" },
			}),
		);
		if (
			response.status !== status ||
			response.headers.get("Access-Control-Allow-Origin") !== "http://127.0.0.1:5500"
		) {
			throw new Error("CORS or method handling failed");
		}
	}
});

Deno.test("API rejects malformed IDs, unsupported leagues and ambiguous profile seasons before fetching", async () => {
	for (
		const path of [
			"/schedule?league=other",
			"/schedule?league=constructor",
			"/boxscore/123",
			"/playbyplay/0022600007/extra",
			"/roster/1610612738",
			"/roster/1610612738?season=2026-28",
			"/players/invalid?season=2026-27",
			"/players/1610612738?season=2026-27&seasonType=unknown",
			"/players/1611661330?league=wnba&season=2026-27",
			"/roster/1611661330?league=wnba",
		]
	) {
		const response = await handleRequest(
			new Request(`http://localhost${path}`, {
				headers: { Origin: "https://tehes.github.io" },
			}),
		);
		if (response.status !== 400) {
			throw new Error(`Expected 400 for ${path}, got ${response.status}`);
		}
	}
});
