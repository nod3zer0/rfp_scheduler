import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies, locals }) => {
	// If user has a group membership, keep them as a guest in the group
	// but strip the userId so they're no longer authenticated
	const groupId = locals.group?.id ?? '';
	const memberId = locals.member?.id ?? '';

	if (groupId && memberId && !locals.member?.userId) {
		// Guest member - keep identity
		const payload = JSON.stringify({ memberId, groupId });
		cookies.set('rfp_identity', payload, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });
	} else {
		// Clear cookie entirely
		cookies.delete('rfp_identity', { path: '/' });
	}

	redirect(303, '/');
};
