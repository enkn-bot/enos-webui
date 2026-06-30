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

const entry = (a: Annotation, i: number): string => {
	const src = a.source ? ` — src: ${a.source}` : '';
	const note = a.note ? ` — ask: ${a.note}` : '';
	const style = `${a.styles.fontSize} ${a.styles.fontFamily}, ${a.styles.color}, ${a.rect.w}×${a.rect.h}`;
	const text = a.text ? ` "${a.text}"` : '';
	return `${i + 1}. <${a.selector}>${text}${src}${note} — ${style}`;
};

export const serializeAnnotations = (list: Annotation[], draft: string): string => {
	if (list.length === 0) return draft;
	const url = list[0]?.url ?? '';
	const header = `[Annotations on ${url}]`;
	const body = list.map(entry).join('\n');
	return `${header}\n${body}\n\n${draft}`;
};
