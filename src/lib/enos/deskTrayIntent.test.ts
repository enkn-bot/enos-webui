import { describe, expect, test } from 'vitest';
import { deskTrayIntentFromPrompt } from './deskTrayIntent';

describe('deskTrayIntentFromPrompt', () => {
	test('detects direct terminal tab requests', () => {
		expect(deskTrayIntentFromPrompt('Can you open up a terminal tab here?')).toBe('terminal');
		expect(deskTrayIntentFromPrompt('show the shell panel')).toBe('terminal');
	});

	test('detects browser and files tray requests', () => {
		expect(deskTrayIntentFromPrompt('open the browser tab')).toBe('browser');
		expect(deskTrayIntentFromPrompt('bring up project files')).toBe('files');
	});

	test('ignores ordinary project questions', () => {
		expect(deskTrayIntentFromPrompt('Can you edit this file?')).toBe(null);
		expect(deskTrayIntentFromPrompt('What files are in this project?')).toBe(null);
	});
});
