import { describe, expect, test } from 'vitest';

import { formatDeskStatusLabel } from './deskStatus';

describe('ENOS Desk status presentation', () => {
	test('collapses base web-search site counts into a calm Desk label', () => {
		expect(
			formatDeskStatusLabel({
				action: 'web_search',
				description: 'Searched {{count}} sites',
				urls: ['https://a.test', 'https://b.test'],
				done: true
			})
		).toBe('Checked web');
	});

	test('turns raw tool ids into controlled cognition verbs', () => {
		expect(formatDeskStatusLabel({ action: 'enos_desk', description: 'web_search…' })).toBe(
			'Checking web'
		);
		// A bare tool id (no path context) speaks the canonical cognition verb with the
		// right tense, instead of a title-cased tool id. The contextual case is unchanged
		// and still wins (see below): "read_file" with a path renders "Read src/main.ts".
		expect(
			formatDeskStatusLabel({ action: 'enos_desk', description: 'read_file', done: true })
		).toBe('Read');
		expect(
			formatDeskStatusLabel({ action: 'enos_desk', description: 'edit_file', done: true })
		).toBe('Edited');
		expect(formatDeskStatusLabel({ action: 'enos_desk', description: 'edit_file' })).toBe(
			'Editing'
		);
	});

	test('contextual descriptions are preserved verbatim (path wins over bare verb)', () => {
		expect(
			formatDeskStatusLabel({ action: 'enos_desk', description: 'Read src/main.ts', done: true })
		).toBe('Read src/main.ts');
	});

	// Root-cause regression: the backend never flips done=true on a superseded
	// web_search entry, so the entry's own done flag is false forever. The feed
	// must be able to override the tense from the OUTSIDE (turn answered, or a
	// later step superseded this one) so "Checking web" settles to "Checked web".
	test('an effective-done override settles the label tense regardless of status.done', () => {
		const stuck = { action: 'web_search', description: '', done: false } as const;
		// Without override: still in progress (present tense).
		expect(formatDeskStatusLabel(stuck)).toBe('Checking web');
		// With effective-done override: past tense, even though status.done is false.
		expect(formatDeskStatusLabel(stuck, true)).toBe('Checked web');
	});

	test('effective-done override settles source-retrieval tense', () => {
		const stuck = { action: 'sources_retrieved', count: 5, done: false } as const;
		expect(formatDeskStatusLabel(stuck)).toBe('Reading 5 sources');
		expect(formatDeskStatusLabel(stuck, true)).toBe('Read 5 sources');
	});

	test('override of false keeps the live tense (does not force done)', () => {
		const live = { action: 'web_search', description: '', done: true } as const;
		// An explicit false override means "this is the live tail" — present tense.
		expect(formatDeskStatusLabel(live, false)).toBe('Checking web');
	});
});
