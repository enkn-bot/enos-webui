import { describe, expect, test } from 'vitest';

import {
	DeskStreamState,
	desktopPiTransport,
	normalizePiEvent,
	parseSseChunk,
	runDeskPiTurn
} from './deskPiTransport';

describe('normalizePiEvent', () => {
	test('maps Pi content, reasoning, tool, done, and error events', () => {
		expect(
			normalizePiEvent({
				type: 'message_update',
				assistantMessageEvent: {
					type: 'text_delta',
					contentIndex: 0,
					delta: 'Done.',
					partial: { content: [{ type: 'text', text: 'Done.' }] }
				}
			})
		).toEqual({ kind: 'content', partId: 'text-0', text: 'Done.' });
		expect(
			normalizePiEvent({
				type: 'message_update',
				assistantMessageEvent: {
					type: 'thinking_delta',
					contentIndex: 0,
					delta: 'Plan',
					partial: { content: [{ type: 'thinking', thinking: 'Plan' }] }
				}
			})
		).toEqual({ kind: 'reasoning', partId: 'think-0', text: 'Plan' });
		expect(
			normalizePiEvent({
				type: 'tool_execution_start',
				toolCallId: 'c1',
				toolName: 'write',
				args: { path: 'a.txt' }
			})
		).toEqual({ kind: 'tool_start', callId: 'c1', tool: 'write', input: { path: 'a.txt' } });
		expect(
			normalizePiEvent({
				type: 'tool_execution_end',
				toolCallId: 'c1',
				toolName: 'write',
				result: { title: 'Wrote a.txt', content: [{ type: 'text', text: 'ok' }] },
				isError: false
			})
		).toEqual({ kind: 'tool_end', callId: 'c1', tool: 'write', ok: true, detail: 'Wrote a.txt' });
		expect(normalizePiEvent({ type: 'agent_end' })).toEqual({ kind: 'done' });
		expect(normalizePiEvent({ type: 'response', success: false, error: 'boom' })).toEqual({
			kind: 'error',
			message: 'boom'
		});
		expect(normalizePiEvent({ type: 'ignored' })).toBeNull();
	});
});

describe('parseSseChunk', () => {
	test('extracts data-line events and buffers a partial line across chunks', () => {
		const a = parseSseChunk('', 'data: {"type":"agent_end"}\ndata: {"ty');
		expect(a.events).toEqual([{ type: 'agent_end' }]);
		const b = parseSseChunk(a.buffer, 'pe":"x"}\n');
		expect(b.events).toEqual([{ type: 'x' }]);
	});

	test('ignores [DONE] and keep-alive noise', () => {
		const r = parseSseChunk('', 'data: [DONE]\n: keep-alive\ndata: notjson\n');
		expect(r.events).toEqual([]);
	});
});

describe('runDeskPiTurn', () => {
	const piTextDelta = {
		type: 'message_update',
		assistantMessageEvent: {
			type: 'text_delta',
			contentIndex: 0,
			delta: 'Done.',
			partial: { role: 'assistant', content: [{ type: 'text', text: 'Done.' }] }
		}
	};
	const piTextDelta2 = {
		type: 'message_update',
		assistantMessageEvent: {
			type: 'text_delta',
			contentIndex: 1,
			delta: ' More.',
			partial: {
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Done.' },
					{ type: 'text', text: ' More.' }
				]
			}
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
	const piToolStart = {
		type: 'tool_execution_start',
		toolCallId: 'c1',
		toolName: 'write',
		args: { path: 'r.js' }
	};
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
		const out = await runDeskPiTurn(
			{
				base: '/api/oc2/ws-1',
				message: 'fix',
				agent: 'build',
				model: { providerID: 'enos', modelID: 'm' },
				fetchImpl
			},
			{ onUpdate: (s) => (last = s), onTool: (e) => tools.push(`${e.kind}:${e.tool}:${e.ok}`) }
		);
		expect(out.content).toBe('Done.');
		expect(out.reasoning).toBe('The plan');
		expect(last).toEqual(out);
		expect(tools).toEqual(['tool_start:write:undefined', 'tool_end:write:true']);
		expect(calls).toContain('GET /api/oc2/ws-1/event');
		expect(calls).toContain('POST /api/oc2/ws-1/prompt');
		expect(calls.find((c) => c.includes('/session'))).toBeUndefined();
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

		await runDeskPiTurn(
			{
				base: '/api/oc2/ws-1',
				message: 'fix',
				agent: 'build',
				mind: 'deepmind',
				model: { providerID: 'enos', modelID: 'enos' },
				fetchImpl
			},
			{ onUpdate: () => {}, onTool: () => {} }
		);
		expect(calls).toContain('GET /api/oc2/ws-1/event?mind=deepmind');
		expect(promptBody).toEqual({ message: 'fix', mind: 'deepmind' });
	});

	test('cancels the SSE reader when the turn ends', async () => {
		let cancelled = 0;
		const enc = new TextEncoder();
		const objs = [piTextDelta, piAgentEnd, piToolStart];
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

		const out = await runDeskPiTurn(
			{
				base: '/api/oc2/ws-1',
				message: 'fix',
				agent: 'build',
				model: { providerID: 'enos', modelID: 'enos' },
				fetchImpl
			},
			{ onUpdate: () => {}, onTool: () => {} }
		);
		expect(out.content).toBe('Done.');
		expect(cancelled).toBe(1);
	});

	test('drives a turn over the desktop Pi bridge transport with cumulative replace semantics', async () => {
		const events: ((ev: any) => void)[] = [];
		const calls: string[] = [];
		const fakePi = {
			start: async (folderId: string) => {
				calls.push(`start:${folderId}`);
				return { port: 0, sessionId: 'folder-1' };
			},
			prompt: async (folderId: string, prompt: string, agent?: string) => {
				calls.push(`prompt:${folderId}:${prompt}:${agent}`);
				setTimeout(() => {
					for (const emit of events) {
						emit({ streamId: 'stream-1', event: piThinkingDelta });
						emit({ streamId: 'stream-1', event: piTextDelta });
						emit({ streamId: 'stream-1', event: piTextDelta2 });
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
		const out = await runDeskPiTurn(
			{
				message: 'fix it',
				agent: 'build',
				model: { providerID: 'local', modelID: 'pi' },
				transport: desktopPiTransport(fakePi, 'folder-1')
			},
			{ onUpdate: (s) => (last = s) }
		);

		expect(out).toEqual({ content: 'Done. More.', reasoning: 'The plan' });
		expect(last).toEqual(out);
		expect(calls).toEqual(['start:folder-1', 'prompt:folder-1:fix it:build', 'dispose']);
	});
});

describe('DeskStreamState', () => {
	test('joins text parts in arrival order, replacing each part on update', () => {
		const s = new DeskStreamState();
		s.apply({ kind: 'content', partId: 'a', text: 'Hel' });
		s.apply({ kind: 'content', partId: 'a', text: 'Hello' });
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
