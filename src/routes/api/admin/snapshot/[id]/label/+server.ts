import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { scheduleSnapshots } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	const adminCookie = cookies.get('rfp_admin');
	if (adminCookie !== '1') throw error(403, 'Not authorized');

	const body = await request.json() as { label?: string };
	const label = typeof body.label === 'string' ? body.label.trim() || null : null;

	db.update(scheduleSnapshots)
		.set({ label })
		.where(eq(scheduleSnapshots.id, params.id))
		.run();

	return json({ updated: true });
};
