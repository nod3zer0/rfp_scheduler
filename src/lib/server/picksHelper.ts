import { db } from './db.js';
import { picks, members } from './schema.js';
import { eq, and, inArray, or } from 'drizzle-orm';

/**
 * Returns the set of scheduleIds that the given member/user has picked.
 * For registered users (userId set), finds picks across ALL their group memberships.
 * For guests, finds picks only for their memberId.
 */
export function getMyPickIds(memberId: string, userId: string | null | undefined): string[] {
	if (userId) {
		return db
			.select({ scheduleId: picks.scheduleId })
			.from(picks)
			.where(eq(picks.userId, userId))
			.all()
			.map((p) => p.scheduleId);
	}
	return db
		.select({ scheduleId: picks.scheduleId })
		.from(picks)
		.where(eq(picks.memberId, memberId))
		.all()
		.map((p) => p.scheduleId);
}

/**
 * Builds a picksMap for a set of schedule IDs and group members.
 * For registered members, aggregates by userId so picks from any group are included.
 * Returns: Record<scheduleId, Array<{id: memberId, name, customColor}>>
 */
export function buildPicksMap(
	scheduleIds: string[],
	groupMembers: Array<{ id: string; name: string; userId: string | null; customColor?: string | null }>
): Record<string, Array<{ id: string; name: string; customColor?: string | null }>> {
	if (scheduleIds.length === 0 || groupMembers.length === 0) return {};

	const memberIds = groupMembers.map((m) => m.id);
	const userIds = groupMembers.map((m) => m.userId).filter(Boolean) as string[];

	// Fetch all relevant picks: by memberId (guests) OR by userId (registered)
	const allPicks = db
		.select({ memberId: picks.memberId, userId: picks.userId, scheduleId: picks.scheduleId })
		.from(picks)
		.where(
			and(
				inArray(picks.scheduleId, scheduleIds),
				userIds.length > 0
					? or(inArray(picks.memberId, memberIds), inArray(picks.userId, userIds))
					: inArray(picks.memberId, memberIds)
			)
		)
		.all();

	const result: Record<string, Array<{ id: string; name: string; customColor?: string | null }>> = {};

	for (const pick of allPicks) {
		// Find which group member this pick belongs to:
		// - if pick has userId, find the member in this group with that userId
		// - otherwise match by memberId
		const member = pick.userId
			? groupMembers.find((m) => m.userId === pick.userId)
			: groupMembers.find((m) => m.id === pick.memberId);
		if (!member) continue;

		if (!result[pick.scheduleId]) result[pick.scheduleId] = [];
		// Avoid duplicates (same member via multiple paths)
		if (!result[pick.scheduleId].some((e) => e.id === member.id)) {
			result[pick.scheduleId].push({ id: member.id, name: member.name, customColor: member.customColor });
		}
	}

	return result;
}
