import { describe, it, expect } from 'vitest';
import { normalizePiEvent } from './deskPiTransport';

const textDelta = { type: 'message_update', assistantMessageEvent: {
  type: 'text_delta', contentIndex: 1, delta: 'Done',
  partial: { role: 'assistant', content: [
    { type: 'thinking', thinking: '…' },
    { type: 'text', text: 'Done.' },
  ] } } };
const thinkingDelta = { type: 'message_update', assistantMessageEvent: {
  type: 'thinking_delta', contentIndex: 0, delta: 'The',
  partial: { role: 'assistant', content: [{ type: 'thinking', thinking: 'The plan' }] } } };
const toolStart = { type: 'tool_execution_start', toolCallId: 'c1', toolName: 'write', args: { path: 'r.js' } };
const toolEnd = { type: 'tool_execution_end', toolCallId: 'c1', toolName: 'write',
  result: { title: 'Wrote r.js', content: [{ type: 'text', text: 'ok' }] }, isError: false };
const toolErr = { ...toolEnd, isError: true };
const agentEnd = { type: 'agent_end', messages: [] };
const respFail = { type: 'response', command: 'prompt', success: false, error: 'boom' };

describe('normalizePiEvent', () => {
  it('text_delta → content (cumulative)', () => {
    expect(normalizePiEvent(textDelta)).toEqual({ kind: 'content', partId: 'text-1', text: 'Done.' });
  });
  it('thinking_delta → reasoning (cumulative)', () => {
    expect(normalizePiEvent(thinkingDelta)).toEqual({ kind: 'reasoning', partId: 'think-0', text: 'The plan' });
  });
  it('tool_execution_start → tool_start', () => {
    expect(normalizePiEvent(toolStart)).toEqual({ kind: 'tool_start', callId: 'c1', tool: 'write', input: { path: 'r.js' } });
  });
  it('tool_execution_end → tool_end ok', () => {
    expect(normalizePiEvent(toolEnd)).toEqual({
      kind: 'tool_end',
      callId: 'c1',
      tool: 'write',
      ok: true,
      detail: 'Wrote r.js'
    });
  });
  it('tool_execution_end isError → tool_end not ok', () => {
    expect(normalizePiEvent(toolErr)).toMatchObject({ ok: false, detail: 'Wrote r.js' });
  });
  it('agent_end → done', () => { expect(normalizePiEvent(agentEnd)).toEqual({ kind: 'done' }); });
  it('response success:false → error', () => {
    expect(normalizePiEvent(respFail)).toEqual({ kind: 'error', message: 'boom' });
  });
  it('unmapped (response success:true, turn_end) → null', () => {
    expect(normalizePiEvent({ type: 'response', command: 'prompt', success: true })).toBeNull();
    expect(normalizePiEvent({ type: 'turn_end' })).toBeNull();
  });
});
