export type Annotation = {
	id: string;
	source: string | null;
	tag: string;
	selector: string;
	text: string;
	html: string;
	styles: Record<string, string>;
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

// Prepend rich annotation blocks (text, model-actionable) to the user's draft on
// send. The screenshot is NOT serialized — it's display-only in the chip.
export const serializeAnnotations = (list: Annotation[], draft: string): string => {
	if (list.length === 0) return draft;

	const blocks = list
		.map((a) => {
			const lines: string[] = [`[Annotation: ${a.selector}]`];
			if (a.source) lines.push(`source: ${a.source}`);
			lines.push(`box: ${a.rect.w}×${a.rect.h} at (${a.rect.x},${a.rect.y})`);
			const styleEntries = Object.entries(a.styles);
			if (styleEntries.length > 0) {
				lines.push(`styles: ${styleEntries.map(([k, v]) => `${k}: ${v};`).join(' ')}`);
			}
			if (a.html) lines.push(`html: ${a.html}`);
			if (a.text) lines.push(`text: "${a.text}"`);
			if (a.note) lines.push(`ask: ${a.note}`);
			return lines.join('\n');
		})
		.join('\n\n');

	return draft ? `${blocks}\n\n${draft}` : blocks;
};
