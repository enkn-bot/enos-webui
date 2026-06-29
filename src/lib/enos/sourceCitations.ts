import { getEnosCitationId, getEnosCitationLabel, getEnosCitationUrl } from './sourceLabels';

export type EnosCitationRecord = {
	id: string;
	source: {
		id?: unknown;
		name: string;
		url?: string;
		embed_url?: unknown;
		[key: string]: unknown;
	};
	document: string[];
	metadata: unknown[];
	distances: number[];
};

type RawEnosSource = {
	source?: unknown;
	document?: unknown;
	metadata?: unknown;
	distances?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const getPreviewSnippet = (content: unknown, maxLength = 180): string => {
	if (typeof content !== 'string') return '';

	const text = content.replace(/\s+/g, ' ').trim();
	if (text.length <= maxLength) return text;

	return `${text.slice(0, maxLength).trimEnd()}...`;
};

export const buildEnosCitations = (
	sources: unknown[] | null | undefined,
	citationsEnabled = true
): EnosCitationRecord[] => {
	if (!citationsEnabled) return [];

	const citations: EnosCitationRecord[] = [];

	for (const rawSource of sources ?? []) {
		if (!isRecord(rawSource) || Object.keys(rawSource).length === 0) continue;

		const sourceRecord: RawEnosSource = rawSource;
		const documents = Array.isArray(sourceRecord.document) ? sourceRecord.document : [];

		documents.forEach((document, index) => {
			if (typeof document !== 'string') return;

			const metadata = Array.isArray(sourceRecord.metadata) ? sourceRecord.metadata[index] : undefined;
			const distance = Array.isArray(sourceRecord.distances) ? sourceRecord.distances[index] : undefined;
			const source = isRecord(sourceRecord.source) ? sourceRecord.source : null;
			const citationMetadata = isRecord(metadata) ? metadata : null;
			const id = getEnosCitationId(source, citationMetadata);
			const label = getEnosCitationLabel(source, citationMetadata);
			const url = getEnosCitationUrl(source, citationMetadata);
			const sourceFields = source ? { ...source } : {};
			delete sourceFields.url;
			const normalizedSource = {
				...sourceFields,
				name: label,
				...(url ? { url } : {})
			};

			const existing = citations.find((citation) => citation.id === id);

			if (existing) {
				existing.document.push(document);
				if (metadata !== undefined) existing.metadata.push(metadata);
				if (typeof distance === 'number') existing.distances.push(distance);
				return;
			}

			citations.push({
				id,
				source: normalizedSource,
				document: [document],
				metadata: metadata !== undefined ? [metadata] : [],
				distances: typeof distance === 'number' ? [distance] : []
			});
		});
	}

	return citations;
};
