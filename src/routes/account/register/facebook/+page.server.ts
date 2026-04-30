import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { users, members } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const load: PageServerLoad = ({ cookies }) => {
	const raw = cookies.get('fb_pending');
	if (!raw) redirect(303, '/account/login');

	const pending = JSON.parse(raw) as { facebookId: string; suggestedName: string };
	return { suggestedName: pending.suggestedName };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const raw = cookies.get('fb_pending');
		if (!raw) throw error(400, 'Session expired. Please try signing in with Facebook again.');

		const pending = JSON.parse(raw) as { facebookId: string; suggestedName: string };
		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		if (!name) return fail(400, { error: 'Name is required' });

		// Check name uniqueness
		const taken = db.select().from(users).where(eq(users.name, name)).get();
		if (taken) return fail(400, { error: 'That name is taken. Please choose a different one.' });

		const userId = nanoid(12);
		db.insert(users)
			.values({ id: userId, name, facebookId: pending.facebookId, passwordHash: null, createdAt: new Date().toISOString() })
			.run();

		cookies.delete('fb_pending', { path: '/' });

		// Link current guest member if present
		if (locals.member && !locals.member.userId) {
			db.update(members).set({ userId, name }).where(eq(members.id, locals.member.id)).run();
		}

		const groupId = locals.group?.id ?? '';
		const memberId = locals.member?.id ?? '';
		const payload = JSON.stringify({ userId, memberId, groupId });
		cookies.set('rfp_identity', payload, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });

		if (!groupId) redirect(303, '/account/groups');
		redirect(303, '/');
	}
};
