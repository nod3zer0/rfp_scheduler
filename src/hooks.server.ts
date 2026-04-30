import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { members, groups, users } from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { startCron } from '$lib/server/cron.js';

startCron();

// Cookie shape: { userId?, memberId?, groupId? }
type IdentityCookie = {
	userId?: string;
	memberId?: string;
	groupId?: string;
};

export const handle: Handle = async ({ event, resolve }) => {
	const identityCookie = event.cookies.get('rfp_identity');

	event.locals.user = null;
	event.locals.member = null;
	event.locals.group = null;

	if (identityCookie) {
		try {
			const identity = JSON.parse(decodeURIComponent(identityCookie)) as IdentityCookie;

			if (identity.userId) {
				// Registered user path
				const user = db.select().from(users).where(eq(users.id, identity.userId)).get();
				if (user) {
					event.locals.user = user;

					if (identity.groupId) {
						const group = db.select().from(groups).where(eq(groups.id, identity.groupId)).get();
						if (group) {
							event.locals.group = group;
							// Find their member record in this group
							const member = db
								.select()
								.from(members)
								.where(and(eq(members.userId, identity.userId), eq(members.groupId, identity.groupId)))
								.get();
							event.locals.member = member ?? null;
						}
					}
				}
			} else if (identity.memberId && identity.groupId) {
				// Guest path (legacy / unregistered)
				const member = db.select().from(members).where(eq(members.id, identity.memberId)).get();
				if (member && member.groupId === identity.groupId && !member.userId) {
					// Only allow guest access to members that are NOT registered
					const group = db.select().from(groups).where(eq(groups.id, identity.groupId)).get();
					event.locals.member = member ?? null;
					event.locals.group = group ?? null;
				}
			}
		} catch {
			// invalid cookie, ignore
		}
	}

	return resolve(event);
};
