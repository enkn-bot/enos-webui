import { describe, expect, test, vi } from 'vitest';
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
		...overrides
	}) as any;

describe('DESK_FILE_TOOLS contract', () => {
	test('exposes the full agentic file toolset', () => {
		const names = DESK_FILE_TOOLS.map((t) => t.function.name).sort();
		expect(names).toEqual(
			[
				'create_folder',
				'delete_entry',
				'edit_file',
				'git_commit',
				'git_create_branch',
				'git_stage',
				'list_files',
				'read_file',
				'rename_entry',
				'reveal_entry',
				'write_file',
				'git_status'
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
});

describe('executeDeskFileTool', () => {
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

	test('unsupported git operations are refused clearly and are not exposed as tools', async () => {
		const names = DESK_FILE_TOOLS.map((t) => t.function.name);
		expect(names).not.toContain('git_push');
		expect(names).not.toContain('git_pull');
		expect(names).not.toContain('git_merge');
		expect(names).not.toContain('git_rebase');
		expect(names).not.toContain('git_reset');

		const res = await executeDeskFileTool({
			bridge: fakeBridge(),
			folderId: 'F',
			name: 'git_push',
			args: {}
		});
		expect(res.status).toBe('error');
		expect(res.status === 'error' && res.message.toLowerCase()).toContain('unsupported git operation');
	});
});
