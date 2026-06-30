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

const host = (url: string): string => {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
};

const entry = (a: Annotation): string => {
	const src = a.source ? ` · ${a.source}` : '';
	const note = a.note ? ` — ${a.note}` : '';
	const shot = a.image ? ' (screenshot attached)' : '';
	return `↳ annotated element ${a.selector} on ${host(a.url)}${src}${shot}${note}`;
};

export const serializeAnnotations = (list: Annotation[], draft: string): string => {
	if (list.length === 0) return draft;
	const refs = list.map(entry).join('\n');
	return `${refs}\n\n${draft}`;
};
