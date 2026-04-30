import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { groups, members, picks, inviteLinks, scheduleSnapshots } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = () => {
	const allGroups = db.select().from(groups).all();
	const allMembers = db.select().from(members).all();
	const allPicks = db.select({ memberId: picks.memberId }).from(picks).all();

	const pickCountMap: Record<string, number> = {};
	for (const p of allPicks) {
		pickCountMap[p.memberId] = (pickCountMap[p.memberId] ?? 0) + 1;
	}

	const memberCountMap: Record<string, number> = {};
	for (const m of allMembers) {
		memberCountMap[m.groupId] = (memberCountMap[m.groupId] ?? 0) + 1;
	}

	const snapshots = db
		.select()
		.from(scheduleSnapshots)
		.orderBy(scheduleSnapshots.scrapedAt)
		.all()
		.reverse();

	const activeSnapshot = snapshots.find((s) => s.isActive);

	return {
		groups: allGroups.map((g) => ({ ...g, memberCount: memberCountMap[g.id] ?? 0 })),
		members: allMembers.map((m) => ({
			...m,
			groupName: allGroups.find((g) => g.id === m.groupId)?.name ?? m.groupId,
			pickCount: pickCountMap[m.id] ?? 0
		})),
		snapshots: snapshots.map((s) => ({ ...s, snapshotData: undefined })),
		lastSyncAt: activeSnapshot?.scrapedAt ?? null
	};
};

export const actions: Actions = {
	deleteGroup: async ({ request }) => {
		const form = await request.formData();
		const groupId = form.get('groupId') as string;
		db.delete(groups).where(eq(groups.id, groupId)).run();
		return { deleted: true };
	},

	removeMember: async ({ request }) => {
		const form = await request.formData();
		const memberId = form.get('memberId') as string;
		db.delete(members).where(eq(members.id, memberId)).run();
		return { removed: true };
	}
};
