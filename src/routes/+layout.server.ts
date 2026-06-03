import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { members, groups } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = ({ locals }) => {
	// For registered users, load all their group memberships for group switcher
	let myGroups: Array<{ groupId: string; groupName: string; memberId: string }> = [];
	if (locals.user) {
		const rows = db
			.select({ groupId: members.groupId, memberId: members.id, groupName: groups.name })
			.from(members)
			.innerJoin(groups, eq(members.groupId, groups.id))
			.where(eq(members.userId, locals.user.id))
			.all();
		myGroups = rows.map((r) => ({ groupId: r.groupId, groupName: r.groupName, memberId: r.memberId }));
	}

	return {
		member: locals.member,
		group: locals.group,
		user: locals.user
			? { id: locals.user.id, name: locals.user.name, pictureUrl: locals.user.pictureUrl ?? null }
			: null,
		myGroups,
		isGroupOwner: locals.group && locals.user ? locals.group.createdByUserId === locals.user.id : false
	};
};
