import * as cheerio from 'cheerio';
import { db } from './db.js';
import { schedule, scheduleSnapshots } from './schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { SLUG_TO_DAY } from '$lib/days.js';

type ScrapedBand = {
	band: string;
	day: string;
	stage: string;
	date: string;
	timeStart: string;
	timeEnd: string;
	rfpUrl: string | null;
};

// stage-id → canonical stage name (scraped dynamically, fallback map)
const STAGE_ID_MAP: Record<string, string> = {
	'stage-3': 'Mastercard Stage',
	'stage-4': 'Rock for People Stage',
	'stage-5': 'E2 Stage',
	'stage-75': 'Petr Svoboda Stage',
	'stage-6': 'ČT art Stage',
	'stage-7': 'Reflex Stage',
	'stage-8': 'EcoFlow Stage',
	'stage-74': 'Karaoke Stage'
};

async function scrapeRfpSchedule(): Promise<ScrapedBand[]> {
	const res = await fetch('https://rockforpeople.cz/harmonogram/', {
		headers: { 'User-Agent': 'RFP-Squad/1.0 (+https://github.com)' }
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} fetching harmonogram`);
	const html = await res.text();
	const $ = cheerio.load(html);
	const bands: ScrapedBand[] = [];

	// Build stage id → name map from stage filter buttons (in case IDs change)
	const stageNames: Record<string, string> = { ...STAGE_ID_MAP };
	$('.timetable__stage-button[data-stage]').each((_, el) => {
		const id = $(el).attr('data-stage') ?? '';
		const name = $(el).text().trim();
		if (id && id !== 'all' && name) stageNames[id] = name;
	});

	// Each .timetable__day contains all stages for one day
	$('.timetable__day[data-day]').each((_, dayEl) => {
		const dataDaySlug = $(dayEl).attr('data-day') ?? '';
		const dayInfo = SLUG_TO_DAY[dataDaySlug];
		if (!dayInfo) return;

		// Each .timetable__stagetime[data-stage] is one stage column
		$(dayEl)
			.find('.timetable__stagetime[data-stage]')
			.each((_, stageEl) => {
				const stageId = $(stageEl).attr('data-stage') ?? '';
				const stageName = stageNames[stageId] ?? stageId;

				// Each .timetable__entry is one band slot
				$(stageEl)
					.find('.timetable__entry[data-start-time]')
					.each((_, entryEl) => {
						const bandName = $(entryEl).find('span.name').first().text().trim();
						const timeStart = $(entryEl).attr('data-start-time') ?? '';
						const timeEnd = $(entryEl).attr('data-end-time') ?? '';
						const rfpUrl = $(entryEl).find('a.timetable__entry-link').attr('href') ?? null;

						if (!bandName || !timeStart) return;

						bands.push({
							band: bandName,
							day: dayInfo.day,
							stage: stageName,
							date: dayInfo.date,
							timeStart,
							timeEnd: timeEnd || timeStart,
							rfpUrl
						});
					});
			});
	});

	return bands;
}

export async function syncSchedule(
	source: 'cron' | 'manual'
): Promise<{ added: number; updated: number; deleted: number }> {
	let scraped: ScrapedBand[];
	try {
		scraped = await scrapeRfpSchedule();
	} catch (err) {
		console.error('SCRAPE ERROR:', err);
		return { added: 0, updated: 0, deleted: 0 };
	}

	if (scraped.length === 0) {
		console.warn('SCRAPE WARNING: 0 bands parsed — possible site restructure. Aborting.');
		return { added: 0, updated: 0, deleted: 0 };
	}

	const now = new Date().toISOString();
	const existing = db.select().from(schedule).all();

	// Snapshot BEFORE changes
	const preSnapshot = JSON.stringify(existing);

	// Build lookup: band+day+stage → existing row
	const existingMap = new Map(existing.map((r) => [`${r.band}|${r.day}|${r.stage}`, r]));
	const scrapedKeys = new Set(scraped.map((b) => `${b.band}|${b.day}|${b.stage}`));

	let added = 0;
	let updated = 0;

	for (const band of scraped) {
		const key = `${band.band}|${band.day}|${band.stage}`;
		const existingRow = existingMap.get(key);

		if (!existingRow) {
			db.insert(schedule)
				.values({
					id: nanoid(10),
					band: band.band,
					day: band.day,
					stage: band.stage,
					date: band.date,
					timeStart: band.timeStart,
					timeEnd: band.timeEnd,
					rfpUrl: band.rfpUrl,
					updatedAt: now
				})
				.run();
			added++;
		} else if (
			existingRow.timeStart !== band.timeStart ||
			existingRow.timeEnd !== band.timeEnd ||
			existingRow.date !== band.date
		) {
			db.update(schedule)
				.set({
					timeStart: band.timeStart,
					timeEnd: band.timeEnd,
					date: band.date,
					rfpUrl: band.rfpUrl,
					updatedAt: now
				})
				.where(eq(schedule.id, existingRow.id))
				.run();
			updated++;
		}
	}

	// Delete rows not in scrape result (picks cascade via FK)
	const deletedRows = existing.filter((r) => !scrapedKeys.has(`${r.band}|${r.day}|${r.stage}`));
	const deleted = deletedRows.length;
	for (const row of deletedRows) {
		db.delete(schedule).where(eq(schedule.id, row.id)).run();
	}

	// Save pre-change snapshot (not active)
	db.insert(scheduleSnapshots)
		.values({
			id: nanoid(10),
			snapshotData: preSnapshot,
			scrapedAt: now,
			addedCount: added,
			updatedCount: updated,
			deletedCount: deleted,
			source,
			label: null,
			isActive: false
		})
		.run();

	// Save active snapshot of current live state
	const liveData = db.select().from(schedule).all();
	db.update(scheduleSnapshots).set({ isActive: false }).run();
	db.insert(scheduleSnapshots)
		.values({
			id: nanoid(10),
			snapshotData: JSON.stringify(liveData),
			scrapedAt: now,
			addedCount: added,
			updatedCount: updated,
			deletedCount: deleted,
			source,
			label: null,
			isActive: true
		})
		.run();

	// Prune to 30 most recent snapshots
	const allSnapshots = db
		.select({ id: scheduleSnapshots.id })
		.from(scheduleSnapshots)
		.orderBy(scheduleSnapshots.scrapedAt)
		.all();
	if (allSnapshots.length > 30) {
		const toDelete = allSnapshots.slice(0, allSnapshots.length - 30);
		for (const s of toDelete) {
			db.delete(scheduleSnapshots).where(eq(scheduleSnapshots.id, s.id)).run();
		}
	}

	console.log(`Schedule sync (${source}): +${added} ~${updated} -${deleted} [total scraped: ${scraped.length}]`);
	return { added, updated, deleted };
}

export function restoreSnapshot(snapshotId: string): { restoredCount: number } {
	const snapshot = db
		.select()
		.from(scheduleSnapshots)
		.where(eq(scheduleSnapshots.id, snapshotId))
		.get();

	if (!snapshot) throw new Error('Snapshot not found');

	const data: typeof schedule.$inferInsert[] = JSON.parse(snapshot.snapshotData);
	const now = new Date().toISOString();

	// Get current schedule IDs to know which to delete
	const currentScheduleIds = new Set(db.select({ id: schedule.id }).from(schedule).all().map(s => s.id));
	const snapshotScheduleIds = new Set(data.map(s => s.id));

	// Delete schedule entries that exist in current but not in snapshot
	// This preserves picks for entries that remain
	for (const currentId of currentScheduleIds) {
		if (!snapshotScheduleIds.has(currentId)) {
			db.delete(schedule).where(eq(schedule.id, currentId)).run();
		}
	}

	// Insert or update schedule entries from snapshot
	for (const row of data) {
		if (currentScheduleIds.has(row.id)) {
			// Update existing entry (preserves picks)
			db.update(schedule)
				.set({ ...row, updatedAt: now })
				.where(eq(schedule.id, row.id))
				.run();
		} else {
			// Insert new entry
			db.insert(schedule)
				.values({ ...row, updatedAt: now })
				.run();
		}
	}

	db.update(scheduleSnapshots).set({ isActive: false }).run();
	db.update(scheduleSnapshots)
		.set({ isActive: true })
		.where(eq(scheduleSnapshots.id, snapshotId))
		.run();

	console.log(`Restored snapshot ${snapshotId}: ${data.length} rows`);
	return { restoredCount: data.length };
}
