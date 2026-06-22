import { beforeEach, describe, expect, test, vi } from 'vitest';

const processWebSearchMock = vi.hoisted(() => vi.fn());
const queryCollectionMock = vi.hoisted(() => vi.fn());

vi.mock('$lib/apis/retrieval', () => ({
	processWebSearch: processWebSearchMock,
	queryCollection: queryCollectionMock
}));

import {
	DESK_FILE_TOOLS,
	executeDeskFileTool,
	type DeskToolName
} from '$lib/enos/deskFileTools';

const toolByName = (name: DeskToolName) =>
	DESK_FILE_TOOLS.find((t) => t.function.name === name);

const fakeBridge = (overrides: Record<string, any> = {}) =>
	({
		listProjectFiles: vi.fn(async () => ({
			action: 'listProjectFiles',
			rootName: 'Proj',
			path: '.',
			entries: [
				{ name: 'a.md', path: 'a.md', type: 'file', size: 12 },
				{ name: 'docs', path: 'docs', type: 'directory' }
			]
		})),
		readProjectFile: vi.fn(async (_f: string, path: string) => ({
			action: 'readProjectFile',
			path,
			encoding: 'utf8',
			data: 'hello world'
		})),
		writeProjectFile: vi.fn(async (_f: string, path: string, _c: string, opts: any) =>
			opts?.confirmed
				? { action: 'writeProjectFile', status: 'written', path, bytes: 5 }
				: { action: 'writeProjectFile', status: 'requires_confirmation', path, bytes: 5, preview: 'x' }
		),
		createProjectFolder: vi.fn(async (_f: string, path: string) => ({
			action: 'createProjectFolder',
			status: 'created',
			path
		})),
		renameProjectEntry: vi.fn(async (_f: string, path: string, toPath: string) => ({
			action: 'renameProjectEntry',
			status: 'renamed',
			path,
			toPath
		})),
		deleteProjectEntry: vi.fn(async (_f: string, path: string, opts: any) =>
			opts?.confirmed
				? { action: 'deleteProjectEntry', status: 'trashed', path }
				: { action: 'deleteProjectEntry', status: 'requires_confirmation', path, bytes: 0, preview: '' }
		),
		revealProjectEntry: vi.fn(async (_f: string, path: string) => ({
			action: 'revealProjectEntry',
			status: 'revealed',
			path
		})),
		getProjectGitLog: vi.fn(async () => ({
			action: 'getProjectGitLog',
			isRepo: true,
			logLines: ['abc1234 2026-06-19 initial commit']
		})),
		getProjectGitDiff: vi.fn(async (_f: string, path?: string) => ({
			action: 'getProjectGitDiff',
			isRepo: true,
			path: path ?? '.',
			diff: 'diff --git a/proof.txt b/proof.txt\n+SAFE_CHANGE\n',
			truncated: false
		})),
		gitStage: vi.fn(async (_f: string, paths: string[], opts: any) =>
			opts?.confirmed
				? { action: 'stageProjectChanges', status: 'staged', path: paths.join(', '), paths }
				: {
						action: 'stageProjectChanges',
						status: 'requires_confirmation',
						path: paths.join(', '),
						paths,
						bytes: 0,
						preview: paths.join('\n')
					}
		),
		gitCommit: vi.fn(async (_f: string, message: string, opts: any) =>
			opts?.confirmed
				? { action: 'commitProjectChanges', status: 'committed', path: '.', commit: 'abc1234' }
				: {
						action: 'commitProjectChanges',
						status: 'requires_confirmation',
						path: '.',
						bytes: message.length,
						preview: message
					}
		),
		gitCreateBranch: vi.fn(async (_f: string, branchName: string, opts: any) =>
			opts?.confirmed
				? {
						action: 'createProjectBranch',
						status: 'created_branch',
						path: branchName,
						branch: branchName
					}
				: {
						action: 'createProjectBranch',
						status: 'requires_confirmation',
						path: branchName,
						branch: branchName,
						bytes: 0,
						preview: ''
					}
		),
		gitClone: vi.fn(async (_f: string, repositoryUrl: string, targetPath: string, opts: any) =>
			opts?.confirmed
				? {
						action: 'cloneProjectRepository',
						status: 'cloned',
						path: targetPath,
						repositoryUrl
					}
				: {
						action: 'cloneProjectRepository',
						status: 'requires_confirmation',
						path: targetPath,
						repositoryUrl,
						bytes: repositoryUrl.length,
						preview: repositoryUrl
					}
		),
		...overrides
	}) as any;

describe('DESK_FILE_TOOLS contract', () => {
	beforeEach(() => {
		processWebSearchMock.mockReset();
		queryCollectionMock.mockReset();
	});

	test('exposes the full agentic file toolset', () => {
		const names = DESK_FILE_TOOLS.map((t) => t.function.name).sort();
		expect(names).toEqual(
			[
				'create_folder',
				'delete_entry',
				'edit_file',
				'git_clone',
				'git_commit',
				'git_create_branch',
				'git_diff',
				'git_log',
				'git_stage',
				'list_files',
				'read_file',
				'rename_entry',
				'reveal_entry',
				'write_file',
				'git_status',
				'web_search'
			].sort()
		);
	});

	test('write_file requires path and content; edit_file requires old/new text', () => {
		expect(toolByName('write_file')!.function.parameters.required).toEqual(['path', 'content']);
		expect(toolByName('edit_file')!.function.parameters.required).toEqual([
			'path',
			'old_text',
			'new_text'
		]);
	});

	test('read tools describe project-relative, absolute, and home paths', () => {
		const listToolText = JSON.stringify(toolByName('list_files')!.function);
		const readToolText = JSON.stringify(toolByName('read_file')!.function);

		for (const toolText of [listToolText, readToolText]) {
			expect(toolText).toContain('project-relative');
			expect(toolText).toContain('absolute');
			expect(toolText).toContain('~/');
			expect(toolText).toContain('Desktop');
		}
	});

	test('web_search requires a query string parameter', () => {
		const tool = toolByName('web_search' as DeskToolName);
		expect(tool).toBeDefined();
		expect(tool!.function.parameters.required).toEqual(['query']);
		expect(tool!.function.parameters.properties.query).toEqual({
			type: 'string',
			description: expect.any(String)
		});
	});
});

describe('executeDeskFileTool', () => {
	beforeEach(() => {
		processWebSearchMock.mockReset();
		queryCollectionMock.mockReset();
	});

	test('list_files dispatches to the bridge and summarizes entries', async () => {
		const bridge = fakeBridge();
		const res = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'list_files',
			args: { path: '.' }
		});
		expect(bridge.listProjectFiles).toHaveBeenCalledWith('F', '.');
		expect(res.status).toBe('ok');
	});

	test('read_file returns file content', async () => {
		const bridge = fakeBridge();
		const res = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'read_file',
			args: { path: 'a.md' }
		});
		expect(bridge.readProjectFile).toHaveBeenCalledWith('F', 'a.md');
		expect(res.status === 'ok' && String(res.data)).toContain('hello world');
	});

	test('write_file surfaces confirmation, then completes when confirmed', async () => {
		const bridge = fakeBridge();
		const pending = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'write_file',
			args: { path: 'a.md', content: 'new' }
		});
		expect(pending.status).toBe('requires_confirmation');

		const done = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'write_file',
			args: { path: 'a.md', content: 'new' },
			confirmed: true
		});
		expect(bridge.writeProjectFile).toHaveBeenLastCalledWith('F', 'a.md', 'new', { confirmed: true });
		expect(done.status).toBe('ok');
	});

	test('edit_file reads, replaces a unique snippet, and writes back', async () => {
		const bridge = fakeBridge();
		const res = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'edit_file',
			args: { path: 'a.md', old_text: 'hello', new_text: 'goodbye' },
			confirmed: true
		});
		expect(bridge.readProjectFile).toHaveBeenCalledWith('F', 'a.md');
		expect(bridge.writeProjectFile).toHaveBeenLastCalledWith(
			'F',
			'a.md',
			'goodbye world',
			{ confirmed: true }
		);
		expect(res.status).toBe('ok');
	});

	test('edit_file errors when old_text is absent (no silent guess)', async () => {
		const bridge = fakeBridge();
		const res = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'edit_file',
			args: { path: 'a.md', old_text: 'NOT THERE', new_text: 'x' },
			confirmed: true
		});
		expect(res.status).toBe('error');
		expect(bridge.writeProjectFile).not.toHaveBeenCalled();
	});

	test('delete_entry surfaces confirmation before trashing', async () => {
		const bridge = fakeBridge();
		const res = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'delete_entry',
			args: { path: 'a.md' }
		});
		expect(res.status).toBe('requires_confirmation');
	});

	test('unknown tool returns an error result instead of throwing', async () => {
		const res = await executeDeskFileTool({
			bridge: fakeBridge(),
			folderId: 'F',
			name: 'frobnicate',
			args: {}
		});
		expect(res.status).toBe('error');
	});

	test('git_status reports branch and changed files for a repo', async () => {
		const bridge = fakeBridge({
			getProjectGitStatus: vi.fn(async () => ({
				action: 'getProjectGitStatus',
				isRepo: true,
				branch: 'main',
				statusLines: [' M src/app.ts', '?? notes.md']
			}))
		});
		const res = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_status',
			args: {}
		});
		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && res.summary).toContain('main');
		expect(res.status === 'ok' && String(res.data)).toContain('src/app.ts');
	});

	test('git_status is read-only and never needs confirmation', async () => {
		const bridge = fakeBridge({
			getProjectGitStatus: vi.fn(async () => ({
				action: 'getProjectGitStatus',
				isRepo: false,
				branch: null,
				statusLines: []
			}))
		});
		const res = await executeDeskFileTool({ bridge, folderId: 'F', name: 'git_status', args: {} });
		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && res.summary.toLowerCase()).toContain('not a git');
	});

	test('git_log reports recent commits without confirmation', async () => {
		const bridge = fakeBridge({
			getProjectGitLog: vi.fn(async () => ({
				action: 'getProjectGitLog',
				isRepo: true,
				logLines: ['abc1234 2026-06-19 commit subject', '[truncated]'],
				truncated: true
			}))
		});
		const res = await executeDeskFileTool({ bridge, folderId: 'F', name: 'git_log', args: {} });
		expect(bridge.getProjectGitLog).toHaveBeenCalledWith('F');
		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && res.summary).toContain('recent commits');
		expect(res.status === 'ok' && String(res.data)).toContain('[truncated]');
	});

	test('git_diff returns the working-tree diff and forwards an optional path', async () => {
		const bridge = fakeBridge();
		const res = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_diff',
			args: { path: 'proof.txt' }
		});
		expect(bridge.getProjectGitDiff).toHaveBeenCalledWith('F', 'proof.txt');
		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && String(res.data)).toContain('SAFE_CHANGE');
	});

	test('git_stage surfaces confirmation, then stages paths when confirmed', async () => {
		const bridge = fakeBridge();
		const pending = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_stage',
			args: { paths: ['src/app.ts', 'README.md'] }
		});
		expect(pending.status).toBe('requires_confirmation');

		const done = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_stage',
			args: { paths: ['src/app.ts', 'README.md'] },
			confirmed: true
		});
		expect(bridge.gitStage).toHaveBeenLastCalledWith('F', ['src/app.ts', 'README.md'], {
			confirmed: true
		});
		expect(done.status).toBe('ok');
	});

	test('git_commit surfaces confirmation, then commits with the supplied message', async () => {
		const bridge = fakeBridge();
		const pending = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_commit',
			args: { message: 'commit staged changes' }
		});
		expect(pending.status).toBe('requires_confirmation');

		const done = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_commit',
			args: { message: 'commit staged changes' },
			confirmed: true
		});
		expect(bridge.gitCommit).toHaveBeenLastCalledWith('F', 'commit staged changes', {
			confirmed: true
		});
		expect(done.status).toBe('ok');
	});

	test('git_create_branch surfaces confirmation, then creates and switches branches', async () => {
		const bridge = fakeBridge();
		const pending = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_create_branch',
			args: { branch_name: 'feature/git-tools' }
		});
		expect(pending.status).toBe('requires_confirmation');

		const done = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_create_branch',
			args: { branch_name: 'feature/git-tools' },
			confirmed: true
		});
		expect(bridge.gitCreateBranch).toHaveBeenLastCalledWith('F', 'feature/git-tools', {
			confirmed: true
		});
		expect(done.status).toBe('ok');
	});

	test('git_clone surfaces confirmation, then clones an HTTPS repository into a target path', async () => {
		const bridge = fakeBridge();
		const pending = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_clone',
			args: { url: 'https://example.test/repo.git', target_path: 'vendor/repo' }
		});
		expect(pending.status).toBe('requires_confirmation');

		const done = await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'git_clone',
			args: { url: 'https://example.test/repo.git', target_path: 'vendor/repo' },
			confirmed: true
		});
		expect(bridge.gitClone).toHaveBeenLastCalledWith(
			'F',
			'https://example.test/repo.git',
			'vendor/repo',
			{ confirmed: true }
		);
		expect(done.status).toBe('ok');
	});

	test('unsupported git operations are refused clearly and are not exposed as tools', async () => {
		const names = DESK_FILE_TOOLS.map((t) => t.function.name);
		expect(names).not.toContain('git_push');
		expect(names).not.toContain('git_pull');
		expect(names).not.toContain('git_merge');
		expect(names).not.toContain('git_rebase');
		expect(names).not.toContain('git_reset');
		expect(names).not.toContain('git_remote');

		const res = await executeDeskFileTool({
			bridge: fakeBridge(),
			folderId: 'F',
			name: 'git_push',
			args: {}
		});
		expect(res.status).toBe('error');
		expect(res.status === 'error' && res.message.toLowerCase()).toContain('unsupported git operation');
		expect(res.status === 'error' && res.message).toContain('git_clone');
		expect(res.status === 'error' && res.message).toContain('git_diff');
	});
});

describe('executeDeskFileTool web_search', () => {
	beforeEach(() => {
		processWebSearchMock.mockReset();
		queryCollectionMock.mockReset();
	});

	test('runs web search, queries the returned collection, and returns retrieved chunks', async () => {
		processWebSearchMock.mockResolvedValue({
			status: true,
			collection_name: 'web-abc',
			filenames: ['https://x.com/a']
		});
		queryCollectionMock.mockResolvedValue({
			documents: [['Belgium won 2-1 in stoppage time.']],
			metadatas: [[{ source: 'https://x.com/a', title: 'Match report' }]],
			distances: [[0.1]]
		});

		const res = await executeDeskFileTool({
			bridge: fakeBridge(),
			folderId: 'F',
			name: 'web_search',
			args: { query: 'belgium game' },
			token: 'TOKEN'
		});

		expect(processWebSearchMock).toHaveBeenCalledWith('TOKEN', 'belgium game');
		expect(queryCollectionMock).toHaveBeenCalledWith('TOKEN', 'web-abc', 'belgium game', 5);
		expect(processWebSearchMock.mock.invocationCallOrder[0]).toBeLessThan(
			queryCollectionMock.mock.invocationCallOrder[0]
		);
		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && String(res.data)).toContain(
			'Belgium won 2-1 in stoppage time.'
		);
		expect(res.status === 'ok' && String(res.data)).toContain('https://x.com/a');
	});

	test('does not call any desktop bridge method', async () => {
		processWebSearchMock.mockResolvedValue({
			status: true,
			collection_name: 'web-news',
			filenames: ['https://example.test/news']
		});
		queryCollectionMock.mockResolvedValue({
			documents: [['Latest update.']],
			metadatas: [[{ source: 'https://example.test/news', title: 'News' }]],
			distances: [[0.1]]
		});
		const bridge = fakeBridge();

		await executeDeskFileTool({
			bridge,
			folderId: 'F',
			name: 'web_search',
			args: { query: 'latest news' },
			token: 'TOKEN'
		});

		for (const method of Object.values(bridge)) {
			if (vi.isMockFunction(method)) {
				expect(method).not.toHaveBeenCalled();
			}
		}
	});

	test('returns graceful text when token is missing', async () => {
		const res = await executeDeskFileTool({
			bridge: fakeBridge(),
			folderId: 'F',
			name: 'web_search',
			args: { query: 'latest scores' }
		});

		expect(processWebSearchMock).not.toHaveBeenCalled();
		expect(queryCollectionMock).not.toHaveBeenCalled();
		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && res.data).toBe('Web search is not available.');
	});

	test('returns graceful text when processWebSearch returns no collection', async () => {
		processWebSearchMock.mockResolvedValue(null);

		const res = await executeDeskFileTool({
			bridge: fakeBridge(),
			folderId: 'F',
			name: 'web_search',
			args: { query: 'latest scores' },
			token: 'TOKEN'
		});

		expect(processWebSearchMock).toHaveBeenCalledWith('TOKEN', 'latest scores');
		expect(queryCollectionMock).not.toHaveBeenCalled();
		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && res.data).toBe('Web search is not available.');
	});

	test('returns graceful text when queryCollection returns no documents', async () => {
		processWebSearchMock.mockResolvedValue({
			status: true,
			collection_name: 'web-empty',
			filenames: []
		});
		queryCollectionMock.mockResolvedValue({
			documents: [[]],
			metadatas: [[]],
			distances: [[]]
		});

		const res = await executeDeskFileTool({
			bridge: fakeBridge(),
			folderId: 'F',
			name: 'web_search',
			args: { query: 'latest scores' },
			token: 'TOKEN'
		});

		expect(queryCollectionMock).toHaveBeenCalledWith('TOKEN', 'web-empty', 'latest scores', 5);
		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && res.data).toBe('Web search is not available.');
	});

	test('returns graceful text when processWebSearch throws', async () => {
		processWebSearchMock.mockRejectedValue(new Error('offline'));

		const res = await executeDeskFileTool({
			bridge: fakeBridge(),
			folderId: 'F',
			name: 'web_search',
			args: { query: 'latest scores' },
			token: 'TOKEN'
		});

		expect(res.status).toBe('ok');
		expect(res.status === 'ok' && res.data).toBe('Web search is not available.');
	});
});
