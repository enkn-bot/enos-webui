import type {
	EnosDesktopBridge,
	EnosDesktopProjectActionRequest,
	EnosDesktopProjectActionResult
} from '$lib/enos/desktopBridge';
import { processWebSearch, queryCollection } from '$lib/apis/retrieval';

/**
 * ENOS Desk file-tool contract (Phase 1 of native tool-calling).
 *
 * These are OpenAI-format function specs the model can call, plus an executor
 * that runs each call against the local Electron bridge (`window.enosDesktop`).
 * This replaces the brittle legacy intent parser: the
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
	| 'web_search'
	| 'git_status'
	| 'git_log'
	| 'git_diff'
	| 'git_stage'
	| 'git_commit'
	| 'git_create_branch'
	| 'git_clone';

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
				"List files and folders at a project-relative path, an absolute path, or a ~/... home path (for example ~/Desktop). Reads may reach elsewhere on the user's machine subject to the active permission mode; secrets such as .ssh, .env, and credentials are off-limits unless Full Access is active.",
			parameters: {
				type: 'object',
				properties: {
					path: str(
						'Project-relative, absolute, or ~/... folder path. Omit or "." for the project root; use paths like ~/Desktop for non-project folders.'
					)
				},
				required: []
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'read_file',
			description:
				"Read the UTF-8 contents of a file at a project-relative path, an absolute path, or a ~/... home path (for example ~/Desktop/notes.txt). Reads may reach elsewhere on the user's machine subject to the active permission mode; secrets such as .ssh, .env, and credentials are off-limits unless Full Access is active.",
			parameters: {
				type: 'object',
				properties: {
					path: str(
						'Project-relative, absolute, or ~/... file path to read, such as README.md or ~/Desktop/notes.txt.'
					)
				},
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
					path: str(
						'Project-relative, absolute, or ~/... path. Writing outside the active project requires Full Access; in Auto mode only the project is writable. Sensitive paths (.ssh, .env, credentials) are always off-limits unless Full Access is active.'
					),
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
					path: str(
						'Project-relative, absolute, or ~/... path. Writing outside the active project requires Full Access; in Auto mode only the project is writable. Sensitive paths (.ssh, .env, credentials) are always off-limits unless Full Access is active.'
					),
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
				properties: {
					path: str(
						'Project-relative, absolute, or ~/... path. Writing outside the active project requires Full Access; in Auto mode only the project is writable. Sensitive paths (.ssh, .env, credentials) are always off-limits unless Full Access is active.'
					)
				},
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
					path: str(
						'Project-relative, absolute, or ~/... path. Writing outside the active project requires Full Access; in Auto mode only the project is writable. Sensitive paths (.ssh, .env, credentials) are always off-limits unless Full Access is active.'
					),
					to_path: str(
						'Project-relative, absolute, or ~/... path. Writing outside the active project requires Full Access; in Auto mode only the project is writable. Sensitive paths (.ssh, .env, credentials) are always off-limits unless Full Access is active.'
					)
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
				properties: {
					path: str(
						'Project-relative, absolute, or ~/... path. Writing outside the active project requires Full Access; in Auto mode only the project is writable. Sensitive paths (.ssh, .env, credentials) are always off-limits unless Full Access is active.'
					)
				},
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
			name: 'web_search',
			description:
				'Use this for current events, real-time info, news, scores, prices, recent events, or anything you do not know from training data.',
			parameters: {
				type: 'object',
				properties: { query: str('Search query to send to web search.') },
				required: ['query']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'git_status',
			description:
				"Report the project's git state: current branch and changed/untracked files (read-only, no network). Use to orient before suggesting or making changes.",
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'git_log',
			description:
				'Show recent commits on the current branch: short hash, author date, and subject. Read-only, capped, no network.',
			parameters: { type: 'object', properties: {}, required: [] }
		}
	},
	{
		type: 'function',
		function: {
			name: 'git_diff',
			description:
				'Show the current working-tree diff, optionally scoped to a project-relative path. Read-only, capped, no network, and sensitive paths are redacted by the bridge.',
			parameters: {
				type: 'object',
				properties: {
					path: str('Optional project-relative file or folder path to scope the diff.')
				},
				required: []
			}
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
	},
	{
		type: 'function',
		function: {
			name: 'git_clone',
			description:
				'Clone an HTTPS git repository into a new project-relative subdirectory of the active workspace. This performs a shallow local clone and always requires user confirmation before network access.',
			parameters: {
				type: 'object',
				properties: {
					url: str('HTTPS repository URL to clone. Other schemes are refused.'),
					target_path: str('New project-relative subdirectory to clone into.')
				},
				required: ['url', 'target_path']
			}
		}
	}
];

/** Short human label for a tool step, shown live in the chat status line. */
export const describeDeskTool = (
	name: string,
	args: Record<string, unknown>,
	phase: 'start' | 'end',
	// Outcome of the completed step. When a mutation is blocked (read-only mode),
	// declined, or errors, the done-label must NOT claim success — "Deleted X" on a
	// blocked delete is a false audit trail. Pass ok=false to render the failed form.
	ok: boolean = true
): string => {
	const p = typeof args.path === 'string' ? args.path : '';
	const to = typeof args.to_path === 'string' ? args.to_path : '';
	const paths = Array.isArray(args.paths) ? args.paths.filter((v) => typeof v === 'string') : [];
	const gitPaths = paths.length > 0 ? paths.join(', ') : 'paths';
	const branch = typeof args.branch_name === 'string' ? args.branch_name : '';
	const targetPath = typeof args.target_path === 'string' ? args.target_path : '';
	const verb = (running: string, done: string, failed?: string) =>
		phase === 'start' ? running : !ok ? (failed ?? `Failed: ${running.toLowerCase()}`) : done;
	switch (name) {
		case 'list_files':
			return verb(`Listing ${p || 'files'}`, `Listed ${p || 'files'}`);
		case 'read_file':
			return verb(`Reading ${p}`, `Read ${p}`);
		case 'write_file':
			return verb(`Writing ${p}`, `Wrote ${p}`, `Couldn't write ${p}`);
		case 'edit_file':
			return verb(`Editing ${p}`, `Edited ${p}`, `Couldn't edit ${p}`);
		case 'create_folder':
			return verb(`Creating folder ${p}`, `Created folder ${p}`, `Couldn't create folder ${p}`);
		case 'rename_entry':
			return verb(`Renaming ${p} → ${to}`, `Renamed ${p} → ${to}`, `Couldn't rename ${p}`);
		case 'delete_entry':
			return verb(`Deleting ${p}`, `Deleted ${p}`, `Couldn't delete ${p}`);
		case 'reveal_entry':
			return verb(`Revealing ${p}`, `Revealed ${p}`);
		case 'web_search': {
			// Context-focused narration: surface what we're actually looking for
			// (e.g. "Searching the web for 'latest scores'") instead of a rigid,
			// repeated "Searched the web". Mirrors base OWUI showing the query.
			const q = typeof args.query === 'string' ? args.query.trim() : '';
			return q
				? verb(`Searching the web for “${q}”`, `Searched the web for “${q}”`)
				: verb('Searching the web', 'Searched the web');
		}
		case 'git_status':
			return verb('Checking git status', 'Checked git status');
		case 'git_log':
			return verb('Reading git log', 'Read git log');
		case 'git_diff':
			return verb(
				`Reading git diff${p ? ` for ${p}` : ''}`,
				`Read git diff${p ? ` for ${p}` : ''}`
			);
		case 'git_stage':
			return verb(`Staging ${gitPaths}`, `Staged ${gitPaths}`, `Couldn't stage ${gitPaths}`);
		case 'git_commit':
			return verb('Committing staged changes', 'Committed staged changes', "Couldn't commit");
		case 'git_create_branch':
			return verb(
				`Creating branch ${branch}`,
				`Created branch ${branch}`,
				`Couldn't create branch ${branch}`
			);
		case 'git_clone':
			return verb(
				`Cloning into ${targetPath}`,
				`Cloned into ${targetPath}`,
				`Couldn't clone into ${targetPath}`
			);
		default:
			return verb('Working', 'Done');
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
	token?: string;
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
		: {
				status: 'ok',
				summary: `${value.status} ${value.path}${value.toPath ? ` → ${value.toPath}` : ''}`
			};

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

const WEB_SEARCH_UNAVAILABLE = 'Web search is not available.';
// Empty/failed lookup is a transient miss, not proof of absence. Tell the model
// to degrade gracefully instead of bare-punting "I can't access real-time data".
// Mirrors the chat pipe's retrieval-miss degrade note.
const WEB_SEARCH_EMPTY =
	'The live web lookup for this query returned no usable results. Do not reply that ' +
	'you cannot access real-time data, and do not claim the named item does not exist ' +
	'or was never released — an empty lookup is a transient miss, not proof. Give your ' +
	'best reliable knowledge, clearly flagged as possibly out of date, and tell the user ' +
	'the live lookup came back empty so they can retry or check the official source. If ' +
	'you genuinely know nothing about it, say the lookup returned nothing and suggest ' +
	'retrying — never invent details.';
const WEB_SEARCH_RESULT_LIMIT = 5;
const WEB_SEARCH_CHUNK_LIMIT = 800;

const textValue = (value: unknown): string => {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return '';
};

const firstTextValue = (record: Record<string, unknown>, keys: string[]): string => {
	for (const key of keys) {
		const text = textValue(record[key]);
		if (text) return text;
	}
	return '';
};

const truncateWebSearchChunk = (text: string): string =>
	text.length > WEB_SEARCH_CHUNK_LIMIT ? `${text.slice(0, WEB_SEARCH_CHUNK_LIMIT - 3)}...` : text;

const firstArray = (value: unknown): unknown[] => {
	if (!Array.isArray(value)) return [];
	return Array.isArray(value[0]) ? value[0] : value;
};

const extractRetrievedWebSearchChunks = (documents: unknown): string[] =>
	firstArray(documents)
		.filter((chunk): chunk is string => typeof chunk === 'string' && chunk.trim().length > 0)
		.slice(0, WEB_SEARCH_RESULT_LIMIT);

const getRetrievedWebSearchMetadata = (
	metadatas: unknown,
	index: number
): Record<string, unknown> => {
	const metadata = firstArray(metadatas)[index];
	return metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
};

// Bypass mode (`BYPASS_WEB_SEARCH_EMBEDDING_AND_RETRIEVAL`) returns full page
// content inline as `docs`, skipping the vector store — use it directly, like
// the chat pipe does, instead of re-querying a collection.
const formatInlineWebDocs = (
	docs: { content?: string; metadata?: Record<string, unknown> }[]
): string => {
	const formatted = docs
		.slice(0, WEB_SEARCH_RESULT_LIMIT)
		.map((doc) => {
			const meta = doc?.metadata ?? {};
			const source = firstTextValue(meta, ['source', 'link', 'title']) || 'unknown';
			const content = String(doc?.content ?? '').trim();
			return content ? `[source: ${source}]\n${truncateWebSearchChunk(content)}` : '';
		})
		.filter((entry) => entry.length > 0);
	return formatted.length === 0 ? WEB_SEARCH_UNAVAILABLE : formatted.join('\n\n');
};

const formatRetrievedWebSearchChunks = (value: unknown): string => {
	if (!value || typeof value !== 'object') return WEB_SEARCH_UNAVAILABLE;
	const record = value as Record<string, unknown>;
	const chunks = extractRetrievedWebSearchChunks(record.documents);
	if (chunks.length === 0) return WEB_SEARCH_UNAVAILABLE;

	return chunks
		.map((chunk, index) => {
			const metadata = getRetrievedWebSearchMetadata(record.metadatas, index);
			const source = firstTextValue(metadata, ['source', 'link', 'title']) || 'unknown';
			return `[source: ${source}]\n${truncateWebSearchChunk(chunk.trim())}`;
		})
		.join('\n\n');
};

export const executeDeskFileTool = async ({
	bridge,
	folderId,
	name,
	args,
	token = '',
	confirmed = false
}: ExecuteArgs): Promise<DeskToolResult> => {
	const options = { confirmed };
	try {
		switch (name) {
			case 'list_files': {
				const path = typeof args.path === 'string' && args.path ? args.path : '.';
				const listing = await bridge.listProjectFiles(folderId, path);
				const lines = listing.entries.map((e) =>
					e.type === 'directory'
						? `${e.path}/`
						: `${e.path}${e.size != null ? ` (${e.size}b)` : ''}`
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
			case 'web_search': {
				const query = requireString(args, 'query');
				if (!token) {
					return {
						status: 'ok',
						summary: WEB_SEARCH_UNAVAILABLE,
						data: WEB_SEARCH_UNAVAILABLE
					};
				}
				try {
					const search = await processWebSearch(token, query);
					let data: string;

					if (Array.isArray(search?.docs) && search.docs.length > 0) {
						// Bypass mode: backend returned full page content inline.
						data = formatInlineWebDocs(search.docs);
					} else {
						// Embedding mode: a collection was created. `collection_names`
						// is the current (plural) field; tolerate the legacy singular.
						const collection = search?.collection_names?.[0] ?? search?.collection_name ?? null;
						if (!collection) {
							return {
								status: 'ok',
								summary: 'Web search returned no results.',
								data: WEB_SEARCH_EMPTY
							};
						}
						const retrieved = await queryCollection(
							token,
							collection,
							query,
							WEB_SEARCH_RESULT_LIMIT
						);
						data = formatRetrievedWebSearchChunks(retrieved);
					}

					if (data === WEB_SEARCH_UNAVAILABLE) {
						// Empty result — degrade note, not the misleading "unavailable".
						return {
							status: 'ok',
							summary: 'Web search returned no results.',
							data: WEB_SEARCH_EMPTY
						};
					}
					return {
						status: 'ok',
						summary: 'Web search results returned.',
						data
					};
				} catch {
					return {
						status: 'ok',
						summary: 'Web search returned no results.',
						data: WEB_SEARCH_EMPTY
					};
				}
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
			case 'git_log': {
				if (!bridge.getProjectGitLog) {
					return { status: 'error', message: 'git log is unavailable in this ENOS Desk build.' };
				}
				const git = await bridge.getProjectGitLog(folderId);
				if (!git.isRepo) {
					return { status: 'ok', summary: 'This project is not a git repository.', data: '' };
				}
				const count = git.logLines.length;
				return {
					status: 'ok',
					summary: `${count} recent commit${count === 1 ? '' : 's'}${git.truncated ? ' (truncated)' : ''}.`,
					data: git.logLines.join('\n')
				};
			}
			case 'git_diff': {
				if (!bridge.getProjectGitDiff) {
					return { status: 'error', message: 'git diff is unavailable in this ENOS Desk build.' };
				}
				const path = typeof args.path === 'string' && args.path ? args.path : undefined;
				const git = await bridge.getProjectGitDiff(folderId, path);
				if (!git.isRepo) {
					return { status: 'ok', summary: 'This project is not a git repository.', data: '' };
				}
				return {
					status: 'ok',
					summary: `${git.diff ? 'diff' : 'no working-tree diff'} for ${git.path}${git.truncated ? ' (truncated)' : ''}`,
					data: git.diff
				};
			}
			case 'git_stage': {
				if (!bridge.gitStage) {
					return {
						status: 'error',
						message: 'git staging is unavailable in this ENOS Desk build.'
					};
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
			case 'git_clone': {
				if (!bridge.gitClone) {
					return {
						status: 'error',
						message: 'git clone is unavailable in this ENOS Desk build.'
					};
				}
				const repositoryUrl = requireString(args, 'url');
				const targetPath = requireString(args, 'target_path');
				return normalizeMutation(
					await bridge.gitClone(folderId, repositoryUrl, targetPath, options)
				);
			}
			default:
				if (name.startsWith('git_')) {
					return {
						status: 'error',
						message:
							'Unsupported git operation. ENOS Desk only allows git_status, git_log, git_diff, git_stage, git_commit, git_create_branch, and git_clone.'
					};
				}
				return { status: 'error', message: `Unknown tool: ${name}` };
		}
	} catch (error) {
		return { status: 'error', message: error instanceof Error ? error.message : String(error) };
	}
};
