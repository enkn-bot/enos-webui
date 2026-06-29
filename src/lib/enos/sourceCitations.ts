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
	metadata: any[];
	distances: number[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const documentsFor = (source: any): string[] =>
	Array.isArray(source?.document) ? source.document.filter((item: unknown) => typeof item === 'string') : [];

export const getPreviewSnippet = (content: unknown, maxLength = 180): string => {
	if (typeof content !== 'string') return '';

	const text = content.replace(/\s+/g, ' ').trim();
	if (text.length <= maxLength) return text;

	return `${text.slice(0, maxLength).trimEnd()}...`;
};

export const buildEnosCitations = (
	sources: any[] | null | undefined,
	citationsEnabled = true
): EnosCitationRecord[] => {
	if (!citationsEnabled) return [];

	const citations: EnosCitationRecord[] = [];

	for (const rawSource of sources ?? []) {
		if (!isRecord(rawSource) || Object.keys(rawSource).length === 0) continue;

		const documents = documentsFor(rawSource);

		documents.forEach((document, index) => {
			const metadata = Array.isArray(rawSource.metadata) ? rawSource.metadata[index] : undefined;
			const distance = Array.isArray(rawSource.distances) ? rawSource.distances[index] : undefined;
			const id = getEnosCitationId(rawSource.source, metadata);
			const label = getEnosCitationLabel(rawSource.source, metadata);
			const url = getEnosCitationUrl(rawSource.source, metadata);
			const sourceFields = isRecord(rawSource.source) ? { ...rawSource.source } : {};
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
