import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db.js';
import { groups, inviteLinks, members, picks } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

function assertCreator(group: typeof groups.$inferSelect, locals: App.Locals) {
	if (!locals.user || locals.user.id !== group.createdByUserId) {
		throw error(403, 'Only the group creator can manage this group');
	}
}

export const load: PageServerLoad = ({ params, locals, url }) => {
	const group = db.select().from(groups).where(eq(groups.id, params.id)).get();
	if (!group) throw error(404, 'Group not found');

	const isCreator = !!locals.user && locals.user.id === group.createdByUserId;
	const isNew = url.searchParams.get('new') === '1';

	if (!isCreator) {
		return { group: { id: group.id, name: group.name }, isCreator: false, isNew, links: [], members: [] };
	}

	const links = db.select().from(inviteLinks).where(eq(inviteLinks.groupId, params.id)).all();

	const allMembers = db.select().from(members).where(eq(members.groupId, params.id)).all();
	const allPicks = db.select({ memberId: picks.memberId }).from(picks).all();
	const pickCountMap = allPicks.reduce<Record<string, number>>((acc, p) => {
		acc[p.memberId] = (acc[p.memberId] ?? 0) + 1;
		return acc;
	}, {});

	const membersWithCounts = allMembers.map((m) => ({
		...m,
		pickCount: pickCountMap[m.id] ?? 0
	}));

	return {
		group: { id: group.id, name: group.name },
		isCreator: true,
		isNew,
		links,
		members: membersWithCounts
	};
};

export const actions: Actions = {
	createLink: async ({ params, locals, request }) => {
		const group = db.select().from(groups).where(eq(groups.id, params.id)).get();
		if (!group) throw error(404, 'Group not found');
		assertCreator(group, locals);

		const form = await request.formData();
		const expiresAt = (form.get('expiresAt') as string)?.trim() || null;
		const maxUsesRaw = (form.get('maxUses') as string)?.trim();
		const maxUses = maxUsesRaw ? parseInt(maxUsesRaw, 10) : null;

		db.insert(inviteLinks)
			.values({
				id: nanoid(12),
				groupId: params.id,
				expiresAt,
				maxUses: maxUses && !isNaN(maxUses) ? maxUses : null,
				useCount: 0,
				isActive: true,
				createdAt: new Date().toISOString()
			})
			.run();

		return { linkCreated: true };
	},

	revokeLink: async ({ params, locals, request }) => {
		const group = db.select().from(groups).where(eq(groups.id, params.id)).get();
		if (!group) throw error(404, 'Group not found');
		assertCreator(group, locals);

		const form = await request.formData();
		const linkId = form.get('linkId') as string;

		db.update(inviteLinks).set({ isActive: false }).where(eq(inviteLinks.id, linkId)).run();
		return { revoked: true };
	},

	removeMember: async ({ params, locals, request }) => {
		const group = db.select().from(groups).where(eq(groups.id, params.id)).get();
		if (!group) throw error(404, 'Group not found');
		assertCreator(group, locals);

		const form = await request.formData();
		const memberId = form.get('memberId') as string;

		db.delete(members).where(eq(members.id, memberId)).run();
		return { memberRemoved: true };
	},

	renameGroup: async ({ params, locals, request }) => {
		const group = db.select().from(groups).where(eq(groups.id, params.id)).get();
		if (!group) throw error(404, 'Group not found');
		assertCreator(group, locals);

		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		if (!name) return fail(400, { error: 'Name required' });

		db.update(groups).set({ name }).where(eq(groups.id, params.id)).run();
		return { renamed: true };
	},

	deleteGroup: async ({ params, locals }) => {
		const group = db.select().from(groups).where(eq(groups.id, params.id)).get();
		if (!group) throw error(404, 'Group not found');
		assertCreator(group, locals);

		db.delete(groups).where(eq(groups.id, params.id)).run();
		redirect(303, '/');
	}
};
