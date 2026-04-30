import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { picks } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireMember } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const member = requireMember(locals);

	const body = await request.json() as { scheduleId?: string };
	const scheduleId = body.scheduleId?.trim();
	if (!scheduleId) throw error(400, 'scheduleId required');

	const userId = locals.user?.id ?? null;

	// For registered users, find pick by userId; for guests by memberId
	const existing = userId
		? db.select().from(picks).where(and(eq(picks.userId, userId), eq(picks.scheduleId, scheduleId))).get()
		: db.select().from(picks).where(and(eq(picks.memberId, member.id), eq(picks.scheduleId, scheduleId))).get();

	if (existing) {
		db.delete(picks).where(eq(picks.id, existing.id)).run();
		return json({ picked: false });
	} else {
		db.insert(picks)
			.values({ id: nanoid(10), memberId: member.id, userId, scheduleId, createdAt: new Date().toISOString() })
			.run();
		return json({ picked: true });
	}
};
