import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFacebook } from '$lib/server/oauth.js';
import { generateState } from 'arctic';

export const GET: RequestHandler = ({ cookies }) => {
	const fb = getFacebook();
	if (!fb) throw error(503, 'Facebook login is not configured');

	const state = generateState();
	const url = fb.createAuthorizationURL(state, ['public_profile']);

	cookies.set('fb_oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes
	});

	redirect(302, url.toString());
};
