import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFacebook } from '$lib/server/oauth.js';
import { db } from '$lib/server/db.js';
import { users, members } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const fb = getFacebook();
	if (!fb) throw error(503, 'Facebook login is not configured');

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('fb_oauth_state');

	if (!code || !state || state !== storedState) throw error(400, 'Invalid OAuth state');

	cookies.delete('fb_oauth_state', { path: '/' });

	// Exchange code for tokens
	let facebookUserId: string;
	let facebookName: string;
	try {
		const tokens = await fb.validateAuthorizationCode(code);
		const accessToken = tokens.accessToken();

		const profileRes = await fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`);
		if (!profileRes.ok) throw new Error('Failed to fetch Facebook profile');
		const profile = await profileRes.json() as { id: string; name: string };
		facebookUserId = profile.id;
		facebookName = profile.name;
	} catch {
		throw error(400, 'Facebook authentication failed');
	}

	// Find existing user by facebookId
	const existingUser = db.select().from(users).where(eq(users.facebookId, facebookUserId)).get();

	let userId: string;
	if (existingUser) {
		userId = existingUser.id;
	} else {
		// Store Facebook data in a short-lived cookie and redirect to name-confirm page
		const pending = JSON.stringify({ facebookId: facebookUserId, suggestedName: facebookName });
		cookies.set('fb_pending', pending, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 10 // 10 minutes
		});
		redirect(302, '/account/register/facebook');
	}

	// Log in existing user
	const groupId = locals.group?.id ?? '';
	let memberId = '';
	if (groupId) {
		const member = db
			.select()
			.from(members)
			.where(and(eq(members.userId, userId), eq(members.groupId, groupId)))
			.get();
		memberId = member?.id ?? '';
	}

	// If no group, find first group they belong to
	if (!groupId) {
		const firstMember = db.select().from(members).where(eq(members.userId, userId)).get();
		if (firstMember) {
			const payload = JSON.stringify({ userId, memberId: firstMember.id, groupId: firstMember.groupId });
			cookies.set('rfp_identity', payload, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });
			redirect(302, '/');
		}
	}

	const payload = JSON.stringify({ userId, memberId, groupId });
	cookies.set('rfp_identity', payload, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });

	// Redirect to groups page if no group context
	if (!groupId) redirect(302, '/account/groups');
	redirect(302, '/');
};
