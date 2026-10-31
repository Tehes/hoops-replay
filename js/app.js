/* --------------------------------------------------------------------------------------------------
Imports
---------------------------------------------------------------------------------------------------*/

import { loadRecentGameIds, loadReplayData } from "./replay-data.js";
import { checkReplay } from "./replay-validation.js";
import { compileReplay, getReplayFrame } from "./replay-engine.js";
import { getJerseyColors, getTeamColors, getTeamLogo, getTeamName } from "./replay-teams.js";
import { getLeague } from "./replay-leagues.js";

/* --------------------------------------------------------------------------------------------------
Constants and state
---------------------------------------------------------------------------------------------------*/

const WORLD = { width: 110, height: 65, left: 8, top: 9 };
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
const actionPhoto = document.querySelector("#action-photo");
const actionPlayer = document.querySelector("#action-player");
const actionDescription = document.querySelector("#action-description");

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
	for (let row = 0; row < 60; row++) {
		c.fillStyle = row % 3 === 0 ? "#d6ad7a" : row % 3 === 1 ? "#dfbc8c" : "#e3c396";
		c.fillRect(0, row * 0.84, 94, 0.83);
		c.strokeStyle = "#9e744323";
		c.lineWidth = 0.035;
		for (let x = (row % 4) * 5; x < 94; x += 22) {
			c.beginPath();
			c.moveTo(x, row * 0.84);
			c.lineTo(x, row * 0.84 + 0.83);
			c.stroke();
		}
	}
	c.fillStyle = colors.shirt;
	c.fillRect(0, 17, 19, 16);
	c.fillRect(75, 17, 19, 16);
	c.fillStyle = colors.trim;
	c.fillRect(0, 17, 19, 0.5);
	c.fillRect(75, 32.5, 19, 0.5);
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
		c.strokeRect(0, 17, 19, 16);
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
		ctx.lineTo(4, 23.7);
		ctx.moveTo(-2.4, 25);
		ctx.lineTo(4, 26.3);
		ctx.stroke();
		ctx.strokeStyle = "#b8c4ce";
		ctx.lineWidth = 0.65;
		ctx.beginPath();
		ctx.moveTo(-2.4, 25);
		ctx.lineTo(4, 25);
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
		ctx.moveTo(4, 22);
		ctx.lineTo(4, 28);
		ctx.stroke();
		ctx.strokeStyle = "#18212b";
		ctx.lineWidth = 0.42;
		ctx.beginPath();
		ctx.arc(5.25, 25, 0.75, 0, Math.PI * 2);
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

function drawPlayer(position) {
	const player = playerById.get(position.id);
	const colors = jerseyByTeamId.get(player.teamId);
	const size = Math.max(1, 7 / (scale / (globalThis.devicePixelRatio || 1) * 1.6));
	ctx.save();
	ctx.globalAlpha = position.opacity;
	ctx.translate(position.x, position.y);
	ctx.scale(size, size);
	ctx.fillStyle = "#19212c30";
	ctx.beginPath();
	ctx.ellipse(0.2, 1.9, 2 / (1 + position.jump * 0.08), 0.7, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.translate(0, -position.jump * 0.65);
	ctx.rotate(position.angle);
	ctx.beginPath();
	ctx.moveTo(-0.6, -2.2);
	ctx.lineTo(-1.25, -2.05);
	ctx.quadraticCurveTo(-0.95, -0.8, -1.45, -0.3);
	ctx.lineTo(-1.4, 2.2);
	ctx.lineTo(1.4, 2.2);
	ctx.lineTo(1.45, -0.3);
	ctx.quadraticCurveTo(0.95, -0.8, 1.25, -2.05);
	ctx.lineTo(0.6, -2.2);
	ctx.bezierCurveTo(0.6, -1.25, -0.6, -1.25, -0.6, -2.2);
	ctx.closePath();
	ctx.fillStyle = colors.shirt;
	ctx.fill();
	ctx.lineWidth = 0.16;
	ctx.strokeStyle = colors.trim;
	ctx.stroke();
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
	const occupied = frame.markers.filter((marker) => marker.kind === "made" || marker.kind === "miss").map((
		marker,
	) => ({
		x: marker.x - 4,
		y: marker.y - 10,
		width: 8,
		height: 8,
	}));
	const fontSize = Math.max(1.05, 9 / (scale / (globalThis.devicePixelRatio || 1)));
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
		let box;
		for (const offset of [-5.2, 4.6, -8.5, 8, -12]) {
			box = {
				x: Math.max(-5, Math.min(99 - width, position.x - width / 2)),
				y: Math.max(-5, Math.min(54, position.y + offset)),
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
	const markerSize = Math.max(1, 5 / pixelScale);
	for (const marker of frame.markers) {
		if (marker.kind !== "made" && marker.kind !== "miss") {
			continue;
		}
		const age = frame.time - marker.time;
		const remaining = marker.end - frame.time;
		const y = marker.y + 1.7;
		ctx.save();
		ctx.globalAlpha = Math.min(1, remaining, age / 0.12 + 0.2);
		ctx.beginPath();
		if (marker.kind === "made") {
			ctx.fillStyle = "#228b50";
			ctx.arc(marker.x, y, 1.6 * markerSize, 0, Math.PI * 2);
			ctx.fill();
		} else {
			ctx.strokeStyle = "#d03b45";
			ctx.lineWidth = 0.45 * markerSize;
			ctx.lineCap = "round";
			ctx.moveTo(marker.x - 1.1 * markerSize, y - 1.1 * markerSize);
			ctx.lineTo(marker.x + 1.1 * markerSize, y + 1.1 * markerSize);
			ctx.moveTo(marker.x + 1.1 * markerSize, y - 1.1 * markerSize);
			ctx.lineTo(marker.x - 1.1 * markerSize, y + 1.1 * markerSize);
			ctx.stroke();
		}
		ctx.restore();
	}
}

function drawScoreMarkers(frame) {
	const pixelScale = scale / (globalThis.devicePixelRatio || 1);
	const markerSize = Math.max(1, 5 / pixelScale);
	for (const marker of frame.markers) {
		if (marker.kind !== "made" || !marker.value) {
			continue;
		}
		const age = frame.time - marker.time;
		const remaining = marker.end - frame.time;
		ctx.save();
		ctx.globalAlpha = Math.min(1, remaining, age / 0.08 + 0.2);
		ctx.font = `850 ${2.4 * markerSize}px system-ui`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.lineWidth = 0.65 * markerSize;
		ctx.strokeStyle = "#f2dbb4";
		const y = marker.y - (4 + Math.min(age, 1) * 1.3) * markerSize;
		ctx.strokeText(marker.value, marker.x, y);
		ctx.fillStyle = "#13694e";
		ctx.fillText(marker.value, marker.x, y);
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
			const x = point.ball.x;
			const y = point.ball.y - point.ball.z * 0.6;
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
			ctx.arc(scene.hoop.x, scene.hoop.y, 1 + age * 4, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	if (scene.bankAt && local >= scene.bankAt && local < scene.bankAt + 0.25) {
		ctx.strokeStyle = "#fff9e3";
		ctx.lineWidth = 0.45;
		const boardX = scene.hoop.x < 47 ? 4 : 90;
		ctx.beginPath();
		ctx.moveTo(boardX, 22);
		ctx.lineTo(boardX, 28);
		ctx.stroke();
	}
}

function drawBall(frame) {
	const ball = frame.ball;
	const dribble = ball.owner && ball.dribble ? Math.abs(Math.sin(frame.time * 12)) * 0.4 : 0;
	const radius = Math.max(0.65, 3.2 / (scale / (globalThis.devicePixelRatio || 1)));
	ctx.fillStyle = "#10182044";
	ctx.beginPath();
	ctx.ellipse(ball.x, ball.y + 0.7, radius * 1.1, radius * 0.45, 0, 0, Math.PI * 2);
	ctx.fill();
	const y = ball.y - ball.z * 0.6 - dribble;
	ctx.fillStyle = "#ff9b30";
	ctx.strokeStyle = "#572f14";
	ctx.lineWidth = 0.12;
	ctx.beginPath();
	ctx.arc(ball.x, y, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(ball.x - radius, y);
	ctx.lineTo(ball.x + radius, y);
	ctx.moveTo(ball.x, y - radius);
	ctx.lineTo(ball.x, y + radius);
	ctx.stroke();
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
	if (displayedAction === active) {
		return;
	}
	displayedAction = active;
	const action = active?.action;
	const player = action && playerById.get(action.personId);
	const team = action && teamById.get(player?.teamId || action.teamId);
	actionDisplay.style.setProperty("--event-color", team ? getTeamColors(team).trim : "var(--accent-color)");
	actionPlayer.textContent = active?.label || player?.name || (team ? getTeamName(team) : "HOOPS REPLAY");
	if (action) {
		actionDescription.textContent = action.description;
	} else {
		const date = new Date(game.date).toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			timeZone: "America/New_York",
		}).toUpperCase();
		actionDescription.textContent = `${game.teams[0].code} @ ${game.teams[1].code} · ${date}`;
	}
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
	drawShotMarkers(frame);
	for (const position of frame.players.filter((player) => player.opacity > 0.01).sort((a, b) => a.y - b.y)) {
		drawPlayer(position);
	}
	drawBaskets();
	drawShotEffects(frame);
	drawScoreMarkers(frame);
	drawBall(frame);
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
	timeline.value = currentTime;
	elapsed.value = `${formatTime(currentTime)} / ${formatTime(replay.duration)}`;
	previousButton.disabled = currentTime === 0;
	nextButton.disabled = currentTime >= replay.attacks.at(-1);
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

function stepAttack(direction) {
	const target = direction === 1
		? replay.attacks.find((time) => time > currentTime + 0.15)
		: replay.attacks.findLast((time) => time < currentTime - 0.6);
	seek(target ?? (direction === 1 ? replay.duration : 0));
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
		.map((p) => ({ id: p.id, distance: Math.hypot(p.x - x, p.y - y) }))
		.sort((a, b) => a.distance - b.distance)[0];
	if (player && player.distance < 4) {
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
		for (const [index, gameId] of candidates.entries()) {
			try {
				const loadedGame = await loadReplayData(gameId);
				const compiledReplay = compileReplay(loadedGame);
				const report = checkReplay(loadedGame, compiledReplay);
				if (report.errors.length) {
					console.error("Replay validation failed:", report.errors);
					throw new Error(`Replay data is inconsistent (${report.errors.length} validation errors).`);
				}
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
				currentTime = scene.start + scene.eventAt;
			} else {
				console.warn(`Replay action not found: ${requestedAction}`);
			}
		}
		playerById = new Map(replay.players.map((player) => [player.id, player]));
		teamById = new Map(game.teams.map((team) => [team.id, team]));
		jerseyByTeamId = new Map(
			game.teams.map((team, index) => [team.id, getJerseyColors(team, game.teams[1 - index])]),
		);
		for (const [index, element] of [awayTeamEl, homeTeamEl].entries()) {
			const team = game.teams[index];
			element.querySelector("span").textContent = team.code;
			element.querySelector("img").src = getTeamLogo(team);
			element.querySelector("img").alt = team.name;
			element.querySelector("img").hidden = false;
		}
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
		previousButton.addEventListener("click", () => stepAttack(-1));
		nextButton.addEventListener("click", () => stepAttack(1));
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
				stepAttack(event.code === "ArrowRight" ? 1 : -1);
			}
		});
		document.addEventListener("visibilitychange", () => {
			lastTimestamp = 0;
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
