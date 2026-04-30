import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db.js';
import { groups, inviteLinks, members, picks } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

const COOKIE_NAME = (groupId: string) => `rfp_group_auth_${groupId}`;

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const group = db.select().from(groups).where(eq(groups.id, params.id)).get();
	if (!group) throw error(404, 'Group not found');

	const authenticated = cookies.get(COOKIE_NAME(params.id)) === '1';
	const isNew = url.searchParams.get('new') === '1';

	if (!authenticated) {
		return { group: { id: group.id, name: group.name, allowGuests: group.allowGuests }, authenticated: false, isNew, links: [], members: [] };
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
		group: { id: group.id, name: group.name, allowGuests: group.allowGuests },
		authenticated: true,
		isNew,
		links,
		members: membersWithCounts
	};
};

export const actions: Actions = {
	login: async ({ params, request, cookies }) => {
		const form = await request.formData();
		const password = form.get('password') as string;

		const group = db.select().from(groups).where(eq(groups.id, params.id)).get();
		if (!group) throw error(404, 'Group not found');

		const valid = await bcrypt.compare(password, group.adminPasswordHash);
		if (!valid) return fail(403, { loginError: 'Wrong password' });

		cookies.set(COOKIE_NAME(params.id), '1', { path: '/', maxAge: 60 * 60 * 8, sameSite: 'lax', httpOnly: true });
		return { authenticated: true };
	},

	createLink: async ({ params, cookies, request }) => {
		if (cookies.get(COOKIE_NAME(params.id)) !== '1') return fail(403, { error: 'Not authorized' });

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

	revokeLink: async ({ params, cookies, request }) => {
		if (cookies.get(COOKIE_NAME(params.id)) !== '1') return fail(403, { error: 'Not authorized' });

		const form = await request.formData();
		const linkId = form.get('linkId') as string;

		db.update(inviteLinks).set({ isActive: false }).where(eq(inviteLinks.id, linkId)).run();
		return { revoked: true };
	},

	removeMember: async ({ params, cookies, request }) => {
		if (cookies.get(COOKIE_NAME(params.id)) !== '1') return fail(403, { error: 'Not authorized' });

		const form = await request.formData();
		const memberId = form.get('memberId') as string;

		// picks cascade on delete
		db.delete(members).where(eq(members.id, memberId)).run();
		return { memberRemoved: true };
	},

	renameGroup: async ({ params, cookies, request }) => {
		if (cookies.get(COOKIE_NAME(params.id)) !== '1') return fail(403, { error: 'Not authorized' });

		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		if (!name) return fail(400, { error: 'Name required' });

		db.update(groups).set({ name }).where(eq(groups.id, params.id)).run();
		return { renamed: true };
	},

	changePassword: async ({ params, cookies, request }) => {
		if (cookies.get(COOKIE_NAME(params.id)) !== '1') return fail(403, { error: 'Not authorized' });

		const form = await request.formData();
		const password = form.get('password') as string;
		const confirm = form.get('confirm') as string;
		if (!password || password !== confirm) return fail(400, { error: 'Passwords do not match' });
		if (password.length < 4) return fail(400, { error: 'Password must be at least 4 characters' });

		const hash = await bcrypt.hash(password, 10);
		db.update(groups).set({ adminPasswordHash: hash }).where(eq(groups.id, params.id)).run();
		return { passwordChanged: true };
	},

	toggleGuests: async ({ params, cookies, request }) => {
		if (cookies.get(COOKIE_NAME(params.id)) !== '1') return fail(403, { error: 'Not authorized' });

		const form = await request.formData();
		const allow = form.get('allowGuests') === '1';
		db.update(groups).set({ allowGuests: allow }).where(eq(groups.id, params.id)).run();
		return { guestsToggled: true };
	},

	deleteGroup: async ({ params, cookies }) => {
		if (cookies.get(COOKIE_NAME(params.id)) !== '1') return fail(403, { error: 'Not authorized' });

		// cascades to members, inviteLinks
		db.delete(groups).where(eq(groups.id, params.id)).run();
		cookies.delete(COOKIE_NAME(params.id), { path: '/' });
		redirect(303, '/');
	}
};
