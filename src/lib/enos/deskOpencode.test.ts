import { describe, expect, test } from 'vitest';

import {
	DeskStreamState,
	bridgeTransport,
	normalizeOpencodeEvent,
	normalizePiEvent,
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
	const piTextDelta = {
		type: 'message_update',
		assistantMessageEvent: {
			type: 'text_delta',
			contentIndex: 0,
			delta: 'Done.',
			partial: { role: 'assistant', content: [{ type: 'text', text: 'Done.' }] }
		}
	};
	const piThinkingDelta = {
		type: 'message_update',
		assistantMessageEvent: {
			type: 'thinking_delta',
			contentIndex: 0,
			delta: 'The plan',
			partial: { role: 'assistant', content: [{ type: 'thinking', thinking: 'The plan' }] }
		}
	};
	const piToolStart = { type: 'tool_execution_start', toolCallId: 'c1', toolName: 'write', args: { path: 'r.js' } };
	const piToolEnd = {
		type: 'tool_execution_end',
		toolCallId: 'c1',
		toolName: 'write',
		result: { content: [{ type: 'text', text: 'ok' }] },
		isError: false
	};
	const piAgentEnd = { type: 'agent_end', messages: [] };

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

		test('streams Pi cloud relay events, posts /prompt, and resolves on agent_end', async () => {
		const calls: string[] = [];
		const events = [piThinkingDelta, piToolStart, piToolEnd, piTextDelta, piAgentEnd];
		const fetchImpl = (async (url: string, init?: any) => {
			calls.push(`${init?.method ?? 'GET'} ${url}`);
			if (url.endsWith('/event')) return { body: sse(events) } as any;
			if (url.endsWith('/prompt')) return { json: async () => ({ ok: true }) } as any;
			return { json: async () => ({}) } as any;
		}) as any;

		const tools: string[] = [];
		let last = { content: '', reasoning: '' };
		const out = await runOpencodeDeskTurn(
			{
				base: '/api/oc2/ws-1',
				engine: 'pi',
				message: 'fix',
				agent: 'build',
				model: { providerID: 'enos', modelID: 'm' },
				fetchImpl,
				normalize: normalizePiEvent
			},
			{ onUpdate: (s) => (last = s), onTool: (e) => tools.push(`${e.kind}:${e.tool}:${e.ok}`) }
		);
		expect(out.content).toBe('Done.');
		expect(out.reasoning).toBe('The plan');
		expect(last).toEqual(out);
		expect(tools).toEqual(['tool_start:write:undefined', 'tool_end:write:true']);
		expect(calls).toContain('GET /api/oc2/ws-1/event');
		expect(calls).toContain('POST /api/oc2/ws-1/prompt');
		expect(calls.find((c) => c.includes('/session/'))).toBeUndefined();
	});

		test('forwards the selected mind on the Pi event stream and prompt body', async () => {
		const calls: string[] = [];
		let promptBody: any = null;
		const fetchImpl = (async (url: string, init?: any) => {
			calls.push(`${init?.method ?? 'GET'} ${url}`);
			if (url.includes('/event')) return { body: sse([piTextDelta, piAgentEnd]) } as any;
			if (url.endsWith('/prompt')) {
				promptBody = JSON.parse(init.body);
				return { json: async () => ({ ok: true }) } as any;
			}
			return { json: async () => ({}) } as any;
		}) as any;

		await runOpencodeDeskTurn(
			{
				base: '/api/oc2/ws-1',
				engine: 'pi',
				message: 'fix',
				agent: 'build',
				mind: 'deepmind',
				model: { providerID: 'enos', modelID: 'enos' },
				fetchImpl,
				normalize: normalizePiEvent
			},
			{ onUpdate: () => {}, onTool: () => {} }
		);
		expect(calls).toContain('GET /api/oc2/ws-1/event?mind=deepmind');
		expect(promptBody).toEqual({ message: 'fix', mind: 'deepmind' });
	});

		test('cancels the SSE reader when the turn ends (no orphan reader on the shared Pi proc)', async () => {
			// The relay streams ONE persistent Pi proc's stdout into this SSE; if the
			// reader isn't cancelled on `agent_end`, the relay's stdout loop stays alive
			// as an orphan that steals the next turn's events → hang + "already
			// processing". Assert reader.cancel() fires on turn completion.
			let cancelled = 0;
			const enc = new TextEncoder();
			const objs = [piTextDelta, piAgentEnd, piToolStart /* would-be next-turn line */];
			let i = 0;
			const body = {
				getReader: () => ({
					read: async () =>
						i < objs.length
							? { value: enc.encode(`data: ${JSON.stringify(objs[i++])}\n`), done: false }
							: { value: undefined, done: true },
					cancel: async () => {
						cancelled += 1;
					}
				})
			};
			const fetchImpl = (async (url: string) => {
				if (url.includes('/event')) return { body } as any;
				if (url.endsWith('/prompt')) return { json: async () => ({ ok: true }) } as any;
				return { json: async () => ({}) } as any;
			}) as any;

			const out = await runOpencodeDeskTurn(
				{
					base: '/api/oc2/ws-1',
					engine: 'pi',
					message: 'fix',
					agent: 'build',
					model: { providerID: 'enos', modelID: 'enos' },
					fetchImpl,
					normalize: normalizePiEvent
				},
				{ onUpdate: () => {}, onTool: () => {} }
			);
			expect(out.content).toBe('Done.'); // resolved on agent_end, before the 3rd line
			expect(cancelled).toBe(1); // reader cancelled → relay loop can exit
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

	test('drops text parts belonging to the user message (prompt echo)', () => {
		const s = new DeskStreamState();
		// user message.updated arrives before its part (validated ordering)
		s.apply({ kind: 'user_message', messageId: 'msg_user' });
		s.apply({ kind: 'content', partId: 'pu', text: 'write a test file to folder', messageId: 'msg_user' });
		s.apply({ kind: 'content', partId: 'pa', text: 'Done — wrote test.txt', messageId: 'msg_asst' });
		expect(s.content()).toBe('Done — wrote test.txt');
	});
});

describe('normalizeOpencodeEvent role filtering', () => {
	test('message.updated role=user -> user_message marker', () => {
		expect(
			normalizeOpencodeEvent({ type: 'message.updated', properties: { info: { id: 'msg_u', role: 'user' } } })
		).toEqual({ kind: 'user_message', messageId: 'msg_u' });
	});

	test('message.updated role=assistant -> ignored (null)', () => {
		expect(
			normalizeOpencodeEvent({ type: 'message.updated', properties: { info: { id: 'msg_a', role: 'assistant' } } })
		).toBeNull();
	});

	test('text part carries its messageID', () => {
		expect(
			normalizeOpencodeEvent(partUpdated({ id: 'p1', type: 'text', text: 'hi', messageID: 'msg_a' }))
		).toEqual({ kind: 'content', partId: 'p1', text: 'hi', messageId: 'msg_a' });
	});
});
