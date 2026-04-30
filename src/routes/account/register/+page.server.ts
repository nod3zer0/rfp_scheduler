import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { users, members } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

import { env } from '$env/dynamic/private';

export const load: PageServerLoad = ({ locals }) => {
	return {
		currentName: locals.member?.name ?? locals.user?.name ?? '',
		isLoggedIn: !!locals.user,
		facebookEnabled: !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET)
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		const password = (form.get('password') as string) ?? '';
		const confirm = (form.get('confirm') as string) ?? '';

		if (!name) return fail(400, { error: 'Name is required' });
		if (password.length < 6) return fail(400, { error: 'Password must be at least 6 characters' });
		if (password !== confirm) return fail(400, { error: 'Passwords do not match' });

		// Name must not already belong to a registered user
		const existing = db.select().from(users).where(eq(users.name, name)).get();
		if (existing) return fail(400, { error: 'That name is already taken by a registered account' });

		const passwordHash = await bcrypt.hash(password, 10);
		const userId = nanoid(12);

		db.insert(users).values({ id: userId, name, passwordHash, createdAt: new Date().toISOString() }).run();

		// If the visitor currently has a guest member, link it to the new account
		if (locals.member && !locals.member.userId) {
			db.update(members).set({ userId, name }).where(eq(members.id, locals.member.id)).run();
		}

		// Set cookie: userId + keep existing group context
		const groupId = locals.group?.id ?? '';
		const memberId = locals.member?.id ?? '';
		const payload = JSON.stringify({ userId, memberId, groupId });
		cookies.set('rfp_identity', payload, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			httpOnly: false
		});

		// Redirect to groups if they have no group yet
		if (!groupId) redirect(303, '/account/groups');
		redirect(303, '/');
	}
};
