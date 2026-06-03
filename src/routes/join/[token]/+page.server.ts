import { setIdentityCookie } from '$lib/server/cookies.js';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { inviteLinks, groups, members } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

function validateToken(token: string) {
	const link = db.select().from(inviteLinks).where(eq(inviteLinks.id, token)).get();
	if (!link || !link.isActive) return null;
	if (link.expiresAt && new Date(link.expiresAt) < new Date()) return null;
	if (link.maxUses !== null && link.useCount >= link.maxUses) return null;
	return link;
}

export const load: PageServerLoad = ({ params, locals, cookies }) => {
	const link = validateToken(params.token);
	if (!link) throw error(410, 'This invite link is invalid or has expired');

	// Must be logged in to join
	if (!locals.user) {
		redirect(303, `/account/login?redirect=/join/${params.token}`);
	}

	const group = db.select().from(groups).where(eq(groups.id, link.groupId)).get();
	if (!group) throw error(404, 'Group not found');

	// Auto-join and redirect
	let member = db
		.select()
		.from(members)
		.where(and(eq(members.userId, locals.user.id), eq(members.groupId, link.groupId)))
		.get();

	if (!member) {
		const memberId = nanoid(10);
		db.insert(members)
			.values({ id: memberId, groupId: link.groupId, name: locals.user.name, userId: locals.user.id, createdAt: new Date().toISOString() })
			.run();
		db.update(inviteLinks).set({ useCount: link.useCount + 1 }).where(eq(inviteLinks.id, link.id)).run();
		member = db.select().from(members).where(eq(members.id, memberId)).get()!;
	}

	const payload = JSON.stringify({ userId: locals.user.id, memberId: member.id, groupId: link.groupId });
	setIdentityCookie(cookies, payload);
	redirect(303, '/');
};
