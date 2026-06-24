import { describe, expect, test } from 'vitest';

import { buildDeskReasoningBlock, composeDeskMessageContent } from './deskReasoning';

describe('buildDeskReasoningBlock', () => {
	test('no reasoning -> empty block (plain turns are untouched)', () => {
		expect(buildDeskReasoningBlock('', { done: false, durationS: 0 })).toBe('');
		expect(buildDeskReasoningBlock('   ', { done: true, durationS: 3 })).toBe('');
	});

	test('in-progress reasoning renders the base reasoning details, summary "Thinking…"', () => {
		const out = buildDeskReasoningBlock('Checking parity', { done: false, durationS: 2 });
		expect(out).toContain('<details type="reasoning" done="false" duration="2">');
		expect(out).toContain('<summary>Thinking…</summary>');
		expect(out).toContain('> Checking parity');
		expect(out.endsWith('</details>\n')).toBe(true);
	});

	test('done reasoning summary matches base "Thought for N seconds"', () => {
		const out = buildDeskReasoningBlock('done thinking', { done: true, durationS: 7 });
		expect(out).toContain('<details type="reasoning" done="true" duration="7">');
		expect(out).toContain('<summary>Thought for 7 seconds</summary>');
	});

	test('multiline reasoning is blockquoted line by line', () => {
		const out = buildDeskReasoningBlock('line one\nline two', { done: false, durationS: 0 });
		expect(out).toContain('> line one\n> line two');
	});

	test('duration is clamped to a non-negative integer', () => {
		expect(buildDeskReasoningBlock('x', { done: true, durationS: -5 })).toContain('duration="0"');
		expect(buildDeskReasoningBlock('x', { done: true, durationS: 4.6 })).toContain('duration="5"');
	});
});

describe('composeDeskMessageContent', () => {
	test('reasoning block precedes the answer content', () => {
		const out = composeDeskMessageContent('thinking', 'The answer.', {
			done: true,
			durationS: 1
		});
		expect(out.indexOf('<details')).toBeLessThan(out.indexOf('The answer.'));
		expect(out.endsWith('The answer.')).toBe(true);
	});

	test('no reasoning -> just the answer (no stray details block)', () => {
		expect(composeDeskMessageContent('', 'Just answer', { done: false, durationS: 0 })).toBe(
			'Just answer'
		);
	});
});
