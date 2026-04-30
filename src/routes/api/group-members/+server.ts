import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { members } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = ({ url }) => {
	const groupId = url.searchParams.get('groupId');
	if (!groupId) throw error(400, 'groupId required');

	const rows = db
		.select({ id: members.id, name: members.name, userId: members.userId })
		.from(members)
		.where(eq(members.groupId, groupId))
		.all();

	return json({
		members: rows.map((m) => ({ id: m.id, name: m.name, isRegistered: !!m.userId }))
	});
};
