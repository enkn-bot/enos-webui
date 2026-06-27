// Neutral placeholder for a freshly-created project before the first build.
// Replaces the literal 'ENOS' home name, which read as meta-confusing
// ("me? the app? my project?") and spawned the 'ENOS 1'/'ENOS 2' bug trail.
export const DESK_SCAFFOLD_NAME = 'New project';

const norm = (name: unknown): string => String(name ?? '').trim();

/**
 * True when `name` is an unnamed scaffold: the neutral placeholder OR a legacy
 * 'ENOS' / 'ENOS N' home name. Used so existing rows are still treated as the
 * home scaffold (no duplicate minting) without renaming live data.
 */
export const isScaffoldName = (name: unknown): boolean => {
	const n = norm(name);
	if (!n) return false;
	if (n.toLowerCase() === DESK_SCAFFOLD_NAME.toLowerCase()) return true;
	return /^enos(\s+\d+)?$/i.test(n);
};

// deriveProjectName(firstMessage) was REMOVED in the folder-first model: a project
// is a deliberately-bound folder, never named from a message (that produced "hi" /
// "What are you?" as project names). The scaffold keeps its neutral DESK_SCAFFOLD_NAME
// and the user renames it; deliberate creation (FolderModal) is where naming happens.
// See docs/superpowers/specs/2026-06-27-desk-project-model-folder-first.md.
