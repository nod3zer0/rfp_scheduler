import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { members, groups } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const body = await request.json() as { name?: string; groupId?: string };
	const name = body.name?.trim();
	const groupId = body.groupId?.trim();

	if (!name || !groupId) throw error(400, 'name and groupId required');

	const group = db.select().from(groups).where(eq(groups.id, groupId)).get();
	if (!group) throw error(404, 'Group not found');

	// Find existing member with this name in this group
	const existing = db
		.select()
		.from(members)
		.where(and(eq(members.groupId, groupId), eq(members.name, name)))
		.get();

	// Block claiming a registered member unless the caller IS that user
	if (existing?.userId && existing.userId !== locals.user?.id) {
		throw error(403, 'That name belongs to a registered account. Sign in to use it.');
	}

	let memberId: string;

	if (existing) {
		memberId = existing.id;
	} else {
		memberId = nanoid(10);
		// If the caller is a registered user, link the new member to them
		const userId = locals.user?.id ?? null;
		db.insert(members)
			.values({ id: memberId, groupId, name, userId, createdAt: new Date().toISOString() })
			.run();
	}

	// Build cookie: preserve userId if logged in
	const userId = locals.user?.id;
	const payload = userId
		? JSON.stringify({ userId, memberId, groupId })
		: JSON.stringify({ memberId, groupId });

	cookies.set('rfp_identity', payload, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		sameSite: 'lax',
		httpOnly: false
	});

	return json({ memberId, groupId });
};
