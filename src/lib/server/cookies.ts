import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

/**
 * Cookie options for the identity cookie.
 * Uses secure: false in dev (for local HTTP testing), secure: true in production (HTTPS).
 */
export function getIdentityCookieOptions() {
	return {
		path: '/',
		maxAge: 60 * 60 * 24 * 365, // 1 year
		sameSite: 'lax' as const,
		httpOnly: false,
		secure: !dev // true in production, false in development
	};
}

/**
 * Set the identity cookie with proper options for the environment.
 */
export function setIdentityCookie(cookies: Cookies, payload: string) {
	cookies.set('rfp_identity', payload, getIdentityCookieOptions());
}

/**
 * Clear the identity cookie.
 */
export function clearIdentityCookie(cookies: Cookies) {
	// Set to empty with maxAge: 0 for reliable deletion
	cookies.set('rfp_identity', '', { ...getIdentityCookieOptions(), maxAge: 0 });
	cookies.delete('rfp_identity', { path: '/' });
}
