import { describe, it, expect } from 'vitest';
import { annotationRef, serializeAnnotations, type Annotation } from './annotation';

const mk = (over: Partial<Annotation> = {}): Annotation => ({
	id: '1',
	source: 'src/Squad.tsx:42',
	tag: 'h1',
	selector: 'h1.team-name',
	text: 'Esteemed Kompany',
	html: '<h1 class="team-name">Esteemed Kompany</h1>',
	styles: {
		fontSize: '15px',
		color: 'rgb(30,25,20)',
		display: 'flex',
		margin: '0px',
		gap: 'normal',
		flexDirection: 'row'
	},
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

describe('serializeAnnotations', () => {
	it('returns draft unchanged when list is empty', () => {
		expect(serializeAnnotations([], 'hi')).toBe('hi');
	});

	it('one annotation produces a rich block above the draft', () => {
		const out = serializeAnnotations([mk({ note: 'make bigger' })], 'fix it');
		expect(out).toContain('[Annotation: h1.team-name]');
		expect(out).toContain('source: src/Squad.tsx:42');
		expect(out).toContain('box: 528×17 at (10,20)');
		expect(out).toContain('fontSize: 15px');
		expect(out).toContain('html: <h1');
		expect(out).toContain('ask: make bigger');
		expect(out.endsWith('\n\nfix it')).toBe(true);
	});

	it('omits source line when source is null', () => {
		const out = serializeAnnotations([mk({ source: null })], '');
		expect(out).not.toContain('source:');
	});

	it('omits ask line when note is empty', () => {
		const out = serializeAnnotations([mk({ note: '' })], '');
		expect(out).not.toContain('ask:');
	});

	it('omits text line when text is empty', () => {
		const out = serializeAnnotations([mk({ text: '' })], '');
		expect(out).not.toContain('text:');
	});

	it('omits html line when html is empty', () => {
		const out = serializeAnnotations([mk({ html: '' })], '');
		expect(out).not.toContain('html:');
	});

	it('omits styles line when styles map is empty', () => {
		const out = serializeAnnotations([mk({ styles: {} })], '');
		expect(out).not.toContain('styles:');
	});

	it('returns block only when draft is empty', () => {
		const out = serializeAnnotations([mk({ note: 'x', source: null })], '');
		expect(out).toContain('[Annotation: h1.team-name]');
		expect(out.endsWith('\n\n')).toBe(false);
	});

	it('joins multiple annotations with a blank line', () => {
		const a = mk({ selector: 'h1.team-name' });
		const b = mk({ selector: 'p.subtitle', tag: 'p' });
		const out = serializeAnnotations([a, b], '');
		expect(out).toContain('[Annotation: h1.team-name]');
		expect(out).toContain('[Annotation: p.subtitle]');
		expect(out).toContain('\n\n');
	});

	it('keeps signal styles and drops default-valued noise', () => {
		const out = serializeAnnotations([mk()], '');
		expect(out).toContain('fontSize: 15px');
		expect(out).toContain('display: flex');
		expect(out).not.toContain('margin: 0px');
		expect(out).not.toContain('gap: normal');
		expect(out).not.toContain('flexDirection: row');
	});

	it('omits styles line when all styles are default-valued', () => {
		const out = serializeAnnotations(
			[
				mk({
					styles: {
						margin: '0px',
						padding: '0px',
						flexDirection: 'row',
						gap: 'normal',
						backgroundColor: 'rgba(0, 0, 0, 0)'
					}
				})
			],
			''
		);
		expect(out).not.toContain('styles:');
	});
});
