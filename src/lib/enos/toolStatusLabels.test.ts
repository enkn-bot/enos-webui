import { describe, expect, test } from 'vitest';

import {
	formatToolStartStatus,
	formatToolEndStatus,
	compactToolContext,
	type ToolInfo
} from './toolStatusLabels';

describe('tool status labels', () => {
	describe('formatToolStartStatus', () => {
		test('file path from tool args', () => {
			expect(formatToolStartStatus('read', { path: 'src/main.ts' })).toBe('Read src/main.ts');
		});

		test('file_path alias', () => {
			expect(formatToolStartStatus('write', { file_path: 'docs/index.md' })).toBe(
				'Write docs/index.md'
			);
		});

		test('web search query', () => {
			expect(
				formatToolStartStatus('web_search', { query: 'Gemini 2.5 Flash pricing 2026' })
			).toBe('Searching Gemini 2.5 Flash pricing 2026');
		});

		test('bash command', () => {
			expect(formatToolStartStatus('bash', { command: 'npm run build' })).toBe(
				'Run npm run build'
			);
		});

		test('no args — bare tool name', () => {
			expect(formatToolStartStatus('list', undefined)).toBe('List');
			expect(formatToolStartStatus('read', {})).toBe('Read');
		});

		test('fallback to first string value', () => {
			expect(formatToolStartStatus('edit', { file: 'auth.ts' })).toBe('Edit auth.ts');
		});
	});

	describe('formatToolEndStatus', () => {
		test('successful tool', () => {
			expect(formatToolEndStatus('read', true)).toBe('Read');
		});

		test('failed tool', () => {
			expect(formatToolEndStatus('write', false)).toBe('Write (failed)');
		});

		test('keeps the contextual start label on completion', () => {
			expect(formatToolEndStatus('read', true, 'Read src/main.ts')).toBe('Read src/main.ts');
		});

		test('appends (failed) to the contextual label', () => {
			expect(formatToolEndStatus('read', false, 'Read src/main.ts')).toBe(
				'Read src/main.ts (failed)'
			);
		});

		test('blank start label falls back to bare tool name', () => {
			expect(formatToolEndStatus('read', true, '   ')).toBe('Read');
		});
	});

	describe('compactToolContext', () => {
		test('file path shows last segment', () => {
			expect(compactToolContext('read', { path: 'src/components/main.ts' })).toBe('main.ts');
		});

		test('web search query truncated', () => {
			const longQuery = 'Gemini 2.5 Flash pricing 2026 and availability regions';
			// compactToolContext truncates web_search queries to 30 chars + ellipsis
			const result = compactToolContext('web_search', { query: longQuery });
			expect(result.length).toBeLessThanOrEqual(33);
			expect(result).toContain('Gemini');
		});

		test('no args returns empty', () => {
			expect(compactToolContext('read', {})).toBe('');
		});
	});
});
