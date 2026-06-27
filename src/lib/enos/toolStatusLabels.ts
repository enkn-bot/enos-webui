/**
 * Contextual tool label formatters — enrich raw tool + args into readable
 * status descriptions for both Chat (verbose) and Desk (compact) surfaces.
 *
 * Reuses the OWUI statusHistory protocol; never modifies base rendering.
 */
export type ToolInfo = { tool: string; input?: Record<string, unknown> };

const FILE_TOOLS = new Set([
	'read', 'read_file', 'write', 'write_file', 'edit', 'edit_file',
	'patch', 'create_folder', 'mkdir', 'delete', 'remove', 'rename', 'move', 'reveal'
]);

/** Extract the most meaningful snippet from tool args for status context. */
const toolContext = (tool: string, input?: Record<string, unknown>): string => {
	if (!input || typeof input !== 'object') return '';

	if (input.path && typeof input.path === 'string') return input.path;
	if (input.file_path && typeof input.file_path === 'string') return input.file_path;
	if (input.query && typeof input.query === 'string') return input.query.substring(0, 60);
	if (input.command && typeof input.command === 'string') return input.command.substring(0, 40);

	// Fallback: first string value that looks meaningful
	for (const v of Object.values(input)) {
		if (typeof v === 'string' && v.length > 2 && v.length < 100 && !v.startsWith('{') && !v.startsWith('[')) {
			return v;
		}
	}
	return '';
};

/** Human-readable tool name for status labels. */
const toolName = (tool: string): string => {
	const map: Record<string, string> = {
		read: 'Read', read_file: 'Read',
		write: 'Write', write_file: 'Write',
		edit: 'Edit', edit_file: 'Edit', patch: 'Edit',
		create_folder: 'Create folder', mkdir: 'Create folder',
		delete: 'Delete', remove: 'Delete',
		rename: 'Rename', move: 'Move',
		reveal: 'Reveal',
		list: 'List', ls: 'List',
		web_search: 'Search', web_search_queries_generated: 'Search',
		bash: 'Run', execute: 'Run', run: 'Run',
		code_interpreter: 'Code',
		git_status: 'Git status', git_diff: 'Git diff',
	};
	return map[tool] ?? tool.charAt(0).toUpperCase() + tool.slice(1);
};

/**
 * Build a compact one-line status description for a tool start event.
 * Chat surface uses this verbatim; Desk surface abbreviates further.
 * Returns e.g. "Searching Gemini pricing 2026" or "Read src/main.ts"
 */
export const formatToolStartStatus = (tool: string, input?: Record<string, unknown>): string => {
	const name = toolName(tool);
	const ctx = toolContext(tool, input);

	if (FILE_TOOLS.has(tool) && ctx) {
		return `${name} ${ctx}`;
	}
	if (tool === 'web_search' && ctx) {
		return `Searching ${ctx}`;
	}
	if ((tool === 'bash' || tool === 'execute' || tool === 'run') && ctx) {
		return `Run ${ctx}`;
	}
	// Default: append context if present
	return ctx ? `${name} ${ctx}` : `${name}`;
};

/**
 * Build a compact one-line status description for a tool end event.
 */
export const formatToolEndStatus = (tool: string, ok: boolean): string => {
	const name = toolName(tool);
	return ok ? name : `${name} (failed)`;
};

/**
 * Extract a short summary of tool input for Desk's compact label.
 * Returns e.g. "main.ts" (just the filename, not full path).
 */
export const compactToolContext = (tool: string, input?: Record<string, unknown>): string => {
	const ctx = toolContext(tool, input);
	if (!ctx) return '';

	if (FILE_TOOLS.has(tool)) {
		// Show just the filename or last path segment
		const parts = ctx.replace(/\/$/, '').split('/');
		return parts[parts.length - 1] || ctx;
	}
	if (tool === 'web_search') {
		return ctx.length > 30 ? ctx.substring(0, 28) + '…' : ctx;
	}
	return ctx.length > 20 ? ctx.substring(0, 18) + '…' : ctx;
};
