import { compileReplay, getReplayFrame } from "../js/replay-engine.js";
import { isInOffensiveLane } from "../js/replay-rules.js";

function assert(value, message) {
	if (!value) {
		throw new Error(message);
	}
}

// Frozen opening sequence of MIA-LAL 0022600172: Wiggins miss, Adebayo board, Giannis charge.
const fixture = {
	gameId: "0022600172", league: "nba",
	teams: [
		{ id: 1610612748, home: false, code: "MIA", players: [
			{"id":203952,"position":"F","starter":true,"heightCm":198.12,"weightKg":95.2543977,"seasonStatistics":{"id":203952,"games":7,"fieldGoalAttempts":9.3,"threePointAttempts":4.9,"threePointPercentage":0.294,"assists":1.4,"rebounds":2.6}},
			{"id":203507,"position":"F","starter":true,"heightCm":210.82,"weightKg":113.3980925,"seasonStatistics":{"id":203507,"games":7,"fieldGoalAttempts":19,"threePointAttempts":2.4,"threePointPercentage":0.235,"assists":5.7,"rebounds":12.3}},
			{"id":1628389,"position":"C-F","starter":true,"heightCm":205.74,"weightKg":117.9340162,"seasonStatistics":{"id":1628389,"games":7,"fieldGoalAttempts":12.1,"threePointAttempts":3.3,"threePointPercentage":0.174,"assists":3.4,"rebounds":8}},
			{"id":202691,"position":"G-F","starter":true,"heightCm":195.58,"weightKg":90.718474,"seasonStatistics":{"id":202691,"games":7,"fieldGoalAttempts":9.4,"threePointAttempts":8,"threePointPercentage":0.411,"assists":1.3,"rebounds":1.3}},
			{"id":1630558,"position":"G","starter":true,"heightCm":182.88,"weightKg":90.718474,"seasonStatistics":{"id":1630558,"games":7,"fieldGoalAttempts":11.9,"threePointAttempts":5,"threePointPercentage":0.457,"assists":8,"rebounds":1.4}},
		] },
		{ id: 1610612747, home: true, code: "LAL", players: [
			{"id":1629680,"position":"G-F","starter":true,"heightCm":195.58,"weightKg":91.62565874,"seasonStatistics":{"id":1629680,"games":8,"fieldGoalAttempts":6.1,"threePointAttempts":4.6,"threePointPercentage":0.459,"assists":1.3,"rebounds":1.8}},
			{"id":1631222,"position":"F","starter":true,"heightCm":203.2,"weightKg":106.59420695,"seasonStatistics":{"id":1631222,"games":7,"fieldGoalAttempts":4.1,"threePointAttempts":2.1,"threePointPercentage":0.533,"assists":1.4,"rebounds":3.6}},
			{"id":1631117,"position":"C","starter":true,"heightCm":215.9,"weightKg":111.13013065000001,"seasonStatistics":{"id":1631117,"games":8,"fieldGoalAttempts":8.8,"threePointAttempts":0,"threePointPercentage":0,"assists":1.3,"rebounds":10.5}},
			{"id":1630559,"position":"G","starter":true,"heightCm":195.58,"weightKg":89.35769689,"seasonStatistics":{"id":1630559,"games":8,"fieldGoalAttempts":14.4,"threePointAttempts":5.6,"threePointPercentage":0.444,"assists":5.1,"rebounds":3.3}},
			{"id":1629029,"position":"F-G","starter":true,"heightCm":203.2,"weightKg":104.32624510000001,"seasonStatistics":{"id":1629029,"games":7,"fieldGoalAttempts":23.6,"threePointAttempts":13.7,"threePointPercentage":0.427,"assists":8.1,"rebounds":8}},
		] },
	],
	actions: [
		{"actionNumber":2,"clock":"PT12M00.00S","period":1,"teamId":null,"actionType":"period","subType":"start","qualifiers":["startperiod"],"x":null,"y":null,"side":null,"orderNumber":773151,"scoreHome":"0","scoreAway":"0","isFieldGoal":0},
		{"actionNumber":4,"clock":"PT12M00.00S","period":1,"teamId":1610612748,"actionType":"jumpball","subType":"recovered","descriptor":"startperiod","qualifiers":[],"personId":1630558,"x":null,"y":null,"side":null,"orderNumber":773655,"scoreHome":"0","scoreAway":"0","isFieldGoal":0,"jumpBallWonPersonId":1628389,"jumpBallLostPersonId":1631117,"jumpBallRecoverdPersonId":1630558},
		{"actionNumber":7,"clock":"PT11M41.00S","period":1,"teamId":1610612748,"actionType":"3pt","subType":"Jump Shot","qualifiers":[],"personId":203952,"x":12.580851063829783,"y":2.4440000000000026,"side":"left","orderNumber":1717855,"scoreHome":"0","scoreAway":"0","isFieldGoal":1,"shotResult":"Missed","shotDistance":24.671},
		{"actionNumber":8,"clock":"PT11M41.00S","period":1,"teamId":1610612748,"actionType":"rebound","subType":"offensive","qualifiers":[],"personId":1628389,"x":null,"y":null,"side":null,"orderNumber":1717856,"scoreHome":"0","scoreAway":"0","isFieldGoal":0,"shotActionNumber":7},
		{"actionNumber":10,"clock":"PT11M33.00S","period":1,"teamId":1610612748,"actionType":"foul","subType":"offensive","descriptor":"charge","qualifiers":[],"personId":203507,"x":null,"y":null,"side":null,"orderNumber":2107104,"scoreHome":"0","scoreAway":"0","isFieldGoal":0,"foulDrawnPersonId":1630559},
	],
};

function scenario(mirrored = false) {
	const data = structuredClone(fixture);
	if (mirrored) {
		for (const action of data.actions) {
			if (action.isFieldGoal) {
				action.x = 100 - action.x;
				action.side = action.side === "left" ? "right" : "left";
			}
		}
	}
	return data;
}

Deno.test("a recorded charge connects the catch to a planted defender and visible impact in either direction", () => {
	for (const mirrored of [false, true]) {
		const data = scenario(mirrored);
		const original = JSON.stringify(data);
		const replay = compileReplay(data);
		const scene = replay.scenes.at(-1);
		const plan = scene.chargePlan;
		assert(plan?.attackerId === 203507 && plan.defenderId === 1630559, "lost recorded charge participants");
		assert(plan.contactAt - scene.reboundKickOut.catchAt < 2.5, "charge retained the idle delay after the catch");
		assert(scene.eventAt === plan.contactAt && plan.settledAt <= plan.contactAt - 0.17,
			"whistle missed the contact or defender arrived too late");
		const at = (time) => getReplayFrame(replay, scene.start + time);
		const player = (frame, id) => frame.players.find((item) => item.id === id);
		const planted = player(at(plan.settledAt + 0.01), plan.defenderId);
		const contact = at(plan.contactAt);
		const defender = player(contact, plan.defenderId);
		const attacker = player(contact, plan.attackerId);
		assert(Math.hypot(defender.x - planted.x, defender.y - planted.y) < 0.01,
			"defender kept sliding into the attacker before impact");
		assert(Math.abs(Math.hypot(attacker.x - defender.x, attacker.y - defender.y) - 2.4) < 0.01,
			"charge contact overlapped the player centres");
		const pushed = at(plan.contactAt + 0.3);
		const displaced = player(pushed, plan.defenderId);
		const stopped = player(pushed, plan.attackerId);
		assert((displaced.x - defender.x) * plan.direction.x + (displaced.y - defender.y) * plan.direction.y > 2.5,
			"defender only twitched instead of receiving the attacker's impulse");
		assert((stopped.x - attacker.x) * plan.direction.x + (stopped.y - attacker.y) * plan.direction.y < 0,
			"attacker continued running through the defender");
		assert(!pushed.ball.dribble && pushed.clock === scene.clockTo && contact.clock === scene.clockTo,
			"charge response continued live dribbling or consumed game time after the whistle");
		const later = player(at(plan.contactAt + 0.52), plan.defenderId);
		assert(Math.abs(later.angle) < 0.001, "defender never regained balance");
		assert(JSON.stringify(data) === original && replay.scenes.length === data.actions.length,
			"charge invented a source event or modified the feed");
		const sample = JSON.stringify(at(plan.contactAt + 0.1));
		at(0);
		assert(JSON.stringify(at(plan.contactAt + 0.1)) === sample, "charge changed after reverse seeking");
	}
	const data = scenario();
	data.actions.at(-1).descriptor = "";
	assert(!compileReplay(data).scenes.at(-1).chargePlan, "ordinary offensive foul invented a charge");
});

Deno.test("offensive rebound pressure explains the kick-out before the rebounder leaves the paint", () => {
	for (const mirrored of [false, true]) {
		const data = scenario(mirrored);
		const original = JSON.stringify(data);
		const replay = compileReplay(data);
		const [shot, rebound, next] = [7, 8, 10].map((number) =>
			replay.scenes.find((scene) => scene.action.actionNumber === number));
		const plan = next.reboundKickOut;
		assert(plan?.from === 1628389 && plan.to === 203507, "lost the plausible Adebayo-to-Giannis outlet");
		assert(plan.protector === 1631117 && plan.helper === 1630559, "missing basket protection and perimeter help");
		assert(shot.pressureRun.startAt >= shot.eventAt, "defender anticipated the exact rebound point");
		const run = shot.pressureRun;
		assert(Math.hypot(run.x - run.from.x, run.y - run.from.y) * 1.5 / run.duration <= 8.001,
			"rebound contest exceeded the defensive travel limit");
		const caught = getReplayFrame(replay, rebound.start + rebound.catchAt + 0.02);
		const origin = caught.players.find((player) => player.id === plan.from);
		const protector = caught.players.find((player) => player.id === plan.protector);
		assert(Math.hypot(protector.x - origin.x, protector.y - origin.y) <= 4.5,
			"rebounder received uncontested possession without basket pressure");
		for (const frame of next.frames.filter((frame) => frame.time <= plan.catchAt)) {
			const player = frame.players.find((player) => player.id === plan.from);
			assert(Math.hypot(player.x - origin.x, player.y - origin.y) < 0.001,
				"rebounder abandoned the rim before passing");
			if (frame.time < plan.releaseAt - 0.011) {
				assert(frame.ball.owner === plan.from && !frame.ball.dribble, "rebounder failed to secure and hold the ball");
			}
		}
		assert(next.laneExits.find((move) => move.id === plan.from).startAt >= plan.catchAt,
			"paint exit started before the outlet was caught");
		for (let time = 0; time < next.eventAt; time += 0.02) {
			const frame = getReplayFrame(replay, next.start + time);
			const player = frame.players.find((player) => player.id === plan.from);
			assert(!isInOffensiveLane(player, mirrored ? 1 : -1) || next.clockFrom - frame.clock <= 3,
				"post pressure prolonged the rebounder's paint stay beyond three game seconds");
		}
		const received = getReplayFrame(replay, next.start + plan.catchAt);
		assert(received.ball.owner === plan.to, "outlet never reached the receiver");
		assert(JSON.stringify(data) === original, "choreography changed recorded data");
		const copy = compileReplay(data);
		assert(JSON.stringify(copy) === JSON.stringify(replay), "second-chance plan was not deterministic");
		const time = next.start + plan.releaseAt + 0.1;
		const before = JSON.stringify(getReplayFrame(replay, time));
		getReplayFrame(replay, replay.duration);
		assert(JSON.stringify(getReplayFrame(replay, time)) === before, "reverse seeking changed the outlet");
	}
});

Deno.test("a blocked rebound directly under the hoop keeps basket pressure finite", () => {
	const data = scenario();
	const shot = data.actions.find((action) => action.actionNumber === 7);
	Object.assign(shot, { actionType: "2pt", x: 8.25 / 0.94, y: 42, blockPersonId: 1631117 });
	const replay = compileReplay(data);
	assert(replay.scenes.flatMap((scene) => scene.frames).every((frame) =>
		frame.players.every((player) => Number.isFinite(player.x) && Number.isFinite(player.y))),
		"basket-centred rebound produced invalid pressure positions");
});

Deno.test("a long shooter approach does not delay the rebounder's shorter paint exit", () => {
	const data = scenario();
	Object.assign(data.actions.at(-1), { actionType: "2pt", subType: "Layup", descriptor: "",
		isFieldGoal: 1, x: 5.86, y: 47.39, side: "left", shotResult: "Made", personId: 1630558, assistPersonId: 203507,
		clock: "PT11M27S" });
	const replay = compileReplay(data);
	const scene = replay.scenes.at(-1);
	for (let time = 0; time < scene.approachAt; time += 0.02) {
		const frame = getReplayFrame(replay, scene.start + time);
		const player = frame.players.find((player) => player.id === 1628389);
		assert(!isInOffensiveLane(player, -1) || scene.clockFrom - frame.clock <= 3,
			"rebounder waited inside while a teammate completed a longer route");
	}
	const exit = scene.laneExits.find((move) => move.id === 1628389);
	assert(exit.holdUntil > exit.startAt + exit.duration, "scenario lost the longer concurrent approach");
	for (const time of [exit.startAt + exit.duration + 0.001, exit.holdUntil - 0.001]) {
		const player = getReplayFrame(replay, scene.start + time).players.find((player) => player.id === exit.id);
		assert(Math.hypot(player.x - exit.x, player.y - exit.y) < 0.001,
			"completed exit jumped back into an unfinished shared route");
	}
});

Deno.test("direct finishes, short clocks, dead balls and interruptions do not force rebound kick-outs", () => {
	for (const variant of ["putback", "same-player", "short", "deadball", "timeout", "team"]) {
		const data = scenario();
		const rebound = data.actions.find((action) => action.actionNumber === 8);
		const next = data.actions.at(-1);
		if (variant === "putback" || variant === "same-player") {
			Object.assign(next, { actionType: "2pt", subType: "Layup", descriptor: variant === "putback" ? "putback" : "",
				personId: rebound.personId, isFieldGoal: 1, x: 8, y: 50, side: "left", shotResult: "Made" });
		} else if (variant === "short") {
			next.clock = "PT11M39S";
		} else if (variant === "deadball") {
			rebound.qualifiers = ["deadball"];
		} else if (variant === "team") {
			delete rebound.personId;
		} else {
			data.actions.push({ ...rebound, actionNumber: 9, orderNumber: rebound.orderNumber + 1,
				actionType: "timeout", subType: "full", personId: undefined });
		}
		const replay = compileReplay(data);
		assert(!replay.scenes.some((scene) => scene.reboundKickOut), `${variant} forced an unnecessary kick-out`);
		assert(replay.scenes.flatMap((scene) => scene.frames).every((frame) =>
			frame.players.every((player) => Number.isFinite(player.x) && Number.isFinite(player.y))),
			`${variant} produced invalid movement`);
	}
});

