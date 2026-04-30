import { describe, it, expect, vi, afterEach } from 'vitest';
import { DAYS, DAY_DATES, DAY_LABELS, SLUG_TO_DAY, getCurrentDay } from './days.js';

describe('DAYS', () => {
	it('contains exactly 5 festival days in order', () => {
		expect(DAYS).toEqual(['wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
	});
});

describe('DAY_DATES', () => {
	it('maps each day to the correct ISO date', () => {
		expect(DAY_DATES.wednesday).toBe('2026-06-10');
		expect(DAY_DATES.thursday).toBe('2026-06-11');
		expect(DAY_DATES.friday).toBe('2026-06-12');
		expect(DAY_DATES.saturday).toBe('2026-06-13');
		expect(DAY_DATES.sunday).toBe('2026-06-14');
	});

	it('covers all DAYS', () => {
		for (const d of DAYS) {
			expect(DAY_DATES[d]).toBeDefined();
		}
	});
});

describe('DAY_LABELS', () => {
	it('provides a label for every day', () => {
		for (const d of DAYS) {
			expect(typeof DAY_LABELS[d]).toBe('string');
			expect(DAY_LABELS[d].length).toBeGreaterThan(0);
		}
	});
});

describe('SLUG_TO_DAY', () => {
	it('maps each Czech slug to the correct day and date', () => {
		expect(SLUG_TO_DAY['streda-10-6']).toEqual({ day: 'wednesday', date: '2026-06-10' });
		expect(SLUG_TO_DAY['ctvrtek-11-6']).toEqual({ day: 'thursday', date: '2026-06-11' });
		expect(SLUG_TO_DAY['patek-12-6']).toEqual({ day: 'friday', date: '2026-06-12' });
		expect(SLUG_TO_DAY['sobota-13-6']).toEqual({ day: 'saturday', date: '2026-06-13' });
		expect(SLUG_TO_DAY['nedele-14-6']).toEqual({ day: 'sunday', date: '2026-06-14' });
	});

	it('contains an entry for each festival day', () => {
		const mappedDays = Object.values(SLUG_TO_DAY).map((v) => v.day);
		for (const d of DAYS) {
			expect(mappedDays).toContain(d);
		}
	});

	it('is consistent with DAY_DATES', () => {
		for (const { day, date } of Object.values(SLUG_TO_DAY)) {
			expect(DAY_DATES[day]).toBe(date);
		}
	});
});

describe('getCurrentDay', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it.each([
		['2026-06-10', 'wednesday'],
		['2026-06-11', 'thursday'],
		['2026-06-12', 'friday'],
		['2026-06-13', 'saturday'],
		['2026-06-14', 'sunday']
	])('returns %s on %s', (date, expected) => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(`${date}T12:00:00Z`));
		expect(getCurrentDay()).toBe(expected);
	});

	it('falls back to "wednesday" when date is not a festival day', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-30T12:00:00Z'));
		expect(getCurrentDay()).toBe('wednesday');
	});
});
