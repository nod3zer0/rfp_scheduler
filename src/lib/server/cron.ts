import cron from 'node-cron';
import { syncSchedule } from './scraper.js';

let started = false;

export function startCron() {
	if (started) return;
	started = true;

	// Sync on startup
	syncSchedule('cron').catch((err) => console.error('Startup schedule sync failed:', err));

	// Sync every 6 hours
	cron.schedule('0 */6 * * *', () => {
		syncSchedule('cron').catch((err) => console.error('Cron schedule sync failed:', err));
	});

	console.log('Schedule cron started (every 6h)');
}
