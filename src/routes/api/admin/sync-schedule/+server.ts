import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { syncSchedule } from '$lib/server/scraper.js';

export const POST: RequestHandler = async ({ cookies }) => {
	const adminCookie = cookies.get('rfp_admin');
	if (adminCookie !== '1') throw error(403, 'Not authorized');

	const result = await syncSchedule('manual');
	return json(result);
};
