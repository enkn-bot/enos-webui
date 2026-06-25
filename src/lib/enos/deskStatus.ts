type StatusLike = {
	action?: string;
	description?: string;
	done?: boolean;
	count?: number;
	urls?: unknown[];
	items?: unknown[];
};

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const sentenceCaseToolName = (value: string): string => {
	const words = value
		.replace(/[.…]+$/g, '')
		.replace(/[_-]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (words.length === 0) return '';
	return [words[0][0]?.toUpperCase() + words[0].slice(1), ...words.slice(1)].join(' ');
};

export const formatDeskStatusLabel = (status: StatusLike | null | undefined): string => {
	const done = status?.done === true;
	const action = status?.action ?? '';
	const description = clean(status?.description);

	if (
		action === 'web_search' ||
		action === 'web_search_queries_generated' ||
		action === 'queries_generated'
	) {
		return done ? 'Checked web' : 'Checking web';
	}

	if (action === 'sources_retrieved') {
		if (status?.count === 0) return 'No sources found';
		if (status?.count === 1) return done ? 'Read 1 source' : 'Reading 1 source';
		if (typeof status?.count === 'number') {
			return done ? `Read ${status.count} sources` : `Reading ${status.count} sources`;
		}
		return done ? 'Read sources' : 'Reading sources';
	}

	if (action === 'enos_desk') {
		const rawTool = description.replace(/[.…]+$/g, '');
		if (rawTool === 'web_search') return done ? 'Checked web' : 'Checking web';
		const readable = sentenceCaseToolName(description);
		if (readable) return readable;
	}

	return description || (done ? 'Done' : 'Working');
};
