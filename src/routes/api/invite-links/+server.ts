import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { groups, inviteLinks } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json() as {
		groupId?: string;
		adminPassword?: string;
		expiresAt?: string;
		maxUses?: number;
	};

	const { groupId, adminPassword, expiresAt, maxUses } = body;
	if (!groupId || !adminPassword) throw error(400, 'groupId and adminPassword required');

	const group = db.select().from(groups).where(eq(groups.id, groupId)).get();
	if (!group) throw error(404, 'Group not found');

	const valid = await bcrypt.compare(adminPassword, group.adminPasswordHash);
	if (!valid) throw error(403, 'Invalid password');

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
