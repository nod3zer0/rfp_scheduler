import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { mapPins, members } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { requireGroupPage } from '$lib/server/auth.js';

export const load: PageServerLoad = async ({ locals }) => {
	const group = requireGroupPage(locals);
	const isGroupOwner = locals.user && group.createdByUserId === locals.user.id;

	// Load all pins for this group
	const allPins = db
		.select({
			id: mapPins.id,
			memberId: mapPins.memberId,
			memberName: members.name,
			memberCustomColor: members.customColor,
			x: mapPins.x,
			y: mapPins.y,
			latitude: mapPins.latitude,
			longitude: mapPins.longitude,
			label: mapPins.label,
			note: mapPins.note,
			icon: mapPins.icon,
			color: mapPins.color,
			expiresAt: mapPins.expiresAt,
			createdAt: mapPins.createdAt
		})
		.from(mapPins)
		.innerJoin(members, eq(mapPins.memberId, members.id))
		.where(eq(mapPins.groupId, group.id))
		.all();

	// Filter out expired pins
	const now = new Date().toISOString();
	const activePins = allPins.filter((p) => !p.expiresAt || p.expiresAt > now);

	// Get all group members for filter
	const groupMembers = db
		.select({ id: members.id, name: members.name })
		.from(members)
		.where(eq(members.groupId, group.id))
		.all();

	return {
		pins: activePins,
		members: groupMembers,
		isGroupOwner
	};
};
