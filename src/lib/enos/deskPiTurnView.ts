import { composeDeskMessageContent, reasoningGist } from './deskReasoning';
import { formatToolOutcome, formatToolStartStatus } from './toolStatusLabels';

export type DeskPiStatus = {
	action: string;
	description: string;
	done: boolean;
	duration?: number;
};

export type DeskPiTurnUpdate = {
	content: string;
	reasoning: string;
};

export type DeskPiToolEvent = {
	kind: 'tool_start' | 'tool_end';
	tool: string;
	ok?: boolean;
	input?: unknown;
	detail?: string;
};

const cloneStatuses = (statuses: DeskPiStatus[]): DeskPiStatus[] =>
	statuses.map((status) => ({ ...status }));

const durationSeconds = (startedAt: number, now: () => number): number =>
	startedAt ? (now() - startedAt) / 1000 : 0;

export const createDeskPiTurnView = (args: { now?: () => number } = {}) => {
	const now = args.now ?? (() => Date.now());
	const statusHistory: DeskPiStatus[] = [];
	let liveContent = '';
	let liveReasoning = '';
	let reasoningStartMs = 0;

	const messageContent = (done: boolean) =>
		composeDeskMessageContent(liveReasoning, liveContent, {
			done,
			durationS: durationSeconds(reasoningStartMs, now)
		});

	// Settle the in-progress reasoning step: mark done and stamp its elapsed
	// duration so the feed can demote "Thought for Xs" to a subline under the gist.
	const settleReasoning = (): boolean => {
		let changed = false;
		for (const status of statusHistory) {
			if (status.action === 'reasoning' && !status.done) {
				status.done = true;
				status.duration = durationSeconds(reasoningStartMs, now);
				changed = true;
			}
		}
		return changed;
	};

	return {
		statusHistory: () => cloneStatuses(statusHistory),

		onUpdate(update: DeskPiTurnUpdate) {
			let statusChanged = false;
			liveContent = update.content;
			liveReasoning = update.reasoning;

			if (liveReasoning && !reasoningStartMs) {
				reasoningStartMs = now();
			}
			if (liveReasoning) {
				// Carry a live gist of the model's reasoning as the step label, so the
				// feed reads "Still not connecting — let me take a screenshot" instead
				// of a bare "Thinking". Updates as the reasoning streams.
				const gist = reasoningGist(liveReasoning) || 'Thinking';
				const existing = statusHistory.find((status) => status.action === 'reasoning');
				if (!existing) {
					statusHistory.push({ action: 'reasoning', description: gist, done: false });
					statusChanged = true;
				} else if (!existing.done && existing.description !== gist) {
					existing.description = gist;
					statusChanged = true;
				}
			}

			if (liveContent) {
				if (settleReasoning()) statusChanged = true;
			}

			return {
				messageContent: messageContent(false),
				statusHistory: cloneStatuses(statusHistory),
				statusChanged
			};
		},

		onTool(event: DeskPiToolEvent) {
			if (event.kind === 'tool_start') {
				settleReasoning();
				statusHistory.push({
					action: 'enos_desk',
					description: formatToolStartStatus(
						event.tool,
						event.input as Record<string, unknown> | undefined
					),
					done: false
				});
			} else {
				const last = statusHistory[statusHistory.length - 1];
				if (last) {
					last.done = true;
					last.description = formatToolOutcome(
						event.tool,
						event.ok === true,
						last.description,
						event.detail
					);
				}
			}
			return cloneStatuses(statusHistory);
		},

		finalMessage(result: { reasoning: string; content: string; fallbackContent: string }) {
			liveReasoning = result.reasoning;
			liveContent = result.content || result.fallbackContent;
			settleReasoning();

			return {
				messageContent: messageContent(true),
				statusHistory: statusHistory.map((status) => ({ ...status, done: true })),
				done: true
			};
		}
	};
};
