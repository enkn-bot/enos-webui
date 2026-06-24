import { describe, it, expect } from 'vitest';

import { githubProjectContextSource, projectContextSourceFromDigest } from './bindLocalWorkspace';

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

describe('githubProjectContextSource', () => {
	it('records repo, selected branch, and cloud checkout path as project source metadata', () => {
		expect(
			githubProjectContextSource({
				repo: 'enkn-bot/enos',
				branch: 'feature/t3',
				dest: '/home/user/enos'
			})
		).toEqual({
			kind: 'github',
			rootName: 'enkn-bot/enos',
			repo: 'enkn-bot/enos',
			branch: 'feature/t3',
			cloudPath: '/home/user/enos'
		});
	});

	it('uses the default branch label when GitHub cloned the default branch', () => {
		expect(
			githubProjectContextSource({
				repo: 'enkn-bot/enos',
				branch: 'default',
				dest: '/home/user/enos'
			}).branch
		).toBe('default');
	});
});
