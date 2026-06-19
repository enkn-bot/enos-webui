import { describe, it, expect } from 'vitest';
import { groundingLine, GROUNDING_PREFIX } from './grounding';

describe('groundingLine', () => {
	it('states the current date with weekday, month, year, and time', () => {
		// Constructed in local time so Intl formatting is timezone-deterministic.
		const when = new Date(2026, 5, 19, 14, 5, 0); // Fri Jun 19 2026, 2:05 PM
		const line = groundingLine(when);
		expect(line.startsWith(GROUNDING_PREFIX)).toBe(true);
		expect(line).toContain('2026');
		expect(line).toContain('June');
		expect(line).toContain('Friday');
		expect(line).toContain('Never say you do not know the current date');
	});

	it('defaults to the present moment', () => {
		const line = groundingLine();
		expect(line.startsWith(GROUNDING_PREFIX)).toBe(true);
		expect(line).toContain(String(new Date().getFullYear()));
	});
});
