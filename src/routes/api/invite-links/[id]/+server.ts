import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { inviteLinks, groups } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const link = db.select().from(inviteLinks).where(eq(inviteLinks.id, params.id)).get();
	if (!link) throw error(404, 'Link not found');

	const group = db.select().from(groups).where(eq(groups.id, link.groupId)).get();
	if (!group) throw error(404, 'Group not found');

	if (!locals.user || locals.user.id !== group.createdByUserId) {
		throw error(403, 'Only the group creator can manage invite links');
	}

	db.update(inviteLinks)
		.set({ isActive: false })
		.where(eq(inviteLinks.id, params.id))
		.run();

	return json({ revoked: true });
};
