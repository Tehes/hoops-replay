import { compileReplay, getReplayFrame } from "./replay-engine.js";

const WORLD = { width: 110, height: 68, left: 8, top: 9 };
const TEAM_COLORS = {
	DEN: { shirt: "#0e2240", trim: "#fec524", ink: "#ffffff" },
	OKC: { shirt: "#ef3b24", trim: "#007ac1", ink: "#ffffff" },
	NYK: { shirt: "#006bb6", trim: "#f58426", ink: "#ffffff" },
	BOS: { shirt: "#007a33", trim: "#ffffff", ink: "#ffffff" },
};
const REFERENCE_GAMES = ["0022600007", "0022600008"];
const ICON_TITLES = {
	foul: "Foul",
	block: "Block",
	steal: "Steal",
	turnover: "Ballverlust",
	rebound: "Rebound",
	substitution: "Auswechslung",
	jumpball: "Sprungball",
	timeout: "Auszeit",
	violation: "Regelverstoß",
	"shot-clock": "Wurfuhr abgelaufen",
	technical: "Technisches Foul",
	challenge: "Challenge",
};
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
const homeLogo = new Image();

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
const quarterButtons = document.querySelectorAll("#quarters button");
const awayTeamEl = document.querySelector(".team.away");
const homeTeamEl = document.querySelector(".team.home");

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
	const colors = TEAM_COLORS[home?.code || "OKC"];
	courtBackground = document.createElement("canvas");
	courtBackground.width = canvas.width;
	courtBackground.height = canvas.height;
	const c = courtBackground.getContext("2d");
	c.scale(scale, scale);
	c.translate(WORLD.left, WORLD.top);
	c.fillStyle = "#0c131b";
	roundedRect(c, -3.4, -3.4, 100.8, 56.8, 0.6);
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
		const angle = Math.asin(22 / 23.75);
		const cornerX = 5.25 + Math.sqrt(23.75 ** 2 - 22 ** 2);
		c.beginPath();
		c.moveTo(0, 3);
		c.lineTo(cornerX, 3);
		c.arc(5.25, 25, 23.75, -angle, angle);
		c.lineTo(0, 47);
		c.stroke();
		c.lineWidth = 0.3;
		c.strokeStyle = "#f6f7f8";
		c.beginPath();
		c.moveTo(4, 22);
		c.lineTo(4, 28);
		c.stroke();
		c.strokeStyle = "#18212b";
		c.lineWidth = 0.22;
		c.beginPath();
		c.arc(5.25, 25, 0.75, 0, Math.PI * 2);
		c.stroke();
		c.fillStyle = "#f5f6f7";
		c.font = "700 1.4px system-ui";
		c.textAlign = "center";
		c.translate(-1.25, 25);
		c.rotate(-Math.PI / 2);
		c.fillText(home?.code === "BOS" ? "BOSTON CELTICS" : "OKLAHOMA CITY", 0, 0);
		c.restore();
	}
	c.textAlign = "center";
	c.fillStyle = "#9aabb8";
	c.font = "600 1px system-ui";
	c.fillText((game?.arena || "Paycom Center").toUpperCase(), 47, 54.8);
	c.fillStyle = "#536572";
	c.font = "600 0.9px system-ui";
	const date = game
		? new Date(game.date).toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			timeZone: "America/New_York",
		}).toUpperCase()
		: "22 OCT 2026";
	c.fillText(`${game?.teams[0].code || "DEN"} · ${home?.code || "OKC"}    /    ${date}`, 47, -5.2);
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

function drawPlayer(position, frame) {
	const player = playerById.get(position.id);
	const colors = TEAM_COLORS[teamById.get(player.teamId).code];
	const size = Math.max(1, 7 / (scale / (globalThis.devicePixelRatio || 1) * 1.6));
	ctx.save();
	ctx.globalAlpha = position.opacity;
	ctx.translate(position.x, position.y);
	ctx.scale(size, size);
	ctx.fillStyle = "#19212c30";
	ctx.beginPath();
	ctx.ellipse(0.2, 1.9, 2 / (1 + position.jump * 0.08), 0.7, 0, 0, Math.PI * 2);
	ctx.fill();
	if (position.id === frame.ball.owner || position.id === selectedPlayer) {
		ctx.strokeStyle = position.id === selectedPlayer ? "#ffffff" : "#f6bc55";
		ctx.lineWidth = 0.2;
		ctx.beginPath();
		ctx.ellipse(0, 0, 2.5, 2.8, 0, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.translate(0, -position.jump * 0.65);
	ctx.rotate(position.angle);
	ctx.beginPath();
	ctx.moveTo(-0.8, -2.2);
	ctx.lineTo(-2.2, -1.2);
	ctx.lineTo(-1.5, 0.1);
	ctx.lineTo(-1.25, -0.1);
	ctx.lineTo(-1.25, 2);
	ctx.lineTo(1.25, 2);
	ctx.lineTo(1.25, -0.1);
	ctx.lineTo(1.5, 0.1);
	ctx.lineTo(2.2, -1.2);
	ctx.lineTo(0.8, -2.2);
	ctx.quadraticCurveTo(0, -1, -0.8, -2.2);
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
	const occupied = frame.markers.map((marker) => ({
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

function drawEventIcon(kind, x, y, size) {
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(size, size);
	ctx.strokeStyle = ["foul", "violation", "technical", "shot-clock"].includes(kind) ? "#f6bc55" : "#f1f4f6";
	ctx.lineWidth = 0.19;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.beginPath();
	if (kind === "foul") {
		ctx.arc(-0.3, 0.2, 0.65, 0, Math.PI * 2);
		ctx.moveTo(0.15, -0.3);
		ctx.lineTo(1, -0.3);
		ctx.lineTo(1, 0.2);
		ctx.lineTo(0.35, 0.5);
		ctx.moveTo(-0.7, -0.9);
		ctx.lineTo(-0.9, -1.2);
		ctx.moveTo(0, -0.9);
		ctx.lineTo(0.1, -1.3);
	} else if (kind === "substitution") {
		ctx.moveTo(-1, -0.5);
		ctx.lineTo(1, -0.5);
		ctx.lineTo(0.5, -1);
		ctx.moveTo(1, -0.5);
		ctx.lineTo(0.5, 0);
		ctx.moveTo(1, 0.6);
		ctx.lineTo(-1, 0.6);
		ctx.lineTo(-0.5, 1.1);
		ctx.moveTo(-1, 0.6);
		ctx.lineTo(-0.5, 0.1);
	} else if (kind === "turnover") {
		ctx.arc(0, 0, 0.95, -Math.PI * 0.8, Math.PI * 0.7);
		ctx.lineTo(-1, 0.7);
		ctx.moveTo(-0.55, 0.75);
		ctx.lineTo(-0.45, 1.15);
		ctx.moveTo(-0.3, -0.3);
		ctx.lineTo(0.3, 0.3);
		ctx.moveTo(0.3, -0.3);
		ctx.lineTo(-0.3, 0.3);
	} else if (kind === "steal") {
		ctx.arc(0.5, -0.6, 0.5, 0, Math.PI * 2);
		ctx.moveTo(-1, 1);
		ctx.lineTo(-0.65, 0.1);
		ctx.lineTo(-0.65, -0.8);
		ctx.quadraticCurveTo(-0.65, -1.15, -0.4, -0.8);
		ctx.lineTo(-0.3, 0.1);
		ctx.lineTo(0.8, 0.1);
		ctx.quadraticCurveTo(1.3, 0.65, 0.25, 1.1);
	} else if (kind === "violation") {
		ctx.moveTo(0, -1.2);
		ctx.lineTo(1.2, 0.9);
		ctx.lineTo(-1.2, 0.9);
		ctx.closePath();
		ctx.moveTo(0, -0.5);
		ctx.lineTo(0, 0.2);
		ctx.moveTo(0, 0.6);
		ctx.lineTo(0, 0.61);
	} else if (kind === "block") {
		ctx.moveTo(-0.9, -0.9);
		ctx.lineTo(0, -1.2);
		ctx.lineTo(0.9, -0.9);
		ctx.lineTo(0.7, 0.5);
		ctx.lineTo(0, 1.1);
		ctx.lineTo(-0.7, 0.5);
		ctx.closePath();
		ctx.moveTo(-0.45, 0.4);
		ctx.lineTo(0.5, -0.6);
	} else if (kind === "shot-clock") {
		ctx.arc(0, 0, 1.05, 0, Math.PI * 2);
		ctx.moveTo(0, -0.7);
		ctx.lineTo(0, 0);
		ctx.lineTo(0.65, 0.3);
		ctx.moveTo(-0.3, -1.35);
		ctx.lineTo(0.3, -1.35);
	} else if (kind === "technical") {
		ctx.rect(-1.1, -1.1, 2.2, 2.2);
		ctx.moveTo(-0.6, -0.55);
		ctx.lineTo(0.6, -0.55);
		ctx.moveTo(0, -0.55);
		ctx.lineTo(0, 0.65);
	} else if (kind === "challenge") {
		ctx.rect(-1.2, -0.9, 2.4, 1.65);
		ctx.moveTo(-0.3, -0.5);
		ctx.lineTo(0.5, -0.1);
		ctx.lineTo(-0.3, 0.3);
		ctx.closePath();
		ctx.moveTo(-0.6, 1.1);
		ctx.lineTo(0.6, 1.1);
	} else if (kind === "timeout") {
		ctx.moveTo(-1, -0.8);
		ctx.lineTo(1, -0.8);
		ctx.moveTo(0, -0.8);
		ctx.lineTo(0, 1);
	} else if (kind === "jumpball") {
		ctx.arc(0, -0.8, 0.4, 0, Math.PI * 2);
		ctx.moveTo(-0.7, 1);
		ctx.lineTo(-0.7, -0.3);
		ctx.lineTo(-1, 0);
		ctx.moveTo(0.7, 1);
		ctx.lineTo(0.7, -0.3);
		ctx.lineTo(1, 0);
	} else {
		ctx.arc(0, 0, 0.55, 0, Math.PI * 2);
		ctx.moveTo(1.1, 0);
		ctx.arc(0, 0, 1.1, 0, Math.PI * 1.6);
		ctx.lineTo(0.8, -0.7);
	}
	ctx.stroke();
	ctx.restore();
}

function drawMarkers(frame) {
	const pixelScale = scale / (globalThis.devicePixelRatio || 1);
	const markerSize = Math.max(1, 5 / pixelScale);
	for (const marker of frame.markers) {
		const age = frame.time - marker.time;
		const remaining = marker.end - frame.time;
		ctx.save();
		ctx.globalAlpha = Math.min(1, remaining / 0.65, age / 0.08 + 0.2);
		if (marker.kind === "made" || marker.kind === "miss") {
			ctx.strokeStyle = marker.kind === "made" ? "#13694e" : "#af2940";
			ctx.lineWidth = 0.35 * markerSize;
			ctx.beginPath();
			if (marker.kind === "made") {
				ctx.arc(marker.x, marker.y, 2.5 * markerSize, 0, Math.PI * 2);
			} else {
				ctx.moveTo(marker.x - 1.5 * markerSize, marker.y - 1.5 * markerSize);
				ctx.lineTo(marker.x + 1.5 * markerSize, marker.y + 1.5 * markerSize);
				ctx.moveTo(marker.x + 1.5 * markerSize, marker.y - 1.5 * markerSize);
				ctx.lineTo(marker.x - 1.5 * markerSize, marker.y + 1.5 * markerSize);
			}
			ctx.stroke();
			if (marker.value) {
				ctx.font = `850 ${2.4 * markerSize}px system-ui`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.lineWidth = 0.65 * markerSize;
				ctx.strokeStyle = "#f2dbb4";
				const y = marker.y - (4 + Math.min(age, 1) * 1.3) * markerSize;
				ctx.strokeText(marker.value, marker.x, y);
				ctx.fillStyle = "#13694e";
				ctx.fillText(marker.value, marker.x, y);
			}
		} else {
			const y = marker.y - 4.2 * markerSize;
			ctx.fillStyle = "#101820ef";
			roundedRect(
				ctx,
				marker.x - 2.1 * markerSize,
				y - 2.1 * markerSize,
				4.2 * markerSize,
				4.2 * markerSize,
				0.9,
			);
			ctx.fill();
			drawEventIcon(marker.kind, marker.x, y, 1.3 * markerSize);
		}
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

function formatTime(seconds) {
	const rounded = Math.max(0, Math.ceil(seconds));
	return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function render() {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (courtBackground) {
		ctx.drawImage(courtBackground, 0, 0);
	}
	if (!replay) {
		return;
	}
	const frame = getReplayFrame(replay, currentTime);
	currentFrame = frame;
	ctx.save();
	ctx.scale(scale, scale);
	ctx.translate(WORLD.left, WORLD.top);
	drawShotEffects(frame);
	for (const position of frame.players.filter((player) => player.opacity > 0.01).sort((a, b) => a.y - b.y)) {
		drawPlayer(position, frame);
	}
	drawMarkers(frame);
	drawBall(frame);
	drawNames(frame);
	if (frame.banner) {
		ctx.fillStyle = "#101820e8";
		roundedRect(ctx, 36, 20.5, 22, 9, 1);
		ctx.fill();
		ctx.fillStyle = "#f1f4f6";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "750 2.7px system-ui";
		ctx.fillText(frame.banner, 47, 25);
	}
	ctx.restore();
	awayScore.textContent = frame.score[0];
	homeScore.textContent = frame.score[1];
	periodEl.textContent = currentTime === replay.duration ? "FINAL" : `Q${frame.period}`;
	clockEl.textContent = formatTime(frame.clock);
	timeline.value = currentTime;
	elapsed.value = `${formatTime(currentTime)} / ${formatTime(replay.duration)}`;
	previousButton.disabled = currentTime === 0;
	nextButton.disabled = currentTime >= replay.attacks.at(-1);
}

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
	const marker = currentFrame.markers.find((item) => Math.hypot(item.x - x, item.y - 4.2 - y) < 3);
	canvas.title = marker ? ICON_TITLES[marker.kind] || "Wurf" : "Court Replay – Spieler für Namen antippen";
	render();
}

async function init() {
	resizeCourt();
	new ResizeObserver(resizeCourt).observe(canvas);
	try {
		const requestedGame = new URLSearchParams(globalThis.location.search).get("game");
		const gameId = REFERENCE_GAMES.includes(requestedGame) ? requestedGame : REFERENCE_GAMES[0];
		const response = await fetch(`./data/replay-${gameId}.json`);
		if (!response.ok) {
			throw new Error(`Replay data: HTTP ${response.status}`);
		}
		game = await response.json();
		replay = compileReplay(game);
		playerById = new Map(replay.players.map((player) => [player.id, player]));
		teamById = new Map(game.teams.map((team) => [team.id, team]));
		for (const [index, element] of [awayTeamEl, homeTeamEl].entries()) {
			const team = game.teams[index];
			element.querySelector("span").textContent = team.code;
			element.querySelector("img").src = `./img/NBA/${team.code}.svg`;
			element.querySelector("img").alt = team.name;
		}
		document.title = `Court Replay · ${game.teams[0].code} @ ${game.teams[1].code}`;
		homeLogo.addEventListener("load", () => {
			drawCourt();
			render();
		});
		homeLogo.addEventListener("error", () => console.warn("Homecourt logo could not be loaded."));
		homeLogo.src = `./img/NBA/${game.teams.find((team) => team.home).code}.svg`;
		timeline.max = replay.duration;
		for (const control of document.querySelectorAll(".playback button, .playback input, .playback select")) {
			control.disabled = false;
		}
		quarterButtons.forEach((button, index) => {
			button.style.left = `${replay.quarters[index].time / replay.duration * 100}%`;
			button.addEventListener("click", () => seek(replay.quarters[index].time));
		});
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
		render();
	} catch (error) {
		console.error("Court Replay could not be prepared:", error);
		loadState.textContent = "Replay konnte nicht geladen werden. Bitte lade die Seite erneut.";
	}
}

init();
