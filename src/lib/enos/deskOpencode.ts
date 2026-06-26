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

import type { EnosDesktopOpencodeBridge, EnosDesktopOpencodeEvent } from './desktopBridge';

export type DeskStreamEvent =
	| { kind: 'content'; partId: string; text: string; messageId?: string }
	| { kind: 'reasoning'; partId: string; text: string; messageId?: string }
	| { kind: 'tool_start'; callId: string; tool: string; input: unknown }
	| { kind: 'tool_end'; callId: string; tool: string; ok: boolean }
	| { kind: 'user_message'; messageId: string }
	| { kind: 'done' }
	| { kind: 'error'; message: string };

// VALIDATED 2026-06-24 against live `opencode serve` (1.17.9): the turn streams via
// `message.part.updated` (text/reasoning/tool parts) whose text is CUMULATIVE (replace,
// not append) → DeskStreamState replace semantics is correct. `session.idle` ends the
// turn. We deliberately ignore `message.part.delta` (smoother per-token, but untyped in
// the SDK and version-specific) — `.updated` snapshots converge to the correct content.
const toolEndStatuses = new Set(['completed', 'error', 'failed']);

/** Parse an SSE text chunk into the JSON event objects on its `data:` lines. Pure;
 *  carries a buffer for lines split across network chunks. */
export const parseSseChunk = (
	buffer: string,
	chunk: string
): { events: any[]; buffer: string } => {
	const events: any[] = [];
	let buf = buffer + chunk;
	let nl: number;
	while ((nl = buf.indexOf('\n')) !== -1) {
		const line = buf.slice(0, nl).trim();
		buf = buf.slice(nl + 1);
		if (line.startsWith('data: ')) {
			const data = line.slice(6);
			if (data && data !== '[DONE]') {
				try {
					events.push(JSON.parse(data));
				} catch {
					/* keep-alive / partial — ignore */
				}
			}
		}
	}
	return { events, buffer: buf };
};

/** Map ONE raw OpenCode event to a desk stream event (or null to ignore). Pure. */
export const normalizeOpencodeEvent = (event: any): DeskStreamEvent | null => {
	const type = event?.type;
	if (type === 'session.idle') return { kind: 'done' };
	if (type === 'session.error') {
		return { kind: 'error', message: String(event?.properties?.error?.message ?? 'ENOS Cloud error') };
	}
	// The /event stream carries parts for BOTH the user message and the assistant
	// message. message.updated tells us a message's role; flag user messages so their
	// text parts (the prompt echo) are dropped, not rendered as assistant content.
	if (type === 'message.updated' || type === 'message.created') {
		const info = event?.properties?.info ?? event?.properties?.message ?? event?.info;
		const messageId = String(info?.id ?? '');
		if (messageId && info?.role === 'user') return { kind: 'user_message', messageId };
		return null;
	}
	if (type !== 'message.part.updated') return null;

	const part = event?.properties?.part ?? event?.part;
	if (!part || typeof part !== 'object') return null;
	const messageId = part.messageID ? String(part.messageID) : undefined;

	if (part.type === 'text' && typeof part.text === 'string') {
		return { kind: 'content', partId: String(part.id ?? 'text'), text: part.text, messageId };
	}
	if (part.type === 'reasoning' && typeof part.text === 'string') {
		return { kind: 'reasoning', partId: String(part.id ?? 'reasoning'), text: part.text, messageId };
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
	private userMessages = new Set<string>();

	apply(ev: DeskStreamEvent): void {
		if (ev.kind === 'user_message') {
			this.userMessages.add(ev.messageId);
			return;
		}
		// Drop parts that belong to the user's own message (prompt echo).
		if (ev.kind === 'content' || ev.kind === 'reasoning') {
			if (ev.messageId && this.userMessages.has(ev.messageId)) return;
		}
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

export type DeskOpencodeCallbacks = {
	/** current full content + reasoning after each update (for the desk message + accordion) */
	onUpdate: (s: { content: string; reasoning: string }) => void;
	/** tool lifecycle for statusHistory */
	onTool?: (ev: { kind: 'tool_start' | 'tool_end'; tool: string; ok?: boolean }) => void;
};

export type DeskOpencodeTransport = {
	createSession: () => Promise<void>;
	sendPrompt: (input: {
		message: string;
		agent: string;
		model: { providerID: string; modelID: string };
	}) => Promise<{ streamId: string }>;
	subscribeEvents: (onEvent: (event: EnosDesktopOpencodeEvent) => void) => () => void;
};

const errorMessage = (error: unknown, fallback: string): string => {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	if (error && typeof error === 'object' && 'message' in error) {
		return String((error as { message?: unknown }).message ?? fallback);
	}
	return fallback;
};

const applyDeskStreamEvent = (
	ev: DeskStreamEvent,
	state: DeskStreamState,
	cb: DeskOpencodeCallbacks
): 'dirty' | 'done' | 'clean' => {
	if (ev.kind === 'content' || ev.kind === 'reasoning') {
		state.apply(ev);
		return 'dirty';
	}
	if (ev.kind === 'user_message') {
		state.apply(ev);
		return 'clean';
	}
	if (ev.kind === 'tool_start' || ev.kind === 'tool_end') {
		cb.onTool?.({ kind: ev.kind, tool: ev.tool, ok: (ev as any).ok });
		return 'clean';
	}
	if (ev.kind === 'error') {
		throw new Error(ev.message);
	}
	return 'done';
};

export const bridgeTransport = (
	opencode: EnosDesktopOpencodeBridge,
	folderId: string
): DeskOpencodeTransport => ({
	createSession: async () => {
		await opencode.start(folderId);
	},
	sendPrompt: ({ message, agent }) => opencode.prompt(folderId, message, agent),
	subscribeEvents: (onEvent) => opencode.events(onEvent)
});

const runOpencodeTransportTurn = async (
	transport: DeskOpencodeTransport,
	opts: {
		message: string;
		agent: string;
		model: { providerID: string; modelID: string };
		signal?: AbortSignal;
	},
	cb: DeskOpencodeCallbacks,
	// Event normalizer for the active local engine. OpenCode by default; the Pi RPC
	// engine (ENOS_DESK_ENGINE=pi, reported via get-capabilities deskEngine) passes
	// normalizePiEvent. The transport (channels) is identical; only the shapes differ.
	normalize: (event: any) => DeskStreamEvent | null = normalizeOpencodeEvent
): Promise<{ content: string; reasoning: string }> => {
	const state = new DeskStreamState();

	await transport.createSession();
	const promptResult = await transport.sendPrompt({
		message: opts.message,
		agent: opts.agent,
		model: opts.model
	});
	const streamId = promptResult.streamId;
	if (!streamId) throw new Error('ENOS could not start a session');

	return await new Promise((resolve, reject) => {
		let settled = false;
		let dispose: (() => void) | null = null;
		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			dispose?.();
			fn();
		};
		const abort = () => finish(() => reject(new Error('ENOS session was aborted')));

		if (opts.signal?.aborted) {
			reject(new Error('ENOS session was aborted'));
			return;
		}
		opts.signal?.addEventListener('abort', abort, { once: true });

		dispose = transport.subscribeEvents((raw) => {
			if (raw.streamId !== streamId) return;
			try {
				if ('error' in raw) {
					finish(() => reject(new Error(errorMessage(raw.error, 'ENOS Cloud error'))));
					return;
				}
				if ('done' in raw && raw.done) {
					cb.onUpdate({ content: state.content(), reasoning: state.reasoning() });
					finish(() => resolve({ content: state.content(), reasoning: state.reasoning() }));
					return;
				}
				if (!('event' in raw)) return;
				const ev = normalize(raw.event);
				if (!ev) return;
				const result = applyDeskStreamEvent(ev, state, cb);
				if (result === 'dirty') {
					cb.onUpdate({ content: state.content(), reasoning: state.reasoning() });
				} else if (result === 'done') {
					cb.onUpdate({ content: state.content(), reasoning: state.reasoning() });
					finish(() => resolve({ content: state.content(), reasoning: state.reasoning() }));
				}
			} catch (e) {
				finish(() => reject(e));
			}
		});
	});
};

/**
 * Drive ONE desk turn through `opencode serve`: create a session, send the prompt,
 * consume the `/event` SSE, feed events through the validated normalizer + accumulator,
 * and surface content/reasoning/tool updates to the desk chat. Returns the final
 * content+reasoning. Transport only — the parsing/mapping is the tested core above.
 */
export const runOpencodeDeskTurn = async (
	opts: {
		base?: string; // e.g. /api/oc/<ws>  (Caddy → the workspace's serve port)
		headers?: Record<string, string>;
		message: string;
		agent: string; // 'build' | 'plan'
		model: { providerID: string; modelID: string };
		signal?: AbortSignal;
		fetchImpl?: typeof fetch;
		transport?: DeskOpencodeTransport;
		// Local engine event normalizer (Pi RPC vs OpenCode); selected by the caller from
		// the desktop bridge's get-capabilities `deskEngine`. Defaults to OpenCode.
		normalize?: (event: any) => DeskStreamEvent | null;
	},
	cb: DeskOpencodeCallbacks
): Promise<{ content: string; reasoning: string }> => {
	if (opts.transport) return runOpencodeTransportTurn(opts.transport, opts, cb, opts.normalize);
	if (!opts.base) throw new Error('ENOS Cloud base URL required');

	const f = opts.fetchImpl ?? fetch;
	const h = { 'Content-Type': 'application/json', ...(opts.headers ?? {}) };

	const sess = await (await f(`${opts.base}/session`, { method: 'POST', headers: h, body: '{}' })).json();
	const sid = sess?.id ?? sess?.sessionID;
	if (!sid) throw new Error('ENOS Cloud could not create a session');

	const state = new DeskStreamState();
	const evRes = await f(`${opts.base}/event`, { headers: h, signal: opts.signal });
	if (!evRes.body) throw new Error('ENOS Cloud event stream unavailable');

	// fire the prompt (don't await its completion; the turn completes via session.idle)
	void f(`${opts.base}/session/${sid}/message`, {
		method: 'POST',
		headers: h,
		body: JSON.stringify({
			parts: [{ type: 'text', text: opts.message }],
			agent: opts.agent,
			model: opts.model
		})
	});

	const reader = evRes.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		const { events, buffer: nb } = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
		buffer = nb;
		let dirty = false;
		for (const raw of events) {
			const ev = normalizeOpencodeEvent(raw);
			if (!ev) continue;
			const result = applyDeskStreamEvent(ev, state, cb);
			if (result === 'dirty') {
				dirty = true;
			} else if (result === 'done') {
				cb.onUpdate({ content: state.content(), reasoning: state.reasoning() });
				return { content: state.content(), reasoning: state.reasoning() };
			}
		}
		if (dirty) cb.onUpdate({ content: state.content(), reasoning: state.reasoning() });
	}
	return { content: state.content(), reasoning: state.reasoning() };
};

// Map ONE raw Pi (`--mode rpc`) event to a desk stream event (or null to ignore). Pure.
// Cumulative text/reasoning come from assistantMessageEvent.partial.content (replace
// semantics, matching DeskStreamState). Captured from real --mode rpc output 2026-06-26.
export const normalizePiEvent = (event: any): DeskStreamEvent | null => {
	const t = event?.type;
	if (t === 'agent_end') return { kind: 'done' };
	if (t === 'response' && event?.success === false) {
		return { kind: 'error', message: String(event?.error ?? 'Engine error') };
	}
	if (t === 'tool_execution_start') {
		return { kind: 'tool_start', callId: event.toolCallId, tool: event.toolName, input: event.args };
	}
	if (t === 'tool_execution_end') {
		return { kind: 'tool_end', callId: event.toolCallId, tool: event.toolName, ok: !event.isError };
	}
	if (t === 'message_update') {
		const ae = event.assistantMessageEvent;
		if (!ae) return null;
		const idx = ae.contentIndex ?? 0;
		const part = ae.partial?.content?.[idx];
		if (ae.type === 'text_delta') {
			return { kind: 'content', partId: `text-${idx}`, text: part?.text ?? ae.delta ?? '' };
		}
		if (ae.type === 'thinking_delta') {
			return { kind: 'reasoning', partId: `think-${idx}`, text: part?.thinking ?? ae.delta ?? '' };
		}
	}
	return null;
};
