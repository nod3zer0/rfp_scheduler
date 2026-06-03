import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { users } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

import { env } from '$env/dynamic/private';
import { setIdentityCookie } from '$lib/server/cookies.js';

export const load: PageServerLoad = ({ locals, url }) => {
	return {
		currentName: locals.user?.name ?? '',
		isLoggedIn: !!locals.user,
		redirectTo: url.searchParams.get('redirect') ?? '/',
		facebookEnabled: !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET)
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		const password = (form.get('password') as string) ?? '';
		const confirm = (form.get('confirm') as string) ?? '';
		const redirectTo = (form.get('redirectTo') as string) || '/';

		if (!name) return fail(400, { error: 'Name is required' });
		if (password.length < 6) return fail(400, { error: 'Password must be at least 6 characters' });
		if (password !== confirm) return fail(400, { error: 'Passwords do not match' });

		// Name must not already belong to a registered user
		const existing = db.select().from(users).where(eq(users.name, name)).get();
		if (existing) return fail(400, { error: 'That name is already taken by a registered account' });

		const passwordHash = await bcrypt.hash(password, 10);
		const userId = nanoid(12);

		db.insert(users).values({ id: userId, name, passwordHash, createdAt: new Date().toISOString() }).run();

		const payload = JSON.stringify({ userId, memberId: '', groupId: '' });
		setIdentityCookie(cookies, payload);

		if (redirectTo !== '/') redirect(303, redirectTo);
		redirect(303, '/account/groups');
	}
};
