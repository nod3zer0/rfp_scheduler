import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { users, members } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { env } from '$env/dynamic/private';
import { setIdentityCookie } from '$lib/server/cookies.js';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, '/');
	return {
		redirectTo: url.searchParams.get('redirect') ?? '/',
		facebookEnabled: !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET)
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		const password = (form.get('password') as string) ?? '';
		const redirectTo = (form.get('redirect') as string) || '/';

		if (!name || !password) return fail(400, { error: 'Name and password are required', name });

		const user = db.select().from(users).where(eq(users.name, name)).get();
		if (!user || !user.passwordHash) return fail(400, { error: 'Invalid name or password', name });

		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return fail(400, { error: 'Invalid name or password', name });

		// Find their member record in the current group context (if any)
		const groupId = locals.group?.id ?? '';
		let memberId = '';
		if (groupId) {
			const member = db
				.select()
				.from(members)
				.where(and(eq(members.userId, user.id), eq(members.groupId, groupId)))
				.get();
			memberId = member?.id ?? '';
		}

		// Check if the user belongs to any group
		const anyMember = db.select().from(members).where(eq(members.userId, user.id)).get();

		const payload = JSON.stringify({ userId: user.id, memberId, groupId });
		setIdentityCookie(cookies, payload);

		// If user has no group context at all, send them to group selection/creation
		if (!anyMember) redirect(303, '/account/groups');

		// If they came from a specific page, honour it; otherwise go to groups if no active group
		if (redirectTo !== '/' || groupId) redirect(303, redirectTo);
		redirect(303, '/account/groups');
	}
};
