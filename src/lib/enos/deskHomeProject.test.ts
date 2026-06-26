import { describe, expect, test } from 'vitest';

import { isDuplicateDeskHomeProjectName, selectDeskHomeProject } from './deskHomeProject';

describe('Desk home project selection', () => {
	const folders = [
		{
			id: 'enos-2',
			name: 'ENOS 2',
			updated_at: 30,
			data: { project_context_source: { kind: 'cloud', cloudPath: '/home/user/ENOS 2/' } }
		},
		{
			id: 'enos',
			name: 'ENOS',
			updated_at: 10,
			data: { project_context_source: { kind: 'cloud', cloudPath: '/home/user/ENOS/' } }
		},
		{
			id: 'other',
			name: 'Client Work',
			updated_at: 20,
			data: { project_context_source: { kind: 'cloud', cloudPath: '/home/user/Client Work/' } }
		}
	];

	test('canonical ENOS wins over numbered ENOS folders even when older', () => {
		expect(selectDeskHomeProject(folders)?.id).toBe('enos');
	});

	test('falls back to first cloud-runnable project when canonical ENOS is missing', () => {
		expect(selectDeskHomeProject(folders.filter((folder) => folder.id !== 'enos'))?.id).toBe(
			'enos-2'
		);
	});

	test('identifies numbered home project names as stale duplicates', () => {
		expect(isDuplicateDeskHomeProjectName('ENOS 2')).toBe(true);
		expect(isDuplicateDeskHomeProjectName('ENOS')).toBe(false);
		expect(isDuplicateDeskHomeProjectName('Client ENOS 2')).toBe(false);
	});
});
