import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFacebook } from '$lib/server/oauth.js';
import { generateState } from 'arctic';

export const GET: RequestHandler = ({ cookies, url }) => {
	const fb = getFacebook();
	if (!fb) throw error(503, 'Facebook login is not configured');

	const state = generateState();
	const authUrl = fb.createAuthorizationURL(state, ['public_profile']);

	cookies.set('fb_oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 10
	});

	// Preserve the post-auth redirect destination across the OAuth round-trip
	const redirectTo = url.searchParams.get('redirect') ?? '/';
	if (redirectTo !== '/') {
		cookies.set('fb_oauth_redirect', redirectTo, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 10
		});
	}

	redirect(302, authUrl.toString());
};
