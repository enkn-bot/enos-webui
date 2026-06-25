import { describe, expect, test } from 'vitest';

import {
	getEnosCitationLabel,
	getEnosCitationUrl,
	getEnosSourceIds,
	isRawEnosToolSourceLabel
} from './sourceLabels';

describe('ENOS source labels', () => {
	test('recognizes raw ENOS tool source names', () => {
		expect(isRawEnosToolSourceLabel('enos_web/news_search')).toBe(true);
		expect(isRawEnosToolSourceLabel('enos_web/read_webpage')).toBe(true);
		expect(isRawEnosToolSourceLabel('BBC Sport')).toBe(false);
		expect(isRawEnosToolSourceLabel('https://www.bbc.com/sport')).toBe(false);
	});

	test('uses persisted metadata title instead of raw tool name after reload', () => {
		const source = {
			source: { name: 'enos_web/news_search', url: 'enos_web/news_search' },
			document: ['Brazil beat Scotland 3-0.'],
			metadata: [
				{
					source: 'enos_web/news_search',
					title: 'Brazil beat Scotland - BBC Sport'
				}
			]
		};

		expect(getEnosSourceIds([source])).toEqual(['Brazil beat Scotland - BBC Sport']);
		expect(getEnosCitationLabel(source.source, source.metadata[0])).toBe(
			'Brazil beat Scotland - BBC Sport'
		);
	});

	test('falls back to URL domain when metadata has a URL but no title', () => {
		const metadata = { source: 'https://www.theguardian.com/football/live' };

		expect(getEnosCitationLabel({ name: 'enos_web/news_search' }, metadata)).toBe(
			'theguardian.com'
		);
		expect(getEnosCitationUrl({ name: 'enos_web/news_search' }, metadata)).toBe(
			'https://www.theguardian.com/football/live'
		);
	});
});
