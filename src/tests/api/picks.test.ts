import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '$lib/server/db.test-helpers.js';
import { groups, members, users, schedule, picks } from '$lib/server/schema.js';
import type { Member } from '$lib/server/schema.js';

let testDb: ReturnType<typeof createTestDb>['db'];
vi.mock('$lib/server/db.js', () => ({ get db() { return testDb; } }));

const { POST } = await import('../../routes/api/picks/+server.js');

const NOW = new Date().toISOString();

function makeRequest(body: unknown) {
	return new Request('http://localhost/api/picks', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeLocals(overrides: Partial<App.Locals> = {}): App.Locals {
	return { member: null, group: null, user: null, ...overrides };
}

describe('POST /api/picks', () => {
	let member: Member;

	beforeEach(() => {
		const { db } = createTestDb();
		testDb = db;

		db.insert(groups).values({ id: 'g1', name: 'G', createdAt: NOW }).run();
		db.insert(members).values({ id: 'm1', groupId: 'g1', name: 'Alice', userId: null, createdAt: NOW }).run();
		db.insert(schedule).values({ id: 's1', band: 'Band A', day: 'wednesday', stage: 'Main', date: '2026-06-10', timeStart: '14:00', timeEnd: '15:00', updatedAt: NOW }).run();

		member = db.select().from(members).get()!;
	});

	it('throws 401 when no member in locals', async () => {
		await expect(
			POST({ request: makeRequest({ scheduleId: 's1' }), locals: makeLocals() } as never)
		).rejects.toMatchObject({ status: 401 });
	});

	it('creates a pick and returns { picked: true }', async () => {
		const res = await POST({
			request: makeRequest({ scheduleId: 's1' }),
			locals: makeLocals({ member })
		} as never);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({ picked: true });
	});

	it('toggles off an existing pick — returns { picked: false }', async () => {
		const locals = makeLocals({ member });
		await POST({ request: makeRequest({ scheduleId: 's1' }), locals } as never);
		const res = await POST({ request: makeRequest({ scheduleId: 's1' }), locals } as never);
		const data = await res.json();
		expect(data).toEqual({ picked: false });
	});

	it('stores userId for a registered user pick', async () => {
		testDb.insert(users).values({ id: 'u1', name: 'Alice', createdAt: NOW }).run();
		const user = testDb.select().from(users).get()!;

		await POST({ request: makeRequest({ scheduleId: 's1' }), locals: makeLocals({ member, user }) } as never);

		const pick = testDb.select().from(picks).get();
		expect(pick?.userId).toBe('u1');
	});

	it('throws 400 when scheduleId is missing', async () => {
		await expect(
			POST({ request: makeRequest({}), locals: makeLocals({ member }) } as never)
		).rejects.toMatchObject({ status: 400 });
	});
});
