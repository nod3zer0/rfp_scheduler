import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '$lib/server/db.test-helpers.js';
import { groups, members, groupEvents } from '$lib/server/schema.js';
import type { Group, Member } from '$lib/server/schema.js';

let testDb: ReturnType<typeof createTestDb>['db'];
vi.mock('$lib/server/db.js', () => ({ get db() { return testDb; } }));

const { POST } = await import('../../routes/api/group-events/[id]/attend/+server.js');

const NOW = new Date().toISOString();

function makeLocals(member: Member | null, group: Group | null): App.Locals {
	return { member, group, user: null };
}

function call(params: { id: string }, member: Member | null, group: Group | null) {
	return POST({
		request: new Request('http://localhost/', { method: 'POST' }),
		params,
		locals: makeLocals(member, group)
	} as never);
}

describe('POST /api/group-events/[id]/attend', () => {
	let group: Group;
	let member: Member;

	beforeEach(() => {
		const { db } = createTestDb();
		testDb = db;

		db.insert(groups).values({ id: 'g1', name: 'G', createdAt: NOW }).run();
		db.insert(members).values({ id: 'm1', groupId: 'g1', name: 'Alice', userId: null, createdAt: NOW }).run();
		db.insert(groupEvents).values({ id: 'e1', groupId: 'g1', title: 'Lunch', day: 'wednesday', date: '2026-06-10', timeStart: '12:00', createdAt: NOW }).run();

		group = db.select().from(groups).get()!;
		member = db.select().from(members).get()!;
	});

	it('throws 401 when not authenticated', () => {
		expect(() => call({ id: 'e1' }, null, null)).toThrow(
			expect.objectContaining({ status: 401 })
		);
	});

	it('throws 404 for an event in a different group', () => {
		const otherGroup: Group = { id: 'g2', name: 'Other', createdByUserId: null, createdAt: NOW };
		expect(() => call({ id: 'e1' }, member, otherGroup)).toThrow(
			expect.objectContaining({ status: 404 })
		);
	});

	it('joins the event — returns { attending: true }', async () => {
		const res = await call({ id: 'e1' }, member, group);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({ attending: true });
	});

	it('leaves the event on second call — returns { attending: false }', async () => {
		await call({ id: 'e1' }, member, group);
		const res = await call({ id: 'e1' }, member, group);
		const data = await res.json();
		expect(data).toEqual({ attending: false });
	});

	it('toggle is idempotent across join/leave/join cycles', async () => {
		const states: boolean[] = [];
		for (let i = 0; i < 4; i++) {
			const res = await call({ id: 'e1' }, member, group);
			const data = await res.json();
			states.push(data.attending);
		}
		expect(states).toEqual([true, false, true, false]);
	});
});
