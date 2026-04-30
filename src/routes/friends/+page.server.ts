import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { members, picks } from '$lib/server/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { requireGroupPage } from '$lib/server/auth.js';

export const load: PageServerLoad = ({ locals }) => {
	const group = requireGroupPage(locals);

	const groupMembers = db
		.select()
		.from(members)
		.where(eq(members.groupId, group.id))
		.all();

	const memberIds = groupMembers.map((m) => m.id);
	let pickCounts: Record<string, number> = {};

	if (memberIds.length > 0) {
		const allPicks = db
			.select({ memberId: picks.memberId })
			.from(picks)
			.where(inArray(picks.memberId, memberIds))
			.all();

		for (const p of allPicks) {
			pickCounts[p.memberId] = (pickCounts[p.memberId] ?? 0) + 1;
		}
	}

	return {
		members: groupMembers.map((m) => ({ ...m, pickCount: pickCounts[m.id] ?? 0 })),
		currentMemberId: locals.member?.id ?? null
	};
};
