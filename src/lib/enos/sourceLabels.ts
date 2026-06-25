type SourceLike = {
	id?: unknown;
	name?: unknown;
	url?: unknown;
	[key: string]: unknown;
};

type MetadataLike = {
	source?: unknown;
	name?: unknown;
	title?: unknown;
	url?: unknown;
	link?: unknown;
	[key: string]: unknown;
};

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const isRawEnosToolSourceLabel = (value: unknown): boolean => {
	const label = clean(value);
	if (!label) return false;
	return /^enos[_-][a-z0-9_-]+\/[a-z0-9_.-]+$/i.test(label);
};

const isHttpUrl = (value: unknown): value is string => {
	const text = clean(value);
	return text.startsWith('http://') || text.startsWith('https://');
};

const domainFromUrl = (value: string): string => {
	try {
		const hostname = new URL(value).hostname;
		return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
	} catch {
		return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0] || value;
	}
};

const firstReadable = (...values: unknown[]): string | null => {
	for (const value of values) {
		const text = clean(value);
		if (text && !isRawEnosToolSourceLabel(text) && !isHttpUrl(text)) return text;
	}
	return null;
};

export const getEnosCitationUrl = (
	source: SourceLike | null | undefined,
	metadata: MetadataLike | null | undefined
): string | null => {
	for (const value of [metadata?.url, metadata?.link, metadata?.source, source?.url, source?.name]) {
		if (isHttpUrl(value)) return clean(value);
	}
	return null;
};

export const getEnosCitationLabel = (
	source: SourceLike | null | undefined,
	metadata: MetadataLike | null | undefined
): string => {
	const readable = firstReadable(metadata?.name, metadata?.title);
	if (readable) return readable;

	const url = getEnosCitationUrl(source, metadata);
	if (url) return domainFromUrl(url);

	const sourceReadable = firstReadable(source?.name, source?.id, metadata?.source);
	return sourceReadable ?? 'N/A';
};

export const getEnosCitationId = (
	source: SourceLike | null | undefined,
	metadata: MetadataLike | null | undefined
): string => {
	const url = getEnosCitationUrl(source, metadata);
	if (url) return url;
	return firstReadable(metadata?.source, metadata?.name, metadata?.title, source?.id, source?.name) ?? 'N/A';
};

export const getEnosSourceIds = (sources: any[] | null | undefined, citationsEnabled = true): string[] => {
	const result: string[] = [];
	for (const source of sources ?? []) {
		for (let index = 0; index < (source?.document ?? []).length; index++) {
			if (!citationsEnabled) {
				result.push('N/A');
				continue;
			}
			result.push(getEnosCitationLabel(source?.source, source?.metadata?.[index]));
		}
	}
	return [...new Set(result)];
};
