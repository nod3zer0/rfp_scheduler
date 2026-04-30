import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { groupEvents, groupEventAttendees } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireMemberAndGroup } from '$lib/server/auth.js';

export const POST: RequestHandler = ({ params, locals }) => {
	const { member, group } = requireMemberAndGroup(locals);

	const event = db.select().from(groupEvents).where(eq(groupEvents.id, params.id)).get();
	if (!event || event.groupId !== group.id) throw error(404, 'Event not found');

	const existing = db
		.select()
		.from(groupEventAttendees)
		.where(and(eq(groupEventAttendees.eventId, params.id), eq(groupEventAttendees.memberId, member.id)))
		.get();

	if (existing) {
		db.delete(groupEventAttendees)
			.where(and(eq(groupEventAttendees.eventId, params.id), eq(groupEventAttendees.memberId, member.id)))
			.run();
		return json({ attending: false });
	} else {
		db.insert(groupEventAttendees)
			.values({ id: nanoid(10), eventId: params.id, memberId: member.id, createdAt: new Date().toISOString() })
			.run();
		return json({ attending: true });
	}
};
