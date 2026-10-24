/* --------------------------------------------------------------------------------------------------
constants
---------------------------------------------------------------------------------------------------*/
const APP_ORIGIN = "https://tehes.github.io";
const DEV_ORIGIN = "http://127.0.0.1:5500";
const ALLOWED_ORIGINS = new Set([
	APP_ORIGIN,
	DEV_ORIGIN,
]);

const BASE_CORS_HEADERS = {
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
	"Vary": "Origin",
};

/* --------------------------------------------------------------------------------------------------
functions
---------------------------------------------------------------------------------------------------*/
function withCors(origin, headers = {}) {
	const corsHeaders = { ...BASE_CORS_HEADERS };
	if (origin && ALLOWED_ORIGINS.has(origin)) {
		corsHeaders["Access-Control-Allow-Origin"] = origin;
	}
	return { ...corsHeaders, ...headers };
}

function jsonResponse(body, origin, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: withCors(origin, {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		}),
	});
}

function textResponse(body, status, origin) {
	return new Response(body, {
		status,
		headers: withCors(origin, {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-store",
		}),
	});
}

function emptyResponse(origin, status = 204) {
	return new Response(null, {
		status,
		headers: withCors(origin, {
			"Cache-Control": "no-store",
		}),
	});
}

function getRequestContext(request) {
	const url = new URL(request.url);
	const origin = request.headers.get("origin");
	return { url, origin };
}

async function readJson(request) {
	try {
		return await request.json();
	} catch {
		return null;
	}
}

function requestHasJsonContentType(request) {
	const contentType = (request.headers.get("content-type") || "").toLowerCase();
	return contentType.startsWith("application/json");
}

function isOriginAllowed(origin) {
	return ALLOWED_ORIGINS.has(origin);
}

/* --------------------------------------------------------------------------------------------------
route handlers
---------------------------------------------------------------------------------------------------*/
function handleOptions(origin) {
	return emptyResponse(origin);
}

function handleHealth(_request, origin) {
	return jsonResponse({ ok: true }, origin);
}

// Temporary starter example.
// Remove this block as soon as you add the first real project-specific endpoint.
function handleExampleGet(request, origin) {
	const { url } = getRequestContext(request);
	const name = (url.searchParams.get("name") || "world").trim();

	return jsonResponse({
		message: `Hello, ${name}`,
	}, origin);
}

async function handleExamplePost(request, origin) {
	if (!requestHasJsonContentType(request)) {
		return textResponse("Content-Type must be application/json", 415, origin);
	}
	const body = await readJson(request);
	if (!body) {
		return textResponse("Invalid JSON", 400, origin);
	}

	return jsonResponse({
		ok: true,
		received: body,
	}, origin);
}
// End of temporary starter example.

/* --------------------------------------------------------------------------------------------------
routing
---------------------------------------------------------------------------------------------------*/
function routeRequest(request) {
	const { url, origin } = getRequestContext(request);

	if (!isOriginAllowed(origin)) {
		return textResponse("Forbidden", 403, origin);
	}

	if (request.method === "OPTIONS") {
		return handleOptions(origin);
	}

	if (url.pathname === "/health") {
		if (request.method !== "GET") {
			return textResponse("Method not allowed", 405, origin);
		}
		return handleHealth(request, origin);
	}

	// Temporary starter example route.
	// Remove this block as soon as you add the first real project-specific route.
	if (url.pathname === "/example") {
		if (request.method === "GET") {
			return handleExampleGet(request, origin);
		}
		if (request.method === "POST") {
			return handleExamplePost(request, origin);
		}
		return textResponse("Method not allowed", 405, origin);
	}
	// End of temporary starter example route.

	return textResponse("Not found", 404, origin);
}

/* --------------------------------------------------------------------------------------------------
server
---------------------------------------------------------------------------------------------------*/
Deno.serve(async (request) => {
	try {
		return await routeRequest(request);
	} catch (error) {
		console.error("Unexpected error", error);
		return textResponse(
			"Internal error",
			500,
			request.headers.get("origin"),
		);
	}
});
