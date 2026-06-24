const PASTED_TEXT_PREVIEW_LIMIT = 220;

const PASTED_TEXT_NAME_PATTERN = /^Pasted_Text_\d+\.txt$/;

export const isPastedTextFile = (file: any) =>
	Boolean(
		file?.isPastedText ||
			(file?.type === 'file' &&
				PASTED_TEXT_NAME_PATTERN.test(String(file?.name ?? '')) &&
				(file?.content_type === 'text/plain' || file?.context === 'full'))
	);

export const getPastedTextContent = (file: any) =>
	String(
		file?.pastedTextContent ??
			file?.content ??
			file?.file?.data?.content ??
			file?.file?.data?.text ??
			''
	);

export const getTextStats = (text = '') => {
	const value = String(text ?? '');
	return {
		chars: value.length,
		lines: value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length
	};
};

export const getPastedTextPreview = (text = '', limit = PASTED_TEXT_PREVIEW_LIMIT) => {
	let normalized = String(text ?? '');
	// Unescape common JSON escape sequences for a readable preview.
	// Order matters: unescape \n, \t, \r, \" before \\ so that \\n stays as \n (not newline).
	normalized = normalized
		.replace(/\\n/g, '\n')
		.replace(/\\t/g, '\t')
		.replace(/\\r/g, '\r')
		.replace(/\\"/g, '"');
	// Collapse all whitespace into single spaces
	normalized = normalized.replace(/\s+/g, ' ').trim();
	// Unescape double-backslash last so it doesn't re-introduce sequences
	normalized = normalized.replace(/\\\\/g, '\\');
	if (normalized.length <= limit) return normalized;
	return `${normalized.slice(0, Math.max(0, limit)).trimEnd()}...`;
};
