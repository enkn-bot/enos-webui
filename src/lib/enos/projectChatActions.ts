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

export const detectProjectWriteCommand = ({
	prompt = '',
	activePath = '.',
	now = new Date()
}: {
	prompt?: string;
	activePath?: string | null;
	now?: Date;
}): ProjectWriteCommand | null => {
	const text = String(prompt || '').trim();
	const normalized = text.toLowerCase();
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

	if (!asksForFileCreation && !asksForWriteProof) return null;

	const path = createTestFilePath(activePath ?? '.', now);
	return {
		kind: 'create-test-file',
		path,
		content: [
			'ENOS Desk write test',
			`Created at: ${now.toISOString()}`,
			`Project path: ${path}`,
			`User request: ${compactPrompt(text)}`,
			''
		].join('\n')
	};
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
