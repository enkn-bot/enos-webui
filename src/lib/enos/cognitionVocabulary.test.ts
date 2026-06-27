import { describe, expect, test } from 'vitest';
import {
	cognitionLabel,
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
});
