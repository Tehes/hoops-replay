import { compileReplay, getReplayFrame } from "./replay-engine.js";

export function checkReplay(data, replay = compileReplay(data)) {
	const id = data.gameId;
	const errors = [];
	const profiles = new Map();
	let frames = 0;
	const check = (value, message) => {
		if (!value) {
			errors.push(message);
		}
	};
	const formationCounts = {};
	let formationWidth = 0;
	let crowdedPairs = 0;
	for (const formation of replay.formations) {
		formationWidth += Math.max(...formation.slots.map((point) => point[1])) -
			Math.min(...formation.slots.map((point) => point[1]));
		formationCounts[formation.kind] = (formationCounts[formation.kind] || 0) + 1;
		check(
			formation.slots.length === 5 && new Set(formation.slots.map((slot) => slot.join(","))).size === 5 &&
				formation.slots.every(([x, y]) =>
					Number.isFinite(x) && Number.isFinite(y) && x > 47 && x < 94 && y > 0 && y < 50
				),
			`${id} distinct half-court formation slots ${formation.id}`,
		);
		if (formation.interiorSlot >= 0) {
			const [x, y] = formation.slots[formation.interiorSlot];
			check(Math.hypot(x - 88.75, y - 25) <= 12, `${id} retained inside option ${formation.id}`);
		}
		const evidence = data.actions.find((action) => action.actionNumber === formation.evidenceActionNumber);
		check(
			formation.evidenceActionNumber === null ||
				(evidence && evidence.teamId === formation.offense && evidence.period === formation.period &&
					["2pt", "3pt"].includes(evidence.actionType)),
			`${id} formation evidence ${formation.id}`,
		);
		for (let slot = 0; slot < formation.slots.length; slot++) {
			for (let other = slot + 1; other < formation.slots.length; other++) {
				if (
					Math.hypot(
						formation.slots[slot][0] - formation.slots[other][0],
						formation.slots[slot][1] - formation.slots[other][1],
					) < 9
				) {
					crowdedPairs++;
				}
				check(
					Math.hypot(
						formation.slots[slot][0] - formation.slots[other][0],
						formation.slots[slot][1] - formation.slots[other][1],
					) >= 4,
					`${id} readable player spacing ${formation.id}`,
				);
			}
		}
		const setup = replay.scenes.find((scene) => scene.formation?.id === formation.id);
		const attackers = setup.lineups[formation.offense];
		const defenders = setup.lineups[data.teams.find((team) => team.id !== formation.offense).id];
		check(
			Object.keys(formation.initialMatchups).length === 5 &&
				new Set(Object.values(formation.initialMatchups)).size === 5 &&
				defenders.every((defender) => attackers.includes(formation.initialMatchups[defender])),
			`${id} initial man-to-man assignments ${formation.id}`,
		);
		for (const contact of formation.contactMatchups) {
			check(
				formation.initialMatchups[contact.defender] === contact.attacker,
				`${id} contact priority over rebound placement ${contact.actionNumber}`,
			);
		}
		const preference = formation.reboundMatchup;
		if (preference && !preference.constrained) {
			const reserved = new Set(formation.contactMatchups.map((contact) => contact.attacker));
			const point = formation.slots[attackers.indexOf(preference.attacker)];
			check(
				!reserved.has(preference.attacker) && attackers.filter((attacker) => !reserved.has(attacker))
					.every((attacker) => {
						const other = formation.slots[attackers.indexOf(attacker)];
						return Math.hypot(point[0] - 88.75, point[1] - 25) <=
							Math.hypot(other[0] - 88.75, other[1] - 25) + 0.00001;
					}),
				`${id} rebounder assigned near rim in buildup ${formation.id}`,
			);
		}
		if (evidence) {
			check(
				formation.shooterId === evidence.personId && formation.assistId === (evidence.assistPersonId ?? null),
				`${id} recorded finish participants ${formation.id}`,
			);
		}
	}
	check(
		JSON.stringify(replay.formations) === JSON.stringify(compileReplay(data).formations),
		`${id} deterministic formation planning`,
	);
	check(formationWidth / replay.formations.length >= 25, `${id} uses court width across attacks`);
	check(crowdedPairs / replay.formations.length < 0.5, `${id} avoids recurring offensive clusters`);
	const teamFor = new Map(replay.players.map((p) => [p.id, p.teamId]));
	const represented = new Set();
	let shots = 0;
	for (const scene of replay.scenes) {
		const tag = `${id}:${scene.action.actionNumber}`;
		for (const a of [scene.action, ...scene.related]) represented.add(a.actionNumber);
		for (const frame of scene.frames) {
			frames++;
			check(
				frame.players.every((p) => [p.x, p.y, p.opacity, p.angle, p.jump].every(Number.isFinite)),
				`${tag} finite players`,
			);
			check([frame.ball.x, frame.ball.y, frame.ball.z].every(Number.isFinite), `${tag} finite ball`);
			check(frame.ball.z >= 0, `${tag} ball below floor`);
			check(
				!frame.ball.owner || frame.players.some((p) => p.id === frame.ball.owner && p.opacity > 0),
				`${tag} hidden owner`,
			);
		}
		for (const move of scene.spacingMoves || []) {
			check(
				![scene.action.personId, scene.action.assistPersonId].includes(move.id) &&
					!scene.shotStyle.tip && !scene.shotStyle.putback && scene.kind !== "heave",
				`${tag} spacing preserves recorded participants and direct finishes`,
			);
			const approach = scene.frames.filter((frame) =>
				frame.time >= scene.approachAt && frame.time <= scene.releaseAt
			);
			let distance = 0;
			for (let i = 1; i < approach.length; i++) {
				const previous = approach[i - 1].players.find((player) => player.id === move.id);
				const current = approach[i].players.find((player) => player.id === move.id);
				const step = Math.hypot(current.x - previous.x, current.y - previous.y);
				distance += step;
				check(step <= (approach[i].time - approach[i - 1].time) * 5 + 0.001, `${tag} bounded off-ball speed`);
			}
			check(distance <= 6.001, `${tag} small off-ball adjustment`);
		}
		const end = scene.frames.at(-1);
		for (const team of data.teams) {
			const visible = end.players.filter((p) => p.opacity === 1 && teamFor.get(p.id) === team.id);
			check(
				visible.length === 5 && visible.every((p) => scene.lineups[team.id].includes(p.id)),
				`${tag} active lineup`,
			);
		}
		check(
			end.score[0] === Number(scene.action.scoreAway) && end.score[1] === Number(scene.action.scoreHome),
			`${tag} score`,
		);
		const style = scene.shotStyle;
		if (!style) continue;
		shots++;
		const profile = style.family + ":" + Object.keys(style).filter((key) => style[key] === true).join(",");
		profiles.set(profile, (profiles.get(profile) || 0) + 1);
		const shooter = scene.action.personId;
		const release = scene.frames.find((f) => Math.abs(f.time - scene.releaseAt) < 0.00001);
		check(release && release.players.find((p) => p.id === shooter).jump > 0, `${tag} release jump`);
		const mark = replay.markers.find((m) =>
			m.time >= scene.start && m.time < scene.end && ["made", "miss"].includes(m.kind)
		);
		check(
			mark && Math.abs(mark.x - scene.shotPoint.x) < 0.00001 && Math.abs(mark.y - scene.shotPoint.y) < 0.00001,
			`${tag} shot marker`,
		);
		check(end.players.every((p) => p.jump === 0 && p.angle === 0), `${tag} landing`);
		if (style.alleyOop) {
			const flight = scene.frames.filter((f) =>
				f.time > scene.lobStart + 0.00001 && f.time <= scene.catchAt + 0.00001
			);
			check(flight.length >= 4 && flight.every((f) => !f.ball.owner && !f.ball.dribble), `${tag} airborne lob`);
			check(flight.at(-1).players.find((p) => p.id === shooter).jump > 1, `${tag} airborne catch`);
		}
		if (style.tip || style.putback) {
			const held = scene.frames.filter((f) => f.time > scene.approachAt + 0.00001 && f.ball.owner);
			check(
				held.length > 0 && held.every((f) => f.ball.owner === shooter && !f.ball.dribble),
				`${tag} direct rebound finish`,
			);
		}
		if (style.bank && !scene.action.blockPersonId) {
			check(Number.isFinite(scene.bankAt), `${tag} board contact`);
			const board = scene.frames.find((f) => Math.abs(f.time - scene.bankAt) < 0.00001);
			check(
				board && (Math.abs(board.ball.x - 4) < 0.00001 || Math.abs(board.ball.x - 90) < 0.00001),
				`${tag} board location`,
			);
		}
		if (style.fadeaway && !scene.action.blockPersonId) {
			const direction = scene.hoop.x > 47 ? 1 : -1;
			check(
				(end.players.find((p) => p.id === shooter).x - scene.shotPoint.x) * direction < -1,
				`${tag} fadeaway landing`,
			);
		}
	}
	for (let t = 0; t < replay.duration; t += 0.2) {
		const frame = getReplayFrame(replay, t);
		check(
			Number.isFinite(frame.clock) && frame.clock >= 0 && frame.clock <= (frame.period > 4 ? 300 : 720),
			`${id} clock at ${t}`,
		);
		check(
			frame.players.every((p) => [p.x, p.y, p.angle, p.jump].every(Number.isFinite)),
			`${id} interpolation at ${t}`,
		);
	}
	check(represented.size === data.actions.length, `${id} all actions represented`);
	check(JSON.stringify(replay.finalScore) === JSON.stringify(data.teams.map((t) => t.score)), `${id} final score`);
	let matchupPlanId = null;
	let expectedMatchups = null;
	for (const [index, scene] of replay.scenes.entries()) {
		if (expectedMatchups && scene.kind === "substitution") {
			for (const swap of scene.swaps) {
				if (expectedMatchups[swap.out] !== undefined) {
					expectedMatchups[swap.in] = expectedMatchups[swap.out];
					delete expectedMatchups[swap.out];
				}
				for (const defender of Object.keys(expectedMatchups)) {
					if (expectedMatchups[defender] === swap.out) {
						expectedMatchups[defender] = swap.in;
					}
				}
			}
		}
		if (scene.matchups) {
			const defenders = scene.lineups[data.teams.find((team) => team.id !== scene.attackTeam).id];
			check(
				Object.keys(scene.matchups).length === 5 && new Set(Object.values(scene.matchups)).size === 5 &&
					defenders.every((defender) => scene.lineups[scene.attackTeam].includes(scene.matchups[defender])),
				`${id} active matchups ${scene.action.actionNumber}`,
			);
			if (scene.matchupPlanId === matchupPlanId) {
				check(
					Object.keys(expectedMatchups).every((defender) =>
						scene.matchups[defender] === expectedMatchups[defender]
					),
					`${id} stable matchups within possession ${scene.action.actionNumber}`,
				);
			}
			matchupPlanId = scene.matchupPlanId;
			expectedMatchups = { ...scene.matchups };
		}

		if (scene.spacingSource === "current") {
			const home = data.teams.find((team) => team.home);
			const direction = (scene.attackTeam === home.id) === (scene.action.period <= 2) ? 1 : -1;
			for (const [slot, playerId] of scene.lineups[scene.attackTeam].entries()) {
				const previous = scene.frames[0].players.find((player) => player.id === playerId);
				const [x, y] = scene.spacingDestinations[slot];
				check(
					Math.hypot(previous.x - (direction === 1 ? x : 94 - x), previous.y - y) < 0.00001,
					`${id} retain current position on restart ${scene.action.actionNumber}:${playerId}`,
				);
			}
		}
		if (scene.formation) {
			check(scene.formation.offense === scene.attackTeam, `${id} formation offense ${scene.action.actionNumber}`);
		}
		if (scene.kind === "rebound" && scene.action.subType === "offensive") {
			const previous = replay.scenes.slice(0, index).findLast((item) => item.formation);
			const next = replay.scenes[index + 1];
			if (
				previous?.formation.offense === scene.action.teamId && next?.formation &&
				next.action.period === scene.action.period
			) {
				check(
					next.formation.id === previous.formation.id,
					`${id} formation retained after offensive rebound ${scene.action.actionNumber}`,
				);
			}
		}
		if (scene.reboundRotation) {
			const rotation = scene.reboundRotation;
			check(
				teamFor.get(rotation.rebounderId) === scene.attackTeam &&
					teamFor.get(rotation.partnerId) === scene.attackTeam,
				`${id} no defensive rebound swap ${scene.action.actionNumber}`,
			);
			const from = scene.frames.find((frame) => frame.time === rotation.start);
			const to = scene.frames.find((frame) => frame.time === rotation.end);
			const before = from.players.find((player) => player.id === rotation.rebounderId);
			const after = to.players.find((player) => player.id === rotation.rebounderId);
			check(
				Math.hypot(after.x - scene.hoop.x, after.y - scene.hoop.y) <
					Math.hypot(before.x - scene.hoop.x, before.y - scene.hoop.y),
				`${id} rebounder rotates toward paint ${scene.action.actionNumber}`,
			);
			check(
				rotation.end <= scene.releaseAt && from.ball.owner === to.ball.owner,
				`${id} off-ball rotation before shot ${scene.action.actionNumber}`,
			);
		}
		if (scene.reboundApproach) {
			const approach = scene.reboundApproach;
			const previous = replay.scenes[approach.sceneIndex];
			const arrived = previous.frames.at(-1).players.find((player) => player.id === approach.playerId);
			const first = scene.frames[0].players.find((player) => player.id === approach.playerId);
			check(
				Math.hypot(arrived.x - approach.target.x, arrived.y - approach.target.y) < 0.00001 &&
					Math.hypot(first.x - arrived.x, first.y - arrived.y) < 0.00001,
				`${id} rebound arrival ${scene.action.actionNumber}`,
			);
			const catchFrame = scene.frames.find((frame) => Math.abs(frame.time - scene.catchAt) < 0.00001);
			check(
				catchFrame && catchFrame.ball.owner === approach.playerId &&
					catchFrame.players.find((player) => player.id === approach.playerId).jump > 0,
				`${id} airborne rebound catch ${scene.action.actionNumber}`,
			);
			check(
				scene.frames.filter((frame) => frame.time < scene.catchAt).every((frame) => !frame.ball.owner) &&
					scene.frames.some((frame) => frame.ball.flight && !frame.ball.owner),
				`${id} free ball before rebound catch ${scene.action.actionNumber}`,
			);
			const origin = previous.frames.findLast((frame) => frame.time <= approach.start)
				.players.find((player) => player.id === approach.playerId);
			if (Math.hypot(origin.x - arrived.x, origin.y - arrived.y) > 0.1) {
				check(
					previous.frames.some((frame) => {
						const player = frame.players.find((item) => item.id === approach.playerId);
						return frame.time > approach.start && frame.time < approach.end &&
							Math.hypot(player.x - origin.x, player.y - origin.y) > 0.01;
					}),
					`${id} early rebound movement ${scene.action.actionNumber}`,
				);
			}
		}
		if (scene.technical) {
			check(
				scene.frames.at(-1).possession === replay.scenes[index - 1].frames.at(-1).possession,
				`${id} technical possession`,
			);
		}
	}
	return {
		id,
		actions: data.actions.length,
		scenes: replay.scenes.length,
		shots,
		duration: replay.duration,
		score: replay.finalScore,
		frames,
		profiles: [...profiles.keys()],
		formations: formationCounts,
		errors,
	};
}
