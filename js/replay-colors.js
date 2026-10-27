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

function createJerseyColors(shirt, colors) {
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
	const homeJersey = createJerseyColors(home.shirt, home);
	const teamColors = [away.shirt, away.alternate].filter(Boolean);
	const candidates = [...new Set([away.alternate, "#ffffff", "#000000"].filter(Boolean))]
		.filter(improvesSeparation).map((shirt) => createJerseyColors(shirt, away));
	const branded = candidates.filter((jersey) => teamColors.includes(jersey.shirt) || teamColors.includes(jersey.ink));
	const awayJersey = (branded.length ? branded : candidates).reduce((first, next) => {
		const firstContrast = getColorContrast(first.ink, first.shirt);
		const nextContrast = getColorContrast(next.ink, next.shirt);
		if (nextContrast !== firstContrast) {
			return nextContrast > firstContrast ? next : first;
		}
		return getColorContrast(next.shirt, home.shirt) > getColorContrast(first.shirt, home.shirt) ? next : first;
	});
	return { home: homeJersey, away: awayJersey };
}
