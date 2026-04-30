import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { groupEvents } from '$lib/server/schema.js';
import { DAY_DATES, type Day } from '$lib/days.js';
import { nanoid } from 'nanoid';
import { requireMemberAndGroup } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { member, group } = requireMemberAndGroup(locals);

	const body = await request.json() as {
		title?: string;
		description?: string;
		day?: string;
		timeStart?: string;
		timeEnd?: string;
	};

	const title = body.title?.trim();
	const day = body.day?.trim() as Day;
	const timeStart = body.timeStart?.trim();

	if (!title) throw error(400, 'title required');
	if (!day || !DAY_DATES[day]) throw error(400, 'valid day required');
	if (!timeStart) throw error(400, 'timeStart required');

	const event = db
		.insert(groupEvents)
		.values({
			id: nanoid(10),
			groupId: group.id,
			title,
			description: body.description?.trim() || null,
			day,
			date: DAY_DATES[day],
			timeStart,
			timeEnd: body.timeEnd?.trim() || null,
			createdByMemberId: member.id,
			createdAt: new Date().toISOString()
		})
		.returning()
		.get();

	return json(event);
};
