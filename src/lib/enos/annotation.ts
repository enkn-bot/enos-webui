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
	image?: string; // dataURL screenshot of the element, attached on send
};

// Build the short text ref appended to the prompt alongside the screenshot.
export const annotationRef = (a: Annotation): string => {
	const parts: string[] = [];
	if (a.note) parts.push(a.note);
	if (a.source) parts.push(a.source);
	return parts.join(' ');
};
