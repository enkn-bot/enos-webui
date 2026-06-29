import { describe, expect, test } from 'vitest';

import { buildEnosCitations, getPreviewSnippet } from './sourceCitations';

describe('ENOS source citations', () => {
	test('normalizes persisted ENOS web sources into readable preview records', () => {
		const sources = [
			{
				source: { name: 'enos_web/news_search', url: 'enos_web/news_search' },
				document: ['Brazil beat Scotland 3-0 in a friendly match.'],
				metadata: [
					{
						source: 'enos_web/news_search',
						title: 'Brazil beat Scotland - BBC Sport',
						url: 'https://www.bbc.com/sport/football/example'
					}
				],
				distances: [0.82]
			}
		];

		expect(buildEnosCitations(sources)).toEqual([
			{
				id: 'https://www.bbc.com/sport/football/example',
				source: {
					name: 'Brazil beat Scotland - BBC Sport',
					url: 'https://www.bbc.com/sport/football/example'
				},
				document: ['Brazil beat Scotland 3-0 in a friendly match.'],
				metadata: [
					{
						source: 'enos_web/news_search',
						title: 'Brazil beat Scotland - BBC Sport',
						url: 'https://www.bbc.com/sport/football/example'
					}
				],
				distances: [0.82]
			}
		]);
	});

	test('dedupes documents that share the same citation URL', () => {
		const sources = [
			{
				source: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Who_Are_You' },
				document: ['Album page passage.', 'Personnel passage.'],
				metadata: [
					{ title: 'Who Are You - Wikipedia', source: 'https://en.wikipedia.org/wiki/Who_Are_You' },
					{ title: 'Who Are You - Wikipedia', source: 'https://en.wikipedia.org/wiki/Who_Are_You' }
				],
				distances: [0.91, 0.77]
			}
		];

		const citations = buildEnosCitations(sources);

		expect(citations).toHaveLength(1);
		expect(citations[0].source.name).toBe('Who Are You - Wikipedia');
		expect(citations[0].source.url).toBe('https://en.wikipedia.org/wiki/Who_Are_You');
		expect(citations[0].document).toEqual(['Album page passage.', 'Personnel passage.']);
		expect(citations[0].distances).toEqual([0.91, 0.77]);
	});

	test('removes raw non-URL source URLs when no citation URL is available', () => {
		const sources = [
			{
				source: { name: 'enos_web/news_search', url: 'enos_web/news_search' },
				document: ['No link.'],
				metadata: [{ title: 'Readable result', source: 'enos_web/news_search' }]
			}
		];

		const [citation] = buildEnosCitations(sources);

		expect(citation.source).toEqual({ name: 'Readable result' });
		expect(citation.source).not.toHaveProperty('url');
	});

	test('returns a compact whitespace-normalized snippet', () => {
		expect(getPreviewSnippet(' Line one.\n\nLine two has more detail. ', 18)).toBe(
			'Line one. Line two...'
		);
		expect(getPreviewSnippet('', 18)).toBe('');
	});
});
