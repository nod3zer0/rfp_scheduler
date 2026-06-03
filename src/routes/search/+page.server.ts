import { db } from '$lib/server/db.js';
import { schedule, picks, members } from '$lib/server/schema.js';
import { requireGroupPage } from '$lib/server/auth.js';
import { eq, and, inArray } from 'drizzle-orm';
import { DAY_LABELS, type Day } from '$lib/days.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireGroupPage(locals);

	const { member, group } = locals;
	if (!member || !group) throw new Error('No member or group');

	// Get all schedule entries
	const allSchedule = db.select().from(schedule).orderBy(schedule.day, schedule.timeStart).all();

	// Get my picks
	const myPicks = member.userId
		? db.select().from(picks).where(eq(picks.userId, member.userId)).all()
		: db.select().from(picks).where(eq(picks.memberId, member.id)).all();

	const myPickIds = new Set(myPicks.map((p) => p.scheduleId));

	// Get all picks for this group to show who else picked each band
	const groupMembers = db.select().from(members).where(eq(members.groupId, group.id)).all();
	const memberIds = groupMembers.map((m) => m.id);
	const userIds = groupMembers.filter((m) => m.userId).map((m) => m.userId!);

	const allPicks =
		memberIds.length > 0
			? db
					.select()
					.from(picks)
					.where(
						and(
							inArray(picks.scheduleId, allSchedule.map((s) => s.id)),
							userIds.length > 0
								? inArray(picks.userId, userIds)
								: inArray(picks.memberId, memberIds)
						)
					)
					.all()
			: [];

	// Build picks map
	const picksMap: Record<string, Array<{ id: string; name: string; customColor?: string | null }>> = {};
	for (const pick of allPicks) {
		const pickMember = groupMembers.find((m) =>
			pick.userId ? m.userId === pick.userId : m.id === pick.memberId
		);
		if (!pickMember) continue;
		if (!picksMap[pick.scheduleId]) picksMap[pick.scheduleId] = [];
		if (!picksMap[pick.scheduleId].some((p) => p.id === pickMember.id)) {
			picksMap[pick.scheduleId].push({ id: pickMember.id, name: pickMember.name, customColor: pickMember.customColor });
		}
	}

	return {
		allSchedule: allSchedule.map((s) => ({
			...s,
			dayLabel: DAY_LABELS[s.day as Day]
		})),
		myPickIds: Array.from(myPickIds),
		picksMap,
		currentMemberId: member.id
	};
};
