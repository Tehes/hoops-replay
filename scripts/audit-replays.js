import { checkReplay } from "./check-replay.js";

const ROOT = new URL("../data/", import.meta.url);

async function init() {
	const games = [];
	for await (const entry of Deno.readDir(ROOT)) {
		if (entry.isFile && /^replay-\d{10}\.json$/.test(entry.name)) {
			games.push(entry.name);
		}
	}
	if (!games.length) {
		throw new Error("No replay snapshots found.");
	}
	games.sort();
	let frames = 0;
	let errorCount = 0;
	const profiles = new Set();
	for (const file of games) {
		const data = JSON.parse(await Deno.readTextFile(new URL(file, ROOT)));
		const result = checkReplay(data);
		frames += result.frames;
		errorCount += result.errors.length;
		result.profiles.forEach((profile) => profiles.add(profile));
		console.log(JSON.stringify({ ...result, profiles: result.profiles.length }));
	}
	console.log(JSON.stringify({ games: games.length, frames, profiles: profiles.size, errorCount }));
	if (errorCount) {
		Deno.exitCode = 1;
	}
}

init().catch((error) => {
	console.error(error);
	Deno.exitCode = 1;
});
