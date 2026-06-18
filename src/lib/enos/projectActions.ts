import type {
	EnosDesktopBridge,
	EnosDesktopEntry,
	EnosDesktopProjectDirectoryListing,
	EnosDesktopProjectFilePreview
} from '$lib/enos/desktopBridge';

const SUMMARY_FILE_NAMES = new Set([
	'README.md',
	'readme.md',
	'package.json',
	'pyproject.toml',
	'server.js',
	'index.js',
	'app.js'
]);

const MAX_ROOT_ENTRIES = 80;
const MAX_SUMMARY_FILES = 3;
const MAX_SUMMARY_CHARS = 3000;

type BuildProjectActionContextArgs = {
	bridge: EnosDesktopBridge | null;
	folderId?: string | null;
	activePath?: string | null;
	prompt?: string;
};

const formatEntry = (entry: EnosDesktopEntry) =>
	entry.type === 'directory'
		? `- ${entry.path}/`
		: `- ${entry.path} (${entry.size ?? 'unknown'} bytes)`;

const shouldReadSummaryFiles = (prompt = '') =>
	/\b(project|folder|files?|readme|package|what.*about|what.*in|structure|contents?)\b/i.test(prompt);

const selectSummaryEntries = (listing: EnosDesktopProjectDirectoryListing) =>
	listing.entries
		.filter((entry) => entry.type === 'file' && SUMMARY_FILE_NAMES.has(entry.name))
		.slice(0, MAX_SUMMARY_FILES);

const normalizeProjectPath = (path?: string | null) => {
	const value = String(path || '.').trim();
	return value === '' ? '.' : value;
};

const formatPreview = (preview: EnosDesktopProjectFilePreview) => {
	if (preview.encoding !== 'utf8') return `### ${preview.path}\n[non-text preview omitted]`;
	const text =
		preview.data.length > MAX_SUMMARY_CHARS
			? `${preview.data.slice(0, MAX_SUMMARY_CHARS).trimEnd()}\n[truncated]`
			: preview.data;
	return `### ${preview.path}\n${text}`;
};

export const buildProjectActionContext = async ({
	bridge,
	folderId,
	activePath: rawActivePath = '.',
	prompt = ''
}: BuildProjectActionContextArgs): Promise<string> => {
	if (!bridge || !folderId) return '';

	const activePath = normalizeProjectPath(rawActivePath);
	let listing: EnosDesktopProjectDirectoryListing;
	try {
		listing = await bridge.listProjectFiles(folderId, activePath);
	} catch {
		return '';
	}

	const lines = [
		'Live local project context from ENOS Desk.',
		'Use this read-only context when the user asks about this selected project, folder, or files.',
		'This active folder listing is authoritative for questions about "this folder", "the current folder", or the Files pane.',
		'Write/edit project file actions require explicit confirmation and have not been executed.',
		'',
		`Project root: ${listing.rootName}`,
		`Active folder in ENOS Desk Files pane: ${listing.path}`,
		'Active folder files and folders:',
		...listing.entries.slice(0, MAX_ROOT_ENTRIES).map(formatEntry)
	];

	if (listing.entries.length > MAX_ROOT_ENTRIES) {
		lines.push(`- [${listing.entries.length - MAX_ROOT_ENTRIES} more entries omitted]`);
	}

	if (shouldReadSummaryFiles(prompt)) {
		const previews: EnosDesktopProjectFilePreview[] = [];
		for (const entry of selectSummaryEntries(listing)) {
			try {
				previews.push(await bridge.readProjectFile(folderId, entry.path));
			} catch {
				// A changing local filesystem should not block the model call.
			}
		}

		if (previews.length > 0) {
			lines.push('', 'Likely project summary files:', ...previews.map(formatPreview));
		}
	}

	return lines.join('\n');
};
