import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestDb } from './db.test-helpers.js';

// Each test creates its own isolated in-memory DB and injects it via mock
let testDb: ReturnType<typeof createTestDb>['db'];

vi.mock('./db.js', () => ({
	get db() {
		return testDb;
	}
}));

// Import after mock is set up
const { getMyPickIds, buildPicksMap } = await import('./picksHelper.js');

// ─── Seed helpers ─────────────────────────────────────────────────────────────
import {
	users,
	groups,
	members,
	schedule,
	picks
} from './schema.js';

const NOW = new Date().toISOString();

function seedGroup(db: typeof testDb, id = 'g1', name = 'Test Group') {
	db.insert(groups)
		.values({ id, name, createdAt: NOW })
		.run();
	return id;
}

function seedUser(db: typeof testDb, id: string, name: string) {
	db.insert(users).values({ id, name, createdAt: NOW }).run();
	return id;
}

function seedMember(
	db: typeof testDb,
	id: string,
	groupId: string,
	name: string,
	userId: string | null = null
) {
	db.insert(members).values({ id, groupId, name, userId, createdAt: NOW }).run();
	return id;
}

function seedSchedule(db: typeof testDb, id: string) {
	db.insert(schedule)
		.values({
			id,
			band: `Band ${id}`,
			day: 'wednesday',
			stage: 'Mastercard Stage',
			date: '2026-06-10',
			timeStart: '14:00',
			timeEnd: '15:00',
			updatedAt: NOW
		})
		.run();
	return id;
}

function seedPick(
	db: typeof testDb,
	id: string,
	memberId: string,
	scheduleId: string,
	userId: string | null = null
) {
	db.insert(picks).values({ id, memberId, scheduleId, userId, createdAt: NOW }).run();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getMyPickIds', () => {
	beforeEach(() => {
		const { db } = createTestDb();
		testDb = db;
	});

	it('returns pick IDs for a guest member by memberId', () => {
		seedGroup(testDb);
		seedMember(testDb, 'm1', 'g1', 'Alice');
		seedSchedule(testDb, 's1');
		seedSchedule(testDb, 's2');
		seedPick(testDb, 'p1', 'm1', 's1');
		seedPick(testDb, 'p2', 'm1', 's2');

		const result = getMyPickIds('m1', null);
		expect(result.sort()).toEqual(['s1', 's2'].sort());
	});

	it('returns pick IDs for a registered user by userId (across groups)', () => {
		seedGroup(testDb, 'g1');
		seedGroup(testDb, 'g2');
		seedUser(testDb, 'u1', 'Alice');
		seedMember(testDb, 'm1', 'g1', 'Alice', 'u1');
		seedMember(testDb, 'm2', 'g2', 'Alice', 'u1');
		seedSchedule(testDb, 's1');
		seedSchedule(testDb, 's2');
		// Picks stored with userId (as created by registered toggle)
		seedPick(testDb, 'p1', 'm1', 's1', 'u1');
		seedPick(testDb, 'p2', 'm2', 's2', 'u1');

		const result = getMyPickIds('m1', 'u1');
		expect(result.sort()).toEqual(['s1', 's2'].sort());
	});

	it('returns empty array when the member has no picks', () => {
		seedGroup(testDb);
		seedMember(testDb, 'm1', 'g1', 'Alice');
		expect(getMyPickIds('m1', null)).toEqual([]);
	});

	it('guest cannot see picks belonging to a different member', () => {
		seedGroup(testDb);
		seedMember(testDb, 'm1', 'g1', 'Alice');
		seedMember(testDb, 'm2', 'g1', 'Bob');
		seedSchedule(testDb, 's1');
		seedPick(testDb, 'p1', 'm2', 's1');

		expect(getMyPickIds('m1', null)).toEqual([]);
	});
});

describe('buildPicksMap', () => {
	beforeEach(() => {
		const { db } = createTestDb();
		testDb = db;
	});

	it('returns empty object for empty inputs', () => {
		expect(buildPicksMap([], [])).toEqual({});
	});

	it('maps scheduleId to the member who picked it (guest)', () => {
		seedGroup(testDb);
		seedMember(testDb, 'm1', 'g1', 'Alice');
		seedSchedule(testDb, 's1');
		seedPick(testDb, 'p1', 'm1', 's1');

		const result = buildPicksMap(['s1'], [{ id: 'm1', name: 'Alice', userId: null }]);
		expect(result['s1']).toEqual([{ id: 'm1', name: 'Alice' }]);
	});

	it('aggregates picks by userId for registered members', () => {
		seedGroup(testDb, 'g1');
		seedGroup(testDb, 'g2');
		seedUser(testDb, 'u1', 'Alice');
		seedMember(testDb, 'm1', 'g1', 'Alice', 'u1');
		seedMember(testDb, 'm2', 'g2', 'Alice', 'u1');
		seedSchedule(testDb, 's1');
		// Pick stored via group 2, but we're building for group 1
		seedPick(testDb, 'p1', 'm2', 's1', 'u1');

		const result = buildPicksMap(['s1'], [{ id: 'm1', name: 'Alice', userId: 'u1' }]);
		// m1 appears as pickers even though the pick row references m2
		expect(result['s1']).toEqual([{ id: 'm1', name: 'Alice' }]);
	});

	it('handles multiple members picking the same band', () => {
		seedGroup(testDb);
		seedMember(testDb, 'm1', 'g1', 'Alice');
		seedMember(testDb, 'm2', 'g1', 'Bob');
		seedSchedule(testDb, 's1');
		seedPick(testDb, 'p1', 'm1', 's1');
		seedPick(testDb, 'p2', 'm2', 's1');

		const result = buildPicksMap(
			['s1'],
			[
				{ id: 'm1', name: 'Alice', userId: null },
				{ id: 'm2', name: 'Bob', userId: null }
			]
		);
		expect(result['s1']).toHaveLength(2);
		const names = result['s1'].map((p) => p.name).sort();
		expect(names).toEqual(['Alice', 'Bob']);
	});

	it('does not duplicate entries for the same member', () => {
		seedGroup(testDb);
		seedUser(testDb, 'u1', 'Alice');
		seedMember(testDb, 'm1', 'g1', 'Alice', 'u1');
		seedSchedule(testDb, 's1');
		// Two pick rows for the same user (edge case — shouldn't happen normally)
		seedPick(testDb, 'p1', 'm1', 's1', 'u1');
		seedPick(testDb, 'p2', 'm1', 's1', 'u1');

		const result = buildPicksMap(['s1'], [{ id: 'm1', name: 'Alice', userId: 'u1' }]);
		expect(result['s1']).toHaveLength(1);
	});

	it('returns no entry for bands nobody picked', () => {
		seedGroup(testDb);
		seedMember(testDb, 'm1', 'g1', 'Alice');
		seedSchedule(testDb, 's1');
		seedSchedule(testDb, 's2');
		seedPick(testDb, 'p1', 'm1', 's1');

		const result = buildPicksMap(['s1', 's2'], [{ id: 'm1', name: 'Alice', userId: null }]);
		expect(result['s1']).toHaveLength(1);
		expect(result['s2']).toBeUndefined();
	});
});
