import { describe, expect, it } from 'vitest';

import { nextProjectFolderName } from './projectFolderNames';

describe('Desk project folder names', () => {
	it('dedupes against hidden folders in the same parent', () => {
		const folders = [
			{ name: 'ENOS', parent_id: null, meta: { surface: 'chat' } },
			{ name: 'ENOS 1', parent_id: null, data: { project_context_source: { kind: 'local' } } },
			{ name: 'ENOS', parent_id: 'archive' }
		];

		expect(nextProjectFolderName('ENOS', null, folders)).toBe('ENOS 2');
		expect(nextProjectFolderName('ENOS', 'archive', folders)).toBe('ENOS 1');
	});

	it('keeps clean names when no sibling collides', () => {
		expect(nextProjectFolderName('Research', null, [{ name: 'ENOS', parent_id: null }])).toBe(
			'Research'
		);
	});
});
