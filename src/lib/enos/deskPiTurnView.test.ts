import { describe, expect, test } from 'vitest';

import { createDeskPiTurnView } from './deskPiTurnView';

describe('deskPiTurnView', () => {
	test('opens reasoning status then closes it when content arrives', () => {
		let now = 1_000;
		const view = createDeskPiTurnView({ now: () => now });

		// Reasoning step now carries a gist of the model's reasoning as its label.
		const thinking = view.onUpdate({ reasoning: 'checking files', content: '' });
		expect(thinking.statusChanged).toBe(true);
		expect(thinking.statusHistory).toEqual([
			{ action: 'reasoning', description: 'checking files', done: false }
		]);

		now = 2_500;
		const content = view.onUpdate({ reasoning: 'checking files', content: 'Fixed it.' });
		expect(content.statusChanged).toBe(true);
		// Settled once content arrives: done + elapsed duration stamped (1000→2500ms).
		expect(content.statusHistory[0]).toEqual({
			action: 'reasoning',
			description: 'checking files',
			done: true,
			duration: 1.5
		});
		expect(content.messageContent).toContain('Fixed it.');
	});

	test('tracks tool start and outcome statuses', () => {
		const view = createDeskPiTurnView({ now: () => 1_000 });

		const start = view.onTool({
			kind: 'tool_start',
			tool: 'read_file',
			input: { path: 'src/app.ts' }
		});
		expect(start.at(-1)).toMatchObject({ action: 'enos_desk', done: false });
		expect(start.at(-1)?.description).toContain('src/app.ts');

		const end = view.onTool({
			kind: 'tool_end',
			tool: 'read_file',
			ok: true,
			detail: '12 lines'
		});
		expect(end.at(-1)).toMatchObject({ action: 'enos_desk', done: true });
		expect(end.at(-1)?.description).toContain('12 lines');
	});

	test('finalizes content with fallback and marks every status done', () => {
		const view = createDeskPiTurnView({ now: () => 1_000 });
		view.onUpdate({ reasoning: 'thinking', content: '' });

		const final = view.finalMessage({
			reasoning: 'thinking',
			content: '',
			fallbackContent: '(No response from ENOS Cloud.)'
		});

		expect(final.done).toBe(true);
		expect(final.messageContent).toContain('(No response from ENOS Cloud.)');
		expect(final.statusHistory.every((status) => status.done)).toBe(true);
	});
});
