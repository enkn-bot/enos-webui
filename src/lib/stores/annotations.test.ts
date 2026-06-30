import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	pendingAnnotations,
	addAnnotation,
	removeAnnotation,
	clearAnnotations
} from './annotations';
import type { Annotation } from '$lib/enos/annotation';

const mk = (id: string): Annotation => ({
	id,
	source: null,
	tag: 'div',
	selector: 'div',
	text: '',
	styles: { color: '', fontSize: '', fontFamily: '' },
	rect: { w: 0, h: 0 },
	url: 'http://x/',
	note: ''
});

describe('pendingAnnotations store', () => {
	beforeEach(() => clearAnnotations());

	it('starts empty', () => {
		expect(get(pendingAnnotations)).toEqual([]);
	});

	it('adds and removes by id', () => {
		addAnnotation(mk('a'));
		addAnnotation(mk('b'));
		expect(get(pendingAnnotations).map((x) => x.id)).toEqual(['a', 'b']);
		removeAnnotation('a');
		expect(get(pendingAnnotations).map((x) => x.id)).toEqual(['b']);
	});

	it('clear empties the list', () => {
		addAnnotation(mk('a'));
		clearAnnotations();
		expect(get(pendingAnnotations)).toEqual([]);
	});
});
