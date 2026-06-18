import { describe, expect, test, vi } from 'vitest';
import { runDeskAgentLoop, type DeskAgentLoopArgs, type DeskCompletion } from '$lib/enos/deskAgentLoop';
import { DESK_FILE_TOOLS } from '$lib/enos/deskFileTools';

const call = (id: string, name: string, args: Record<string, unknown>) => ({
	id,
	type: 'function' as const,
	function: { name, arguments: JSON.stringify(args) }
});

const baseArgs = (overrides: Partial<DeskAgentLoopArgs>): DeskAgentLoopArgs => ({
	messages: [{ role: 'user' as const, content: 'do the thing' }],
	tools: DESK_FILE_TOOLS,
	complete: vi.fn(async (): Promise<DeskCompletion> => ({ content: 'fallback' })),
	executeTool: vi.fn(async () => ({ status: 'ok' as const, summary: 'done', data: 'result' })),
	...overrides
});

describe('runDeskAgentLoop', () => {
	test('returns model content directly when no tools are called', async () => {
		const complete = vi.fn(async (): Promise<DeskCompletion> => ({ content: 'just an answer' }));
		const out = await runDeskAgentLoop(baseArgs({ complete }));
		expect(out.content).toBe('just an answer');
		expect(out.stoppedReason).toBe('complete');
		expect(complete).toHaveBeenCalledTimes(1);
	});

	test('executes a tool call, feeds the result back, then returns the final answer', async () => {
		const complete = vi
			.fn()
			.mockResolvedValueOnce({ content: '', tool_calls: [call('c1', 'list_files', { path: '.' })] })
			.mockResolvedValueOnce({ content: 'there are 2 files' });
		const executeTool = vi.fn(async () => ({ status: 'ok' as const, summary: 'listed', data: 'a.md\nb.md' }));

		const out = await runDeskAgentLoop(baseArgs({ complete, executeTool }));

		expect(executeTool).toHaveBeenCalledWith('list_files', { path: '.' }, false);
		expect(out.content).toBe('there are 2 files');
		// The tool result is appended as a tool-role message for the next turn.
		const toolMsg = out.messages.find((m) => m.role === 'tool');
		expect(toolMsg?.tool_call_id).toBe('c1');
		expect(toolMsg?.content).toContain('a.md');
	});

	test('chains multiple tool steps (read then edit) before answering', async () => {
		const complete = vi
			.fn()
			.mockResolvedValueOnce({ content: '', tool_calls: [call('r', 'read_file', { path: 'x.md' })] })
			.mockResolvedValueOnce({
				content: '',
				tool_calls: [call('e', 'edit_file', { path: 'x.md', old_text: 'a', new_text: 'b' })]
			})
			.mockResolvedValueOnce({ content: 'edited x.md' });
		const executeTool = vi.fn(async () => ({ status: 'ok' as const, summary: 'ok', data: 'ok' }));

		const out = await runDeskAgentLoop(baseArgs({ complete, executeTool }));
		expect(executeTool).toHaveBeenCalledTimes(2);
		expect(out.content).toBe('edited x.md');
	});

	test('pauses a mutation for confirmation, re-runs confirmed when approved', async () => {
		const complete = vi
			.fn()
			.mockResolvedValueOnce({
				content: '',
				tool_calls: [call('w', 'write_file', { path: 'x.md', content: 'hi' })]
			})
			.mockResolvedValueOnce({ content: 'wrote x.md' });
		const executeTool = vi
			.fn()
			.mockResolvedValueOnce({
				status: 'requires_confirmation' as const,
				summary: 'write x.md',
				request: { action: 'writeProjectFile', status: 'requires_confirmation', path: 'x.md', bytes: 2, preview: 'hi' }
			})
			.mockResolvedValueOnce({ status: 'ok' as const, summary: 'written x.md' });
		const confirm = vi.fn(async () => true);

		const out = await runDeskAgentLoop(baseArgs({ complete, executeTool, confirm }));
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(executeTool).toHaveBeenNthCalledWith(1, 'write_file', { path: 'x.md', content: 'hi' }, false);
		expect(executeTool).toHaveBeenNthCalledWith(2, 'write_file', { path: 'x.md', content: 'hi' }, true);
		expect(out.content).toBe('wrote x.md');
	});

	test('declined confirmation tells the model instead of executing', async () => {
		const complete = vi
			.fn()
			.mockResolvedValueOnce({
				content: '',
				tool_calls: [call('d', 'delete_entry', { path: 'x.md' })]
			})
			.mockResolvedValueOnce({ content: 'ok, left it alone' });
		const executeTool = vi.fn(async () => ({
			status: 'requires_confirmation' as const,
			summary: 'delete x.md',
			request: { action: 'deleteProjectEntry' as const, status: 'requires_confirmation' as const, path: 'x.md', bytes: 0, preview: '' }
		}));
		const confirm = vi.fn(async () => false);

		const out = await runDeskAgentLoop(baseArgs({ complete, executeTool, confirm }));
		expect(executeTool).toHaveBeenCalledTimes(1); // never re-run with confirmed=true
		const toolMsg = out.messages.find((m) => m.role === 'tool');
		expect(toolMsg?.content.toLowerCase()).toContain('declined');
		expect(out.content).toBe('ok, left it alone');
	});

	test('stops at maxSteps to prevent runaway tool loops', async () => {
		const complete = vi.fn(async () => ({
			content: '',
			tool_calls: [call('x', 'list_files', { path: '.' })]
		}));
		const out = await runDeskAgentLoop(baseArgs({ complete, maxSteps: 3 }));
		expect(out.stoppedReason).toBe('max_steps');
		expect(complete).toHaveBeenCalledTimes(3);
	});

	test('a malformed tool-call arguments string is reported back, not thrown', async () => {
		const complete = vi
			.fn()
			.mockResolvedValueOnce({
				content: '',
				tool_calls: [{ id: 'b', type: 'function', function: { name: 'read_file', arguments: '{not json' } }]
			})
			.mockResolvedValueOnce({ content: 'recovered' });
		const executeTool = vi.fn(async () => ({ status: 'ok' as const, summary: 'ok' }));

		const out = await runDeskAgentLoop(baseArgs({ complete, executeTool }));
		expect(executeTool).not.toHaveBeenCalled();
		const toolMsg = out.messages.find((m) => m.role === 'tool');
		expect(toolMsg?.content.toLowerCase()).toContain('error');
		expect(out.content).toBe('recovered');
	});
});
