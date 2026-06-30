import { describe, it, expect } from 'vitest';
import { serializeAnnotations, type Annotation } from './annotation';

const mk = (over: Partial<Annotation> = {}): Annotation => ({
	id: '1',
	source: 'src/Squad.tsx:42',
	tag: 'h1',
	selector: 'h1.team-name',
	text: 'Esteemed Kompany',
	styles: { color: '#1E1914', fontSize: '15px', fontFamily: 'Inter' },
	rect: { w: 528, h: 17 },
	url: 'http://localhost:5180/',
	note: '',
	...over
});

describe('serializeAnnotations', () => {
	it('returns the draft unchanged when there are no annotations', () => {
		expect(serializeAnnotations([], 'hello')).toBe('hello');
	});

	it('prepends a header with the page url and an entry per annotation', () => {
		const out = serializeAnnotations([mk()], 'make it pop');
		expect(out).toContain('Annotations on http://localhost:5180/');
		expect(out).toContain('h1.team-name');
		expect(out).toContain('Esteemed Kompany');
		expect(out).toContain('src/Squad.tsx:42');
		expect(out.endsWith('make it pop')).toBe(true);
	});

	it('includes the inline note when present', () => {
		const out = serializeAnnotations([mk({ note: 'make this bigger' })], '');
		expect(out).toContain('make this bigger');
	});

	it('omits the source label when source is null', () => {
		const out = serializeAnnotations([mk({ source: null })], '');
		expect(out).not.toContain('src:');
	});
});
