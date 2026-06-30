export type Annotation = {
	id: string;
	source: string | null;
	tag: string;
	selector: string;
	text: string;
	styles: { color: string; fontSize: string; fontFamily: string };
	rect: { w: number; h: number };
	url: string;
	note: string;
};

const entry = (a: Annotation): string => {
	const src = a.source ? ` · ${a.source}` : '';
	const note = a.note ? ` — ${a.note}` : '';
	return `↳ ${a.selector}${src}${note}`;
};

export const serializeAnnotations = (list: Annotation[], draft: string): string => {
	if (list.length === 0) return draft;
	const refs = list.map(entry).join('\n');
	return `${refs}\n\n${draft}`;
};
