import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { inviteLinks, groups } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const DELETE: RequestHandler = async ({ params, request }) => {
	const body = await request.json() as { adminPassword?: string };
	if (!body.adminPassword) throw error(400, 'adminPassword required');

	const link = db.select().from(inviteLinks).where(eq(inviteLinks.id, params.id)).get();
	if (!link) throw error(404, 'Link not found');

	const group = db.select().from(groups).where(eq(groups.id, link.groupId)).get();
	if (!group) throw error(404, 'Group not found');

	const valid = await bcrypt.compare(body.adminPassword, group.adminPasswordHash);
	if (!valid) throw error(403, 'Invalid password');

	db.update(inviteLinks)
		.set({ isActive: false })
		.where(eq(inviteLinks.id, params.id))
		.run();

	return json({ revoked: true });
};
