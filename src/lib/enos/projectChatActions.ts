const TEST_FILE_NAME_PREFIX = 'enos-write-test';

const normalizeProjectPath = (path?: string | null) => {
	const value = String(path || '.').trim().replace(/^\.\//, '').replace(/\/+/g, '/');
	if (!value || value === '.') return '.';
	if (value.startsWith('/') || value.includes('://') || value.split('/').includes('..')) return '.';
	return value.replace(/\/$/, '');
};

const joinProjectPath = (basePath: string, fileName: string) => {
	const base = normalizeProjectPath(basePath);
	return base === '.' ? fileName : `${base}/${fileName}`;
};

const compactPrompt = (prompt: string) =>
	String(prompt || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 500);

const timestampForPath = (date: Date) =>
	date.toISOString().replace(/[:.]/g, '-').replace(/Z$/, 'Z');

export const createTestFilePath = (activePath = '.', date = new Date()) =>
	joinProjectPath(normalizeProjectPath(activePath), `${TEST_FILE_NAME_PREFIX}-${timestampForPath(date)}.txt`);

export type ProjectWriteCommand = {
	kind: 'create-test-file';
	path: string;
	content: string;
};

export type ProjectChatAction =
	| { kind: 'list-directory'; path: string }
	| { kind: 'read-file'; path: string }
	| { kind: 'create-file'; path: string; content: string }
	| { kind: 'write-file'; path: string; content: string }
	| { kind: 'create-folder'; path: string }
	| { kind: 'rename-entry'; path: string; toPath: string }
	| { kind: 'delete-entry'; path: string }
	| { kind: 'reveal-entry'; path: string }
	| { kind: 'capability'; message: string }
	| { kind: 'clarify'; message: string };

const CLARIFY_FILE_ACTION_MESSAGE =
	'Tell me the exact project file path and the change to make. For example: `Write file notes/todo.md with content: ...` or `Rename notes/todo.md to notes/done.md`.';

const PROJECT_FILE_CAPABILITY_MESSAGE =
	'Yes. In ENOS Desk I can list, read, create, write, rename, delete, reveal, and summarize files inside the selected project folder through the local desktop bridge.\n\nFor writes, give me the project-relative path and exact content. For example: `Write file notes/todo.md with content: ...`. Rename and delete still ask for confirmation.';

const normalizeActionPath = (path?: string | null, activePath = '.') => {
	const value = normalizeProjectPath(path)
		.replace(/^['"`(<[{]+/, '')
		.replace(/['"`)>}\],.:;!?]+$/, '');
	if (!value || value === '.') return '';
	const normalized = normalizeProjectPath(value);
	const base = normalizeProjectPath(activePath);
	return base !== '.' && !normalized.includes('/') ? joinProjectPath(base, normalized) : normalized;
};

const explicitProjectPathPattern =
	/`([^`\n]+)`|((?:\.\/)?(?:[A-Za-z0-9_@+.-]+\/)+[A-Za-z0-9_@+.-]+(?:\.[A-Za-z0-9]{1,12})?)/;

const bareFileReferencePattern = /\b([A-Za-z0-9_@+.-]+\.[A-Za-z0-9]{1,12})\b/;

const firstExplicitPath = (prompt: string, activePath = '.') => {
	const match = explicitProjectPathPattern.exec(prompt);
	const explicitPath = normalizeActionPath(match?.[1] || match?.[2] || '', activePath);
	if (explicitPath) return explicitPath;

	const bareFileMatch = bareFileReferencePattern.exec(prompt);
	return normalizeActionPath(bareFileMatch?.[1] || '', activePath);
};

const hasFileExtension = (path: string) => /\.[A-Za-z0-9]{1,12}$/.test(path);

const parsePathAndContent = (prompt: string, verbs: string[], activePath = '.') => {
	const verbPattern = verbs.join('|');
	const pattern = new RegExp(
		`^\\s*(?:please\\s+)?(?:${verbPattern})\\s+(?:a\\s+)?(?:file\\s+)?(?:called\\s+|named\\s+)?([^\\s]+(?:/[^\\s]+)*\\.[A-Za-z0-9]{1,12})\\s+(?:with\\s+content|containing):\\s*([\\s\\S]+)$`,
		'i'
	);
	const match = pattern.exec(prompt);
	if (!match) return null;
	const path = normalizeActionPath(match[1], activePath);
	const content = match[2] ?? '';
	return path && content ? { path, content } : null;
};

const isWriteProofRequest = (prompt: string) => {
	const normalized = prompt.toLowerCase();
	const asksForFileCreation =
		/\b(add|create|make|write|save)\b[\s\S]{0,120}\btest\s+file\b/.test(normalized) ||
		/\btest\s+file\b[\s\S]{0,120}\b(add|create|make|write|save)\b/.test(normalized);
	const asksForWriteProof =
		/\b(add|create|make|write|save)\b[\s\S]{0,120}\b(confirm|prove|verify|test)\b[\s\S]{0,80}\bwrite\b/.test(
			normalized
		) ||
		/\b(confirm|prove|verify|test)\b[\s\S]{0,80}\bwrite\b[\s\S]{0,120}\b(folder|project|directory)\b/.test(
			normalized
		);
	return asksForFileCreation || asksForWriteProof;
};

const isProjectFileCapabilityQuestion = (prompt: string) => {
	const normalized = prompt.toLowerCase();
	return (
		/\b(can|could|will|would|are|do)\b[\s\S]{0,80}\b(you|enos|desk)\b[\s\S]{0,120}\b(list|read|write|edit|create|save|rename|delete|reveal|access|modify)\b[\s\S]{0,80}\b(files?|folders?|project|directory)\b/.test(
			normalized
		) ||
		/\b(can|could|will|would|are|do)\b[\s\S]{0,80}\b(you|enos|desk)\b[\s\S]{0,120}\b(files?|folders?|project|directory)\b[\s\S]{0,80}\b(list|read|write|edit|create|save|rename|delete|reveal|access|modify)\b/.test(
			normalized
		)
	);
};

export const isProjectFileFactsPrompt = (prompt = '') => {
	const normalized = String(prompt || '').toLowerCase().replace(/\s+/g, ' ').trim();
	if (!normalized) return false;

	return (
		/\b(how many|count|list|show|which|what|tell me|name)\b[\s\S]{0,100}\b(files?|folders?|entries|directory|directories|contents?)\b/.test(
			normalized
		) ||
		/\b(files?|folders?|entries|contents?)\b[\s\S]{0,80}\b(this|current|selected|active|folder|directory|project)\b/.test(
			normalized
		)
	);
};

export const shouldRouteProjectFileFactsToDeskAgent = ({
	projectFileFactsRequested,
	hasDesktopBridge,
	hasActiveProjectFolder
}: {
	projectFileFactsRequested: boolean;
	hasDesktopBridge: boolean;
	hasActiveProjectFolder: boolean;
}) => Boolean(projectFileFactsRequested && hasDesktopBridge && hasActiveProjectFolder);

export const shouldEmitProjectFileFactsUnavailableGuard = ({
	projectFileFactsRequested,
	hasDesktopBridge,
	projectActionContext
}: {
	projectFileFactsRequested: boolean;
	hasDesktopBridge: boolean;
	projectActionContext?: string | null;
}) => Boolean(projectFileFactsRequested && !hasDesktopBridge && !String(projectActionContext || '').trim());

export const shouldInjectSavedProjectDigest = ({
	projectContextDigest,
	projectFileFactsRequested
}: {
	projectContextDigest?: string | null;
	projectFileFactsRequested: boolean;
}) => Boolean(String(projectContextDigest || '').trim() && !projectFileFactsRequested);

export const detectProjectChatAction = ({
	prompt = '',
	activePath = '.',
	now = new Date()
}: {
	prompt?: string;
	activePath?: string | null;
	now?: Date;
}): ProjectChatAction | null => {
	const text = String(prompt || '').trim();
	const normalized = text.toLowerCase();
	if (!text) return null;

	if (isWriteProofRequest(text)) {
		const path = createTestFilePath(activePath ?? '.', now);
		return {
			kind: 'create-file',
			path,
			content: [
				'ENOS Desk write test',
				`Created at: ${now.toISOString()}`,
				`Project path: ${path}`,
				`User request: ${compactPrompt(text)}`,
				''
			].join('\n')
		};
	}

	if (isProjectFileCapabilityQuestion(text)) {
		return { kind: 'capability', message: PROJECT_FILE_CAPABILITY_MESSAGE };
	}

	const createWithContent = parsePathAndContent(text, ['create', 'add', 'make'], activePath ?? '.');
	if (createWithContent) return { kind: 'create-file', ...createWithContent };

	const writeWithContent = parsePathAndContent(text, ['write', 'overwrite', 'replace'], activePath ?? '.');
	if (writeWithContent) return { kind: 'write-file', ...writeWithContent };

	const explicitCreatePath = firstExplicitPath(text, activePath ?? '.');
	if (
		explicitCreatePath &&
		hasFileExtension(explicitCreatePath) &&
		/\b(create|add|make|recreate|restore)\b/i.test(text)
	) {
		return { kind: 'create-file', path: explicitCreatePath, content: '' };
	}

	const createFolderMatch =
		/^\s*(?:please\s+)?(?:create|add|make)\s+(?:a\s+)?folder\s+(?:called\s+|named\s+)?([^\n]+?)\s*$/i.exec(
			text
	);
	if (createFolderMatch) {
		const path = normalizeActionPath(createFolderMatch[1], activePath ?? '.');
		if (path) return { kind: 'create-folder', path };
	}

	const renameMatch =
		/^\s*(?:please\s+)?rename\s+(.+?)\s+(?:to|as)\s+(.+?)\s*$/i.exec(text);
	if (renameMatch) {
		const path = normalizeActionPath(renameMatch[1], activePath ?? '.');
		const toPath = normalizeActionPath(renameMatch[2], activePath ?? '.');
		if (path && toPath) return { kind: 'rename-entry', path, toPath };
	}

	const deleteMatch = /^\s*(?:please\s+)?(?:delete|remove|trash)\s+(.+?)\s*$/i.exec(text);
	if (deleteMatch) {
		const path = normalizeActionPath(deleteMatch[1], activePath ?? '.');
		if (path) return { kind: 'delete-entry', path };
	}

	const revealMatch =
		/^\s*(?:please\s+)?(?:reveal|show|open)\s+(.+?)\s+(?:in\s+)?(?:finder|file explorer|filesystem)\s*$/i.exec(
			text
	);
	if (revealMatch) {
		const path = normalizeActionPath(revealMatch[1], activePath ?? '.');
		if (path) return { kind: 'reveal-entry', path };
	}

	const explicitPath = firstExplicitPath(text, activePath ?? '.');
	if (explicitPath && hasFileExtension(explicitPath) && /\b(what|read|show|open|contents?|inside|in)\b/i.test(text)) {
		return { kind: 'read-file', path: explicitPath };
	}

	if (explicitPath && !hasFileExtension(explicitPath) && /\b(list|files?|folder|directory|what.*in)\b/i.test(text)) {
		return { kind: 'list-directory', path: explicitPath };
	}

	if (isProjectFileFactsPrompt(text)) {
		return { kind: 'list-directory', path: normalizeProjectPath(activePath ?? '.') };
	}

	if (/\b(edit|modify|update|change|write|create|delete|rename|remove|trash)\b/i.test(normalized)) {
		return { kind: 'clarify', message: CLARIFY_FILE_ACTION_MESSAGE };
	}

	return null;
};

export const detectProjectWriteCommand = ({
	prompt = '',
	activePath = '.',
	now = new Date()
}: {
	prompt?: string;
	activePath?: string | null;
	now?: Date;
}): ProjectWriteCommand | null => {
	const action = detectProjectChatAction({ prompt, activePath, now });
	return action?.kind === 'create-file' && action.path.includes(TEST_FILE_NAME_PREFIX)
		? { kind: 'create-test-file', path: action.path, content: action.content }
		: null;
};

export const formatProjectWriteSuccess = (path: string, bytes?: number) =>
	[
		`Created \`${path}\` in the selected project folder.`,
		bytes === undefined ? '' : `Bytes written: ${bytes}.`,
		'This confirms ENOS Desk can write inside this project through the local desktop bridge.'
	]
		.filter(Boolean)
		.join('\n\n');

export const formatProjectWriteCancelled = (path: string) =>
	`I did not create \`${path}\` because the file action was not approved.`;

export const formatProjectWriteFailure = (path: string, error: unknown) =>
	`I could not create \`${path}\`.\n\n${error instanceof Error ? error.message : String(error)}`;
