/* --------------------------------------------------------------------------------------------------
Imports
---------------------------------------------------------------------------------------------------*/

import { loadGameUniforms, loadRecentGameIds, loadReplayData } from "./replay-data.js";
import { checkReplay } from "./replay-validation.js";
import { attackDirection, compileReplay, getReplayFrame } from "./replay-engine.js";
import { getJerseyColors, getTeamColors, getTeamLogo, getTeamName } from "./replay-teams.js";
import { getLeague } from "./replay-leagues.js";
import {
	getBallGeometry,
	getPlayerGeometry,
	getPlayerHitDistance,
	getPlayerSize,
	getScoreMarkerGeometry,
	getShotMarkerGeometry,
	planBallOffsets,
	PLAYER_HALF_HEIGHT,
	RIM_Y,
	SHOT_MARKER_FLATTENING,
	WORLD,
} from "./replay-presentation.js";

/* --------------------------------------------------------------------------------------------------
Constants and state
---------------------------------------------------------------------------------------------------*/

const ACTION_DURATION = 5;
const NEUTRAL_COURT = { shirt: "#34434f", trim: "#9aabb8" };
let actionEvents = [];
let displayedAction = undefined;
let replay = null;
let game = null;
let currentTime = 0;
let playing = false;
let lastTimestamp = 0;
let animationId = 0;
let selectedPlayer = null;
let currentFrame = null;
let scale = 1;
let courtBackground = null;
let playerById = new Map();
let teamById = new Map();
let jerseyByTeamId = new Map();
const homeLogo = new Image();

/* --------------------------------------------------------------------------------------------------
DOM references
---------------------------------------------------------------------------------------------------*/

const canvas = document.querySelector("#court");
const ctx = canvas.getContext("2d");
const loadState = document.querySelector("#load-state");
const awayScore = document.querySelector("#away-score");
const homeScore = document.querySelector("#home-score");
const periodEl = document.querySelector("#period");
const clockEl = document.querySelector("#clock");
const bonusEl = document.querySelector("#bonus");
const awayBonus = document.querySelector("#away-bonus");
const homeBonus = document.querySelector("#home-bonus");
const timeline = document.querySelector("#timeline");
const playButton = document.querySelector("#play");
const playIcon = document.querySelector("#play-icon");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const speedSelect = document.querySelector("#speed");
const elapsed = document.querySelector("#elapsed");
const quarters = document.querySelector("#quarters");
const quarterTemplate = document.querySelector("#quarter-template");
const awayTeamEl = document.querySelector(".team.away");
const homeTeamEl = document.querySelector(".team.home");
const actionDisplay = document.querySelector(".action-display");
const shotClockDisplay = document.querySelector(".shot-clock");
const shotClockValue = document.querySelector("#shot-clock");
const actionPhoto = document.querySelector("#action-photo");
const actionCopy = document.querySelector(".action-display > .action-copy");
const actionPlayer = document.querySelector("#action-player");
const actionDescription = document.querySelector("#action-description");
const idleDisplay = document.querySelector(".idle-display");
const idleDescription = document.querySelector("#idle-description");
const jerseyKey = document.querySelector(".jersey-key");

/* --------------------------------------------------------------------------------------------------
Court and player drawing
---------------------------------------------------------------------------------------------------*/

function roundedRect(context, x, y, width, height, radius) {
	const r = Math.min(radius, width / 2, height / 2);
	context.beginPath();
	context.moveTo(x + r, y);
	context.arcTo(x + width, y, x + width, y + height, r);
	context.arcTo(x + width, y + height, x, y + height, r);
	context.arcTo(x, y + height, x, y, r);
	context.arcTo(x, y, x + width, y, r);
	context.closePath();
}

function drawCourt() {
	const home = game?.teams.find((team) => team.home);
	const colors = home ? getTeamColors(home) : NEUTRAL_COURT;
	courtBackground = document.createElement("canvas");
	courtBackground.width = canvas.width;
	courtBackground.height = canvas.height;
	const c = courtBackground.getContext("2d");
	c.scale(scale, scale);
	c.translate(WORLD.left, WORLD.top);
	c.fillStyle = "#0c131b";
	roundedRect(c, -6.8, -3.4, 107.6, 56.8, 0.6);
	c.fill();
	c.fillStyle = "#dcb784";
	c.fillRect(0, 0, 94, 50);
	const boardColors = ["#d6b07e", "#dcb785", "#e2bf8d", "#dab482", "#dfbc8a"];
	for (let row = 0; row < 60; row++) {
		const rowHeight = Math.min(0.83, 50 - row * 0.84);
		c.strokeStyle = "#9e74433b";
		c.lineWidth = 0.035;
		let x = -((row * 13) % 19);
		let board = 0;
		while (x < 94) {
			const boardWidth = 12 + (row * 11 + board * 7) % 9;
			const start = Math.max(0, x);
			const end = Math.min(94, x + boardWidth);
			c.fillStyle = boardColors[(row * 17 + board * 7 + row * board * 3) % boardColors.length];
			c.fillRect(start, row * 0.84, Math.max(0, end - start), rowHeight);
			if (x > 0) {
				c.beginPath();
				c.moveTo(x, row * 0.84);
				c.lineTo(x, row * 0.84 + rowHeight);
				c.stroke();
			}
			x += boardWidth;
			board++;
		}
	}
	c.fillStyle = colors.shirt;
	c.fillRect(0, 17, 19, 16);
	c.fillRect(75, 17, 19, 16);
	c.strokeStyle = "#28303c";
	c.lineWidth = 0.14;
	c.strokeRect(0, 0, 94, 50);
	c.beginPath();
	c.moveTo(47, 0);
	c.lineTo(47, 50);
	c.stroke();
	c.beginPath();
	c.arc(47, 25, 6, 0, Math.PI * 2);
	c.stroke();
	if (homeLogo.complete && homeLogo.naturalWidth) {
		c.drawImage(homeLogo, 40, 18, 14, 14);
	}
	for (const mirror of [false, true]) {
		c.save();
		if (mirror) {
			c.translate(94, 0);
			c.scale(-1, 1);
		}
		c.strokeStyle = "#ffffffc7";
		c.lineWidth = 0.14;
		c.strokeRect(c.lineWidth / 2, 17, 19 - c.lineWidth / 2, 16);
		c.beginPath();
		c.arc(19, 25, 6, -Math.PI / 2, Math.PI / 2);
		c.stroke();
		c.setLineDash([0.65, 0.65]);
		c.beginPath();
		c.arc(19, 25, 6, Math.PI / 2, Math.PI * 1.5);
		c.stroke();
		c.setLineDash([]);
		c.beginPath();
		c.arc(5.25, 25, 4, -Math.PI / 2, Math.PI / 2);
		c.stroke();
		c.strokeStyle = "#28303c";
		const radius = game ? getLeague(game.gameId).threePointRadius : 23.75;
		const angle = Math.asin(22 / radius);
		const cornerX = 5.25 + Math.sqrt(radius ** 2 - 22 ** 2);
		c.beginPath();
		c.moveTo(0, 3);
		c.lineTo(cornerX, 3);
		c.arc(5.25, 25, radius, -angle, angle);
		c.lineTo(0, 47);
		c.stroke();
		c.restore();
	}
	for (
		const label of [
			{ x: -1.25, y: 40, angle: -Math.PI / 2, text: home ? getTeamName(home) : "" },
			{ x: 95.25, y: 10, angle: Math.PI / 2, text: game?.arena || "" },
		]
	) {
		c.save();
		c.fillStyle = "#f5f6f7";
		c.font = "700 1.4px system-ui";
		c.textAlign = "center";
		c.translate(label.x, label.y);
		c.rotate(label.angle);
		c.fillText(label.text.toUpperCase(), 0, 0);
		c.restore();
	}
}

function drawBaskets() {
	const home = game?.teams.find((team) => team.home);
	const colors = home ? getTeamColors(home) : NEUTRAL_COURT;
	const rimY = RIM_Y;
	for (const mirror of [false, true]) {
		ctx.save();
		if (mirror) {
			ctx.translate(94, 0);
			ctx.scale(-1, 1);
		}
		ctx.strokeStyle = "#80909d";
		ctx.lineWidth = 0.35;
		ctx.beginPath();
		ctx.moveTo(-2.4, 25);
		ctx.lineTo(4, rimY - 1.3);
		ctx.moveTo(-2.4, 25);
		ctx.lineTo(4, rimY + 1.3);
		ctx.stroke();
		ctx.strokeStyle = "#b8c4ce";
		ctx.lineWidth = 0.65;
		ctx.beginPath();
		ctx.moveTo(-2.4, 25);
		ctx.lineTo(4, rimY);
		ctx.stroke();
		ctx.fillStyle = colors.shirt;
		roundedRect(ctx, -4.6, 22.9, 2.2, 4.2, 0.35);
		ctx.fill();
		ctx.strokeStyle = "#9aabb8";
		ctx.lineWidth = 0.16;
		ctx.stroke();
		ctx.lineWidth = 0.3;
		ctx.strokeStyle = "#f6f7f8";
		ctx.beginPath();
		ctx.moveTo(4, rimY - 3);
		ctx.lineTo(4, rimY + 3);
		ctx.stroke();
		ctx.strokeStyle = "#18212b";
		ctx.lineWidth = 0.42;
		ctx.beginPath();
		ctx.arc(5.25, rimY, 0.75, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = "#ff982e";
		ctx.lineWidth = 0.22;
		ctx.stroke();
		ctx.restore();
	}
}

function resizeCourt() {
	const width = canvas.getBoundingClientRect().width;
	const pixelRatio = globalThis.devicePixelRatio || 1;
	canvas.width = Math.round(width * pixelRatio);
	canvas.height = Math.round(width * WORLD.height / WORLD.width * pixelRatio);
	scale = canvas.width / WORLD.width;
	drawCourt();
	render();
}

function drawJersey(context, colors) {
	context.beginPath();
	context.moveTo(-0.6, -PLAYER_HALF_HEIGHT);
	context.lineTo(-1.25, -2.05);
	context.quadraticCurveTo(-0.95, -0.8, -1.45, -0.3);
	context.lineTo(-1.4, PLAYER_HALF_HEIGHT);
	context.lineTo(1.4, PLAYER_HALF_HEIGHT);
	context.lineTo(1.45, -0.3);
	context.quadraticCurveTo(0.95, -0.8, 1.25, -2.05);
	context.lineTo(0.6, -PLAYER_HALF_HEIGHT);
	context.bezierCurveTo(0.6, -1.25, -0.6, -1.25, -0.6, -PLAYER_HALF_HEIGHT);
	context.closePath();
	context.fillStyle = colors.shirt;
	context.fill();
	context.lineWidth = 0.16;
	context.strokeStyle = colors.trim;
	context.stroke();
}

function drawPlayerShadow(position) {
	const size = getPlayerSize(scale / (globalThis.devicePixelRatio || 1));
	ctx.save();
	ctx.globalAlpha = position.opacity;
	ctx.translate(position.x, position.y + position.bench * PLAYER_HALF_HEIGHT * size);
	ctx.scale(size, size);
	ctx.fillStyle = "#19212c30";
	ctx.beginPath();
	ctx.ellipse(0, 0, 2 / (1 + position.jump * 0.08), 0.7, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function drawPlayer(position) {
	const player = playerById.get(position.id);
	const colors = jerseyByTeamId.get(player.teamId);
	const body = getPlayerGeometry(position, scale / (globalThis.devicePixelRatio || 1));
	ctx.save();
	ctx.globalAlpha = position.opacity;
	ctx.translate(body.x, body.y);
	ctx.scale(body.size, body.size);
	ctx.rotate(position.angle);
	drawJersey(ctx, colors);
	ctx.fillStyle = colors.ink;
	ctx.font = "800 1.65px system-ui";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.rotate(-position.angle);
	ctx.fillText(player.number, 0, 0.3);
	ctx.restore();
}

function drawNames(frame) {
	const small = canvas.getBoundingClientRect().width < 600;
	const ids = small ? frame.participants.slice(0, 2) : frame.participants;
	const visible = new Set([...ids, selectedPlayer].filter(Boolean));
	const pixelScale = scale / (globalThis.devicePixelRatio || 1);
	const occupied = frame.players.filter((player) => player.opacity > 0.5)
		.map((player) => getPlayerGeometry(player, pixelScale).bounds);
	const ball = getBallGeometry(frame, pixelScale);
	occupied.push({ x: ball.x - ball.radius, y: ball.y - ball.radius, width: ball.radius * 2, height: ball.radius * 2 });
	for (const marker of frame.markers) {
		if (marker.kind !== "made" && marker.kind !== "miss") {
			continue;
		}
		const ground = getShotMarkerGeometry(marker, pixelScale);
		occupied.push({ x: ground.x - ground.radius, y: ground.y - ground.height,
			width: ground.radius * 2, height: ground.height * 2 });
		if (marker.kind === "made" && marker.value) {
			const score = getScoreMarkerGeometry(marker, frame.time, pixelScale);
			ctx.font = `850 ${score.fontSize}px system-ui`;
			const width = ctx.measureText(marker.value).width + score.lineWidth * 2;
			occupied.push({ x: score.x - width / 2, y: score.y - score.fontSize / 2 - score.lineWidth,
				width, height: score.fontSize + score.lineWidth * 2 });
		}
	}
	const fontSize = Math.max(1.05, 9 / pixelScale);
	ctx.font = `650 ${fontSize}px system-ui`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	for (const position of frame.players) {
		if (!visible.has(position.id) || position.opacity < 0.8) {
			continue;
		}
		const player = playerById.get(position.id);
		const name = player.name.replace(/^\S+ /, "");
		const width = ctx.measureText(name).width + 1.6;
		const height = fontSize + 1.1;
		const body = getPlayerGeometry(position, pixelScale);
		const above = body.bounds.y - height - 0.7;
		const below = body.bounds.y + body.bounds.height + 0.7;
		let box;
		for (const y of [above, below, above - height - 1, below + height + 1, above - (height + 1) * 2]) {
			box = {
				x: Math.max(-5, Math.min(99 - width, body.x - width / 2)),
				y: Math.max(-WORLD.top + 0.5, Math.min(WORLD.height - WORLD.top - height - 0.5, y)),
				width,
				height,
			};
			if (
				!occupied.some((b) =>
					box.x < b.x + b.width && box.x + width > b.x && box.y < b.y + b.height && box.y + height > b.y
				)
			) {
				break;
			}
		}
		occupied.push(box);
		ctx.fillStyle = "#101820eb";
		roundedRect(ctx, box.x, box.y, width, height, 0.5);
		ctx.fill();
		ctx.fillStyle = "#f1f4f6";
		ctx.fillText(name, box.x + width / 2, box.y + height / 2);
	}
}

function drawShotMarkers(frame) {
	const pixelScale = scale / (globalThis.devicePixelRatio || 1);
	for (const marker of frame.markers) {
		if (marker.kind !== "made" && marker.kind !== "miss") {
			continue;
		}
		const age = frame.time - marker.time;
		const remaining = marker.end - frame.time;
		const markerSize = getShotMarkerGeometry(marker, pixelScale).radius;
		ctx.save();
		ctx.translate(marker.x, marker.y);
		ctx.scale(1, SHOT_MARKER_FLATTENING);
		ctx.globalAlpha = Math.min(1, remaining, age / 0.12 + 0.2);
		ctx.beginPath();
		if (marker.kind === "made") {
			ctx.fillStyle = "#228b50";
			ctx.arc(0, 0, markerSize, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.strokeStyle = "#d03b45";
			ctx.lineWidth = 0.4 * markerSize;
			ctx.lineCap = "round";
			ctx.moveTo(-0.8 * markerSize, -0.8 * markerSize);
			ctx.lineTo(0.8 * markerSize, 0.8 * markerSize);
			ctx.moveTo(0.8 * markerSize, -0.8 * markerSize);
			ctx.lineTo(-0.8 * markerSize, 0.8 * markerSize);
			ctx.stroke();
		}
		ctx.restore();
	}
}

function drawScoreMarkers(frame) {
	const pixelScale = scale / (globalThis.devicePixelRatio || 1);
	for (const marker of frame.markers) {
		if (marker.kind !== "made" || !marker.value) {
			continue;
		}
		const age = frame.time - marker.time;
		const remaining = marker.end - frame.time;
		const score = getScoreMarkerGeometry(marker, frame.time, pixelScale);
		ctx.save();
		ctx.globalAlpha = Math.min(1, remaining, age / 0.08 + 0.2);
		ctx.font = `850 ${score.fontSize}px system-ui`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.lineWidth = score.lineWidth;
		ctx.strokeStyle = "#f2dbb4";
		ctx.strokeText(marker.value, score.x, score.y);
		ctx.fillStyle = "#13694e";
		ctx.fillText(marker.value, score.x, score.y);
		ctx.restore();
	}
}

function drawShotEffects(frame) {
	const scene = frame.scene;
	if (!scene.shotStyle) {
		return;
	}
	const local = frame.time - scene.start;
	const points = scene.frames.filter((key) =>
		key.time <= local && key.time > local - 0.4 && key.ball.flight && !key.ball.owner
	);
	if (points.length > 1) {
		ctx.save();
		ctx.strokeStyle = "#75411970";
		ctx.lineWidth = 0.16;
		if (scene.shotStyle.alleyOop && local < scene.releaseAt) {
			ctx.setLineDash([0.4, 0.4]);
		}
		ctx.beginPath();
		points.forEach((point, index) => {
			const { x, y } = getBallGeometry(
				{ ...point, scene, time: scene.start + point.time },
				scale / (globalThis.devicePixelRatio || 1),
			);
			if (index === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.stroke();
		ctx.restore();
	}
	if (scene.shotStyle.family === "dunk" && !scene.action.blockPersonId) {
		const age = local - scene.eventAt;
		if (age >= 0 && age < 0.55) {
			ctx.strokeStyle = `rgba(255, 247, 221, ${1 - age / 0.55})`;
			ctx.lineWidth = 0.35;
			ctx.beginPath();
			ctx.arc(scene.hoop.x, RIM_Y, 1 + age * 4, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	if (scene.bankAt && local >= scene.bankAt && local < scene.bankAt + 0.25) {
		ctx.strokeStyle = "#fff9e3";
		ctx.lineWidth = 0.45;
		const boardX = scene.hoop.x < 47 ? 4 : 90;
		ctx.beginPath();
		ctx.moveTo(boardX, RIM_Y - 3);
		ctx.lineTo(boardX, RIM_Y + 3);
		ctx.stroke();
	}
}

function planBallPresentation() {
	let angle = -Math.PI / 6;
	for (const scene of replay.scenes) {
		const spinningShot = (scene.shotStyle && scene.shotStyle.family !== "dunk") || scene.kind === "freethrow";
		const direction = attackDirection(game, scene.action.teamId, scene.action.period);
		scene.ballRotations = [{ time: scene.frames[0].time, angle }];
		let passer = null;
		for (let index = 0; index < scene.frames.length - 1; index++) {
			const from = scene.frames[index];
			const to = scene.frames[index + 1];
			if (from.ball.owner) {
				passer = from;
			}
			const flight = to.ball.flight && !to.ball.owner;
			let speed = 0;
			if (flight && spinningShot && from.time >= scene.releaseAt && from.time < scene.eventAt) {
				speed = -direction * 7;
			} else if (flight && passer && scene.kind !== "jumpball" && from.time < (scene.releaseAt ?? Infinity)) {
				const receiver = scene.frames.slice(index + 1).find((key) => key.ball.owner);
				if (receiver) {
					speed = (Math.sign(receiver.ball.x - passer.ball.x) || 1) * 2;
				}
			}
			const wobble = !flight && from.ball.owner && from.ball.dribble;
			scene.ballRotations.at(-1).wobble = Boolean(wobble);
			angle += wobble
				? (Math.sin((scene.start + to.time) * 6) - Math.sin((scene.start + from.time) * 6)) * 0.05
				: speed * (to.time - from.time);
			scene.ballRotations.push({ time: to.time, angle });
		}
	}
	planBallOffsets(replay);
}

function drawBallShadow(ball) {
	ctx.fillStyle = `rgba(16, 24, 32, ${0.27 - ball.shadowHeight * 0.12})`;
	ctx.beginPath();
	const spread = 1 + ball.shadowHeight * 0.35;
	ctx.ellipse(ball.groundX, ball.groundY, ball.radius * 1.1 * spread, ball.radius * 0.45 * spread, 0, 0, Math.PI * 2);
	ctx.fill();
}

function drawBall(frame, ball) {
	const scene = frame.scene;
	const { index, fraction, radius } = ball;
	const from = scene.ballRotations[index];
	const to = scene.ballRotations[index + 1] || from;
	const angle = from.angle + (from.wobble
		? (Math.sin(frame.time * 6) - Math.sin((scene.start + from.time) * 6)) * 0.05
		: (to.angle - from.angle) * fraction);
	ctx.save();
	ctx.translate(ball.x, ball.y);
	ctx.rotate(angle);
	ctx.fillStyle = "#ff9b30";
	ctx.strokeStyle = "#572f14";
	ctx.lineWidth = 0.12;
	ctx.beginPath();
	ctx.arc(0, 0, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.lineWidth = 0.09;
	ctx.beginPath();
	ctx.moveTo(-radius, 0);
	ctx.lineTo(radius, 0);
	ctx.moveTo(0, -radius);
	ctx.lineTo(0, radius);
	const seamEdge = radius * Math.SQRT1_2;
	ctx.moveTo(-seamEdge, -seamEdge);
	ctx.bezierCurveTo(-radius * 0.1, -radius * 0.4, -radius * 0.1, radius * 0.4, -seamEdge, seamEdge);
	ctx.moveTo(seamEdge, -seamEdge);
	ctx.bezierCurveTo(radius * 0.1, -radius * 0.4, radius * 0.1, radius * 0.4, seamEdge, seamEdge);
	ctx.stroke();
	ctx.restore();
}

/* --------------------------------------------------------------------------------------------------
Scoreboard and frame rendering
---------------------------------------------------------------------------------------------------*/

function formatTime(seconds) {
	const rounded = Math.max(0, Math.ceil(seconds));
	return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function renderAction(frame) {
	let active = null;
	for (let index = actionEvents.length - 1; index >= 0; index--) {
		const event = actionEvents[index];
		if (event.time <= frame.time) {
			if (frame.time - event.time < ACTION_DURATION) {
				active = event;
			}
			break;
		}
	}
	const counting = frame.shotClock !== null;
	const wasCounting = !shotClockDisplay.hidden;
	shotClockDisplay.hidden = !counting;
	shotClockValue.textContent = counting ? frame.shotClock : "";
	if (counting) {
		idleDisplay.hidden = true;
		actionCopy.hidden = true;
		actionPhoto.hidden = true;
		actionDisplay.style.setProperty("--event-color", "var(--shot-clock-color)");
		return;
	}
	if (displayedAction === active && !wasCounting) {
		return;
	}
	displayedAction = active;
	idleDisplay.hidden = active !== null;
	actionCopy.hidden = active === null;
	const action = active?.action;
	const player = action && playerById.get(action.personId);
	const team = action && teamById.get(player?.teamId || action.teamId);
	actionDisplay.style.setProperty("--event-color", team ? getTeamColors(team).trim : "var(--accent-color)");
	actionPlayer.textContent = active?.label || player?.name || (team ? getTeamName(team) : "");
	actionDescription.textContent = action?.description || "";
	actionPhoto.hidden = !team;
	actionPhoto.alt = player?.name || team?.name || "";
	if (team) {
		actionPhoto.src = player
			? `https://cdn.${team.league === "wnba" ? "wnba" : "nba"}.com/headshots/${
				team.league || "nba"
			}/latest/260x190/${player.id}.png`
			: getTeamLogo(team);
	} else {
		actionPhoto.removeAttribute("src");
	}
}

function render() {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (courtBackground) {
		ctx.drawImage(courtBackground, 0, 0);
	}
	ctx.save();
	ctx.scale(scale, scale);
	ctx.translate(WORLD.left, WORLD.top);
	if (!replay) {
		drawBaskets();
		ctx.restore();
		return;
	}
	const frame = getReplayFrame(replay, currentTime);
	currentFrame = frame;
	const players = frame.players.filter((player) => player.opacity > 0.01).sort((a, b) => a.y - b.y);
	const ball = getBallGeometry(frame, scale / (globalThis.devicePixelRatio || 1));
	drawShotMarkers(frame);
	for (const position of players) {
		drawPlayerShadow(position);
	}
	drawBallShadow(ball);
	for (const position of players) {
		drawPlayer(position);
	}
	drawBaskets();
	drawShotEffects(frame);
	drawScoreMarkers(frame);
	drawBall(frame, ball);
	drawNames(frame);

	ctx.restore();
	renderAction(frame);
	awayScore.textContent = frame.score[0];
	homeScore.textContent = frame.score[1];
	periodEl.textContent = currentTime === replay.duration
		? "FINAL"
		: frame.period > 4
		? `OT${frame.period - 4}`
		: `Q${frame.period}`;
	clockEl.textContent = formatTime(frame.clock);
	bonusEl.hidden = currentTime === replay.duration || !frame.bonus.some(Boolean);
	awayBonus.hidden = !frame.bonus[0];
	homeBonus.hidden = !frame.bonus[1];
	timeline.value = currentTime;
	elapsed.value = `${formatTime(currentTime)} / ${formatTime(replay.duration)}`;
	previousButton.disabled = currentTime === 0;
	nextButton.disabled = currentTime >= replay.scenes.at(-1).start;
}

/* --------------------------------------------------------------------------------------------------
Playback controls
---------------------------------------------------------------------------------------------------*/

function tick(timestamp) {
	if (!playing) {
		return;
	}
	if (lastTimestamp) {
		currentTime = Math.min(
			replay.duration,
			currentTime + Math.min((timestamp - lastTimestamp) / 1000, 0.1) * Number(speedSelect.value),
		);
	}
	lastTimestamp = timestamp;
	if (currentTime >= replay.duration) {
		setPlaying(false);
	}
	render();
	if (playing) {
		animationId = requestAnimationFrame(tick);
	}
}

function setPlaying(value) {
	playing = value;
	lastTimestamp = 0;
	cancelAnimationFrame(animationId);
	playIcon.setAttribute("d", playing ? "M7 5h3v14H7ZM14 5h3v14h-3Z" : "m8 5 11 7-11 7Z");
	playButton.title = playing ? "Pause (Leertaste)" : "Abspielen (Leertaste)";
	if (playing) {
		animationId = requestAnimationFrame(tick);
	}
}

function seek(time) {
	currentTime = Math.max(0, Math.min(replay.duration, time));
	lastTimestamp = 0;
	if (currentTime === replay.duration) {
		setPlaying(false);
	}
	render();
}

function stepAction(direction) {
	setPlaying(false);
	const target = direction === 1
		? replay.scenes.find((scene) => scene.start > currentTime)
		: replay.scenes.findLast((scene) => scene.start < currentTime);
	seek(target?.start ?? (direction === 1 ? replay.duration : 0));
}

/* --------------------------------------------------------------------------------------------------
Player selection
---------------------------------------------------------------------------------------------------*/

function selectPlayer(event) {
	if (!currentFrame) {
		return;
	}
	const bounds = canvas.getBoundingClientRect();
	const x = (event.clientX - bounds.left) / bounds.width * WORLD.width - WORLD.left;
	const y = (event.clientY - bounds.top) / bounds.height * WORLD.height - WORLD.top;
	const player = currentFrame.players.filter((p) => p.opacity > 0.5)
		.sort((a, b) => b.y - a.y)
		.map((p) => ({ id: p.id,
			distance: getPlayerHitDistance(p, x, y, scale / (globalThis.devicePixelRatio || 1)) }))
		.sort((a, b) => a.distance - b.distance)[0];
	if (player && player.distance < 1) {
		selectedPlayer = selectedPlayer === player.id ? null : player.id;
	} else {
		selectedPlayer = null;
	}

	render();
}

/* --------------------------------------------------------------------------------------------------
Initialization
---------------------------------------------------------------------------------------------------*/

async function init() {
	resizeCourt();
	new ResizeObserver(resizeCourt).observe(canvas);
	try {
		const params = new URLSearchParams(globalThis.location.search);
		const requestedGame = params.get("game");
		if (requestedGame !== null && !/^\d{10}$/.test(requestedGame)) {
			throw new Error("Game ID must contain ten digits.");
		}
		const candidates = requestedGame === null ? await loadRecentGameIds() : [requestedGame];
		let uniforms = null;
		for (const [index, gameId] of candidates.entries()) {
			try {
				const loadedGame = await loadReplayData(gameId);
				const compiledReplay = compileReplay(loadedGame);
				const report = checkReplay(loadedGame, compiledReplay);
				if (report.errors.length) {
					console.error("Replay validation failed:", report.errors);
					throw new Error(`Replay data is inconsistent (${report.errors.length} validation errors).`);
				}
				uniforms = await loadGameUniforms(loadedGame);
				game = loadedGame;
				replay = compiledReplay;
				break;
			} catch (error) {
				if (index === candidates.length - 1) {
					throw error;
				}
				console.warn(`Replay ${gameId} unavailable; trying the next completed game.`, error);
			}
		}
		if (requestedGame === null) {
			const url = new URL(globalThis.location.href);
			url.searchParams.set("game", game.gameId);
			globalThis.history.replaceState(null, "", url);
		}
		planBallPresentation();
		actionEvents = replay.scenes.filter((scene) => scene.action.description).map((scene) => ({
			time: scene.start + scene.eventAt,
			label: scene.banner || "",
			action: scene.action,
		})).sort((a, b) => a.time - b.time);
		const requestedAction = params.get("action");
		if (requestedAction !== null) {
			const actionNumber = /^\d+$/.test(requestedAction) ? Number(requestedAction) : NaN;
			const scene = replay.scenes.find((scene) =>
				scene.action.actionNumber === actionNumber ||
				scene.related.some((action) => action.actionNumber === actionNumber)
			);
			if (scene) {
				currentTime = scene.start;
			} else {
				console.warn(`Replay action not found: ${requestedAction}`);
			}
		}
		playerById = new Map(replay.players.map((player) => [player.id, player]));
		teamById = new Map(game.teams.map((team) => [team.id, team]));
		jerseyByTeamId = new Map(
			game.teams.map((team, index) => [
				team.id,
				getJerseyColors(team, game.teams[1 - index], uniforms?.[team.home ? "home" : "away"]),
			]),
		);
		for (const [index, element] of [awayTeamEl, homeTeamEl].entries()) {
			const team = game.teams[index];
			element.querySelector("span").textContent = team.code;
			element.querySelector("img").src = getTeamLogo(team);
			element.querySelector("img").alt = team.name;
			element.querySelector("img").hidden = false;
			const label = jerseyKey.children[index];
			label.querySelector("span").textContent = team.code;
			const jersey = label.querySelector("canvas");
			const context = jersey.getContext("2d");
			context.translate(jersey.width / 2, jersey.height / 2);
			context.scale(12, 12);
			drawJersey(context, jerseyByTeamId.get(team.id));
		}
		const date = new Date(game.date).toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			timeZone: "America/New_York",
		}).toUpperCase();
		idleDescription.textContent = `${game.teams[0].code} @ ${game.teams[1].code} · ${date}`;
		document.title = `Hoops Replay · ${game.teams[0].code} @ ${game.teams[1].code}`;
		actionPhoto.addEventListener("error", () => {
			if (/^https:\/\/cdn\.(nba|wnba)\.com\/headshots\//.test(actionPhoto.getAttribute("src") || "")) {
				console.warn(`Player photo unavailable: ${actionPhoto.getAttribute("src")}`);
				const action = displayedAction.action;
				const player = playerById.get(action.personId);
				const team = teamById.get(player?.teamId || action.teamId);
				actionPhoto.src = getTeamLogo(team);
			} else {
				console.warn("Action team logo could not be loaded.");
				actionPhoto.hidden = true;
			}
		});
		homeLogo.addEventListener("load", () => {
			drawCourt();
			render();
		});
		homeLogo.addEventListener("error", () => console.warn("Homecourt logo could not be loaded."));
		homeLogo.src = getTeamLogo(game.teams.find((team) => team.home));
		timeline.max = replay.duration;
		for (const control of document.querySelectorAll(".playback button, .playback input, .playback select")) {
			control.disabled = false;
		}
		for (const quarter of replay.quarters) {
			const button = quarterTemplate.content.firstElementChild.cloneNode(true);
			button.textContent = quarter.period > 4 ? `OT${quarter.period - 4}` : `Q${quarter.period}`;
			button.style.left = `${quarter.time / replay.duration * 100}%`;
			button.addEventListener("click", () => seek(quarter.time));
			quarters.append(button);
		}
		playButton.addEventListener("click", () => {
			if (currentTime >= replay.duration) {
				seek(0);
			}
			setPlaying(!playing);
		});
		timeline.addEventListener("input", () => seek(Number(timeline.value)));
		previousButton.addEventListener("click", () => stepAction(-1));
		nextButton.addEventListener("click", () => stepAction(1));
		canvas.addEventListener("click", selectPlayer);
		document.addEventListener("keydown", (event) => {
			if (
				["INPUT", "SELECT"].includes(event.target.tagName) ||
				(event.target.tagName === "BUTTON" && event.code === "Space")
			) {
				return;
			}
			if (event.code === "Space") {
				event.preventDefault();
				if (currentTime >= replay.duration) {
					seek(0);
				}
				setPlaying(!playing);
			} else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
				event.preventDefault();
				stepAction(event.code === "ArrowRight" ? 1 : -1);
			}
		});
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) {
				setPlaying(false);
			}
		});
		loadState.hidden = true;
		drawCourt();
		render();
	} catch (error) {
		replay = null;
		console.error("Court Replay could not be prepared:", error);
		loadState.textContent = `Replay could not be loaded. ${error.message}`;
	}
}

/* --------------------------------------------------------------------------------------------------
Start
---------------------------------------------------------------------------------------------------*/

init();
