import type { EnosDesktopPiBridge, EnosDesktopPiEvent } from './desktopBridge';
import { extractPiToolOutcome } from './toolStatusLabels';

export type DeskStreamEvent =
	| { kind: 'content'; partId: string; text: string; messageId?: string }
	| { kind: 'reasoning'; partId: string; text: string; messageId?: string }
	| { kind: 'tool_start'; callId: string; tool: string; input: unknown }
	| { kind: 'tool_end'; callId: string; tool: string; ok: boolean; detail?: string }
	| { kind: 'done' }
	| { kind: 'error'; message: string };

/** Parse an SSE text chunk into the JSON event objects on its `data:` lines. Pure;
 * carries a buffer for lines split across network chunks. */
export const parseSseChunk = (buffer: string, chunk: string): { events: any[]; buffer: string } => {
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
					/* keep-alive / partial - ignore */
				}
			}
		}
	}
	return { events, buffer: buf };
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
		return {
			kind: 'tool_start',
			callId: event.toolCallId,
			tool: event.toolName,
			input: event.args
		};
	}
	if (t === 'tool_execution_end') {
		return {
			kind: 'tool_end',
			callId: event.toolCallId,
			tool: event.toolName,
			ok: !event.isError,
			detail: extractPiToolOutcome(event.result ?? event.output ?? event.state)
		};
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

// Desk chat needs ONE content string + ONE reasoning string, but Pi streams multiple
// parts that update cumulatively. This accumulator joins text and reasoning parts in
// arrival order, replacing a part's text on each update.
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
		return this.order
			.map((id) => this.text.get(id))
			.filter(Boolean)
			.join('');
	}

	reasoning(): string {
		return this.order
			.map((id) => this.reason.get(id))
			.filter(Boolean)
			.join('');
	}
}

export type DeskPiCallbacks = {
	/** current full content + reasoning after each update (for the desk message + accordion) */
	onUpdate: (s: { content: string; reasoning: string }) => void;
	/** tool lifecycle for statusHistory - input carries the tool args for context */
	onTool?: (ev: {
		kind: 'tool_start' | 'tool_end';
		tool: string;
		ok?: boolean;
		detail?: string;
		/** tool arguments (path, query, code, etc.) - present on tool_start */
		input?: unknown;
	}) => void;
};

export type DeskPiTransport = {
	createSession: () => Promise<void>;
	sendPrompt: (input: {
		message: string;
		agent: string;
		model: { providerID: string; modelID: string };
	}) => Promise<{ streamId: string }>;
	subscribeEvents: (onEvent: (event: EnosDesktopPiEvent) => void) => () => void;
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
	cb: DeskPiCallbacks
): 'dirty' | 'done' | 'clean' => {
	if (ev.kind === 'content' || ev.kind === 'reasoning') {
		state.apply(ev);
		return 'dirty';
	}
	if (ev.kind === 'tool_start' || ev.kind === 'tool_end') {
		cb.onTool?.({
			kind: ev.kind,
			tool: ev.tool,
			ok: (ev as any).ok,
			input: (ev as any).input,
			detail: (ev as any).detail
		});
		return 'clean';
	}
	if (ev.kind === 'error') throw new Error(ev.message);
	return 'done';
};

const consumeDeskSseEvents = async (
	evRes: Response,
	state: DeskStreamState,
	cb: DeskPiCallbacks
): Promise<{ content: string; reasoning: string }> => {
	if (!evRes.body) throw new Error('ENOS Cloud event stream unavailable');

	const reader = evRes.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	// Cancel on exit so the relay's stdout loop exits and does not steal a later turn.
	try {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			const { events, buffer: nb } = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
			buffer = nb;
			let dirty = false;
			for (const raw of events) {
				const ev = normalizePiEvent(raw);
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
	} finally {
		try {
			await reader.cancel();
		} catch {
			/* best-effort: already closed/errored */
		}
	}
};

export const desktopPiTransport = (pi: EnosDesktopPiBridge, folderId: string): DeskPiTransport => ({
	createSession: async () => {
		await pi.start(folderId);
	},
	sendPrompt: ({ message, agent }) => pi.prompt(folderId, message, agent),
	subscribeEvents: (onEvent) => pi.events(onEvent)
});

const runDesktopPiTurn = async (
	transport: DeskPiTransport,
	opts: {
		message: string;
		agent: string;
		model: { providerID: string; modelID: string };
		signal?: AbortSignal;
	},
	cb: DeskPiCallbacks
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
			opts.signal?.removeEventListener('abort', abort);
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
				const ev = normalizePiEvent(raw.event);
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
 * Drive one Desk Pi turn through the cloud relay (`base`) or local desktop transport.
 * Cloud relay streams `/event` and accepts `/prompt`; no retired session API remains.
 */
export const runDeskPiTurn = async (
	opts: {
		base?: string;
		headers?: Record<string, string>;
		message: string;
		agent: string;
		model: { providerID: string; modelID: string };
		// Selected ENOS mind for this turn: 'subconscious' | 'mind' | 'deepmind'.
		mind?: string;
		signal?: AbortSignal;
		fetchImpl?: typeof fetch;
		transport?: DeskPiTransport;
	},
	cb: DeskPiCallbacks
): Promise<{ content: string; reasoning: string }> => {
	if (opts.transport) return runDesktopPiTurn(opts.transport, opts, cb);
	if (!opts.base) throw new Error('ENOS Cloud base URL required');
	if (opts.signal?.aborted) throw new Error('ENOS session was aborted');

	const f = opts.fetchImpl ?? fetch;
	const h = { 'Content-Type': 'application/json', ...(opts.headers ?? {}) };

	const mindQuery = opts.mind ? `?mind=${encodeURIComponent(opts.mind)}` : '';
	const state = new DeskStreamState();
	const evRes = await f(`${opts.base}/event${mindQuery}`, { headers: h, signal: opts.signal });
	const abort = async () => {
		try {
			await f(`${opts.base}/abort`, { method: 'POST', headers: h });
		} catch {
			/* best-effort */
		}
	};
	const onAbort = () => {
		void abort();
	};
	opts.signal?.addEventListener('abort', onAbort, { once: true });

	try {
		void f(`${opts.base}/prompt`, {
			method: 'POST',
			headers: h,
			body: JSON.stringify({ message: opts.message, ...(opts.mind ? { mind: opts.mind } : {}) })
		});
		return await consumeDeskSseEvents(evRes, state, cb);
	} finally {
		opts.signal?.removeEventListener('abort', onAbort);
	}
};
