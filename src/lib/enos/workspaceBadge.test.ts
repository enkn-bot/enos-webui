import { describe, expect, test } from 'vitest';

import { workspaceBadgeFromFolder, workspaceBadgeLabel } from './workspaceBadge';

describe('workspaceBadgeFromFolder', () => {
	test('defaults a bound local folder to kind local when only rootName exists', () => {
		expect(
			workspaceBadgeFromFolder({
				data: {
					project_context_source: {
						rootName: '  X  '
					}
				}
			})
		).toEqual({ kind: 'local', name: 'X' });
	});

	test('uses the source kind when present', () => {
		expect(
			workspaceBadgeFromFolder({
				data: {
					project_context_source: {
						kind: 'github',
						rootName: 'repo'
					}
				}
			})
		).toEqual({ kind: 'github', name: 'repo' });
	});

	test('returns an empty badge for unbound or empty folders', () => {
		expect(workspaceBadgeFromFolder(null)).toEqual({ kind: null, name: '' });
		expect(workspaceBadgeFromFolder({ data: {} })).toEqual({ kind: null, name: '' });
		expect(
			workspaceBadgeFromFolder({
				data: {
					project_context_source: {
						kind: 'local',
						rootName: '   '
					}
				}
			})
		).toEqual({ kind: null, name: '' });
	});
});

describe('workspaceBadgeLabel', () => {
	test('returns the badge name when present and falls back when missing', () => {
		expect(workspaceBadgeLabel({ kind: 'local', name: '  X  ' }, 'Select workspace…')).toBe('X');
		expect(workspaceBadgeLabel({ kind: null, name: '' }, 'Select workspace…')).toBe(
			'Select workspace…'
		);
		expect(workspaceBadgeLabel(null, 'Select workspace…')).toBe('Select workspace…');
	});
});
