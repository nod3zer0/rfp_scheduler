import { describe, it, expect } from 'vitest';
import { timeToMinutes, nowMinutes, formatCountdown } from './time.js';

describe('timeToMinutes', () => {
	it('converts a daytime HH:MM to minutes', () => {
		expect(timeToMinutes('10:00')).toBe(600);
		expect(timeToMinutes('14:30')).toBe(870);
		expect(timeToMinutes('23:59')).toBe(1439);
	});

	it('handles zero-padded hours', () => {
		expect(timeToMinutes('08:00')).toBe(480);
		expect(timeToMinutes('00:30')).toBe(1470); // post-midnight: 0*60+30 = 30 < 360 → +1440
	});

	it('maps post-midnight hours (00:00–05:59) to 1440–1799', () => {
		expect(timeToMinutes('00:00')).toBe(1440);
		expect(timeToMinutes('01:00')).toBe(1500);
		expect(timeToMinutes('05:59')).toBe(1799);
	});

	it('does NOT map 06:00 to post-midnight range', () => {
		expect(timeToMinutes('06:00')).toBe(360);
	});

	it('sorts correctly across midnight boundary', () => {
		const times = ['23:00', '00:30', '01:00', '22:00'];
		const sorted = [...times].sort(
			(a, b) => timeToMinutes(a) - timeToMinutes(b)
		);
		expect(sorted).toEqual(['22:00', '23:00', '00:30', '01:00']);
	});
});

describe('nowMinutes', () => {
	it('returns a number within festival range', () => {
		const mins = nowMinutes();
		expect(typeof mins).toBe('number');
		// Should be between 0 and 1799 (29:59 in festival time)
		expect(mins).toBeGreaterThanOrEqual(0);
		expect(mins).toBeLessThanOrEqual(1799);
	});
});

describe('formatCountdown', () => {
	it('returns "Starting now" for 0 minutes', () => {
		expect(formatCountdown(0)).toBe('Starting now');
	});

	it('returns "Starting now" for negative values', () => {
		expect(formatCountdown(-5)).toBe('Starting now');
	});

	it('formats minutes under 60', () => {
		expect(formatCountdown(1)).toBe('In 1min');
		expect(formatCountdown(45)).toBe('In 45min');
		expect(formatCountdown(59)).toBe('In 59min');
	});

	it('formats exactly 1 hour', () => {
		expect(formatCountdown(60)).toBe('In 1h');
	});

	it('formats hours + remaining minutes', () => {
		expect(formatCountdown(90)).toBe('In 1h 30min');
		expect(formatCountdown(125)).toBe('In 2h 5min');
	});

	it('omits minutes part when remainder is 0', () => {
		expect(formatCountdown(120)).toBe('In 2h');
		expect(formatCountdown(180)).toBe('In 3h');
	});
});
