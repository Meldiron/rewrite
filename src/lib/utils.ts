export function hasStreak(streakDate: string | null) {
	if (!streakDate) {
		return false;
	}

	const date = new Date(streakDate);
	const today = new Date();

	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
}

export function xpNeededForLevel(level: number) {
	let xpNeeded = 0;

	let xpMultiplier = 1000;
	for (let i = 1; i < level; i++) {
		xpNeeded += xpMultiplier;
		xpMultiplier += 1000;
	}

	return xpNeeded;
}

export function getLevel(xp: number) {
	let level = 1;

	while (level < 1000000) {
		if (xp < xpNeededForLevel(level)) {
			return level - 1;
		}
		level++;
	}

	return level;
}

export function getLevelProgress(xp: number) {
	const level = getLevel(xp);
	const xpCurrent = xpNeededForLevel(level);
	const xpNext = xpNeededForLevel(level + 1);

	const neededXp = xpNext - xpCurrent;

	return Math.floor(((xp - xpCurrent) / neededXp) * 100);
}

export function getXpRemaining(xp: number) {
	const level = getLevel(xp);
	const xpCurrent = xpNeededForLevel(level);
	const xpNext = xpNeededForLevel(level + 1);

	const neededXp = xpNext - xpCurrent;
	const extraXp = xp - xpCurrent;

	return neededXp - extraXp;
}

export function getExtraXp(xp: number) {
	const level = getLevel(xp);
	const xpCurrent = xpNeededForLevel(level);
	const extraXp = xp - xpCurrent;

	return extraXp;
}
