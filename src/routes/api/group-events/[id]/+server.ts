import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { groupEvents } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { requireMemberAndGroup } from '$lib/server/auth.js';

export const DELETE: RequestHandler = ({ params, locals }) => {
	const { group } = requireMemberAndGroup(locals);

	const event = db.select().from(groupEvents).where(eq(groupEvents.id, params.id)).get();
	if (!event || event.groupId !== group.id) throw error(404, 'Event not found');

	db.delete(groupEvents).where(eq(groupEvents.id, params.id)).run();
	return json({ deleted: true });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { group } = requireMemberAndGroup(locals);

	const event = db.select().from(groupEvents).where(eq(groupEvents.id, params.id)).get();
	if (!event || event.groupId !== group.id) throw error(404, 'Event not found');

	const body = await request.json() as { title?: string; description?: string; timeStart?: string; timeEnd?: string };

	db.update(groupEvents)
		.set({
			title: body.title?.trim() ?? event.title,
			description: body.description?.trim() ?? event.description,
			timeStart: body.timeStart?.trim() ?? event.timeStart,
			timeEnd: body.timeEnd?.trim() || null
		})
		.where(eq(groupEvents.id, params.id))
		.run();

	return json({ updated: true });
};
