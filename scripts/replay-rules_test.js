import { compileReplay, getReplayFrame } from "../js/replay-engine.js";
import { planGameStates } from "../js/replay-rules.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

function scenario(actions, league = "nba") {
	return {
		gameId: league === "nba" ? "0022600007" : "1042600304",
		teams: [1, 2].map((id) => ({
			id,
			home: id === 1,
			code: id === 1 ? "BOS" : "NYK",
			players: ["PG", "SG", "SF", "PF", "C"].map((position, slot) => ({
				id: (id - 1) * 5 + slot + 1,
				position,
				starter: true,
			})),
		})),
		actions: actions.map((action, index) => ({
			period: 1,
			clock: "PT08M00S",
			scoreHome: "0",
			scoreAway: "0",
			qualifiers: [],
			actionNumber: index + 1,
			orderNumber: index + 1,
			...action,
		})),
	};
}

function rules(actions) {
	const data = scenario(actions);
	const scenes = data.actions.map((action) => ({ action, kind: action.actionType, liveSeconds: 0 }));
	planGameStates(scenes, data);
	return scenes;
}

const basket = {
	actionType: "2pt",
	subType: "Jump Shot",
	teamId: 1,
	personId: 1,
	isFieldGoal: 1,
	x: 80,
	y: 50,
	side: "right",
	shotResult: "Made",
};
const personal = {
	actionType: "foul",
	subType: "personal",
	descriptor: "shooting",
	teamId: 2,
	personId: 10,
	foulDrawnPersonId: 1,
	possession: 1,
};
const technical = { actionType: "foul", subType: "technical", teamId: 2, personId: 10, possession: 1 };
const attempt = {
	actionType: "freethrow",
	subType: "1 of 2",
	teamId: 1,
	personId: 1,
	shotResult: "Made",
};

Deno.test("a basket requires a baseline inbound before the next recorded live interruption", () => {
	for (const league of ["nba", "wnba"]) {
		for (const period of [1, 3]) {
			for (
				const interruption of [
					{ ...technical, teamId: 1, personId: 5, possession: 2 },
					{ ...technical, teamId: 1, personId: 999, possession: 2 },
					{ actionType: "timeout", subType: "full", teamId: 2, possession: 2 },
					{ actionType: "violation", subType: "kicked ball", teamId: 1, possession: 2 },
				]
			) {
				const data = scenario([{ ...basket, period }, { ...interruption, period, clock: "PT07M45S" }], league);
				const input = JSON.stringify(data);
				const replay = compileReplay(data);
				const scene = replay.scenes[1];
				const sample = (time) => getReplayFrame(replay, scene.start + time);
				assert(
					scene.rules.before.restart === "baseline" && scene.rules.before.entitledTeam === 2,
					"basket lost the receiving team's entitlement",
				);
				assert(
					scene.inboundAt < scene.liveAt && scene.liveAt < scene.eventAt,
					"recorded interruption skipped the inbound or advance",
				);
				assert(sample(scene.inboundAt - 0.01).gameState.ballStatus === "dead", "ball live before disposal");
				const disposal = sample(scene.inboundAt);
				assert(
					disposal.gameState.ballStatus === "live" && disposal.gameState.phase === "throw-in",
					"inbound disposal did not make the ball live",
				);
				assert(disposal.clock === 480, "inbound setup consumed game-clock time");
				assert(sample(scene.liveAt).gameState.phase === "play", "catch did not start court play");
				assert(sample(scene.eventAt).gameState.ballStatus === "dead", "whistle did not stop play");
				const middle = JSON.stringify(sample((scene.liveAt + scene.eventAt) / 2));
				sample(replay.duration);
				assert(JSON.stringify(sample((scene.liveAt + scene.eventAt) / 2)) === middle, "seeking changed rules");
				assert(JSON.stringify(data) === input, "planning changed recorded events");
			}
		}
	}
});

Deno.test("a technical during free throws preserves remaining attempts across dead-ball rebounds and timeouts", () => {
	for (const result of ["Made", "Missed"]) {
		const scenes = rules([
			personal,
			attempt,
			technical,
			{ ...attempt, subType: "1 of 1", descriptor: "technical", shotResult: result, teamId: 2, personId: 6 },
			{ actionType: "rebound", subType: "offensive", qualifiers: ["team", "deadball"], teamId: 2 },
			{ actionType: "timeout", teamId: 2 },
			{ ...attempt, subType: "2 of 2", shotResult: "Missed" },
			{ actionType: "rebound", subType: "defensive", teamId: 2, personId: 10 },
		]);
		assert(scenes[0].rules.after.pendingFreeThrows.length === 3, "missing recorded penalties");
		for (const index of [3, 4, 5]) {
			const state = scenes[index].rules.after;
			assert(state.phase === "free-throws" && state.restart === null, "inserted inbound during the series");
			assert(
				state.pendingFreeThrows.length === 1 && state.pendingFreeThrows[0].attempt === 2,
				"technical lost the second regular attempt",
			);
		}
		assert(
			scenes[6].rules.after.phase === "rebound" && scenes[6].rules.after.ballStatus === "live",
			"last regular miss did not remain in play",
		);
		assert(scenes[7].rules.after.controlTeam === 2, "rebound did not establish new control");
	}
});

Deno.test("technical penalties retain the interrupted inbound, independent of the free-throw team and outcome", () => {
	for (const result of ["Made", "Missed"]) {
		const scenes = rules([
			basket,
			{ ...technical, possession: 2 },
			{ ...attempt, subType: "1 of 1", descriptor: "technical", shotResult: result },
			{ actionType: "rebound", subType: "offensive", teamId: 1, qualifiers: ["deadball", "team"] },
		]);
		for (const index of [2, 3]) {
			const state = scenes[index].rules.after;
			assert(state.entitledTeam === 2 && state.restart === "baseline", "technical replaced the original inbound");
			assert(
				state.pendingFreeThrows.length === 0 && state.ballStatus === "dead",
				"technical created a live rebound",
			);
		}
	}
});

Deno.test("and-one and final free-throw outcomes determine the next restart without a second attack", () => {
	for (const result of ["Made", "Missed"]) {
		const replay = compileReplay(scenario([
			basket,
			personal,
			{ ...attempt, subType: "1 of 1", shotResult: result },
		]));
		const [shot, foul, ft] = replay.scenes;
		assert(
			shot.rules.after.phase === "free-throws" && shot.rules.after.restart === null,
			"and-one awarded an inbound",
		);
		assert(
			foul.andOneShotIndex === 0 && !foul.rules.requiresPlay && foul.inboundAt === undefined,
			"and-one invented a new possession",
		);
		assert(ft.rules.after.phase === (result === "Made" ? "throw-in" : "rebound"), "wrong final continuation");
		assert(ft.rules.after.restart === (result === "Made" ? "baseline" : null), "wrong final restart");
	}
});

Deno.test("free-throw disposal and release distinguish regular last attempts from dead penalty attempts", () => {
	for (const variant of ["intermediate", "last", "technical", "flagrant"]) {
		const ft = {
			...attempt,
			shotResult: "Missed",
			subType: variant === "intermediate" ? "1 of 2" : "1 of 1",
			descriptor: ["technical", "flagrant"].includes(variant) ? variant : "",
		};
		const replay = compileReplay(scenario([personal, ft]));
		const scene = replay.scenes[1];
		const sample = (time) => getReplayFrame(replay, scene.start + time);
		assert(sample(scene.freeThrowAt).gameState.ballStatus === "live", "free-throw disposal must be live");
		assert(sample(scene.freeThrowAt).clock === 480, "free-throw setup consumed game time");
		assert(
			sample(scene.releaseAt + 0.1).gameState.ballStatus === (variant === "last" ? "live" : "dead"),
			"free-throw flight has wrong live/dead status",
		);
		assert(sample(scene.releaseAt + 0.1).gameState.controlTeam === null, "shot flight invented team control");
		if (variant === "flagrant") {
			assert(
				scene.rules.after.restart === "flagrant" && scene.rules.after.entitledTeam === 1,
				"flagrant miss lost retained possession",
			);
		}
	}
});

Deno.test("period restarts follow the opening possession; overtime uses a jump ball", () => {
	for (const openingTeam of [1, 2]) {
		const scenes = rules([
			{ actionType: "jumpball", teamId: openingTeam },
			...[2, 3, 4, 5, 6].map((period) => ({ actionType: "period", subType: "start", period })),
		]);
		for (const scene of scenes.slice(1)) {
			const period = scene.action.period;
			const state = scene.rules.after;
			assert(state.restart === (period > 4 ? "jump-ball" : "baseline"), "wrong period restart");
			assert(
				state.entitledTeam === (period > 4 ? null : period === 4 ? openingTeam : 3 - openingTeam),
				"period awarded possession to the wrong team",
			);
			assert(state.pendingFreeThrows.length === 0, "period retained an old penalty");
		}
	}
});

Deno.test("a standalone steal transfers control at the recorded catch without awarding an inbound", () => {
	const scenes = rules([
		{ actionType: "jumpball", teamId: 1 },
		{ actionType: "steal", teamId: 2, possession: 2, personId: 10 },
	]);
	const steal = scenes[1].rules;
	assert(steal.offense === 1 && steal.play.controlTeam === 1, "stealer controlled the preceding attack");
	assert(steal.after.controlTeam === 2 && steal.after.restart === null, "steal did not preserve live play");
});
