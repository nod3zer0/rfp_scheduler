import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db.js';
import { members, schedule } from '$lib/server/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { DAYS, DAY_LABELS, type Day } from '$lib/days.js';
import { getMyPickIds } from '$lib/server/picksHelper.js';
import { timeToMinutes } from '$lib/time.js';
import { requireGroupPage } from '$lib/server/auth.js';

export const load: PageServerLoad = ({ params, locals }) => {
	const group = requireGroupPage(locals);

	const member = db.select().from(members).where(eq(members.id, params.id)).get();
	if (!member || member.groupId !== group.id) throw error(404, 'Member not found');

	// Use userId if the friend is a registered user (so we see picks across all their groups)
	const pickIds = getMyPickIds(member.id, member.userId ?? null);

	let pickedSchedule: typeof schedule.$inferSelect[] = [];
	if (pickIds.length > 0) {
		pickedSchedule = db.select().from(schedule).where(inArray(schedule.id, pickIds)).all();
	}

	type PickEntry = {
		id: string;
		band: string;
		stage: string;
		timeStart: string;
		timeEnd: string;
		day: Day;
		date: string;
	};

	const byDay = DAYS.reduce<Record<Day, PickEntry[]>>((acc, d) => {
		acc[d] = [];
		return acc;
	}, {} as Record<Day, PickEntry[]>);

	for (const s of pickedSchedule) {
		const d = s.day as Day;
		if (byDay[d]) {
			byDay[d].push({
				id: s.id,
				band: s.band,
				stage: s.stage,
				timeStart: s.timeStart,
				timeEnd: s.timeEnd,
				day: d,
				date: s.date
			});
		}
	}

	for (const d of DAYS) {
		byDay[d].sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart));
	}

	const daysWithPicks = DAYS.filter((d) => byDay[d].length > 0);

	// Current user's own picks (for toggle state) — also shared via userId
	const myPickIds: string[] = locals.member ? getMyPickIds(locals.member.id, locals.user?.id) : [];

	return {
		friend: { id: member.id, name: member.name },
		isSelf: locals.member?.id === member.id,
		currentMemberId: locals.member?.id ?? null,
		byDay,
		daysWithPicks,
		dayLabels: DAY_LABELS,
		totalPicks: pickIds.length,
		myPickIds
	};
};
