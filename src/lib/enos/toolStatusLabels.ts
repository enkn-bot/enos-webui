/**
 * Contextual tool label formatters — enrich raw tool + args into readable
 * status descriptions for both Chat (verbose) and Desk (compact) surfaces.
 *
 * Reuses the OWUI statusHistory protocol; never modifies base rendering.
 */
export type ToolInfo = { tool: string; input?: Record<string, unknown> };

const FILE_TOOLS = new Set([
	'read',
	'read_file',
	'write',
	'write_file',
	'edit',
	'edit_file',
	'patch',
	'create_folder',
	'mkdir',
	'delete',
	'remove',
	'rename',
	'move',
	'reveal'
]);

/** Extract the most meaningful snippet from tool args for status context. */
const toolContext = (input?: Record<string, unknown>): string => {
	if (!input || typeof input !== 'object') return '';

	if (input.path && typeof input.path === 'string') return input.path;
	if (input.file_path && typeof input.file_path === 'string') return input.file_path;
	if (input.query && typeof input.query === 'string') return input.query.substring(0, 60);
	if (input.command && typeof input.command === 'string') return input.command.substring(0, 40);

	// Fallback: first string value that looks meaningful
	for (const v of Object.values(input)) {
		if (
			typeof v === 'string' &&
			v.length > 2 &&
			v.length < 100 &&
			!v.startsWith('{') &&
			!v.startsWith('[')
		) {
			return v;
		}
	}
	return '';
};

/** Human-readable tool name for status labels. */
const toolName = (tool: string): string => {
	const map: Record<string, string> = {
		read: 'Read',
		read_file: 'Read',
		write: 'Write',
		write_file: 'Write',
		edit: 'Edit',
		edit_file: 'Edit',
		patch: 'Edit',
		create_folder: 'Create folder',
		mkdir: 'Create folder',
		delete: 'Delete',
		remove: 'Delete',
		rename: 'Rename',
		move: 'Move',
		reveal: 'Reveal',
		list: 'List',
		ls: 'List',
		web_search: 'Search',
		web_search_queries_generated: 'Search',
		bash: 'Run',
		execute: 'Run',
		run: 'Run',
		code_interpreter: 'Code',
		git_status: 'Git status',
		git_diff: 'Git diff'
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
	const ctx = toolContext(input);

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
 * Build a compact one-line status description for a tool end event. Prefers the
 * contextual label captured at tool_start (e.g. "Read src/main.ts") so completion
 * keeps the context; falls back to the bare tool name when no start label is given.
 */
export const formatToolEndStatus = (
	tool: string,
	ok: boolean,
	startDescription?: string
): string => {
	const base = startDescription?.trim() ? startDescription.trim() : toolName(tool);
	return ok ? base : `${base} (failed)`;
};

/**
 * Open-tray outcome (Desk slice 4): a tool's COMPLETION carries the operational
 * result, not just the start label — e.g. "Edit src/parser.ts" → "Edited
 * src/parser.ts · 12 passed". The detail comes from the structured Pi tool event
 * (Pi tool result state), on the SAME statusHistory channel — no parallel
 * timeline. Defensive: an absent/empty detail degrades to the plain end label, so
 * a tool that emits no structured outcome behaves exactly as before.
 */
export const formatToolOutcome = (
	tool: string,
	ok: boolean,
	startDescription?: string,
	detail?: string
): string => {
	const base = formatToolEndStatus(tool, ok, startDescription);
	const d = (detail ?? '').trim();
	// Only enrich a successful step; failures keep the explicit "(failed)" label.
	if (!d || !ok) return base;
	// Don't duplicate when the detail already echoes the base label.
	if (base.includes(d) || d.includes(base)) return d.length >= base.length ? d : base;
	return `${base} · ${d}`;
};

/**
 * Pull a short outcome detail from a Pi completed tool result state.
 * Prefers the structured `title` (a human one-liner like "12 passed" or the edited
 * path); never the raw `output` (can be a whole file / huge). Defensive by design:
 * unknown shapes return '' so the caller falls back to the plain end label. The
 * exact field is verified live (the bridge session) — this reader is safe either way.
 */
export const extractPiToolOutcome = (state: unknown): string => {
	if (!state || typeof state !== 'object') return '';
	const title = (state as Record<string, unknown>).title;
	if (typeof title !== 'string') return '';
	const trimmed = title.trim();
	if (!trimmed) return '';
	// Cap so the tray stays one calm line.
	return trimmed.length > 60 ? trimmed.slice(0, 58) + '…' : trimmed;
};

/**
 * Extract a short summary of tool input for Desk's compact label.
 * Returns e.g. "main.ts" (just the filename, not full path).
 */
export const compactToolContext = (tool: string, input?: Record<string, unknown>): string => {
	const ctx = toolContext(input);
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
