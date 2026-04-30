import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/account/login?redirect=/account/groups');
	// myGroups comes from the layout load
	return {};
};
