import { compileReplay, getReplayFrame } from "../js/replay-engine.js";

export function checkReplay(data) {
	const id = data.gameId;
	const errors = [];
	const profiles = new Map();
	let frames = 0;
	const check = (value, message) => {
		if (!value) {
			errors.push(message);
		}
	};
	const replay = compileReplay(data);
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
		check(Number.isFinite(frame.clock) && frame.clock >= 0 && frame.clock <= 720, `${id} clock at ${t}`);
		check(
			frame.players.every((p) => [p.x, p.y, p.angle, p.jump].every(Number.isFinite)),
			`${id} interpolation at ${t}`,
		);
	}
	check(represented.size === data.actions.length, `${id} all actions represented`);
	check(JSON.stringify(replay.finalScore) === JSON.stringify(data.teams.map((t) => t.score)), `${id} final score`);
	for (const [index, scene] of replay.scenes.entries()) {
		if (scene.reboundRotation) {
			const rotation = scene.reboundRotation;
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
		errors,
	};
}
