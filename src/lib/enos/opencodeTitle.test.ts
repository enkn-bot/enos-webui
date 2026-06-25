import { describe, expect, test, vi } from 'vitest';

import { maybeGenerateOpencodeChatTitle } from './opencodeTitle';

describe('ENOS OpenCode title generation', () => {
	test('generates a title for untitled OpenCode chats in the background', () => {
		const generateTitle = vi.fn().mockResolvedValue('Brazil score recap');
		const updateChatById = vi.fn().mockResolvedValue({});
		const setTitle = vi.fn();
		const refresh = vi.fn().mockResolvedValue(undefined);
		const notifyFolderChatsChanged = vi.fn();

		const promise = maybeGenerateOpencodeChatTitle({
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
		await maybeGenerateOpencodeChatTitle({
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
