import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
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

	const group = db.select().from(groups).where(eq(groups.id, link.groupId)).get();
	if (!group) throw error(404, 'Group not found');

	// ── Auto-join for registered users ─────────────────────────────
	if (locals.user) {
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
		cookies.set('rfp_identity', payload, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });
		redirect(303, '/');
	}

	// ── Guest flow ──────────────────────────────────────────────────
	const existingMembers = db
		.select({ id: members.id, name: members.name, userId: members.userId })
		.from(members)
		.where(eq(members.groupId, link.groupId))
		.all()
		.map((m) => ({ id: m.id, name: m.name, isRegistered: !!m.userId }));

	return {
		group: { id: group.id, name: group.name, allowGuests: group.allowGuests },
		existingMembers,
		loggedInAs: null
	};
};

export const actions: Actions = {
	default: async ({ params, request, cookies, locals }) => {
		const link = validateToken(params.token);
		if (!link) throw error(410, 'This invite link is invalid or has expired');

		const form = await request.formData();
		const name = (form.get('name') as string)?.trim();
		if (!name) return fail(400, { error: 'Name is required' });

		const group = db.select().from(groups).where(eq(groups.id, link.groupId)).get();
		if (!group) throw error(404, 'Group not found');

		// Check if guests are allowed
		if (!group.allowGuests && !locals.user) {
			return fail(403, { error: 'This group requires a registered account to join. Please sign in or register first.' });
		}

		const existing = db
			.select()
			.from(members)
			.where(eq(members.groupId, link.groupId))
			.all()
			.find((m) => m.name.toLowerCase() === name.toLowerCase());

		if (existing?.userId) {
			return fail(403, { error: `"${name}" is a registered account. Sign in first to join as that person.` });
		}

		let memberId: string;
		if (existing) {
			memberId = existing.id;
		} else {
			memberId = nanoid(10);
			db.insert(members)
				.values({ id: memberId, groupId: link.groupId, name, userId: null, createdAt: new Date().toISOString() })
				.run();
		}

		db.update(inviteLinks).set({ useCount: link.useCount + 1 }).where(eq(inviteLinks.id, link.id)).run();

		const payload = JSON.stringify({ memberId, groupId: link.groupId });
		cookies.set('rfp_identity', payload, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false });
		redirect(303, '/');
	}
};
