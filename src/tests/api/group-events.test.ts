import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '$lib/server/db.test-helpers.js';
import { groups, members } from '$lib/server/schema.js';
import type { Group, Member } from '$lib/server/schema.js';

let testDb: ReturnType<typeof createTestDb>['db'];
vi.mock('$lib/server/db.js', () => ({ get db() { return testDb; } }));

const { POST } = await import('../../routes/api/group-events/+server.js');

const NOW = new Date().toISOString();

function makeRequest(body: unknown) {
	return new Request('http://localhost/api/group-events', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeLocals(member: Member | null, group: Group | null): App.Locals {
	return { member, group, user: null };
}

describe('POST /api/group-events', () => {
	let group: Group;
	let member: Member;

	beforeEach(() => {
		const { db } = createTestDb();
		testDb = db;

		db.insert(groups).values({ id: 'g1', name: 'G', adminPasswordHash: 'h', createdAt: NOW }).run();
		db.insert(members).values({ id: 'm1', groupId: 'g1', name: 'Alice', userId: null, createdAt: NOW }).run();

		group = db.select().from(groups).get()!;
		member = db.select().from(members).get()!;
	});

	it('throws 401 when not authenticated', async () => {
		await expect(
			POST({ request: makeRequest({ title: 'Lunch', day: 'wednesday', timeStart: '12:00' }), locals: makeLocals(null, null) } as never)
		).rejects.toMatchObject({ status: 401 });
	});

	it('creates a group event and returns it', async () => {
		const res = await POST({
			request: makeRequest({ title: 'Group Lunch', day: 'wednesday', timeStart: '12:00', timeEnd: '13:00', description: 'Eat together' }),
			locals: makeLocals(member, group)
		} as never);

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.title).toBe('Group Lunch');
		expect(data.day).toBe('wednesday');
		expect(data.timeStart).toBe('12:00');
		expect(data.groupId).toBe('g1');
		expect(data.createdByMemberId).toBe('m1');
	});

	it('throws 400 when title is missing', async () => {
		await expect(
			POST({ request: makeRequest({ day: 'wednesday', timeStart: '12:00' }), locals: makeLocals(member, group) } as never)
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when timeStart is missing', async () => {
		await expect(
			POST({ request: makeRequest({ title: 'Lunch', day: 'wednesday' }), locals: makeLocals(member, group) } as never)
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 when day is invalid', async () => {
		await expect(
			POST({ request: makeRequest({ title: 'Lunch', day: 'monday', timeStart: '12:00' }), locals: makeLocals(member, group) } as never)
		).rejects.toMatchObject({ status: 400 });
	});
});
