import { Facebook } from 'arctic';
import { env } from '$env/dynamic/private';

function getOrigin(): string {
	return (env.ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
}

export function getFacebook(): Facebook | null {
	const id = env.FACEBOOK_APP_ID;
	const secret = env.FACEBOOK_APP_SECRET;
	if (!id || !secret) return null;
	return new Facebook(id, secret, `${getOrigin()}/account/login/facebook/callback`);
}

/** Returns true when Facebook OAuth credentials are configured. */
export function isFacebookEnabled(): boolean {
	return !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);
}
