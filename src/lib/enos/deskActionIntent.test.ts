import { describe, expect, test } from 'vitest';

import { deskActionIntentFromPrompt } from './deskActionIntent';

describe('deskActionIntentFromPrompt', () => {
	test('routes explicit terminal commands to the terminal pane', () => {
		expect(deskActionIntentFromPrompt('run echo "message" in terminal')).toEqual({
			kind: 'terminal-input',
			input: 'echo "message"\n'
		});
		expect(deskActionIntentFromPrompt('echo "message"')).toEqual({
			kind: 'terminal-input',
			input: 'echo "message"\n'
		});
	});

	test('does not auto-run destructive shell commands', () => {
		expect(deskActionIntentFromPrompt('rm -rf ~/Downloads')).toBeNull();
	});

	test('routes browser navigation to a browser url action', () => {
		expect(deskActionIntentFromPrompt('open https://example.com in browser')).toEqual({
			kind: 'browser-url',
			url: 'https://example.com'
		});
		expect(deskActionIntentFromPrompt('navigate browser to example.com/docs')).toEqual({
			kind: 'browser-url',
			url: 'https://example.com/docs'
		});
	});

	test('routes file path opens to the Files pane', () => {
		expect(deskActionIntentFromPrompt('open README.md in files')).toEqual({
			kind: 'files-open-path',
			path: 'README.md'
		});
		expect(deskActionIntentFromPrompt('show src/lib/enos/tabDock.ts in file tab')).toEqual({
			kind: 'files-open-path',
			path: 'src/lib/enos/tabDock.ts'
		});
	});
});
