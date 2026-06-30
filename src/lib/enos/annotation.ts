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
	image?: string; // dataURL element screenshot — chip/card thumbnail only, never sent
};

// One actionable line per annotation for the coding agent: element selector,
// its source file:line when the app is instrumented, and the user's note.
export const annotationRef = (a: Annotation): string => {
	const src = a.source ? ` (${a.source})` : '';
	const note = a.note ? `: ${a.note}` : '';
	return `↳ ${a.selector}${src}${note}`;
};

// Prepend the annotation refs (text, model-actionable) to the user's draft on
// send. The screenshot is NOT serialized — it's display-only in the chip.
export const serializeAnnotations = (list: Annotation[], draft: string): string => {
	if (list.length === 0) return draft;
	const refs = list.map(annotationRef).join('\n');
	return draft ? `${refs}\n\n${draft}` : refs;
};
