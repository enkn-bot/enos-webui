import { describe, expect, test } from 'vitest';

import {
	DeskStreamState,
	bridgeTransport,
	normalizeOpencodeEvent,
	parseSseChunk,
	runOpencodeDeskTurn
} from './deskOpencode';

const partUpdated = (part: any) => ({ type: 'message.part.updated', properties: { part } });

describe('normalizeOpencodeEvent', () => {
	test('text part -> content', () => {
		expect(normalizeOpencodeEvent(partUpdated({ id: 'p1', type: 'text', text: 'Hello' }))).toEqual({
			kind: 'content',
			partId: 'p1',
			text: 'Hello'
		});
	});

	test('reasoning part -> reasoning', () => {
		expect(
			normalizeOpencodeEvent(partUpdated({ id: 'r1', type: 'reasoning', text: 'thinking' }))
		).toEqual({ kind: 'reasoning', partId: 'r1', text: 'thinking' });
	});

	test('tool running -> tool_start; completed -> tool_end ok; error -> tool_end not ok', () => {
		expect(
			normalizeOpencodeEvent(
				partUpdated({ type: 'tool', callID: 'c1', tool: 'edit', state: { status: 'running', input: { path: 'a' } } })
			)
		).toEqual({ kind: 'tool_start', callId: 'c1', tool: 'edit', input: { path: 'a' } });
		expect(
			normalizeOpencodeEvent(partUpdated({ type: 'tool', callID: 'c1', tool: 'edit', state: { status: 'completed' } }))
		).toEqual({ kind: 'tool_end', callId: 'c1', tool: 'edit', ok: true });
		expect(
			normalizeOpencodeEvent(partUpdated({ type: 'tool', callID: 'c2', tool: 'bash', state: { status: 'error' } }))
		).toEqual({ kind: 'tool_end', callId: 'c2', tool: 'bash', ok: false });
	});

	test('pending tool + step parts are ignored', () => {
		expect(normalizeOpencodeEvent(partUpdated({ type: 'tool', tool: 'x', state: { status: 'pending' } }))).toBeNull();
		expect(normalizeOpencodeEvent(partUpdated({ type: 'step-start' }))).toBeNull();
	});

	test('session.idle -> done; session.error -> error', () => {
		expect(normalizeOpencodeEvent({ type: 'session.idle' })).toEqual({ kind: 'done' });
		expect(
			normalizeOpencodeEvent({ type: 'session.error', properties: { error: { message: 'boom' } } })
		).toEqual({ kind: 'error', message: 'boom' });
	});

	test('unrelated events -> null', () => {
		expect(normalizeOpencodeEvent({ type: 'lsp.updated' })).toBeNull();
		expect(normalizeOpencodeEvent({})).toBeNull();
	});
});

describe('parseSseChunk', () => {
	test('extracts data-line events and buffers a partial line across chunks', () => {
		const a = parseSseChunk('', 'data: {"type":"session.idle"}\ndata: {"ty');
		expect(a.events).toEqual([{ type: 'session.idle' }]);
		const b = parseSseChunk(a.buffer, 'pe":"x"}\n');
		expect(b.events).toEqual([{ type: 'x' }]);
	});

	test('ignores [DONE] and keep-alive noise', () => {
		const r = parseSseChunk('', 'data: [DONE]\n: keep-alive\ndata: notjson\n');
		expect(r.events).toEqual([]);
	});
});

describe('runOpencodeDeskTurn (driver, faked serve)', () => {
	const sse = (objs: any[]) =>
		new ReadableStream({
			start(c) {
				for (const o of objs) c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(o)}\n`));
				c.close();
			}
		});

	test('creates session, streams content+reasoning+tools, resolves on session.idle', async () => {
		const calls: string[] = [];
		const events = [
			{ type: 'message.part.updated', properties: { part: { id: 'r', type: 'reasoning', text: 'thinking' } } },
			{ type: 'message.part.updated', properties: { part: { type: 'tool', callID: 'c1', tool: 'edit', state: { status: 'running' } } } },
			{ type: 'message.part.updated', properties: { part: { type: 'tool', callID: 'c1', tool: 'edit', state: { status: 'completed' } } } },
			{ type: 'message.part.updated', properties: { part: { id: 't', type: 'text', text: 'Fixed it.' } } },
			{ type: 'session.idle' }
		];
		const fetchImpl = (async (url: string, init?: any) => {
			calls.push(`${init?.method ?? 'GET'} ${url}`);
			if (url.endsWith('/session')) return { json: async () => ({ id: 'ses_1' }) } as any;
			if (url.endsWith('/event')) return { body: sse(events) } as any;
			return { json: async () => ({}) } as any; // message post
		}) as any;

		const tools: string[] = [];
		let last = { content: '', reasoning: '' };
		const out = await runOpencodeDeskTurn(
			{ base: '/api/oc/ws-1', message: 'fix', agent: 'build', model: { providerID: 'enos', modelID: 'm' }, fetchImpl },
			{ onUpdate: (s) => (last = s), onTool: (e) => tools.push(`${e.kind}:${e.tool}:${e.ok}`) }
		);
		expect(out.content).toBe('Fixed it.');
		expect(out.reasoning).toBe('thinking');
		expect(tools).toEqual(['tool_start:edit:undefined', 'tool_end:edit:true']);
		expect(calls).toContain('POST /api/oc/ws-1/session');
		expect(calls.some((c) => c.includes('/session/ses_1/message'))).toBe(true);
	});

	test('drives a turn over the desktop bridge transport with cumulative replace semantics', async () => {
		const events: ((ev: any) => void)[] = [];
		const calls: string[] = [];
		const fakeOpencode = {
			start: async (folderId: string) => {
				calls.push(`start:${folderId}`);
				return { port: 4096, sessionId: 'session-1' };
			},
			prompt: async (folderId: string, prompt: string, agent?: string) => {
				calls.push(`prompt:${folderId}:${prompt}:${agent}`);
				setTimeout(() => {
					for (const emit of events) {
						emit({
							streamId: 'stream-1',
							event: partUpdated({ id: 'r', type: 'reasoning', text: 'think' })
						});
						emit({
							streamId: 'stream-1',
							event: partUpdated({ id: 't', type: 'text', text: 'Hel' })
						});
						emit({
							streamId: 'stream-1',
							event: partUpdated({ id: 't', type: 'text', text: 'Hello' })
						});
						emit({
							streamId: 'stream-1',
							event: partUpdated({ id: 'u', type: 'text', text: ' world' })
						});
						emit({ streamId: 'stream-1', done: true });
					}
				});
				return { streamId: 'stream-1' };
			},
			events: (onEvent: (ev: any) => void) => {
				events.push(onEvent);
				return () => calls.push('dispose');
			},
			stop: async (folderId: string) => {
				calls.push(`stop:${folderId}`);
			}
		};

		let last = { content: '', reasoning: '' };
		const out = await runOpencodeDeskTurn(
			{
				message: 'fix it',
				agent: 'build',
				model: { providerID: 'local', modelID: 'opencode' },
				transport: bridgeTransport(fakeOpencode, 'folder-1')
			},
			{ onUpdate: (s) => (last = s) }
		);

		expect(out).toEqual({ content: 'Hello world', reasoning: 'think' });
		expect(last).toEqual(out);
		expect(calls).toEqual(['start:folder-1', 'prompt:folder-1:fix it:build', 'dispose']);
	});
});

describe('DeskStreamState (multi-part assembly)', () => {
	test('joins text parts in arrival order, replacing each part on update', () => {
		const s = new DeskStreamState();
		s.apply({ kind: 'content', partId: 'a', text: 'Hel' });
		s.apply({ kind: 'content', partId: 'a', text: 'Hello' }); // cumulative update replaces
		s.apply({ kind: 'content', partId: 'b', text: ' world' });
		expect(s.content()).toBe('Hello world');
	});

	test('reasoning accumulates separately from content', () => {
		const s = new DeskStreamState();
		s.apply({ kind: 'reasoning', partId: 'r', text: 'step 1' });
		s.apply({ kind: 'content', partId: 't', text: 'answer' });
		expect(s.reasoning()).toBe('step 1');
		expect(s.content()).toBe('answer');
	});
});
