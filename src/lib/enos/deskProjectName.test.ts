import { describe, expect, test } from 'vitest';
import { DESK_SCAFFOLD_NAME, isScaffoldName } from './deskProjectName';

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

// deriveProjectName (name a project from the first message) was REMOVED — the
// folder-first model never names a project from a message. See
// docs/superpowers/specs/2026-06-27-desk-project-model-folder-first.md.
