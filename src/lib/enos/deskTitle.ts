type ChatTitleMessage = {
	role: 'user' | 'assistant';
	content: string;
};

const normalize = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const deskChatTitleLabel = ({
	title,
	chatTitle,
	fallback
}: {
	title?: unknown;
	chatTitle?: unknown;
	fallback: string;
}) => normalize(title) || normalize(chatTitle) || fallback;

export const deskTitlePathLabel = ({
	projectName,
	chatName
}: {
	projectName?: unknown;
	chatName: string;
}) => {
	const project = normalize(projectName);
	return project ? `${project} / ${chatName}` : chatName;
};

type MaybeGenerateDeskChatTitleOptions = {
	token: string;
	chatId: string | null | undefined;
	folderId: string | null | undefined;
	currentTitle: string | null | undefined;
	modelId: string;
	userPrompt: string;
	assistantContent: string;
	disabled?: boolean;
	generateTitle: (token: string, modelId: string, messages: ChatTitleMessage[]) => Promise<string>;
	updateChatById: (token: string, chatId: string, body: { title: string }) => Promise<unknown>;
	setTitle: (title: string) => void | Promise<void>;
	refresh: () => void | Promise<void>;
	notifyFolderChatsChanged: (folderId: string) => void;
};

const needsGeneratedTitle = (title: string | null | undefined) => {
	const value = title?.trim();
	return !value || value === 'New Chat';
};

export const maybeGenerateDeskChatTitle = async ({
	token,
	chatId,
	folderId,
	currentTitle,
	modelId,
	userPrompt,
	assistantContent,
	disabled = false,
	generateTitle,
	updateChatById,
	setTitle,
	refresh,
	notifyFolderChatsChanged
}: MaybeGenerateDeskChatTitleOptions) => {
	if (disabled || !chatId || !needsGeneratedTitle(currentTitle)) return;

	try {
		const title = await generateTitle(token, modelId, [
			{ role: 'user', content: userPrompt },
			{ role: 'assistant', content: assistantContent }
		]);
		if (!title) return;

		await updateChatById(token, chatId, { title });
		await setTitle(title);
		await refresh();
		if (folderId) notifyFolderChatsChanged(folderId);
	} catch (error) {
		console.error('[enos desk title]', error);
	}
};
