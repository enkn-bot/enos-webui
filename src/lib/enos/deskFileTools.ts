import type {
	EnosDesktopBridge,
	EnosDesktopProjectActionRequest,
	EnosDesktopProjectActionResult
} from '$lib/enos/desktopBridge';

/**
 * ENOS Desk file-tool contract (Phase 1 of native tool-calling).
 *
 * These are OpenAI-format function specs the model can call, plus an executor
 * that runs each call against the local Electron bridge (`window.enosDesktop`).
 * This replaces the brittle regex intent-parser (`projectChatActions.ts`): the
 * model decides *which* tool to call and supplies generated content directly,
 * so any phrasing and multi-step work is handled by reasoning, not matching.
 *
 * Mutations flow through the bridge's existing permission gate — a write/delete
 * returns `status: 'requires_confirmation'` until re-run with `confirmed: true`.
 */

export type DeskToolName =
	| 'list_files'
	| 'read_file'
	| 'write_file'
	| 'edit_file'
	| 'create_folder'
	| 'rename_entry'
	| 'delete_entry'
	| 'reveal_entry'
	| 'git_status'
	| 'git_stage'
	| 'git_commit'
	| 'git_create_branch';

type DeskToolParameter =
	| { type: 'string'; description: string }
	| { type: 'array'; description: string; items: { type: 'string' } };

export type DeskToolSpec = {
	type: 'function';
	function: {
		name: DeskToolName;
		description: string;
		parameters: {
			type: 'object';
			properties: Record<string, DeskToolParameter>;
			required: string[];
		};
	};
};

const str = (description: string): DeskToolParameter => ({ type: 'string', description });
const strArray = (description: string): DeskToolParameter => ({
	type: 'array',
	description,
	items: { type: 'string' }
});

export const DESK_FILE_TOOLS: DeskToolSpec[] = [
	{
		type: 'function',
		function: {
			name: 'list_files',
			description:
				'List files and folders inside the selected project, at a project-relative path (default the project root).',
			parameters: {
				type: 'object',
				properties: { path: str('Project-relative folder path. Omit or "." for the root.') },
				required: []
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'read_file',
			description: 'Read the UTF-8 contents of a file at a project-relative path.',
			parameters: {
				type: 'object',
				properties: { path: str('Project-relative file path to read.') },
				required: ['path']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'write_file',
			description:
				'Create or overwrite a file with the full content you supply. Use for new files or full rewrites.',
			parameters: {
				type: 'object',
				properties: {
					path: str('Project-relative file path to write.'),
					content: str('The complete file content to write.')
				},
				required: ['path', 'content']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'edit_file',
			description:
				'Make a targeted edit by replacing an exact, unique snippet with new text. Prefer this over write_file for small changes to existing files.',
			parameters: {
				type: 'object',
				properties: {
					path: str('Project-relative file path to edit.'),
					old_text: str('The exact existing text to replace. Must occur exactly once in the file.'),
					new_text: str('The replacement text.')
				},
				required: ['path', 'old_text', 'new_text']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'create_folder',
			description: 'Create a new folder at a project-relative path.',
			parameters: {
				type: 'object',
				properties: { path: str('Project-relative folder path to create.') },
				required: ['path']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'rename_entry',
			description: 'Rename or move a file/folder within the project.',
			parameters: {
				type: 'object',
				properties: {
					path: str('Current project-relative path.'),
					to_path: str('New project-relative path.')
				},
				required: ['path', 'to_path']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'delete_entry',
			description: 'Move a file/folder to the trash.',
			parameters: {
				type: 'object',
				properties: { path: str('Project-relative path to delete.') },
				required: ['path']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'reveal_entry',
			description: 'Reveal a file/folder in the OS file manager (Finder).',
			parameters: {
				type: 'object',
				properties: { path: str('Project-relative path to reveal.') },
				required: ['path']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'git_status',
			description:
				'Report the project\'s git state: current branch and changed/untracked files (read-only, no network). Use to orient before suggesting or making changes.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'git_stage',
			description:
				'Stage one or more project-relative paths with git add. This is local-only and always requires user confirmation before it mutates the repository.',
			parameters: {
				type: 'object',
				properties: {
					paths: strArray('Project-relative file or folder paths to stage.')
				},
				required: ['paths']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'git_commit',
			description:
				'Commit already-staged changes using the supplied non-empty message. This is local-only and always requires user confirmation.',
			parameters: {
				type: 'object',
				properties: {
					message: str('Commit message to pass to git commit -m.')
				},
				required: ['message']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'git_create_branch',
			description:
				'Create and switch to a new local branch with git checkout -b. Use only for new branch names; never for existing refs.',
			parameters: {
				type: 'object',
				properties: {
					branch_name: str('New branch name to create and switch to.')
				},
				required: ['branch_name']
			}
		}
	}
];

/** Short human label for a tool step, shown live in the chat status line. */
export const describeDeskTool = (
	name: string,
	args: Record<string, unknown>,
	phase: 'start' | 'end'
): string => {
	const p = typeof args.path === 'string' ? args.path : '';
	const to = typeof args.to_path === 'string' ? args.to_path : '';
	const paths = Array.isArray(args.paths) ? args.paths.filter((v) => typeof v === 'string') : [];
	const gitPaths = paths.length > 0 ? paths.join(', ') : 'paths';
	const branch = typeof args.branch_name === 'string' ? args.branch_name : '';
	const verb = (running: string, done: string) => (phase === 'start' ? running : done);
	switch (name) {
		case 'list_files': return verb(`Listing ${p || 'files'}`, `Listed ${p || 'files'}`);
		case 'read_file': return verb(`Reading ${p}`, `Read ${p}`);
		case 'write_file': return verb(`Writing ${p}`, `Wrote ${p}`);
		case 'edit_file': return verb(`Editing ${p}`, `Edited ${p}`);
		case 'create_folder': return verb(`Creating folder ${p}`, `Created folder ${p}`);
		case 'rename_entry': return verb(`Renaming ${p} → ${to}`, `Renamed ${p} → ${to}`);
		case 'delete_entry': return verb(`Deleting ${p}`, `Deleted ${p}`);
		case 'reveal_entry': return verb(`Revealing ${p}`, `Revealed ${p}`);
		case 'git_status': return verb('Checking git status', 'Checked git status');
		case 'git_stage': return verb(`Staging ${gitPaths}`, `Staged ${gitPaths}`);
		case 'git_commit': return verb('Committing staged changes', 'Committed staged changes');
		case 'git_create_branch': return verb(`Creating branch ${branch}`, `Created branch ${branch}`);
		default: return verb('Working', 'Done');
	}
};

export type DeskToolResult =
	| { status: 'ok'; summary: string; data?: unknown }
	| {
			status: 'requires_confirmation';
			summary: string;
			request: EnosDesktopProjectActionRequest;
	  }
	| { status: 'error'; message: string };

type ExecuteArgs = {
	bridge: EnosDesktopBridge;
	folderId: string;
	name: string;
	args: Record<string, unknown>;
	/** Set true once the user has approved the pending mutation. */
	confirmed?: boolean;
};

const isConfirmationRequest = (
	value: EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult
): value is EnosDesktopProjectActionRequest => value.status === 'requires_confirmation';

const normalizeMutation = (
	value: EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult
): DeskToolResult =>
	isConfirmationRequest(value)
		? { status: 'requires_confirmation', summary: `${value.action} ${value.path}`, request: value }
		: { status: 'ok', summary: `${value.status} ${value.path}${value.toPath ? ` → ${value.toPath}` : ''}` };

const requireString = (args: Record<string, unknown>, key: string): string => {
	const value = args[key];
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`Missing required argument: ${key}`);
	}
	return value;
};

const requireStringArray = (args: Record<string, unknown>, key: string): string[] => {
	const value = args[key];
	if (
		!Array.isArray(value) ||
		value.length === 0 ||
		value.some((item) => typeof item !== 'string' || item.length === 0)
	) {
		throw new Error(`Missing required argument: ${key}`);
	}
	return value;
};

export const executeDeskFileTool = async ({
	bridge,
	folderId,
	name,
	args,
	confirmed = false
}: ExecuteArgs): Promise<DeskToolResult> => {
	const options = { confirmed };
	try {
		switch (name) {
			case 'list_files': {
				const path = typeof args.path === 'string' && args.path ? args.path : '.';
				const listing = await bridge.listProjectFiles(folderId, path);
				const lines = listing.entries.map((e) =>
					e.type === 'directory' ? `${e.path}/` : `${e.path}${e.size != null ? ` (${e.size}b)` : ''}`
				);
				return {
					status: 'ok',
					summary: `${listing.entries.length} entries in ${listing.path}`,
					data: lines.join('\n')
				};
			}
			case 'read_file': {
				const path = requireString(args, 'path');
				const preview = await bridge.readProjectFile(folderId, path);
				if (preview.encoding !== 'utf8') {
					return { status: 'ok', summary: `read ${path} (non-text)`, data: '[non-text file]' };
				}
				return { status: 'ok', summary: `read ${path}`, data: preview.data };
			}
			case 'write_file': {
				const path = requireString(args, 'path');
				const content = requireString(args, 'content');
				return normalizeMutation(await bridge.writeProjectFile(folderId, path, content, options));
			}
			case 'edit_file': {
				const path = requireString(args, 'path');
				const oldText = requireString(args, 'old_text');
				const newText = typeof args.new_text === 'string' ? args.new_text : '';
				const preview = await bridge.readProjectFile(folderId, path);
				if (preview.encoding !== 'utf8') {
					return { status: 'error', message: `Cannot edit non-text file: ${path}` };
				}
				const occurrences = preview.data.split(oldText).length - 1;
				if (occurrences === 0) {
					return { status: 'error', message: `old_text not found in ${path}; nothing edited.` };
				}
				if (occurrences > 1) {
					return {
						status: 'error',
						message: `old_text occurs ${occurrences} times in ${path}; make it unique so the edit is unambiguous.`
					};
				}
				const updated = preview.data.replace(oldText, newText);
				return normalizeMutation(await bridge.writeProjectFile(folderId, path, updated, options));
			}
			case 'create_folder': {
				const path = requireString(args, 'path');
				return normalizeMutation(await bridge.createProjectFolder(folderId, path, options));
			}
			case 'rename_entry': {
				const path = requireString(args, 'path');
				const toPath = requireString(args, 'to_path');
				return normalizeMutation(await bridge.renameProjectEntry(folderId, path, toPath, options));
			}
			case 'delete_entry': {
				const path = requireString(args, 'path');
				return normalizeMutation(await bridge.deleteProjectEntry(folderId, path, options));
			}
			case 'reveal_entry': {
				const path = requireString(args, 'path');
				const result = await bridge.revealProjectEntry(folderId, path);
				return { status: 'ok', summary: `${result.status} ${result.path}` };
			}
			case 'git_status': {
				if (!bridge.getProjectGitStatus) {
					return { status: 'error', message: 'git status is unavailable in this ENOS Desk build.' };
				}
				const git = await bridge.getProjectGitStatus(folderId);
				if (!git.isRepo) {
					return { status: 'ok', summary: 'This project is not a git repository.', data: '' };
				}
				const changed = git.statusLines.length;
				return {
					status: 'ok',
					summary: `On branch ${git.branch ?? 'unknown'}, ${changed} changed file${changed === 1 ? '' : 's'}.`,
					data: git.statusLines.join('\n')
				};
			}
			case 'git_stage': {
				if (!bridge.gitStage) {
					return { status: 'error', message: 'git staging is unavailable in this ENOS Desk build.' };
				}
				const paths = requireStringArray(args, 'paths');
				return normalizeMutation(await bridge.gitStage(folderId, paths, options));
			}
			case 'git_commit': {
				if (!bridge.gitCommit) {
					return { status: 'error', message: 'git commit is unavailable in this ENOS Desk build.' };
				}
				const message = requireString(args, 'message');
				return normalizeMutation(await bridge.gitCommit(folderId, message, options));
			}
			case 'git_create_branch': {
				if (!bridge.gitCreateBranch) {
					return {
						status: 'error',
						message: 'git branch creation is unavailable in this ENOS Desk build.'
					};
				}
				const branchName = requireString(args, 'branch_name');
				return normalizeMutation(await bridge.gitCreateBranch(folderId, branchName, options));
			}
			default:
				if (name.startsWith('git_')) {
					return {
						status: 'error',
						message:
							'Unsupported git operation. ENOS Desk only allows git_status, git_stage, git_commit, and git_create_branch.'
					};
				}
				return { status: 'error', message: `Unknown tool: ${name}` };
		}
	} catch (error) {
		return { status: 'error', message: error instanceof Error ? error.message : String(error) };
	}
};
