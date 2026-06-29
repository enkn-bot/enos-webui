import { describe, expect, test } from 'vitest';
import {
	cognitionLabel,
	isStepSettled,
	normalizeAction,
	persistenceClass,
	selectDisplayStatus,
	shouldPersistStatus
} from './cognitionVocabulary';

describe('cognition vocabulary', () => {
	test('maps raw OWUI/Pi actions to canonical verbs', () => {
		expect(normalizeAction('web_search')).toBe('searching');
		expect(normalizeAction('sources_retrieved')).toBe('reading');
		expect(normalizeAction('reasoning')).toBe('thinking');
		expect(normalizeAction('edit_file')).toBe('editing');
		expect(normalizeAction('bash')).toBe('executing');
	});

	test('falls back heuristically for unmapped tool actions', () => {
		expect(normalizeAction('git_status')).toBe('reading');
		expect(normalizeAction('git_diff')).toBe('reading');
		expect(normalizeAction('rename')).toBe('editing');
		expect(normalizeAction('npm_install')).toBe('executing');
		expect(normalizeAction('totally_unknown')).toBe('working');
	});

	test('speaks present tense in progress, past tense once done', () => {
		expect(cognitionLabel('web_search', false)).toBe('Searching');
		expect(cognitionLabel('web_search', true)).toBe('Searched');
		expect(cognitionLabel('reasoning', false)).toBe('Thinking');
		expect(cognitionLabel('reasoning', true)).toBe('Thought');
		expect(cognitionLabel('edit_file', true)).toBe('Edited');
	});

	test('classifies transient vs outcome verbs', () => {
		expect(persistenceClass('reasoning')).toBe('transient');
		expect(persistenceClass('planning')).toBe('transient');
		expect(persistenceClass('responding')).toBe('transient');
		expect(persistenceClass('web_search')).toBe('outcome');
		expect(persistenceClass('edit_file')).toBe('outcome');
		expect(persistenceClass('testing')).toBe('outcome');
	});

	describe('persistence rule', () => {
		test('a status carrying evidence always persists', () => {
			expect(shouldPersistStatus({ action: 'reasoning', urls: ['a'] }, true)).toBe(true);
			expect(shouldPersistStatus({ action: 'web_search', count: 5 }, true)).toBe(true);
		});

		test('transient states disappear once the answer is present', () => {
			expect(shouldPersistStatus({ action: 'reasoning', done: true }, true)).toBe(false);
			expect(shouldPersistStatus({ action: 'composing', done: true }, true)).toBe(false);
			expect(shouldPersistStatus({ action: 'working', done: true }, true)).toBe(false);
		});

		test('outcomes stay even after the answer is present', () => {
			expect(shouldPersistStatus({ action: 'web_search', done: true }, true)).toBe(true);
			expect(shouldPersistStatus({ action: 'edit_file', done: true }, true)).toBe(true);
		});

		test('nothing is dropped while the answer is still streaming (no replacement yet)', () => {
			expect(shouldPersistStatus({ action: 'reasoning', done: false }, false)).toBe(true);
			expect(shouldPersistStatus({ action: 'composing', done: false }, false)).toBe(true);
		});
	});

	describe('display-status selection (collapsed header)', () => {
		test('while streaming, shows the latest live status', () => {
			const history = [
				{ action: 'web_search', done: true },
				{ action: 'composing', done: false }
			];
			expect(selectDisplayStatus(history, false)).toEqual({ action: 'composing', done: false });
		});

		test('once answered, shows the last outcome and drops a trailing transient', () => {
			const history = [
				{ action: 'web_search', done: true, count: 5 },
				{ action: 'working', done: true } // the lingering "Done"
			];
			expect(selectDisplayStatus(history, true)).toEqual({
				action: 'web_search',
				done: true,
				count: 5
			});
		});

		test('a plain answer with no outcome renders nothing (no leftover "Done")', () => {
			const history = [{ action: 'working', done: true }];
			expect(selectDisplayStatus(history, true)).toBeNull();
		});

		test('empty/absent history is null', () => {
			expect(selectDisplayStatus([], true)).toBeNull();
			expect(selectDisplayStatus(null, false)).toBeNull();
		});
	});

	// In a sequential narration feed only the TAIL can be in progress. The backend
	// does not reliably flip done=true on superseded entries (web_search is skipped
	// by the dead-air fix), so the feed must settle steps from the outside. This is
	// the single rule both surfaces share (Chat timeline + Desk operational feed).
	describe('feed-settled rule (only the tail can be in progress)', () => {
		test('the turn being answered settles every step', () => {
			// 2-step feed, both flags still false, but the answer is present.
			expect(isStepSettled({ done: false }, 0, 2, true)).toBe(true);
			expect(isStepSettled({ done: false }, 1, 2, true)).toBe(true);
		});

		test('a superseded step (not the tail) is settled even while streaming', () => {
			// "Checking web" at idx 0 of 2 while still streaming → a later step exists.
			expect(isStepSettled({ action: 'web_search', done: false }, 0, 2, false)).toBe(true);
		});

		test('the live tail stays in progress while streaming', () => {
			expect(isStepSettled({ done: false }, 1, 2, false)).toBe(false);
		});

		test('an explicitly-done tail is settled', () => {
			expect(isStepSettled({ done: true }, 1, 2, false)).toBe(true);
		});

		test('a lone streaming step is in progress', () => {
			expect(isStepSettled({ done: false }, 0, 1, false)).toBe(false);
		});
	});
});
