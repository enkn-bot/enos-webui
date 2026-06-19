import type { DeskToolResult, DeskToolSpec } from '$lib/enos/deskFileTools';

/**
 * ENOS Desk agentic tool-loop (Phase 2 core).
 *
 * A pure, injectable loop: it asks the model for a completion, runs any
 * tool_calls the model emits against an injected executor, feeds the results
 * back, and repeats until the model answers in plain text (or a step budget is
 * hit). Mutations that come back `requires_confirmation` are paused for the
 * injected `confirm` callback before they run.
 *
 * It is deliberately decoupled from Svelte, the bridge, and the model endpoint
 * so it is unit-testable. Chat.svelte wires `complete` to the Desk model call
 * and `executeTool` to `executeDeskFileTool({ bridge, folderId, ... })`.
 */

export type DeskToolCall = {
	id: string;
	type?: 'function';
	function: { name: string; arguments: string };
};

export type DeskChatMessage = {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: DeskToolCall[];
	tool_call_id?: string;
	name?: string;
};

export type DeskCompletion = {
	content: string;
	tool_calls?: DeskToolCall[];
};

/** Progress events so the UI can show live tool steps (reused by OWUI statusHistory). */
export type DeskLoopEvent =
	| { type: 'tool_start'; name: string; args: Record<string, unknown> }
	| { type: 'tool_end'; name: string; args: Record<string, unknown>; result: DeskToolResult };

export type DeskAgentLoopArgs = {
	messages: DeskChatMessage[];
	tools: DeskToolSpec[];
	complete: (messages: DeskChatMessage[], tools: DeskToolSpec[]) => Promise<DeskCompletion>;
	executeTool: (
		name: string,
		args: Record<string, unknown>,
		confirmed: boolean
	) => Promise<DeskToolResult>;
	/** Approve a mutation that came back `requires_confirmation`. Defaults to deny. */
	confirm?: (pending: {
		name: string;
		args: Record<string, unknown>;
		result: Extract<DeskToolResult, { status: 'requires_confirmation' }>;
	}) => Promise<boolean>;
	/** Fired as each tool starts/finishes, so the UI can show live progress. */
	onEvent?: (event: DeskLoopEvent) => void;
	maxSteps?: number;
};

export type DeskAgentLoopOutcome = {
	content: string;
	messages: DeskChatMessage[];
	steps: number;
	stoppedReason: 'complete' | 'max_steps';
};

const DEFAULT_MAX_STEPS = 8;

const parseToolArgs = (raw: string): Record<string, unknown> => {
	const value = JSON.parse(raw || '{}');
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

const toolResultContent = (result: DeskToolResult): string => {
	if (result.status === 'ok') return String(result.data ?? result.summary ?? 'done');
	if (result.status === 'error') return `Error: ${result.message}`;
	return result.summary; // requires_confirmation should be resolved before this point
};

export const runDeskAgentLoop = async ({
	messages,
	tools,
	complete,
	executeTool,
	confirm,
	onEvent,
	maxSteps = DEFAULT_MAX_STEPS
}: DeskAgentLoopArgs): Promise<DeskAgentLoopOutcome> => {
	const working: DeskChatMessage[] = [...messages];
	let steps = 0;
	let lastContent = '';

	while (steps < maxSteps) {
		steps += 1;
		const completion = await complete(working, tools);
		lastContent = completion.content ?? '';
		working.push({
			role: 'assistant',
			content: lastContent,
			...(completion.tool_calls?.length ? { tool_calls: completion.tool_calls } : {})
		});

		if (!completion.tool_calls?.length) {
			return { content: lastContent, messages: working, steps, stoppedReason: 'complete' };
		}

		for (const toolCall of completion.tool_calls) {
			const name = toolCall.function.name;
			let result: DeskToolResult;
			let args: Record<string, unknown> = {};
			try {
				args = parseToolArgs(toolCall.function.arguments);
			} catch {
				working.push({
					role: 'tool',
					tool_call_id: toolCall.id,
					name,
					content: `Error: could not parse arguments for ${name}.`
				});
				continue;
			}

			onEvent?.({ type: 'tool_start', name, args });
			result = await executeTool(name, args, false);

			if (result.status === 'requires_confirmation') {
				const approved = confirm ? await confirm({ name, args, result }) : false;
				result = approved
					? await executeTool(name, args, true)
					: { status: 'error', message: 'User declined this action.' };
			}

			onEvent?.({ type: 'tool_end', name, args, result });
			working.push({
				role: 'tool',
				tool_call_id: toolCall.id,
				name,
				content: toolResultContent(result)
			});
		}
	}

	return { content: lastContent, messages: working, steps, stoppedReason: 'max_steps' };
};
