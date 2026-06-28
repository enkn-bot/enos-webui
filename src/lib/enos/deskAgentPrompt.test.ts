import { describe, expect, test } from 'vitest';

import {
	buildDeskAgentSystemPrompt,
	describeDeskProjectForPrompt,
	deskAccessModePromptLine,
	normalizeDeskAccessMode
} from './deskAgentPrompt';

describe('deskAgentPrompt', () => {
	test('normalizes unknown access modes to auto', () => {
		expect(normalizeDeskAccessMode('read-only')).toBe('read-only');
		expect(normalizeDeskAccessMode('auto')).toBe('auto');
		expect(normalizeDeskAccessMode('full')).toBe('full');
		expect(normalizeDeskAccessMode('write-everywhere')).toBe('auto');
		expect(normalizeDeskAccessMode(null)).toBe('auto');
	});

	test('describes desk project using the bound path when it differs from name', () => {
		expect(
			describeDeskProjectForPrompt({
				name: 'Website',
				data: {
					project_context_source: {
						rootName: 'enos-site',
						rootDisplay: '/Users/enos/Projects/enos-site'
					}
				}
			})
		).toBe('Website (bound path: /Users/enos/Projects/enos-site)');
	});

	test('falls back to root folder when no bound path exists', () => {
		expect(
			describeDeskProjectForPrompt({
				name: 'Website',
				data: { project_context_source: { rootName: 'enos-site' } }
			})
		).toBe('Website (bound folder: enos-site)');
		expect(describeDeskProjectForPrompt(null)).toBe('selected Desk project');
	});

	test('renders access mode safety lines', () => {
		expect(deskAccessModePromptLine('read-only')).toContain('edits are disabled');
		expect(deskAccessModePromptLine('auto')).toContain('edits are limited to this project');
		expect(deskAccessModePromptLine('full')).toContain('read and edit anywhere on this Mac');
	});

	test('builds the desk agent system prompt from one source', () => {
		const prompt = buildDeskAgentSystemPrompt({
			groundingLine: 'GROUNDING',
			projectLabel: 'Website (bound path: /tmp/site)',
			accessMode: 'auto'
		});

		expect(prompt).toContain('GROUNDING');
		expect(prompt).toContain('You are ENOS Desk');
		expect(prompt).toContain('Subconscious (instant reflexes)');
		expect(prompt).toContain('Active project: Website (bound path: /tmp/site).');
		expect(prompt).toContain('Access mode: auto');
		expect(prompt).toContain('list_files, read_file');
		expect(prompt).toContain('FILE FACTS ARE GROUND TRUTH');
	});
});
