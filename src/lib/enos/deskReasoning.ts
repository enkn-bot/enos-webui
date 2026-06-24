/**
 * Desk-C: surface a desk agent's streamed model reasoning as base OWUI's own
 * collapsible `<details type="reasoning">` block (the same accordion the normal
 * chat surface renders), followed by the answer. The desk agent loop talks to
 * OpenRouter through the Electron bridge, bypassing the backend middleware that
 * normally wraps reasoning — so we reproduce that exact block on the client and
 * let base render it. No custom reasoning UI: reuse, don't invent.
 */

export type DeskReasoningOpts = { done: boolean; durationS: number };

const blockquote = (text: string): string =>
	text
		.split('\n')
		.map((line) => (line.startsWith('>') ? line : `> ${line}`))
		.join('\n');

/** The `<details type="reasoning">` block, or '' when there's no reasoning. */
export const buildDeskReasoningBlock = (reasoning: string, opts: DeskReasoningOpts): string => {
	const text = (reasoning ?? '').trim();
	if (!text) return '';
	const duration = Math.max(0, Math.round(opts.durationS || 0));
	const summary = opts.done ? `Thought for ${duration} seconds` : 'Thinking…';
	return (
		`<details type="reasoning" done="${opts.done}" duration="${duration}">\n` +
		`<summary>${summary}</summary>\n` +
		`${blockquote(text)}\n` +
		`</details>\n`
	);
};

/** Full desk message body: live reasoning accordion (if any) + the answer. */
export const composeDeskMessageContent = (
	reasoning: string,
	content: string,
	opts: DeskReasoningOpts
): string => buildDeskReasoningBlock(reasoning, opts) + (content ?? '');
