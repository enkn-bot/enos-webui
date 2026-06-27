import { describe, expect, test } from 'vitest';
import { DESK_SCAFFOLD_NAME, isScaffoldName, deriveProjectName } from './deskProjectName';

describe('isScaffoldName', () => {
	test('the neutral scaffold name', () => {
		expect(isScaffoldName(DESK_SCAFFOLD_NAME)).toBe(true);
		expect(isScaffoldName('  new project ')).toBe(true);
	});
	test('legacy ENOS / ENOS N still recognised (migration)', () => {
		expect(isScaffoldName('ENOS')).toBe(true);
		expect(isScaffoldName('ENOS 2')).toBe(true);
	});
	test('a real project name is not a scaffold', () => {
		expect(isScaffoldName('Invoice parser')).toBe(false);
		expect(isScaffoldName('')).toBe(false);
	});
});

describe('deriveProjectName', () => {
	test('derives a short title from the first message', () => {
		expect(deriveProjectName('Build me a CSV invoice parser please')).toBe(
			'Build me a CSV invoice parser please'
		);
	});
	test('takes the first line and collapses whitespace', () => {
		expect(deriveProjectName('  Fix   the   login   bug\nmore detail')).toBe('Fix the login bug');
	});
	test('truncates long input to <= 48 chars', () => {
		const out = deriveProjectName('a'.repeat(100));
		expect(out.length).toBeLessThanOrEqual(48);
	});
	test('empty input falls back to the scaffold name', () => {
		expect(deriveProjectName('   ')).toBe(DESK_SCAFFOLD_NAME);
	});
});
