// Adapted from Tehes/nba-spielplan/js/game-colors.js at 610e3d6.
// These are visually reviewed UI thresholds, not standardized perceptual limits.
const MIN_NUMBER_CONTRAST = 4;
const SIMILARITY_DEFAULTS = {
	hue: 45,
	lightness: 0.30,
	chroma: 0.04,
	improvement: 0.04,
	contrastImprovement: 0.5,
};

function hexToLinearRgb(hex) {
	return hex.slice(1).match(/../g).map((channel) => {
		const value = parseInt(channel, 16) / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
}

// Matrices: https://bottosson.github.io/posts/oklab/ (linear sRGB to OKLab).
function hexToOklab(hex) {
	const [r, g, b] = hexToLinearRgb(hex);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
	];
}

function getColorContrast(firstHex, secondHex) {
	const luminances = [firstHex, secondHex].map((hex) => {
		const [r, g, b] = hexToLinearRgb(hex);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	});
	return (Math.max(...luminances) + 0.05) / (Math.min(...luminances) + 0.05);
}

function compareAppearance(first, second, settings) {
	const chroma = [first, second].map((lab) => Math.hypot(lab[1], lab[2]));
	const hueReliable = chroma.every((value) => value >= settings.chroma);
	const angles = [first, second].map((lab) => Math.atan2(lab[2], lab[1]) * 180 / Math.PI);
	const angle = Math.abs(angles[0] - angles[1]);
	const hue = hueReliable ? Math.min(angle, 360 - angle) : null;
	const lightness = Math.abs(first[0] - second[0]);
	const distance = Math.hypot(...first.map((value, index) => value - second[index]));
	// Different lightness must not hide similar hues; neutral colors have no reliable hue.
	const similar = hue === null ? lightness < settings.lightness : hue < settings.hue;
	return { chroma, hue, lightness, distance, similar };
}

function getNeutralColor(background) {
	return getColorContrast("#ffffff", background) >= getColorContrast("#000000", background) ? "#ffffff" : "#000000";
}

function oklabToHex([lightness, a, b]) {
	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
	const channels = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
	];
	return `#${
		channels.map((channel) => {
			const value = Math.max(0, Math.min(1, channel));
			const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
			return Math.round(encoded * 255).toString(16).padStart(2, "0");
		}).join("")
	}`;
}

export function getPaintColor(base, jerseys) {
	if (!jerseys.length) {
		return base;
	}
	const minimumContrast = (color) => Math.min(...jerseys.map((jersey) => getColorContrast(color, jersey.shirt)));
	let best = base;
	let bestContrast = minimumContrast(base);
	if (bestContrast >= 1.3) {
		return base;
	}
	const [lightness, a, b] = hexToOklab(base);
	const baseChannels = base.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
	// Keep the team hue and cap the adjustment, even if stronger contrast would require a larger change.
	for (let step = 1; step <= 12; step++) {
		for (const direction of [1, -1]) {
			const candidate = oklabToHex([
				Math.max(0, Math.min(1, lightness + direction * step * 0.02)),
				a * 0.9,
				b * 0.9,
			]);
			const channels = candidate.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
			if (channels.some((channel, index) => Math.abs(channel - baseChannels[index]) > 32)) {
				continue;
			}
			const contrast = minimumContrast(candidate);
			if (contrast > bestContrast) {
				best = candidate;
				bestContrast = contrast;
			}
		}
		if (bestContrast >= 1.3) {
			break;
		}
	}
	return best;
}

export function createJerseyColors(shirt, colors) {
	let detail = getNeutralColor(shirt);
	const teamColors = [colors.shirt, colors.alternate].filter(Boolean);
	if (shirt === "#ffffff" || shirt === "#000000") {
		const best = teamColors.reduce((first, next) =>
			getColorContrast(next, shirt) > getColorContrast(first, shirt) ? next : first
		);
		if (getColorContrast(best, shirt) >= MIN_NUMBER_CONTRAST) {
			detail = best;
		}
	}
	return { shirt, trim: detail, ink: detail };
}

export function selectMatchupJerseys(home, away) {
	const homeLab = hexToOklab(home.shirt);
	const primary = compareAppearance(homeLab, hexToOklab(away.shirt), SIMILARITY_DEFAULTS);
	const normalHome = createJerseyColors("#ffffff", home);
	const normalAway = createJerseyColors(away.shirt, away);
	if (!primary.similar) {
		return { home: normalHome, away: normalAway };
	}

	const neutral = primary.hue === null;
	const primaryContrast = getColorContrast(home.shirt, away.shirt);
	const minimum = neutral ? SIMILARITY_DEFAULTS.contrastImprovement : SIMILARITY_DEFAULTS.improvement;
	const improvesSeparation = (shirt) => {
		const improvement = neutral
			? getColorContrast(home.shirt, shirt) - primaryContrast
			: compareAppearance(homeLab, hexToOklab(shirt), SIMILARITY_DEFAULTS).distance - primary.distance;
		return improvement > 0 && improvement >= minimum;
	};
	// The schedule tests the team's alternate before deciding to switch, not white or black candidates.
	if (!improvesSeparation(away.alternate || "#000000")) {
		return { home: normalHome, away: normalAway };
	}
	const teamColors = [away.shirt, away.alternate].filter(Boolean);
	const candidates = [...new Set([away.alternate, "#ffffff", "#000000"].filter(Boolean))]
		.filter(improvesSeparation).map((shirt) => createJerseyColors(shirt, away));
	const hasTeamColor = (jersey) => teamColors.includes(jersey.shirt) || teamColors.includes(jersey.ink);
	const whiteLab = hexToOklab("#ffffff");
	// Keep home white by trying alternate, then black with readable team details.
	const whiteHomeAway = candidates.find((jersey) =>
		hasTeamColor(jersey) && !compareAppearance(whiteLab, hexToOklab(jersey.shirt), SIMILARITY_DEFAULTS).similar
	);
	if (whiteHomeAway) {
		return { home: normalHome, away: whiteHomeAway };
	}

	const homeJersey = createJerseyColors(home.shirt, home);
	const alternate = candidates.find((jersey) => jersey.shirt === away.alternate);
	if (alternate) {
		return { home: homeJersey, away: alternate };
	}
	// Neutral details are the last resort, after both home bases have been considered.
	const neutrals = candidates.filter((jersey) => jersey.shirt === "#ffffff" || jersey.shirt === "#000000");
	const branded = neutrals.filter(hasTeamColor);
	const awayJersey = (branded.length ? branded : neutrals).reduce((first, next) => {
		const firstContrast = getColorContrast(first.ink, first.shirt);
		const nextContrast = getColorContrast(next.ink, next.shirt);
		if (nextContrast !== firstContrast) {
			return nextContrast > firstContrast ? next : first;
		}
		return getColorContrast(next.shirt, home.shirt) > getColorContrast(first.shirt, home.shirt) ? next : first;
	});
	return { home: homeJersey, away: awayJersey };
}
