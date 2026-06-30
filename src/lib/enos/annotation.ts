export type Annotation = {
	id: string;
	source: string | null;
	tag: string;
	selector: string;
	text: string;
	styles: { color: string; fontSize: string; fontFamily: string };
	rect: { x: number; y: number; w: number; h: number };
	url: string;
	note: string;
};

// Text ref dropped into the composer for the coding agent: element selector,
// its source file:line when the app is instrumented, and the user's note.
export const annotationRef = (a: Annotation): string => {
	const src = a.source ? ` (${a.source})` : '';
	const note = a.note ? `: ${a.note}` : '';
	return `↳ ${a.selector}${src}${note}`;
};
