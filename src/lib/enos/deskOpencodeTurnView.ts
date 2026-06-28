import { composeDeskMessageContent } from './deskReasoning';
import { formatToolOutcome, formatToolStartStatus } from './toolStatusLabels';

export type DeskOpencodeStatus = {
	action: string;
	description: string;
	done: boolean;
};

export type DeskOpencodeTurnUpdate = {
	content: string;
	reasoning: string;
};

export type DeskOpencodeToolEvent = {
	kind: 'tool_start' | 'tool_end';
	tool: string;
	ok?: boolean;
	input?: unknown;
	detail?: string;
};

const cloneStatuses = (statuses: DeskOpencodeStatus[]): DeskOpencodeStatus[] =>
	statuses.map((status) => ({ ...status }));

const durationSeconds = (startedAt: number, now: () => number): number =>
	startedAt ? (now() - startedAt) / 1000 : 0;

export const createDeskOpencodeTurnView = (args: { now?: () => number } = {}) => {
	const now = args.now ?? (() => Date.now());
	const statusHistory: DeskOpencodeStatus[] = [];
	let liveContent = '';
	let liveReasoning = '';
	let reasoningStartMs = 0;

	const messageContent = (done: boolean) =>
		composeDeskMessageContent(liveReasoning, liveContent, {
			done,
			durationS: durationSeconds(reasoningStartMs, now)
		});

	return {
		statusHistory: () => cloneStatuses(statusHistory),

		onUpdate(update: DeskOpencodeTurnUpdate) {
			let statusChanged = false;
			liveContent = update.content;
			liveReasoning = update.reasoning;

			if (liveReasoning && !reasoningStartMs) {
				reasoningStartMs = now();
				if (!statusHistory.find((status) => status.action === 'reasoning')) {
					statusHistory.push({ action: 'reasoning', description: 'Thinking', done: false });
					statusChanged = true;
				}
			}

			if (liveContent) {
				for (const status of statusHistory) {
					if (!status.done && status.action === 'reasoning') {
						status.done = true;
						statusChanged = true;
					}
				}
			}

			return {
				messageContent: messageContent(false),
				statusHistory: cloneStatuses(statusHistory),
				statusChanged
			};
		},

		onTool(event: DeskOpencodeToolEvent) {
			if (event.kind === 'tool_start') {
				const thinkingStatus = statusHistory.find(
					(status) => status.action === 'reasoning' && !status.done
				);
				if (thinkingStatus) thinkingStatus.done = true;
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

			return {
				messageContent: messageContent(true),
				statusHistory: statusHistory.map((status) => ({ ...status, done: true })),
				done: true
			};
		}
	};
};
