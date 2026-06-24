// B — OpenCode powers the ENOS Desk chat. The desk chat UI stays; OpenCode (`opencode
// serve`) is the engine behind it, replacing the kimi agent loop. This module is the
// PURE core: it normalizes OpenCode's `/event` SSE stream into the events the desk chat
// already renders (content, reasoning accordion, tool statusHistory). The transport
// (POST prompt + read SSE) and Chat.svelte wiring sit on top of this tested core.
//
// OpenCode event model (validated against @opencode-ai/sdk types):
//   message.part.updated -> part: { type: 'text'|'reasoning'|'tool'|'step-*', ... }
//     tool part: { tool, state: { status: 'pending'|'running'|'completed'|'error'|... } }
//   session.idle  -> the turn is done
//   session.error -> failure

export type DeskStreamEvent =
	| { kind: 'content'; partId: string; text: string }
	| { kind: 'reasoning'; partId: string; text: string }
	| { kind: 'tool_start'; callId: string; tool: string; input: unknown }
	| { kind: 'tool_end'; callId: string; tool: string; ok: boolean }
	| { kind: 'done' }
	| { kind: 'error'; message: string };

const toolEndStatuses = new Set(['completed', 'error', 'failed']);

/** Map ONE raw OpenCode event to a desk stream event (or null to ignore). Pure. */
export const normalizeOpencodeEvent = (event: any): DeskStreamEvent | null => {
	const type = event?.type;
	if (type === 'session.idle') return { kind: 'done' };
	if (type === 'session.error') {
		return { kind: 'error', message: String(event?.properties?.error?.message ?? 'OpenCode error') };
	}
	if (type !== 'message.part.updated') return null;

	const part = event?.properties?.part ?? event?.part;
	if (!part || typeof part !== 'object') return null;

	if (part.type === 'text' && typeof part.text === 'string') {
		return { kind: 'content', partId: String(part.id ?? 'text'), text: part.text };
	}
	if (part.type === 'reasoning' && typeof part.text === 'string') {
		return { kind: 'reasoning', partId: String(part.id ?? 'reasoning'), text: part.text };
	}
	if (part.type === 'tool') {
		const status = part?.state?.status;
		const callId = String(part.callID ?? part.id ?? '');
		const tool = String(part.tool ?? 'tool');
		if (status === 'running' || status === 'pending') {
			// surface once it's actually running (pending is pre-input)
			return status === 'running'
				? { kind: 'tool_start', callId, tool, input: part?.state?.input }
				: null;
		}
		if (toolEndStatuses.has(status)) {
			return { kind: 'tool_end', callId, tool, ok: status === 'completed' };
		}
		return null;
	}
	return null;
};

// Desk chat needs ONE content string + ONE reasoning string, but OpenCode streams
// multiple parts (one per step) that update cumulatively. This accumulator joins text
// and reasoning parts in arrival order, replacing a part's text on each update — so the
// desk renderer (composeDeskMessageContent) always gets the current full content.
export class DeskStreamState {
	private order: string[] = [];
	private text = new Map<string, string>();
	private reason = new Map<string, string>();

	apply(ev: DeskStreamEvent): void {
		if (ev.kind === 'content') {
			if (!this.text.has(ev.partId)) this.order.push(ev.partId);
			this.text.set(ev.partId, ev.text);
		} else if (ev.kind === 'reasoning') {
			if (!this.reason.has(ev.partId)) this.order.push(ev.partId);
			this.reason.set(ev.partId, ev.text);
		}
	}

	content(): string {
		return this.order.map((id) => this.text.get(id)).filter(Boolean).join('');
	}

	reasoning(): string {
		return this.order.map((id) => this.reason.get(id)).filter(Boolean).join('');
	}
}
