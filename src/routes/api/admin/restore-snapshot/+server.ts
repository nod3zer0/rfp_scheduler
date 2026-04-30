import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { restoreSnapshot } from '$lib/server/scraper.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const adminCookie = cookies.get('rfp_admin');
	if (adminCookie !== '1') throw error(403, 'Not authorized');

	const body = await request.json() as { snapshotId?: string };
	if (!body.snapshotId) throw error(400, 'snapshotId required');

	const result = restoreSnapshot(body.snapshotId);
	return json(result);
};
