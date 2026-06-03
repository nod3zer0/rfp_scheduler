import { setIdentityCookie } from '$lib/server/cookies.js';
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
	const pendingRedirect = cookies.get('fb_oauth_redirect') ?? '/';
	cookies.delete('fb_oauth_redirect', { path: '/' });

	// Exchange code for tokens
	let facebookUserId: string;
	let facebookName: string;
	let facebookPictureUrl: string | null = null;
	try {
		const tokens = await fb.validateAuthorizationCode(code);
		const accessToken = tokens.accessToken();

		const profileRes = await fetch(
			`https://graph.facebook.com/me?fields=id,name,picture.type(large).width(400)&access_token=${accessToken}`
		);
		if (!profileRes.ok) throw new Error('Failed to fetch Facebook profile');
		const profile = await profileRes.json() as {
			id: string;
			name: string;
			picture?: { data: { url: string; is_silhouette: boolean } };
		};
		facebookUserId = profile.id;
		facebookName = profile.name;
		if (profile.picture?.data && !profile.picture.data.is_silhouette) {
			facebookPictureUrl = profile.picture.data.url;
		}
	} catch {
		throw error(400, 'Facebook authentication failed');
	}

	// Find existing user by facebookId
	const existingUser = db.select().from(users).where(eq(users.facebookId, facebookUserId)).get();

	let userId: string;
	if (existingUser) {
		userId = existingUser.id;
		// Refresh picture URL on every login in case it changed
		if (facebookPictureUrl) {
			db.update(users).set({ pictureUrl: facebookPictureUrl }).where(eq(users.id, userId)).run();
		}
	} else {
		// Store Facebook data in a short-lived cookie and redirect to name-confirm page
		const pending = JSON.stringify({ facebookId: facebookUserId, suggestedName: facebookName, pictureUrl: facebookPictureUrl });
		cookies.set('fb_pending', pending, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 10 // 10 minutes
		});
		const registerUrl = pendingRedirect !== '/'
			? `/account/register/facebook?redirect=${encodeURIComponent(pendingRedirect)}`
			: '/account/register/facebook';
		redirect(302, registerUrl);
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

	// If no group context, find first group they belong to
	if (!groupId) {
		const firstMember = db.select().from(members).where(eq(members.userId, userId)).get();
		if (firstMember) {
			const payload = JSON.stringify({ userId, memberId: firstMember.id, groupId: firstMember.groupId });
			setIdentityCookie(cookies, payload);
			redirect(302, pendingRedirect !== '/' ? pendingRedirect : '/');
		}
	}

	const payload = JSON.stringify({ userId, memberId, groupId });
	setIdentityCookie(cookies, payload);

	if (!groupId) redirect(302, pendingRedirect !== '/' ? pendingRedirect : '/account/groups');
	redirect(302, pendingRedirect !== '/' ? pendingRedirect : '/');
};
