import { describe, expect, test } from 'vitest';
import { isProjectVisibleOnSurface } from './deskFolderVisibility';

describe('isProjectVisibleOnSurface', () => {
	test('purely-local project is HIDDEN on web (no bridge)', () => {
		expect(isProjectVisibleOnSurface({ folderKind: 'local', hasBridge: false })).toBe(false);
	});
	test('local project is VISIBLE on the app (bridge present)', () => {
		expect(isProjectVisibleOnSurface({ folderKind: 'local', hasBridge: true })).toBe(true);
	});
	test('cloud project is always visible (web)', () => {
		expect(isProjectVisibleOnSurface({ folderKind: 'cloud', hasBridge: false })).toBe(true);
	});
	test('github project is always visible (web)', () => {
		expect(isProjectVisibleOnSurface({ folderKind: 'github', hasBridge: false })).toBe(true);
	});
	test('unbound/new scaffold (null kind) stays visible on web', () => {
		expect(isProjectVisibleOnSurface({ folderKind: null, hasBridge: false })).toBe(true);
	});
});
