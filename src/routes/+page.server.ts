import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { schedule, members, groupEvents, groupEventAttendees } from '$lib/server/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { DAYS, DAY_LABELS, getCurrentDay, type Day } from '$lib/days.js';
import { timeToMinutes } from '$lib/time.js';
import { env } from '$env/dynamic/private';
import { getMyPickIds, buildPicksMap } from '$lib/server/picksHelper.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Redirect unauthenticated or group-less visitors
	if (!locals.group) {
		if (locals.user) redirect(303, '/account/groups');
		else redirect(303, '/account/login');
	}

	const dayParam = url.searchParams.get('day') as Day | null;
	const memberFilter = url.searchParams.get('member') ?? null;

	const day = dayParam && DAYS.includes(dayParam) ? dayParam : getCurrentDay();

	const daySchedule = db.select().from(schedule).where(eq(schedule.day, day)).all();

	// Load group members (needed for picksMap and dayEvents)
	const groupMembers = db.select().from(members).where(eq(members.groupId, locals.group.id)).all();
	const scheduleIds = daySchedule.map((s) => s.id);

	// picksMap: who in this group picked each band (registered users share across groups via userId)
	const picksMap = buildPicksMap(scheduleIds, groupMembers);

	// My pick IDs (all days, for toggling state)
	const myPickIds: string[] = locals.member
		? getMyPickIds(locals.member.id, locals.user?.id)
		: [];

	// Today's my picks (for NowPlaying strip)
	let myTodayPicks: Array<{ id: string; band: string; stage: string; timeStart: string; timeEnd: string; date: string; day: string }> = [];
	let todayPicksMap: Record<string, Array<{ id: string; name: string }>> = {};
	if (locals.member && myPickIds.length > 0) {
		const todayDay = getCurrentDay();
		const todaySchedule = db.select().from(schedule).where(eq(schedule.day, todayDay)).all().filter((s) => myPickIds.includes(s.id));
		myTodayPicks = todaySchedule.map((s) => ({ id: s.id, band: s.band, stage: s.stage, timeStart: s.timeStart, timeEnd: s.timeEnd, date: s.date, day: s.day }));
		// Build a picks map for today (who else is attending each band) for NowPlaying
		const todayIds = todaySchedule.map((s) => s.id);
		todayPicksMap = buildPicksMap(todayIds, groupMembers);
	}

	// Today's group events for NowPlaying strip (always today, time-aware) — only during the festival
	let myTodayEvents: Array<{ id: string; title: string; timeStart: string; timeEnd: string | null; day: string }> = [];
	// Selected day's group events (with attendees) to show on the main page
	type DayEvent = {
		id: string;
		title: string;
		description: string | null;
		timeStart: string;
		timeEnd: string | null;
		day: string;
		createdByMemberId: string | null;
		attendees: Array<{ id: string; name: string }>;
		iAmAttending: boolean;
	};
	let dayEvents: DayEvent[] = [];

	if (locals.group) {
		const todayDay = getCurrentDay();

		// NowPlaying events (always today)
		myTodayEvents = db
			.select()
			.from(groupEvents)
			.where(and(eq(groupEvents.groupId, locals.group.id), eq(groupEvents.day, todayDay)))
			.all()
			.map((e) => ({ id: e.id, title: e.title, timeStart: e.timeStart, timeEnd: e.timeEnd, day: e.day }));

		// Selected day group events with attendees (groupMembers already loaded above)

		const rawDayEvents = db
			.select()
			.from(groupEvents)
			.where(and(eq(groupEvents.groupId, locals.group.id), eq(groupEvents.day, day)))
			.all();

		if (rawDayEvents.length > 0) {
			const eventIds = rawDayEvents.map((e) => e.id);
			const allAttendees = db
				.select()
				.from(groupEventAttendees)
				.where(inArray(groupEventAttendees.eventId, eventIds))
				.all();

		dayEvents = rawDayEvents
			.sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart))
				.map((e) => {
					const attendeeIds = allAttendees.filter((a) => a.eventId === e.id).map((a) => a.memberId);
				return {
					id: e.id,
					title: e.title,
					description: e.description,
					timeStart: e.timeStart,
					timeEnd: e.timeEnd,
					day: e.day,
					createdByMemberId: e.createdByMemberId,
						attendees: groupMembers
							.filter((m) => attendeeIds.includes(m.id))
							.map((m) => ({ id: m.id, name: m.name })),
						iAmAttending: locals.member ? attendeeIds.includes(locals.member.id) : false
					};
				});
		}
	}

	return {
		day,
		days: DAYS.map((d) => ({ key: d, label: DAY_LABELS[d] })),
		schedule: daySchedule,
		picksMap,
		myPickIds,
		myTodayPicks,
		myTodayEvents,
		todayPicksMap,
		dayEvents,
		memberFilter,
		groupMembers: groupMembers.map((m) => ({ id: m.id, name: m.name })),
		currentMemberId: locals.member?.id ?? null,
		facebookEnabled: !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET)
	};
};
