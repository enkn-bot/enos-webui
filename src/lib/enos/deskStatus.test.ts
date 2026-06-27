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
});
