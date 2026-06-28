import { describe, expect, test, vi } from 'vitest';

import { deskChatTitleLabel, deskTitlePathLabel, maybeGenerateDeskChatTitle } from './deskTitle';

describe('desk title labels', () => {
	test('uses project/chat path when the chat belongs to a project', () => {
		expect(deskTitlePathLabel({ projectName: 'Codex', chatName: 'FIFA World Cup matches' })).toBe(
			'Codex / FIFA World Cup matches'
		);
	});

	test('uses only the chat title for no-project chats', () => {
		expect(deskTitlePathLabel({ projectName: '', chatName: 'New Chat' })).toBe('New Chat');
	});

	test('normalizes chat title sources before falling back', () => {
		expect(
			deskChatTitleLabel({
				title: ' ',
				chatTitle: ' Initial Assistant Greeting ',
				fallback: 'New Chat'
			})
		).toBe('Initial Assistant Greeting');
	});
});

describe('ENOS Desk title generation', () => {
	test('generates a title for untitled Desk chats in the background', () => {
		const generateTitle = vi.fn().mockResolvedValue('Brazil score recap');
		const updateChatById = vi.fn().mockResolvedValue({});
		const setTitle = vi.fn();
		const refresh = vi.fn().mockResolvedValue(undefined);
		const notifyFolderChatsChanged = vi.fn();

		const promise = maybeGenerateDeskChatTitle({
			token: 'tok',
			chatId: 'chat-1',
			folderId: 'folder-1',
			currentTitle: 'New Chat',
			modelId: 'enos.mind',
			userPrompt: 'scores for the brazil game',
			assistantContent: 'Brazil won 3-0.',
			generateTitle,
			updateChatById,
			setTitle,
			refresh,
			notifyFolderChatsChanged
		});

		expect(generateTitle).toHaveBeenCalledWith('tok', 'enos.mind', [
			{ role: 'user', content: 'scores for the brazil game' },
			{ role: 'assistant', content: 'Brazil won 3-0.' }
		]);

		return promise.then(() => {
			expect(updateChatById).toHaveBeenCalledWith('tok', 'chat-1', {
				title: 'Brazil score recap'
			});
			expect(setTitle).toHaveBeenCalledWith('Brazil score recap');
			expect(refresh).toHaveBeenCalled();
			expect(notifyFolderChatsChanged).toHaveBeenCalledWith('folder-1');
		});
	});

	test('skips existing titled chats', async () => {
		const generateTitle = vi.fn();
		await maybeGenerateDeskChatTitle({
			token: 'tok',
			chatId: 'chat-1',
			folderId: null,
			currentTitle: 'Existing title',
			modelId: 'enos.mind',
			userPrompt: 'hello',
			assistantContent: 'hi',
			generateTitle,
			updateChatById: vi.fn(),
			setTitle: vi.fn(),
			refresh: vi.fn(),
			notifyFolderChatsChanged: vi.fn()
		});

		expect(generateTitle).not.toHaveBeenCalled();
	});
});
