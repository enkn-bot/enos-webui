import { describe, expect, test } from 'vitest';

import { detectProjectChatAction } from './projectChatActions';

const now = new Date('2026-06-18T12:00:00.000Z');

describe('detectProjectChatAction', () => {
	test('routes folder listing requests to the active Files pane path', () => {
		expect(
			detectProjectChatAction({
				prompt: 'What files are in this folder?',
				activePath: 'docs/superpowers',
				now
			})
		).toEqual({ kind: 'list-directory', path: 'docs/superpowers' });

		expect(
			detectProjectChatAction({
				prompt: 'Can you tell me the files in this folder, all of them?',
				activePath: 'Director Global Strategy Lead',
				now
			})
		).toEqual({ kind: 'list-directory', path: 'Director Global Strategy Lead' });

		expect(
			detectProjectChatAction({
				prompt: 'How many files are in the current folder?',
				activePath: 'Director Global Strategy Lead',
				now
			})
		).toEqual({ kind: 'list-directory', path: 'Director Global Strategy Lead' });
	});

	test('routes explicit project file reads', () => {
		expect(
			detectProjectChatAction({
				prompt: 'What is in superpowers/plans/2026-06-15-interview-buddy.md?',
				activePath: '.',
				now
			})
		).toEqual({
			kind: 'read-file',
			path: 'superpowers/plans/2026-06-15-interview-buddy.md'
		});

		expect(
			detectProjectChatAction({
				prompt: 'What is in README.md?',
				activePath: 'docs/superpowers',
				now
			})
		).toEqual({
			kind: 'read-file',
			path: 'docs/superpowers/README.md'
		});
	});

	test('keeps the existing write-proof request as a deterministic create-file action', () => {
		const action = detectProjectChatAction({
			prompt: 'Can you add a test file to the folder to confirm you can write?',
			activePath: 'notes',
			now
		});

		expect(action?.kind).toBe('create-file');
		expect(action).toMatchObject({
			path: 'notes/enos-write-test-2026-06-18T12-00-00-000Z.txt'
		});
	});

	test('routes explicit file creation with content', () => {
		expect(
			detectProjectChatAction({
				prompt: 'Create file notes/todo.md with content: # Todo\n- call mum',
				activePath: '.',
				now
			})
		).toEqual({
			kind: 'create-file',
			path: 'notes/todo.md',
			content: '# Todo\n- call mum'
		});
	});

	test('routes explicit empty file creation when a concrete file path is supplied', () => {
		expect(
			detectProjectChatAction({
				prompt: 'I deleted "enos-action-smoke-20260618.txt" can you create it again?',
				activePath: '.',
				now
			})
		).toEqual({
			kind: 'create-file',
			path: 'enos-action-smoke-20260618.txt',
			content: ''
		});
	});

	test('routes explicit overwrites only when path and content are present', () => {
		expect(
			detectProjectChatAction({
				prompt: 'Write file notes/todo.md with content: DONE',
				activePath: '.',
				now
			})
		).toEqual({
			kind: 'write-file',
			path: 'notes/todo.md',
			content: 'DONE'
		});
	});

	test('routes create folder, rename, delete, and reveal operations', () => {
		expect(
			detectProjectChatAction({
				prompt: 'Create folder notes/archive',
				activePath: '.',
				now
			})
		).toEqual({ kind: 'create-folder', path: 'notes/archive' });

		expect(
			detectProjectChatAction({
				prompt: 'Rename notes/todo.md to notes/done.md',
				activePath: '.',
				now
			})
		).toEqual({ kind: 'rename-entry', path: 'notes/todo.md', toPath: 'notes/done.md' });

		expect(
			detectProjectChatAction({
				prompt: 'Delete notes/done.md',
				activePath: '.',
				now
			})
		).toEqual({ kind: 'delete-entry', path: 'notes/done.md' });

		expect(
			detectProjectChatAction({
				prompt: 'Reveal notes/done.md in Finder',
				activePath: '.',
				now
			})
		).toEqual({ kind: 'reveal-entry', path: 'notes/done.md' });

		expect(
			detectProjectChatAction({
				prompt: 'Delete README.md',
				activePath: 'docs/superpowers',
				now
			})
		).toEqual({ kind: 'delete-entry', path: 'docs/superpowers/README.md' });
	});

	test('returns a clarification for ambiguous edits instead of letting the model guess', () => {
		expect(
			detectProjectChatAction({
				prompt: 'Can you edit the resume to make it stronger?',
				activePath: '.',
				now
			})
		).toEqual({
			kind: 'clarify',
			message:
				'Tell me the exact project file path and the change to make. For example: `Write file notes/todo.md with content: ...` or `Rename notes/todo.md to notes/done.md`.'
		});
	});

	test('answers local project file capability questions without treating them as commands', () => {
		expect(
			detectProjectChatAction({
				prompt: 'Can you write to the folder?',
				activePath: 'docs',
				now
			})
		).toEqual({
			kind: 'capability',
			message:
				'Yes. In ENOS Desk I can list, read, create, write, rename, delete, reveal, and summarize files inside the selected project folder through the local desktop bridge.\n\nFor writes, give me the project-relative path and exact content. For example: `Write file notes/todo.md with content: ...`. Rename and delete still ask for confirmation.'
		});

		expect(
			detectProjectChatAction({
				prompt: 'Can ENOS Desk write to this selected project folder?',
				activePath: 'docs',
				now
			})?.kind
		).toBe('capability');
	});
});
