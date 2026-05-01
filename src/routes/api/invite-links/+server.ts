import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { groups, inviteLinks } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json() as {
		groupId?: string;
		expiresAt?: string;
		maxUses?: number;
	};

	const { groupId, expiresAt, maxUses } = body;
	if (!groupId) throw error(400, 'groupId required');

	const group = db.select().from(groups).where(eq(groups.id, groupId)).get();
	if (!group) throw error(404, 'Group not found');

	if (!locals.user || locals.user.id !== group.createdByUserId) {
		throw error(403, 'Only the group creator can manage invite links');
	}

	const id = nanoid(12);
	const link = db
		.insert(inviteLinks)
		.values({
			id,
			groupId,
			expiresAt: expiresAt ?? null,
			maxUses: maxUses ?? null,
			useCount: 0,
			isActive: true,
			createdAt: new Date().toISOString()
		})
		.returning()
		.get();

	return json(link);
};
