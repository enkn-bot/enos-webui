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

/**
 * Derive a short project title from the user's first message — the project
 * forms around the work, name follows it (no pre-made folder to decode).
 */
export const deriveProjectName = (firstMessage: string): string => {
	const firstLine = norm(String(firstMessage ?? '').split('\n')[0]).replace(/\s+/g, ' ');
	if (!firstLine) return DESK_SCAFFOLD_NAME;
	return firstLine.length > 48 ? firstLine.slice(0, 48).trimEnd() : firstLine;
};
