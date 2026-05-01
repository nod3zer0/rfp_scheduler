import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createHmac } from 'crypto';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db.js';
import { users, members, picks } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

function base64urlDecode(str: string): Buffer {
	return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function parseSignedRequest(signedRequest: string, appSecret: string): { user_id: string } | null {
	const parts = signedRequest.split('.');
	if (parts.length !== 2) return null;
	const [encodedSig, payload] = parts;

	const expectedSig = createHmac('sha256', appSecret)
		.update(payload)
		.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');

	if (encodedSig !== expectedSig) return null;

	try {
		return JSON.parse(base64urlDecode(payload).toString('utf8'));
	} catch {
		return null;
	}
}

export const POST: RequestHandler = async ({ request, url }) => {
	const appSecret = env.FACEBOOK_APP_SECRET;
	if (!appSecret) throw error(503, 'Facebook login is not configured');

	const contentType = request.headers.get('content-type') ?? '';
	let signedRequest: string | null = null;

	if (contentType.includes('application/x-www-form-urlencoded')) {
		const form = await request.formData();
		signedRequest = form.get('signed_request') as string | null;
	} else {
		const body = await request.json().catch(() => ({})) as Record<string, string>;
		signedRequest = body.signed_request ?? null;
	}

	if (!signedRequest) throw error(400, 'signed_request missing');

	const data = parseSignedRequest(signedRequest, appSecret);
	if (!data?.user_id) throw error(400, 'Invalid signed_request');

	const facebookUserId = data.user_id;

	// Find user by Facebook ID
	const user = db.select().from(users).where(eq(users.facebookId, facebookUserId)).get();

	// Generate a confirmation code regardless so Facebook gets a valid response
	const confirmationCode = nanoid(16);

	if (user) {
		// Delete picks (via cascade when members are deleted, but also direct userId picks)
		db.delete(picks).where(eq(picks.userId, user.id)).run();
		// Delete members (picks cascade)
		db.delete(members).where(eq(members.userId, user.id)).run();
		// Delete user account
		db.delete(users).where(eq(users.id, user.id)).run();
	}

	const origin = (env.ORIGIN ?? url.origin).replace(/\/$/, '');

	// Facebook expects this exact shape
	return json({
		url: `${origin}/deletion-status?code=${confirmationCode}`,
		confirmation_code: confirmationCode
	});
};
