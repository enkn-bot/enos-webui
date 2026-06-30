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
	it('always carries the selector', () => {
		expect(annotationRef(mk({ note: '', source: null }))).toBe('↳ h1.team-name');
	});

	it('includes source file:line when instrumented', () => {
		expect(annotationRef(mk({ note: '' }))).toBe('↳ h1.team-name (src/Squad.tsx:42)');
	});

	it('appends the note after a colon', () => {
		expect(annotationRef(mk({ note: 'make this bigger', source: null }))).toBe(
			'↳ h1.team-name: make this bigger'
		);
	});

	it('combines selector, source, and note', () => {
		expect(annotationRef(mk({ note: 'bigger' }))).toBe(
			'↳ h1.team-name (src/Squad.tsx:42): bigger'
		);
	});
});
