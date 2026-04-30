import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { groups, inviteLinks, members } from '$lib/server/schema.js';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/account/login?redirect=/groups/new');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		if (!locals.user) redirect(303, '/account/login?redirect=/groups/new');

		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		const password = form.get('password') as string;
		const confirm = form.get('confirm') as string;

		if (!name) return fail(400, { error: 'Group name is required' });
		if (!password) return fail(400, { error: 'Admin password is required' });
		if (password !== confirm) return fail(400, { error: 'Passwords do not match' });
		if (password.length < 4) return fail(400, { error: 'Password must be at least 4 characters' });

		const groupId = nanoid(10);
		const adminPasswordHash = await bcrypt.hash(password, 10);
		const now = new Date().toISOString();

		db.insert(groups).values({ id: groupId, name, adminPasswordHash, createdAt: now }).run();

		// Auto-create member for the registering user
		const memberId = nanoid(10);
		db.insert(members)
			.values({ id: memberId, groupId, name: locals.user.name, userId: locals.user.id, createdAt: now })
			.run();

		// Default invite link
		const linkId = nanoid(12);
		db.insert(inviteLinks)
			.values({ id: linkId, groupId, expiresAt: null, maxUses: null, useCount: 0, isActive: true, createdAt: now })
			.run();

		// Set active group in cookie
		const payload = JSON.stringify({ userId: locals.user.id, memberId, groupId });
		cookies.set('rfp_identity', payload, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });

		redirect(303, `/groups/${groupId}/manage?new=1`);
	}
};
