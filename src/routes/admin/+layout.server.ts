import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, url }) => {
	const adminCookie = cookies.get('rfp_admin');
	if (adminCookie !== '1' && url.pathname !== '/admin/login') {
		redirect(303, '/admin/login');
	}
	return {};
};
