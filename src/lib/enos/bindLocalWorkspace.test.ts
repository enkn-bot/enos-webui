import { describe, it, expect } from 'vitest';

import { projectContextSourceFromDigest } from './bindLocalWorkspace';

describe('projectContextSourceFromDigest', () => {
	it('shapes digest into project_context_source', () => {
		const result = projectContextSourceFromDigest({
			rootName: 'X',
			fileCount: 3,
			sampledFileCount: 2,
			skippedCount: 1,
			text: '..',
			generatedAt: 0
		});

		expect(result).toEqual({
			kind: 'local',
			rootName: 'X',
			fileCount: 3,
			sampledFileCount: 2,
			skippedCount: 1
		});
	});
});
