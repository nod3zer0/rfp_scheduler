import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setIdentityCookie, clearIdentityCookie } from '$lib/server/cookies.js';

export const POST: RequestHandler = ({ cookies, locals }) => {
	// If user has a group membership, keep them as a guest in the group
	// but strip the userId so they're no longer authenticated
	const groupId = locals.group?.id ?? '';
	const memberId = locals.member?.id ?? '';

	if (groupId && memberId && !locals.member?.userId) {
		// Guest member - keep identity
		const payload = JSON.stringify({ memberId, groupId });
		setIdentityCookie(cookies, payload);
	} else {
		// Clear cookie entirely
		clearIdentityCookie(cookies);
	}

	redirect(303, '/');
};
