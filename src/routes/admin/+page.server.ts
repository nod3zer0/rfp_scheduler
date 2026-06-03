import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { groups, members, picks, inviteLinks, scheduleSnapshots, users } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const load: PageServerLoad = () => {
	const allGroups = db.select().from(groups).all();
	const allMembers = db.select().from(members).all();
	const allPicks = db.select({ memberId: picks.memberId }).from(picks).all();
	const allUsers = db.select({ id: users.id, name: users.name, createdAt: users.createdAt }).from(users).all();

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
		users: allUsers,
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
	},

	resetPassword: async ({ request }) => {
		const form = await request.formData();
		const userId = form.get('userId') as string;
		const newPassword = (form.get('newPassword') as string)?.trim();

		if (!newPassword || newPassword.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters' });
		}

		const user = db.select().from(users).where(eq(users.id, userId)).get();
		if (!user) {
			return fail(404, { error: 'User not found' });
		}

		const passwordHash = await bcrypt.hash(newPassword, 10);
		db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run();

		return { success: true, userName: user.name };
	}
};
