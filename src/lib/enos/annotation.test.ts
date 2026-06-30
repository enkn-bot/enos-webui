import { describe, it, expect } from 'vitest';
import { annotationRef, type Annotation } from './annotation';

const mk = (over: Partial<Annotation> = {}): Annotation => ({
	id: '1',
	source: 'src/Squad.tsx:42',
	tag: 'h1',
	selector: 'h1.team-name',
	text: 'Esteemed Kompany',
	styles: { color: '#1E1914', fontSize: '15px', fontFamily: 'Inter' },
	rect: { x: 10, y: 20, w: 528, h: 17 },
	url: 'http://localhost:5180/',
	note: '',
	...over
});

describe('annotationRef', () => {
	it('is empty when no note and no source', () => {
		expect(annotationRef(mk({ note: '', source: null }))).toBe('');
	});

	it('includes the note', () => {
		expect(annotationRef(mk({ note: 'make this bigger', source: null }))).toBe('make this bigger');
	});

	it('appends source after the note', () => {
		expect(annotationRef(mk({ note: 'bigger' }))).toBe('bigger src/Squad.tsx:42');
	});
});
