import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { users, members } from '$lib/server/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/account/login?redirect=/account/settings');
	return { userName: locals.user.name };
};

export const actions: Actions = {
	changeName: async ({ request, locals, cookies }) => {
		if (!locals.user) redirect(303, '/account/login');

		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		if (!name) return fail(400, { nameError: 'Name is required' });
		if (name === locals.user.name) return fail(400, { nameError: 'That is already your name' });

		// Check uniqueness
		const taken = db.select().from(users).where(and(eq(users.name, name), ne(users.id, locals.user.id))).get();
		if (taken) return fail(400, { nameError: 'That name is taken by another account' });

		db.update(users).set({ name }).where(eq(users.id, locals.user.id)).run();
		// Also update all their member records
		db.update(members).set({ name }).where(eq(members.userId, locals.user.id)).run();

		return { nameSuccess: true };
	},

	changePassword: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/account/login');

		const form = await request.formData();
		const current = (form.get('current') as string) ?? '';
		const next = (form.get('password') as string) ?? '';
		const confirm = (form.get('confirm') as string) ?? '';

		if (!current) return fail(400, { pwError: 'Current password is required' });
		if (next.length < 6) return fail(400, { pwError: 'New password must be at least 6 characters' });
		if (next !== confirm) return fail(400, { pwError: 'Passwords do not match' });

		const user = db.select().from(users).where(eq(users.id, locals.user.id)).get();
		if (!user) return fail(400, { pwError: 'User not found' });

		if (!user.passwordHash) return fail(400, { pwError: 'Your account uses Facebook login and has no password yet.' });
		const ok = await bcrypt.compare(current, user.passwordHash);
		if (!ok) return fail(400, { pwError: 'Current password is incorrect' });

		const passwordHash = await bcrypt.hash(next, 10);
		db.update(users).set({ passwordHash }).where(eq(users.id, locals.user.id)).run();

		return { pwSuccess: true };
	}
};
