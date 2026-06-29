import { describe, expect, test } from 'vitest';

import { cloudProjectContextSource, decodeProjectArchive } from './cloudUpload';

describe('local project cloud upload helpers', () => {
	test('decodes bridge base64 tar data to bytes', () => {
		const bytes = decodeProjectArchive({
			action: 'exportProjectArchive',
			format: 'tar',
			encoding: 'base64',
			rootName: 'Codex',
			bytes: 5,
			data: btoa('hello')
		});

		expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
	});

	test('records cloud source metadata after import', () => {
		expect(
			cloudProjectContextSource(
				{ rootName: 'Codex', bytes: 1234 },
				{ imported_bytes: 1234, dest: '/home/user' }
			)
		).toEqual({
			kind: 'cloud',
			rootName: 'Codex',
			cloudPath: '/home/user',
			importedBytes: 1234
		});
	});

	test('preserves the known local home when adding a cloud home', () => {
		expect(
			cloudProjectContextSource(
				{ rootName: 'Codex', bytes: 1234 },
				{ imported_bytes: 1234, dest: '/home/user/Codex' },
				{
					kind: 'local',
					rootName: 'Codex',
					rootDisplay: '/Users/ernestnyarko/Projects/Codex'
				},
				'ws-123'
			)
		).toEqual({
			kind: 'cloud',
			rootName: 'Codex',
			cloudPath: '/home/user/Codex',
			workspaceId: 'ws-123',
			importedBytes: 1234,
			linkedHomes: {
				local: {
					rootName: 'Codex',
					rootDisplay: '/Users/ernestnyarko/Projects/Codex'
				},
				cloud: {
					rootName: 'Codex',
					cloudPath: '/home/user/Codex',
					workspaceId: 'ws-123',
					importedBytes: 1234
				}
			}
		});
	});
});
