import { describe, expect, test } from 'vitest';

import {
	getPastedTextContent,
	getPastedTextPreview,
	getTextStats,
	isPastedTextFile
} from './pastedText';

describe('pasted text helpers', () => {
	test('detects explicit and legacy pasted text file attachments', () => {
		expect(isPastedTextFile({ isPastedText: true })).toBe(true);
		expect(
			isPastedTextFile({
				type: 'file',
				name: 'Pasted_Text_1710000000000.txt',
				content_type: 'text/plain',
				context: 'full'
			})
		).toBe(true);
		expect(isPastedTextFile({ type: 'file', name: 'notes.txt', content_type: 'text/plain' })).toBe(
			false
		);
	});

	test('extracts pasted text from attachment metadata without depending on upload response shape', () => {
		expect(getPastedTextContent({ pastedTextContent: 'from metadata' })).toBe('from metadata');
		expect(getPastedTextContent({ content: 'from temp text item' })).toBe('from temp text item');
		expect(getPastedTextContent({ file: { data: { content: 'from uploaded file data' } } })).toBe(
			'from uploaded file data'
		);
	});

	test('builds compact previews and stats for pasted text attachments', () => {
		const text = ['first line', 'second line', 'third line'].join('\n');
		expect(getPastedTextPreview(text, 18)).toBe('first line second...');
		expect(getTextStats(text)).toEqual({ chars: 33, lines: 3 });
	});
});
