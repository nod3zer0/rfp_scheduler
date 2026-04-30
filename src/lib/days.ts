export const DAYS = ['wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Day = (typeof DAYS)[number];

export const DAY_LABELS: Record<Day, string> = {
	wednesday: 'Wed 10.6',
	thursday: 'Thu 11.6',
	friday: 'Fri 12.6',
	saturday: 'Sat 13.6',
	sunday: 'Sun 14.6'
};

export const DAY_DATES: Record<Day, string> = {
	wednesday: '2026-06-10',
	thursday: '2026-06-11',
	friday: '2026-06-12',
	saturday: '2026-06-13',
	sunday: '2026-06-14'
};

/** Maps Czech URL slugs from the RFP harmonogram page to Day key + ISO date. */
export const SLUG_TO_DAY: Record<string, { day: Day; date: string }> = {
	'streda-10-6': { day: 'wednesday', date: '2026-06-10' },
	'ctvrtek-11-6': { day: 'thursday', date: '2026-06-11' },
	'patek-12-6': { day: 'friday', date: '2026-06-12' },
	'sobota-13-6': { day: 'saturday', date: '2026-06-13' },
	'nedele-14-6': { day: 'sunday', date: '2026-06-14' }
};

export function getCurrentDay(): Day {
	const now = new Date();
	const date = now.toISOString().slice(0, 10);
	const found = (Object.entries(DAY_DATES) as [Day, string][]).find(([, d]) => d === date);
	return found ? found[0] : 'wednesday';
}
