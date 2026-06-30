/**
 * Desk-C: surface a desk agent's streamed model reasoning as base OWUI's own
 * collapsible `<details type="reasoning">` block (the same accordion the normal
 * chat surface renders), followed by the answer. The desk agent loop talks to
 * OpenRouter through the Electron bridge, bypassing the backend middleware that
 * normally wraps reasoning — so we reproduce that exact block on the client and
 * let base render it. No custom reasoning UI: reuse, don't invent.
 */

export type DeskReasoningOpts = { done: boolean; durationS: number };

/**
 * A one-line gist of the model's reasoning, so the Desk feed shows WHAT it
 * reasoned ("Still not connecting — the panel is in chat mode…") rather than a
 * bare "Thinking". Takes the last complete sentence of the streamed reasoning
 * (the model's most recent thought), normalised to one line and length-capped.
 */
export const reasoningGist = (text: string, maxLen = 140): string => {
	// Strip leading blockquote markers ("> ") — Chat reasoning bodies are quoted —
	// then collapse to one line so the last sentence reads cleanly.
	const t = (text ?? '')
		.replace(/^\s*>+\s?/gm, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (!t) return '';
	const parts = t.split(/(?<=[.!?])\s+/).filter(Boolean);
	let gist = parts[parts.length - 1] ?? t;
	if (gist.length > maxLen) gist = gist.slice(0, maxLen - 1).trimEnd() + '…';
	return gist;
};

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
