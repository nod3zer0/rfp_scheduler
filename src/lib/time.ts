/**
 * Converts an HH:MM time string to minutes.
 * Post-midnight hours 00:00–05:59 are mapped to 1440–1799 (24:00–29:59)
 * so that festival sets that cross midnight sort and position correctly.
 */
export function timeToMinutes(time: string): number {
	const [h, m] = time.split(':').map(Number);
	const total = h * 60 + (m ?? 0);
	return total < 360 ? total + 1440 : total;
}

/** Returns elapsed festival-minutes for the current wall-clock time. */
export function nowMinutes(): number {
	const d = new Date();
	const total = d.getHours() * 60 + d.getMinutes();
	return total < 360 ? total + 1440 : total;
}

/** Human-readable countdown string for a number of minutes in the future. */
export function formatCountdown(min: number): string {
	if (min < 1) return 'Starting now';
	if (min < 60) return `In ${min}min`;
	const h = Math.floor(min / 60);
	const rem = min % 60;
	return rem > 0 ? `In ${h}h ${rem}min` : `In ${h}h`;
}
