import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies }) => {
	if (cookies.get('rfp_admin') === '1') {
		redirect(303, '/admin');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const password = form.get('password') as string;
		const adminPassword = env.ADMIN_PASSWORD;

		if (!adminPassword) {
			return fail(500, { error: 'ADMIN_PASSWORD is not set in environment' });
		}

		if (password !== adminPassword) {
			return fail(403, { error: 'Wrong password' });
		}

		cookies.set('rfp_admin', '1', {
			path: '/',
			maxAge: 60 * 60 * 12,
			sameSite: 'lax',
			httpOnly: true
		});

		redirect(303, '/admin');
	}
};
