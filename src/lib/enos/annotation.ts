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
	image?: string; // dataURL element screenshot used as a chat image attachment
};

// Computed-CSS values that carry no signal — drop them from the model payload.
const STYLE_DEFAULTS: Record<string, string> = {
	flexDirection: 'row',
	justifyContent: 'normal',
	alignItems: 'normal',
	gap: 'normal',
	margin: '0px',
	padding: '0px',
	borderRadius: '0px',
	textAlign: 'start',
	backgroundColor: 'rgba(0, 0, 0, 0)'
};

const meaningfulStyles = (styles: Record<string, string>): [string, string][] =>
	Object.entries(styles).filter(([k, v]) => {
		if (STYLE_DEFAULTS[k] === v) return false;
		// Drop borders that aren't visible (0-width or transparent).
		if (k === 'border' && (/^0px/.test(v) || v.includes('none') || /rgba\([^)]*,\s*0\)\s*$/.test(v))) return false;
		return true;
	});

// One actionable line per annotation for the coding agent: element selector,
// its source file:line when the app is instrumented, and the user's note.
export const annotationRef = (a: Annotation): string => {
	const src = a.source ? ` (${a.source})` : '';
	const note = a.note ? `: ${a.note}` : '';
	return `↳ ${a.selector}${src}${note}`;
};

export const annotationImageFile = (a: Annotation) =>
	a.image
		? {
				type: 'image',
				url: a.image,
				name: `annotation-${a.id}.png`,
				annotation: true,
				annotationId: a.id,
				annotationSelector: a.selector,
				annotationNote: a.note
			}
		: null;

// Prepend rich annotation blocks (text, model-actionable) to the user's draft on
// send. The screenshot itself travels as an image file attachment.
export const serializeAnnotations = (list: Annotation[], draft: string): string => {
	if (list.length === 0) return draft;

	const blocks = list
		.map((a) => {
			const lines: string[] = [`[Annotation: ${a.selector}]`];
			if (a.source) lines.push(`source: ${a.source}`);
			lines.push(`box: ${a.rect.w}×${a.rect.h} at (${a.rect.x},${a.rect.y})`);
			const styleEntries = meaningfulStyles(a.styles);
			if (styleEntries.length > 0) {
				lines.push(`styles: ${styleEntries.map(([k, v]) => `${k}: ${v};`).join(' ')}`);
			}
			if (a.html) lines.push(`html: ${a.html}`);
			if (a.text) lines.push(`text: "${a.text}"`);
			if (a.note) lines.push(`ask: ${a.note}`);
			return lines.join('\n');
		})
		.join('\n\n');

	const payload = `<annotations>\n${blocks}\n</annotations>`;
	return draft ? `${payload}\n\n${draft}` : payload;
};

export const stripSerializedAnnotationsForDisplay = (content = ''): string =>
	content.replace(/^<annotations>\n[\s\S]*?\n<\/annotations>\s*/m, '').trimStart();
