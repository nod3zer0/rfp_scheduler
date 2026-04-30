import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from '$lib/server/db.test-helpers.js';
import { groups, members, users } from '$lib/server/schema.js';
import type { User } from '$lib/server/schema.js';

let testDb: ReturnType<typeof createTestDb>['db'];
vi.mock('$lib/server/db.js', () => ({ get db() { return testDb; } }));

const { POST } = await import('../../routes/api/identity/+server.js');

const NOW = new Date().toISOString();

function makeRequest(body: unknown) {
	return new Request('http://localhost/api/identity', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

const mockCookies = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };

function makeLocals(overrides: Partial<App.Locals> = {}): App.Locals {
	return { member: null, group: null, user: null, ...overrides };
}

describe('POST /api/identity', () => {
	beforeEach(() => {
		const { db } = createTestDb();
		testDb = db;
		vi.clearAllMocks();
		db.insert(groups).values({ id: 'g1', name: 'G', adminPasswordHash: 'h', createdAt: NOW }).run();
	});

	it('creates a new member and sets cookie', async () => {
		const res = await POST({
			request: makeRequest({ name: 'Alice', groupId: 'g1' }),
			locals: makeLocals(),
			cookies: mockCookies
		} as never);

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.groupId).toBe('g1');
		expect(typeof data.memberId).toBe('string');
		expect(mockCookies.set).toHaveBeenCalledOnce();
	});

	it('reuses an existing unregistered member by name', async () => {
		const res1 = await POST({ request: makeRequest({ name: 'Bob', groupId: 'g1' }), locals: makeLocals(), cookies: mockCookies } as never);
		const { memberId: id1 } = await res1.json();

		const res2 = await POST({ request: makeRequest({ name: 'Bob', groupId: 'g1' }), locals: makeLocals(), cookies: mockCookies } as never);
		const { memberId: id2 } = await res2.json();

		expect(id1).toBe(id2);
	});

	it('throws 403 when claiming a registered member from a different user', async () => {
		testDb.insert(users).values({ id: 'u1', name: 'Alice', createdAt: NOW }).run();
		testDb.insert(members).values({ id: 'm1', groupId: 'g1', name: 'Alice', userId: 'u1', createdAt: NOW }).run();

		const otherUser: User = { id: 'u2', name: 'Other', passwordHash: null, facebookId: null, createdAt: NOW };

		await expect(
			POST({ request: makeRequest({ name: 'Alice', groupId: 'g1' }), locals: makeLocals({ user: otherUser }), cookies: mockCookies } as never)
		).rejects.toMatchObject({ status: 403 });
	});

	it('allows a registered user to claim their own member', async () => {
		testDb.insert(users).values({ id: 'u1', name: 'Alice', createdAt: NOW }).run();
		testDb.insert(members).values({ id: 'm1', groupId: 'g1', name: 'Alice', userId: 'u1', createdAt: NOW }).run();

		const user: User = { id: 'u1', name: 'Alice', passwordHash: null, facebookId: null, createdAt: NOW };
		const res = await POST({ request: makeRequest({ name: 'Alice', groupId: 'g1' }), locals: makeLocals({ user }), cookies: mockCookies } as never);

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.memberId).toBe('m1');
	});

	it('throws 400 when name is missing', async () => {
		await expect(
			POST({ request: makeRequest({ groupId: 'g1' }), locals: makeLocals(), cookies: mockCookies } as never)
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 404 when groupId does not exist', async () => {
		await expect(
			POST({ request: makeRequest({ name: 'Alice', groupId: 'no-such-group' }), locals: makeLocals(), cookies: mockCookies } as never)
		).rejects.toMatchObject({ status: 404 });
	});
});
