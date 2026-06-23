import { describe, test, expect } from 'vitest';
import { parseGeneratedTitle } from './title';

describe('parseGeneratedTitle', () => {
	test('parses the requested { "title": ... } JSON', () => {
		expect(parseGeneratedTitle('{ "title": "Portugal World Cup match" }')).toBe(
			'Portugal World Cup match'
		);
	});

	test('parses JSON wrapped in prose / code fences', () => {
		expect(parseGeneratedTitle('Sure!\n```json\n{"title": "Python string reversal"}\n```')).toBe(
			'Python string reversal'
		);
	});

	test('parses single-quoted JSON (sanitized)', () => {
		expect(parseGeneratedTitle("{'title': 'Canada news update'}")).toBe('Canada news update');
	});

	// The regression: gemini-2.5-flash-lite title lane returns a bare string.
	test('accepts a bare plain-text title (the desk/project regression)', () => {
		expect(parseGeneratedTitle('Portugal wins World Cup match')).toBe(
			'Portugal wins World Cup match'
		);
	});

	test('strips wrapping quotes from a plain-text title', () => {
		expect(parseGeneratedTitle('"Global News Summary"')).toBe('Global News Summary');
	});

	test('strips a leading "Title:" label', () => {
		expect(parseGeneratedTitle('Title: Team communication and growth')).toBe(
			'Team communication and growth'
		);
	});

	test('keeps apostrophes in plain-text titles intact', () => {
		expect(parseGeneratedTitle("Portugal's opening win")).toBe("Portugal's opening win");
	});

	test('uses the first non-empty line of a multi-line plain response', () => {
		expect(parseGeneratedTitle('\n\nDefining endorsement\n\n(some extra notes)')).toBe(
			'Defining endorsement'
		);
	});

	test('returns null for sentence-length prose / refusals (not a title)', () => {
		const prose =
			"I'm sorry, but I cannot generate a title because the conversation does not contain enough context for me to summarize it accurately here.";
		expect(parseGeneratedTitle(prose)).toBeNull();
	});

	test('returns null for empty / whitespace content', () => {
		expect(parseGeneratedTitle('')).toBeNull();
		expect(parseGeneratedTitle('   \n  ')).toBeNull();
	});

	test('does not return a raw JSON fragment as a title', () => {
		// Malformed JSON that fails to parse must not leak braces into the title.
		expect(parseGeneratedTitle('{"title": "broken')).toBeNull();
	});
});
