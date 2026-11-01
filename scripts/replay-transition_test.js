import { compileReplay, getReplayFrame } from "../js/replay-engine.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

function scenario({ league = "nba", mirrored = false, recovery = "rebound", seconds = 6,
	marked = true, three = false, assist = false, stopped = false, result = "Missed" } = {}) {
	const side = mirrored ? "left" : "right";
	const actions = [
		{ actionType: "2pt", subType: "Jump Shot", teamId: 1, personId: 1, isFieldGoal: 1,
			x: mirrored ? 14 : 86, y: 50, side, shotResult: "Missed", clock: "PT08M01S" },
		recovery === "rebound" || recovery === "offensive"
			? { actionType: "rebound", subType: recovery === "offensive" ? "offensive" : "defensive",
				teamId: recovery === "offensive" ? 1 : 2, personId: recovery === "offensive" ? 4 : 9,
				clock: "PT08M00S", shotActionNumber: 1 }
			: { actionType: "turnover", subType: "bad pass", teamId: 1, personId: 1,
				stealPersonId: recovery === "steal" ? 9 : undefined, clock: "PT08M00S" },
		...(stopped ? [{ actionType: "timeout", subType: "full", teamId: 2, clock: "PT08M00S" }] : []),
		{ actionType: three ? "3pt" : "2pt", subType: three ? "Jump Shot" : "Layup",
			descriptor: three ? "" : "running", teamId: recovery === "offensive" ? 1 : 2,
			personId: recovery === "offensive" ? 4 : assist ? 8 : 9, assistPersonId: assist ? 7 : undefined,
			isFieldGoal: 1, x: recovery === "offensive" ? mirrored ? 14 : 86 : mirrored ? three ? 70 : 90 : three ? 30 : 10,
			y: three ? 15 : 50, side: recovery === "offensive" ? side : mirrored ? "right" : "left", shotResult: result,
			qualifiers: marked ? ["fastbreak"] : ["fromturnover"], clock: `PT07M${60 - seconds}S`,
			scoreAway: result === "Made" ? String(three ? 3 : 2) : "0" },
	];
	return {
		gameId: league === "nba" ? "0022600007" : "1042600304",
		teams: [2, 1].map((id) => ({ id, score: id === 2 && result === "Made" ? (three ? 3 : 2) : 0, home: id === 1, code: id === 1 ? "BOS" : "NYK",
			players: ["PG", "SG", "SF", "PF", "C"].map((position, slot) => ({
				id: (id - 1) * 5 + slot + 1, position, starter: true,
			})) })),
		actions: actions.map((action, index) => ({ period: 1, scoreHome: "0", scoreAway: "0", qualifiers: [],
			actionNumber: index + 1, orderNumber: index + 1, ...action })),
	};
}

Deno.test("recorded fastbreaks preserve recovery, assists, shot anchors and seeking in both leagues and directions", () => {
	for (const league of ["nba", "wnba"]) {
		for (const mirrored of [false, true]) {
			for (const recovery of ["rebound", "steal"]) {
				for (const three of [false, true]) {
					for (const assist of [false, true]) {
						for (const result of ["Made", "Missed"]) {
							const data = scenario({ league, mirrored, recovery, three, assist, result });
							const source = JSON.stringify(data);
							const replay = compileReplay(data);
							const scene = replay.scenes.at(-1);
							const plan = scene.transitionPlan;
							assert(plan?.source === "recorded-fastbreak" && plan.carrier === 9, "lost recorded recovery");
							assert(scene.preparationWait === 0 && !scene.connectionPasses, "inserted half-court buildup");
							assert(!plan.passes.some((pass) => pass.to === 6), "forced ball to the first lineup slot");
							const release = scene.frames.find((frame) => frame.time === scene.releaseAt);
							const shooter = release.players.find((player) => player.id === scene.action.personId);
							assert(Math.hypot(shooter.x - scene.shotPoint.x, shooter.y - scene.shotPoint.y) < 0.001,
								"changed recorded shot location");
							for (const pass of plan.passes) {
								const flight = scene.frames.filter((frame) => frame.time > pass.releaseAt && frame.time < pass.catchAt);
								assert(flight.length >= 3 && flight.every((frame) => !frame.ball.owner), "pass changed owner without flight");
							}
							const time = scene.start + (plan.startAt + plan.endAt) / 2;
							const frame = JSON.stringify(getReplayFrame(replay, time));
							getReplayFrame(replay, replay.duration);
							assert(JSON.stringify(getReplayFrame(replay, time)) === frame, "seeking changed transition");
							assert(JSON.stringify(data) === source, "rewrote source events");
							assert(replay.finalScore[0] === (result === "Made" ? three ? 3 : 2 : 0), "changed recorded score");
							assert(scene.frames.every((frame) => frame.players.every((player) =>
								Number.isFinite(player.x) && Number.isFinite(player.y))), "non-finite transition positions");
						}
					}
				}
			}
		}
	}
});

Deno.test("transition inference excludes dead turnovers, stoppages, second chances and slow possessions", () => {
	for (const options of [{ recovery: "dead" }, { stopped: true }, { recovery: "offensive" }, { seconds: 20 }]) {
		const scene = compileReplay(scenario({ marked: false, ...options })).scenes.at(-1);
		assert(!scene.transitionPlan, `invented transition: ${JSON.stringify(options)}`);
	}
	for (const options of [{ stopped: true }, { recovery: "offensive" }, { recovery: "dead" }]) {
		assert(!compileReplay(scenario(options)).scenes.at(-1).transitionPlan,
			"fastbreak label overrode an incompatible restart");
	}
	const inferred = compileReplay(scenario({ marked: false, recovery: "steal" })).scenes.at(-1);
	assert(inferred.transitionPlan?.source === "inferred-transition", "ignored live running opportunity");
});

Deno.test("explicit evidence outranks the short-possession heuristic and follows a legal inbound after a basket", () => {
	const longer = compileReplay(scenario({ seconds: 12, three: true })).scenes.at(-1);
	assert(longer.transitionPlan?.source === "recorded-fastbreak", "discarded explicit evidence after eight seconds");
	const data = scenario({ three: true });
	data.actions[0].shotResult = "Made";
	data.actions[0].scoreHome = "2";
	data.actions = data.actions.filter((action) => action.actionType !== "rebound");
	data.actions.at(-1).scoreHome = "2";
	const scene = compileReplay(data).scenes.at(-1);
	assert(scene.transitionPlan?.origin === "made-basket", "lost marked transition after a basket");
	assert(scene.inboundAt < scene.liveAt && scene.liveAt <= scene.transitionPlan.startAt,
		"fastbreak bypassed the required inbound");
});

Deno.test("transition rules are independent of game identity and keep the assist pass visible on running finishes", () => {
	const data = scenario({ assist: true, recovery: "steal" });
	const replay = compileReplay(data);
	const scene = replay.scenes.at(-1);
	const other = structuredClone(data);
	other.gameId = "0022600999";
	assert(JSON.stringify(compileReplay(other).scenes.at(-1).transitionPlan) === JSON.stringify(scene.transitionPlan),
		"game identity changed the transition decision");
	assert(scene.catchAt > scene.shotPassAt, "running finish skipped the recorded assist pass");
	const flight = scene.frames.filter((frame) => frame.time > scene.shotPassAt && frame.time < scene.catchAt);
	assert(flight.length >= 3 && flight.every((frame) => !frame.ball.owner && !frame.ball.dribble),
		"running assist changed ownership without a flight");
	for (let i = 1; i < scene.frames.length; i++) {
		const from = scene.frames[i - 1];
		const to = scene.frames[i];
		if (from.time < scene.transitionPlan.startAt || to.time > scene.transitionPlan.endAt) {
			continue;
		}
		for (const player of from.players) {
			const end = to.players.find((other) => other.id === player.id);
			assert(Math.hypot(end.x - player.x, end.y - player.y) <= (to.time - from.time) * 18 + 0.001,
				"transition rushed a player between anchors");
		}
	}
});
