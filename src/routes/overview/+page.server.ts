import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { schedule, members, groupEvents, groupEventAttendees } from '$lib/server/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { DAYS, DAY_LABELS, DAY_DATES, getCurrentDay, type Day } from '$lib/days.js';
import { getMyPickIds, buildPicksMap } from '$lib/server/picksHelper.js';
import { timeToMinutes } from '$lib/time.js';
import { requireGroupPage } from '$lib/server/auth.js';

export const load: PageServerLoad = ({ locals, url }) => {
	const group = requireGroupPage(locals);

	const dayParam = url.searchParams.get('day') as Day | null;
	const day = dayParam && DAYS.includes(dayParam) ? dayParam : getCurrentDay();

	const groupMembers = db
		.select()
		.from(members)
		.where(eq(members.groupId, group.id))
		.all();

	const memberIds = groupMembers.map((m) => m.id);

	// All picks for this day across all group members
	const daySchedule = db.select().from(schedule).where(eq(schedule.day, day)).all();
	const scheduleIds = daySchedule.map((s) => s.id);

	type BandEntry = {
		id: string;
		band: string;
		stage: string;
		timeStart: string;
		timeEnd: string;
		pickers: Array<{ id: string; name: string }>;
		isMyPick: boolean;
	};

	let bandEntries: BandEntry[] = [];

	if (scheduleIds.length > 0 && memberIds.length > 0) {
		const picksBySchedule = buildPicksMap(scheduleIds, groupMembers);
		const myPickIds = new Set(locals.member ? getMyPickIds(locals.member.id, locals.user?.id) : []);

		for (const s of daySchedule) {
			const pickers = picksBySchedule[s.id];
			if (!pickers || pickers.length === 0) continue;
			bandEntries.push({
				id: s.id,
				band: s.band,
				stage: s.stage,
				timeStart: s.timeStart,
				timeEnd: s.timeEnd,
				pickers,
				isMyPick: myPickIds.has(s.id)
			});
		}

		bandEntries.sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart));
	}

	// Group events for this day + attendees
	const rawEvents = db
		.select()
		.from(groupEvents)
		.where(and(eq(groupEvents.groupId, group.id), eq(groupEvents.day, day)))
		.all();

	const eventIds = rawEvents.map((e) => e.id);
	const allAttendees = eventIds.length > 0
		? db.select().from(groupEventAttendees).where(inArray(groupEventAttendees.eventId, eventIds)).all()
		: [];

	const dayEvents = rawEvents
		.sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart))
		.map((e) => {
			const attendeeIds = allAttendees.filter((a) => a.eventId === e.id).map((a) => a.memberId);
			return {
				id: e.id,
				title: e.title,
				description: e.description,
				timeStart: e.timeStart,
				timeEnd: e.timeEnd,
				createdByMemberId: e.createdByMemberId,
				createdByName: groupMembers.find((m) => m.id === e.createdByMemberId)?.name ?? null,
				attendees: groupMembers
					.filter((m) => attendeeIds.includes(m.id))
					.map((m) => ({ id: m.id, name: m.name })),
				iAmAttending: locals.member ? attendeeIds.includes(locals.member.id) : false
			};
		});

	return {
		day,
		days: DAYS.map((d) => ({ key: d, label: DAY_LABELS[d] })),
		bandEntries,
		events: dayEvents,
		members: groupMembers.map((m) => ({ id: m.id, name: m.name })),
		currentMemberId: locals.member?.id ?? null,
		groupName: group.name
	};
};
