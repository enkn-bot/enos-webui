import { describe, expect, test } from 'vitest';

import { DeskStreamState, normalizeOpencodeEvent } from './deskOpencode';

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
