import { describe, it, expect } from 'vitest';
import { getMemberColor, getMemberInitials } from './memberColor.js';

describe('getMemberColor', () => {
	it('returns a valid HSL color string', () => {
		const color = getMemberColor('Alice');
		expect(color).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
	});

	it('is deterministic — same name always produces the same color', () => {
		expect(getMemberColor('Bob')).toBe(getMemberColor('Bob'));
		expect(getMemberColor('Alice')).toBe(getMemberColor('Alice'));
	});

	it('produces different colors for different names', () => {
		const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
		const colors = names.map(name => getMemberColor(name));
		const unique = new Set(colors);
		expect(unique.size).toBe(names.length);
	});

	it('hue is within 0–359', () => {
		const color = getMemberColor('Test');
		const hue = parseInt(color.match(/hsl\((\d+),/)![1]);
		expect(hue).toBeGreaterThanOrEqual(0);
		expect(hue).toBeLessThan(360);
	});

	it('handles empty string without throwing', () => {
		expect(() => getMemberColor('')).not.toThrow();
	});
});

describe('getMemberInitials', () => {
	it('returns first letter of a single name', () => {
		expect(getMemberInitials('Alice')).toBe('A');
	});

	it('returns initials for two words', () => {
		expect(getMemberInitials('Alice Smith')).toBe('AS');
	});

	it('returns at most 2 initials for longer names', () => {
		expect(getMemberInitials('Alice Bob Charlie')).toBe('AB');
	});

	it('uppercases the result', () => {
		expect(getMemberInitials('alice bob')).toBe('AB');
	});

	it('handles extra whitespace', () => {
		expect(getMemberInitials('  Alice   Bob  ')).toBe('AB');
	});

	it('handles empty string', () => {
		expect(getMemberInitials('')).toBe('');
	});
});
