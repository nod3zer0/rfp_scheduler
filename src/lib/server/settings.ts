import { db } from './db.js';
import { appSettings } from './schema.js';
import { eq } from 'drizzle-orm';
import type { Day } from '$lib/days.js';

export function getDayOverride(): Day | null {
	const setting = db.select().from(appSettings).where(eq(appSettings.key, 'day_override')).get();
	return setting?.value as Day | null;
}

export function setDayOverride(day: Day | null): void {
	if (day === null) {
		// Remove override
		db.delete(appSettings).where(eq(appSettings.key, 'day_override')).run();
	} else {
		// Upsert override
		const existing = db.select().from(appSettings).where(eq(appSettings.key, 'day_override')).get();
		if (existing) {
			db.update(appSettings).set({ value: day }).where(eq(appSettings.key, 'day_override')).run();
		} else {
			db.insert(appSettings).values({ key: 'day_override', value: day }).run();
		}
	}
}
